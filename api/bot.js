import TelegramBot from "node-telegram-bot-api";
import axios from "axios";
import FormData from "form-data";

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: false });

// استخدم هذه الـ APIs لتحميل فيديوهات Facebook
const DOWNLOAD_APIS = [
  {
    name: "tikmate",
    url: "https://tikmate.app/api/ajaxSearch",
    method: "POST",
    getVideoUrl: (data) => {
      if (data.links && data.links.length > 0) {
        // البحث عن أعلى جودة
        const hdVideo = data.links.find(link => link.quality === "HD");
        return hdVideo ? hdVideo.url : data.links[0].url;
      }
      return null;
    }
  },
  {
    name: "snapsave",
    url: "https://snapsave.app/action.php",
    method: "POST",
    getVideoUrl: (data) => {
      if (data.links && data.links.length > 0) {
        return data.links[0].url;
      }
      return null;
    }
  },
  {
    name: "yt5s",
    url: "https://yt5s.com/api/ajaxSearch",
    method: "POST",
    getVideoUrl: (data) => {
      if (data.video && data.video.length > 0) {
        return data.video[0].url;
      }
      return null;
    }
  }
];

// دالة لاستخراج الفيديو باستخدام API
async function extractVideoWithAPI(facebookUrl) {
  console.log(`🔍 محاولة استخراج الفيديو: ${facebookUrl}`);
  
  // تجربة جميع الـ APIs المتاحة
  for (const api of DOWNLOAD_APIS) {
    try {
      console.log(`🔄 جرب API: ${api.name}`);
      
      let response;
      
      if (api.method === "POST") {
        const formData = new FormData();
        formData.append('url', facebookUrl);
        
        response = await axios.post(api.url, formData, {
          headers: {
            ...formData.getHeaders(),
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Origin': 'https://yt5s.com',
            'Referer': 'https://yt5s.com/'
          },
          timeout: 15000
        });
      } else {
        response = await axios.get(api.url, {
          params: { url: facebookUrl },
          timeout: 15000
        });
      }
      
      const videoUrl = api.getVideoUrl(response.data);
      
      if (videoUrl) {
        console.log(`✅ تم العثور على الفيديو باستخدام ${api.name}`);
        return {
          success: true,
          videoUrl: videoUrl,
          source: api.name,
          message: "تم استخراج الفيديو بنجاح"
        };
      }
      
    } catch (error) {
      console.log(`❌ فشل API ${api.name}:`, error.message);
      continue;
    }
  }
  
  // إذا فشلت جميع الـ APIs، نجرب طريقة ثانية
  return await tryAlternativeAPIs(facebookUrl);
}

// طريقة بديلة باستخدام APIs أخرى
async function tryAlternativeAPIs(facebookUrl) {
  console.log("🔄 جرب طريقة بديلة...");
  
  const alternativeAPIs = [
    {
      url: "https://api.fbdown.net/download",
      params: { url: facebookUrl }
    },
    {
      url: "https://getvideo.p.rapidapi.com/",
      params: { url: facebookUrl },
      headers: {
        'X-RapidAPI-Key': 'your-rapidapi-key', // تحتاج للحصول على مفتاح
        'X-RapidAPI-Host': 'getvideo.p.rapidapi.com'
      }
    }
  ];
  
  for (const api of alternativeAPIs) {
    try {
      const response = await axios.get(api.url, {
        params: api.params,
        headers: api.headers || {},
        timeout: 10000
      });
      
      if (response.data && response.data.links) {
        const videoUrl = response.data.links.find(link => link.quality === "HD")?.url || 
                         response.data.links[0]?.url;
        
        if (videoUrl) {
          return {
            success: true,
            videoUrl: videoUrl,
            source: "alternative",
            message: "تم الاستخراج عبر API بديل"
          };
        }
      }
    } catch (error) {
      console.log(`❌ فشل API البديل:`, error.message);
    }
  }
  
  // إذا فشل كل شيء، نستخدم طريقة محاكاة المتصفح
  return await simulateBrowserExtraction(facebookUrl);
}

