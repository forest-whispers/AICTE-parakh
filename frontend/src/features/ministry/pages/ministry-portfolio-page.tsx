import React from "react";
import { ApplicationsRegisterTable } from "../../applications/components/applications-register-table";

export const MinistryPortfolioPage: React.FC = () => {
  return (
    <ApplicationsRegisterTable
      endpoint="/ministry/applications"
      userRole="MINISTRY_ADMIN"
      breadcrumb="MINISTRY / PORTFOLIO / 2026–27"
      pageTitle="Portfolio overview"
      pageSubtitle="Ministry-wide statutory applications portfolio, deterministic scrutiny findings, and officer allocation status."
      showOfficerColumn={true}
      showOfficerFilter={true}
    />
  );
};