import TelegramBot from "node-telegram-bot-api";
import { extractFacebookVideo } from "../utils/facebook.js";
import { sendVideoWithOptions } from "../utils/telegram.js";

// تأكد من إضافة خيار { polling: false } لأننا نستخدم Webhook
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: false });

// الأمر /start
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const welcomeText = `
مرحباً 👋 *Facebook Video Downloader Bot*

🎥 *كيفية الاستخدام:*
1. أرسل لي رابط فيديو من Facebook
2. انتظر قليلاً بينما أحلل الرابط
3. سأرسل لك الفيديو جاهزاً للتحميل

📌 *ملاحظات:*
- يدعم الفيديوهات العادية والريلز
- الحد الأقصى لحجم الفيديو: 50MB
- يرجى التحقق من حقوق النشر قبل التحميل

✍️ *المطور:* [تم الإنشاء بواسطة Vercel](https://vercel.com)

🚀 *أرسل رابط الآن!*
  `;

  await bot.sendMessage(chatId, welcomeText, {
    parse_mode: "Markdown",
    reply_markup: {
      keyboard: [[{ text: "📖 المساعدة" }]],
      resize_keyboard: true
    }
  });
});

// الأمر /help
bot.onText(/\/help|📖 المساعدة/, async (msg) => {
  const chatId = msg.chat.id;
  const helpText = `
❓ *مساعدة*
أرسل رابط فيديو Facebook وسأقوم بتحميله لك

🌐 *نماذج الروابط المدعومة:*
- https://www.facebook.com/.../videos/...
- https://fb.watch/...
- https://www.facebook.com/reel/...
- https://m.facebook.com/.../videos/...

⚠️ *مشاكل شائعة:*
• تأكد من أن الفيديو عام وليس خاص
• قد لا تعمل بعض الروابط المحمية
• جرب نسخ الرابط من المتصفح بدلاً من التطبيق

💡 *نصيحة:* استخدم روابط الفيديو المباشرة للحصول على أفضل النتائج
  `;

  await bot.sendMessage(chatId, helpText, {
    parse_mode: "Markdown",
    reply_markup: {
      remove_keyboard: true
    }
  });
});

// معالجة روابط Facebook
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;

  // تجاهل الأوامر
  if (text.startsWith("/")) return;

  // التحقق من أن الرسالة تحتوي على رابط Facebook
  const facebookRegex = /(?:https?:\/\/)?(?:www\.|m\.)?(?:facebook\.com|fb\.watch)\/[^\s]+/;
  const isFacebookLink = facebookRegex.test(text);

  if (isFacebookLink) {
    try {
      // إرسال رسالة الانتظار
      const waitingMsg = await bot.sendMessage(chatId, "⏳ جاري تحليل الرابط واستخراج الفيديو...");

      // استخراج معلومات الفيديو
      const videoInfo = await extractFacebookVideo(text);

      if (videoInfo.success && videoInfo.videoUrl) {
        // حذف رسالة الانتظار
        await bot.deleteMessage(chatId, waitingMsg.message_id);

        // إرسال معلومات الفيديو
        const caption = `✅ *تم تحميل الفيديو بنجاح!*\n\n📝 *العنوان:* ${videoInfo.title || "غير متوفر"}\n📊 *الجودة:* ${videoInfo.quality || "متوسطة"}\n📁 *الحجم:* ${videoInfo.size || "غير معروف"}`;

        await bot.sendMessage(chatId, caption, { parse_mode: "Markdown" });

        // إرسال الفيديو
        await sendVideoWithOptions(bot, chatId, videoInfo.videoUrl, {
          quality: videoInfo.quality,
          filename: `facebook_video_${Date.now()}.mp4`
        });

      } else {
        await bot.editMessageText("❌ لم أتمكن من استخراج الفيديو من هذا الرابط.", {
          chat_id: chatId,
          message_id: waitingMsg.message_id
        });
      }

    } catch (error) {
      console.error("Error processing video:", error);
      await bot.sendMessage(chatId, "❌ حدث خطأ أثناء معالجة الفيديو. يرجى المحاولة مرة أخرى.");
    }
  } else if (text && !isFacebookLink) {
    // إذا كانت رسالة نصية بدون رابط
    await bot.sendMessage(chatId, "📎 يرجى إرسال رابط فيديو Facebook فقط.\n\nمثال:\nhttps://www.facebook.com/.../videos/...\nأو\nhttps://fb.watch/...");
  }
});

// معالجة الأخطاء
bot.on("polling_error", (error) => {
  console.error("Polling error:", error);
});

// Webhook handler
export default async function handler(req, res) {
  try {
    if (req.method === "POST") {
      // معالجة البيانات القادمة من تيليجرام
      await bot.processUpdate(req.body);
      return res.status(200).json({ message: "ok" });
    }
    
    // رسالة تظهر عند فتح الرابط في المتصفح
    res.status(200).send("Bot is running ✅");
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
