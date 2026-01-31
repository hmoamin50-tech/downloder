const axios = require('axios');

module.exports = async (req, res) => {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).send(`
        <html dir="rtl">
        <body style="font-family: Arial; padding: 50px; text-align: center;">
          <h1>❌ رابط مطلوب</h1>
          <p>يرجى إضافة رابط الفيديو كمعامل في العنوان.</p>
          <p>مثال: /api/download?url=رابط_الفيديو</p>
        </body>
        </html>
      `);
    }

    const videoUrl = decodeURIComponent(url);
    console.log('📥 Download request for:', videoUrl);

    // جلب معلومات الفيديو
    const headResponse = await axios.head(videoUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.facebook.com/',
        'Accept': '*/*'
      },
      timeout: 10000
    });

    const contentType = headResponse.headers['content-type'] || 'video/mp4';
    const contentLength = headResponse.headers['content-length'];
    const contentDisposition = `attachment; filename="facebook_video_${Date.now()}.mp4"`;

    // إعداد الرد
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', contentLength || '');
    res.setHeader('Content-Disposition', contentDisposition);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // جلب وإرسال الفيديو
    const videoResponse = await axios({
      method: 'GET',
      url: videoUrl,
      responseType: 'stream',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.facebook.com/'
      }
    });

    videoResponse.data.pipe(res);

  } catch (error) {
    console.error('❌ Download error:', error.message);
    
    res.status(500).send(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>❌ خطأ في التحميل</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            text-align: center;
            padding: 50px;
            background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%);
            color: white;
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
          }
          .container {
            background: rgba(255, 255, 255, 0.1);
            padding: 30px;
            border-radius: 15px;
            backdrop-filter: blur(10px);
            max-width: 600px;
          }
          h1 {
            font-size: 2rem;
            margin-bottom: 20px;
          }
          .error-details {
            background: rgba(255, 255, 255, 0.2);
            padding: 15px;
            border-radius: 10px;
            margin: 20px 0;
            text-align: right;
            font-family: monospace;
            font-size: 0.9rem;
            word-break: break-all;
          }
          .solutions {
            text-align: right;
            margin: 20px 0;
          }
          ol {
            padding-right: 20px;
          }
          li {
            margin-bottom: 10px;
          }
          .btn {
            display: inline-block;
            background: white;
            color: #ff6b6b;
            padding: 12px 25px;
            border-radius: 8px;
            text-decoration: none;
            margin: 10px;
            font-weight: bold;
            transition: transform 0.3s;
          }
          .btn:hover {
            transform: scale(1.05);
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>❌ خطأ في تحميل الفيديو</h1>
          
          <div class="error-details">
            ${error.message || 'خطأ غير معروف'}
          </div>
          
          <div class="solutions">
            <h3>🔧 الحلول المقترحة:</h3>
            <ol>
              <li>تحقق من اتصال الإنترنت</li>
              <li>جرب رابط فيديو آخر</li>
              <li>انتظر قليلاً وحاول مرة أخرى</li>
              <li>تأكد أن الفيديو لا يزال متاحاً</li>
              <li>جرب استخدام البوت مباشرة على Telegram</li>
            </ol>
          </div>
          
          <div>
            <a href="/" class="btn">🏠 العودة للرئيسية</a>
            <a href="https://t.me/${process.env.BOT_USERNAME || 'YOUR_BOT_USERNAME'}" 
               class="btn" 
               target="_blank">
              🤖 استخدام البوت
            </a>
          </div>
        </div>
      </body>
      </html>
    `);
  }
};
