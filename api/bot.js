const BOT_TOKEN = process.env.BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

async function sendMessage(chatId, text) {
  const res = await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text
    })
  });

  return res.json();
}

module.exports = async (req, res) => {
  if (req.method === 'POST') {
    try {
      let body = '';

      req.on('data', chunk => body += chunk);
      req.on('end', async () => {
        const update = JSON.parse(body);

        if (update.message && update.message.text === '/start') {
          const chatId = update.message.chat.id;

          await sendMessage(
            chatId,
            '✅ البوت يعمل على Vercel بدون أخطاء TLS 🚀'
          );
        }

        res.status(200).send('OK');
      });

    } catch (err) {
      console.error('❌ Error:', err);
      res.status(500).send('Error');
    }
    return;
  }

  res.status(200).send('🤖 Bot is running');
};
