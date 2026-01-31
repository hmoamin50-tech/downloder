const TelegramBot = require('node-telegram-bot-api');
const { extractFacebookVideo } = require('../utils/facebook');

// تهيئة البوت (دون polling لأننا نستخدم webhook)
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);

// الأمر /start
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  
  const welcomeText = `🎬 *مرحباً بك في بوت تحميل فيديوهات الفيسبوك*\\! ✨

📥 *كيفية الاستخدام:*
1\\. أرسل لي رابط فيديو من Facebook
2\\. انتظر بضع ثوانٍ بينما أحلل الرابط
3\\. سأرسل لك الفيديو جاهزاً للتحميل

🔗 *الروابط المدعومة:*
• https://www\\.facebook\\.com/\\*\\.\\.\\./videos/\\*\\.\\.\\.
• https://fb\\.watch/\\*\\.\\.\\.
• https://www\\.facebook\\.com/reel/\\*\\.\\.\\.
• https://m\\.facebook\\.com/\\*\\.\\.\\./videos/\\*\\.\\.\\.

⚠️ *ملاحظات مهمة:*
• الفيديو يجب أن يكون عاماً وليس خاصاً
• بعض الفيديوهات المحمية قد لا تعمل
• الحد الأقصى للحجم: 50 ميجابايت

💡 *نصائح:*
• استخدم متصفح Chrome/Edge لنسخ الروابط
• تأكد من عدم وجود أخطاء في الرابط
• جرب رابط فيديو آخر إذا لم يعمل الأول

🚀 *جرب الآن! أرسل رابط فيديو Facebook* 📩`;
  
  await bot.sendMessage(chatId, welcomeText, {
    parse_mode: 'MarkdownV2',
    reply_markup: {
      keyboard: [
        [{ text: "📖 المساعدة" }, { text: "ℹ️ حول البوت" }]
      ],
      resize_keyboard: true
    }
  });
});

// الأمر /help
bot.onText(/(\/help|📖 المساعدة)/, async (msg) => {
  const chatId = msg.chat.id;
  
  const helpText = `❓ *المساعدة* 🆘

🛠 *طريقة العمل:*
1\\. البوت يحلل صفحة الفيديو على Facebook
2\\. يستخرج رابط الفيديو المباشر
3\\. يرسله لك في المحادثة

🔧 *إذا لم يعمل الفيديو:*
1\\. تحقق من أن الرابط صحيح
2\\. تأكد أن الفيديو عام وليس خاصاً
3\\. جرب نسخ الرابط من المتصفح بدلاً من التطبيق
4\\. أعد إرسال الرابط مرة أخرى

📊 *الجودة المدعومة:*
• الدقة العالية \\(HD\\) متاحة لمعظم الفيديوهات
• الدقة القياسية \\(SD\\) متاحة لجميع الفيديوهات

⏱ *وقت المعالجة:*
• عادةً من 5 إلى 15 ثانية
• قد يستغرق أكثر للفيديوهات الطويلة

📞 *للإبلاغ عن مشكلة:*
• سجل المشكلة مع الرابط
• أضف لقطة شاشة إن أمكن
• سأحاول إصلاحها بأسرع وقت`;
  
  await bot.sendMessage(chatId, helpText, {
    parse_mode: 'MarkdownV2',
    reply_markup: {
      remove_keyboard: true
    }
  });
});

// الأمر /about
bot.onText(/(\/about|ℹ️ حول البوت)/, async (msg) => {
  const chatId = msg.chat.id;
  
  const aboutText = `🤖 *حول البوت* ℹ️

• *الإصدار:* 2\\.0\\.0
• *اللغة:* العربية \\(مدعومة الإنجليزية أيضاً\\)
• *المنصة:* Telegram
• *السيرفر:* Vercel
• *التحديث الأخير:* ${new Date().toLocaleDateString('ar-SA')}

🔒 *الخصوصية:*
• لا يتم حفظ أي فيديوهات على السيرفر
• جميع العمليات تتم في الذاكرة المؤقتة
• لا يتم تخزين الروابط بعد المعالجة

⚡ *المميزات:*
• سرعة عالية في المعالجة
• دعم معظم أنواع الفيديوهات
• واجهة سهلة الاستخدام
• تحديثات مستمرة

💻 *المطور:*
• تم تطويره باستخدام Node\\.js
• يعمل على منصة Vercel المجانية
• مفتوح المصدر`;

  await bot.sendMessage(chatId, aboutText, {
    parse_mode: 'MarkdownV2'
  });
});

