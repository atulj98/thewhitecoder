import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  accountRequest,
  ApiError,
  progressPath,
  questionKey,
  useAccount,
  type Progress,
} from "../api/account";
import type { SheetDetail } from "../api/sheets";

export function useSheetProgress(slug: string, sheet: SheetDetail | undefined) {
  const account = useAccount();
  const client = useQueryClient();
  const user = account.data?.user;
  const key = ["progress", user?.id, slug];
  const progress = useQuery({
    queryKey: key,
    queryFn: () => accountRequest<Progress>(progressPath(slug)),
    enabled: Boolean(user && sheet?.is_published && !account.isError),
    retry: false,
  });
  const frontKeys = new Set(
    sheet?.steps.flatMap((step) =>
      step.topics.flatMap((topic) =>
        topic.items
          .filter((item) => item.kind === "practice")
          .map((item) =>
            questionKey(step.stable_key, topic.stable_key, item.stable_key),
          ),
      ),
    ),
  );
  const aligned = Boolean(
    progress.data &&
    progress.data.total === frontKeys.size &&
    progress.data.question_keys.every((entry) =>
      frontKeys.has(JSON.stringify(entry)),
    ),
  );
  const entries = new Map(
    progress.data?.entries.map((entry) => [
      questionKey(entry.step_key, entry.topic_key, entry.item_key),
      entry,
    ]),
  );
  const change = useMutation({
    scope: { id: "progress-" + user?.id + "-" + slug },
    mutationFn: (update: {
      step: string;
      topic: string;
      item?: string;
      completed?: boolean;
      notes?: string;
    }) =>
      accountRequest<Progress>(
        update.item
          ? progressPath(
              slug,
              "questions",
              update.step,
              update.topic,
              update.item,
            )
          : progressPath(slug, "topics", update.step, update.topic),
        {
          method: update.item ? "PATCH" : "PUT",
          body: JSON.stringify(
            update.item
              ? { completed: update.completed, notes: update.notes }
              : { completed: update.completed },
          ),
        },
        account.data?.csrf_token,
      ),
    onSuccess: (result) => client.setQueryData(key, result),
    onError: (error) => {
      if (error instanceof ApiError && error.status === 401) {
        void client.invalidateQueries({ queryKey: ["account"] });
      }
    },
  });
  return {
    account,
    progress,
    entries,
    change,
    aligned,
    total: frontKeys.size,
    canEdit: Boolean(
      user &&
      aligned &&
      !account.isError &&
      !progress.isError &&
      !change.isPending,
    ),
  };
}
