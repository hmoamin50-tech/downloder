const TelegramBot = require('node-telegram-bot-api');

// 1. الحصول على التوكن
const token = process.env.TELEGRAM_BOT_TOKEN;

// 2. سجل التوكن (الجزء الأول فقط للأمان)
console.log('🔑 Token check:', token ? `Present (${token.substring(0, 15)}...)` : 'MISSING!');

if (!token) {
  console.error('❌ CRITICAL: TELEGRAM_BOT_TOKEN is not set in environment variables!');
}

// 3. إنشاء البوت
const bot = token ? new TelegramBot(token, { polling: false }) : null;

if (bot) {
  console.log('✅ Bot initialized successfully');
  
  // 4. أمر /start فقط
  bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    console.log(`🎯 /start from ${chatId}`);
    
    bot.sendMessage(chatId, 
      '🎉 *تم تشغيل البوت بنجاح!*\n\n' +
      'أرسل لي أي رسالة وسأرد عليك بنفس الرسالة.\n\n' +
      'جرب الآن 💬',
      { parse_mode: 'Markdown' }
    ).catch(err => {
      console.error('Error in /start:', err.message);
    });
  });

  // 5. معالجة جميع الرسائل
  bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text || '';
    
    console.log(`📩 Received from ${chatId}: ${text.substring(0, 50)}`);
    
    // تجاهل الرسائل الفارغة
    if (!text.trim()) return;
    
    // تجاهل الأوامر
    if (text.startsWith('/')) return;
    
    // رد بسيط جداً
    const reply = `📨 تلقيت: "${text}"\n\n✅ شكراً! البوت يعمل!`;
    
    bot.sendMessage(chatId, reply)
      .then(() => console.log(`✅ Replied to ${chatId}`))
      .catch(err => console.error(`❌ Failed to reply to ${chatId}:`, err.message));
  });

  // 6. معالجة الأخطاء
  bot.on('polling_error', (error) => console.error('Polling error:', error.message));
  bot.on('webhook_error', (error) => console.error('Webhook error:', error.message));
} else {
  console.log('⚠️ Bot not created due to missing token');
}

// 7. معالج Vercel
module.exports = async (req, res) => {
  console.log(`🌐 ${req.method} ${req.url}`);
  
  try {
    if (req.method === 'POST') {
      console.log('📦 Webhook received');
      
      if (!bot) {
        console.error('❌ Cannot process: Bot not initialized');
        return res.status(500).json({ 
          error: 'Bot token missing',
          message: 'Please set TELEGRAM_BOT_TOKEN in environment variables'
        });
      }
      
      const update = req.body;
      console.log(`📊 Update ID: ${update.update_id}, Message: ${update.message?.text || 'No text'}`);
      
      // معالجة التحديث
      await bot.processUpdate(update);
      
      console.log('✅ Update processed');
      return res.status(200).json({ ok: true, processed: true });
    }
    
    // GET request
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Telegram Bot Status</title>
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
            background: ${bot ? '#4CAF50' : '#f44336'};
            color: white;
            padding: 15px;
            border-radius: 10px;
            margin: 20px 0;
            font-size: 1.2rem;
          }
          pre {
            background: rgba(0, 0, 0, 0.3);
            padding: 15px;
            border-radius: 10px;
            text-align: left;
            overflow-x: auto;
          }
          .btn {
            display: inline-block;
            background: white;
            color: #667eea;
            padding: 10px 20px;
            border-radius: 5px;
            text-decoration: none;
            margin: 10px;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🤖 Telegram Bot Status</h1>
          
          <div class="status">
            ${bot ? '✅ البوت نشط وجاهز' : '❌ البوت غير نشط - التوكن مفقود'}
          </div>
          
          <h3>📊 معلومات:</h3>
          <pre>
Token موجود: ${token ? '✅ نعم' : '❌ لا'}
البوت مهيأ: ${bot ? '✅ نعم' : '❌ لا'}
الرابط: ${process.env.VERCEL_URL || 'غير محدد'}
الوقت: ${new Date().toLocaleString('ar-SA')}
          </pre>
          
          <h3>🎯 اختبار سريع:</h3>
          <p>1. اذهب إلى البوت على Telegram</p>
          <p>2. أرسل <code>/start</code></p>
          <p>3. أرسل أي رسالة مثل "مرحبا"</p>
          
          <div style="margin-top: 30px;">
            <a href="/api/test" class="btn">🔧 اختبار API</a>
            <a href="https://t.me/${bot ? (async () => { try { const me = await bot.getMe(); return me.username; } catch { return 'YOUR_BOT'; } })() : 'YOUR_BOT'}" 
               class="btn" target="_blank">🤖 فتح البوت</a>
          </div>
        </div>
      </body>
      </html>
    `);
    
  } catch (error) {
    console.error('❌ Handler error:', error);
    res.status(500).json({ error: error.message });
  }
};
