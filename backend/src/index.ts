import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "node:path";
import applicationRoutes from "./routes/application.routes.js";
import authRoutes from "./routes/auth.routes.js";
import notificationRoutes from "./routes/notification.routes.js";
import auditRoutes from "./routes/audit.routes.js";
import ministryRoutes from "./routes/ministry.routes.js";
import workbenchRoutes from "./routes/workbench.routes.js";
import reportRoutes from "./routes/report.routes.js";

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Serve uploaded files statically for verification
const uploadsDir = path.resolve(process.cwd(), "uploads");
app.use("/uploads", express.static(uploadsDir));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/audit", auditRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/ministry", ministryRoutes);
app.use("/api/workbench", workbenchRoutes);
app.use("/api/reports", reportRoutes);

app.get("/api/health", (_req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

const isDirectRun = Boolean(
  process.argv[1] && (
    process.argv[1].endsWith("index.ts") ||
    process.argv[1].endsWith("index.js")
  )
);

if (isDirectRun && process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
  });
}

export default app;
