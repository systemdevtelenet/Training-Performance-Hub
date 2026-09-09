const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const MONTH_ORDER = [
  "January", "February", "March", "April", "May", "June", 
  "July", "August", "September", "October", "November", "December"
];

const isOngoingStatus = (status) => {
  const st = String(status || '').toUpperCase().trim();
  return st.includes('ONGOING') || st.includes('ON GOING') || st.includes('ON-GOING') || st === 'ACTIVE';
};

const matchesMonthFilter = (mMonth, selectedMonth, status) => {
  if (!selectedMonth || selectedMonth === 'ALL' || !mMonth || mMonth === 'Unknown') return true;
  const cleanM = String(mMonth).trim().toLowerCase();
  const cleanSel = String(selectedMonth).trim().toLowerCase();
  
  if (cleanM === cleanSel || cleanM.startsWith(cleanSel.slice(0, 3))) return true;

  if (isOngoingStatus(status)) {
    const startIdx = MONTH_ORDER.findIndex(m => m.toLowerCase().startsWith(cleanM.slice(0, 3)));
    const selectedIdx = MONTH_ORDER.findIndex(m => m.toLowerCase().startsWith(cleanSel.slice(0, 3)));
    if (startIdx !== -1 && selectedIdx !== -1) {
      return selectedIdx >= startIdx;
    }
  }
  return false;
};

const matchesQuarterFilter = (mQuarter, selectedQuarter, status) => {
  if (!selectedQuarter || selectedQuarter === 'ALL' || !mQuarter || mQuarter === 'Unknown') return true;
  const cleanQ = String(mQuarter).trim().toUpperCase();
  const cleanSelQ = String(selectedQuarter).trim().toUpperCase();
  
  if (cleanQ === cleanSelQ || cleanQ.includes(cleanSelQ)) return true;

  if (isOngoingStatus(status)) {
    const startQ = parseInt(cleanQ.replace(/\D/g, ''), 10);
    const selectedQ = parseInt(cleanSelQ.replace(/\D/g, ''), 10);
    if (!isNaN(startQ) && !isNaN(selectedQ)) {
      return selectedQ >= startQ;
    }
  }
  return false;
};

async function run() {
  const { data: inhouseData } = await s.from('inhouse').select('*');
  const { data: pstData } = await s.from('product_spec_training').select('*');

  const inhouseAttCols = ['NHO', 'MESH', 'comms_day_1', 'comms_day_2', 'comms_day_3'];
  const lossStatuses = ['FAILED', 'RESIGNED', 'TERMINATED', 'AWOL', 'RED', 'ACCOUNT REMOVED', 'LOSS', 'ATTRITION', 'EOC'];

  const allInhouse = (inhouseData || []).map(row => {
    let p = 0, a = 0;
    for (const col of inhouseAttCols) {
      const val = (row[col] || '').trim().toUpperCase();
      if (val === 'P') p++;
      if (val === 'A') a++;
    }
    const isLoss = lossStatuses.some(code => (row.status || '').toUpperCase().trim().includes(code));
    return { name: row.name, month: row.month, quarter: row.quarter, status: row.status, isLoss, p, a, account: row.acount || row.account };
  });

  const allPst = (pstData || []).map(row => {
    let p = 0, a = 0;
    for (let i = 1; i <= 62; i++) {
      const val = (row[`att_status_day_${i}`] || '').trim().toUpperCase();
      if (val === 'P') p++;
      if (val === 'A') a++;
    }
    const isLoss = lossStatuses.some(code => (row.status || '').toUpperCase().trim().includes(code));
    return { name: row.name, month: row.month, quarter: row.quarter, status: row.status, isLoss, p, a, account: row.account };
  });

  const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August'];

  const computedInhouseMonthly = months.map(m => {
    const inhouseM = allInhouse.filter(t => matchesMonthFilter(t.month, m, t.status));
    const activeHC = inhouseM.length;
    const losses = inhouseM.filter(t => t.isLoss && (t.month || '').toLowerCase().startsWith(m.toLowerCase().slice(0, 3))).length;
    const attritionRate = activeHC > 0 ? parseFloat(((losses / activeHC) * 100).toFixed(1)) : 0;
    const sumP = inhouseM.reduce((acc, t) => acc + (t.p || 0), 0);
    const sumA = inhouseM.reduce((acc, t) => acc + (t.a || 0), 0);
    const attendanceRate = (sumP + sumA) > 0 ? parseFloat(((sumP / (sumP + sumA)) * 100).toFixed(1)) : 100.0;
    return { period: m, activeHC, losses, attritionRate, attendanceRate, sumP, sumA };
  });

  const computedPstMonthly = months.map(m => {
    const pstM = allPst.filter(t => matchesMonthFilter(t.month, m, t.status));
    const activeHC = pstM.length;
    const losses = pstM.filter(t => t.isLoss && (t.month || '').toLowerCase().startsWith(m.toLowerCase().slice(0, 3))).length;
    const attritionRate = activeHC > 0 ? parseFloat(((losses / activeHC) * 100).toFixed(1)) : 0;
    const sumP = pstM.reduce((acc, t) => acc + (t.p || 0), 0);
    const sumA = pstM.reduce((acc, t) => acc + (t.a || 0), 0);
    const attendanceRate = (sumP + sumA) > 0 ? parseFloat(((sumP / (sumP + sumA)) * 100).toFixed(1)) : 100.0;
    return { period: m, activeHC, losses, attritionRate, attendanceRate, sumP, sumA };
  });

  const overallMonthly = months.map((m, idx) => {
    const inh = computedInhouseMonthly[idx];
    const pst = computedPstMonthly[idx];
    const totalHC = inh.activeHC + pst.activeHC;
    const totalLosses = inh.losses + pst.losses;
    const attrRate = totalHC > 0 ? parseFloat(((totalLosses / totalHC) * 100).toFixed(1)) : 0;
    const totalP = inh.sumP + pst.sumP;
    const totalA = inh.sumA + pst.sumA;
    const attRate = (totalP + totalA) > 0 ? parseFloat(((totalP / (totalP + totalA)) * 100).toFixed(1)) : 100.0;
    return {
      period: m,
      activeHC: totalHC,
      losses: totalLosses,
      attritionRate: attrRate + '%',
      attendanceRate: attRate + '%',
      totalP,
      totalA
    };
  });

  console.log('=== OVERALL MONTHLY DYNAMIC DATA ===');
  console.table(overallMonthly);
}
run();
