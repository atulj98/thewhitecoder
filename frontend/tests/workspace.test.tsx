import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SheetPage from "../src/pages/SheetPage";
import { questionKey, type Account, type Progress } from "../src/api/account";
import type { SheetDetail } from "../src/api/sheets";

const practice = (stable_key: string, title: string) => ({
  stable_key,
  title,
  kind: "practice",
  source_url: `https://leetcode.com/problems/${stable_key}/`,
  content_url: null,
});
const sheet: SheetDetail = {
  slug: "dsa",
  title: "Data Structures & Algorithms",
  description: "Build your understanding.",
  sort_order: 1,
  is_published: true,
  revision_number: 1,
  steps: [
    {
      stable_key: "arrays",
      title: "Arrays",
      topics: [
        {
          stable_key: "traversal",
          title: "Traversal and updates",
          items: [
            {
              stable_key: "learn",
              title: "Learn array indexing",
              kind: "concept",
              source_url: null,
            },
            practice("maximum", "Largest Element"),
            practice("second", "Second Largest"),
            practice("rotate", "Rotate Array"),
          ],
        },
        {
          stable_key: "prefix",
          title: "Prefix sums",
          items: [
            practice("sum", "Range Sum"),
            practice("subarray", "Subarray Sum Equals K"),
          ],
        },
      ],
    },
    {
      stable_key: "graph",
      title: "Graph",
      topics: [
        {
          stable_key: "bfs",
          title: "Breadth first search",
          items: [practice("islands", "Number of Islands")],
        },
      ],
    },
  ],
};
const keys: [string, string, string][] = sheet.steps.flatMap((step) =>
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
const alice: Account = {
  user: { id: "alice", name: "Alice", email: "alice@example.test" },
  csrf_token: "alice-csrf",
};
let account: Account | null;
let progress: Progress;
let notes: Record<string, string>;
let failSave: boolean;
let deferredWrite: Promise<void> | undefined;
let deferredNote: { key: string; promise: Promise<Response> } | undefined;
let writes: { path: string; options: RequestInit }[];
let noteReads: string[];
let client: QueryClient;

const response = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
beforeEach(() => {
  account = alice;
  progress = {
    sheet_slug: "dsa",
    total: keys.length,
    completed: 0,
    question_keys: keys,
    entries: [],
  };
  notes = {};
  failSave = false;
  deferredWrite = undefined;
  deferredNote = undefined;
  writes = [];
  noteReads = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string, options: RequestInit = {}) => {
      const path = String(input);
      if (path.endsWith("/auth/me"))
        return account
          ? response(account)
          : response({ detail: "Not signed in" }, 401);
      if (path.endsWith("/sheets/dsa")) return response(sheet);
      if (path.includes("/me/progress/dsa")) {
        const parts = path
          .split("/me/progress/dsa")[1]
          .split("/")
          .filter(Boolean)
          .map(decodeURIComponent);
        if (!options.method || options.method === "GET") {
          if (!parts.length) return response(progress);
          const key = questionKey(parts[1], parts[2], parts[3]);
          noteReads.push(key);
          if (deferredNote?.key === key) return deferredNote.promise;
          return response({ notes: notes[key] ?? "" });
        }
        writes.push({ path, options });
        if (failSave)
          return response({ detail: "Save failed. Please retry." }, 503);
        const body = JSON.parse(options.body as string);
        const changed = keys.filter(
          ([step, topic, item]) =>
            step === parts[1] &&
            topic === parts[2] &&
            (parts[0] === "topics" || item === parts[3]),
        );
        const entries = new Map(
          progress.entries.map((entry) => [
            questionKey(entry.step_key, entry.topic_key, entry.item_key),
            { ...entry },
          ]),
        );
        for (const [step, topic, item] of changed) {
          const key = questionKey(step, topic, item);
          const entry = entries.get(key) ?? {
            step_key: step,
            topic_key: topic,
            item_key: item,
            completed: false,
            has_notes: false,
          };
          if (typeof body.completed === "boolean")
            entry.completed = body.completed;
          if (typeof body.notes === "string") {
            notes[key] = body.notes;
            entry.has_notes = body.notes.length > 0;
          }
          entries.set(key, entry);
        }
        progress = {
          ...progress,
          entries: [...entries.values()],
          completed: [...entries.values()].filter((entry) => entry.completed)
            .length,
        };
        const result = response(progress);
        if (deferredWrite) await deferredWrite;
        return result;
      }
      throw new Error(`Unexpected request: ${path}`);
    }),
  );
});

