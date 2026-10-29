export interface AuditActor {
  id: string | null;
  name: string;
  role: string; // "MINISTRY_ADMIN" | "OFFICER" | "SYSTEM" | string
  isSystem: boolean;
}

export interface AuditApplication {
  id: string;
  applicationNumber: string;
  institutionName: string;
}

export interface AuditLogItem {
  id: string;
  timestamp: string;
  action: string;
  actor: AuditActor;
  application: AuditApplication | null;
  resourceType: string;
  resourceId: string | null;
  status: string; // "SUCCESS" | "FAILURE" | "WARNING"
  details: string;
  metadata: Record<string, unknown> | null;
}

export interface AuditPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AuditActivityResponse {
  success: boolean;
  data: AuditLogItem[];
  pagination: AuditPagination;
}

export interface AuditFilterParams {
  action?: string;
  actorRole?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}
