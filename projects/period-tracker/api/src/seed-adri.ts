import "dotenv/config";
import { db } from "./db/index.js";
import { users, periods, periodDays } from "./db/schema.js";
import { v4 as uuid } from "uuid";

async function seed() {
  const adriId = uuid();

  // Create Adri's user account
  await db.insert(users).values({
    id: adriId,
    googleId: "fake-google-id-adri",
    email: "adriana.lueiro.e@gmail.com",
    name: "Adri",
  });

  console.log("Created user Adri:", adriId);

  // Add some period history (4 periods so predictions work)
  const periodData = [
    { start: "2025-11-15", end: "2025-11-20" },
    { start: "2025-12-14", end: "2025-12-19" },
    { start: "2026-01-12", end: "2026-01-17" },
    { start: "2026-02-10", end: "2026-02-15" },
  ];

  for (const p of periodData) {
    const periodId = uuid();
    await db.insert(periods).values({
      id: periodId,
      userId: adriId,
      startDate: p.start,
      endDate: p.end,
      source: "manual",
    });

    // Add period days with flow data
    const start = new Date(p.start);
    const end = new Date(p.end);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dayNum = Math.round((d.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      let flow = "medium";
      if (dayNum === 0) flow = "light";
      if (dayNum === 1 || dayNum === 2) flow = "heavy";
      if (dayNum >= 4) flow = "light";

      await db.insert(periodDays).values({
        id: uuid(),
        periodId,
        date: d.toISOString().split("T")[0],
        flow,
      });
    }

    console.log(`Created period: ${p.start} → ${p.end}`);
  }

  console.log("\nDone! Adri has 4 periods, predictions will work.");
  console.log("Email: adriana.lueiro.e@gmail.com");
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
