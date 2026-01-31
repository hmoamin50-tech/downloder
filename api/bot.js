const TelegramBot = require('node-telegram-bot-api');

// الحصول على التوكن
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

// التحقق من التوكن
if (!BOT_TOKEN) {
  console.error('❌ ERROR: TELEGRAM_BOT_TOKEN is not set!');
  console.log('📝 Current environment variables:', Object.keys(process.env).filter(k => k.includes('BOT') || k.includes('TELEGRAM')));
}

// إنشاء البوت
const bot = new TelegramBot(BOT_TOKEN, { 
  polling: false 
});

console.log('🤖 Bot created with token:', BOT_TOKEN ? '✅ Present' : '❌ Missing');

// الأمر /start
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  console.log(`👋 /start command from chat ${chatId}`);
  
  bot.sendMessage(chatId, 
    '🚀 *مرحباً! البوت يعمل الآن!*\n\n' +
    'أرسل لي أي رسالة وسأرد عليك بنفس الرسالة.\n\n' +
    'جرب إرسال:\n' +
    '"مرحباً" أو "كيف الحال؟"',
    { parse_mode: 'Markdown' }
  ).catch(err => {
    console.error('Error sending /start message:', err.message);
  });
});

// معالجة جميع الرسائل النصية
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  
  console.log(`📨 Message from ${chatId}: "${text}"`);
  
  // تجاهل الرسائل غير النصية
  if (!text) return;
  
  // تجاهل الأمر /start (تمت معالجته بالفعل)
  if (text.startsWith('/start')) return;
  
  // تجاهل الأوامر الأخرى
  if (text.startsWith('/')) {
    bot.sendMessage(chatId, '⚠️ هذا الأمر غير مدعوم حالياً. أرسل أي رسالة نصية عادية.')
      .catch(err => console.error('Error sending unsupported command message:', err.message));
    return;
  }
  
  // رد بسيط بنفس الرسالة
  bot.sendMessage(chatId, `📨 *لقد تلقيت:*\n\n"${text}"\n\n✅ *الرد:*\nنعم، سمعتك! البوت يعمل بشكل ممتاز! 🎉`, {
    parse_mode: 'Markdown'
  }).catch(err => {
    console.error('Error echoing message:', err.message);
  });
});

// معالجة الأخطاء
bot.on('polling_error', (error) => {
  console.error('❌ Polling error:', error.message);
});

bot.on('webhook_error', (error) => {
  console.error('❌ Webhook error:', error.message);
});

// Handler الأساسي لـ Vercel
module.exports = async (req, res) => {
  console.log(`🌐 ${req.method} request to ${req.url}`);
  
  try {
    if (req.method === 'POST') {
      console.log('📦 Request body:', JSON.stringify(req.body).substring(0, 200) + '...');
      
      // معالجة التحديث من Telegram
      const update = req.body;
      
      // تسجيل التحديث المفصل
      if (update.message) {
        const msg = update.message;
        console.log(`📝 Update Details:
          Update ID: ${update.update_id}
          Chat ID: ${msg.chat.id}
          Username: ${msg.from?.username || 'N/A'}
          First Name: ${msg.from?.first_name || 'N/A'}
          Text: ${msg.text || 'No text'}
          Date: ${new Date(msg.date * 1000).toISOString()}
        `);
      }
      
      // معالجة التحديث
      await bot.processUpdate(update);
      
      console.log('✅ Update processed successfully');
      
      return res.status(200).json({ 
        ok: true,
        message: 'Update processed',
        update_id: update.update_id,
        timestamp: new Date().toISOString()
      });
    }
    
    // GET request - عرض صفحة معلومات
    const html = `
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
          background: green;
          color: white;
          padding: 10px 20px;
          border-radius: 10px;
          display: inline-block;
          margin: 20px 0;
          font-size: 1.2rem;
        }
        .log-box {
          background: rgba(0, 0, 0, 0.3);
          padding: 15px;
          border-radius: 10px;
          margin: 20px 0;
          text-align: left;
          font-family: monospace;
          font-size: 0.9rem;
          max-height: 200px;
          overflow-y: auto;
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
          display: block;
          margin: 5px 0;
          overflow-x: auto;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🤖 Telegram Bot Status</h1>
        
        <div class="status">✅ Bot is Running</div>
        
        <div class="log-box">
          <strong>Last Log:</strong><br>
          🔔 تحديث من Telegram: ${req.query.update_id || 'No update yet'}<br>
          ⏰ Time: ${new Date().toLocaleString()}<br>
          🌐 URL: ${process.env.VERCEL_URL || 'Not set'}<br>
          🔑 Token: ${BOT_TOKEN ? '✅ Present' : '❌ Missing'}
        </div>
        
        <div class="instructions">
          <h3>📋 How to Test:</h3>
          <ol>
            <li>Open your bot on Telegram</li>
            <li>Send <code>/start</code></li>
            <li>Send any message like "Hello"</li>
            <li>Bot should reply with your message</li>
          </ol>
          
          <h3>🔧 Debug Info:</h3>
          <code>Bot Token: ${BOT_TOKEN ? 'Set (' + BOT_TOKEN.substring(0, 10) + '...)' : 'NOT SET'}</code>
          <code>Webhook URL: https://${process.env.VERCEL_URL || 'YOUR_URL'}/api/bot</code>
          <code>Node Version: ${process.version}</code>
        </div>
        
        <p>If the bot doesn't respond, check Vercel logs for errors.</p>
      </div>
    </body>
    </html>
    `;
    
    res.status(200).send(html);
    
  } catch (error) {
    console.error('❌ Handler error:', error);
    console.error('Error stack:', error.stack);
    
    res.status(500).json({
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
  }
};
