const TelegramBot = require('node-telegram-bot-api');

// الحصول على التوكن من متغيرات البيئة
const BOT_TOKEN = process.env.BOT_TOKEN || process.env.BOT_TOKEN;

// التحقق من وجود التوكن
if (!BOT_TOKEN) {
  console.error('❌ ERROR: Telegram Bot Token is missing!');
  console.error('Please set TELEGRAM_BOT_TOKEN or BOT_TOKEN environment variable');
  
  // سنسمح للكود بالاستمرار ولكن سنعالج الأخطاء بشكل أفضل
}

// تهيئة البوت (مع معالجة الأخطاء)
let bot;
try {
  bot = new TelegramBot(BOT_TOKEN, {
    webHook: false,
    polling: false
  });
  
  console.log('✅ Bot initialized successfully');
} catch (error) {
  console.error('❌ Error initializing bot:', error.message);
  // سنتعامل مع هذا في middleware
}

// Middleware للتحقق من البوت
function requireBot(req, res, next) {
  if (!bot) {
    console.error('Bot not available - returning error');
    return res.status(500).json({ 
      error: 'Bot initialization failed',
      message: 'Telegram Bot Token is not configured'
    });
  }
  next();
}

// الأمر /start
if (bot) {
  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    
    try {
      await bot.sendMessage(chatId, 
        '🎬 *مرحباً بك في بوت تحميل فيديوهات الفيسبوك!*\n\n' +
        '📥 *كيفية الاستخدام:*\n' +
        '1. أرسل لي رابط فيديو من Facebook\n' +
        '2. انتظر بضع ثوانٍ\n' +
        '3. سأرسل لك الفيديو جاهزاً للتحميل\n\n' +
        '🔗 *مثال:*\n' +
        'https://www.facebook.com/.../videos/...\n\n' +
        '🚀 *جرب الآن!*',
        { parse_mode: 'Markdown' }
      );
    } catch (error) {
      console.error('Error in /start:', error.message);
    }
  });

  // معالجة رسائل المستخدم
  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    const messageId = msg.message_id;

    // تجاهل الأوامر والرسائل غير النصية
    if (!text || text.startsWith('/')) return;

    // البحث عن رابط Facebook
    const facebookRegex = /(?:https?:\/\/)?(?:www\.|m\.)?(?:facebook\.com|fb\.watch)\/(?:[^\s]+)/;
    const match = text.match(facebookRegex);
    
    if (match) {
      const facebookUrl = match[0];
      
      try {
        // إرسال رسالة الانتظار
        const processingMsg = await bot.sendMessage(chatId, '🔄 جاري تحليل الرابط...', {
          reply_to_message_id: messageId
        });

        // هنا سيتم إضافة استخراج الفيديو لاحقاً
        // مؤقتاً نرسل رسالة تجريبية
        setTimeout(async () => {
          try {
            await bot.editMessageText('✅ هذا مجرد اختبار. البوت يعمل!\n\nسيتم إضافة استخراج الفيديو قريباً.', {
              chat_id: chatId,
              message_id: processingMsg.message_id
            });
          } catch (e) {
            console.error('Error editing message:', e.message);
          }
        }, 1000);
        
      } catch (error) {
        console.error('Error processing message:', error.message);
      }
      
    } else {
      // إذا لم يكن رابط Facebook
      try {
        await bot.sendMessage(chatId, 
          '📎 يرجى إرسال رابط فيديو Facebook فقط.\n\n' +
          '🔗 مثال:\n' +
          'https://www.facebook.com/.../videos/...',
          { reply_to_message_id: messageId }
        );
      } catch (error) {
        console.error('Error sending message:', error.message);
      }
    }
  });

  // معالجة الأخطاء
  bot.on('polling_error', (error) => {
    console.error('Polling error:', error);
  });
}

