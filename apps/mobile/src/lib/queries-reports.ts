import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BookingsResponseSchema,
  ReportSchema,
  ReportsResponseSchema,
  type CreateReportBody,
} from "@lv/contracts";

import { apiRequest } from "./api";

export const reportKeys = {
  admin: (status: string) => ["admin", "reports", status] as const,
  disputes: ["admin", "disputes"] as const,
};

export function useCreateReport() {
  return useMutation({
    mutationFn: (body: CreateReportBody) =>
      apiRequest("/v1/reports", ReportSchema, { method: "POST", body }),
  });
}
export function useAdminReports(enabled: boolean, status: "open" | "resolved" | "dismissed") {
  return useQuery({
    queryKey: reportKeys.admin(status),
    queryFn: () => apiRequest(`/v1/admin/reports?status=${status}`, ReportsResponseSchema),
    enabled,
  });
}
export function useResolveReport() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({
      reportId,
      status,
      note,
    }: {
      reportId: string;
      status: "resolved" | "dismissed";
      note?: string;
    }) =>
      apiRequest(`/v1/admin/reports/${reportId}/resolution`, ReportSchema, {
        method: "POST",
        body: { status, ...(note ? { note } : {}) },
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: ["admin", "reports"] }),
  });
}
export function useAdminDisputes(enabled: boolean) {
  return useQuery({
    queryKey: reportKeys.disputes,
    queryFn: () => apiRequest("/v1/admin/disputes", BookingsResponseSchema),
    enabled,
    refetchInterval: 30_000,
  });
}
