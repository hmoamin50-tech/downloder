import TelegramBot from "node-telegram-bot-api";
import axios from "axios";
import * as cheerio from "cheerio";

const bot = new TelegramBot(process.env.BOT_TOKEN, { 
  polling: false,
  webHook: true
});

// Webhook Handler الرئيسي
export default async function handler(req, res) {
  // التأكد أن الطريقة POST فقط
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const update = req.body;
    
    // التأكد من وجود رسالة
    if (!update.message || !update.message.text) {
      return res.status(200).json({ ok: true });
    }

    const chatId = update.message.chat.id;
    const text = update.message.text.trim();

    console.log(`📨 رسالة جديدة من ${chatId}: ${text.substring(0, 50)}...`);

    // معالجة الأوامر
    await handleMessage(chatId, text);

    return res.status(200).json({ ok: true });

  } catch (error) {
    console.error("❌ خطأ في Webhook:", error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// دالة معالجة الرسائل
async function handleMessage(chatId, text) {
  try {
    // أمر البداية
    if (text === '/start') {
      const welcomeMessage = `
🎬 *بوت تحميل فيديوهات Facebook*

مرحباً بك! 👋

✨ *مميزات البوت:*
• تحميل فيديوهات Facebook مباشرة
• جودة عالية HD
• سريع وسهل الاستخدام
• مجاني تماماً

📋 *كيفية الاستخدام:*
1. أرسل رابط الفيديو من Facebook
2. انتظر قليلاً
3. احصل على الفيديو!

🌐 *أمثلة للروابط المدعومة:*
• https://fb.watch/xxxxx/
• https://www.facebook.com/watch/?v=xxxx
• https://www.facebook.com/reel/xxxx
• https://fb.com/xxx/videos/xxx

⚠️ *ملاحظات مهمة:*
• يجب أن يكون الفيديو عاماً (ليس خاصاً)
• بعض الفيديوهات قد لا تعمل
• الحد الأقصى 50MB (حدود Telegram)

🚀 *أرسل رابط الآن وابدأ التحميل!*
      `;

      await bot.sendMessage(chatId, welcomeMessage, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [
              { text: '📱 دعم فني', url: 'https://t.me/hmoamin' },
              { text: '⭐ تقييم البوت', callback_data: 'rate' }
            ],
            [
              { text: '🔄 تحميل مثال', callback_data: 'example' }
            ]
          ]
        }
      });
      return;
    }

    // أمر المساعدة
    if (text === '/help') {
      await bot.sendMessage(chatId,
        `❓ *مساعدة*\n\n` +
        `*مشاكل شائعة:*\n` +
        `🔸 الفيديو لا يتحمل: تأكد أنه عام\n` +
        `🔸 خطأ في الرابط: تحقق من الرابط\n` +
        `🔸 حجم كبير: بعض الفيديوهات >50MB\n\n` +
        `*حلول سريعة:*\n` +
        `✅ جرب رابط فيديو آخر\n` +
        `✅ تأكد أن الفيديو عام\n` +
        `✅ أعد المحاولة بعد دقيقة\n\n` +
        `*للاتصال:* @hmoamin`,
        { parse_mode: 'Markdown' }
      );
      return;
    }

    // إذا كان رابط فيسبوك
    if (isFacebookUrl(text)) {
      await processFacebookVideo(chatId, text);
      return;
    }

    // أي نص آخر
    await bot.sendMessage(chatId,
      `❓ *لم أفهم طلبك*\n\n` +
      `أنا أفهم فقط:\n` +
      `• روابط فيديو Facebook\n` +
      `• /start - بدء البوت\n` +
      `• /help - المساعدة\n\n` +
      `🎬 *مثال:*\n` +
      `\`https://fb.watch/kdD7X4lJhP/\``,
      { parse_mode: 'Markdown' }
    );

  } catch (error) {
    console.error(`❌ خطأ في معالجة الرسالة:`, error);
    await bot.sendMessage(chatId,
      '❌ حدث خطأ غير متوقع\nالرجاء المحاولة مرة أخرى.',
      { parse_mode: 'Markdown' }
    );
  }
}

// التحقق من رابط فيسبوك
function isFacebookUrl(url) {
  const patterns = [
    /facebook\.com\/.*\/video(s)?\//i,
    /fb\.watch\//i,
    /facebook\.com\/watch\//i,
    /facebook\.com\/reel\//i,
    /fb\.com\/.*\/video(s)?\//i
  ];
  
  return patterns.some(pattern => pattern.test(url));
}

