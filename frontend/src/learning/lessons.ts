export type LessonId = "syntax" | "functions" | "collections" | "complexity";

export interface ArticleSection {
  title: string;
  paragraphs: string[];
  code?: string;
  table?: { headings: string[]; rows: string[][] };
  takeaway?: string;
}

export interface ProgrammingLesson {
  id: LessonId;
  title: string;
  introduction: string;
  outcomes: string[];
  sections: ArticleSection[];
  mistakes: string[];
  exercises: { prompt: string; explanation: string; code?: string }[];
  practiceAdvice: string;
  references: { title: string; url: string }[];
}

export const BASIC_PROGRAMMING_STEP =
  "basic-programming-knowledge-required-for-dsa";

export const programmingLessons: Record<string, ProgrammingLesson> = {
  "language-syntax-and-input-output": {
    id: "syntax",
    title: "How a program reads, thinks, and produces an answer",
    introduction:
      "A program turns an input into an output by following instructions. You will learn how values are stored, how a decision chooses a path, and how a loop repeats useful work. Start with the small examples here, then follow the same ideas in the visual lab.",
    outcomes: [
      "Read input and explain how each statement changes a variable.",
      "Choose a condition or loop that matches the task.",
      "Trace a short program before running it.",
    ],
    sections: [
      {
        title: "Your first C++ program",
        paragraphs: [
          "A hosted C++ program starts at `main()`. The braces group its statements, and a semicolon ends many ordinary statements. `#include <iostream>` makes the standard input and output facilities available. The `std::` prefix identifies a name from the standard library.",
          "In this complete example, the program reads a whole number and prints twice its value. Enter `7` to get `14`. The input check exits if a number cannot be read. `return 0` reports successful completion; `return 1` reports an unsuccessful exit in this example.",
        ],
        code: String.raw`#include <iostream>

int main() {
    int number = 0;
    if (!(std::cin >> number)) return 1;
    std::cout << number * 2 << '\n';
    return 0;
}`,
        takeaway:
          "Read the program from main, one statement at a time. Comments explain code to people; they do not perform work.",
      },
      {
        title: "Variables, values, and types",
        paragraphs: [
          "A variable gives a value a name. `int score = 10;` declares a whole-number variable and initializes it to ten. A later assignment, `score = 12;`, replaces the stored value. Initialize a variable before reading its value.",
          "The type determines which values and operations are supported. Use `int` or `long long` for whole numbers, `double` for approximate fractional values, `char` for a character, and `bool` for true or false. `std::string` stores text and requires `<string>`. The exact range of an integer type depends on the implementation; choose a type using the problem's constraints. Signed integer overflow is undefined behavior.",
        ],
        code: String.raw`// Declarations inside main; include <string> for std::string.
int score = 10;
long long population = 10000000000LL;
double temperature = 23.5;
char grade = 'A';
bool passed = true;
std::string name = "Atul";
score = score + 2;  // score is now 12`,
      },
      {
        title: "Read input and write output",
        paragraphs: [
          "`std::cin >> value` reads a formatted value. Spaces and newlines can separate numeric inputs. `std::cout << value` writes a value; add a space or a newline when the output needs a separator. In a coding assessment, match the requested output rather than printing extra prompts.",
          "`std::cin >> word` reads one whitespace-delimited word. `std::getline(std::cin, line)` reads a line, including spaces. After formatted input, a newline may still be waiting: `std::getline(std::cin >> std::ws, line)` skips leading whitespace first. Use that form only when leading spaces and blank lines are not significant; otherwise consume the pending newline deliberately.",
        ],
        code: String.raw`// Inside main; include <iostream> and <string>.
int age = 0;
std::string fullName;
std::cin >> age;
std::getline(std::cin >> std::ws, fullName);
std::cout << fullName << " is " << age << '\n';`,
      },
      {
        title: "Calculate and compare",
        paragraphs: [
          "Arithmetic operators include `+`, `-`, `*`, `/`, and `%`. With integer operands, division truncates toward zero. For positive integers, `7 / 2` is three and `7 % 2` is one. A floating-point operand changes the division: `7.0 / 2` is 3.5. Division or remainder by zero is invalid.",
          "`=` assigns a value. `==`, `!=`, `<`, `<=`, `>`, and `>=` compare values and produce a Boolean result. Combine conditions with `&&` (and), `||` (or), and `!` (not). C++ short-circuits `&&` and `||`: the right-hand expression is evaluated only when needed. Parentheses make the intended grouping easier to read.",
        ],
        table: {
          headings: ["Expression", "Value", "Reason"],
          rows: [
            ["`7 / 2`", "3", "Both operands are integers"],
            ["`7.0 / 2`", "3.5", "A floating-point operand"],
            ["`7 % 2`", "1", "Remainder after division"],
            ["`7 > 2 && 7 < 10`", "true", "Both comparisons are true"],
          ],
        },
      },
      {
        title: "Make a decision",
        paragraphs: [
          "An `if` statement executes its body when its condition is true. An `else` body runs when that condition is false. An `else if` chain checks conditions in order and takes the first matching branch. Use braces even for short bodies while learning: they make the boundary of each branch visible.",
          "To test whether an integer is even, compare its remainder with zero. This condition works for zero and negative even integers too. A `switch` can select among discrete cases; each ordinary case usually ends with `break` to avoid continuing into the next case.",
        ],
        code: String.raw`// Inside main, with number already read.
if (number % 2 == 0) {
    std::cout << "Even\n";
} else {
    std::cout << "Odd\n";
}`,
      },
      {
        title: "Repeat work with a loop",
        paragraphs: [
          "A `for` loop has an initialization, a condition checked before each iteration, and an update after its body. A `while` loop also checks before its body; it is useful when the number of repetitions is not known in advance. A `do ... while` checks afterward and therefore runs its body at least once.",
          "This complete program sums the integers from one through a non-negative `n`. For `n = 4`, the running sum becomes 1, 3, 6, then 10. For `n = 0`, the body never runs and the answer stays zero. The upper bound here keeps the demonstration's result within range.",
          "`break` leaves the nearest loop. `continue` skips the rest of the current iteration; in a `for` loop, its update still runs. In a `while` loop, make sure a continue cannot skip the update needed for termination. A variable declared in a for initializer is scoped to that loop.",
        ],
        code: String.raw`#include <iostream>

int main() {
    int n = 0;
    if (!(std::cin >> n) || n < 0 || n > 1000000) return 1;
    long long sum = 0;
    for (int i = 1; i <= n; ++i) {
        sum += i;
    }
    std::cout << sum << '\n';
    return 0;
}`,
        takeaway:
          "Before stepping through the loop, predict its first iteration, last iteration, and stopping condition.",
      },
      {
        title: "Handle multiple test cases",
        paragraphs: [
          "Some problems give `t` independent inputs. Read t once, then solve each case inside a loop. Initialize per-case variables inside that loop so an earlier answer cannot leak into the next case.",
          "Read the constraints before choosing a type or algorithm. Large input values can overflow a calculation even when each individual input fits in an int. First make the solution correct and clear; optimize when the input limits require it.",
        ],
        code: String.raw`// Inside main; input is assumed to follow the problem format.
int t = 0;
std::cin >> t;
for (int test = 0; test < t; ++test) {
    int number = 0;
    std::cin >> number;
    std::cout << (number % 2 == 0 ? "Even" : "Odd") << '\n';
}`,
      },
    ],
    mistakes: [
      "Using assignment where a comparison is intended, or leaving a variable uninitialized.",
      "Expecting integer division to retain a fractional part.",
      "Using the wrong loop boundary or an update that never reaches the stopping condition.",
      "Losing a line of input when switching between formatted input and getline.",
    ],
    exercises: [
      {
        prompt: "Predict 9 / 2, 9 % 2, and 9.0 / 2.",
        explanation:
          "The results are 4, 1, and 4.5. The operand types determine how division behaves.",
      },
      {
        prompt: "Print only the even numbers from 1 through n.",
        explanation:
          "Start at two and increase by two, or test each integer's remainder. For n = 7, print 2 4 6.",
        code: "for (int i = 2; i <= n; i += 2) {\n    std::cout << i << ' ';\n}",
      },
      {
        prompt: "Predict the sum program's output for n = 0, 1, and 4.",
        explanation:
          "The answers are 0, 1, and 10. Zero is useful because it tests a loop that executes no iterations.",
      },
    ],
    practiceAdvice:
      "Start with Watermelon after conditions. Return to Way Too Long Words after the string lesson and Next Round after arrays; those questions stay available in Practice.",
    references: [
      {
        title: "Microsoft Learn · for statement",
        url: "https://learn.microsoft.com/en-us/cpp/cpp/for-statement-cpp",
      },
    ],
  },
  "functions-and-program-structure": {
    id: "functions",
    title: "Break a problem into small, reusable operations",
    introduction:
      "A function gives a useful operation a name. Its parameters describe the inputs it accepts, and its return type describes the result it provides. Build a solution from small operations that you can understand and test on their own.",
    outcomes: [
      "Follow an argument into a function and its result back to the caller.",
      "Explain the difference between a copied parameter and a reference.",
      "Organize a solution using clear responsibilities and scope.",
    ],
    sections: [
      {
        title: "Define, call, and return",
        paragraphs: [
          "In `int square(int number)`, int is the return type, square is the function name, and number is a parameter. In `square(value)`, value is the argument supplied by the caller. A definition must be visible, or a declaration must appear, before a call that needs it.",
          "Calling a function transfers control to its body. A return statement sends a result back and ends that invocation. This program prints 16. Printing inside a function and returning a value serve different purposes: a returned value can be used in another calculation without producing output.",
        ],
        code: String.raw`#include <iostream>

int square(int number) {
    return number * number;
}

int main() {
    int value = 4;
    int answer = square(value);
    std::cout << answer << '\n';
    return 0;
}`,
      },
      {
        title: "Use parameters and return values deliberately",
        paragraphs: [
          "Parameters are local names used by one invocation. Two calls to the same function can receive different arguments. Give the function one clear task: a function named isEven should answer a yes/no question, while a function named printGreeting intentionally writes output.",
          "Use void when a function returns no value. Every path through a non-void function should return the promised result. A Boolean helper can be used directly inside an if condition. Keep calculations separate from input/output when that makes them easier to test.",
        ],
        code: String.raw`bool isEven(int number) {
    return number % 2 == 0;
}

int larger(int first, int second) {
    if (first >= second) return first;
    return second;
}`,
      },
      {
        title: "Passing by value makes a separate parameter",
        paragraphs: [
          "For an int passed by value, the parameter begins with a copy of the argument's value. Changing that parameter does not change the caller's integer. The parameter exists only during the invocation. The caller can still choose to assign a returned result to its original variable.",
          "In the copy example below, number becomes 11 inside increaseCopy, while value in main remains 10. These are different variables that happen to begin with the same value.",
        ],
        code: String.raw`void increaseCopy(int number) {
    ++number;
}

// Inside main:
int value = 10;
increaseCopy(value);  // value remains 10`,
      },
      {
        title: "Passing by reference names an existing object",
        paragraphs: [
          "The ampersand in an `int&` parameter declares a reference. In this example, number becomes another name for the caller's integer. Updating number updates that same integer; there is no independent int parameter copy to modify.",
          "A non-const reference makes modification possible, so use it when that is part of the function's contract. A const reference can provide access without allowing modification through that reference; it is useful for larger objects. Pointers and the rules for array parameters are separate subjects: a raw array parameter does not automatically copy the whole array.",
        ],
        code: String.raw`void increaseOriginal(int& number) {
    ++number;
}

// Inside main:
int value = 10;
increaseOriginal(value);  // value becomes 11`,
        takeaway:
          "Pass by value for an independent input value. Use a reference when the function needs to work with an existing object.",
      },
      {
        title: "Scope explains which names you can use",
        paragraphs: [
          "A local variable is visible within its scope, after its declaration. A nested block can access an outer local variable, but a name declared inside the nested block is unavailable after that block ends. A parameter is local to its function, not to the function that called it.",
          "The example prints 30 inside the block and 10 afterward. Trying to print inner after the closing brace would be a compilation error. The lab uses conceptual function and block frames; a compiler can optimize the actual machine-level execution.",
        ],
        code: String.raw`// Inside main:
int value = 10;
{
    int inner = 20;
    std::cout << value + inner << '\n';
}
std::cout << value << '\n';
// inner is out of scope here`,
      },
      {
        title: "Build and test a small helper",
        paragraphs: [
          "Write down a helper's input, result, and assumptions. For example, isEven accepts an integer and returns whether its remainder on division by two is zero. Test zero, a positive odd integer, and a negative even integer. A clear contract makes it easier to locate a fault when the full program is wrong.",
          "Keep main responsible for coordinating the program: read the input, call the required helpers, then print the result. Do not split every statement into a separate function; create a helper when it names a meaningful operation or removes repeated logic.",
        ],
      },
    ],
    mistakes: [
      "Treating a printed value as though the function returned it.",
      "Forgetting a return path or using a name outside its scope.",
      "Expecting an int parameter passed by value to modify the caller's integer.",
      "Assuming raw array parameters have the same copying behavior as int or vector parameters passed by value.",
    ],
    exercises: [
      {
        prompt:
          "Write a function that returns the larger of two integers, including equal inputs.",
        explanation:
          "Return the first value when first >= second, otherwise return the second. Equal inputs have the same maximum; neither branch should be left without a return.",
      },
      {
        prompt:
          "Start with value = 10, call increaseCopy, then increaseOriginal. Predict value after each call.",
        explanation:
          "It remains 10 after the copy call, then becomes 11 after the reference call. Open Copy vs reference in the lab to trace both invocations.",
      },
      {
        prompt: "Write isEven and test it with 0, 7, and -4.",
        explanation:
          "The results are true, false, true. Check a remainder of zero rather than testing whether the remainder is positive.",
      },
    ],
    practiceAdvice:
      "Use a small helper for the decision in Team. In Number of Steps to Reduce a Number to Zero, separate the even/odd decision from the running operation count.",
    references: [
      {
        title: "Microsoft Learn · Functions",
        url: "https://learn.microsoft.com/en-us/cpp/cpp/functions-cpp",
      },
      {
        title: "Microsoft Learn · References",
        url: "https://learn.microsoft.com/en-us/cpp/cpp/references-cpp",
      },
    ],
  },
  "basic-collections-and-memory": {
    id: "collections",
    title: "Store several values and access the right one",
    introduction:
      "An index connects a position to a value. Learn that relationship first, then use arrays, strings, and vectors to work with sequences. The visual lab makes each read, write, copy, and alias visible.",
    outcomes: [
      "Use zero-based indices and explain why the last valid index is size minus one.",
      "Read and update arrays, strings, and vectors with safe loop boundaries.",
      "Distinguish a copied collection from a reference to the original.",
    ],
    sections: [
      {
        title: "Arrays connect positions to values",
        paragraphs: [
          "An array stores a fixed number of elements of the same type in contiguous storage. In `int values[4] = {10, 20, 30, 40};`, the four valid indices are 0, 1, 2, and 3. The element count is four, but the last valid index is three.",
          "`values[2]` reads the third element, thirty. Assigning `values[2] = 99` replaces only that element. The visual cells show logical element positions, not a promise that every C++ type occupies the same number of bytes on every system.",
        ],
        code: "int values[4] = {10, 20, 30, 40};\nint third = values[2];  // 30\nvalues[2] = 99;        // {10, 20, 99, 40}",
        table: {
          headings: ["Index", "Initial value", "After values[2] = 99"],
          rows: [
            ["0", "10", "10"],
            ["1", "20", "20"],
            ["2", "30", "99"],
            ["3", "40", "40"],
          ],
        },
      },
      {
        title: "Check boundaries before accessing an element",
        paragraphs: [
          "For a collection with size n, an element index must be at least zero and less than n. Index n is already one position beyond its elements. An empty sequence has no valid element index.",
          "Native array indexing does not automatically check the boundary. An invalid access is undefined behavior: it might appear to work, fail, or corrupt data. Our simulator stops before an invalid access so you can see the error safely. For a vector, at(index) performs a checked access and throws an out_of_range exception for an invalid index; operator[] is not a substitute for a boundary check.",
        ],
        code: String.raw`// Inside main, with an int index already read:
if (index >= 0 && index < 4) {
    std::cout << values[index] << '\n';
}`,
      },
      {
        title: "Traverse a sequence once",
        paragraphs: [
          "Traversal means visiting the required elements in order. Starting at zero and continuing while i < size visits every valid index exactly once. A range-based for loop is useful when you need each element without its index.",
          "Use a reference in a range-based loop when you intend to modify the stored elements. `for (int value : values)` gives a value copy for each iteration; `for (int& value : values)` gives access to the existing element.",
        ],
        code: String.raw`// values is the four-element array from above.
for (int i = 0; i < 4; ++i) {
    std::cout << values[i] << ' ';
}
for (int& value : values) {
    value += 1;
}`,
      },
      {
        title: "Strings are sequences too",
        paragraphs: [
          "Include <string> to use std::string. For the English-letter example `std::string word = \"CODE\";`, size() is four and word[1] is the character 'O'. Traverse its characters using the same position-based reasoning as an array.",
          "The lab deliberately uses short ASCII words. In general, a std::string stores char elements; an index is not guaranteed to identify a complete human-readable character in UTF-8 text. Reading a word and reading a full line also differ: formatted input stops at whitespace, while getline can include spaces.",
        ],
        code: String.raw`// Inside main; include <string> and <iostream>.
std::string word = "CODE";
for (std::size_t i = 0; i < word.size(); ++i) {
    std::cout << word[i] << ' ';
}`,
      },
      {
        title: "Vectors can change their number of elements",
        paragraphs: [
          "Include <vector> to use std::vector. A vector stores elements contiguously and manages its storage. `std::vector<int> values{10, 20};` starts with two elements. `values.push_back(30)` adds a third element, and size() then returns three.",
          "Size is the number of constructed elements. Capacity is the number of elements the current storage can hold without reallocation. Capacity is at least size, but a particular growth factor is not guaranteed. Adding an element can reallocate storage and invalidate existing references or pointers to elements. Do not use capacity as the bound for accessing elements; only indices below size identify elements.",
        ],
        code: "std::vector<int> values{10, 20};\nvalues.push_back(30);\n// size() is 3; valid element indices are 0, 1, 2",
      },
      {
        title: "Copies and aliases behave differently",
        paragraphs: [
          "Copying a vector<int> into another vector gives it its own elements. Changing an element in the copy does not change the original's int element. In contrast, auto& alias = values binds a reference to the original vector object. Changing an element through alias changes that same original vector.",
          "The alias in the lab refers to the vector object, not to one of its elements. A raw C++ array cannot be copied using ordinary array assignment; use an appropriate standard container or copy elements explicitly. When reading nested indexing such as values[values[i]], resolve the inner lookup first and then check the resulting outer index.",
        ],
        code: "std::vector<int> values{10, 20};\nauto copy = values;\ncopy[0] = 99;       // values is still {10, 20}\nauto& alias = values;\nalias[1] = 88;      // values is now {10, 88}",
        takeaway:
          "A copy owns separate int elements. A reference is another name for the existing object.",
      },
    ],
    mistakes: [
      "Starting at index one or accessing the element at index size.",
      "Accessing the first element before checking whether a sequence is empty.",
      "Confusing vector capacity with its number of elements.",
      "Assuming a string index always identifies a Unicode character, or assuming a raw array supports vector-style copying.",
    ],
    exercises: [
      {
        prompt:
          "For {10, 20, 30, 40}, identify the element count, last valid index, and value at index 2.",
        explanation:
          "The count is 4, the last valid index is 3, and the value is 30. Index 4 is outside the array.",
      },
      {
        prompt: "Find the largest element of a non-empty vector.",
        explanation:
          "Initialize the best value from the first element, then compare the remaining elements. Initializing to zero would be wrong for a sequence containing only negative values.",
      },
      {
        prompt: "For values = {0, 2, 1}, evaluate values[values[1]].",
        explanation:
          "First values[1] is 2. Then values[2] is 1. Resolve the inner lookup before the outer lookup.",
      },
    ],
    practiceAdvice:
      "Use Shuffle the Array to practice placing values at new indices. For Build Array from Permutation, trace the inner and outer lookups separately. This is also a good point to revisit Way Too Long Words and Next Round.",
    references: [
      {
        title: "Microsoft Learn · Arrays",
        url: "https://learn.microsoft.com/en-us/cpp/cpp/arrays-cpp",
      },
      {
        title: "Microsoft Learn · vector",
        url: "https://learn.microsoft.com/en-us/cpp/standard-library/vector-class",
      },
    ],
  },
  "complexity-and-debugging": {
    id: "complexity",
    title: "Understand the work, then find the mistake",
    introduction:
      "A dry run explains what a program does on one input. Complexity explains how its work and storage grow as inputs get larger. Use both: trace a small case for correctness, then reason about whether the approach scales.",
    outcomes: [
      "Compare linear and quadratic work without confusing counts with elapsed time.",
      "Describe extra storage and distinguish it from the input and output.",
      "Find boundary errors using a trace and a small set of deliberate tests.",
    ],
    sections: [
      {
        title: "Count a clearly defined operation",
        paragraphs: [
          "Choose a useful operation to count: an element visit, a comparison, or a loop body's execution. A loop visiting n elements performs n element visits. Two full nested loops, each ranging over n choices, visit n × n ordered pairs.",
          "For these exact examples, changing n from 5 to 10 changes visits from 5 to 10 in the linear case and pair visits from 25 to 100 in the quadratic case. These are counts of the chosen body operation, not all machine instructions or a prediction of milliseconds.",
        ],
        table: {
          headings: ["Pattern", "n = 5", "n = 10", "Growth"],
          rows: [
            ["One full traversal", "5 visits", "10 visits", "O(n)"],
            [
              "Two full nested traversals",
              "25 pair visits",
              "100 pair visits",
              "O(n²)",
            ],
          ],
        },
      },
      {
        title: "Read Big O as a growth bound",
        paragraphs: [
          "Big O describes an asymptotic upper bound as input size grows. In a first analysis, ignore constant factors and lower-order terms: 3n + 2 is O(n). O(1) means the bounded work does not grow with n; it does not mean exactly one instruction.",
          "O(log n) commonly arises when the remaining problem size is repeatedly reduced by a constant factor. Halving an eight-element search range leaves sizes 4, 2, then 1. O(n²) fits the two full nested loops above. Do not assign a complexity from indentation alone: dependent bounds, early exits, and work inside helper calls can change the analysis. State whether you are discussing a worst case, an average case, or another bound.",
        ],
        code: "// Count one visit per execution of the inner body.\nfor (int i = 0; i < n; ++i) {\n    for (int j = 0; j < n; ++j) {\n        // Visit ordered pair (i, j).\n    }\n}",
      },
      {
        title: "Account for memory separately",
        paragraphs: [
          "A fixed number of scalar variables takes O(1) auxiliary space with respect to n. A separate array or vector with n elements takes O(n) storage. Extra recursion frames can also consume space, even if the function creates no explicit container.",
          "State the convention for output storage. In the running-sum example, modifying the existing input vector uses O(1) auxiliary space. Returning the same values in a newly allocated n-element result needs O(n) result storage; some analyses report that separately from auxiliary space. Avoid comparing two space claims that use different conventions.",
        ],
      },
      {
        title: "Dry-run a running sum",
        paragraphs: [
          "A running sum at index i contains the sum of the original elements from zero through i. For {2, 1, 3}, leave the first value as 2, update the second to 1 + 2 = 3, then update the third to 3 + 3 = 6. At each update, the previous position already contains the prefix total.",
          "This complete example prints 2 3 6. Its accumulation loop performs n - 1 updates for a non-empty n-element input, so it has O(n) time and O(1) auxiliary space. For an empty vector, the loop performs no updates. Choose a numeric type that can hold every required prefix sum.",
        ],
        code: String.raw`#include <iostream>
#include <vector>

int main() {
    std::vector<long long> values{2, 1, 3};
    for (std::size_t i = 1; i < values.size(); ++i) {
        values[i] += values[i - 1];
    }
    for (std::size_t i = 0; i < values.size(); ++i) {
        if (i > 0) std::cout << ' ';
        std::cout << values[i];
    }
    std::cout << '\n';
    return 0;
}`,
      },
      {
        title: "Find the first incorrect step",
        paragraphs: [
          "A syntax error prevents a program from compiling. A runtime failure occurs during execution. A logical error can run to completion but produce the wrong result. Undefined behavior, such as an invalid unchecked array access, need not produce a consistent failure at all.",
          "For an array with three elements, a loop using i <= 3 attempts an invalid access at index 3. The corrected condition is i < 3. Trace the initialization, each check, each update, and the first state that violates your assumptions. A debugger can pause at a breakpoint and expose local values; a hand-written table can do the same for a tiny example.",
        ],
        code: "// Incorrect: index 3 is not an element of this array.\nfor (int i = 0; i <= 3; ++i) {\n    // Reading values[i] is unsafe when i == 3.\n}\n// Correct boundary for three elements: i < 3",
        takeaway:
          "Stop at the first invalid assumption. A later wrong answer may only be a symptom.",
      },
      {
        title: "Build a small, deliberate test set",
        paragraphs: [
          "Test a normal example, then cases that challenge a boundary or assumption. For sequences, consider an empty input when allowed, one element, repeated values, all-negative values, and values near the numeric limits. For a loop, include a case that executes zero times and one that executes once.",
          "Write the expected result before running the program. An assertion such as assert(index < values.size()) can document an internal assumption during development, but assertions can be disabled and must not replace validation of untrusted input. Include <cassert> when using assert.",
          "For Wrong Subtraction, reason about the last digit and the number of operations still required. For Running Sum of 1d Array, verify every updated prefix, not only the final total.",
        ],
      },
    ],
    mistakes: [
      "Treating Big O as an exact execution time or counting all nested loops as quadratic.",
      "Ignoring repeated work hidden in a helper function or repeated allocation.",
      "Reporting memory without saying whether output storage is included.",
      "Testing only the sample input, or expecting an invalid access to fail consistently.",
    ],
    exercises: [
      {
        prompt:
          "When n doubles, how do visits change in one full traversal and two full nested traversals?",
        explanation:
          "They double from n to 2n in the first example and quadruple from n² to 4n² in the second. This counts body visits, not exact elapsed time.",
      },
      {
        prompt: "Repair a loop over three elements that uses i <= 3.",
        explanation:
          "Use i < 3. Valid indices are 0, 1, and 2. Open Boundary debugger, run to the blocked access, then enable the corrected condition.",
      },
      {
        prompt:
          "Compute the running sum of {2, -1, 3} and describe the extra storage for an in-place update.",
        explanation:
          "The result is {2, 1, 4}. A fixed number of loop variables uses O(1) auxiliary space; no second n-element result is needed.",
      },
    ],
    practiceAdvice:
      "Use Running Sum of 1d Array for an in-place dry run. For Wrong Subtraction, list the number, last digit, and remaining operations after every step.",
    references: [
      {
        title: "MIT OpenCourseWare · Asymptotic complexity notes",
        url: "https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-fall-2011/resources/problem-solving-notes/",
      },
    ],
  },
};

export function getProgrammingLesson(
  sheetSlug: string,
  stepKey: string,
  topicKey: string,
): ProgrammingLesson | undefined {
  return sheetSlug === "dsa" && stepKey === BASIC_PROGRAMMING_STEP
    ? programmingLessons[topicKey]
    : undefined;
}
