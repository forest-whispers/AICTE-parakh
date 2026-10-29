import React from "react";
import { ApplicationsRegisterTable } from "../../applications/components/applications-register-table";

export const MyApplicationsPage: React.FC = () => {
  return (
    <ApplicationsRegisterTable
      endpoint="/applications"
      userRole="OFFICER"
      breadcrumb="OFFICER / MY APPLICATIONS / 2026–27"
      pageTitle="My applications"
      pageSubtitle="Regulatory cases and statutory applications assigned to your desk for scrutiny and review."
      showOfficerColumn={false}
      showOfficerFilter={false}
    />
  );
};