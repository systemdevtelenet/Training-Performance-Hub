'use server';

import { createClient } from '@supabase/supabase-js';
import { getTrainingPositionLabel, isTrainerEmployee } from '@/lib/trainer-position';

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  try {
    const dotenv = require('dotenv');
    const path = require('path');
    dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
  } catch (e) {}
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
  }
});

export interface SearchResultItem {
  id: string;
  title: string;
  subtitle: string;
  category: 'trainee' | 'trainer' | 'employee' | 'page' | 'batch';
  badge?: string;
  avatar?: string;
  href: string;
}

export async function searchGlobal(query: string, userRole: string = 'EMPLOYEE'): Promise<SearchResultItem[]> {
  const q = (query || '').trim();
  if (!q) return [];

  const results: SearchResultItem[] = [];
  const lowerQ = q.toLowerCase();
  const isEmployee = userRole === 'EMPLOYEE' || userRole === 'GUEST';

  // 1. Navigation Pages Match (Role-Filtered)
  const systemPages = isEmployee ? [
    { title: 'My Performance Dashboard', subtitle: 'Personal attendance, active batch & trainer overview', href: '/', keywords: ['dashboard', 'home', 'overview', 'attendance', 'batch', 'my'] },
    { title: 'Traffic Lights Status Tracking', subtitle: 'Weekly status ratings, remarks, and coaching notes', href: '/traffic-lights', keywords: ['traffic', 'lights', 'weekly', 'ratings', 'remarks', 'green', 'yellow', 'red', 'okay', 'status'] },
    { title: 'Account Profile Information', subtitle: 'User avatar, employee ID, and personal details', href: '/settings?tab=profile', keywords: ['profile', 'settings', 'avatar', 'photo', 'id'] },
    { title: 'Notification Preferences', subtitle: 'Manage in-app and email alert delivery', href: '/settings?tab=notifications', keywords: ['notifications', 'alerts', 'email', 'bell'] },
    { title: 'System Preferences', subtitle: 'Dark mode theme, timezone and display options', href: '/settings?tab=general', keywords: ['theme', 'dark mode', 'preferences', 'general'] },
  ] : [
    { title: 'Dashboard Overview', subtitle: 'Executive metrics, headcounts, attrition & summaries', href: '/', keywords: ['dashboard', 'home', 'overview', 'metrics', 'headcount'] },
    { title: 'Traffic Lights Status Tracking', subtitle: 'Weekly status ratings, remarks, and trend analysis', href: '/traffic-lights', keywords: ['traffic', 'lights', 'weekly', 'ratings', 'remarks', 'green', 'yellow', 'red', 'okay', 'status'] },
    { title: 'Trainees Directory & Rosters', subtitle: 'Inhouse & PST cohorts, batch rosters, and endorsement records', href: '/trainees', keywords: ['trainee', 'trainees', 'roster', 'endorsement', 'inhouse', 'pst', 'batch', 'cohort'] },
    { title: 'Trainers Management & Reliability', subtitle: 'Trainer directory, reliability %, and attendance tracking', href: '/trainers', keywords: ['trainer', 'trainers', 'reliability', 'attendance', 'supervisor'] },
    { title: 'Trainers Attendance Matrix', subtitle: 'Daily attendance logs, leaves, and absences', href: '/trainers?tab=attendance', keywords: ['trainer attendance', 'leaves', 'sl', 'vl', 'absences'] },
    { title: 'Trainers Reliability Analytics', subtitle: 'Performance reliability scores and breakdown', href: '/trainers?tab=reliability', keywords: ['trainer reliability', 'reliability rate', 'trainer score'] },
    { title: 'Employees Management', subtitle: 'Employee records, codes, vici links, and assignments', href: '/employees', keywords: ['employee', 'employees', 'management', 'vici', 'staff'] },
    { title: 'Analytics & AI Insights', subtitle: 'Predictive attrition analytics and AI recommendations', href: '/analytics', keywords: ['analytics', 'ai', 'insights', 'predictions', 'attrition'] },
    { title: 'Activity Log & History', subtitle: 'System audit logs, remarks history, and notifications', href: '/history', keywords: ['activity', 'log', 'history', 'audit', 'notifications', 'trail'] },
    { title: 'Account Profile & Settings', subtitle: 'User avatar, preferences, and personal details', href: '/settings?tab=profile', keywords: ['profile', 'settings', 'avatar', 'preferences', 'photo'] },
  ];

  systemPages.forEach(p => {
    const match = p.title.toLowerCase().includes(lowerQ) ||
      p.subtitle.toLowerCase().includes(lowerQ) ||
      p.keywords.some(k => k.includes(lowerQ));
    if (match) {
      results.push({
        id: `page-${p.href}`,
        title: p.title,
        subtitle: p.subtitle,
        category: 'page',
        badge: 'Page',
        href: p.href
      });
    }
  });

  const cleanQ = q.replace(/[,()%\\]/g, '').trim();
  if (!cleanQ) return results;

  try {
    // 2. Search trainer-roster employees
    const { data: positions } = await supabaseAdmin.from('positions').select('position_id, position_name, position_code');
    const positionById = new Map((positions || []).map((position: any) => [Number(position.position_id), position]));
    const { data: roles } = await supabaseAdmin.from('roles').select('role_id, role_name');
    const roleById = new Map((roles || []).map((role: any) => [Number(role.role_id), String(role.role_name || '')]));
    const { data: trainersData } = await supabaseAdmin
      .from('employees')
      .select('id, employee_name, employee_code, employee_email, avatar_url, role_id, position_id')
      .or(`employee_name.ilike.%${cleanQ}%,employee_code.ilike.%${cleanQ}%,employee_email.ilike.%${cleanQ}%`)
      .limit(20);

    (trainersData || [])
      .filter((employee: any) => isTrainerEmployee(positionById.get(Number(employee.position_id)), roleById.get(Number(employee.role_id))))
      .slice(0, 6)
      .forEach((t: any) => {
      const position = getTrainingPositionLabel(positionById.get(Number(t.position_id)));
      results.push({
        id: `trainer-${t.employee_code || t.id}`,
        title: t.employee_name || 'Trainer',
        subtitle: String(position),
        category: 'trainer',
        badge: 'Trainer',
        avatar: t.avatar_url || undefined,
        href: `/trainers?search=${encodeURIComponent(t.employee_name)}`
      });
    });

    // 3. Search Trainees (inhouse & product_spec_training)
    const { data: inhouseData } = await supabaseAdmin
      .from('inhouse')
      .select('name, batch, status, acount, account')
      .or(`name.ilike.%${cleanQ}%,batch.ilike.%${cleanQ}%,status.ilike.%${cleanQ}%,acount.ilike.%${cleanQ}%`)
      .limit(8);

    const { data: pstData } = await supabaseAdmin
      .from('product_spec_training')
      .select('name, wave, batch, status, account, accountName')
      .or(`name.ilike.%${cleanQ}%,wave.ilike.%${cleanQ}%,batch.ilike.%${cleanQ}%,status.ilike.%${cleanQ}%,account.ilike.%${cleanQ}%`)
      .limit(8);

    (inhouseData || []).forEach(ih => {
      const acc = ih.account || ih.acount || 'General';
      const b = ih.batch ? `Batch ${ih.batch}` : 'Inhouse';
      results.push({
        id: `trainee-ih-${ih.name}-${ih.batch}`,
        title: ih.name || 'Trainee',
        subtitle: `Inhouse • ${b} (${acc})`,
        category: 'trainee',
        badge: ih.status || 'Active',
        href: `/trainees?search=${encodeURIComponent(ih.name)}`
      });
    });

    (pstData || []).forEach(pst => {
      const acc = pst.account || pst.accountName || 'General';
      const w = pst.wave ? `Wave ${pst.wave}` : (pst.batch ? `Batch ${pst.batch}` : 'PST');
      results.push({
        id: `trainee-pst-${pst.name}-${pst.wave || pst.batch}`,
        title: pst.name || 'Trainee',
        subtitle: `PST • ${w} (${acc})`,
        category: 'trainee',
        badge: pst.status || 'Active',
        href: `/trainees?search=${encodeURIComponent(pst.name)}`
      });
    });

    // 4. Search Employees (employees)
    const { data: empData } = await supabaseAdmin
      .from('employees')
      .select('id, employee_name, employee_code, employee_email, avatar_url')
      .or(`employee_name.ilike.%${cleanQ}%,employee_code.ilike.%${cleanQ}%,employee_email.ilike.%${cleanQ}%`)
      .limit(6);

    (empData || []).forEach(emp => {
      results.push({
        id: `emp-${emp.id}`,
        title: emp.employee_name || 'Employee',
        subtitle: `Code: ${emp.employee_code || 'N/A'} • ${emp.employee_email || ''}`,
        category: 'employee',
        badge: 'Employee',
        avatar: emp.avatar_url || undefined,
        href: `/employees?search=${encodeURIComponent(emp.employee_name)}`
      });
    });

  } catch (err) {
    console.error('Error during global search:', err);
  }

  return results;
}
