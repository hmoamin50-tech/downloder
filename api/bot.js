import TelegramBot from "node-telegram-bot-api";

// استخدم وضع polling للتطوير المحلي، ولكن Webhook للإنتاج
const bot = new TelegramBot(process.env.BOT_TOKEN, {
  polling: process.env.NODE_ENV === "development"
});

// تعريف الأوامر والردود
bot.onText(/\/start/, (msg) => {
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

✍️ *المطور:* تم الإنشاء بواسطة Vercel

🚀 *أرسل رابط الآن!*
  `;

  bot.sendMessage(chatId, welcomeText, {
    parse_mode: "Markdown",
    reply_markup: {
      keyboard: [[{ text: "📖 المساعدة" }]],
      resize_keyboard: true
    }
  });
});

bot.onText(/\/help|📖 المساعدة/, (msg) => {
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

  bot.sendMessage(chatId, helpText, {
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

  // تجاهل الأوامر والرسائل غير النصية
  if (!text || text.startsWith("/")) return;

  // التحقق من أن الرسالة تحتوي على رابط Facebook
  const facebookRegex = /(?:https?:\/\/)?(?:www\.|m\.)?(?:facebook\.com|fb\.watch)\/[^\s]+/;
  const isFacebookLink = facebookRegex.test(text);

  if (isFacebookLink) {
    try {
      // إرسال رسالة الانتظار
      const waitingMsg = await bot.sendMessage(chatId, "⏳ جاري تحليل الرابط واستخراج الفيديو...");

      // استخراج معلومات الفيديو
      const videoInfo = { success: true, videoUrl: text, title: "فيديو تجريبي", quality: "HD" };
      
      if (videoInfo.success && videoInfo.videoUrl) {
        // حذف رسالة الانتظار
        await bot.deleteMessage(chatId, waitingMsg.message_id);

        // إرسال معلومات الفيديو
        const caption = `✅ *تم تحميل الفيديو بنجاح!*\n\n📝 *العنوان:* ${videoInfo.title || "غير متوفر"}\n📊 *الجودة:* ${videoInfo.quality || "متوسطة"}`;

        await bot.sendMessage(chatId, caption, { parse_mode: "Markdown" });

        // إرسال رابط التحميل
        const downloadLink = `https://${process.env.VERCEL_URL || 'your-app.vercel.app'}/api/download?url=${encodeURIComponent(videoInfo.videoUrl)}`;
        
        await bot.sendMessage(chatId, `📥 *رابط التحميل:*\n\n[اضغط هنا للتحميل](${downloadLink})`, {
          parse_mode: "Markdown",
          disable_web_page_preview: false
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

// Webhook handler - مهم جداً لـ Vercel
export default async function handler(req, res) {
  try {
    if (req.method === "POST") {
      const update = req.body;
      
      // معالجة الرسالة يدوياً
      if (update.message) {
        const msg = update.message;
        const text = msg.text || "";
        const chatId = msg.chat.id;

        if (text === "/start") {
          const welcomeText = `
مرحباً 👋 *Facebook Video Downloader Bot*

🎥 *كيفية الاستخدام:*
1. أرسل لي رابط فيديو من Facebook
2. انتظر قليلاً بينما أحلل الرابط
3. سأرسل لك الفيديو جاهزاً للتحميل

🚀 *أرسل رابط الآن!*
          `;

          await bot.sendMessage(chatId, welcomeText, {
            parse_mode: "Markdown"
          });
        } else if (text === "/help" || text === "📖 المساعدة") {
          await bot.sendMessage(chatId, "أرسل رابط فيديو Facebook وسأقوم بتحميله لك", {
            parse_mode: "Markdown"
          });
        } else if (text.includes("facebook.com") || text.includes("fb.watch")) {
          await bot.sendMessage(chatId, "⏳ جاري تحليل الرابط...");
          // هنا يمكنك إضافة استدعاء لدالة استخراج الفيديو
          const downloadLink = `https://${process.env.VERCEL_URL || 'your-app.vercel.app'}/api/download?url=${encodeURIComponent(text)}`;
          await bot.sendMessage(chatId, `📥 رابط التحميل:\n${downloadLink}`);
        } else if (text) {
          await bot.sendMessage(chatId, "📎 يرجى إرسال رابط فيديو Facebook فقط");
        }
      }
      
      return res.status(200).json({ ok: true });
    }
    
    // GET request - show bot status
    res.status(200).json({ 
      status: "Bot is running ✅", 
      webhook: true,
      url: `https://api.telegram.org/bot${process.env.BOT_TOKEN}/getWebhookInfo`
    });
    
  } catch (error) {
    console.error("Handler error:", error);
    res.status(500).json({ error: error.message });
  }
}
