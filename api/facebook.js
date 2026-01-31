const axios = require('axios');
const cheerio = require('cheerio');

async function extractFacebookVideo(url) {
  try {
    console.log('🔍 Starting extraction for:', url);
    
    // تنظيف الرابط
    const cleanUrl = url.trim();
    
    // إرسال طلب HTTP مع headers
    const response = await axios.get(cleanUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://www.facebook.com/',
        'DNT': '1',
        'Connection': 'keep-alive'
      },
      timeout: 15000
    });

    const html = response.data;
    console.log('📄 HTML received, length:', html.length);
    
    const $ = cheerio.load(html);

    // البحث عن رابط الفيديو
    let videoUrl = null;
    
    // الطريقة 1: من meta tags
    videoUrl = $('meta[property="og:video"]').attr('content') ||
               $('meta[property="og:video:url"]').attr('content') ||
               $('meta[property="og:video:secure_url"]').attr('content');

    console.log('🔍 From meta tags:', videoUrl);

    // الطريقة 2: من scripts (JSON data)
    if (!videoUrl) {
      const scripts = $('script');
      scripts.each((i, elem) => {
        const scriptContent = $(elem).html();
        if (scriptContent && scriptContent.includes('video_url')) {
          // البحث عن video_url
          const videoUrlMatch = scriptContent.match(/"video_url":"([^"]+)"/);
          if (videoUrlMatch && videoUrlMatch[1]) {
            videoUrl = videoUrlMatch[1].replace(/\\\//g, '/');
            console.log('🔍 Found video_url in script');
          }
          
          // البحث عن sd_src
          if (!videoUrl) {
            const sdSrcMatch = scriptContent.match(/"sd_src":"([^"]+)"/);
            if (sdSrcMatch && sdSrcMatch[1]) {
              videoUrl = sdSrcMatch[1].replace(/\\\//g, '/');
              console.log('🔍 Found sd_src in script');
            }
          }
          
          // البحث عن hd_src
          if (!videoUrl) {
            const hdSrcMatch = scriptContent.match(/"hd_src":"([^"]+)"/);
            if (hdSrcMatch && hdSrcMatch[1]) {
              videoUrl = hdSrcMatch[1].replace(/\\\//g, '/');
              console.log('🔍 Found hd_src in script');
            }
          }
        }
      });
    }

    // الطريقة 3: من video tags
    if (!videoUrl) {
      $('video').each((i, elem) => {
        const src = $(elem).attr('src');
        if (src && src.includes('.mp4')) {
          videoUrl = src;
          console.log('🔍 Found in video tag');
        }
      });
    }

    // معالجة رابط الفيديو
    if (videoUrl) {
      // إضافة HTTPS إذا لزم الأمر
      if (videoUrl.startsWith('//')) {
        videoUrl = 'https:' + videoUrl;
      }
      
      // تنظيف الرابط
      videoUrl = videoUrl.replace(/\\\//g, '/');
      
      console.log('✅ Final video URL:', videoUrl);

      // استخراج معلومات إضافية
      const title = $('meta[property="og:title"]').attr('content') ||
                    $('title').text() ||
                    'فيديو Facebook';
      
      const quality = $('meta[property="og:video:height"]').attr('content') ? 
                     `HD (${$('meta[property="og:video:width"]').attr('content')}x${$('meta[property="og:video:height"]').attr('content')})` : 
                     'متوسطة';
      
      const author = $('meta[property="article:author"]').attr('content') ||
                     $('meta[name="author"]').attr('content') ||
                     'Facebook';
      
      const thumbnail = $('meta[property="og:image"]').attr('content');

      return {
        success: true,
        videoUrl: videoUrl,
        title: title.replace('| Facebook', '').trim(),
        quality: quality,
        author: author,
        thumbnail: thumbnail,
        sourceUrl: cleanUrl
      };
    }

    // إذا لم نجد الفيديو
    console.log('❌ No video URL found');
    return {
      success: false,
      error: 'لم يتم العثور على رابط الفيديو',
      message: 'قد يكون الفيديو خاصاً أو الرابط غير صحيح'
    };

  } catch (error) {
    console.error('❌ Error extracting video:', error.message);
    
    return {
      success: false,
      error: error.message,
      message: 'حدث خطأ أثناء معالجة الرابط'
    };
  }
}

module.exports = { extractFacebookVideo };
