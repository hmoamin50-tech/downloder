import axios from "axios";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(200).send("Telegram Bot is running 🚀");
  }

  try {
    const message = req.body.message;

    if (!message) {
      return res.status(200).end();
    }

    const chatId = message.chat.id;
    const text = message.text || "";

    const reply = `👋 أهلاً!\nاستلمت رسالتك:\n\n${text}`;

    await axios.post(
      `https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`,
      {
        chat_id: chatId,
        text: reply
      }
    );

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error(error);
    return res.status(200).json({ ok: false });
  }
}

      
