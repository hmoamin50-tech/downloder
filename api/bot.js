const TelegramBot = require('node-telegram-bot-api');
const { extractFacebookVideo } = require('./facebook');

// التوكن - تأكد أنه نفسه الموجود في Vercel
const BOT_TOKEN = process.env.BOT_TOKEN || '8556372174:AAFSN2WOWTw_7o8--NlALO2GO-mUf5Pgnf0';

console.log('🤖 Starting bot with token:', BOT_TOKEN ? 'Present' : 'Missing');

// 1. إنشاء البوت مع خيارات Webhook
const bot = new TelegramBot(BOT_TOKEN, {
  webHook: {
    host: '0.0.0.0',
    port: process.env.PORT || 3000
  },
  onlyFirstMatch: true
});

// 2. تعيين Webhook تلقائياً
bot.setWebHook(`https://downloder-three.vercel.app/api/bot`)
  .then(() => console.log('✅ Webhook set successfully'))
  .catch(err => console.error('❌ Webhook error:', err.message));

// 3. الأمر /start
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  console.log(`👋 /start from ${chatId}`);
  
  try {
    const response = await bot.sendMessage(chatId,
      '🎬 *مرحباً بك في بوت تحميل فيديوهات Facebook!*\n\n' +
      '📥 *كيفية الاستخدام:*\n' +
      '1. أرسل رابط فيديو Facebook\n' +
      '2. أنتظر قليلاً\n' +
      '3. سأرسل لك الفيديو مباشرة\n\n' +
      '🔗 *أمثلة على الروابط:*\n' +
      '• https://www.facebook.com/.../videos/...\n' +
      '• https://fb.watch/...\n' +
      '• https://m.facebook.com/.../videos/...\n\n' +
      '🚀 *جرب الآن! أرسل رابط فيديو*',
      { parse_mode: 'Markdown' }
    );
    
    console.log(`✅ /start reply sent to ${chatId}, message ID: ${response.message_id}`);
  } catch (error) {
    console.error(`❌ Error in /start for ${chatId}:`, error.message);
  }
});

// 4. معالجة روابط Facebook
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text || '';
  const messageId = msg.message_id;

  console.log(`📨 Message from ${chatId}: "${text.substring(0, 50)}"`);

  // تجاهل الرسائل غير النصية والأوامر
  if (!text || text.startsWith('/')) return;

  // البحث عن رابط Facebook
  const facebookRegex = /(?:https?:\/\/)?(?:www\.|m\.)?(?:facebook\.com|fb\.watch)\/[^\s]+/;
  const match = text.match(facebookRegex);
  
  if (!match) {
    try {
      await bot.sendMessage(chatId,
        '📎 يرجى إرسال رابط فيديو Facebook فقط.\n\n' +
        'مثال:\nhttps://www.facebook.com/.../videos/...',
        { reply_to_message_id: messageId }
      );
    } catch (error) {
      console.error('Error sending help message:', error.message);
    }
    return;
  }

  const facebookUrl = match[0];
  console.log(`🔗 Processing Facebook URL: ${facebookUrl}`);
  
  try {
    // إرسال رسالة الانتظار
    const processingMsg = await bot.sendMessage(chatId, '🔄 جاري تحليل الرابط واستخراج الفيديو...', {
      reply_to_message_id: messageId
    });

    // استخراج الفيديو
    const videoInfo = await extractFacebookVideo(facebookUrl);
    
    if (videoInfo.success && videoInfo.videoUrl) {
      console.log(`✅ Found video: ${videoInfo.videoUrl.substring(0, 100)}...`);
      
      // تحديث رسالة الانتظار
      await bot.editMessageText('✅ تم العثور على الفيديو! جاري الإرسال...', {
        chat_id: chatId,
        message_id: processingMsg.message_id
      });

      // إرسال الفيديو
      const caption = `📹 ${videoInfo.title || 'فيديو Facebook'}\n\n` +
                     `📊 الجودة: ${videoInfo.quality || 'متوسطة'}`;
      
      await bot.sendVideo(chatId, videoInfo.videoUrl, {
        caption: caption,
        reply_to_message_id: messageId,
        supports_streaming: true
      });
      
      // حذف رسالة الانتظار
      await bot.deleteMessage(chatId, processingMsg.message_id);
      
    } else {
      await bot.editMessageText(
        `❌ لم أتمكن من استخراج الفيديو.\n\n` +
        `الخطأ: ${videoInfo.error || 'غير معروف'}\n\n` +
        `💡 حاول:\n` +
        `1. رابط فيديو آخر\n` +
        `2. التأكد أن الفيديو عام\n` +
        `3. نسخ الرابط من المتصفح`,
        {
          chat_id: chatId,
          message_id: processingMsg.message_id
        }
      );
    }
    
  } catch (error) {
    console.error(`❌ Error processing video for ${chatId}:`, error.message);
    
    try {
      await bot.sendMessage(chatId,
        '❌ حدث خطأ أثناء معالجة الفيديو.\n\n' +
        'يرجى المحاولة برابط آخر.',
        { reply_to_message_id: messageId }
      );
    } catch (sendError) {
      console.error('Error sending error message:', sendError.message);
    }
  }
});