// Handler لـ Vercel
module.exports = async (req, res) => {
  try {
    // سجل الطلب الوارد
    console.log('📨 Received request:', {
      method: req.method,
      path: req.url,
      body: req.body ? 'Body exists' : 'No body'
    });

    if (req.method === 'POST') {
      // التحقق من وجود البوت
      if (!bot) {
        console.error('Bot not available - returning error');
        return res.status(500).json({ 
          error: 'Bot initialization failed',
          message: 'Please check environment variables',
          timestamp: new Date().toISOString()
        });
      }

      // معالجة webhook من Telegram
      const update = req.body;
      console.log('Update received:', update.update_id);

      await bot.processUpdate(update);
      return res.status(200).json({ 
        ok: true,
        message: 'Update processed',
        timestamp: new Date().toISOString()
      });
    }
    
    // GET request - عرض رسالة أن البوت يعمل
    const html = `
      <!DOCTYPE html>
      <html>
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
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
          }
          .container {
            background: rgba(255, 255, 255, 0.1);
            padding: 40px;
            border-radius: 20px;
            backdrop-filter: blur(10px);
            max-width: 800px;
            width: 100%;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          }
          .status {
            background: ${bot ? 'green' : 'red'};
            color: white;
            padding: 15px;
            border-radius: 10px;
            display: inline-block;
            margin: 20px 0;
            font-size: 1.2rem;
            font-weight: bold;
          }
          .env-info {
            background: rgba(255, 255, 255, 0.2);
            padding: 20px;
            border-radius: 10px;
            margin: 20px 0;
            text-align: left;
            font-family: monospace;
          }
          .instructions {
            text-align: left;
            margin: 20px 0;
            padding: 20px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
          }
          code {
            background: rgba(0, 0, 0, 0.3);
            padding: 2px 5px;
            border-radius: 3px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🤖 Facebook Video Bot</h1>
          
          <div class="status">
            ${bot ? '✅ البوت يعمل بشكل طبيعي' : '❌ البوت غير متوفر - مشكلة في التوكن'}
          </div>
          
          <div class="env-info">
            <h3>🔧 معلومات التهيئة:</h3>
            <p><strong>Bot Token:</strong> ${BOT_TOKEN ? '✅ موجود' : '❌ مفقود'}</p>
            <p><strong>Bot Initialized:</strong> ${bot ? '✅ نعم' : '❌ لا'}</p>
            <p><strong>Node Environment:</strong> ${process.env.NODE_ENV || 'غير محدد'}</p>
            <p><strong>Timestamp:</strong> ${new Date().toLocaleString()}</p>
          </div>
          
          ${!BOT_TOKEN ? `
          <div class="instructions" style="background: rgba(255, 0, 0, 0.1); border: 2px solid red;">
            <h3>⚠️ خطأ: توكن البوت مفقود!</h3>
            <p>لإصلاح المشكلة:</p>
            <ol>
              <li>اذهب إلى <a href="https://vercel.com/dashboard" style="color: white; text-decoration: underline;">Vercel Dashboard</a></li>
              <li>اختر مشروع <strong>downloder-three</strong></li>
              <li>اضغط على <strong>Settings</strong> → <strong>Environment Variables</strong></li>
              <li>أضف متغيراً جديداً:
                <ul>
                  <li><strong>Name:</strong> <code>TELEGRAM_BOT_TOKEN</code></li>
                  <li><strong>Value:</strong> توكن البوت الخاص بك</li>
                </ul>
              </li>
              <li>أعد نشر المشروع</li>
            </ol>
          </div>
          ` : ''}
          
          <div class="instructions">
            <h3>📋 تعليمات التشغيل:</h3>
            <ol>
              <li>تأكد من تعيين التوكن في Vercel</li>
              <li>تعيين Webhook:
                <code>curl -X POST "https://api.telegram.org/botYOUR_TOKEN/setWebhook?url=https://downloder-three.vercel.app/api/bot"</code>
              </li>
              <li>افتح Telegram وابحث عن البوت</li>
              <li>أرسل <code>/start</code> للبدء</li>
            </ol>
          </div>
          
          <p>رابط المشروع: <code>https://downloder-three.vercel.app</code></p>
          <p>Webhook Endpoint: <code>https://downloder-three.vercel.app/api/bot</code></p>
        </div>
      </body>
      </html>
    `;
    
    res.status(200).send(html);
    
  } catch (error) {
    console.error('❌ Handler error:', error);
    res.status(500).json({ 
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
};
