const axios = require('axios');
const cheerio = require('cheerio');

async function extractFacebookVideo(url) {
  try {
    // تنظيف الرابط
    const cleanUrl = url.trim();
    console.log('🔍 Processing URL:', cleanUrl);

    // إرسال طلب HTTP مع headers محسنة
    const response = await axios.get(cleanUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Cache-Control': 'max-age=0',
        'Referer': 'https://www.facebook.com/'
      },
      timeout: 15000,
      maxRedirects: 5
    });

    const html = response.data;
    console.log('📄 HTML Length:', html.length);

    const $ = cheerio.load(html);

    // البحث عن رابط الفيديو بطرق متعددة
    let videoUrl = null;
    let title = "Facebook Video";
    let quality = "HD";
    let thumbnail = null;

    // الطريقة 1: البحث في meta tags (الأكثر فعالية)
    videoUrl = $('meta[property="og:video"]').attr('content') ||
               $('meta[property="og:video:url"]').attr('content') ||
               $('meta[property="og:video:secure_url"]').attr('content');

    console.log('🔍 Video URL from meta tags:', videoUrl);

    // الطريقة 2: البحث في scripts (للحصول على البيانات JSON)
    if (!videoUrl) {
      const scripts = $('script');
      scripts.each((i, elem) => {
        const scriptContent = $(elem).html();
        if (scriptContent && scriptContent.includes('video_url')) {
          // البحث عن video_url في JSON
          const videoUrlMatch = scriptContent.match(/"video_url":"([^"]+)"/);
          if (videoUrlMatch && videoUrlMatch[1]) {
            videoUrl = videoUrlMatch[1].replace(/\\\//g, '/');
            console.log('🔍 Found video_url in script:', videoUrl);
          }
          
          // البحث عن sd_src (جودة قياسية)
          if (!videoUrl) {
            const sdSrcMatch = scriptContent.match(/"sd_src":"([^"]+)"/);
            if (sdSrcMatch && sdSrcMatch[1]) {
              videoUrl = sdSrcMatch[1].replace(/\\\//g, '/');
              console.log('🔍 Found sd_src in script:', videoUrl);
            }
          }
          
          // البحث عن hd_src (جودة عالية)
          if (!videoUrl) {
            const hdSrcMatch = scriptContent.match(/"hd_src":"([^"]+)"/);
            if (hdSrcMatch && hdSrcMatch[1]) {
              videoUrl = hdSrcMatch[1].replace(/\\\//g, '/');
              quality = "HD";
              console.log('🔍 Found hd_src in script:', videoUrl);
            }
          }
        }
      });
    }

    // الطريقة 3: البحث في iframe/video tags
    if (!videoUrl) {
      // البحث في iframe
      $('iframe').each((i, elem) => {
        const src = $(elem).attr('src');
        if (src && src.includes('video') && src.includes('fbcdn')) {
          videoUrl = src;
          console.log('🔍 Found video in iframe:', videoUrl);
        }
      });

      // البحث في video tags
      $('video').each((i, elem) => {
        const src = $(elem).attr('src');
        if (src && src.includes('.mp4')) {
          videoUrl = src;
          console.log('🔍 Found video in video tag:', videoUrl);
        }
      });
    }

    // الطريقة 4: البحث في جميع الروابط
    if (!videoUrl) {
      const links = [];
      $('a[href*=".mp4"], source[src*=".mp4"], link[href*=".mp4"]').each((i, elem) => {
        const href = $(elem).attr('href') || $(elem).attr('src');
        if (href && !links.includes(href) && (href.includes('fbcdn') || href.includes('video'))) {
          links.push(href);
        }
      });

      if (links.length > 0) {
        videoUrl = links[0];
        console.log('🔍 Found video in links:', videoUrl);
      }
    }

    // استخراج العنوان
    const pageTitle = $('title').text() ||
                     $('meta[property="og:title"]').attr('content') ||
                     $('meta[name="title"]').attr('content') ||
                     $('meta[property="twitter:title"]').attr('content');

    if (pageTitle) {
      title = pageTitle.replace('| Facebook', '')
                       .replace('فيسبوك', '')
                       .replace('Facebook', '')
                       .trim()
                       .substring(0, 200);
    }

    // استخراج صورة المصغرة
    thumbnail = $('meta[property="og:image"]').attr('content') ||
                $('meta[name="twitter:image"]').attr('content') ||
                $('meta[property="twitter:image:src"]').attr('content');

    // استخراج معلومات إضافية
    const description = $('meta[property="og:description"]').attr('content') ||
                       $('meta[name="description"]').attr('content');

    const author = $('meta[property="article:author"]').attr('content') ||
                   $('meta[name="author"]').attr('content') ||
                   "Facebook";

    // معالجة رابط الفيديو
    if (videoUrl) {
      // إضافة HTTPS إذا كان الرابط بدون بروتوكول
      if (videoUrl.startsWith('//')) {
        videoUrl = 'https:' + videoUrl;
      }
      
      // إزالة backslashes
      videoUrl = videoUrl.replace(/\\\//g, '/');
      
      // إزالة query parameters غير ضرورية
      try {
        const urlObj = new URL(videoUrl);
        urlObj.searchParams.delete('_nc_cat');
        urlObj.searchParams.delete('_nc_oc');
        urlObj.searchParams.delete('_nc_ht');
        urlObj.searchParams.delete('oh');
        urlObj.searchParams.delete('oe');
        videoUrl = urlObj.toString();
      } catch (e) {
        console.log('⚠️ URL processing error:', e.message);
      }

      console.log('✅ Final video URL:', videoUrl);

      return {
        success: true,
        videoUrl: videoUrl,
        title: title,
        description: description,
        author: author,
        quality: quality,
        thumbnail: thumbnail,
        sourceUrl: cleanUrl
      };
    } else {
      console.log('❌ No video URL found, trying alternative methods...');
      
      // المحاولة باستخدام خدمة خارجية كبديل
      return await tryExternalService(cleanUrl);
    }

  } catch (error) {
    console.error('❌ Error extracting video:', error.message);
    console.error('Error stack:', error.stack);
    
    return {
      success: false,
      error: error.message,
      message: "Failed to extract video from this link"
    };
  }
}

