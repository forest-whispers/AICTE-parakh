import React, { useState } from "react";
import { useAuth } from "../../auth/hooks/use-auth";
import { useWorkbenchDashboard } from "../hooks/use-workbench-dashboard";
import { useOfficerNotifications } from "../hooks/use-officer-notifications";
import { WorkbenchHeader } from "../components/workbench-header";
import { PortfolioMetricsStrip } from "../components/portfolio-metrics-strip";
import { ActionQueueTable } from "../components/action-queue-table";
import { ReviewBucketsCard } from "../components/review-buckets-card";
import { NotificationsPreviewCard } from "../components/notifications-preview-card";
import { AssignedApplicationsPreview } from "../components/assigned-applications-preview";
import { AssignedActivityPreview } from "../components/assigned-activity-preview";
import { PlannedFeatureDialog } from "../../../shared/ui/planned-feature-dialog";
import { Alert } from "../../../shared/ui/alert";
import { Button } from "../../../shared/ui/button";
import type {
  PrioritizedQueueItem,
  ReviewWorkBucket,
  AssignedApplicationPreview as AppPreview,
} from "../types/workbench.types";

export const OfficerWorkbenchPage: React.FC = () => {
  const { user } = useAuth();
  const {
    data: dashboard,
    isLoading: isDashboardLoading,
    isError: isDashboardError,
    error: dashboardError,
    refetch: refetchDashboard,
  } = useWorkbenchDashboard();

  const {
    data: notifications,
    markAsRead,
  } = useOfficerNotifications({ unreadOnly: true, limit: 4 });

  const [plannedModal, setPlannedModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    slice: string;
  }>({
    isOpen: false,
    title: "",
    description: "",
    slice: "",
  });

  const showPlannedModal = (title: string, description: string, slice: string) => {
    setPlannedModal({
      isOpen: true,
      title,
      description,
      slice,
    });
  };

  const handleActionClick = (item: PrioritizedQueueItem) => {
    showPlannedModal(
      `Action: ${item.title}`,
      `Navigating to case workspace for application ${item.applicationNumber} (${item.institutionName}) to execute ${item.recommendedAction}.`,
      "Slice 5 (Case Workspace & Evidence Viewer)"
    );
  };

  const handleBucketClick = (bucket: ReviewWorkBucket) => {
    showPlannedModal(
      `Review Bucket: ${bucket.label}`,
      `Filtering assigned register for ${bucket.count} item(s) categorized under ${bucket.label}.`,
      "Slice 3 (Application Register & Case Explorer)"
    );
  };

  const handleApplicationClick = (app: AppPreview) => {
    showPlannedModal(
      `Case File: ${app.applicationNumber}`,
      `Opening case workspace and multimodal evidence viewer for ${app.institutionName}.`,
      "Slice 5 (Case Workspace & Evidence Viewer)"
    );
  };

  if (isDashboardLoading) {
    return (
      <div className="p-6 sm:p-9 max-w-[1440px] mx-auto w-full animate-pulse">
        {/* Header skeleton */}
        <div className="h-4 w-48 bg-[#D7DEDA] rounded-[2px] mb-2" />
        <div className="h-8 w-72 bg-[#D7DEDA] rounded-[2px] mb-2" />
        <div className="h-4 w-96 bg-[#D7DEDA] rounded-[2px] mb-6" />

        {/* Unboxed metric strip skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6 sm:gap-8 my-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-14 flex flex-col justify-between">
              <div className="h-7 w-12 bg-[#D7DEDA] rounded-[2px]" />
              <div className="h-3 w-28 bg-[#D7DEDA] rounded-[2px]" />
            </div>
          ))}
        </div>

        {/* Body skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 mb-6">
          <div className="lg:col-span-8 h-80 bg-white border border-[#D7DEDA] rounded-[2px]" />
          <div className="lg:col-span-4 h-80 bg-white border border-[#D7DEDA] rounded-[2px]" />
        </div>
      </div>
    );
  }

  if (isDashboardError || !dashboard) {
    return (
      <div className="p-6 sm:p-9 max-w-2xl mx-auto w-full my-auto">
        <Alert variant="error" title="Failed to load Officer Workbench">
          {dashboardError?.message || "An unexpected error occurred while loading dashboard metrics."}
        </Alert>
        <div className="mt-4">
          <Button variant="primary" onClick={() => refetchDashboard()}>
            Retry dashboard
          </Button>
        </div>
      </div>
    );
  }

  const { overview, actionQueue, reviewBuckets, assignedApplications, recentActivity } = dashboard;
  const unreadList = notifications ?? [];

  return (
    <div className="p-6 sm:p-9 max-w-[1440px] mx-auto w-full">
      {/* Planned Feature Feedback Modal */}
      <PlannedFeatureDialog
        isOpen={plannedModal.isOpen}
        onClose={() => setPlannedModal((prev) => ({ ...prev, isOpen: false }))}
        title={plannedModal.title}
        description={plannedModal.description}
        scheduledSlice={plannedModal.slice}
      />

      {/* Top Header */}
      <WorkbenchHeader
        officerName={user?.name || "Ananya Rao"}
        onGuidedSubmissionClick={() =>
          showPlannedModal(
            "Guided Submission",
            "Multi-step institutional document intake and preliminary validation wizard.",
            "Slice 4 (Guided Submission & Document Intake)"
          )
        }
      />

      {/* Unboxed Metric Strip */}
      <PortfolioMetricsStrip
        overview={overview}
        onMetricClick={(label) =>
          showPlannedModal(
            `Filter: ${label}`,
            "Filtering the application register by this operational metric.",
            "Slice 3 (Application Register & Case Explorer)"
          )
        }
      />

      {/* Main Two-Column Layout (Figma 08 layout) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start mb-6">
        {/* Left Column: Next actions queue (~67% width) */}
        <div className="lg:col-span-8">
          <ActionQueueTable
            items={actionQueue}
            onActionClick={handleActionClick}
          />
        </div>

        {/* Right Column: Review buckets & Notifications preview (~33% width) */}
        <div className="lg:col-span-4 space-y-6">
          <ReviewBucketsCard
            buckets={reviewBuckets}
            onBucketClick={handleBucketClick}
          />

          <NotificationsPreviewCard
            notifications={unreadList}
            totalUnread={overview.unreadNotificationsCount}
            onMarkRead={(id) => markAsRead(id)}
            onViewAllClick={() =>
              showPlannedModal(
                "Notification Center",
                "Full recipient notification archive and notification dispatch log.",
                "Slice 7 (Notifications)"
              )
            }
          />
        </div>
      </div>

      {/* Bottom Section: My applications & Assigned-case activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 mb-8">
        <AssignedApplicationsPreview
          applications={assignedApplications}
          totalAssigned={overview.totalAssigned}
          onViewAllClick={() =>
            showPlannedModal(
              "My Applications Register",
              "Searchable, filterable register of all applications assigned to your scrutiny desk.",
              "Slice 3 (Application Register & Case Explorer)"
            )
          }
          onApplicationClick={handleApplicationClick}
        />

        <AssignedActivityPreview
          activity={recentActivity}
          onOpenAuditClick={() =>
            showPlannedModal(
              "Audit History & Chronology",
              "Complete immutable audit trail of statutory actions, approvals, and system evaluations.",
              "Slice 7 (Audit Chronology)"
            )
          }
        />
      </div>

      {/* Legal & Regulatory Disclaimer matching Figma reference 08 */}
      <div className="border-t border-[#D7DEDA] pt-6 pb-12 text-[11px] text-[#5C6F73] text-left leading-relaxed">
        Decision support only. Computed findings do not constitute approval or rejection. All
        institutions and records shown are synthetic.
      </div>
    </div>
  );
};
