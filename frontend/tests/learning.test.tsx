import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  MemoryRouter,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import manifest from "../../content/published/dsa.json";
import {
  BASIC_PROGRAMMING_STEP,
  getProgrammingLesson,
  programmingLessons,
} from "../src/learning/lessons";
import {
  buildTrace,
  initialLabSettings,
  labScenes,
} from "../src/learning/traces";
import LessonLab, { TracePlayer } from "../src/learning/LessonLab";
import SheetPage from "../src/pages/SheetPage";
import type { Account, Progress } from "../src/api/account";
import type { SheetDetail } from "../src/api/sheets";

afterEach(() => vi.useRealTimers());

describe("Programming example correctness", () => {
  it("covers exactly the published basic-programming topics without attaching lessons to other sheets or steps", () => {
    const step = manifest.steps.find(
      (item) => item.stable_key === BASIC_PROGRAMMING_STEP,
    )!;
    expect(Object.keys(programmingLessons).sort()).toEqual(
      step.topics.map((topic) => topic.stable_key).sort(),
    );
    for (const topic of step.topics) {
      expect(
        getProgrammingLesson("dsa", step.stable_key, topic.stable_key),
      ).toBeTruthy();
      expect(
        getProgrammingLesson("cn", step.stable_key, topic.stable_key),
      ).toBeUndefined();
      expect(
        getProgrammingLesson("dsa", "arrays", topic.stable_key),
      ).toBeUndefined();
    }
  });

  it.each([0, 1, 4, 10])(
    "sums 1 through %i and removes the loop variable when its scope ends",
    (number) => {
      const frames = buildTrace("loop", {
        ...initialLabSettings,
        number,
      }).frames;
      const result = frames.at(-1)!;
      expect(result.output).toBe(String((number * (number + 1)) / 2));
      expect(result.variables).not.toHaveProperty("i");
      expect(frames.filter((frame) => frame.line === 3)).toHaveLength(number);
    },
  );

  it("uses C++-style truncation and signed remainder for a negative integer", () => {
    const result = buildTrace("variables", {
      ...initialLabSettings,
      number: -3,
    }).frames.at(-1)!;
    expect(result.variables).toMatchObject({
      quotient: -1,
      remainder: -1,
      half: -1.5,
      even: false,
    });
  });

  it.each([
    [-4, "Even"],
    [-3, "Odd"],
    [0, "Even"],
    [7, "Odd"],
  ])("takes the correct branch for %i", (number, output) => {
    expect(
      buildTrace("decision", {
        ...initialLabSettings,
        number: number as number,
      }).frames.at(-1)?.output,
    ).toBe(output);
  });

  it("separates copy changes from reference changes", () => {
    const frames = buildTrace("parameters", {
      ...initialLabSettings,
      number: 10,
    }).frames;
    expect(frames[2].variables).toEqual({ original: 10, "parameter copy": 11 });
    expect(frames[3].variables).toEqual({ original: 10 });
    expect(frames.at(-1)?.output).toBe("11");
  });

  it("keeps the copied vector independent of alias updates and appends", () => {
    const frames = buildTrace("vector", initialLabSettings).frames;
    expect(frames[0].groups?.[0].values).toEqual([10, 20]);
    expect(frames.at(-1)?.groups?.map((group) => group.values)).toEqual([
      [10, 88, 30],
      [99, 20],
    ]);
    expect(frames.at(-1)?.variables.capacity).toBe("at least 3");
  });

  it("blocks out-of-range array access, then updates a valid selected element", () => {
    const bad = buildTrace("array", {
      ...initialLabSettings,
      index: 4,
    }).frames.at(-1)!;
    expect(bad.blocked).toBe(true);
    expect(bad.output).toBeUndefined();
    const valid = buildTrace("array", {
      ...initialLabSettings,
      index: 3,
      replacement: 7,
    }).frames.at(-1)!;
    expect(valid.groups?.[0].values).toEqual([10, 20, 30, 7]);
    expect(valid.variables.current).toBe(40);
    expect(valid.output).toBe("7");
  });

  it("handles an empty string without a character read", () => {
    const trace = buildTrace("string", { ...initialLabSettings, word: "" });
    expect(trace.frames.some((frame) => frame.line === 2)).toBe(false);
    expect(trace.frames.at(-1)?.output).toBe("");
  });

  it("catches the faulty boundary and produces a result after the correction", () => {
    expect(
      buildTrace("boundary", initialLabSettings).frames.at(-1)?.blocked,
    ).toBe(true);
    const corrected = buildTrace("boundary", {
      ...initialLabSettings,
      corrected: true,
    });
    expect(corrected.frames.some((frame) => frame.blocked)).toBe(false);
    expect(corrected.frames.at(-1)?.output).toBe("6");
  });

  it("shows the intermediate prefixes rather than overwriting earlier snapshots", () => {
    const frames = buildTrace("running", initialLabSettings).frames;
    expect(
      frames
        .filter((frame) => frame.line === 2)
        .map((frame) => frame.groups?.[0].values),
    ).toEqual([
      [2, 3, 3],
      [2, 3, 6],
    ]);
    expect(frames[0].groups?.[0].values).toEqual([2, 1, 3]);
    expect(frames.at(-1)?.output).toBe("[2, 3, 6]");
  });

  it.each([1, 5, 10, 12])(
    "counts visits and integer halvings for n = %i",
    (number) => {
      const vars = buildTrace("growth", {
        ...initialLabSettings,
        number,
      }).frames.at(-1)!.variables;
      expect(vars["linear visits"]).toBe(number);
      expect(vars["pair visits"]).toBe(number * number);
      expect(vars["halving updates"]).toBe(Math.floor(Math.log2(number)));
    },
  );

  it("keeps every highlighted line within its scene's code", () => {
    for (const scenes of Object.values(labScenes))
      for (const scene of scenes) {
        const trace = buildTrace(scene.id, initialLabSettings);
        expect(trace.frames.length).toBeGreaterThan(1);
        for (const frame of trace.frames)
          if (frame.line !== null) {
            expect(frame.line).toBeGreaterThanOrEqual(0);
            expect(frame.line).toBeLessThan(trace.code.length);
          }
      }
  });
});

