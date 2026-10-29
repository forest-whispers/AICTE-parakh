import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationApi } from "../services/notification-api";

export const NOTIFICATIONS_QUERY_KEY = ["notifications"];

export function useNotifications(params?: { unreadOnly?: boolean; limit?: number }) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: [...NOTIFICATIONS_QUERY_KEY, params?.unreadOnly ? "unread" : "all", params?.limit || 50],
    queryFn: () => notificationApi.getNotifications(params),
    staleTime: 1000 * 30, // 30s freshness
    refetchOnWindowFocus: true,
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => notificationApi.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => notificationApi.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: NOTIFICATIONS_QUERY_KEY });
    },
  });

  return {
    ...query,
    notifications: query.data || [],
    unreadCount: (query.data || []).filter((n) => !n.isRead).length,
    markAsRead: markAsReadMutation.mutateAsync,
    isMarkingRead: markAsReadMutation.isPending,
    markAllAsRead: markAllAsReadMutation.mutateAsync,
    isMarkingAllRead: markAllAsReadMutation.isPending,
  };
}

