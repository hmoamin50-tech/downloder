const TelegramBot = require('node-telegram-bot-api');

// ⚠️ يفضّل وضعه في Environment Variables
const BOT_TOKEN = process.env.BOT_TOKEN || 'PUT_YOUR_TOKEN';

const bot = new TelegramBot(BOT_TOKEN);

// /start command
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  console.log('📩 /start from', chatId);

  await bot.sendMessage(
    chatId,
    '🎉 أهلاً! البوت يعمل على Vercel بنجاح 🚀'
  );
});

// Webhook handler (Vercel)
module.exports = async (req, res) => {
  if (req.method === 'POST') {
    try {
      await bot.processUpdate(req.body);
      return res.status(200).send('OK');
    } catch (err) {
      console.error('❌ processUpdate error:', err);
      return res.status(500).send('Error');
    }
  }

  // GET test page
  res.status(200).send('🤖 Telegram Bot is running');
};
