import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createClient as createAuthClient } from '@/utils/supabase/server';
import { getDashboardData } from '@/lib/data-fetcher';
import { calculateRosterAttrition, getFilteredData } from '@/lib/analytics-utils';

const OPENROUTER_MODELS = [
  'google/gemini-3.7-flash',
  'deepseek/deepseek-v4-flash-0731'
];

function getNavigationIntent(message: string) {
  const text = message.toLowerCase();
  if (!/\b(go to|open|show|take me to|navigate|view|launch|bring me to)\b/.test(text)) return null;

  if (/\b(analytics|trends?|performance trends)\b/.test(text)) {
    return { path: '/analytics', reply: 'Opening Performance Analytics & Trends dashboard.' };
  }
  if (/\b(traffic lights?|risk alerts?)\b/.test(text)) {
    return { path: '/traffic-lights', reply: 'Opening the Traffic Light Monitoring dashboard.' };
  }
  if (/\b(trainer reliability|trainer attendance|reliability|attendance)\b/.test(text)) {
    return { path: '/trainers?tab=reliability', reply: 'Opening Trainer Reliability & Attendance.' };
  }
  if (/\btrainers?\b/.test(text)) {
    return { path: '/trainers', reply: 'Opening the Trainers Directory.' };
  }
  if (/\b(trainees?|batches?)\b/.test(text)) {
    return { path: '/trainees', reply: 'Opening the Trainees Directory.' };
  }
  if (/\b(activity log|history)\b/.test(text)) {
    return { path: '/history', reply: 'Opening Activity History.' };
  }
  if (/\bdashboard\b/.test(text)) {
    return { path: '/', reply: 'Opening the Training Performance Hub dashboard.' };
  }
  return null;
}

async function getCopilotAccess() {
  const authClient = await createAuthClient();
  const { data: { user }, error: authError } = await authClient.auth.getUser();
  if (authError || !user?.email) return { authenticated: false, admin: false };

  const [employeeResult, assignedRoleResult] = await Promise.all([
    supabase
      .from('employees')
      .select('roles!employees_role_id_fkey(role_name), positions!employees_position_id_fkey(position_code, position_name)')
      .ilike('employee_email', user.email)
      .maybeSingle(),
    supabase
      .from('user_roles')
      .select('role')
      .ilike('email', user.email)
      .maybeSingle()
  ]);

  const employee = employeeResult.data as any;
  const employeeRole = Array.isArray(employee?.roles) ? employee.roles[0] : employee?.roles;
  const employeePosition = Array.isArray(employee?.positions) ? employee.positions[0] : employee?.positions;
  const grantedRole = String(assignedRoleResult.data?.role || '').toUpperCase();
  const roleName = String(employeeRole?.role_name || '').toUpperCase();
  const position = `${employeePosition?.position_code || ''} ${employeePosition?.position_name || ''}`.toUpperCase();
  const admin = ['SUPER_ADMIN', 'HOT_ADMIN', 'QAS_ADMIN', 'VIEW_ADMIN'].includes(grantedRole) ||
    roleName.includes('ADMIN') || /\bHOT\b|HEAD OF TRAINING/.test(position);

  return { authenticated: true, admin };
}

function sumGroupMembers(groups: Record<string, any> | undefined, field: 'p' | 'a' | 'losses') {
  return Object.values(groups || {}).reduce((total, group: any) =>
    total + (group.members || []).reduce((subtotal: number, member: any) => subtotal + Number(member[field] || 0), 0), 0);
}

