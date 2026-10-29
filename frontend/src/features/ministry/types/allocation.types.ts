export interface OfficerListItem {
  id: string;
  name: string;
  email: string;
  designation: string;
  department: string;
}

export interface AllocationSubmissionPayload {
  officerId: string;
  reason?: string;
}
