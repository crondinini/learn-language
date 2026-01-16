export async function register() {
  // Only run on the Node.js runtime (not Edge)
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startMcpServer } = await import("./mcp-server");
    startMcpServer(3001);
  }
}
