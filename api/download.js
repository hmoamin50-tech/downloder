import axios from "axios";

export default async function handler(req, res) {
  try {
    const { url } = req.query;

    if (!url) {
      return res.status(400).send("❌ الرابط مطلوب");
    }

    // جلب الفيديو
    const response = await axios({
      method: 'GET',
      url: decodeURIComponent(url),
      responseType: 'stream',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'https://www.facebook.com/'
      }
    });

    // إعداد رؤوس الاستجابة
    res.setHeader('Content-Type', response.headers['content-type'] || 'video/mp4');
    res.setHeader('Content-Length', response.headers['content-length'] || '');
    res.setHeader('Content-Disposition', `attachment; filename="facebook_video_${Date.now()}.mp4"`);
    res.setHeader('Cache-Control', 'public, max-age=86400');

    // إرسال الفيديو
    response.data.pipe(res);

  } catch (error) {
    console.error('Download error:', error);
    res.status(500).send(`
      <html dir="rtl">
      <body style="text-align: center; padding: 50px; font-family: Arial;">
        <h1>❌ خطأ في التحميل</h1>
        <p>تعذر تحميل الفيديو. يرجى:</p>
        <ol style="text-align: right; display: inline-block;">
          <li>التأكد من أن الرابط صحيح</li>
          <li>المحاولة مرة أخرى لاحقاً</li>
          <li>استخدام فيديو آخر</li>
        </ol>
        <br><br>
        <a href="/" style="background: #0088cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
          العودة للصفحة الرئيسية
        </a>
      </body>
      </html>
    `);
  }
      }
