// ملف اختبار بسيط
module.exports = async (req, res) => {
  res.status(200).json({
    status: 'online',
    message: 'Bot test endpoint',
    time: new Date().toISOString(),
    env: {
      hasToken: !!process.env.TELEGRAM_BOT_TOKEN,
      tokenLength: process.env.TELEGRAM_BOT_TOKEN ? process.env.TELEGRAM_BOT_TOKEN.length : 0
    }
  });
};
