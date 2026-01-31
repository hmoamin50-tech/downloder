const TelegramBot = require('node-telegram-bot-api');

// 1. احصل على التوكن
const BOT_TOKEN = process.env.BOT_TOKEN || '8556372174:AAFSN2WOWTw_7o8--NlALO2GO-mUf5Pgnf0';

console.log('🔑 Token:', BOT_TOKEN ? 'Present' : 'Missing');

// 2. أنشئ البوت بـ polling: false فقط
const bot = new TelegramBot(BOT_TOKEN, { 
  polling: false 
});

console.log('🤖 Bot created');

// 3. الأمر /start فقط
bot.onText(/\/start/, (msg) => {
  console.log(`📩 /start from ${msg.chat.id}`);
  
  bot.sendMessage(msg.chat.id, "🎉 أهلاً! البوت شغال على Vercel بنجاح!")
    .then(() => console.log(`✅ Reply sent to ${msg.chat.id}`))
    .catch(err => console.error(`❌ Failed to send to ${msg.chat.id}:`, err.message));
});

// 4. معالجة الأخطاء
bot.on('polling_error', (error) => {
  console.error('Polling error:', error.message);
});

bot.on('webhook_error', (error) => {
  console.error('Webhook error:', error.message);
});

// 5. Handler بسيط جداً
module.exports = async (req, res) => {
  console.log(`🌐 ${req.method} ${req.url}`);
  
  if (req.method === 'POST') {
    console.log('📦 Webhook received');
    
    try {
      // معالجة التحديث
      await bot.processUpdate(req.body);
      console.log('✅ Update processed');
      
      return res.status(200).json({ 
        ok: true,
        message: 'ok' 
      });
    } catch (error) {
      console.error('❌ Error processing update:', error);
      return res.status(500).json({ 
        error: error.message 
      });
    }
  }
  
  // GET request
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Simple Telegram Bot</title>
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
          padding: 30px;
          border-radius: 15px;
          backdrop-filter: blur(10px);
          max-width: 500px;
          margin: 0 auto;
        }
        .status {
          background: green;
          color: white;
          padding: 10px;
          border-radius: 5px;
          margin: 20px 0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>🤖 Simple Telegram Bot</h1>
        <div class="status">✅ Bot is running on Vercel</div>
        <p>Send <code>/start</code> to the bot on Telegram</p>
        <p>Token: ${BOT_TOKEN ? '✅ Set' : '❌ Not set'}</p>
      </div>
    </body>
    </html>
  `);
};