// معالجة رسائل المستخدم
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  const messageId = msg.message_id;

  // تجاهل الأوامر
  if (text && text.startsWith('/')) return;

  // تجاهل الرسائل غير النصية
  if (!text) {
    await bot.sendMessage(chatId, '📎 يرجى إرسال رابط نصي فقط.', {
      reply_to_message_id: messageId
    });
    return;
  }

  // البحث عن رابط Facebook
  const facebookRegex = /(?:https?:\/\/)?(?:www\.|m\.)?(?:facebook\.com|fb\.watch)\/(?:[^\s]+)/;
  const match = text.match(facebookRegex);
  
  if (match) {
    const facebookUrl = match[0];
    console.log(`📩 Received Facebook URL from ${chatId}: ${facebookUrl}`);
    
    try {
      // إرسال رسالة الانتظار
      const processingMsg = await bot.sendMessage(chatId, '🔄 *جاري تحليل الرابط واستخراج الفيديو...*\n\n⏳ قد تستغرق العملية من 5 إلى 15 ثانية.', {
        parse_mode: 'Markdown',
        reply_to_message_id: messageId
      });

      // استخراج الفيديو
      console.log(`🔍 Starting extraction for: ${facebookUrl}`);
      const videoInfo = await extractFacebookVideo(facebookUrl);
      
      if (videoInfo.success && videoInfo.videoUrl) {
        console.log(`✅ Extraction successful for ${chatId}`);
        
        // تحديث رسالة الانتظار
        await bot.editMessageText('✅ *تم العثور على الفيديو!*\n\n📤 جاري إرساله الآن...', {
          chat_id: chatId,
          message_id: processingMsg.message_id,
          parse_mode: 'Markdown'
        });

        // تحضير المعلومات للعرض
        const caption = `🎥 *${videoInfo.title || 'فيديو Facebook'}*\n\n` +
                      `📊 *الجودة:* ${videoInfo.quality || 'متوسطة'}\n` +
                      `👤 *الناشر:* ${videoInfo.author || 'Facebook'}\n` +
                      `🔗 *الرابط الأصلي:* [اضغط هنا](${facebookUrl})`;
        
        try {
          // محاولة إرسال الفيديو
          await bot.sendVideo(chatId, videoInfo.videoUrl, {
            caption: caption,
            parse_mode: 'Markdown',
            supports_streaming: true,
            reply_to_message_id: messageId
          });
          
          // حذف رسالة الانتظار
          await bot.deleteMessage(chatId, processingMsg.message_id);
          
          console.log(`📤 Video sent successfully to ${chatId}`);
          
        } catch (sendError) {
          console.error('Error sending video:', sendError.message);
          
          // إذا فشل إرسال الفيديو، نرسل الرابط مباشرة
          await bot.editMessageText(`✅ *تم استخراج الفيديو بنجاح!*\n\n` +
                                   `🎬 *العنوان:* ${videoInfo.title || 'فيديو Facebook'}\n\n` +
                                   `📥 *رابط التحميل المباشر:*\n\`${videoInfo.videoUrl}\`\n\n` +
                                   `💡 *لتحميل الفيديو:*\n1. انسخ الرابط أعلاه\n2. افتحه في المتصفح\n3. اضغط على ⋮\n4. اختر "تنزيل"`, {
            chat_id: chatId,
            message_id: processingMsg.message_id,
            parse_mode: 'Markdown'
          });
        }
        
      } else {
        // إذا فشل الاستخراج
        console.log(`❌ Extraction failed for ${chatId}:`, videoInfo.error);
        
        const errorMessage = videoInfo.error 
          ? `❌ *فشل استخراج الفيديو*\n\nالخطأ: ${videoInfo.error}\n\n` +
            `💡 *حلول مقترحة:*\n` +
            `1. تأكد أن الفيديو عام وليس خاصاً\n` +
            `2. جرب رابط فيديو آخر\n` +
            `3. انتظر قليلاً وحاول مرة أخرى\n` +
            `4. تأكد من صحة الرابط`
          : `❌ *لم أتمكن من استخراج الفيديو من هذا الرابط*\n\n` +
            `⚠️ *الأسباب المحتملة:*\n` +
            `• الفيديو محمي أو خاص\n` +
            `• الرابط تالف\n` +
            `• مشكلة مؤقتة في الخادم`;
        
        await bot.editMessageText(errorMessage, {
          chat_id: chatId,
          message_id: processingMsg.message_id,
          parse_mode: 'Markdown'
        });
      }
      
    } catch (error) {
      console.error(`❌ Error processing for ${chatId}:`, error);
      
      await bot.sendMessage(chatId, 
        `❌ *حدث خطأ غير متوقع*\n\n` +
        `الخطأ: ${error.message}\n\n` +
        `⚠️ يرجى المحاولة مرة أخرى بعد قليل.`,
        {
          parse_mode: 'Markdown',
          reply_to_message_id: messageId
        }
      );
    }
    
  } else {
    // إذا لم يكن رابط Facebook
    await bot.sendMessage(chatId, 
      '📎 *لم أعثر على رابط Facebook في رسالتك*\n\n' +
      '🔗 *يرجى إرسال رابط فيديو Facebook فقط*\n\n' +
      '*أمثلة على الروابط المدعومة:*\n' +
      '• https://www.facebook.com/.../videos/...\n' +
      '• https://fb.watch/...\n' +
      '• https://m.facebook.com/.../videos/...\n\n' +
      '💡 *نصيحة:* انسخ الرابط مباشرة من متصفحك للحصول على أفضل نتيجة',
      {
        parse_mode: 'Markdown',
        reply_to_message_id: messageId,
        reply_markup: {
          remove_keyboard: true
        }
      }
    );
  }
});