function Location() {
  const location = useLocation();
  return (
    <output aria-label="Current route">
      {location.pathname}
      {location.search}
    </output>
  );
}
function open(url = "/sheets/dsa") {
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 60000, gcTime: 0 } },
  });
  client.setQueryData(["account"], account);
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/sheets/:slug" element={<SheetPage />} />
        </Routes>
        <Location />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return userEvent.setup();
}
async function ready() {
  await waitFor(() =>
    expect(
      (
        screen.getByRole("checkbox", {
          name: "Mark Largest Element complete",
        }) as HTMLInputElement
      ).disabled,
    ).toBe(false),
  );
}
function markInitial(count: number) {
  progress.entries = keys
    .slice(0, count)
    .map(([step_key, topic_key, item_key]) => ({
      step_key,
      topic_key,
      item_key,
      completed: true,
      has_notes: false,
    }));
  progress.completed = count;
}

describe("Learning Workspace", () => {
  it("lets guests search the whole sheet without editing or fetching private notes", async () => {
    account = null;
    const user = open();
    await screen.findByRole("heading", { name: "Traversal and updates" });
    expect(
      (
        screen.getByRole("checkbox", {
          name: "Mark Largest Element complete",
        }) as HTMLInputElement
      ).disabled,
    ).toBe(true);
    expect(
      (
        screen.getByRole("button", {
          name: "Solved",
          exact: true,
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    await user.type(screen.getByRole("searchbox"), "islands");
    await screen.findByRole("button", { name: /^Number of Islands/ });
    expect(
      screen.queryByRole("button", { name: "Largest Element", exact: true }),
    ).toBeNull();
    expect(noteReads).toHaveLength(0);
  });
  it("keeps Mark subtopic done unchecked after one completion and when filtered", async () => {
    const user = open();
    await ready();
    const master = () =>
      screen.getByRole("checkbox", {
        name: "Mark all 3 questions in Traversal and updates complete",
      }) as HTMLInputElement;
    await user.click(
      screen.getByRole("checkbox", { name: "Mark Largest Element complete" }),
    );
    await waitFor(() =>
      expect(
        (
          screen.getByRole("checkbox", {
            name: "Mark Largest Element complete",
          }) as HTMLInputElement
        ).checked,
      ).toBe(true),
    );
    expect(master().checked).toBe(false);
    expect(master().indeterminate).toBe(false);
    await user.click(
      screen.getByRole("button", { name: "Solved", exact: true }),
    );
    expect(
      screen.queryByRole("checkbox", { name: "Mark Rotate Array complete" }),
    ).toBeNull();
    expect(master().checked).toBe(false);
    await user.click(master());
    await waitFor(() => expect(master().checked).toBe(true));
    expect(progress.completed).toBe(3);
    expect(JSON.parse(writes[1].options.body as string)).toEqual({
      completed: true,
    });
    expect(writes[1].path).toContain("/topics/arrays/traversal");
  });
  it("opens the first unfinished question across steps and stores selection in the URL", async () => {
    markInitial(5);
    const user = open();
    await ready();
    await user.click(screen.getByRole("button", { name: "Continue learning" }));
    await screen.findByRole("heading", { name: "Breadth first search" });
    expect(screen.getByLabelText("Current route").textContent).toContain(
      "step=graph&topic=bfs&question=islands",
    );
    expect(
      screen
        .getByRole("button", { name: "Number of Islands", exact: true })
        .getAttribute("aria-pressed"),
    ).toBe("true");
  });
  it("supports a bookmarked question", async () => {
    open("/sheets/dsa?step=arrays&topic=prefix&question=subarray");
    await screen.findByRole("heading", { name: "Prefix sums" });
    expect(
      screen
        .getByRole("button", { name: "Subarray Sum Equals K", exact: true })
        .getAttribute("aria-pressed"),
    ).toBe("true");
  });

  it("falls back to a usable topic for an invalid bookmark", async () => {
    open("/sheets/dsa?step=removed&topic=missing&question=old");
    await ready();
    expect(
      screen.getByRole("heading", { name: "Traversal and updates" }),
    ).toBeTruthy();
  });

  it("does not apply a previous account's delayed completion to the new account", async () => {
    let release!: () => void;
    deferredWrite = new Promise((resolve) => {
      release = resolve;
    });
    const user = open();
    await ready();
    await user.click(
      screen.getByRole("checkbox", { name: "Mark Largest Element complete" }),
    );
    await waitFor(() => expect(writes).toHaveLength(1));
    account = {
      user: { id: "bob", name: "Bob", email: "bob@example.test" },
      csrf_token: "bob-csrf",
    };
    progress = { ...progress, completed: 0, entries: [] };
    await act(async () => {
      client.setQueryData(["account"], account);
    });
    await waitFor(() =>
      expect(
        client.getQueryData<Progress>(["progress", "bob", "dsa"])?.completed,
      ).toBe(0),
    );
    await act(async () => {
      release();
    });
    await ready();
    expect(
      (
        screen.getByRole("checkbox", {
          name: "Mark Largest Element complete",
        }) as HTMLInputElement
      ).checked,
    ).toBe(false);
    expect(
      client.getQueryData<Progress>(["progress", "bob", "dsa"])?.completed,
    ).toBe(0);
  });

  it("keeps newer edits when an earlier save finishes after switching questions", async () => {
    let release!: () => void;
    deferredWrite = new Promise((resolve) => {
      release = resolve;
    });
    const user = open();
    await ready();
    await user.type(
      await screen.findByRole("textbox", { name: "Private note" }),
      "First draft.",
    );
    await user.click(screen.getByRole("button", { name: "Save note" }));
    await waitFor(() => expect(writes).toHaveLength(1));
    await user.click(
      screen.getByRole("button", { name: "Rotate Array", exact: true }),
    );
    await screen.findByRole("textbox", { name: "Private note" });
    await user.click(
      screen.getByRole("button", { name: "Largest Element", exact: true }),
    );
    await user.type(
      await screen.findByRole("textbox", { name: "Private note" }),
      " More to remember.",
    );
    await act(async () => {
      release();
    });
    await waitFor(() =>
      expect(
        (screen.getByRole("button", { name: "Save note" }) as HTMLButtonElement)
          .disabled,
      ).toBe(false),
    );
    expect(
      (
        screen.getByRole("textbox", {
          name: "Private note",
        }) as HTMLTextAreaElement
      ).value,
    ).toBe("First draft. More to remember.");
    expect(screen.getByText("Unsaved draft")).toBeTruthy();
  });

  it("filters saved notes without changing question completion", async () => {
    const [step_key, topic_key, item_key] = keys[1];
    progress.entries = [
      { step_key, topic_key, item_key, completed: false, has_notes: true },
    ];
    const user = open();
    await ready();
    await user.click(
      screen.getByRole("button", { name: "Has notes", exact: true }),
    );
    expect(
      screen.getByRole("button", { name: "Second Largest", exact: true }),
    ).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: "Largest Element", exact: true }),
    ).toBeNull();
    expect(writes).toHaveLength(0);
  });
  it("preserves note drafts across questions and saves only the selected question's note", async () => {
    const user = open();
    await ready();
    const textarea = await screen.findByRole("textbox", {
      name: "Private note",
    });
    await user.type(textarea, "Remember the edge case.");
    await user.click(
      screen.getByRole("button", { name: "Rotate Array", exact: true }),
    );
    await waitFor(() =>
      expect(
        (
          screen.getByRole("textbox", {
            name: "Private note",
          }) as HTMLTextAreaElement
        ).value,
      ).toBe(""),
    );
    await user.click(
      screen.getByRole("button", { name: "Largest Element", exact: true }),
    );
    await waitFor(() =>
      expect(
        (
          screen.getByRole("textbox", {
            name: "Private note",
          }) as HTMLTextAreaElement
        ).value,
      ).toBe("Remember the edge case."),
    );
    await user.click(screen.getByRole("button", { name: "Save note" }));
    await screen.findByText("Note saved.");
    expect(writes[0].path).toContain("/questions/arrays/traversal/maximum");
    expect(JSON.parse(writes[0].options.body as string)).toEqual({
      notes: "Remember the edge case.",
    });
    expect(
      (writes[0].options.headers as Record<string, string>)["X-CSRF-Token"],
    ).toBe("alice-csrf");
    expect(progress.completed).toBe(0);
    expect(notes[questionKey("arrays", "traversal", "maximum")]).toBe(
      "Remember the edge case.",
    );
  });
  it("retains drafts on a failed save and allows retry", async () => {
    const user = open();
    await ready();
    await user.type(
      await screen.findByRole("textbox", { name: "Private note" }),
      "Don't lose this.",
    );
    failSave = true;
    await user.click(screen.getByRole("button", { name: "Save note" }));
    await waitFor(() =>
      expect(
        screen.getAllByText("Save failed. Please retry.").length,
      ).toBeGreaterThan(0),
    );
    expect(
      (
        screen.getByRole("textbox", {
          name: "Private note",
        }) as HTMLTextAreaElement
      ).value,
    ).toBe("Don't lose this.");
    failSave = false;
    await user.click(screen.getByRole("button", { name: "Save note" }));
    await screen.findByText("Note saved.");
  });
  it("does not put a delayed note response into another question", async () => {
    let resolve!: (value: Response) => void;
    deferredNote = {
      key: questionKey("arrays", "traversal", "maximum"),
      promise: new Promise((done) => {
        resolve = done;
      }),
    };
    notes[questionKey("arrays", "traversal", "rotate")] = "Rotate note.";
    const user = open();
    await ready();
    await waitFor(() => expect(noteReads).toContain(deferredNote!.key));
    await user.click(
      screen.getByRole("button", { name: "Rotate Array", exact: true }),
    );
    await waitFor(() =>
      expect(
        (
          screen.getByRole("textbox", {
            name: "Private note",
          }) as HTMLTextAreaElement
        ).value,
      ).toBe("Rotate note."),
    );
    await act(async () => {
      resolve(response({ notes: "Late maximum note." }));
    });
    expect(
      (
        screen.getByRole("textbox", {
          name: "Private note",
        }) as HTMLTextAreaElement
      ).value,
    ).toBe("Rotate note.");
  });
  it("removes private drafts when the account changes", async () => {
    const user = open();
    await ready();
    await user.type(
      await screen.findByRole("textbox", { name: "Private note" }),
      "Alice private draft",
    );
    account = {
      user: { id: "bob", name: "Bob", email: "bob@example.test" },
      csrf_token: "bob-csrf",
    };
    notes = {};
    await act(async () => {
      client.setQueryData(["account"], account);
    });
    await waitFor(() =>
      expect(
        (
          screen.getByRole("textbox", {
            name: "Private note",
          }) as HTMLTextAreaElement
        ).value,
      ).toBe(""),
    );
    expect(screen.queryByText("1 unsaved note draft")).toBeNull();
  });
  it("blocks edits and note reads when API and published sheet versions differ", async () => {
    progress = { ...progress, total: keys.length + 1 };
    open();
    await screen.findByText(
      /This sheet and your saved progress use different versions/,
    );
    expect(
      (
        screen.getByRole("checkbox", {
          name: "Mark Largest Element complete",
        }) as HTMLInputElement
      ).disabled,
    ).toBe(true);
    expect(noteReads).toHaveLength(0);
  });
  it("shows completion honestly when every question is finished", async () => {
    markInitial(keys.length);
    open();
    await ready();
    expect(
      (
        screen.getByRole("button", {
          name: "All questions completed",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    expect(
      screen.getByRole("heading", { name: "Look how far you've come." }),
    ).toBeTruthy();
    expect(
      (
        screen.getByRole("progressbar", {
          name: "Overall question progress",
        }) as HTMLProgressElement
      ).value,
    ).toBe(keys.length);
  });
});
