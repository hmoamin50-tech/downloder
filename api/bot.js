const TelegramBot = require('node-telegram-bot-api');

// 1. احصل على التوكن
const BOT_TOKEN = process.env.BOT_TOKEN;

console.log('🔑 Token exists:', !!BOT_TOKEN);
if (BOT_TOKEN) {
  console.log('📏 Token length:', BOT_TOKEN.length);
  console.log('🔐 Token starts with:', BOT_TOKEN.substring(0, 10) + '...');
}

// 2. أنشئ البوت
const bot = BOT_TOKEN ? new TelegramBot(BOT_TOKEN, { polling: false }) : null;

if (bot) {
  console.log('✅ Bot object created');
  
  // 3. سجل جميع الأحداث
  bot.on('message', (msg) => {
    console.log('📩 MESSAGE EVENT FIRED!');
    console.log('📊 Message details:', {
      chatId: msg.chat.id,
      text: msg.text,
      from: msg.from?.username || msg.from?.first_name,
      date: new Date(msg.date * 1000).toISOString()
    });
    
    // حاول الرد
    try {
      console.log('🔄 Attempting to reply...');
      bot.sendMessage(msg.chat.id, `✅ تلقيت: "${msg.text}"`)
        .then(() => console.log('✅ Reply sent successfully!'))
        .catch(err => console.error('❌ Failed to send reply:', err.message));
    } catch (error) {
      console.error('❌ Error in message handler:', error.message);
    }
  });
  
  // 4. سجل الأخطاء
  bot.on('polling_error', (error) => {
    console.error('🔄 Polling error:', error.message);
  });
  
  bot.on('webhook_error', (error) => {
    console.error('🌐 Webhook error:', error.message);
  });
  
  console.log('🎯 Bot event handlers registered');
} else {
  console.error('❌ Bot not created - token missing or invalid');
}

// 5. معالج Vercel
module.exports = async (req, res) => {
  console.log('\n' + '='.repeat(50));
  console.log(`🌐 ${req.method} ${req.url} at ${new Date().toISOString()}`);
  console.log('='.repeat(50));
  
  try {
    if (req.method === 'POST') {
      const update = req.body;
      console.log('📦 Update received:', JSON.stringify(update, null, 2));
      
      if (!bot) {
        console.error('❌ Bot not available - cannot process');
        return res.status(500).json({ 
          error: 'Bot not initialized',
          reason: 'BOT_TOKEN environment variable issue'
        });
      }
      
      console.log('🔄 Processing update...');
      await bot.processUpdate(update);
      console.log('✅ Update processed');
      
      return res.status(200).json({ 
        success: true,
        message: 'Update processed',
        update_id: update.update_id
      });
    }
    
    // GET request
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Bot Debug</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          padding: 50px;
          background: #1a1a1a;
          color: white;
          text-align: center;
        }
        .status {
          background: ${bot ? 'green' : 'red'};
          padding: 20px;
          border-radius: 10px;
          margin: 20px auto;
          max-width: 600px;
        }
        .info {
          background: #333;
          padding: 20px;
          border-radius: 10px;
          margin: 20px auto;
          max-width: 600px;
          text-align: left;
          font-family: monospace;
        }
      </style>
    </head>
    <body>
      <h1>🤖 Bot Debug Page</h1>
      <div class="status">
        <h2>${bot ? '✅ BOT IS READY' : '❌ BOT NOT READY'}</h2>
      </div>
      <div class="info">
        <p><strong>Token:</strong> ${BOT_TOKEN ? 'PRESENT' : 'MISSING'}</p>
        <p><strong>Bot Object:</strong> ${bot ? 'CREATED' : 'NOT CREATED'}</p>
        <p><strong>Time:</strong> ${new Date().toISOString()}</p>
        <p><strong>URL:</strong> ${process.env.VERCEL_URL || 'N/A'}</p>
      </div>
      <p>Send any message to the bot and check Vercel logs</p>
    </body>
    </html>
    `);
    
  } catch (error) {
    console.error('❌ Handler error:', error);
    res.status(500).json({ error: error.message });
  }
};
