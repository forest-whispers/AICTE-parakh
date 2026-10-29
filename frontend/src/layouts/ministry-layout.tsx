import React, { useState } from "react";
import { Outlet, useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../features/auth/hooks/use-auth";
import { Button } from "../shared/ui/button";
import { NotificationBell } from "../features/notifications/components/notification-bell";
import { LogOut, ChevronDown } from "lucide-react";

export const MinistryLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate("/sign-in", { replace: true });
  };

  const navItems = [
    {
      label: "Overview",
      path: "/ministry/overview",
      active:
        location.pathname === "/ministry/overview" ||
        location.pathname === "/ministry" ||
        location.pathname === "/ministry/",
    },
    {
      label: "Portfolio",
      path: "/ministry/portfolio",
      active: location.pathname.startsWith("/ministry/portfolio"),
    },
    {
      label: "Scrutiny reports",
      path: "/ministry/reports",
      active: location.pathname.startsWith("/ministry/reports"),
    },
    {
      label: "Allocation queue",
      path: "/ministry/allocation",
      active: location.pathname.startsWith("/ministry/allocation"),
    },
    {
      label: "Notifications",
      path: "/ministry/notifications",
      active: location.pathname.startsWith("/ministry/notifications"),
    },
    {
      label: "Audit history",
      path: "/ministry/audit",
      active: location.pathname.startsWith("/ministry/audit"),
    },
    {
      label: "Register officer",
      path: "/ministry/register-officer",
      active: location.pathname.startsWith("/ministry/register-officer"),
    },
  ];

  return (
    <div className="h-screen w-screen flex bg-[#F6F5F0] overflow-hidden">
      {/* Left Navigation Rail (216px) */}
      <aside className="w-[216px] shrink-0 bg-[#122B30] text-white flex flex-col justify-between select-none h-full overflow-y-auto">
        <div>
          {/* Brand Header */}
          <div className="px-6 pt-6 pb-5">
            <Link to="/ministry/portfolio" className="block text-inherit no-underline">
              <span className="font-bold text-xl tracking-tight text-white block">PARAKH</span>
              <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-[#7E9FA1] block mt-1">
                MINISTRY OF EDUCATION &amp; AICTE
              </span>
            </Link>
          </div>

          {/* Navigation Items */}
          <nav className="px-3 py-2 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.label}
                to={item.path}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs transition-colors rounded-[2px] ${
                  item.active
                    ? "font-medium text-white bg-[#1A383E]"
                    : "font-normal text-[#98B2B4] hover:text-white hover:bg-[#1A383E]"
                }`}
              >
                {item.active && <span className="text-white">▸</span>}
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </div>

        {/* Bottom Scope Marker */}
        <div className="p-6 text-[11px] leading-relaxed text-[#7E9FA1]">
          <span className="font-mono uppercase tracking-wider text-[10px] text-[#B5C8C9] block mb-1">
            PORTFOLIO OVERSIGHT
          </span>
          Ministry-wide statutory visibility, evidence audit &amp; compliance tracking.
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Context Header (66px) */}
        <header className="h-[66px] shrink-0 bg-white border-b border-[#D7DEDA] px-6 sm:px-8 flex items-center justify-between select-none">
          <div className="flex items-center gap-4">
            <span className="text-xs font-mono uppercase tracking-wider text-[#5C6F73]">
              ACADEMIC YEAR 2026–27 &nbsp;/&nbsp; MINISTRY OVERSIGHT PORTFOLIO
            </span>
          </div>

          {/* Right Controls: Notification Bell & Ministry Admin profile */}
          <div className="flex items-center gap-4">
            <NotificationBell userRole="MINISTRY_ADMIN" />

            <div className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen((prev) => !prev)}
                className="flex items-center gap-1.5 text-left p-1 rounded-[2px] hover:bg-[#F6F5F0] transition-colors"
              >
                <div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-semibold text-[#172E33] leading-none">
                      {user?.name || "Ministry Admin"}
                    </span>
                    <ChevronDown className="w-3 h-3 text-[#5C6F73]" />
                  </div>
                  <span className="block text-[10px] font-mono text-[#5C6F73] mt-0.5 uppercase tracking-wider text-right">
                    {user?.role || "MINISTRY_ADMIN"}
                  </span>
                </div>
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
        <main className="flex-1 min-h-0 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};