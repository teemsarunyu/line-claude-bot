require('dotenv').config();

const express = require('express');
const line = require('@line/bot-sdk');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();

// ==================== Configuration ====================
const lineConfig = {
  channelSecret: process.env.LINE_CHANNEL_SECRET,
  channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
};

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const client = new line.Client(lineConfig);

const CLAUDE_CONFIG = {
  model: 'claude-sonnet-4-20250514',
  maxTokens: 1000,
  systemPrompt: 'คุณคือผู้ช่วย AI ที่เป็นมิตรและตอบคำถามเป็นภาษาไทย',
};

const ERROR_MESSAGE = 'ขออภัยครับ เกิดข้อผิดพลาดในการประมวลผล กรุณาลองใหม่อีกครั้ง 🙏';

// ==================== Routes ====================
app.get('/', (req, res) => {
  res.send('LINE Bot is running!');
});

app.post('/webhook', line.middleware(lineConfig), async (req, res) => {
  try {
    await Promise.all(req.body.events.map(handleEvent));
    res.json({ success: true });
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(500).end();
  }
});

// ==================== Event Handlers ====================
async function handleEvent(event) {
  // Support text messages only
  if (event.type !== 'message' || event.message.type !== 'text') {
    return null;
  }

  const userMessage = event.message.text;
  console.log('User message:', userMessage);

  try {
    const response = await getClaudeResponse(userMessage);
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: response,
    });
  } catch (error) {
    console.error('Error calling Claude API:', error);
    return client.replyMessage(event.replyToken, {
      type: 'text',
      text: ERROR_MESSAGE,
    });
  }
}

// ==================== Helper Functions ====================
async function getClaudeResponse(userMessage) {
  const response = await anthropic.messages.create({
    model: CLAUDE_CONFIG.model,
    max_tokens: CLAUDE_CONFIG.maxTokens,
    system: CLAUDE_CONFIG.systemPrompt,
    messages: [
      {
        role: 'user',
        content: userMessage,
      },
    ],
  });

  const replyText = response.content[0].text;
  console.log('Claude response:', replyText);

  return replyText;
}

// ==================== Server ====================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
  console.log(`📝 Webhook URL will be: https://YOUR_DOMAIN/webhook`);
});
