'use server';

import { createClient } from '@supabase/supabase-js';

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

export async function searchGlobal(query: string): Promise<SearchResultItem[]> {
  const q = (query || '').trim();
  if (!q) return [];

  const results: SearchResultItem[] = [];
  const lowerQ = q.toLowerCase();

  // 1. Navigation Pages Match
  const systemPages = [
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
    // 2. Search Trainers (trainers & trainers_profile)
    const { data: trainersData } = await supabaseAdmin
      .from('trainers_profile')
      .select('name, position, accounts, gmail_account, profile_pic, employee_num')
      .or(`name.ilike.%${cleanQ}%,accounts.ilike.%${cleanQ}%,position.ilike.%${cleanQ}%,gmail_account.ilike.%${cleanQ}%`)
      .limit(6);

    (trainersData || []).forEach(t => {
      results.push({
        id: `trainer-${t.employee_num || t.name}`,
        title: t.name || 'Trainer',
        subtitle: `${t.position || 'Trainer'} • ${t.accounts || 'General'}`,
        category: 'trainer',
        badge: 'Trainer',
        avatar: t.profile_pic || undefined,
        href: `/trainers?search=${encodeURIComponent(t.name)}`
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
