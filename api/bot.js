const BOT_TOKEN = process.env.BOT_TOKEN;
const API = `https://api.telegram.org/bot${BOT_TOKEN}`;

async function sendMessage(chatId, text) {
  await fetch(`${API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text
    })
  });
}

module.exports = async (req, res) => {
  console.log('🔥 Function hit:', req.method);

  if (req.method !== 'POST') {
    return res.status(200).send('Bot alive');
  }

  try {
    const update = req.body; // 🔴 المفتاح هنا
    console.log('📦 Update:', JSON.stringify(update));

    if (update?.message?.text === '/start') {
      const chatId = update.message.chat.id;

      await sendMessage(
        chatId,
        '✅ البوت يعمل الآن على Vercel (مضمون 💪)'
      );

      console.log('✅ Message sent');
    }

    return res.status(200).send('OK');
  } catch (err) {
    console.error('❌ Error:', err);
    return res.status(500).send('Error');
  }
};
