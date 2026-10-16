import type { LessonId } from "./lessons";

export interface LabSettings {
  number: number;
  index: number;
  replacement: number;
  word: string;
  corrected: boolean;
}

export const initialLabSettings: LabSettings = {
  number: 4,
  index: 2,
  replacement: 99,
  word: "CODE",
  corrected: false,
};

export interface LabScene {
  id: string;
  label: string;
  title: string;
  description: string;
  numberRange?: [number, number];
}

export const labScenes: Record<LessonId, LabScene[]> = {
  syntax: [
    {
      id: "variables",
      label: "Variables & operators",
      title: "A value changes one operation at a time",
      description:
        "Compare integer division, remainder, and fractional division. Step forward to reveal each result.",
      numberRange: [-10, 10],
    },
    {
      id: "decision",
      label: "Decisions",
      title: "Follow the branch that actually runs",
      description:
        "A remainder of zero takes the even branch. Try zero and a negative integer too.",
      numberRange: [-10, 10],
    },
    {
      id: "loop",
      label: "Loops",
      title: "Build a running total",
      description:
        "Follow the condition, body, and update of a for loop. Start with n = 0 to see a loop with no body iterations.",
      numberRange: [0, 10],
    },
  ],
  functions: [
    {
      id: "call",
      label: "Call & return",
      title: "An argument goes in. A result comes back.",
      description:
        "These conceptual frames show the caller's value, the function parameter, and the returned result.",
      numberRange: [0, 10],
    },
    {
      id: "parameters",
      label: "Copy vs reference",
      title: "Two ways to pass one integer",
      description:
        "The copy call changes a local parameter. The reference call changes the caller's original integer.",
      numberRange: [0, 10],
    },
    {
      id: "scope",
      label: "Scope",
      title: "A name belongs to a scope",
      description:
        "Enter and leave a nested block. Watch the inner variable appear, then leave scope.",
    },
  ],
  collections: [
    {
      id: "array",
      label: "Array access",
      title: "Connect an index to its element",
      description:
        "Read an element, update it, and inspect the result. Index 4 deliberately demonstrates a blocked invalid access.",
    },
    {
      id: "string",
      label: "Strings",
      title: "Visit a word, character by character",
      description:
        "These examples use English ASCII letters, so each character occupies one char element. Try the empty string too.",
    },
    {
      id: "vector",
      label: "Vectors & aliases",
      title: "A copy is independent. An alias is shared.",
      description:
        "Watch a copied vector, a reference to the original vector, and an appended element. Capacity is not assumed to follow a fixed growth rule.",
    },
  ],
  complexity: [
    {
      id: "growth",
      label: "Operation counts",
      title: "Count the work before comparing its growth",
      description:
        "Count one body visit, not milliseconds. Adjust n to compare n visits, n² pair visits, and repeated halving.",
      numberRange: [1, 12],
    },
    {
      id: "boundary",
      label: "Boundary debugger",
      title: "Find the first invalid access",
      description:
        "Step to the faulty boundary, then enable the correction and run the same example again. The simulator never performs the invalid read.",
    },
    {
      id: "running",
      label: "Running sum",
      title: "Turn values into prefix totals",
      description:
        "Update the existing sequence in place. The previous element already holds the prefix total needed by the next update.",
    },
  ],
};

export interface TraceFrame {
  line: number | null;
  message: string;
  variables: Record<string, string | number | boolean>;
  groups?: { label: string; values: (string | number)[]; active?: number }[];
  output?: string;
  relation?: string;
  bars?: { label: string; value: number }[];
  blocked?: boolean;
}

export interface GuidedTrace {
  code: string[];
  frames: TraceFrame[];
}

const frame = (
  line: number | null,
  message: string,
  variables: TraceFrame["variables"] = {},
  extra: Omit<TraceFrame, "line" | "message" | "variables"> = {},
): TraceFrame => ({ line, message, variables, ...extra });

const bounded = (value: number, low: number, high: number) =>
  Math.max(
    low,
    Math.min(high, Math.trunc(Number.isFinite(value) ? value : low)),
  );

