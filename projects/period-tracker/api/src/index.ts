import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serve } from "@hono/node-server";
import authRouter from "./routes/auth.js";
import periodsRouter from "./routes/periods.js";
import symptomsRouter from "./routes/symptoms.js";
import predictionsRouter from "./routes/predictions.js";
import syncRouter from "./routes/sync.js";
import partnersRouter from "./routes/partners.js";

const app = new Hono();

app.use("*", logger());
app.use(
  "*",
  cors({
    origin: "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE"],
    allowHeaders: ["Content-Type", "Authorization"],
  })
);

app.get("/", (c) => c.json({ status: "ok", service: "period-tracker-api" }));

app.route("/auth", authRouter);
app.route("/periods", periodsRouter);
app.route("/symptoms", symptomsRouter);
app.route("/predictions", predictionsRouter);
app.route("/sync", syncRouter);
app.route("/partners", partnersRouter);

const port = Number(process.env.PORT) || 3068;
console.log(`Period Tracker API running on port ${port}`);

serve({ fetch: app.fetch, port });