// معالجة فيديو فيسبوك
async function processFacebookVideo(chatId, url) {
  try {
    // إرسال رسالة الانتظار
    const waitMsg = await bot.sendMessage(chatId,
      '🔍 *جاري البحث عن الفيديو...*\n' +
      '⏳ قد يستغرق 10-30 ثانية\n' +
      '________________\n' +
      '📊 *الحالة:* تحليل الرابط',
      { parse_mode: 'Markdown' }
    );

    // تحديث الحالة
    await bot.editMessageText(
      '🔍 *جاري البحث عن الفيديو...*\n' +
      '⏳ قد يستغرق 10-30 ثانية\n' +
      '________________\n' +
      '📊 *الحالة:* استخراج البيانات',
      {
        chat_id: chatId,
        message_id: waitMsg.message_id,
        parse_mode: 'Markdown'
      }
    );

    // محاولة استخراج الفيديو باستخدام API العام
    const videoResult = await extractFacebookVideo(url);

    if (!videoResult.success) {
      await bot.editMessageText(
        `❌ *فشل في التحميل*\n\n` +
        `🔍 *السبب:* ${videoResult.error}\n\n` +
        `💡 *اقتراحات:*\n` +
        `• تأكد أن الفيديو عام\n` +
        `• جرب رابط فيديو آخر\n` +
        `• إذا كان خاصاً لا يمكن تحميله`,
        {
          chat_id: chatId,
          message_id: waitMsg.message_id,
          parse_mode: 'Markdown'
        }
      );
      return;
    }

    // تحديث الحالة
    await bot.editMessageText(
      '✅ *تم العثور على الفيديو!*\n' +
      '📤 جاري التحميل والإرسال...\n' +
      '________________\n' +
      '📊 *الحالة:* إعداد الفيديو للإرسال',
      {
        chat_id: chatId,
        message_id: waitMsg.message_id,
        parse_mode: 'Markdown'
      }
    );

    // إعداد الكابشن
    const caption = `🎬 *فيديو Facebook*\n` +
                   `📏 *الجودة:* ${videoResult.quality || 'عالية'}\n` +
                   `📊 *الحجم:* ${videoResult.size || 'غير معروف'}\n\n` +
                   `🔗 [رابط الفيديو](${url})`;

    // إرسال الفيديو
    try {
      await bot.sendVideo(chatId, videoResult.url, {
        caption: caption,
        parse_mode: 'Markdown',
        supports_streaming: true
      });

      // حذف رسالة الانتظار
      await bot.deleteMessage(chatId, waitMsg.message_id);

      // إرسال رسالة نجاح
      await bot.sendMessage(chatId,
        '✨ *تم التحميل بنجاح!*\n\n' +
        '✅ الفيديو وصل إليك\n' +
        '💾 يمكنك حفظه الآن\n' +
        '🎬 استمتع بالمشاهدة!\n\n' +
        '🔄 لإرسال فيديو آخر، أرسل الرابط مباشرة',
        { parse_mode: 'Markdown' }
      );

    } catch (sendError) {
      // إذا فشل إرسال الفيديو
      console.error('❌ خطأ في إرسال الفيديو:', sendError);

      if (sendError.message.includes('too big') || sendError.message.includes('50MB')) {
        await bot.editMessageText(
          `📦 *حجم الفيديو كبير جداً*\n\n` +
          `⚠️ حجم الفيديو يتجاوز 50MB (حدود Telegram)\n\n` +
          `💡 *الحلول:*\n` +
          `1. استخدم تطبيق تحميل من المتصفح\n` +
          `2. جرب فيديو أصغر حجماً\n` +
          `3. استخدم مواقع تحميل خارجية\n\n` +
          `🔗 *رابط الفيديو:*\n\`${url}\``,
          {
            chat_id: chatId,
            message_id: waitMsg.message_id,
            parse_mode: 'Markdown'
          }
        );
      } else {
        await bot.editMessageText(
          `❌ *خطأ في الإرسال*\n\n` +
          `🔍 الخطأ: ${sendError.message}\n\n` +
          `💡 *جرب هذه الطريقة:*\n` +
          `1. افتح هذا الرابط في المتصفح:\n` +
          `\`${videoResult.url}\`\n` +
          `2. اضغط مع الاستمرار على الفيديو\n` +
          `3. اختر "حفظ الفيديو"`,
          {
            chat_id: chatId,
            message_id: waitMsg.message_id,
            parse_mode: 'Markdown'
          }
        );
      }
    }

  } catch (error) {
    console.error('❌ خطأ في processFacebookVideo:', error);
    
    try {
      await bot.sendMessage(chatId,
        '❌ *حدث خطأ غير متوقع*\n\n' +
        'الخدمة غير متوفرة حالياً.\n' +
        'الرجاء المحاولة مرة أخرى لاحقاً.',
        { parse_mode: 'Markdown' }
      );
    } catch (e) {
      console.error('❌ حتى إرسال رسالة الخطأ فشل:', e);
    }
  }
}