describe("Visualization controls", () => {
  it("starts paused, supports manual stepping, and cancels playback on unmount", () => {
    vi.useFakeTimers();
    const { unmount } = render(
      <TracePlayer trace={buildTrace("decision", initialLabSettings)} />,
    );
    const progress = screen.getByRole("progressbar") as HTMLProgressElement;
    act(() => vi.advanceTimersByTime(3000));
    expect(progress.value).toBe(0);
    fireEvent.click(screen.getByRole("button", { name: "Next step" }));
    expect(progress.value).toBe(1);
    fireEvent.click(screen.getByRole("button", { name: "Previous step" }));
    expect(progress.value).toBe(0);
    fireEvent.click(screen.getByRole("button", { name: "Play", exact: true }));
    act(() => vi.advanceTimersByTime(1100));
    expect(progress.value).toBe(1);
    fireEvent.click(screen.getByRole("button", { name: "Pause", exact: true }));
    act(() => vi.advanceTimersByTime(2200));
    expect(progress.value).toBe(1);
    fireEvent.click(screen.getByRole("button", { name: "Reset", exact: true }));
    expect(progress.value).toBe(0);
    fireEvent.click(screen.getByRole("button", { name: "Play", exact: true }));
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("resets a trace after changing inputs or scenes", async () => {
    const user = userEvent.setup();
    render(
      <LessonLab
        lesson={programmingLessons["language-syntax-and-input-output"]}
        onPractice={() => {}}
      />,
    );
    await user.click(screen.getByRole("button", { name: "Next step" }));
    expect((screen.getByRole("progressbar") as HTMLProgressElement).value).toBe(
      1,
    );
    fireEvent.change(screen.getByRole("slider"), { target: { value: "7" } });
    expect((screen.getByRole("progressbar") as HTMLProgressElement).value).toBe(
      0,
    );
    await user.click(
      screen.getByRole("button", { name: "Decisions", exact: true }),
    );
    expect((screen.getByRole("progressbar") as HTMLProgressElement).value).toBe(
      0,
    );
    expect(
      screen.getByRole("button", { name: "Play", exact: true }),
    ).toBeTruthy();
  });
});

const sheet: SheetDetail = {
  ...manifest,
  title: "Data Structures & Algorithms",
  description: "A guided path.",
  sort_order: 1,
  is_published: true,
  revision_number: 1,
};
const questionKeys: [string, string, string][] = sheet.steps.flatMap((step) =>
  step.topics.flatMap((topic) =>
    topic.items
      .filter((item) => item.kind === "practice")
      .map(
        (item) =>
          [step.stable_key, topic.stable_key, item.stable_key] as [
            string,
            string,
            string,
          ],
      ),
  ),
);
let account: Account | null;
let requests: { path: string; method: string }[];

beforeEach(() => {
  account = null;
  requests = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, options: RequestInit = {}) => {
      const path = String(input);
      requests.push({ path, method: options.method ?? "GET" });
      const respond = (body: unknown, status = 200) =>
        new Response(JSON.stringify(body), {
          status,
          headers: { "Content-Type": "application/json" },
        });
      if (path.endsWith("/auth/me"))
        return account
          ? respond(account)
          : respond({ detail: "Not signed in" }, 401);
      if (path.endsWith("/sheets/dsa")) return respond(sheet);
      if (path.endsWith("/me/progress/dsa"))
        return respond({
          sheet_slug: "dsa",
          total: questionKeys.length,
          completed: 0,
          question_keys: questionKeys,
          entries: [],
        } satisfies Progress);
      if (path.endsWith("/notes")) return respond({ notes: "" });
      throw new Error(`Unexpected request: ${path}`);
    }),
  );
});

