import { Hono } from "hono";
import { runMigrations } from "./db/migrate";
import { ensureAdminUser } from "./services/auth";
import { authMiddleware } from "./middleware/auth";
import authRoutes from "./routes/auth";
import conversationRoutes from "./routes/conversations";
import eventRoutes from "./routes/events";

const app = new Hono();

// Run migrations
runMigrations();

// Auth middleware
app.use("*", authMiddleware);

// Routes
app.route("/", authRoutes);
app.route("/", conversationRoutes);
app.route("/", eventRoutes);

// Start server
const port = parseInt(process.env.PORT || "3000");

// Ensure admin user exists then start
ensureAdminUser().then(() => {
  console.log(`[aiktivist] Server running on http://localhost:${port}`);
});

export default {
  port,
  fetch: app.fetch,
};
