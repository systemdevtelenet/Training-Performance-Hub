const fs = require('fs');
const path = require('path');

const envFile = fs.readFileSync(path.resolve(process.cwd(), '.env.local'), 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const [k, v] = line.split('=');
  if (k && v) env[k.trim()] = v.trim();
});

const apiKey = env.OPENROUTER_API_KEY;

async function testIntent() {
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
        {
          role: 'system',
          content: `Role: CTNP AI Copilot.
State: {"app":"CTNP Training Performance Hub","metrics":{"trainees":180,"inhouse":79,"pst":101,"trainers":22},"routes":{"traffic_lights":"/traffic-lights"}}
Instructions:
- If user requests navigation, prefix response with "NAV:<route_path> | " followed by a brief 1-sentence response.
- Example: "NAV:/traffic-lights | Navigating to Traffic Light Monitoring dashboard."`
        },
        { role: 'user', content: 'go to traffic lights' }
      ],
      max_tokens: 50
    }),
  });

  const data = await response.json();
  console.log('OUTPUT TOKENS USED:', data.usage?.completion_tokens);
  console.log('COMPACT INTENT RESPONSE:', data.choices?.[0]?.message?.content);
}

testIntent().catch(console.error);
