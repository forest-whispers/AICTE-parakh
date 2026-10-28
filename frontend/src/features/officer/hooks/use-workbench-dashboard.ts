import { useQuery } from "@tanstack/react-query";
import { workbenchApi } from "../api/workbench-api";
import type { WorkbenchDashboardData } from "../types/workbench.types";

export const WORKBENCH_DASHBOARD_QUERY_KEY = ["officer", "workbench", "dashboard"];

export function useWorkbenchDashboard() {
  return useQuery<WorkbenchDashboardData, Error>({
    queryKey: WORKBENCH_DASHBOARD_QUERY_KEY,
    queryFn: () => workbenchApi.getDashboard(),
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnWindowFocus: true,
  });
}