async function getLiveMetricsContext() {
  const liveData = await getDashboardData();
  if (liveData?.dataSource !== 'live') throw new Error('Live dashboard data is unavailable.');

  const summaryData = getFilteredData(liveData, {
    month: 'ALL', quarter: 'ALL', account: 'ALL', search: ''
  }, 'SUPER_ADMIN');
  const summary = summaryData.summary;
  const globalAttrition = calculateRosterAttrition(summary.totalLosses, summary.totalHeadcount);
  const inhouseAttrition = calculateRosterAttrition(summary.inhouse.losses, summary.inhouse.count);
  const pstAttrition = calculateRosterAttrition(summary.pst.losses, summary.pst.count);

  return {
    source: 'Supabase live dashboard data',
    generatedAt: liveData.generatedAt,
    filters: { month: 'All', quarter: 'All', account: 'All' },
    trainees: {
      totalHeadcount: summary.totalHeadcount,
      totalLosses: summary.totalLosses,
      ongoing: summary.inhouse.ongoing + summary.pst.ongoing,
      inhouse: { ...summary.inhouse, ...inhouseAttrition },
      pst: { ...summary.pst, ...pstAttrition },
      globalAttrition
    },
    trainers: {
      active: summary.trainersSummary.headcount,
      losses: summary.trainersSummary.totalLosses,
      attrition: summary.trainersSummary.attritionRate,
      attendance: {
        rate: summary.trainersSummary.attendanceRate,
        presentRecords: sumGroupMembers(summaryData.trainerAttendance?.groups, 'p'),
        lossRecords: sumGroupMembers(summaryData.trainerAttendance?.groups, 'a')
      },
      reliability: {
        rate: summary.trainersSummary.reliabilityRate,
        presentRecords: sumGroupMembers(summaryData.trainerReliability?.groups, 'p'),
        lossRecords: sumGroupMembers(summaryData.trainerReliability?.groups, 'losses')
      }
    },
    definitions: {
      traineeLossStatuses: ['FAILED', 'RESIGNED', 'TERMINATED', 'AWOL', 'LATERAL', 'RED', 'ACCOUNT REMOVED', 'LOSS', 'ATTRITION', 'EOC'],
      traineeOngoingStatuses: 'A status containing ONGOING, ON GOING, or ON-GOING, or exactly ACTIVE.',
      traineeAttrition: 'losses / ((starting headcount + ending headcount) / 2) x 100. Current roster data does not store period opening and closing snapshots, so the dashboard estimates starting headcount as total roster records and ending headcount as max(total roster records - losses, 0).',
      trainerLossStatuses: ['RESIGNED', 'AWOL', 'LATERAL', 'TERMINATED', 'INACTIVE'],
      trainerAttendanceLossStatuses: ['ABS', 'SUS'],
      trainerReliabilityLossStatuses: ['SL', 'VL', 'ML', 'PL', 'HOL', 'SUS', 'MED', 'BL'],
      trainerAttendance: 'Present records / (present records + ABS/SUS records); rest days and holidays are excluded.',
      trainerReliability: 'Present records / (present records + reliability-loss records).'
    }
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    const history = Array.isArray(body.history) ? body.history : [];
    if (!message) return NextResponse.json({ error: 'A message is required.' }, { status: 400 });
    const apiKey = process.env.OPENROUTER_API_KEY;
    const navigation = getNavigationIntent(String(message || ''));

    if (navigation) {
      return NextResponse.json({
        reply: navigation.reply,
        action: { type: 'navigate', path: navigation.path },
        modelUsed: 'Fast Navigation'
      });
    }

    const access = await getCopilotAccess();
    if (!access.authenticated) {
      return NextResponse.json({ error: 'Please sign in to use the Training Hub AI.' }, { status: 401 });
    }

    if (!apiKey) {
      return NextResponse.json({
        reply: 'AI responses are not configured yet. Please contact your administrator.',
        action: null,
        modelUsed: 'Configuration Required'
      });
    }

    const systemContext = access.admin
      ? await getLiveMetricsContext().catch(() => null)
      : null;
    if (access.admin && !systemContext) {
      return NextResponse.json({
        reply: 'I can’t access verified live dashboard metrics right now, so I won’t guess. Please refresh the dashboard or try again shortly.',
        action: null,
        modelUsed: 'Live data unavailable'
      }, { status: 503 });
    }

    const systemPrompt = `You are the CTNP Training Performance Hub assistant.
${systemContext
    ? `Verified dashboard context (all accounts, months, and quarters):\n${JSON.stringify(systemContext, null, 2)}`
    : 'The current user is not authorized to view company-wide metrics. Do not disclose or invent company-wide counts, rates, employee information, or attendance details.'}

Accuracy rules:
1. Use only the verified context for company-wide numbers. If a metric is absent, say you do not have verified data for it.
2. State that current trainee attrition is an estimate based on roster records when explaining it; do not claim the app has actual period opening/closing snapshots.
3. Explain calculations from the supplied definitions and distinguish trainer employment losses from trainer attendance/reliability losses.
4. Mention the data timestamp and all-period filters when relevant.
5. Respond clearly and professionally. Navigation requests are handled separately by the application.`;

    // Keep one bounded fallback so a provider outage cannot stall the chat for long.
    for (let attempt = 0; attempt < OPENROUTER_MODELS.length; attempt++) {
      const model = OPENROUTER_MODELS[attempt];
      const timeoutMs = attempt === 0 ? 6000 : 3500;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      try {
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
      } finally {
        clearTimeout(timeoutId);
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
