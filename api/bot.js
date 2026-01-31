const TelegramBot = require('node-telegram-bot-api');

// 1. احصل على التوكن من متغيرات البيئة
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN;

// 2. عرض رسالة إذا لم يكن التوكن موجوداً
if (!BOT_TOKEN) {
  console.log('⚠️  ملاحظة: لم يتم تعيين توكن البوت');
  console.log('لإضافة التوكن في Vercel:');
  console.log('1. اذهب إلى Settings → Environment Variables');
  console.log('2. أضف متغير جديد:');
  console.log('   - Name: TELEGRAM_BOT_TOKEN');
  console.log('   - Value: توكن_البوت_الخاص_بك');
  console.log('3. أعد النشر');
}

// 3. إنشاء البوت (إذا كان التوكن موجوداً)
let bot;
try {
  if (BOT_TOKEN) {
    bot = new TelegramBot(BOT_TOKEN, { polling: false });
    console.log('✅ تم تهيئة البوت بنجاح');
  } else {
    console.log('❌ لم يتم تهيئة البوت - التوكن مفقود');
  }
} catch (error) {
  console.error('❌ خطأ في تهيئة البوت:', error.message);
}

// 4. معالجة الأمر /start
if (bot) {
  bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    try {
      await bot.sendMessage(chatId, 
        '👋 أهلاً! أنا بوت بسيط يعمل على Vercel.\n\n' +
        '📝 فقط أرسل لي أي رسالة وسأرد عليك بنفس الرسالة.\n\n' +
        '🚀 جرب الآن! أرسل لي "مرحباً"'
      );
    } catch (error) {
      console.error('خطأ في /start:', error.message);
    }
  });

  // 5. معالجة جميع الرسائل
  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;
    
    // تجاهل الأمر /start
    if (text && text.startsWith('/')) return;
    
    try {
      if (text) {
        // رد بنفس الرسالة
        await bot.sendMessage(chatId, `📨 تلقيت: "${text}"\n\n✅ هذا كل ما أفعله الآن!`);
      } else {
        await bot.sendMessage(chatId, '❌ لم أتلقى نصاً في رسالتك.');
      }
    } catch (error) {
      console.error('خطأ في معالجة الرسالة:', error.message);
    }
  });
}

