const express = require('express');
const line = require('@line/bot-sdk');
const Anthropic = require('@anthropic-ai/sdk');

// Load .env only in development
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const app = express();

// ตรวจสอบ environment variables
console.log('🔍 Environment Check:');
console.log('LINE_CHANNEL_SECRET:', process.env.LINE_CHANNEL_SECRET ? '✅' : '❌');
console.log('LINE_CHANNEL_ACCESS_TOKEN:', process.env.LINE_CHANNEL_ACCESS_TOKEN ? '✅' : '❌');
console.log('ANTHROPIC_API_KEY:', process.env.ANTHROPIC_API_KEY ? '✅' : '❌');

// LINE Configuration
const lineConfig = {
  channelSecret: process.env.LINE_CHANNEL_SECRET,
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN
};

// Claude Configuration - สร้าง instance ที่นี่!
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const client = new line.Client(lineConfig);

// Health check endpoint
app.get('/', (req, res) => {
  res.send('✅ LINE Bot is running!');
});

// Webhook endpoint
app.post('/webhook', line.middleware(lineConfig), async (req, res) => {
  try {
    const results = await Promise.all(
      req.body.events.map(handleEvent)
    );
    res.json({ success: true });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Handle incoming events
async function handleEvent(event) {
  // รองรับเฉพาะข้อความ text
  if (event.type !== 'message' || event.message.type !== 'text') {
    return null;
  }

  const userMessage = event.message.text;
  console.log('📩 User message:', userMessage);
  
  try {
    // เรียก Claude API
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content: userMessage
      }],
      system: 'คุณคือผู้ช่วย AI ที่เป็นมิตรและตอบคำถามเป็นภาษาไทย'
    });

    const replyText = response.content[0].text;
    console.log('🤖 Claude response:', replyText);

    // ตอบกลับผ่าน LINE
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: replyText
    });

  } catch (error) {
    console.error('❌ Error calling Claude API:', error.message);
    console.error('❌ Error details:', error);
    
    // ส่งข้อความ error กลับไปยัง user
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: 'ขออภัยครับ เกิดข้อผิดพลาดในการประมวลผล กรุณาลองใหม่อีกครั้ง 🙏'
    });
  }
}

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Server is running on port ${PORT}`);
  console.log(`📝 Webhook URL: https://YOUR_DOMAIN/webhook`);
});

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});