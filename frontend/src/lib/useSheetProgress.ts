import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  accountRequest,
  ApiError,
  progressPath,
  questionKey,
  useAccount,
  type Account,
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
    queryFn: ({ signal }) =>
      accountRequest<Progress>(progressPath(slug), { signal }),
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
    }) => {
      // Capture ownership before the request; the active account can change
      // while it is in flight.
      const owner = user?.id;
      const cacheKey = ["progress", owner, slug];
      return accountRequest<Progress>(
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
      ).then((result) => ({ result, owner, cacheKey }));
    },
    onSuccess: (result) => {
      if (
        client.getQueryData<Account | null>(["account"])?.user.id ===
        result.owner
      ) {
        client.setQueryData(result.cacheKey, result.result);
      }
    },
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

export type SheetTracking = ReturnType<typeof useSheetProgress>;