// 5. معالجة الأخطاء
bot.on('polling_error', (error) => console.error('Polling error:', error.message));
bot.on('webhook_error', (error) => console.error('Webhook error:', error.message));

// 6. معالج Vercel
module.exports = async (req, res) => {
  console.log(`🌐 ${req.method} request to ${req.url}`);
  
  try {
    if (req.method === 'POST') {
      const update = req.body;
      console.log(`📦 Update ${update.update_id} from ${update.message?.from?.username || 'unknown'}`);
      
      // معالجة التحديث
      await bot.processUpdate(update);
      
      return res.status(200).json({ 
        ok: true,
        message: 'Update processed successfully'
      });
    }
    
    // GET request - صفحة ويب
    res.send(`
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Facebook Video Bot</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          text-align: center;
          padding: 50px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        .container {
          background: rgba(255, 255, 255, 0.1);
          padding: 40px;
          border-radius: 20px;
          backdrop-filter: blur(10px);
          max-width: 600px;
          margin: 0 auto;
        }
        .status {
          background: green;
          color: white;
          padding: 15px;
          border-radius: 10px;
          margin: 20px 0;
          font-size: 1.2rem;
        }
        .instructions {
          text-align: right;
          margin: 20px 0;
          padding: 20px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 10px;
        }
        .btn {
          display: inline-block;
          background: white;
          color: #667eea;
          padding: 15px 30px;
          border-radius: 10px;
          text-decoration: none;
          margin: 10px;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🤖 Facebook Video Bot</h1>
        <div class="status">✅ البوت يعمل بنجاح</div>
        <p>أرسل رابط فيديو Facebook للبوت وسيقوم بتحميله لك</p>
        
        <div class="instructions">
          <h3>📋 طريقة الاستخدام:</h3>
          <ol>
            <li>افتح البوت على Telegram</li>
            <li>أرسل رابط فيديو Facebook</li>
            <li>انتظر قليلاً حتى تتم المعالجة</li>
            <li>استلم الفيديو مباشرة</li>
          </ol>
        </div>
        
        <a href="https://t.me/downloderthree_bot" class="btn" target="_blank">🤖 فتح البوت</a>
        <a href="https://api.telegram.org/bot8556372174:AAFSN2WOWTw_7o8--NlALO2GO-mUf5Pgnf0/getWebhookInfo" 
           class="btn" target="_blank">🔧 حالة Webhook</a>
      </div>
    </body>
    </html>
    `);
    
  } catch (error) {
    console.error('❌ Handler error:', error);
    res.status(500).json({ error: error.message });
  }
};
