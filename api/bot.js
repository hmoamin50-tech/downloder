import TelegramBot from "node-telegram-bot-api";
import axios from "axios";
import * as cheerio from "cheerio";
import { exec } from 'child_process';
import { promisify } from 'util';
const execAsync = promisify(exec);

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: false });

// قائمة روابط Facebook المعروفة
const FACEBOOK_DOMAINS = [
  'facebook.com',
  'fb.watch',
  'fb.com',
  'm.facebook.com'
];

// استخراج الفيديو من Facebook
async function extractFacebookVideo(url) {
  try {
    console.log(`🔍 استخراج الفيديو من: ${url}`);
    
    // تنظيف الرابط
    const cleanUrl = url.trim();
    
    // استخدام API خارجي لاستخراج الفيديو
    const apis = [
      `https://getvideobot.app/api/${encodeURIComponent(cleanUrl)}`,
      `https://api.fbdown.net/download/${encodeURIComponent(cleanUrl)}`,
      `https://www.getfvid.com/downloader`,
    ];
    
    let videoUrl = null;
    let quality = 'HD';
    
    // محاولة مع كل API
    for (const api of apis) {
      try {
        console.log(`🔗 محاولة API: ${api}`);
        
        const response = await axios({
          method: 'POST',
          url: 'https://www.getfvid.com/downloader',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          },
          data: `url=${encodeURIComponent(cleanUrl)}`
        });
        
        const html = response.data;
        const $ = cheerio.load(html);
        
        // البحث عن روابط التحميل
        $('a[href*=".mp4"], a[href*="video"]').each((i, elem) => {
          const href = $(elem).attr('href');
          const text = $(elem).text().toLowerCase();
          
          if (href && (href.includes('.mp4') || href.includes('video_redirect'))) {
            if (text.includes('hd') || text.includes('high')) {
              videoUrl = href;
              quality = 'HD';
            } else if (!videoUrl) {
              videoUrl = href;
              quality = 'SD';
            }
          }
        });
        
        if (videoUrl) break;
        
      } catch (apiError) {
        console.log(`❌ فشل API: ${apiError.message}`);
        continue;
      }
    }
    
    // إذا لم نجد رابط، نجرب طريقة أخرى
    if (!videoUrl) {
      videoUrl = await tryDirectExtraction(cleanUrl);
    }
    
    if (videoUrl) {
      console.log(`✅ تم العثور على الفيديو: ${videoUrl}`);
      return {
        success: true,
        videoUrl: videoUrl,
        quality: quality,
        thumbnail: null
      };
    }
    
    return {
      success: false,
      error: "لم يتم العثور على فيديو"
    };
    
  } catch (error) {
    console.error('❌ خطأ في الاستخراج:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// طريقة مباشرة للاستخراج
async function tryDirectExtraction(url) {
  try {
    // استدعاء خدمة yt-dlp (إذا كان مثبتاً)
    try {
      const { stdout } = await execAsync(`yt-dlp -g "${url}"`);
      const lines = stdout.split('\n').filter(line => line.trim());
      return lines[0] || null;
    } catch (e) {
      // yt-dlp غير متوفر، نجرب طريقة أخرى
    }
    
    // استخدام iframe لحل المشكلة
    const iframeUrl = `https://www.fbdown.net/download.php?url=${encodeURIComponent(url)}`;
    const response = await axios.get(iframeUrl);
    const $ = cheerio.load(response.data);
    
    // البحث عن روابط الفيديو
    let videoLink = null;
    $('a').each((i, elem) => {
      const href = $(elem).attr('href');
      if (href && (href.includes('.mp4') || href.includes('video'))) {
        videoLink = href;
      }
    });
    
    return videoLink;
    
  } catch (error) {
    console.log('❌ فشل الاستخراج المباشر');
    return null;
  }
}

// تحميل وإرسال الفيديو
async function downloadAndSendVideo(chatId, videoUrl, messageId) {
  try {
    console.log(`📥 تحميل الفيديو: ${videoUrl}`);
    
    // تحديث الرسالة
    await bot.editMessageText('📥 جاري تحميل الفيديو...', {
      chat_id: chatId,
      message_id: messageId
    });
    
    // تحميل الفيديو كـ buffer
    const response = await axios({
      method: 'GET',
      url: videoUrl,
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://www.facebook.com/',
        'Accept': 'video/mp4,video/webm,video/*'
      },
      maxContentLength: 50 * 1024 * 1024, // 50MB كحد أقصى
      timeout: 30000
    });
    
    console.log(`✅ تم التحميل، الحجم: ${response.data.length} bytes`);
    
    // تحديث الرسالة
    await bot.editMessageText('📤 جاري إرسال الفيديو...', {
      chat_id: chatId,
      message_id: messageId
    });
    
    // إرسال الفيديو مباشرة
    await bot.sendVideo(chatId, Buffer.from(response.data), {
      caption: '🎬 تم التحميل بنجاح!\n✅ جودة عالية\n📱 متوافق مع جميع الأجهزة',
      supports_streaming: true,
      parse_mode: 'Markdown'
    });
    
    // حذف رسالة التحميل
    await bot.deleteMessage(chatId, messageId);
    
    return true;
    
  } catch (error) {
    console.error('❌ خطأ في التحميل:', error.message);
    
    // محاولة إرسال الرابط مباشرة إذا فشل التحميل
    try {
      await bot.editMessageText('📤 جربت طريقة بديلة...', {
        chat_id: chatId,
        message_id: messageId
      });
      
      // إرسال الفيديو عبر الرابط مباشرة
      await bot.sendVideo(chatId, videoUrl, {
        caption: '🎬 تم التحميل عبر الرابط المباشر',
        supports_streaming: true
      });
      
      await bot.deleteMessage(chatId, messageId);
      return true;
      
    } catch (sendError) {
      console.error('❌ فشل الإرسال المباشر:', sendError.message);
      
      await bot.editMessageText('❌ عذراً، لم أستطع إرسال الفيديو مباشرة.\n\n📎 يمكنك تحميله من هذا الرابط:\n' + videoUrl, {
        chat_id: chatId,
        message_id: messageId
      });
      
      return false;
    }
  }
}

// Webhook Handler
export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({ 
      status: 'Bot is running 🚀',
      webhook: true,
      setup: `اضغط هنا لإعداد Webhook: https://api.telegram.org/bot${process.env.BOT_TOKEN}/setWebhook?url=https://${process.env.VERCEL_URL}/api/bot`
    });
  }
  
  try {
    const update = req.body;
    
    // التحقق من وجود الرسالة
    if (!update.message || !update.message.text) {
      return res.status(200).json({ ok: true });
    }
    
    const chatId = update.message.chat.id;
    const text = update.message.text;
    
    console.log(`📨 رسالة جديدة: ${text}`);
    
    // أمر /start
    if (text === '/start') {
      const welcomeMsg = `
🎬 *Facebook Video Downloader Bot* 🎬

*مرحباً بك!* 👋

🤖 *ماذا أفعل؟*
أحمل لك أي فيديو من Facebook وأرسله لك مباشرة في المحادثة!

*📋 طريقة الاستخدام:*
1. أرسل رابط الفيديو
2. أنتظر لحين التحليل
3. أحصل على الفيديو جاهزاً!

*🌐 الروابط المدعومة:*
• https://facebook.com/.../videos/...
• https://fb.watch/...
• https://facebook.com/reel/...
• https://m.facebook.com/...

*⚡ مميزات البوت:*
✅ تحميل مباشر في المحادثة
✅ جودة عالية HD
✅ سريع وسهل الاستخدام
✅ لا حاجة لروابط خارجية

🚀 *أرسل رابط الآن واختبر البوت!*
      `;
      
      await bot.sendMessage(chatId, welcomeMsg, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: '📱 قناة المطور', url: 'https://t.me/hmoamin' },
            { text: '⭐ تقييم البوت', url: 'https://t.me/hmoamin' }
          ]]
        }
      });
    }
    
    // أمر /help
    else if (text === '/help') {
      const helpMsg = `
❓ *مساعدة*

*🔗 أرسل رابط فيديو Facebook وسأقوم بـ:*
1. تحليل الرابط
2. استخراج الفيديو
3. إرساله لك مباشرة

*⚠️ إذا لم يعمل الرابط:*
• تأكد أن الفيديو عام وليس خاص
• جرب رابط آخر
• تأكد من صحة الرابط

*🎬 مثال للروابط:*
• https://www.facebook.com/watch/?v=123456
• https://fb.watch/abc123/
• https://www.facebook.com/reel/123456

💡 *نصيحة:* استخدم نسخ الرابط من متصفح Chrome للحصول على أفضل النتائج
      `;
      
      await bot.sendMessage(chatId, helpMsg, {
        parse_mode: 'Markdown'
      });
    }
    
    // إذا كان رابط Facebook
    else if (FACEBOOK_DOMAINS.some(domain => text.includes(domain))) {
      try {
        // إرسال رسالة الانتظار
        const waitingMsg = await bot.sendMessage(chatId, '🔍 *جاري تحليل الرابط...*\n\n⏳ قد يستغرق بضع ثواني', {
          parse_mode: 'Markdown'
        });
        
        // استخراج الفيديو
        const videoInfo = await extractFacebookVideo(text);
        
        if (videoInfo.success && videoInfo.videoUrl) {
          // تحديث الرسالة
          await bot.editMessageText('✅ *تم العثور على الفيديو!*\n\n📥 جاري التحميل...', {
            chat_id: chatId,
            message_id: waitingMsg.message_id,
            parse_mode: 'Markdown'
          });
          
          // تحميل وإرسال الفيديو
          await downloadAndSendVideo(chatId, videoInfo.videoUrl, waitingMsg.message_id);
          
        } else {
          await bot.editMessageText('❌ *لم أستطع العثور على الفيديو*\n\n🔍 تأكد من:\n1. الرابط صحيح\n2. الفيديو عام وليس خاص\n3. لديك اتصال بالإنترنت\n\n📎 يمكنك تجربة رابط آخر', {
            chat_id: chatId,
            message_id: waitingMsg.message_id,
            parse_mode: 'Markdown'
          });
        }
        
      } catch (error) {
        console.error('❌ خطأ في المعالجة:', error);
        await bot.sendMessage(chatId, '❌ حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.');
      }
    }
    
    // أي رسالة أخرى
    else if (text && !text.startsWith('/')) {
      const replyMsg = `📎 *لم أتعرف على طلبك*\n\n⚠️ أنا أفهم فقط:\n• /start - بدء البوت\n• /help - المساعدة\n• روابط Facebook - لتحميل الفيديوهات\n\n🎬 *مثال:*\nhttps://www.facebook.com/watch/?v=123456`;
      
      await bot.sendMessage(chatId, replyMsg, {
        parse_mode: 'Markdown',
        reply_markup: {
          remove_keyboard: true
        }
      });
    }
    
    return res.status(200).json({ ok: true });
    
  } catch (error) {
    console.error('❌ Webhook error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
