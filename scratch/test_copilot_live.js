const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const [k, v] = line.split('=');
  if (k && v) env[k.trim()] = v.trim();
});

const apiKey = env.OPENROUTER_API_KEY;

async function testCopilot() {
  console.log('Testing OpenRouter key:', apiKey ? 'KEY PRESENT' : 'NO KEY');

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': 'http://localhost:3000',
      'X-Title': 'Training Performance Hub',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'google/gemini-3.7-flash',
      messages: [
        { role: 'system', content: 'You are the AI Operations Copilot for Cebu Tele-Net.' },
        { role: 'user', content: 'Hello! Are you active?' }
      ],
      max_tokens: 100
    }),
  });

  const data = await response.json();
  console.log('OPENROUTER LIVE RESPONSE:');
  console.log(data.choices?.[0]?.message?.content || data);
}

testCopilot().catch(console.error);
