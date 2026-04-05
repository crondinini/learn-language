import "dotenv/config";
import { Bot } from "grammy";
import { generateReply, generateProactiveMessage } from "./conversation.js";
import { startScheduler } from "./scheduler.js";
import { transcribeAudio } from "./transcribe.js";

const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) {
  console.error("❌ TELEGRAM_BOT_TOKEN is required");
  process.exit(1);
}

const CHAT_ID = parseInt(process.env.TELEGRAM_CHAT_ID || "0", 10);
const bot = new Bot(token);

// Only respond to the configured user
function isAuthorized(chatId: number): boolean {
  return !CHAT_ID || chatId === CHAT_ID;
}

// /start command
bot.command("start", async (ctx) => {
  if (!isAuthorized(ctx.chat.id)) return;
  await ctx.reply(
    `مرحبا! 👋\n\nأنا صديقك للمحادثة بالعربية.\n\nسأرسل لك رسائل خلال اليوم — حاول أن ترد بالعربية!\n\nYour chat ID: ${ctx.chat.id}`
  );
});

// /practice — trigger a message on demand
bot.command("practice", async (ctx) => {
  if (!isAuthorized(ctx.chat.id)) return;
  console.log("📩 /practice received");
  try {
    const message = await generateProactiveMessage(ctx.chat.id);
    console.log("✅ Generated message, sending...");
    await ctx.reply(message);
  } catch (err) {
    console.error("❌ /practice failed:", err);
    await ctx.reply("Something went wrong — check the logs.");
  }
});

// Handle voice messages — transcribe then reply
bot.on("message:voice", async (ctx) => {
  if (!isAuthorized(ctx.chat.id)) return;
  console.log("🎤 Voice message received");
  try {
    const file = await ctx.getFile();
    const url = `https://api.telegram.org/file/bot${token}/${file.file_path}`;
    const res = await fetch(url);
    const buffer = Buffer.from(await res.arrayBuffer());

    const transcription = await transcribeAudio(buffer);
    console.log("📝 Transcribed:", transcription.slice(0, 50));

    if (!transcription.trim()) {
      await ctx.reply("لم أسمع شيئاً — حاول مرة أخرى 🎤");
      return;
    }

    // Show what we heard, then reply
    const reply = await generateReply(ctx.chat.id, transcription);
    console.log("✅ Generated reply to voice");
    await ctx.reply(`🎤 ${transcription}\n\n${reply}`);
  } catch (err) {
    console.error("❌ Voice handling failed:", err);
    await ctx.reply("Something went wrong with the voice message — check the logs.");
  }
});

// Handle all text messages as conversation
bot.on("message:text", async (ctx) => {
  if (!isAuthorized(ctx.chat.id)) return;
  if (ctx.message.text.startsWith("/")) return; // skip unknown commands
  console.log("📩 Message received:", ctx.message.text.slice(0, 50));
  try {
    const reply = await generateReply(ctx.chat.id, ctx.message.text);
    console.log("✅ Generated reply, sending...");
    await ctx.reply(reply);
  } catch (err) {
    console.error("❌ Reply failed:", err);
    await ctx.reply("Something went wrong — check the logs.");
  }
});

// Start the scheduler for proactive messages
startScheduler(bot);

// Start polling
bot.start();
console.log("🤖 Arabic practice bot is running!");
console.log(`   Chat ID: ${CHAT_ID || "(any)"}`);
console.log(`   Messages/day: ${process.env.MESSAGES_PER_DAY || 3}`);
