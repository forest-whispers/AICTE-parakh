import { auditService } from "../services/audit.service.js";
export const getAuditLogs = async (req, res) => {
    try {
        if (!req.user) {
            res.status(401).json({ success: false, error: "Authentication required." });
            return;
        }
        const { applicationId, action, limit } = req.query;
        const logs = await auditService.getAuditLogs({
            applicationId: applicationId ? String(applicationId) : undefined,
            action: action ? String(action) : undefined,
            limit: limit ? parseInt(String(limit), 10) : 50,
        }, req.user);
        res.status(200).json({
            success: true,
            data: logs,
        });
    }
    catch (error) {
        const isForbidden = error.message?.includes("Access denied");
        res.status(isForbidden ? 403 : 500).json({
            success: false,
            error: error.message || "Failed to fetch audit logs.",
        });
    }
};
//# sourceMappingURL=audit.controller.js.map