/**
 * Scheduler — picks random times each day and sends proactive messages.
 */

import cron from "node-cron";
import { generateProactiveMessage } from "./conversation.js";
import type { Bot } from "grammy";

const MESSAGES_PER_DAY = parseInt(process.env.MESSAGES_PER_DAY || "3", 10);
const CHAT_ID = parseInt(process.env.TELEGRAM_CHAT_ID || "0", 10);

// Window: 9am to 9pm (in server local time)
const START_HOUR = 9;
const END_HOUR = 21;

let scheduledTimeouts: ReturnType<typeof setTimeout>[] = [];

/**
 * Pick N random times between START_HOUR and END_HOUR for today.
 */
function pickRandomTimes(count: number): Date[] {
  const now = new Date();
  const times: Date[] = [];

  for (let i = 0; i < count; i++) {
    const hour = START_HOUR + Math.random() * (END_HOUR - START_HOUR);
    const d = new Date(now);
    d.setHours(Math.floor(hour), Math.floor((hour % 1) * 60), 0, 0);
    // Only schedule future times
    if (d > now) {
      times.push(d);
    }
  }

  return times.sort((a, b) => a.getTime() - b.getTime());
}

/**
 * Schedule today's messages and set up daily re-scheduling.
 */
export function startScheduler(bot: Bot) {
  if (!CHAT_ID) {
    console.warn("⚠️  TELEGRAM_CHAT_ID not set — scheduler disabled");
    return;
  }

  function scheduleToday() {
    // Clear any existing timeouts
    for (const t of scheduledTimeouts) clearTimeout(t);
    scheduledTimeouts = [];

    const times = pickRandomTimes(MESSAGES_PER_DAY);
    console.log(
      `📅 Scheduled ${times.length} messages for today:`,
      times.map((t) => t.toLocaleTimeString()).join(", ")
    );

    for (const time of times) {
      const delay = time.getTime() - Date.now();
      const timeout = setTimeout(async () => {
        try {
          console.log(`💬 Sending proactive message at ${new Date().toLocaleTimeString()}`);
          const message = await generateProactiveMessage(CHAT_ID);
          await bot.api.sendMessage(CHAT_ID, message);
        } catch (err) {
          console.error("Failed to send proactive message:", err);
        }
      }, delay);
      scheduledTimeouts.push(timeout);
    }
  }

  // Schedule for today immediately
  scheduleToday();

  // Re-schedule every day at midnight
  cron.schedule("0 0 * * *", () => {
    console.log("🌅 New day — re-scheduling messages");
    scheduleToday();
  });
}
