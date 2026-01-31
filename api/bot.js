import TelegramBot from "node-telegram-bot-api";
import axios from "axios";
import * as cheerio from "cheerio";

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: false });

// دالة محسنة لاستخراج الفيديو من Facebook
async function extractFacebookVideo(url) {
  try {
    console.log(`🔍 محاولة استخراج الفيديو من: ${url}`);
    
    // تنظيف الرابط
    const cleanUrl = url.trim();
    
    // استخدام خدمة savetik.net التي تعمل بشكل جيد مع فيسبوك
    const apiUrl = `https://savetik.net/api/ajaxSearch`;
    
    const formData = new FormData();
    formData.append('q', cleanUrl);
    formData.append('lang', 'en');
    
    const response = await axios.post(apiUrl, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Origin': 'https://savetik.net',
        'Referer': 'https://savetik.net/'
      },
      timeout: 15000
    });
    
    const data = response.data;
    
    if (data.status && data.links) {
      // البحث عن رابط الفيديو عالي الجودة
      let videoUrl = null;
      let quality = 'SD';
      
      // ترتيب الجودة المفضلة
      const qualityOrder = ['1080', '720', 'HD', 'High', 'Normal', 'Low'];
      
      for (const qualityType of qualityOrder) {
        for (const link of data.links) {
          if (link.quality && link.quality.includes(qualityType) && link.url) {
            videoUrl = link.url;
            quality = link.quality;
            break;
          }
        }
        if (videoUrl) break;
      }
      
      // إذا لم نجد، نأخذ أول رابط
      if (!videoUrl && data.links[0]?.url) {
        videoUrl = data.links[0].url;
        quality = data.links[0].quality || 'SD';
      }
      
      if (videoUrl) {
        return {
          success: true,
          videoUrl: videoUrl,
          quality: quality,
          title: data.title || 'Facebook Video'
        };
      }
    }
    
    return {
      success: false,
      error: "لم يتم العثور على فيديو"
    };
    
  } catch (error) {
    console.error('❌ خطأ في الاستخراج:', error.message);
    
    // محاولة طريقة بديلة
    return await tryAlternativeMethod(url);
  }
}

