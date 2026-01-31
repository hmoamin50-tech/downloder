const TelegramBot = require('node-telegram-bot-api');
const { extractFacebookVideo } = require('./facebook');

// الحصول على التوكن
const BOT_TOKEN = process.env.BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;

console.log('🔑 Token Status:', BOT_TOKEN ? '✅ Present' : '❌ Missing');

if (!BOT_TOKEN) {
  console.error('❌ ERROR: Telegram Bot Token is missing!');
}

// تهيئة البوت
let bot;
try {
  bot = new TelegramBot(BOT_TOKEN, {
    webHook: false,
    polling: false
  });
  
  console.log('✅ Bot initialized successfully');
} catch (error) {
  console.error('❌ Error initializing bot:', error.message);
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
        'https://www.facebook.com/.../videos/...\n' +
        'https://fb.watch/...\n\n' +
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
        const processingMsg = await bot.sendMessage(chatId, '🔄 جاري تحليل الرابط واستخراج الفيديو...', {
          reply_to_message_id: messageId
        });

        // استخراج الفيديو
        console.log(`🔍 Extracting video from: ${facebookUrl}`);
        const videoInfo = await extractFacebookVideo(facebookUrl);
        
        if (videoInfo.success && videoInfo.videoUrl) {
          // تحديث رسالة الانتظار
          await bot.editMessageText('✅ تم العثور على الفيديو! جاري الإرسال...', {
            chat_id: chatId,
            message_id: processingMsg.message_id
          });

          console.log(`🎥 Video found: ${videoInfo.videoUrl}`);
          
          // إرسال الفيديو
          await bot.sendVideo(chatId, videoInfo.videoUrl, {
            caption: `📹 ${videoInfo.title || 'فيديو Facebook'}\n\n` +
                     `📊 الجودة: ${videoInfo.quality || 'متوسطة'}\n` +
                     `👤 الناشر: ${videoInfo.author || 'Facebook'}`,
            reply_to_message_id: messageId,
            supports_streaming: true
          });
          
          // حذف رسالة الانتظار
          await bot.deleteMessage(chatId, processingMsg.message_id);
          
        } else {
          await bot.editMessageText('❌ لم أتمكن من استخراج الفيديو من هذا الرابط.\n\nيرجى التأكد من:\n1. أن الفيديو عام وليس خاصاً\n2. أن الرابط صحيح\n3. المحاولة برابط آخر', {
            chat_id: chatId,
            message_id: processingMsg.message_id,
            parse_mode: 'Markdown'
          });
        }
        
      } catch (error) {
        console.error('Error processing video:', error.message);
        await bot.sendMessage(chatId, '❌ حدث خطأ أثناء معالجة الفيديو. يرجى المحاولة مرة أخرى.', {
          reply_to_message_id: messageId
        });
      }
      
    } else {
      // إذا لم يكن رابط Facebook
      try {
        await bot.sendMessage(chatId, 
          '📎 يرجى إرسال رابط فيديو Facebook فقط.\n\n' +
          '🔗 *أمثلة:*\n' +
          '• https://www.facebook.com/.../videos/...\n' +
          '• https://fb.watch/...\n' +
          '• https://m.facebook.com/.../videos/...\n\n' +
          '💡 *نصيحة:* انسخ الرابط مباشرة من متصفحك',
          { 
            parse_mode: 'Markdown',
            reply_to_message_id: messageId 
          }
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
    console.log(`📨 ${req.method} ${req.url}`);

    if (req.method === 'POST') {
      // التحقق من وجود البوت
      if (!bot) {
        console.error('Bot not available - returning error');
        return res.status(500).json({ 
          error: 'Bot initialization failed',
          message: 'Please check BOT_TOKEN environment variable'
        });
      }

      // معالجة webhook من Telegram
      const update = req.body;
      console.log('Update received:', update.update_id);

      await bot.processUpdate(update);
      return res.status(200).json({ 
        ok: true,
        message: 'Update processed'
      });
    }
    
    // GET request - عرض صفحة الويب
    const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Facebook Video Downloader Bot</title>
      <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🤖</text></svg>">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          min-height: 100vh;
          padding: 20px;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        
        .container {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border-radius: 20px;
          padding: 40px;
          max-width: 800px;
          width: 100%;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.2);
          text-align: center;
        }
        
        h1 {
          font-size: 2.5rem;
          margin-bottom: 20px;
          color: white;
        }
        
        .status {
          background: ${bot ? '#4CAF50' : '#f44336'};
          color: white;
          padding: 15px;
          border-radius: 10px;
          margin: 20px 0;
          font-size: 1.2rem;
          font-weight: bold;
        }
        
        .info-box {
          background: rgba(255, 255, 255, 0.2);
          padding: 20px;
          border-radius: 10px;
          margin: 20px 0;
          text-align: right;
        }
        
        .feature {
          background: rgba(255, 255, 255, 0.15);
          padding: 15px;
          border-radius: 10px;
          margin: 10px 0;
          display: flex;
          align-items: center;
          gap: 15px;
        }
        
        .feature-icon {
          font-size: 2rem;
        }
        
        .instructions {
          text-align: right;
          margin: 30px 0;
        }
        
        ol {
          padding-right: 20px;
          margin: 15px 0;
        }
        
        li {
          margin-bottom: 10px;
        }
        
        .btn {
          display: inline-block;
          background: white;
          color: #667eea;
          text-decoration: none;
          padding: 15px 30px;
          border-radius: 10px;
          font-weight: bold;
          margin: 10px;
          transition: transform 0.3s;
        }
        
        .btn:hover {
          transform: translateY(-3px);
        }
        
        .footer {
          margin-top: 30px;
          opacity: 0.8;
          font-size: 0.9rem;
        }
        
        @media (max-width: 768px) {
          .container {
            padding: 20px;
          }
          
          h1 {
            font-size: 2rem;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🤖 Facebook Video Downloader Bot</h1>
        
        <div class="status">
          ${bot ? '✅ البوت يعمل وجاهز للاستخدام' : '❌ البوت غير نشط - تحقق من التوكن'}
        </div>
        
        <div class="info-box">
          <p><strong>🔑 حالة التوكن:</strong> ${BOT_TOKEN ? '✅ مضبوط' : '❌ مفقود'}</p>
          <p><strong>🤖 حالة البوت:</strong> ${bot ? '✅ نشط' : '❌ غير نشط'}</p>
          <p><strong>🌐 الرابط:</strong> ${process.env.VERCEL_URL || 'downloder-three.vercel.app'}</p>
          <p><strong>⏰ الوقت:</strong> ${new Date().toLocaleString('ar-SA')}</p>
        </div>
        
        <div class="feature">
          <div class="feature-icon">🎥</div>
          <div style="text-align: right;">
            <h3>تحميل فيديوهات Facebook</h3>
            <p>أرسل رابط الفيديو واحصل عليه مباشرة</p>
          </div>
        </div>
        
        <div class="feature">
          <div class="feature-icon">⚡</div>
          <div style="text-align: right;">
            <h3>سرعة عالية</h3>
            <p>معالجة سريعة للروابط</p>
          </div>
        </div>
        
        <div class="feature">
          <div class="feature-icon">🔒</div>
          <div style="text-align: right;">
            <h3>آمن</h3>
            <p>لا يتم حفظ الفيديوهات على السيرفر</p>
          </div>
        </div>
        
        <div class="instructions">
          <h3>📋 طريقة الاستخدام:</h3>
          <ol>
            <li>انضم إلى البوت على Telegram</li>
            <li>أرسل رابط فيديو Facebook</li>
            <li>انتظر حتى تتم معالجة الرابط</li>
            <li>استلم الفيديو مباشرة في المحادثة</li>
          </ol>
        </div>
        
        <div style="margin-top: 30px;">
          ${bot ? `
            <a href="https://t.me/${(async () => {
              try {
                const me = await bot.getMe();
                return me.username;
              } catch {
                return 'your_bot_username';
              }
            })()}" class="btn" target="_blank">
              🤖 ابدأ الآن
            </a>
          ` : ''}
          
          <a href="https://vercel.com/downloder-three/settings/environment-variables" 
             class="btn" 
             target="_blank"
             style="background: rgba(255, 255, 255, 0.2); color: white; border: 2px solid white;">
            ⚙️ إعدادات Vercel
          </a>
        </div>
        
        <div class="footer">
          <p>مشروع مفتوح المصدر يعمل على منصة Vercel</p>
          <p>© ${new Date().getFullYear()} - تم التطوير باستخدام Node.js</p>
        </div>
      </div>
    </body>
    </html>
    `;
    
    res.status(200).send(html);
    
  } catch (error) {
    console.error('❌ Handler error:', error);
    res.status(500).json({ 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};
