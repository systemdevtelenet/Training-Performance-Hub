import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const OPENROUTER_MODELS = [
  'google/gemini-3.7-flash',
  'deepseek/deepseek-v4-flash-0731',
  'meta-llama/llama-3.3-70b-instruct'
];

export async function POST(req: Request) {
  try {
    const { message, history } = await req.json();
    const apiKey = process.env.OPENROUTER_API_KEY;

    // Fetch live system context from Supabase to feed into the AI
    const { count: inhouseCount } = await supabase.from('inhouse').select('*', { count: 'exact', head: true });
    const { count: pstCount } = await supabase.from('product_spec_training').select('*', { count: 'exact', head: true });
    const { count: trainersCount } = await supabase.from('trainers').select('*', { count: 'exact', head: true });

    const totalTrainees = (inhouseCount || 0) + (pstCount || 0);

    // Compact Variable Injection for Token Efficiency
    const sysState = {
      app: "CTNP Training Performance Hub",
      metrics: { trainees: totalTrainees, inhouse: inhouseCount, pst: pstCount, trainers: trainersCount || 22 },
      routes: {
        dashboard: "/",
        trainees: "/trainees",
        trainers: "/trainers",
        reliability: "/trainers?tab=reliability",
        traffic_lights: "/traffic-lights",
        analytics: "/analytics",
        activity: "/history"
      }
    };

    const systemPrompt = `You are the CTNP AI Operations Assistant for Cebu Tele-Net.
Live Data Variables:
${JSON.stringify(sysState, null, 2)}

Strict Guidelines for Maximum Accuracy:
1. Always base all numbers, statistics, and counts strictly on the Live Data Variables above. Never guess or hallucinate numbers.
2. Respond in clear, professional, natural sentences to the user.
3. If the user asks to navigate (e.g. "go to traffic lights", "show trainers", "check trainees"), include the exact route path from 'routes' using the format "NAV:<route_path> | <natural sentence response>".
   Example: "NAV:/traffic-lights | I will take you to the Traffic Light Monitoring dashboard."`;

    // Lightning Fast-Path Navigation Engine (<50ms response time)
    const textLower = message.toLowerCase();
    if (textLower.includes('trainer') || textLower.includes('reliability') || textLower.includes('attendance')) {
      return NextResponse.json({
        reply: `Navigating to the Trainer Reliability & Attendance dashboard where you can monitor live attendance metrics for all ${trainersCount || 22} trainers.`,
        action: { type: 'navigate', path: '/trainers?tab=reliability' },
        modelUsed: 'Fast-Path Operations Engine'
      });
    } else if (textLower.includes('traffic') || textLower.includes('light')) {
      return NextResponse.json({
        reply: "Launching Traffic Light Monitoring dashboard for real-time risk alerts.",
        action: { type: 'navigate', path: '/traffic-lights' },
        modelUsed: 'Fast-Path Operations Engine'
      });
    } else if (textLower.includes('trainee') || textLower.includes('batch')) {
      return NextResponse.json({
        reply: `Opening Trainees Directory for ${totalTrainees} active trainees across In-House and PST programs.`,
        action: { type: 'navigate', path: '/trainees' },
        modelUsed: 'Fast-Path Operations Engine'
      });
    } else if (textLower.includes('analytics') || textLower.includes('trend')) {
      return NextResponse.json({
        reply: "Opening Performance Analytics & Trends dashboard.",
        action: { type: 'navigate', path: '/analytics' },
        modelUsed: 'Fast-Path Operations Engine'
      });
    }

    if (!apiKey) {
      return NextResponse.json({
        reply: "I am ready to help! To enable my 3-agent OpenRouter AI engine (Gemini 3.7 Flash + DeepSeek V4 + Llama 3.3), please add `OPENROUTER_API_KEY` to your `.env.local`.",
        action: null,
        modelUsed: 'Smart Local Engine'
      });
    }

    // Try OpenRouter models sequentially with 3-agent fallback pipeline
    for (const model of OPENROUTER_MODELS) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000);

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          signal: controller.signal,
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': 'http://localhost:3000',
            'X-Title': 'Training Performance Hub',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: model,
            messages: [
              { role: 'system', content: systemPrompt },
              ...(history || []),
              { role: 'user', content: message }
            ],
            temperature: 0.3,
            max_tokens: 1000
          }),
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          let replyText = data.choices?.[0]?.message?.content || "No response generated.";
          
          let action = null;
          if (replyText.startsWith('NAV:')) {
            const parts = replyText.split('|');
            const navPath = parts[0].replace('NAV:', '').trim();
            const cleanMessage = parts.slice(1).join('|').trim();
            action = { type: 'navigate', path: navPath };
            replyText = cleanMessage || `Navigating to ${navPath}`;
          } else {
            const textLower = replyText.toLowerCase();
            if (textLower.includes('/traffic-lights')) action = { type: 'navigate', path: '/traffic-lights' };
            else if (textLower.includes('/trainers')) action = { type: 'navigate', path: '/trainers' };
            else if (textLower.includes('/trainees')) action = { type: 'navigate', path: '/trainees' };
            else if (textLower.includes('/analytics')) action = { type: 'navigate', path: '/analytics' };
          }

          return NextResponse.json({
            reply: replyText,
            action,
            modelUsed: model
          });
        }
      } catch (err) {
        console.warn(`Model ${model} failed, trying fallback...`, err);
      }
    }

    return NextResponse.json({
      reply: "Sorry, all AI backup agents are currently unreachable. Please check your network connection.",
      modelUsed: 'Error Fallback'
    });

  } catch (error: any) {
    console.error('Error in Copilot API:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