// طريقة بديلة لاستخراج الفيديو
async function tryAlternativeMethod(url) {
  try {
    console.log('🔄 محاولة طريقة بديلة...');
    
    // استخدام fdownloader.net
    const response = await axios.get(`https://fdownloader.net/`, {
      params: { url: url },
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    
    // البحث عن روابط التحميل
    let videoUrl = null;
    
    $('a[href*=".mp4"], a[href*="video"]').each((i, elem) => {
      const href = $(elem).attr('href');
      const text = $(elem).text().toLowerCase();
      
      if (href && !href.includes('fdownloader.net') && 
          (href.includes('.mp4') || text.includes('download') || text.includes('video'))) {
        videoUrl = href;
      }
    });
    
    if (videoUrl) {
      return {
        success: true,
        videoUrl: videoUrl,
        quality: 'HD',
        title: 'Facebook Video'
      };
    }
    
    return {
      success: false,
      error: "فشلت الطرق البديلة"
    };
    
  } catch (error) {
    console.error('❌ فشلت الطريقة البديلة:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// إرسال الفيديو مباشرة
async function sendVideoDirectly(chatId, videoUrl, caption = '🎬 تم التحميل بنجاح!') {
  try {
    console.log(`📤 إرسال الفيديو: ${videoUrl.substring(0, 50)}...`);
    
    // إرسال الفيديو مع إمكانية البث (streaming)
    await bot.sendVideo(chatId, videoUrl, {
      caption: caption,
      supports_streaming: true,
      parse_mode: 'Markdown'
    });
    
    return true;
  } catch (error) {
    console.error('❌ خطأ في إرسال الفيديو:', error.message);
    return false;
  }
}

// Webhook Handler الرئيسي
export default async function handler(req, res) {
  // الرد على GET requests
  if (req.method === 'GET') {
    return res.status(200).json({
      status: '✅ البوت يعمل بنجاح',
      webhook: true,
      setup: `https://api.telegram.org/bot${process.env.BOT_TOKEN}/setWebhook?url=${encodeURIComponent(`https://${process.env.VERCEL_URL}/api/bot`)}`
    });
  }
  
  try {
    const update = req.body;
    
    // إذا لم تكن هناك رسالة، نخرج
    if (!update.message || !update.message.text) {
      return res.status(200).json({ ok: true });
    }
    
    const chatId = update.message.chat.id;
    const text = update.message.text.trim();
    
    console.log(`📨 رسالة جديدة من ${chatId}: ${text}`);
    
    // معالجة أمر /start
    if (text === '/start') {
      const welcomeMessage = `
🎬 *بوت تحميل فيديوهات الفيسبوك*

*أهلاً وسهلاً بك!* 👋

✨ *مميزات البوت:*
✅ تحميل مباشر في المحادثة
✅ جودة عالية HD
✅ سرعة في التحميل
✅ دعم جميع أنواع الفيديوهات

📋 *كيفية الاستخدام؟*
1. أرسل رابط فيديو الفيسبوك
2. أنتظر قليلاً (5-10 ثواني)
3. احصل على الفيديو مباشرة!

🌐 *أمثلة للروابط:*
• https://fb.watch/abc123/
• https://facebook.com/watch/?v=123456
• https://facebook.com/reel/123456
• https://m.facebook.com/.../videos/...

⚠️ *ملاحظات:*
- الفيديو يجب أن يكون عاماً (ليس خاصاً)
- قد لا تعمل بعض الروابط المحمية
- الحد الأقصى 50MB للفيديو

🚀 *جرب الآن! أرسل رابط فيديو*
      `;
      
      await bot.sendMessage(chatId, welcomeMessage, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: '📱 تحديثات البوت', url: 'https://t.me/hmoamin' }
          ]]
        }
      });
    }
    
    // معالجة أمر /help
    else if (text === '/help') {
      await bot.sendMessage(chatId, 
        `❓ *مساعدة*\n\n` +
        `إذا واجهتك مشكلة:\n` +
        `1. تأكد من أن الفيديو عام وليس خاصاً\n` +
        `2. جرب رابط آخر\n` +
        `3. تأكد من اتصالك بالإنترنت\n\n` +
        `📞 للمساعدة: @hmoamin`,
        { parse_mode: 'Markdown' }
      );
    }
    
    // إذا كان رابط فيسبوك
    else if (text.includes('facebook.com') || text.includes('fb.watch')) {
      try {
        // إرسال رسالة الانتظار
        const waitMsg = await bot.sendMessage(chatId, 
          '🔍 *جاري تحليل الرابط...*\n' +
          '⏳ قد يستغرق 5-10 ثواني',
          { parse_mode: 'Markdown' }
        );
        
        // استخراج الفيديو
        const videoInfo = await extractFacebookVideo(text);
        
        if (videoInfo.success) {
          // تحديث الرسالة
          await bot.editMessageText('✅ *تم العثور على الفيديو!*\n📤 جاري الإرسال...', {
            chat_id: chatId,
            message_id: waitMsg.message_id,
            parse_mode: 'Markdown'
          });
          
          // إرسال الفيديو
          const caption = `🎬 *${videoInfo.title}*\n📊 الجودة: ${videoInfo.quality}\n✅ تم التحميل بنجاح`;
          
          const sent = await sendVideoDirectly(chatId, videoInfo.videoUrl, caption);
          
          if (sent) {
            // حذف رسالة الانتظار
            await bot.deleteMessage(chatId, waitMsg.message_id);
          } else {
            // إذا فشل الإرسال المباشر
            await bot.editMessageText(
              `❌ *لم أستطع إرسال الفيديو مباشرة*\n\n` +
              `📥 *رابط التحميل:*\n${videoInfo.videoUrl}\n\n` +
              `🔗 *طريقة التحميل:*\n1. اضغط على الرابط\n2. اضغط مع الاستمرار\n3. اختر "تنزيل"`,
              {
                chat_id: chatId,
                message_id: waitMsg.message_id,
                parse_mode: 'Markdown'
              }
            );
          }
        } else {
          // إذا فشل استخراج الفيديو
          await bot.editMessageText(
            `❌ *لم أتمكن من تحميل الفيديو*\n\n` +
            `🔍 *الأسباب المحتملة:*\n` +
            `• الفيديو خاص أو محمي\n` +
            `• الرابط غير صحيح\n` +
            `• مشكلة مؤقتة في الخدمة\n\n` +
            `💡 *الحلول المقترحة:*\n` +
            `1. تأكد أن الفيديو عام\n` +
            `2. جرب رابط آخر\n` +
            `3. حاول مرة أخرى بعد قليل`,
            {
              chat_id: chatId,
              message_id: waitMsg.message_id,
              parse_mode: 'Markdown'
            }
          );
        }
        
      } catch (error) {
        console.error('❌ خطأ في معالجة الرابط:', error);
        await bot.sendMessage(chatId, 
          '❌ حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.',
          { parse_mode: 'Markdown' }
        );
      }
    }
    
    // أي نص آخر (ليس رابط ولا أمر)
    else if (text && !text.startsWith('/')) {
      await bot.sendMessage(chatId,
        `📎 *لم أتعرف على طلبك*\n\n` +
        `⚠️ *أنا أفهم فقط:*\n` +
        `• /start - بدء البوت\n` +
        `• /help - المساعدة\n` +
        `• روابط فيديو الفيسبوك\n\n` +
        `🎬 *مثال على رابط:*\n` +
        `https://fb.watch/abc123/`,
        { parse_mode: 'Markdown' }
      );
    }
    
    return res.status(200).json({ ok: true });
    
  } catch (error) {
    console.error('❌ Webhook error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
