import { createBrowserRouter, Navigate } from "react-router-dom";
import { AuthLayout } from "../layouts/auth-layout";
import { OfficerLayout } from "../layouts/officer-layout";
import { SignInPage } from "../features/auth/pages/sign-in-page";
import { OfficerWorkbenchPage } from "../features/officer/pages/officer-workbench-page";
import { ProtectedRoute } from "../shared/components/protected-route";

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

  // Protected officer routes
  {
    path: "/officer",
    element: (
      <ProtectedRoute>
        <OfficerLayout />
      </ProtectedRoute>
    ),
    children: [
      {
        path: "workbench",
        element: <OfficerWorkbenchPage />,
      },
      {
        index: true,
        element: <Navigate to="/officer/workbench" replace />,
      },
    ],
  },

  // Root redirect
  {
    path: "/",
    element: <Navigate to="/officer/workbench" replace />,
  },

  // Catch-all 404 redirect
  {
    path: "*",
    element: <Navigate to="/sign-in" replace />,
  },
]);
