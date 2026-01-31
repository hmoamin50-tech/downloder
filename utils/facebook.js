import axios from "axios";
import * as cheerio from "cheerio";

export async function extractFacebookVideo(url) {
  try {
    // تنظيف الرابط
    const cleanUrl = url.trim();
    
    // إرسال طلب HTTP مع headers لجعل Facebook يعتقد أننا متصفح
    const response = await axios.get(cleanUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
      },
      timeout: 10000
    });

    const html = response.data;
    const $ = cheerio.load(html);

    // البحث عن رابط الفيديو في الصفحة
    let videoUrl = null;
    let title = "Facebook Video";
    let quality = "HD";

    // الطريقة 1: البحث في og:video meta tag
    videoUrl = $('meta[property="og:video"]').attr('content') || 
                $('meta[property="og:video:url"]').attr('content');

    // الطريقة 2: البحث في مصادر الفيديو
    if (!videoUrl) {
      $('video').each((i, elem) => {
        const src = $(elem).attr('src');
        if (src && src.includes('.mp4')) {
          videoUrl = src;
          return false;
        }
      });
    }

    // الطريقة 3: البحث في الروابط في الصفحة
    if (!videoUrl) {
      const links = [];
      $('a[href*=".mp4"], source[src*=".mp4"]').each((i, elem) => {
        const href = $(elem).attr('href') || $(elem).attr('src');
        if (href && !links.includes(href)) {
          links.push(href);
        }
      });

      if (links.length > 0) {
        videoUrl = links[0];
      }
    }

    // استخراج العنوان
    const pageTitle = $('title').text() || 
                     $('meta[property="og:title"]').attr('content') ||
                     $('meta[name="title"]').attr('content');
    
    if (pageTitle) {
      title = pageTitle.replace(' | Facebook', '').trim();
    }

    // إضافة HTTPS إذا كان الرابط بدون بروتوكول
    if (videoUrl && videoUrl.startsWith('//')) {
      videoUrl = 'https:' + videoUrl;
    }

    // استخدام خدمة خارجية كبديل إذا لزم الأمر
    if (!videoUrl) {
      return await tryExternalService(cleanUrl);
    }

    return {
      success: true,
      videoUrl,
      title,
      quality,
      source: 'facebook',
      originalUrl: cleanUrl
    };

  } catch (error) {
    console.error('Error extracting video:', error);
    
    // المحاولة باستخدام خدمة بديلة
    return await tryExternalService(url);
  }
}

// دالة استخدام خدمة خارجية كبديل
async function tryExternalService(url) {
  try {
    // يمكنك استخدام أي خدمة API متاحة لتحميل فيديوهات Facebook
    // مثال: fdownloader.net أو getfvid.com
    const services = [
      `https://fdownloader.net/api/ajaxSearch?q=${encodeURIComponent(url)}`,
      // أضف خدمات أخرى هنا
    ];

    for (const service of services) {
      try {
        const response = await axios.get(service, { timeout: 8000 });
        if (response.data && response.data.videoUrl) {
          return {
            success: true,
            videoUrl: response.data.videoUrl,
            title: response.data.title || "Facebook Video",
            quality: response.data.quality || "HD",
            source: 'external_service'
          };
        }
      } catch (e) {
        continue;
      }
    }

    return {
      success: false,
      error: "Unable to extract video from this link",
      message: "Please make sure the video is public and try again"
    };

  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}
