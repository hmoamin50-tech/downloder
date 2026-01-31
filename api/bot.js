import TelegramBot from "node-telegram-bot-api";
import axios from "axios";

const bot = new TelegramBot(process.env.BOT_TOKEN);

export default async function handler(req, res) {
  if (req.method === "GET") {
    return res.status(200).json({ status: "Bot OK" });
  }

  const update = req.body;
  if (!update.message || !update.message.text) {
    return res.status(200).json({ ok: true });
  }

  const chatId = update.message.chat.id;
  const text = update.message.text;

  if (!text.includes("facebook.com") && !text.includes("fb.watch")) {
    await bot.sendMessage(chatId, "📎 أرسل رابط فيديو Facebook فقط");
    return res.status(200).json({ ok: true });
  }

  await bot.sendMessage(chatId, "⏳ جاري المعالجة...");

  try {
    // API خارجي ثابت
    const { data } = await axios.get(
      "https://api.savetube.me/info",
      { params: { url: text } }
    );

    const video =
      data?.data?.video_formats?.find(v => v.quality === "hd") ||
      data?.data?.video_formats?.[0];

    if (!video?.url) {
      throw new Error("No video");
    }

    await bot.sendVideo(chatId, video.url, {
      caption: "🎬 تم التحميل بنجاح",
      supports_streaming: true
    });

  } catch (e) {
    await bot.sendMessage(
      chatId,
      "❌ فشل التحميل\n\n• الفيديو خاص\n• أو تغيّر تنسيق Facebook"
    );
  }

  return res.status(200).json({ ok: true });
}
