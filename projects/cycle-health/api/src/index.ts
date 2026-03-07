import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { serve } from "@hono/node-server";
import authRouter from "./routes/auth.js";
import periodsRouter from "./routes/periods.js";
import symptomsRouter from "./routes/symptoms.js";
import predictionsRouter from "./routes/predictions.js";
import partnersRouter from "./routes/partners.js";
import trainingRouter from "./routes/training.js";

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

app.get("/", (c) => c.json({ status: "ok", service: "cycle-health-api" }));

app.route("/auth", authRouter);
app.route("/periods", periodsRouter);
app.route("/symptoms", symptomsRouter);
app.route("/predictions", predictionsRouter);
app.route("/partners", partnersRouter);
app.route("/training", trainingRouter);

const port = Number(process.env.PORT) || 3040;
console.log(`Cycle Health API running on port ${port}`);

serve({ fetch: app.fetch, port });