function RouteState() {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <>
      <output aria-label="Current route">
        {location.pathname}
        {location.search}
      </output>
      <button onClick={() => navigate(-1)}>Browser back</button>
    </>
  );
}
function openWorkspace(url = "/sheets/dsa") {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  client.setQueryData(["account"], account);
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/sheets/:slug" element={<SheetPage />} />
        </Routes>
        <RouteState />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return userEvent.setup();
}

describe("Learn → visualize → practice", () => {
  it("opens the first article for guests, then reaches visualizations and the existing questions without account writes", async () => {
    const user = openWorkspace();
    await screen.findByRole("article", {
      name: programmingLessons["language-syntax-and-input-output"].title,
    });
    expect(
      screen.queryByRole("checkbox", { name: "Mark Watermelon complete" }),
    ).toBeNull();
    await user.click(
      screen.getByRole("button", { name: "Visualize", exact: true }),
    );
    await screen.findByRole("region", {
      name: "Interactive visualization lab",
    });
    await user.click(
      screen.getByRole("button", { name: "Go to practice", exact: true }),
    );
    const checkbox = (await screen.findByRole("checkbox", {
      name: "Mark Watermelon complete",
    })) as HTMLInputElement;
    expect(checkbox.disabled).toBe(true);
    expect(
      screen.getAllByRole("button", {
        name: /Read lesson for Language syntax/,
      }),
    ).toHaveLength(3);
    expect(
      requests.some(
        (request) =>
          request.method !== "GET" || request.path.includes("/me/progress"),
      ),
    ).toBe(false);
  });

  it("restores the lesson with browser history and opens each subtopic's own article", async () => {
    const user = openWorkspace();
    await screen.findByRole("article");
    await user.click(
      screen.getByRole("button", { name: "Practice (3)", exact: true }),
    );
    await screen.findByRole("checkbox", { name: "Mark Watermelon complete" });
    await user.click(screen.getByRole("button", { name: "Browser back" }));
    await screen.findByRole("article");
    await user.click(
      screen.getByRole("button", { name: /^Functions and program structure/ }),
    );
    await screen.findByRole("article", {
      name: programmingLessons["functions-and-program-structure"].title,
    });
    await user.click(
      screen.getByRole("button", { name: "Visualize", exact: true }),
    );
    expect(
      screen
        .getByRole("button", { name: "Call & return", exact: true })
        .getAttribute("aria-pressed"),
    ).toBe("true");
  });

  it("honors a bookmarked question and returns to its lesson through the question's content action", async () => {
    const user = openWorkspace(
      `/sheets/dsa?step=${BASIC_PROGRAMMING_STEP}&topic=language-syntax-and-input-output&question=practice-2`,
    );
    await screen.findByRole("checkbox", {
      name: "Mark Way Too Long Words complete",
    });
    expect(
      screen
        .getByRole("button", { name: "Way Too Long Words", exact: true })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    await user.click(
      screen.getAllByRole("button", {
        name: /Read lesson for Language syntax/,
      })[1],
    );
    await screen.findByRole("article");
    expect(screen.getByLabelText("Current route").textContent).not.toContain(
      "question=",
    );
  });

  it("keeps global search usable from Learn and routes a result in another step to practice", async () => {
    const user = openWorkspace();
    await screen.findByRole("article");
    await user.type(screen.getByRole("searchbox"), "Number of Islands");
    const result = await screen.findByRole("button", {
      name: /^Number of Islands/,
    });
    expect(
      screen.queryByRole("article", {
        name: programmingLessons["language-syntax-and-input-output"].title,
      }),
    ).toBeNull();
    await user.click(result);
    await user.click(screen.getByRole("button", { name: "Clear search" }));
    await screen.findByRole("heading", {
      name: "Representation and traversal",
    });
    expect(
      screen.queryByRole("group", { name: "Subtopic learning views" }),
    ).toBeNull();
  });

  it("preserves a private note draft across Learn and Practice without saving it implicitly", async () => {
    account = {
      user: { id: "alice", name: "Alice", email: "alice@example.test" },
      csrf_token: "test-csrf",
    };
    const user = openWorkspace(
      `/sheets/dsa?step=${BASIC_PROGRAMMING_STEP}&topic=language-syntax-and-input-output&view=practice&question=practice`,
    );
    const editor = await screen.findByRole("textbox", { name: "Private note" });
    await user.type(editor, "Remember parity.");
    await user.click(
      within(
        screen.getByRole("group", { name: "Subtopic learning views" }),
      ).getByRole("button", { name: "Learn", exact: true }),
    );
    await screen.findByRole("article");
    await user.click(
      screen.getByRole("button", { name: "Practice (3)", exact: true }),
    );
    await waitFor(() =>
      expect(
        (
          screen.getByRole("textbox", {
            name: "Private note",
          }) as HTMLTextAreaElement
        ).value,
      ).toBe("Remember parity."),
    );
    expect(requests.every((request) => request.method === "GET")).toBe(true);
  });
});
