import { createBrowserRouter, Navigate } from "react-router-dom";
import { AuthLayout } from "../layouts/auth-layout";
import { OfficerLayout } from "../layouts/officer-layout";
import { MinistryLayout } from "../layouts/ministry-layout";
import { SignInPage } from "../features/auth/pages/sign-in-page";
import { OfficerWorkbenchPage } from "../features/officer/pages/officer-workbench-page";
import { MyApplicationsPage } from "../features/officer/pages/my-applications-page";
import { ExistingApplicationWorkspacePage } from "../features/officer/pages/existing-application-workspace-page";
import { GuidedSubmissionPage } from "../features/intake/pages/guided-submission-page";
import { MinistryPortfolioPage } from "../features/ministry/pages/ministry-portfolio-page";
import { MinistryAllocationPage } from "../features/ministry/pages/ministry-allocation-page";
import { ProtectedRoute } from "../shared/components/protected-route";
import { RootRedirect } from "../shared/components/root-redirect";
import { OfficerOnly } from "../shared/components/officer-only";

export const router = createBrowserRouter([
  // Public auth routes
  {
    element: <AuthLayout />,
    children: [
      {
        path: "/sign-in",
        element: <SignInPage />,
      },
    ],
  },

  // Protected ministry admin routes
  {
    path: "/ministry",
    element: (
      <ProtectedRoute allowedRoles={["MINISTRY_ADMIN"]}>
        <MinistryLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: "portfolio",
        element: <MinistryPortfolioPage />,
      },
      {
        path: "allocation",
        element: <MinistryAllocationPage />,
      },
      {
        index: true,
        element: <Navigate to="/ministry/portfolio" replace />,
      },
    ],
  },

  // Protected workspace routes (accessible to OFFICER and MINISTRY_ADMIN)
  {
    path: "/officer",
    element: (
      <ProtectedRoute allowedRoles={["OFFICER", "MINISTRY_ADMIN"]}>
        <OfficerLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: "workbench",
        element: (
          <OfficerOnly>
            <OfficerWorkbenchPage />
          </OfficerOnly>
        ),
      },
      {
        path: "applications",
        element: (
          <OfficerOnly>
            <MyApplicationsPage />
          </OfficerOnly>
        ),
      },
      {
        path: "applications/:applicationId",
        element: <ExistingApplicationWorkspacePage />,
      },
      {
        path: "submit",
        element: (
          <OfficerOnly>
            <GuidedSubmissionPage />
          </OfficerOnly>
        ),
      },
      {
        index: true,
        element: <RootRedirect />,
      },
    ],
  },

  // Root redirect
  {
    path: "/",
    element: <RootRedirect />,
  },

  // Catch-all 404 redirect
  {
    path: "*",
    element: <Navigate to="/sign-in" replace />,
  },
]);
