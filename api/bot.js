const BOT_TOKEN = process.env.BOT_TOKEN;
const API = `https://api.telegram.org/bot${BOT_TOKEN}`;

export default async function handler(req, res) {
  console.log('🔥 HIT:', req.method);

  if (req.method !== 'POST') {
    return res.status(200).send('Bot alive');
  }

  try {
    const update = req.body;
    console.log('📦 UPDATE:', update);

    if (update?.message?.text === '/start') {
      const chatId = update.message.chat.id;

      await fetch(`${API}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: '✅ البوت يعمل الآن على Vercel 🔥'
        })
      });

      console.log('✅ Message sent');
    }

    return res.status(200).send('OK');
  } catch (e) {
    console.error('❌ ERROR:', e);
    return res.status(500).send('ERR');
  }
}
