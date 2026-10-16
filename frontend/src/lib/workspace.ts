import { questionKey, type QuestionEntry } from "../api/account";
import type {
  SheetDetail,
  SheetItem,
  SheetStep,
  SheetTopic,
} from "../api/sheets";

export interface WorkspaceTopic {
  key: string;
  step: SheetStep;
  topic: SheetTopic;
  stepIndex: number;
  questions: WorkspaceQuestion[];
}
export interface WorkspaceQuestion {
  key: string;
  step: SheetStep;
  topic: SheetTopic;
  item: SheetItem;
  index: number;
}
export type QuestionFilter = "all" | "unsolved" | "solved" | "notes";

export function workspaceTopics(sheet: SheetDetail): WorkspaceTopic[] {
  return sheet.steps.flatMap((step, stepIndex) =>
    step.topics.map((topic) => ({
      key: JSON.stringify([step.stable_key, topic.stable_key]),
      step,
      topic,
      stepIndex,
      questions: topic.items
        .filter((item) => item.kind === "practice")
        .map((item, index) => ({
          key: questionKey(step.stable_key, topic.stable_key, item.stable_key),
          step,
          topic,
          item,
          index,
        })),
    })),
  );
}
export function completedCount(
  questions: WorkspaceQuestion[],
  entries: Map<string, QuestionEntry>,
) {
  return questions.filter((question) => entries.get(question.key)?.completed)
    .length;
}
export function filterQuestions(
  questions: WorkspaceQuestion[],
  search: string,
  filter: QuestionFilter,
  entries: Map<string, QuestionEntry>,
) {
  const words = search.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return questions.filter(({ key, step, topic, item }) => {
    const text =
      `${item.title} ${topic.title} ${step.title}`.toLocaleLowerCase();
    if (!words.every((word) => text.includes(word))) return false;
    const entry = entries.get(key);
    if (filter === "unsolved") return !entry?.completed;
    if (filter === "solved") return Boolean(entry?.completed);
    if (filter === "notes") return Boolean(entry?.has_notes);
    return true;
  });
}
export function platformName(url: string) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    if (host === "leetcode.com") return "LeetCode";
    if (host === "geeksforgeeks.org") return "GFG";
    if (host === "codeforces.com") return "Codeforces";
    return "Practice";
  } catch {
    return "Practice";
  }
}