// دالة استخراج الفيديو باستخدام API موثوق
async function extractFacebookVideo(url) {
  try {
    console.log(`🔍 محاولة استخراج: ${url}`);
    
    // API 1: FBDown
    try {
      const response = await axios.get(`https://fbdown.net/download.php`, {
        params: { url: url },
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        timeout: 15000
      });
      
      const $ = cheerio.load(response.data);
      
      // البحث عن روابط التحميل
      const downloadLinks = [];
      $('a[href*="fbdown.net/download"]').each((i, elem) => {
        const href = $(elem).attr('href');
        const text = $(elem).text().toLowerCase();
        
        if (href && !href.includes('facebook.com') && !href.includes('javascript')) {
          downloadLinks.push({
            url: href,
            quality: text.includes('hd') ? 'HD' : 
                   text.includes('sd') ? 'SD' : 
                   text.includes('360') ? '360p' : 'غير معروف'
          });
        }
      });
      
      if (downloadLinks.length > 0) {
        return {
          success: true,
          url: downloadLinks[0].url,
          quality: downloadLinks[0].quality,
          size: 'غير معروف',
          source: 'fbdown.net'
        };
      }
    } catch (error) {
      console.log('❌ فشل API 1:', error.message);
    }
    
    // API 2: GetFBVideo
    try {
      const response = await axios.post('https://getfbvideo.com/api/v1/fetch', {
        url: url
      }, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0'
        },
        timeout: 10000
      });
      
      if (response.data && response.data.links && response.data.links.length > 0) {
        const hdLink = response.data.links.find(l => l.quality === 'HD') || response.data.links[0];
        return {
          success: true,
          url: hdLink.url,
          quality: hdLink.quality,
          size: hdLink.size || 'غير معروف',
          source: 'getfbvideo.com'
        };
      }
    } catch (error) {
      console.log('❌ فشل API 2:', error.message);
    }
    
    // API 3: SaveFrom
    try {
      const response = await axios.get('https://api.savefrom.net/service/facebook/video/info', {
        params: { url: url },
        timeout: 10000
      });
      
      if (response.data && response.data.video && response.data.video.url) {
        return {
          success: true,
          url: response.data.video.url,
          quality: response.data.video.quality || 'غير معروف',
          size: response.data.video.size || 'غير معروف',
          source: 'savefrom.net'
        };
      }
    } catch (error) {
      console.log('❌ فشل API 3:', error.message);
    }
    
    return {
      success: false,
      error: 'لا يمكن الوصول إلى الفيديو',
      message: 'قد يكون الفيديو خاصاً أو محمياً'
    };
    
  } catch (error) {
    console.error('❌ خطأ في extractFacebookVideo:', error);
    return {
      success: false,
      error: 'خطأ في الخادم',
      message: 'حاول مرة أخرى لاحقاً'
    };
  }
}

// معالجة Callback Queries
bot.on('callback_query', async (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;
  
  try {
    await bot.answerCallbackQuery(callbackQuery.id);
    
    if (data === 'rate') {
      await bot.sendMessage(chatId,
        '⭐ *تقييم البوت*\n\n' +
        'شكراً لاهتمامك بتقييم البوت!\n\n' +
        'يمكنك تقييمه عبر:\n' +
        '• مشاركته مع الأصدقاء\n' +
        '• إرسال اقتراحات للتطوير\n' +
        '• الإبلاغ عن المشاكل\n\n' +
        '📱 للتواصل: @hmoamin',
        { parse_mode: 'Markdown' }
      );
    }
    
    if (data === 'example') {
      await bot.sendMessage(chatId,
        '🔄 *مثال للرابط:*\n\n' +
        'يمكنك تجربة هذا الرابط:\n' +
        '`https://fb.watch/kdD7X4lJhP/`\n\n' +
        'أو أي رابط فيديو Facebook آخر',
        { parse_mode: 'Markdown' }
      );
    }
    
  } catch (error) {
    console.error('❌ خطأ في callback_query:', error);
  }
});
