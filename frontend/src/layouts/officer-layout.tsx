import React, { useState } from "react";
import { Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../features/auth/hooks/use-auth";
import { Button } from "../shared/ui/button";
import { PlannedFeatureDialog } from "../shared/ui/planned-feature-dialog";
import { useOfficerNotifications } from "../features/officer/hooks/use-officer-notifications";
import {
  LayoutDashboard,
  FolderKanban,
  FilePlus,
  Bell,
  History,
  LogOut,
  ChevronDown,
} from "lucide-react";

export const OfficerLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: notifications } = useOfficerNotifications({ unreadOnly: true });

  const [plannedFeature, setPlannedFeature] = useState<{
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

  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const unreadCount = notifications?.length ?? 0;

  const handleLogout = async () => {
    await logout();
    navigate("/sign-in", { replace: true });
  };

  const openPlannedModal = (title: string, description: string, slice: string) => {
    setPlannedFeature({
      isOpen: true,
      title,
      description,
      slice,
    });
  };

  const navItems = [
    {
      label: "Workbench",
      icon: LayoutDashboard,
      path: "/officer/workbench",
      active: location.pathname.startsWith("/officer/workbench"),
      planned: false,
    },
    {
      label: "My applications",
      icon: FolderKanban,
      path: "/officer/applications",
      active: location.pathname === "/officer/applications",
      planned: true,
      slice: "Slice 3 (Application Register & Case Explorer)",
      description: "Search, multi-attribute filtering, and complete register of assigned applications.",
    },
    {
      label: "Guided submission",
      icon: FilePlus,
      path: "/officer/submit",
      active: location.pathname === "/officer/submit",
      planned: true,
      slice: "Slice 4 (Guided Submission & Document Intake)",
      description: "Multi-step institutional document intake and preliminary validation wizard.",
    },
    {
      label: "Notifications",
      icon: Bell,
      path: "/officer/notifications",
      active: location.pathname === "/officer/notifications",
      planned: true,
      slice: "Slice 7 (Notifications Center)",
      description: "Comprehensive notification archive and delivery preferences.",
    },
    {
      label: "Audit history",
      icon: History,
      path: "/officer/audit",
      active: location.pathname === "/officer/audit",
      planned: true,
      slice: "Slice 7 (Audit Chronology)",
      description: "Immutable timeline of statutory actions, approvals, and system evaluations.",
    },
  ];

  return (
    <div className="min-h-screen flex bg-[#F6F5F0]">
      {/* Planned Feature Feedback Modal */}
      <PlannedFeatureDialog
        isOpen={plannedFeature.isOpen}
        onClose={() => setPlannedFeature((prev) => ({ ...prev, isOpen: false }))}
        title={plannedFeature.title}
        description={plannedFeature.description}
        scheduledSlice={plannedFeature.slice}
      />

      {/* Left Navigation Rail (Dark Slate #122B30, 216px per Foundations / 08 reference) */}
      <aside className="w-56 shrink-0 bg-[#122B30] text-white flex flex-col justify-between border-r border-[#165A60]/30 select-none">
        <div>
          {/* Brand Header */}
          <div className="p-6 border-b border-[#1F3D43]">
            <Link to="/officer/workbench" className="block text-inherit no-underline">
              <span className="font-bold text-xl tracking-tight text-white block">PARAKH</span>
              <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-[#7E9FA1] block mt-1">
                AICTE · APPLICATION OPERATIONS
              </span>
            </Link>
          </div>

          {/* Navigation Items */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              return item.planned ? (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => openPlannedModal(item.label, item.description || "", item.slice || "")}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-[2px] text-[#98B2B4] hover:text-white hover:bg-[#1A383E] transition-colors text-left"
                >
                  <Icon className="w-4 h-4 text-[#7E9FA1]" />
                  <span>{item.label}</span>
                </button>
              ) : (
                <Link
                  key={item.label}
                  to={item.path}
                  className={`flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-[2px] transition-colors ${
                    item.active
                      ? "bg-[#165A60] text-white shadow-subtle"
                      : "text-[#98B2B4] hover:text-white hover:bg-[#1A383E]"
                  }`}
                >
                  <Icon className="w-4 h-4 text-white" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Scope Marker */}
        <div className="p-5 border-t border-[#1F3D43] text-[11px] leading-relaxed text-[#7E9FA1]">
          <span className="font-mono uppercase tracking-wider text-[10px] text-[#B5C8C9] block mb-1">
            ASSIGNED CASES ONLY
          </span>
          Evidence-led scrutiny. Authorized officer actions.
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Context Header (66px, per Foundations reference 01/10 & 08) */}
        <header className="h-[66px] shrink-0 bg-white border-b border-[#D7DEDA] px-6 sm:px-8 flex items-center justify-between select-none">
          <div className="flex items-center gap-4">
            <span className="text-xs font-mono uppercase tracking-wider text-[#5C6F73]">
              ACADEMIC YEAR 2026–27 / ILLUSTRATIVE WORKSPACE
            </span>
          </div>

          {/* Right Controls: Notifications badge + User menu */}
          <div className="flex items-center gap-4">
            {/* Unread Notifications Pill */}
            <button
              type="button"
              onClick={() =>
                openPlannedModal(
                  "Notification Center",
                  "Full recipient notification archive and notification dispatch log.",
                  "Slice 7 (Notifications)"
                )
              }
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono rounded-[2px] bg-[#F6F5F0] hover:bg-[#EBF2F1] text-[#172E33] border border-[#D7DEDA] transition-colors"
              title={`${unreadCount} unread notification(s)`}
            >
              <span className="inline-block w-2 h-2 rounded-full bg-[#165A60]" />
              <span className="font-semibold">{unreadCount}</span>
            </button>

            {/* Officer Profile & Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen((prev) => !prev)}
                className="flex items-center gap-2 p-1 text-left rounded-[2px] hover:bg-[#F6F5F0] transition-colors"
              >
                <div className="text-right hidden sm:block">
                  <span className="block text-xs font-medium text-[#172E33] leading-none">
                    {user?.name}
                  </span>
                  <span className="block text-[10px] font-mono text-[#165A60] mt-0.5 uppercase tracking-wider">
                    {user?.role}
                  </span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-[#5C6F73]" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white border border-[#D7DEDA] rounded-[3px] shadow-panel p-2 z-40 animate-in fade-in zoom-in-95 duration-100">
                  <div className="p-2 border-b border-[#D7DEDA] mb-1">
                    <span className="block text-xs font-semibold text-[#172E33]">{user?.name}</span>
                    <span className="block text-[11px] text-[#5C6F73] font-mono truncate">{user?.email}</span>
                    <span className="block text-[10px] text-[#165A60] font-mono mt-0.5">{user?.designation}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                    className="w-full justify-start text-[#A14637] hover:bg-[#FBEBE8] hover:text-[#A14637] gap-2"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Log out</span>
                  </Button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Dynamic Page Outlet */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
