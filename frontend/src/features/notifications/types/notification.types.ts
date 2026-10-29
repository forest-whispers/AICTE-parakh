export interface NotificationApplication {
  id: string;
  applicationNumber: string;
  institutionName: string;
  status: string;
}

export interface NotificationItem {
  id: string;
  recipientId: string;
  applicationId: string | null;
  type: string;
  title: string;
  message: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
  isRead: boolean;
  readAt: string | null;
  dedupKey: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
  application: NotificationApplication | null;
}

export interface NotificationListResponse {
  success: boolean;
  data: NotificationItem[];
}

export interface MarkAsReadResponse {
  success: boolean;
  message: string;
  data: NotificationItem;
}

export interface MarkAllReadResponse {
  success: boolean;
  message: string;
  count: number;
}
