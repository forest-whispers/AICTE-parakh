import React from "react";
import { ReportsRegisterTable } from "../components/reports-register-table";

interface ScrutinyReportsRegisterPageProps {
  userRole: "OFFICER" | "MINISTRY_ADMIN";
}

export const ScrutinyReportsRegisterPage: React.FC<ScrutinyReportsRegisterPageProps> = ({
  userRole,
}) => {
  const isMinistry = userRole === "MINISTRY_ADMIN";

  return (
    <ReportsRegisterTable
      userRole={userRole}
      breadcrumb={
        isMinistry
          ? "MINISTRY / SCRUTINY OVERSIGHT / 2026–27"
          : "OFFICER / SCRUTINY REPORTS / 2026–27"
      }
      pageTitle={
        isMinistry ? "Scrutiny reports portfolio" : "Scrutiny reports register"
      }
      pageSubtitle={
        isMinistry
          ? "Ministry-wide register of persisted statutory compliance evaluations, deficiency breakdowns, and rule findings."
          : "Persisted statutory scrutiny determinations and rule-by-rule findings evaluated for your assigned cases."
      }
      showOfficerColumn={isMinistry}
    />
  );
};

