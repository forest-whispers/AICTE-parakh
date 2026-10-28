import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { workbenchApi } from "../api/workbench-api";
import { WORKBENCH_DASHBOARD_QUERY_KEY } from "./use-workbench-dashboard";
import type { OfficerNotification } from "../types/workbench.types";

export const NOTIFICATIONS_QUERY_KEY = ["officer", "notifications"];

export function useOfficerNotifications(options?: { unreadOnly?: boolean; limit?: number }) {
  const queryClient = useQueryClient();

  const queryKey = [
    ...NOTIFICATIONS_QUERY_KEY,
    { unreadOnly: options?.unreadOnly ?? true, limit: options?.limit ?? 4 },
  ];

  const query = useQuery<OfficerNotification[], Error>({
    queryKey,
    queryFn: () =>
      workbenchApi.getNotifications({
        unreadOnly: options?.unreadOnly ?? true,
        limit: options?.limit ?? 4,
      }),
    staleTime: 1000 * 30, // 30 seconds
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => workbenchApi.markNotificationAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
      // Invalidate dashboard to sync unread counter
      queryClient.invalidateQueries({ queryKey: WORKBENCH_DASHBOARD_QUERY_KEY });
    },
  });

  return {
    ...query,
    markAsRead: markAsReadMutation.mutate,
    isMarkingRead: markAsReadMutation.isPending,
  };
}