// 6. معالج طلبات Vercel
module.exports = async (req, res) => {
  console.log(`📨 طلب ${req.method} على ${req.url}`);
  
  if (req.method === 'POST') {
    // معالجة webhook من Telegram
    try {
      if (!bot) {
        return res.status(500).json({ 
          error: 'Bot not initialized',
          message: 'TELEGRAM_BOT_TOKEN is missing'
        });
      }
      
      const update = req.body;
      console.log('🔔 تحديث من Telegram:', update.update_id);
      
      await bot.processUpdate(update);
      
      res.status(200).json({ 
        success: true,
        message: 'Update processed',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ خطأ في معالجة التحديث:', error);
      res.status(500).json({ 
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  } else {
    // عرض صفحة HTML عند زيارة الرابط في المتصفح
    const html = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>🤖 Simple Telegram Bot</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: linear-gradient(135deg, #00b4db 0%, #0083b0 100%);
          color: white;
          min-height: 100vh;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 20px;
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
        h1 { font-size: 2.5rem; margin-bottom: 20px; }
        .status {
          background: ${bot ? '#00ff00' : '#ff0000'};
          color: ${bot ? 'black' : 'white'};
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
        .steps {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin: 30px 0;
        }
        .step {
          background: rgba(255, 255, 255, 0.15);
          padding: 20px;
          border-radius: 10px;
          text-align: center;
        }
        .step-number {
          background: white;
          color: #0083b0;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 10px;
          font-weight: bold;
          font-size: 1.2rem;
        }
        code {
          background: rgba(0, 0, 0, 0.3);
          padding: 5px 10px;
          border-radius: 5px;
          font-family: monospace;
          display: block;
          margin: 10px 0;
          overflow-x: auto;
        }
        .links {
          margin-top: 30px;
          display: flex;
          justify-content: center;
          gap: 20px;
          flex-wrap: wrap;
        }
        .link-btn {
          background: white;
          color: #0083b0;
          text-decoration: none;
          padding: 12px 25px;
          border-radius: 8px;
          font-weight: bold;
          transition: all 0.3s;
          border: 2px solid white;
        }
        .link-btn:hover {
          background: transparent;
          color: white;
        }
        .footer {
          margin-top: 30px;
          opacity: 0.8;
          font-size: 0.9rem;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🤖 Simple Telegram Bot</h1>
        
        <div class="status">
          ${bot ? '✅ البوت يعمل وجاهز للاستقبال' : '❌ البوت غير نشط - التوكن مفقود'}
        </div>
        
        <div class="info-box">
          <h3>📊 معلومات:</h3>
          <p><strong>الحالة:</strong> ${bot ? '✅ نشط' : '❌ غير نشط'}</p>
          <p><strong>التوكن:</strong> ${BOT_TOKEN ? '✅ موجود' : '❌ مفقود'}</p>
          <p><strong>الرابط:</strong> ${process.env.VERCEL_URL || 'https://your-app.vercel.app'}</p>
          <p><strong>الوقت:</strong> ${new Date().toLocaleString('ar-SA')}</p>
        </div>
        
        ${!BOT_TOKEN ? `
        <div style="background: rgba(255, 0, 0, 0.2); padding: 20px; border-radius: 10px; margin: 20px 0; text-align: right;">
          <h3>⚠️ تعليمات إضافة التوكن:</h3>
          <ol style="padding-right: 20px;">
            <li>اذهب إلى إعدادات المشروع في Vercel</li>
            <li>اختر "Environment Variables"</li>
            <li>اضف متغير جديد:
              <ul>
                <li><strong>Name:</strong> TELEGRAM_BOT_TOKEN</li>
                <li><strong>Value:</strong> توكن البوت من @BotFather</li>
              </ul>
            </li>
            <li>أعد نشر المشروع</li>
          </ol>
        </div>
        ` : ''}
        
        <div class="steps">
          <div class="step">
            <div class="step-number">1</div>
            <h3>إنشاء البوت</h3>
            <p>اذهب إلى @BotFather في Telegram وأنشئ بوت جديد</p>
          </div>
          <div class="step">
            <div class="step-number">2</div>
            <h3>تعيين التوكن</h3>
            <p>أضف التوكن إلى متغيرات البيئة في Vercel</p>
          </div>
          <div class="step">
            <div class="step-number">3</div>
            <h3>تعيين Webhook</h3>
            <p>شغل هذا الأمر في Terminal:</p>
            <code>curl -X POST "https://api.telegram.org/botYOUR_TOKEN/setWebhook?url=${process.env.VERCEL_URL || 'YOUR_URL'}/api/bot"</code>
          </div>
          <div class="step">
            <div class="step-number">4</div>
            <h3>اختبار البوت</h3>
            <p>أرسل /start للبوت وابدأ المحادثة</p>
          </div>
        </div>
        
        <div class="links">
          <a href="https://t.me/botfather" class="link-btn" target="_blank">🔗 @BotFather</a>
          <a href="https://vercel.com/dashboard" class="link-btn" target="_blank">📊 Vercel Dashboard</a>
          ${BOT_TOKEN ? `<a href="https://t.me/${bot ? (await bot.getMe()).username : 'YOUR_BOT'}" class="link-btn" target="_blank">🤖 تجربة البوت</a>` : ''}
        </div>
        
        <div class="footer">
          <p>مشروع بسيط لتعلم كيفية عمل Telegram Bot على Vercel</p>
          <p>© ${new Date().getFullYear()} - سيعمل بمجرد إضافة التوكن</p>
        </div>
      </div>
      
      <script>
        // تحديث الصفحة كل 10 ثواني لعرض الحالة المحدثة
        setTimeout(() => {
          window.location.reload();
        }, 10000);
      </script>
    </body>
    </html>
    `;
    
    res.status(200).send(html);
  }
};
