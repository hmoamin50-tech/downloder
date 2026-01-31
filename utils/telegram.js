import axios from "axios";
import FormData from "form-data";

// إرسال الفيديو مع خيارات
export async function sendVideoWithOptions(bot, chatId, videoUrl, options = {}) {
  try {
    const message = await bot.sendMessage(chatId, "📤 جاري تحميل وإرسال الفيديو...");

    // إذا كان حجم الفيديو كبيراً، نرسله كرابط
    if (videoUrl.includes('facebook.com') || videoUrl.includes('fbcdn.net')) {
      const downloadLink = `${process.env.VERCEL_URL || 'https://hmoamin50-tech/downloder.vercel.app'}/api/download?url=${encodeURIComponent(videoUrl)}`;
      
      await bot.editMessageText(`📥 *رابط التحميل:*\n\n[اضغط هنا للتحميل](${downloadLink})\n\n💾 *لتحميل الفيديو:*\n1. اضغط على الرابط\n2. اضغط على ⋮\n3. اختر "تنزيل"`, {
        chat_id: chatId,
        message_id: message.message_id,
        parse_mode: "Markdown",
        disable_web_page_preview: false
      });

      return;
    }

    // إذا كان الفيديو صغيراً (أقل من 50MB)، نرسله مباشرة
    try {
      // التحقق من حجم الفيديو
      const headResponse = await axios.head(videoUrl);
      const contentLength = headResponse.headers['content-length'];
      
      if (contentLength && parseInt(contentLength) > 50 * 1024 * 1024) {
        // الفيديو كبير جداً، نرسل الرابط
        const downloadLink = `${process.env.VERCEL_URL || 'https://hmoamin50-tech/downloder.vercel.app'}/api/download?url=${encodeURIComponent(videoUrl)}`;
        
        await bot.editMessageText(`📦 *الفيديو كبير جداً للإرسال المباشر*\n\n📥 [اضغط هنا للتحميل](${downloadLink})`, {
          chat_id: chatId,
          message_id: message.message_id,
          parse_mode: "Markdown"
        });
        return;
      }

      // إرسال الفيديو مباشرة
      await bot.sendVideo(chatId, videoUrl, {
        caption: `🎥 تم التحميل بنجاح!\n${options.filename ? `\n📁 ${options.filename}` : ''}`,
        supports_streaming: true
      });

      // حذف رسالة الانتظار
      await bot.deleteMessage(chatId, message.message_id);

    } catch (sendError) {
      // إذا فشل الإرسال المباشر، نرسل الرابط
      const downloadLink = `${process.env.VERCEL_URL || 'https://hmoamin50-tech/downloder.vercel.app'}/api/download?url=${encodeURIComponent(videoUrl)}`;
      
      await bot.editMessageText(`📥 *رابط التحميل البديل:*\n\n[اضغط هنا للتحميل](${downloadLink})`, {
        chat_id: chatId,
        message_id: message.message_id,
        parse_mode: "Markdown"
      });
    }

  } catch (error) {
    console.error('Error sending video:', error);
    await bot.sendMessage(chatId, "❌ حدث خطأ أثناء إرسال الفيديو. يرجى المحاولة مرة أخرى.");
  }
}