// معالجة الأخطاء
bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
});

bot.on('webhook_error', (error) => {
  console.error('Webhook error:', error);
});

// Webhook handler
module.exports = async (req, res) => {
  try {
    if (req.method === 'POST') {
      console.log('📨 Received webhook update');
      
      // معالجة البيانات القادمة من Telegram
      const update = req.body;
      
      // التحقق من أن هناك تحديثاً
      if (update && (update.message || update.callback_query)) {
        await bot.processUpdate(update);
      }
      
      return res.status(200).json({ 
        status: 'ok',
        timestamp: new Date().toISOString()
      });
    }
    
    // GET request - عرض رسالة أن البوت يعمل
    res.status(200).send(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>🤖 Facebook Video Bot</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
          }
          .container {
            background: rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(10px);
            border-radius: 20px;
            padding: 40px;
            max-width: 800px;
            width: 100%;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.2);
          }
          h1 {
            font-size: 2.5rem;
            margin-bottom: 20px;
            text-align: center;
          }
          .status {
            background: rgba(0, 255, 0, 0.1);
            border: 2px solid #00ff00;
            border-radius: 10px;
            padding: 15px;
            margin: 20px 0;
            text-align: center;
            font-size: 1.2rem;
          }
          .features {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin: 30px 0;
          }
          .feature {
            background: rgba(255, 255, 255, 0.15);
            padding: 20px;
            border-radius: 10px;
            text-align: center;
          }
          .feature i {
            font-size: 2rem;
            margin-bottom: 10px;
          }
          .instructions {
            background: rgba(255, 255, 255, 0.1);
            padding: 20px;
            border-radius: 10px;
            margin: 20px 0;
          }
          ol {
            padding-right: 20px;
            margin: 10px 0;
          }
          li {
            margin-bottom: 10px;
          }
          .bot-link {
            display: inline-block;
            background: #0088cc;
            color: white;
            text-decoration: none;
            padding: 15px 30px;
            border-radius: 10px;
            font-size: 1.2rem;
            margin-top: 20px;
            transition: transform 0.3s;
          }
          .bot-link:hover {
            transform: translateY(-5px);
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            opacity: 0.8;
            font-size: 0.9rem;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🤖 Facebook Video Downloader Bot</h1>
          
          <div class="status">
            ✅ البوت يعمل بشكل طبيعي
            <br>
            <small>آخر تحديث: ${new Date().toLocaleString('ar-SA')}</small>
          </div>
          
          <div class="features">
            <div class="feature">
              <div>⚡</div>
              <h3>سرعة عالية</h3>
              <p>استخراج سريع للفيديوهات</p>
            </div>
            <div class="feature">
              <div>🎥</div>
              <h3>جودة HD</h3>
              <p>أفضل جودة متاحة</p>
            </div>
            <div class="feature">
              <div>🔒</div>
              <h3>آمن</h3>
              <p>لا يتم حفظ الفيديوهات</p>
            </div>
            <div class="feature">
              <div>🆓</div>
              <h3>مجاني</h3>
              <p>خدمة مجانية بالكامل</p>
            </div>
          </div>
          
          <div class="instructions">
            <h3>📋 طريقة الاستخدام:</h3>
            <ol>
              <li>انضم إلى البوت على Telegram</li>
              <li>أرسل رابط فيديو Facebook</li>
              <li>انتظر حتى يتم تحليل الرابط</li>
              <li>استلم الفيديو جاهزاً للتحميل</li>
            </ol>
          </div>
          
          <div style="text-align: center;">
            <a href="https://t.me/${process.env.BOT_USERNAME || 'YOUR_BOT_USERNAME'}" 
               class="bot-link" 
               target="_blank">
              🔗 ابدأ استخدام البوت الآن
            </a>
          </div>
          
          <div class="footer">
            <p>تم التطوير باستخدام Node.js & Vercel</p>
            <p>© ${new Date().getFullYear()} - جميع الحقوق محفوظة</p>
          </div>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    console.error('❌ Webhook handler error:', error);
    res.status(500).json({ 
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
};
