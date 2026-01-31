import TelegramBot from "node-telegram-bot-api";
import axios from "axios";

const bot = new TelegramBot(process.env.BOT_TOKEN);

// =====================
// استخراج فيديو Facebook من المصدر
// =====================
async function extractFacebookVideo(url) {
  const { data: html } = await axios.get(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      "Accept-Language": "en-US,en;q=0.9"
    },
    timeout: 10000
  });

  // 1️⃣ hd_src
  let match = html.match(/"hd_src":"([^"]+)"/);
  if (match?.[1]) return decodeFbUrl(match[1]);

  // 2️⃣ sd_src
  match = html.match(/"sd_src":"([^"]+)"/);
  if (match?.[1]) return decodeFbUrl(match[1]);

  // 3️⃣ og:video (fallback)
  match = html.match(
    /<meta[^>]*property="og:video"[^>]*content="([^"]+)"/
  );
  if (match?.[1]) return match[1];

  return null;
}

// فك ترميز روابط Facebook
function decodeFbUrl(str) {
  return str
    .replace(/\\u0025/g, "%")
    .replace(/\\u002F/g, "/")
    .replace(/\\/g, "");
}

// =====================
// Webhook Handler
// =====================
export default async function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json({
      status: "✅ Telegram Facebook Bot is running"
    });
  }

  try {
    const update = req.body;
    if (!update.message || !update.message.text) {
      return res.status(200).json({ ok: true });
    }

    const chatId = update.message.chat.id;
    const text = update.message.text.trim();

    // /start
    if (text === "/start") {
      await bot.sendMessage(
        chatId,
        `🤖 *Facebook Video Bot*

📥 أرسل رابط فيديو Facebook
🎬 يدعم الفيديوهات العامة فقط
⚡ يعمل مباشرة بدون مواقع خارجية

👨‍💻 المطور: @hmoamin`,
        { parse_mode: "Markdown" }
      );
      return res.status(200).json({ ok: true });
    }

    // تحقق من الرابط
    if (!text.includes("facebook.com") && !text.includes("fb.watch")) {
      await bot.sendMessage(
        chatId,
        "📎 أرسل رابط فيديو Facebook فقط"
      );
      return res.status(200).json({ ok: true });
    }

    // رسالة انتظار
    const waitMsg = await bot.sendMessage(
      chatId,
      "⏳ جاري استخراج الفيديو..."
    );

    // استخراج الفيديو
    const videoUrl = await extractFacebookVideo(text);

    if (!videoUrl) {
      await bot.editMessageText(
        "❌ لم يتم العثور على فيديو\n\n• الفيديو خاص\n• أو محمي\n• أو DASH فقط",
        {
          chat_id: chatId,
          message_id: waitMsg.message_id
        }
      );
      return res.status(200).json({ ok: true });
    }

    // إرسال الفيديو
    await bot.sendVideo(chatId, videoUrl, {
      caption: "🎬 تم الاستخراج بنجاح",
      supports_streaming: true
    });

    await bot.deleteMessage(chatId, waitMsg.message_id);

    return res.status(200).json({ ok: true });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal Error" });
  }
}