// دالة استخدام خدمة خارجية كبديل
async function tryExternalService(url) {
  try {
    console.log('🔄 Trying external service for URL:', url);
    
    // قائمة بخدمات API البديلة
    const services = [
      {
        url: 'https://www.getfvid.com/downloader',
        method: 'POST',
        data: { url: url }
      },
      {
        url: 'https://fdownloader.net/api/ajaxSearch',
        method: 'POST',
        data: { q: url }
      },
      {
        url: 'https://api.snaptik.site/video',
        method: 'GET',
        params: { url: url }
      }
    ];

    for (const service of services) {
      try {
        console.log(`🔧 Trying service: ${service.url}`);
        
        const response = await axios({
          method: service.method,
          url: service.url,
          data: service.data,
          params: service.params,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json, text/plain, */*',
            'Origin': 'https://www.getfvid.com',
            'Referer': 'https://www.getfvid.com/'
          },
          timeout: 10000
        });

        console.log('Service response:', JSON.stringify(response.data).substring(0, 200));

        // محاولة استخراج رابط الفيديو من الاستجابة
        let videoUrl = null;
        
        if (response.data && typeof response.data === 'object') {
          // البحث في الكائن
          const findVideoUrl = (obj) => {
            for (const key in obj) {
              if (typeof obj[key] === 'string' && 
                  (obj[key].includes('.mp4') || obj[key].includes('video')) &&
                  obj[key].includes('http')) {
                return obj[key];
              } else if (typeof obj[key] === 'object') {
                const found = findVideoUrl(obj[key]);
                if (found) return found;
              }
            }
            return null;
          };
          
          videoUrl = findVideoUrl(response.data);
        }

        if (videoUrl) {
          console.log('✅ Found video URL from external service:', videoUrl);
          return {
            success: true,
            videoUrl: videoUrl,
            title: "Facebook Video (via external service)",
            quality: "HD",
            source: 'external_service',
            sourceUrl: url
          };
        }
      } catch (serviceError) {
        console.log(`⚠️ Service ${service.url} failed:`, serviceError.message);
        continue;
      }
    }

    return {
      success: false,
      error: "Unable to extract video using any method",
      message: "Please try a different video or check if the video is public"
    };

  } catch (error) {
    console.error('❌ External service error:', error.message);
    return {
      success: false,
      error: error.message,
      message: "All extraction methods failed"
    };
  }
}

module.exports = { extractFacebookVideo };
