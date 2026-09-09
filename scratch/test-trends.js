const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function testCalc() {
  const { data: inhouseData } = await s.from('inhouse').select('*');
  const { data: pstData } = await s.from('product_spec_training').select('*');

  const inhouseAttCols = ['NHO', 'MESH', 'comms_day_1', 'comms_day_2', 'comms_day_3'];
  const lossStatuses = ['FAILED', 'RESIGNED', 'TERMINATED', 'AWOL', 'RED', 'ACCOUNT REMOVED', 'LOSS', 'ATTRITION', 'EOC'];

  const allMembers = [];

  (inhouseData || []).forEach(row => {
    let p = 0, a = 0;
    for (const col of inhouseAttCols) {
      const v = (row[col] || '').toString().trim().toUpperCase();
      if (v === 'P') p++;
      if (v === 'A') a++;
    }
    const isLoss = lossStatuses.some(ls => (row.status || '').toUpperCase().includes(ls));
    allMembers.push({ type: 'inhouse', month: row.month, quarter: row.quarter, isLoss, p, a, status: row.status });
  });

  (pstData || []).forEach(row => {
    let p = 0, a = 0;
    for (let i = 1; i <= 62; i++) {
      const v = (row['att_status_day_' + i] || '').toString().trim().toUpperCase();
      if (v === 'P') p++;
      if (v === 'A') a++;
    }
    const isLoss = lossStatuses.some(ls => (row.status || '').toUpperCase().includes(ls));
    allMembers.push({ type: 'pst', month: row.month, quarter: row.quarter, isLoss, p, a, status: row.status });
  });

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August'];
  const quarters = ['Q1', 'Q2', 'Q3'];

  console.log('--- DYNAMIC MONTHLY CALCULATION ---');
  const monthlyRes = months.map(m => {
    const mems = allMembers.filter(t => (t.month || '').toLowerCase().includes(m.toLowerCase().slice(0, 3)));
    const hc = mems.length;
    const losses = mems.filter(t => t.isLoss).length;
    const p = mems.reduce((sum, t) => sum + t.p, 0);
    const a = mems.reduce((sum, t) => sum + t.a, 0);
    const attr = hc > 0 ? ((losses / hc) * 100).toFixed(1) + '%' : '0.0%';
    const att = (p + a) > 0 ? ((p / (p + a)) * 100).toFixed(1) + '%' : '100.0%';
    return { month: m, hc, losses, attr, att, p, a };
  });
  console.table(monthlyRes);

  console.log('--- DYNAMIC QUARTERLY CALCULATION ---');
  const quarterlyRes = quarters.map(q => {
    const mems = allMembers.filter(t => (t.quarter || '').toUpperCase().includes(q));
    const hc = mems.length;
    const losses = mems.filter(t => t.isLoss).length;
    const p = mems.reduce((sum, t) => sum + t.p, 0);
    const a = mems.reduce((sum, t) => sum + t.a, 0);
    const attr = hc > 0 ? ((losses / hc) * 100).toFixed(1) + '%' : '0.0%';
    const att = (p + a) > 0 ? ((p / (p + a)) * 100).toFixed(1) + '%' : '100.0%';
    return { quarter: q, hc, losses, attr, att, p, a };
  });
  console.table(quarterlyRes);
}
testCalc();
