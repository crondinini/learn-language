import { NativeConnection, Worker, bundleWorkflowCode, Runtime } from "@temporalio/worker";
import path from "path";
import * as activities from "./activities";

const TEMPORAL_ADDRESS = process.env.TEMPORAL_ADDRESS || "localhost:7233";
const TASK_QUEUE = process.env.TEMPORAL_TASK_QUEUE || "learn-language";
const NAMESPACE = process.env.TEMPORAL_NAMESPACE || "default";

async function run() {
  // Configure Temporal runtime logging
  Runtime.install({
    logger: {
      log(level, message, meta) {
        const fn = level === "ERROR" ? console.error
          : level === "WARN" ? console.warn
          : level === "DEBUG" || level === "TRACE" ? console.debug
          : console.log;
        fn(`[temporal:${level}] ${message}`, meta ?? "");
      },
      info(message, meta) { this.log("INFO", message, meta); },
      warn(message, meta) { this.log("WARN", message, meta); },
      error(message, meta) { this.log("ERROR", message, meta); },
      debug(message, meta) { this.log("DEBUG", message, meta); },
      trace(message, meta) { this.log("TRACE", message, meta); },
    },
  });

  console.log(`Connecting to Temporal server at ${TEMPORAL_ADDRESS}...`);

  // Connect to the Temporal server
  const connection = await NativeConnection.connect({
    address: TEMPORAL_ADDRESS,
  });

  console.log("Connected. Bundling workflow code...");

  // Bundle workflow code for the V8 isolate sandbox
  const workflowBundle = await bundleWorkflowCode({
    workflowsPath: path.resolve(__dirname, "./workflows"),
  });

  console.log("Workflow code bundled. Creating worker...");

  // Create the worker
  const worker = await Worker.create({
    connection,
    namespace: NAMESPACE,
    taskQueue: TASK_QUEUE,
    workflowBundle,
    activities,
  });

  console.log(
    `Worker started. Listening on task queue "${TASK_QUEUE}" in namespace "${NAMESPACE}"`
  );

  // Start polling for tasks (blocks until worker is shut down)
  await worker.run();
}

run().catch((err) => {
  console.error("Worker failed:", err);
  process.exit(1);
});
