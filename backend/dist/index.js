import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "node:path";
import applicationRoutes from "./routes/application.routes.js";
const app = express();
const PORT = process.env.PORT || 3000;
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
app.use("/api/applications", applicationRoutes);
app.get("/api/health", (_req, res) => {
    res.json({ status: "OK", timestamp: new Date().toISOString() });
});
app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});
export default app;
//# sourceMappingURL=index.js.map