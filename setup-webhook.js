import axios from 'axios';

const BOT_TOKEN = process.env.BOT_TOKEN;
const VERCEL_URL = process.env.VERCEL_URL;

async function setupWebhook() {
  if (!BOT_TOKEN) {
    console.error('❌ BOT_TOKEN غير معرف في متغيرات البيئة');
    return;
  }
  
  if (!VERCEL_URL) {
    console.error('❌ VERCEL_URL غير معرف');
    return;
  }
  
  const webhookUrl = `https://${VERCEL_URL}/api/bot`;
  
  console.log('🚀 بداية إعداد Webhook...');
  console.log(`📌 رابط البوت: ${webhookUrl}`);
  
  try {
    // 1. حذف أي Webhook قديم
    console.log('🗑️ جاري حذف Webhook القديم...');
    await axios.get(`https://api.telegram.org/bot${BOT_TOKEN}/deleteWebhook`);
    console.log('✅ تم حذف Webhook القديم');
    
    // 2. إعداد Webhook جديد
    console.log('🔧 جاري إعداد Webhook جديد...');
    const response = await axios.get(
      `https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=${encodeURIComponent(webhookUrl)}`
    );
    
    console.log('✅ تم إعداد Webhook:', response.data.description);
    
    // 3. التحقق من حالة Webhook
    console.log('🔍 جاري التحقق من حالة Webhook...');
    const info = await axios.get(
      `https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo`
    );
    
    console.log('📊 معلومات Webhook:');
    console.log('- URL:', info.data.result.url);
    console.log('- Active:', info.data.result.pending_update_count === 0 ? 'نشط' : 'غير نشط');
    
    // 4. اختصار لإعداد Webhook من المتصفح
    console.log('\n🌐 *لإعداد Webhook يدوياً:*');
    console.log(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook?url=${encodeURIComponent(webhookUrl)}`);
    
  } catch (error) {
    console.error('❌ خطأ:', error.response?.data || error.message);
  }
}

setupWebhook();
