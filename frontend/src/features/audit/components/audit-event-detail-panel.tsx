import React from "react";
import { Link } from "react-router-dom";
import { X, ArrowRight, ShieldCheck, Cpu, UserCheck } from "lucide-react";
import type { AuditLogItem } from "../types/audit.types";

interface AuditEventDetailPanelProps {
  event: AuditLogItem | null;
  onClose: () => void;
}

export const AuditEventDetailPanel: React.FC<AuditEventDetailPanelProps> = ({
  event,
  onClose,
}) => {
  if (!event) return null;

  const isSystem = event.actor.isSystem || event.actor.role === "SYSTEM";
  const isOfficer = event.actor.role === "OFFICER";

  const formattedDate = new Date(event.timestamp).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const formatActionTitle = (action: string) => {
    return action
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <aside
      className="w-full lg:w-[380px] shrink-0 bg-white border border-[#D7DEDA] rounded-[4px] p-5 shadow-panel space-y-5 animate-in fade-in duration-150"
      aria-label="Event detail panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#D7DEDA] pb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono uppercase tracking-wider text-[#172E33] font-semibold">
            Event detail
          </span>
          <span className="text-[#8A9B9D] text-xs">/</span>
          <span className="text-[11px] font-mono text-[#5C6F73]">
            {event.id.slice(0, 10)}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-[#5C6F73] hover:text-[#172E33] flex items-center gap-1 p-1 rounded hover:bg-[#F6F5F0] transition-colors"
        >
          <X className="w-3.5 h-3.5" />
          <span>Close</span>
        </button>
      </div>

      {/* Immutability & Event Attribution Badge */}
      <div>
        <div
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-mono rounded-[2px] ${
            isSystem
              ? "bg-[#EAEFF0] text-[#165A60] border border-[#CCD8D9]"
              : isOfficer
              ? "bg-[#EAF3EE] text-[#245E3F] border border-[#C8E6C9]"
              : "bg-[#F3EFF9] text-[#553285] border border-[#DDD0EE]"
          }`}
        >
          {isSystem ? (
            <Cpu className="w-3.5 h-3.5" />
          ) : isOfficer ? (
            <UserCheck className="w-3.5 h-3.5" />
          ) : (
            <ShieldCheck className="w-3.5 h-3.5" />
          )}
          <span>
            {isSystem
              ? "System event · immutable"
              : isOfficer
              ? "Officer action · immutable"
              : "Ministry Admin · immutable"}
          </span>
        </div>
      </div>

      {/* Event Reference & Title */}
      <div className="space-y-1">
        <span className="block text-[11px] font-mono text-[#8A9B9D]">
          ID: {event.id}
        </span>
        <h3 className="text-base font-bold text-[#172E33] leading-snug">
          {formatActionTitle(event.action)}
        </h3>
      </div>

      {/* Target Application & Institution */}
      {event.application ? (
        <div className="bg-[#F6F5F0] border border-[#D7DEDA] rounded-[3px] p-3 space-y-1">
          <span className="block text-[10px] font-mono uppercase tracking-wider text-[#5C6F73]">
            Target Application
          </span>
          <span className="block text-xs font-bold text-[#172E33]">
            {event.application.applicationNumber}
          </span>
          <span className="block text-[11px] text-[#475569]">
            {event.application.institutionName}
          </span>
        </div>
      ) : (
        <div className="bg-[#F6F5F0] border border-[#D7DEDA] rounded-[3px] p-3">
          <span className="block text-[10px] font-mono uppercase tracking-wider text-[#5C6F73]">
            Target Resource
          </span>
          <span className="text-xs font-mono text-[#172E33]">
            {event.resourceType} {event.resourceId ? `(${event.resourceId})` : ""}
          </span>
        </div>
      )}

      {/* Chronological & Actor Metadata */}
      <div className="space-y-2 text-xs">
        <div className="flex justify-between items-center py-1 border-b border-[#EBEAE5]">
          <span className="text-[#5C6F73] font-mono">Timestamp</span>
          <span className="font-mono text-[#172E33]">{formattedDate}</span>
        </div>
        <div className="flex justify-between items-center py-1 border-b border-[#EBEAE5]">
          <span className="text-[#5C6F73] font-mono">Actor</span>
          <span className="font-medium text-[#172E33]">
            {event.actor.name}{" "}
            <span className="font-mono text-[10px] text-[#5C6F73]">
              ({event.actor.role})
            </span>
          </span>
        </div>
        <div className="flex justify-between items-center py-1 border-b border-[#EBEAE5]">
          <span className="text-[#5C6F73] font-mono">Event Status</span>
          <span
            className={`font-mono text-[11px] font-semibold ${
              event.status === "SUCCESS"
                ? "text-[#245E3F]"
                : event.status === "FAILURE"
                ? "text-[#A14637]"
                : "text-[#94631F]"
            }`}
          >
            {event.status}
          </span>
        </div>
      </div>

      {/* Observation / Details */}
      <div className="space-y-1">
        <span className="block text-[10px] font-mono uppercase tracking-wider text-[#5C6F73]">
          Event Summary &amp; Description
        </span>
        <p className="text-xs text-[#334155] leading-relaxed bg-[#FAFAF8] p-3 border border-[#EBEAE5] rounded-[2px]">
          {event.details}
        </p>
      </div>

      {/* Provenance & Metadata Details if present */}
      {event.metadata && Object.keys(event.metadata).length > 0 && (
        <div className="space-y-1.5">
          <span className="block text-[10px] font-mono uppercase tracking-wider text-[#5C6F73]">
            Event Provenance &amp; Metadata
          </span>
          <div className="bg-[#FAFAF8] border border-[#EBEAE5] rounded-[2px] p-2.5 text-[11px] font-mono text-[#334155] space-y-1 max-h-48 overflow-y-auto">
            {Object.entries(event.metadata).map(([key, val]) => (
              <div key={key} className="flex flex-col sm:flex-row sm:justify-between py-0.5 border-b border-[#F0EFEA] last:border-0">
                <span className="text-[#5C6F73]">{key}:</span>
                <span className="font-semibold truncate max-w-[200px]" title={typeof val === "object" ? JSON.stringify(val) : String(val)}>
                  {typeof val === "object" ? JSON.stringify(val) : String(val)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Context Navigation Link */}
      {event.application?.id && (
        <div className="pt-2">
          <Link
            to={`/ministry/portfolio`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#165A60] hover:text-[#122B30] transition-colors"
          >
            <span>Inspect in Ministry Portfolio</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
    </aside>
  );
};