// محاكاة المتصفح لاستخراج الفيديو
async function simulateBrowserExtraction(facebookUrl) {
  try {
    console.log("🌐 محاكاة المتصفح...");
    
    const response = await axios.get(facebookUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0'
      },
      timeout: 15000
    });
    
    const html = response.data;
    
    // البحث عن رابط الفيديو في الـ HTML
    const videoRegex = /(?:src|href)=["'](https?:\/\/[^"']*\.(?:mp4|mov|avi|webm)[^"']*)["']/gi;
    const matches = html.match(videoRegex);
    
    if (matches) {
      for (const match of matches) {
        const url = match.replace(/(src|href)=["']|["']/g, '');
        if (url.includes('video') || url.includes('fbcdn.net')) {
          return {
            success: true,
            videoUrl: url,
            source: "browser",
            message: "تم الاستخراج عبر محاكاة المتصفح"
          };
        }
      }
    }
    
    // البحث عن og:video meta tag
    const ogVideoRegex = /<meta[^>]*property=["']og:video["'][^>]*content=["']([^"']+)["'][^>]*>/i;
    const ogMatch = html.match(ogVideoRegex);
    
    if (ogMatch && ogMatch[1]) {
      return {
        success: true,
        videoUrl: ogMatch[1],
        source: "meta_tag",
        message: "تم الاستخراج من meta tags"
      };
    }
    
  } catch (error) {
    console.log("❌ فشل محاكاة المتصفح:", error.message);
  }
  
  return {
    success: false,
    error: "لم أتمكن من استخراج الفيديو",
    message: "الرجاء التأكد من أن الفيديو عام وليس خاص"
  };
}

// إرسال الفيديو عبر Telegram
async function sendVideoToTelegram(chatId, videoUrl, caption = "🎬 تم التحميل بنجاح!") {
  try {
    console.log(`📤 إرسال الفيديو إلى ${chatId}...`);
    
    // إرسال الفيديو مباشرة
    await bot.sendVideo(chatId, videoUrl, {
      caption: caption,
      supports_streaming: true,
      parse_mode: 'Markdown'
    });
    
    return { success: true };
    
  } catch (error) {
    console.error("❌ خطأ في إرسال الفيديو:", error.message);
    
    // إذا كان الخطأ بسبب حجم الفيديو
    if (error.message.includes('file is too big')) {
      return {
        success: false,
        error: "حجم الفيديو كبير جداً",
        message: "الفيديو يتجاوز الحد المسموح به في Telegram (50MB)"
      };
    }
    
    // إذا كان الخطأ بسبب نوع الملف
    if (error.message.includes('wrong file format')) {
      return {
        success: false,
        error: "تنسيق غير مدعوم",
        message: "تنسيق الفيديو غير مدعوم من قبل Telegram"
      };
    }
    
    return {
      success: false,
      error: error.message,
      message: "فشل في إرسال الفيديو"
    };
  }
}

// Webhook Handler
export default async function handler(req, res) {
  // الرد على GET requests
  if (req.method === 'GET') {
    return res.status(200).json({
      status: '🚀 البوت يعمل بنجاح',
      instructions: 'أرسل رابط فيديو Facebook إلى البوت'
    });
  }
  
  try {
    const update = req.body;
    
    if (!update.message || !update.message.text) {
      return res.status(200).json({ ok: true });
    }
    
    const chatId = update.message.chat.id;
    const text = update.message.text.trim();
    
    console.log(`📨 رسالة من ${chatId}: ${text.substring(0, 50)}...`);
    
    // أمر /start
    if (text === '/start') {
      const welcomeMessage = `
🤖 *بوت تحميل فيديوهات Facebook* 🎬

*مرحباً بك!* 👋

✨ *المميزات:*
✅ تحميل مباشر في المحادثة
✅ جودة عالية HD
✅ سريع وسهل الاستخدام
✅ لا حاجة لروابط خارجية

📋 *طريقة الاستخدام:*
1. أرسل رابط الفيديو
2. انتظر قليلاً (5-20 ثانية)
3. احصل على الفيديو مباشرة!

🌐 *أمثلة للروابط:*
• https://fb.watch/...
• https://facebook.com/watch/?v=...
• https://facebook.com/reel/...
• https://facebook.com/.../videos/...

⚠️ *ملاحظة:* يجب أن يكون الفيديو عاماً

🚀 *أرسل رابط الآن!*
      `;
      
      await bot.sendMessage(chatId, welcomeMessage, {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: '📱 قناة المطور', url: 'https://t.me/hmoamin' },
            { text: '⭐ دعم البوت', callback_data: 'support' }
          ]]
        }
      });
    }
    
    // أمر /help
    else if (text === '/help') {
      await bot.sendMessage(chatId, 
        `❓ *مساعدة*\n\n` +
        `*مشكلة في التحميل؟*\n` +
        `1. تأكد أن الفيديو عام\n` +
        `2. جرب رابط آخر\n` +
        `3. أعد المحاولة بعد قليل\n\n` +
        `*للاتصال بالمطور:*\n@hmoamin`,
        { parse_mode: 'Markdown' }
      );
    }
    
    // إذا كان رابط Facebook
    else if (text.includes('facebook.com') || text.includes('fb.watch')) {
      try {
        // إرسال رسالة الانتظار
        const waitMsg = await bot.sendMessage(chatId, 
          '🔍 *جاري معالجة طلبك...*\n' +
          '⏳ قد يستغرق 10-20 ثانية',
          { parse_mode: 'Markdown' }
        );
        
        // استخراج الفيديو
        const videoResult = await extractVideoWithAPI(text);
        
        if (videoResult.success) {
          // تحديث رسالة الانتظار
          await bot.editMessageText('✅ *تم العثور على الفيديو!*\n📤 جاري الإرسال...', {
            chat_id: chatId,
            message_id: waitMsg.message_id,
            parse_mode: 'Markdown'
          });
          
          // إعداد التسمية التوضيحية
          const caption = `🎬 *فيديو Facebook*\n` +
                         `📊 *المصدر:* ${videoResult.source}\n` +
                         `✅ ${videoResult.message}\n\n` +
                         `🔗 *الرابط الأصلي:*\n${text.substring(0, 50)}...`;
          
          // إرسال الفيديو
          const sendResult = await sendVideoToTelegram(chatId, videoResult.videoUrl, caption);
          
          if (sendResult.success) {
            // حذف رسالة الانتظار
            await bot.deleteMessage(chatId, waitMsg.message_id);
            
            // إرسال رسالة نجاح
            await bot.sendMessage(chatId, 
              '✨ *تمت العملية بنجاح!*\n\n' +
              '✅ الفيديو وصل إليك\n' +
              '📁 يمكنك حفظه في جهازك\n' +
              '🎬 استمتع بالمشاهدة!',
              { parse_mode: 'Markdown' }
            );
            
          } else {
            // إذا فشل إرسال الفيديو
            await bot.editMessageText(
              `❌ *${sendResult.error}*\n\n` +
              `📥 *رابط التحميل المباشر:*\n${videoResult.videoUrl}\n\n` +
              `*طريقة التحميل:*\n` +
              `1. اضغط على الرابط أعلاه\n` +
              `2. اضغط مع الاستمرار\n` +
              `3. اختر "حفظ الفيديو"`,
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
            `❌ *${videoResult.error}*\n\n` +
            `🔍 *الأسباب المحتملة:*\n` +
            `1. الفيديو خاص أو محمي\n` +
            `2. الرابط غير صحيح\n` +
            `3. مشكلة في الخدمة\n\n` +
            `💡 *الحلول:*\n` +
            `• تأكد أن الفيديو عام\n` +
            `• جرب رابط فيديو آخر\n` +
            `• أعد المحاولة بعد قليل`,
            {
              chat_id: chatId,
              message_id: waitMsg.message_id,
              parse_mode: 'Markdown'
            }
          );
        }
        
      } catch (error) {
        console.error("❌ خطأ في معالجة الطلب:", error);
        await bot.sendMessage(chatId,
          '❌ *حدث خطأ غير متوقع*\n\n' +
          'الرجاء المحاولة مرة أخرى أو تجربة رابط آخر.',
          { parse_mode: 'Markdown' }
        );
      }
    }
    
    // إذا كان نصاً عادياً
    else if (text && !text.startsWith('/')) {
      await bot.sendMessage(chatId,
        `📎 *لم أتعرف على طلبك*\n\n` +
        `⚠️ *أنا أفهم فقط:*\n` +
        `• روابط فيديو Facebook\n` +
        `• /start - بدء البوت\n` +
        `• /help - المساعدة\n\n` +
        `🎬 *مثال على رابط:*\n` +
        `https://www.facebook.com/watch/?v=123456`,
        { parse_mode: 'Markdown' }
      );
    }
    
    return res.status(200).json({ ok: true });
    
  } catch (error) {
    console.error("❌ Webhook error:", error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// معالجة callback queries
bot.on('callback_query', async (callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const data = callbackQuery.data;
  
  if (data === 'support') {
    await bot.sendMessage(chatId,
      '💬 *دعم البوت*\n\n' +
      'للدعم الفني أو الاستفسارات:\n' +
      '📱 @hmoamin\n\n' +
      '🌟 إذا أعجبك البوت، شاركه مع أصدقائك!',
      { parse_mode: 'Markdown' }
    );
  }
});