export function buildTrace(scene: string, settings: LabSettings): GuidedTrace {
  const number = bounded(settings.number, -10, 12);
  switch (scene) {
    case "variables": {
      const vars = { number };
      const quotient = Math.trunc(number / 2);
      const remainder = number % 2 || 0;
      const half = number / 2;
      const even = remainder === 0;
      return {
        code: [
          `int number = ${number};`,
          "int quotient = number / 2;",
          "int remainder = number % 2;",
          "double half = number / 2.0;",
          "bool even = (remainder == 0);",
          "std::cout << quotient << ' ' << remainder;",
        ],
        frames: [
          frame(0, "Declare and initialize the integer number.", vars),
          frame(1, "Integer division truncates toward zero.", {
            ...vars,
            quotient,
          }),
          frame(
            2,
            "The remainder completes the integer division relationship.",
            { ...vars, quotient, remainder },
          ),
          frame(
            3,
            "A floating-point divisor preserves a fractional result here.",
            { ...vars, quotient, remainder, half },
          ),
          frame(4, "Comparing the remainder with zero produces a Boolean.", {
            ...vars,
            quotient,
            remainder,
            half,
            even,
          }),
          frame(
            5,
            "Write the quotient and remainder, separated by a space.",
            { ...vars, quotient, remainder, half, even },
            { output: `${quotient} ${remainder}` },
          ),
        ],
      };
    }
    case "decision": {
      const even = number % 2 === 0;
      const output = even ? "Even" : "Odd";
      const vars = { number, "number % 2": number % 2 || 0 };
      return {
        code: [
          `int number = ${number};`,
          "if (number % 2 == 0) {",
          '    std::cout << "Even";',
          "} else {",
          '    std::cout << "Odd";',
          "}",
        ],
        frames: [
          frame(0, "Read the integer used by the decision.", { number }),
          frame(
            1,
            `The condition is ${even}. Only the matching branch will run.`,
            { ...vars, condition: even },
          ),
          frame(
            even ? 2 : 4,
            `Take the ${even ? "if" : "else"} branch and write ${output}.`,
            vars,
            {
              output,
              relation: even
                ? "Condition true → if branch"
                : "Condition false → else branch",
            },
          ),
          frame(
            null,
            "The other branch was skipped. Continue after the decision.",
            vars,
            { output },
          ),
        ],
      };
    }
    case "loop": {
      const n = bounded(number, 0, 10);
      const frames = [
        frame(0, "Read the non-negative limit.", { n }),
        frame(1, "Initialize the running total to zero.", { n, sum: 0 }),
      ];
      let sum = 0;
      for (let i = 1; i <= n + 1; i++) {
        frames.push(frame(2, `Check ${i} <= ${n}: ${i <= n}.`, { n, i, sum }));
        if (i <= n) {
          const before = sum;
          sum += i;
          frames.push(
            frame(
              3,
              `Add ${i}: ${before} + ${i} = ${sum}. The loop update runs next.`,
              { n, i, sum },
            ),
          );
        }
      }
      frames.push(
        frame(
          5,
          "The loop has ended, so its local i is out of scope. Print sum.",
          { n, sum },
          { output: String(sum) },
        ),
      );
      return {
        code: [
          `int n = ${n};`,
          "int sum = 0;",
          "for (int i = 1; i <= n; ++i) {",
          "    sum += i;",
          "}",
          "std::cout << sum;",
        ],
        frames,
      };
    }
    case "call": {
      const value = bounded(number, 0, 10);
      const result = value * value;
      return {
        code: [
          "int square(int number) {",
          "    return number * number;",
          "}",
          "int main() {",
          `    int value = ${value};`,
          "    int answer = square(value);",
          "    std::cout << answer;",
          "}",
        ],
        frames: [
          frame(4, "main creates its local value.", { "main.value": value }),
          frame(
            5,
            "Call square with value as the argument.",
            { "main.value": value },
            { relation: "main calls square" },
          ),
          frame(0, "square receives an independent int parameter.", {
            "main.value": value,
            "square.number": value,
          }),
          frame(
            1,
            "Calculate the result and return it to the waiting caller.",
            {
              "main.value": value,
              "square.number": value,
              "returned result": result,
            },
          ),
          frame(
            5,
            "The invocation ends. Store the returned value in main's answer.",
            { "main.value": value, "main.answer": result },
            { relation: "square returns to main" },
          ),
          frame(
            6,
            "Print the result. The caller's value was never changed.",
            { "main.value": value, "main.answer": result },
            { output: String(result) },
          ),
        ],
      };
    }
    case "parameters": {
      const value = bounded(number, 0, 10);
      return {
        code: [
          "void increaseCopy(int number) {",
          "    ++number;",
          "}",
          "void increaseOriginal(int& number) {",
          "    ++number;",
          "}",
          `int value = ${value}; // inside main`,
          "increaseCopy(value);",
          "increaseOriginal(value);",
          "std::cout << value;",
        ],
        frames: [
          frame(6, "Create the caller's original integer.", {
            original: value,
          }),
          frame(
            0,
            "The value parameter is a copy.",
            { original: value, "parameter copy": value },
            { relation: "Separate int objects" },
          ),
          frame(1, "Increment only the copy.", {
            original: value,
            "parameter copy": value + 1,
          }),
          frame(
            7,
            "The copied parameter leaves scope. The original is unchanged.",
            { original: value },
          ),
          frame(
            3,
            "The reference parameter aliases the original integer.",
            { original: value, "reference parameter": value },
            { relation: "number aliases the original integer" },
          ),
          frame(
            4,
            "Increment through the alias: the original changes too.",
            { original: value + 1, "reference parameter": value + 1 },
            { relation: "One integer, two names" },
          ),
          frame(
            9,
            "The reference call has returned. Print the original.",
            { original: value + 1 },
            { output: String(value + 1) },
          ),
        ],
      };
    }
    case "scope":
      return {
        code: [
          "int value = 10; // inside main",
          "{",
          "    int inner = 20;",
          "    std::cout << value + inner << '\\n';",
          "}",
          "std::cout << value;",
          "// inner is not accessible here",
        ],
        frames: [
          frame(0, "value is visible in the enclosing block.", { value: 10 }),
          frame(
            2,
            "Enter a nested block and create inner.",
            { value: 10, inner: 20 },
            { relation: "Inner scope can see the outer value" },
          ),
          frame(
            3,
            "Both names are visible here; print their sum.",
            { value: 10, inner: 20 },
            { output: "30\n" },
          ),
          frame(
            4,
            "Leave the inner block. inner is now out of scope.",
            { value: 10 },
            { output: "30\n" },
          ),
          frame(
            5,
            "The outer variable is still available.",
            { value: 10 },
            { output: "30\n10" },
          ),
          frame(
            6,
            "Using the name inner here would be a compilation error.",
            { value: 10 },
            { output: "30\n10" },
          ),
        ],
      };
    case "array": {
      const values = [10, 20, 30, 40];
      const index = bounded(settings.index, 0, 4);
      const replacement = bounded(settings.replacement, 0, 99);
      const group = { label: "values", values, active: index };
      const frames = [
        frame(
          0,
          "Create four elements. Their valid indices are 0 through 3.",
          { size: 4 },
          { groups: [group] },
        ),
        frame(
          1,
          "Choose the element index.",
          { size: 4, index },
          { groups: [group] },
        ),
      ];
      if (index >= values.length) {
        frames.push(
          frame(
            2,
            "Blocked before reading index 4. It is outside 0…3; unchecked C++ access would be undefined behavior.",
            { size: 4, index },
            { groups: [group], blocked: true },
          ),
        );
      } else {
        frames.push(
          frame(
            2,
            `Read values[${index}]: ${values[index]}.`,
            { index, current: values[index] },
            { groups: [group] },
          ),
        );
        const updated = values.map((v, i) => (i === index ? replacement : v));
        frames.push(
          frame(
            3,
            `Replace only the selected element with ${replacement}.`,
            { index, current: values[index] },
            { groups: [{ ...group, values: updated }] },
          ),
        );
        frames.push(
          frame(
            4,
            "Reading the element again returns its updated value; current retains the earlier copy.",
            { index, current: values[index] },
            {
              groups: [{ ...group, values: updated }],
              output: String(replacement),
            },
          ),
        );
      }
      return {
        code: [
          "int values[4] = {10, 20, 30, 40};",
          `int index = ${index};`,
          "int current = values[index];",
          `values[index] = ${replacement};`,
          "std::cout << values[index];",
        ],
        frames,
      };
    }
    case "string": {
      const word = settings.word.replace(/[^A-Za-z]/g, "").slice(0, 8);
      const values = word.split("");
      let output = "";
      const frames = [
        frame(
          0,
          "Create the string and inspect its number of char elements.",
          { size: word.length },
          { groups: [{ label: "word", values }] },
        ),
      ];
      for (let i = 0; i <= word.length; i++) {
        frames.push(
          frame(
            1,
            `Check ${i} < ${word.length}: ${i < word.length}.`,
            { i, size: word.length },
            { groups: [{ label: "word", values, active: i }], output },
          ),
        );
        if (i < word.length) {
          output += `${word[i]} `;
          frames.push(
            frame(
              2,
              `Read character ${word[i]} at index ${i}, then write it and a space.`,
              { i, character: word[i] },
              { groups: [{ label: "word", values, active: i }], output },
            ),
          );
        }
      }
      frames.push(
        frame(
          null,
          "Traversal is complete. An empty string has no character visits.",
          { size: word.length },
          { groups: [{ label: "word", values }], output },
        ),
      );
      return {
        code: [
          `std::string word = "${word}";`,
          "for (std::size_t i = 0; i < word.size(); ++i) {",
          "    std::cout << word[i] << ' ';",
          "}",
        ],
        frames,
      };
    }
    case "vector": {
      const original = [10, 20];
      const changedCopy = [99, 20];
      const changedOriginal = [10, 88];
      const finalOriginal = [10, 88, 30];
      return {
        code: [
          "std::vector<int> values{10, 20};",
          "auto copy = values;",
          "copy[0] = 99;",
          "auto& alias = values;",
          "alias[1] = 88;",
          "values.push_back(30);",
        ],
        frames: [
          frame(
            0,
            "Create a vector with two elements. Capacity is at least two.",
            { size: 2, capacity: "at least 2" },
            { groups: [{ label: "Original values", values: original }] },
          ),
          frame(
            1,
            "Copy the vector's int elements into independent storage.",
            { size: 2 },
            {
              groups: [
                { label: "Original values", values: original },
                { label: "Independent copy", values: original },
              ],
            },
          ),
          frame(
            2,
            "Change the copy. The original elements remain unchanged.",
            { size: 2 },
            {
              groups: [
                { label: "Original values", values: original },
                { label: "Independent copy", values: changedCopy, active: 0 },
              ],
            },
          ),
          frame(
            3,
            "Bind alias to the original vector object.",
            { size: 2 },
            {
              groups: [
                { label: "Original values", values: original },
                { label: "Independent copy", values: changedCopy },
              ],
              relation: "alias names the original vector object",
            },
          ),
          frame(
            4,
            "Updating through alias changes the original, but not the copy.",
            { size: 2 },
            {
              groups: [
                {
                  label: "Original values",
                  values: changedOriginal,
                  active: 1,
                },
                { label: "Independent copy", values: changedCopy },
              ],
              relation: "values and alias name one vector",
            },
          ),
          frame(
            5,
            "Append an element. Size becomes three; storage may have reallocated. No exact capacity is assumed.",
            { size: 3, capacity: "at least 3" },
            {
              groups: [
                { label: "Original values", values: finalOriginal, active: 2 },
                { label: "Independent copy", values: changedCopy },
              ],
            },
          ),
        ],
      };
    }
    case "growth": {
      const n = bounded(number, 1, 12);
      let remaining = n;
      let halves = 0;
      while (remaining > 1) {
        remaining = Math.trunc(remaining / 2);
        halves++;
      }
      const bars = [
        { label: "Linear body visits", value: n },
        { label: "Ordered-pair body visits", value: n * n },
      ];
      return {
        code: [
          `int n = ${n};`,
          "for (int i = 0; i < n; ++i) visit(i);",
          "for (int i = 0; i < n; ++i)",
          "    for (int j = 0; j < n; ++j) visitPair(i, j);",
          "int remaining = n;",
          "while (remaining > 1) remaining /= 2;",
        ],
        frames: [
          frame(
            0,
            "Choose n. We count the visits inside each loop, not every machine instruction.",
            { n },
          ),
          frame(
            1,
            `The first full traversal finishes after ${n} visits.`,
            { n, "linear visits": n },
            { bars: [{ label: "Linear body visits", value: n }] },
          ),
          frame(
            3,
            `The nested traversals finish after ${n} × ${n} = ${n * n} ordered-pair visits.`,
            { n, "linear visits": n, "pair visits": n * n },
            { bars },
          ),
          frame(
            5,
            `Repeated integer halving reaches one after ${halves} updates. Change n to explore how the three counts grow.`,
            {
              n,
              "linear visits": n,
              "pair visits": n * n,
              "halving updates": halves,
            },
            { bars },
          ),
        ],
      };
    }
    case "boundary": {
      const values = [2, 1, 3];
      const frames = [
        frame(
          0,
          "There are three elements. Index three is not one of them.",
          { size: 3 },
          { groups: [{ label: "values", values }] },
        ),
        frame(
          1,
          "Initialize the accumulator.",
          { sum: 0 },
          { groups: [{ label: "values", values }] },
        ),
      ];
      let sum = 0;
      for (let i = 0; i <= values.length; i++) {
        const condition = settings.corrected
          ? i < values.length
          : i <= values.length;
        frames.push(
          frame(
            2,
            `Check ${i} ${settings.corrected ? "<" : "<="} 3: ${condition}.`,
            { i, size: 3, sum },
            { groups: [{ label: "values", values, active: i }] },
          ),
        );
        if (!condition) break;
        if (i === values.length) {
          frames.push(
            frame(
              3,
              "Blocked: index 3 is outside the array. The condition allowed one iteration too many. Enable the correction and try again.",
              { i, size: 3, sum },
              { groups: [{ label: "values", values }], blocked: true },
            ),
          );
          break;
        }
        sum += values[i];
        frames.push(
          frame(
            3,
            `Read index ${i} safely and update sum to ${sum}.`,
            { i, sum },
            { groups: [{ label: "values", values, active: i }] },
          ),
        );
      }
      if (settings.corrected)
        frames.push(
          frame(
            5,
            "The corrected condition stops before index 3. Print the sum.",
            { sum },
            { groups: [{ label: "values", values }], output: String(sum) },
          ),
        );
      return {
        code: [
          "int values[3] = {2, 1, 3};",
          "int sum = 0;",
          `for (int i = 0; i ${settings.corrected ? "<" : "<="} 3; ++i) {`,
          "    sum += values[i];",
          "}",
          "std::cout << sum;",
        ],
        frames,
      };
    }
    case "running": {
      const values = [2, 1, 3];
      const frames = [
        frame(
          0,
          "Keep the first element. Each following element will become a prefix total.",
          {},
          { groups: [{ label: "values", values: [...values], active: 0 }] },
        ),
      ];
      for (let i = 1; i <= values.length; i++) {
        frames.push(
          frame(
            1,
            `Check ${i} < ${values.length}: ${i < values.length}.`,
            { i },
            { groups: [{ label: "values", values: [...values], active: i }] },
          ),
        );
        if (i < values.length) {
          const previous = values[i - 1];
          const current = values[i];
          values[i] += previous;
          frames.push(
            frame(
              2,
              `${current} + previous prefix ${previous} = ${values[i]}. Store it at index ${i}.`,
              { i, "previous prefix": previous },
              { groups: [{ label: "values", values: [...values], active: i }] },
            ),
          );
        }
      }
      frames.push(
        frame(
          null,
          "Every position now contains the sum through that position. No second sequence was allocated.",
          { "auxiliary space": "O(1)", time: "O(n)" },
          {
            groups: [{ label: "values", values: [...values] }],
            output: `[${values.join(", ")}]`,
          },
        ),
      );
      return {
        code: [
          "std::vector<long long> values{2, 1, 3};",
          "for (std::size_t i = 1; i < values.size(); ++i) {",
          "    values[i] += values[i - 1];",
          "}",
        ],
        frames,
      };
    }
    default:
      throw new Error("Unknown programming visualization");
  }
}
