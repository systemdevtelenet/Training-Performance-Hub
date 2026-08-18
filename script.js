let cachedData = null;
let currentType = 'summary';

const MONTH_ORDER = [
  "January", "February", "March", "April", "May", "June", 
  "July", "August", "September", "October", "November", "December"
];

// Tailwind Heroicons SVG Helpers
const ICONS = {
  refresh: `<svg class="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>`,
  chart: `<svg class="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>`,
  calendar: `<svg class="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>`,
  trendUp: `<svg class="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>`,
  clock: `<svg class="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
  robot: `<svg class="w-6 h-6 inline-block text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>`,
  spinner: `<svg class="w-5 h-5 inline-block animate-spin mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>`,
  camera: `<svg class="w-5 h-5 mb-0.5 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>`,
  folder: `<svg class="w-4 h-4 inline-block text-sky-600 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>`,
  academicCap: `<svg class="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l9-5-9-5-9 5 9 5z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0112 20.055a11.952 11.952 0 01-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z"/></svg>`,
  clipboard: `<svg class="w-4 h-4 inline-block mr-1 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"/></svg>`,
  search: `<svg class="w-3.5 h-3.5 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>`,
  user: `<svg class="w-3.5 h-3.5 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>`,
  building: `<svg class="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m0 0h4m-4 0V11m0 0h4m-4 0v4m0 0h4"/></svg>`,
  briefcase: `<svg class="w-4 h-4 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>`
};

// ==========================================================================
// TRAINER FULL NAME TO BADGE CODE MAPPING
// ==========================================================================
const TRAINER_NAME_MAP = {
  "nissi-jeh reguero": ["hot nissi", "nissi"],
  "jeremy rigodon": ["tc jeremy", "jeremy"],
  "john loi gara": ["tr jl", "jl"],
  "bianca kaye ernestine colonia": ["tr bianca", "bianca"],
  "rohla mie baswa": ["tr rohla", "rohla"],
  "michelle yncierto": ["tr mitch", "mitch"],
  "rommel mendoza": ["tr rommel", "rommel"],
  "ronelyn baguio": ["tr badz", "badz"],
  "john dhico magalzo": ["tr dhico", "dhico"],
  "abdellah nohreen disomimba": ["tr nohreen", "nohreen"],
  "krisland pepito": ["tr krisland", "krisland"],
  "niño elijah r. reyes": ["tr niño", "tr nino", "niño", "nino"],
  "francisjell yongco": ["tr francisjell", "tr francisjel", "francisjell"],
  "kier ariola": ["tr aki", "aki"],
  "joven aniñon": ["tr joven", "tr joven aniñon", "joven"],
  "vincent luis celdran": ["tr vincent", "vincent"],
  "nina joy briones": ["tr niña", "tr nina", "niña", "nina"],
  "matt riner balaba": ["tr matt", "matt"],
  "maegan marie cabardo": ["tr maegan", "maegan"],
  "charles espinosa": ["tr charles", "charles"]
};

// Robust matching function between full names and badge codes
function isTrainerMatch(assignedStr, trainerFullName) {
  if (!assignedStr || !trainerFullName) return false;
  
  const cleanAssigned = String(assignedStr).trim().toLowerCase();
  const cleanFull = String(trainerFullName).trim().toLowerCase();

  if (cleanAssigned === cleanFull || cleanAssigned.includes(cleanFull) || cleanFull.includes(cleanAssigned)) {
    return true;
  }

  const aliases = TRAINER_NAME_MAP[cleanFull];
  if (aliases && aliases.length > 0) {
    if (aliases.some(alias => cleanAssigned === alias || cleanAssigned.includes(alias) || alias.includes(cleanAssigned))) {
      return true;
    }
  }

  for (const [fullNameKey, aliasList] of Object.entries(TRAINER_NAME_MAP)) {
    if (cleanFull.includes(fullNameKey) || fullNameKey.includes(cleanFull)) {
      if (aliasList.some(alias => cleanAssigned.includes(alias))) {
        return true;
      }
    }
  }

  return false;
}

// ==========================================================================
// CASE-INSENSITIVE FILTER MATCHING HELPERS
// ==========================================================================
const isOngoingStatus = (status) => {
  const s = String(status || '').toUpperCase().trim();
  return s.includes('ONGOING') || s.includes('ON GOING') || s.includes('ON-GOING') || s === 'ACTIVE';
};

const matchesMonthFilter = (mMonth, selectedMonth, status) => {
  if (selectedMonth === 'ALL' || !mMonth || mMonth === 'Unknown') return true;
  const cleanM = String(mMonth).trim().toLowerCase();
  const cleanSel = String(selectedMonth).trim().toLowerCase();
  
  if (cleanM === cleanSel) return true;

  if (isOngoingStatus(status)) {
    const startIdx = MONTH_ORDER.findIndex(m => m.toLowerCase() === cleanM);
    const selectedIdx = MONTH_ORDER.findIndex(m => m.toLowerCase() === cleanSel);
    if (startIdx !== -1 && selectedIdx !== -1) {
      return selectedIdx >= startIdx;
    }
  }
  return false;
};

const matchesQuarterFilter = (mQuarter, selectedQuarter, status) => {
  if (selectedQuarter === 'ALL' || !mQuarter || mQuarter === 'Unknown') return true;
  const cleanQ = String(mQuarter).trim().toUpperCase();
  const cleanSelQ = String(selectedQuarter).trim().toUpperCase();
  
  if (cleanQ === cleanSelQ) return true;

  if (isOngoingStatus(status)) {
    const startQ = parseInt(cleanQ.replace(/\D/g, ''), 10);
    const selectedQ = parseInt(cleanSelQ.replace(/\D/g, ''), 10);
    if (!isNaN(startQ) && !isNaN(selectedQ)) {
      return selectedQ >= startQ;
    }
  }
  return false;
};

const escapeHtml = (str) => {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

function getStatusBadgeStyle(statusStr) {
  const status = String(statusStr || 'ACTIVE').trim().toUpperCase();
  if (status.includes('RESIGNED') || status.includes('AWOL') || status.includes('FAILED') || status.includes('TERMINATED')) {
    return 'background:#fef2f2; color:#dc2626; border: 1px solid #fecaca;';
  } else if (status.includes('LATERAL') || status.includes('ONGOING')) {
    return 'background:#fefce8; color:#ca8a04; border: 1px solid #fef08a;';
  } else if (status.includes('ACTIVE') || status.includes('ENDORSED')) {
    return 'background:#f0fdf4; color:#16a34a; border: 1px solid #bbf7d0;';
  }
  return 'background:#f3f4f6; color:#374151; border: 1px solid #d1d5db;';
}

function setupTouchSubmenus() {
  const wrappers = document.querySelectorAll('.nav-item-wrapper');
  wrappers.forEach(wrapper => {
    const mainBtn = wrapper.querySelector('.tab-btn');
    if (!mainBtn) return;
    mainBtn.addEventListener('click', (e) => {
      const isOpen = wrapper.classList.contains('open');
      wrappers.forEach(w => w.classList.remove('open'));
      if (!isOpen) wrapper.classList.add('open');
    });
  });
  document.querySelectorAll('.submenu-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      wrappers.forEach(w => w.classList.remove('open'));
    });
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.nav-item-wrapper')) {
      wrappers.forEach(w => w.classList.remove('open'));
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  setupTouchSubmenus();
  refreshDashboardData();
});

function refreshDashboardData() {
  const panel = document.getElementById('breakdown-panel');
  if (panel) panel.innerHTML = `<p style="text-align:center; padding: 30px; color:#666;">${ICONS.spinner} Fetching active spreadsheet data...</p>`;
  
  if (typeof google !== 'undefined' && google.script) {
    google.script.run
      .withSuccessHandler(d => { 
        if (!d) {
          showError('Server returned empty dataset. Check sheet names.');
          return;
        }
        cachedData = d; 
        populateFilterMenus(cachedData);
        render(cachedData); 
      })
      .withFailureHandler(err => {
        showError(`Error communicating with server: ${escapeHtml(err.message)}`);
      })
      .getDashboardData();
  }
}

function showError(msg) {
  const panel = document.getElementById('breakdown-panel');
  if (panel) {
    panel.innerHTML = `<div style="text-align:center; padding: 20px; color:var(--crimson)">${msg}</div>`;
  }
}

function populateFilterMenus(data) {
  if (!data) return;
  const months = new Set();
  const quarters = new Set();
  const accounts = new Set();

  ['inhouse', 'pst'].forEach(type => {
    if (!data[type]?.groups) return;
    for (const acc in data[type].groups) {
      if (acc && acc !== 'General') accounts.add(acc);
      for (const b in data[type].groups[acc]) {
        data[type].groups[acc][b].members.forEach(m => {
          if (m.month && m.month !== 'Unknown') months.add(m.month);
          if (m.quarter && m.quarter !== 'Unknown') quarters.add(m.quarter);
        });
      }
    }
  });

  const mSelect = document.getElementById('filter-month');
  const qSelect = document.getElementById('filter-quarter');
  const aSelect = document.getElementById('filter-account');

  if (qSelect) {
    const qOptions = Array.from(quarters).sort().map(q => `<option value="${escapeHtml(q)}">${escapeHtml(q)}</option>`);
    qSelect.innerHTML = '<option value="ALL">All Quarters</option>' + qOptions.join('');
  }

  if (mSelect) {
    const sortedMonths = Array.from(months).sort((a, b) => MONTH_ORDER.indexOf(a) - MONTH_ORDER.indexOf(b));
    const mOptions = sortedMonths.map(m => `<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`);
    mSelect.innerHTML = '<option value="ALL">All Months</option>' + mOptions.join('');
  }

  if (aSelect) {
    const aOptions = Array.from(accounts).sort().map(a => `<option value="${escapeHtml(a)}">${escapeHtml(a)}</option>`);
    aSelect.innerHTML = '<option value="ALL">All Client Accounts</option>' + aOptions.join('');
  }
}

function applyFilters() {
  render(cachedData);
}

let _filterDebounceTimer = null;
function applyFiltersDebounced() {
  clearTimeout(_filterDebounceTimer);
  _filterDebounceTimer = setTimeout(() => render(cachedData), 200);
}

function switchTab(t) { 
  currentType = t; 

  document.querySelectorAll('.tab-btn, .submenu-btn').forEach(b => {
    const label = b.innerText.trim().toLowerCase();
    
    const isMatch = (t === 'summary' && (label === 'executive summary' || label === 'overview')) || 
                    (t === 'ai-report' && label === 'ai insights') ||
                    (t === 'analytics' && label === 'analytics trends') ||
                    (t === 'trainees' && label === 'trainees') ||
                    (t === 'trainers' && (label === 'trainers' || label === 'directory')) ||
                    (t === 'trainer-attendance' && label === 'attendance') ||
                    (t === 'trainer-reliability' && label === 'reliability');
    
    b.classList.toggle('active', isMatch);
  });

  if (t === 'ai-report') {
    renderAIReportView();
    return;
  }

  render(cachedData);
}

function renderAIReportView() {
  const panel = document.getElementById('breakdown-panel');
  if (!panel) return;

  panel.innerHTML = `
    <div class="summary-card" style="padding: 24px; background: #fff; border-radius: 8px;">
      <div style="margin-bottom: 20px;">
        <h2 style="margin: 0 0 6px 0; color: #1e293b; display: flex; align-items: center;">${ICONS.robot} Executive AI Analytics Report</h2>
        <p style="color: #64748b; font-size: 0.9rem; margin: 0;">
          Select a timeframe to generate dynamic insights on trainer performance and ongoing batch training metrics.
        </p>
      </div>

      <div class="ai-report-header" style="display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-bottom: 20px;">
        <button class="btn flex items-center" onclick="fetchAIReport('quarterly')">${ICONS.chart} Quarterly</button>
        <button class="btn flex items-center" onclick="fetchAIReport('monthly')">${ICONS.calendar} Monthly</button>
        <button class="btn flex items-center" onclick="fetchAIReport('mtd')">${ICONS.trendUp} Month to Date (MTD)</button>
        <button class="btn flex items-center" onclick="fetchAIReport('past_and_mtd')">${ICONS.clock} Past Month & MTD</button>
      </div>

      <div id="ai-report-output" style="background:#fafafa; border-radius:8px; padding:20px; border:1px solid #e2e8f0; min-height:180px;">
        <p style="color:#94a3b8; text-align:center; margin: 40px 0;">
          Select a report timeframe above to generate AI insights.
        </p>
      </div>
    </div>
  `;
}

function fetchAIReport(type) {
  const outputDiv = document.getElementById('ai-report-output');
  if (outputDiv) {
    outputDiv.innerHTML = `<p style="text-align:center; padding: 40px; color:#2f6798;">${ICONS.spinner} Analyzing datasets with Gemini AI... Please wait.</p>`;
    google.script.run
      .withSuccessHandler(res => { outputDiv.innerHTML = res; })
      .withFailureHandler(err => { outputDiv.innerHTML = `<p style="color:var(--crimson)">Error generating report: ${escapeHtml(err.message)}</p>`; })
      .generateAIReport(type);
  }
}

function exportExecutiveSummary() {
  if (!cachedData || !cachedData.summary) {
    alert('No data available to export.');
    return;
  }
  
  const activeBatches = cachedData.summary.ongoingBatches || [];
  google.script.run
    .withSuccessHandler(res => {
      alert(res.message);
    })
    .withFailureHandler(err => {
      alert('Export failed: ' + err.message);
    })
    .exportExecutiveSummaryToSheet(cachedData.summary, activeBatches);
}

function getFilteredData(data) {
  if (!data) return null;
  
  const selectedMonth = document.getElementById('filter-month')?.value || 'ALL';
  const selectedQuarter = document.getElementById('filter-quarter')?.value || 'ALL';
  const selectedAccount = document.getElementById('filter-account')?.value || 'ALL';
  const searchQuery = (document.getElementById('search-query')?.value || '').toLowerCase();
  
  const filtered = JSON.parse(JSON.stringify(data));
  const uniqueNames = new Set();
  
  const summaryStats = {
    inhouse: { losses: 0, count: 0, ongoing: 0 },
    pst: { losses: 0, count: 0, ongoing: 0 },
    global: { losses: 0 }
  };

  ['inhouse', 'pst'].forEach(type => {
    if (!filtered[type]?.groups) return;
    
    for (const acc in filtered[type].groups) {
      if (selectedAccount !== 'ALL' && acc !== selectedAccount) {
        delete filtered[type].groups[acc];
        continue;
      }

      for (const b in filtered[type].groups[acc]) {
        const group = filtered[type].groups[acc][b];
        
        const matchedMembers = group.members.filter(m => {
          const mMatch = matchesMonthFilter(m.month, selectedMonth, m.status);
          const qMatch = matchesQuarterFilter(m.quarter, selectedQuarter, m.status);
          const searchMatch = !searchQuery || 
            (m.name && m.name.toLowerCase().includes(searchQuery)) ||
            b.toLowerCase().includes(searchQuery);
          return mMatch && qMatch && searchMatch;
        });

        group.members = matchedMembers;
        group.totalCount = matchedMembers.length;
        group.endorsed = matchedMembers.filter(m => m.isEndorsed).length;
        group.losses = matchedMembers.filter(m => m.isLoss).length;
        
        let totalP = 0, totalA = 0;
        matchedMembers.forEach(m => {
          totalP += (m.p || 0);
          totalA += (m.a || 0);
          if (m.name) uniqueNames.add(m.name.toString().trim().toUpperCase());
          if (isOngoingStatus(m.status)) {
            summaryStats[type].ongoing++;
          }
        });
        
        group.p = totalP;
        group.a = totalA;

        const lossRate = group.totalCount > 0 ? (group.losses / group.totalCount) * 100 : 0;
        group.attritionRate = lossRate.toFixed(1) + '%';
        
        const totalAttRecords = group.p + group.a;
        const attendanceRate = totalAttRecords > 0 ? (group.p / totalAttRecords) * 100 : 100.0; 
        group.attRate = attendanceRate.toFixed(1) + '%';

        summaryStats[type].losses += group.losses;
        summaryStats[type].count += group.totalCount;
        summaryStats.global.losses += group.losses;
      }
    }
  });

  let trainerAttP = 0, trainerAttA = 0, trainerRelP = 0, trainerRelA = 0, trainerRelLosses = 0, trainerRelSched = 0;
  const uniqueTrainersSet = new Set();

  if (filtered.trainerAttendance?.groups) {
    for (const [trainerName, group] of Object.entries(filtered.trainerAttendance.groups)) {
      const filteredMembers = group.members.filter(m => {
        const mMatch = (selectedMonth === 'ALL' || m.month === selectedMonth);
        const qMatch = (selectedQuarter === 'ALL' || m.quarter === selectedQuarter);
        const searchMatch = !searchQuery || trainerName.toLowerCase().includes(searchQuery);
        return mMatch && qMatch && searchMatch;
      });
      
      group.members = filteredMembers;
      if (filteredMembers.length > 0) {
        uniqueTrainersSet.add(trainerName.toUpperCase());
        filteredMembers.forEach(m => {
          trainerAttP += m.p;
          trainerAttA += m.a;
        });
      }
    }
  }

  if (filtered.trainerReliability?.groups) {
    for (const [trainerName, group] of Object.entries(filtered.trainerReliability.groups)) {
      const filteredMembers = group.members.filter(m => {
        const mMatch = (selectedMonth === 'ALL' || m.month === selectedMonth);
        const qMatch = (selectedQuarter === 'ALL' || m.quarter === selectedQuarter);
        const searchMatch = !searchQuery || trainerName.toLowerCase().includes(searchQuery);
        return mMatch && qMatch && searchMatch;
      });
      
      group.members = filteredMembers;
      filteredMembers.forEach(m => {
        trainerRelP += m.p;
        trainerRelA += m.a;
        trainerRelLosses += (m.losses || 0);
        let total = (m.losses || 0) + m.p + m.a;
        trainerRelSched += total;
      });
    }
  }

  const calcRate = (l, t) => t > 0 ? ((l / t) * 100).toFixed(1) + '%' : '0.0%';
  
  const tAttTotal = trainerAttP + trainerAttA;
  const tAttRate = tAttTotal > 0 ? ((trainerAttP / tAttTotal) * 100).toFixed(1) + '%' : '100.0%';
  const tRelActual = trainerRelP + trainerRelA;
  const tRelRate = trainerRelSched > 0 ? ((tRelActual / trainerRelSched) * 100).toFixed(1) + '%' : '100.0%';

  filtered.summary = {
    inhouse: { 
      count: summaryStats.inhouse.count, 
      losses: summaryStats.inhouse.losses, 
      ongoing: summaryStats.inhouse.ongoing,
      rate: calcRate(summaryStats.inhouse.losses, summaryStats.inhouse.count) 
    },
    pst: { 
      count: summaryStats.pst.count, 
      losses: summaryStats.pst.losses, 
      ongoing: summaryStats.pst.ongoing,
      rate: calcRate(summaryStats.pst.losses, summaryStats.pst.count) 
    },
    totalHeadcount: uniqueNames.size,
    totalLosses: summaryStats.global.losses,
    globalRate: uniqueNames.size > 0 ? ((summaryStats.global.losses / uniqueNames.size) * 100).toFixed(1) + '%' : '0.0%',
    trainersSummary: {
      headcount: data.summary?.trainersSummary?.headcount || uniqueTrainersSet.size,
      totalLosses: data.summary?.trainersSummary?.totalLosses || 0,
      attritionRate: data.summary?.trainersSummary?.attritionRate || '0.0%',
      attendanceRate: tAttRate,
      reliabilityRate: tRelRate
    }
  };

  return filtered;
}

function generateTrendAnalytics(rawData) {
  const selectedMonth = document.getElementById('filter-month')?.value || 'ALL';
  const selectedQuarter = document.getElementById('filter-quarter')?.value || 'ALL';
  const searchQuery = (document.getElementById('search-query')?.value || '').toLowerCase();

  let maxMonthIdx = -1;
  let maxQuarterNum = 1;

  ['inhouse', 'pst'].forEach(type => {
    if (!rawData[type]?.groups) return;
    for (const acc in rawData[type].groups) {
      for (const b in rawData[type].groups[acc]) {
        rawData[type].groups[acc][b].members.forEach(m => {
          if (m.month && m.month !== 'Unknown') {
            const idx = MONTH_ORDER.findIndex(mo => mo.toLowerCase() === m.month.toString().trim().toLowerCase());
            if (idx > maxMonthIdx) maxMonthIdx = idx;
          }
          if (m.quarter && m.quarter !== 'Unknown') {
            const qNum = parseInt(m.quarter.toString().replace(/\D/g, ''), 10);
            if (!isNaN(qNum) && qNum > maxQuarterNum) maxQuarterNum = qNum;
          }
        });
      }
    }
  });

  if (maxMonthIdx === -1) maxMonthIdx = new Date().getMonth();

  const activeMonths = MONTH_ORDER.slice(0, maxMonthIdx + 1);
  const activeQuarters = ['Q1', 'Q2', 'Q3', 'Q4'].slice(0, maxQuarterNum);

  const trends = { 
    overall: { months: {}, quarters: {} },
    inhouse: { months: {}, quarters: {} },
    pst: { months: {}, quarters: {} }
  };

  const initTimeBlock = () => ({ headcount: 0, losses: 0, p: 0, a: 0 });

  ['inhouse', 'pst'].forEach(type => {
    if (!rawData[type]?.groups) return;
    
    for (const acc in rawData[type].groups) {
      for (const b in rawData[type].groups[acc]) {
        rawData[type].groups[acc][b].members.forEach(m => {
          if (searchQuery && !m.name?.toLowerCase().includes(searchQuery) && !b.toLowerCase().includes(searchQuery)) {
            return;
          }

          const recordData = (targetObj) => {
            activeMonths.forEach(targetMonth => {
              if (matchesMonthFilter(m.month, targetMonth, m.status)) {
                if (selectedMonth !== 'ALL' && !matchesMonthFilter(m.month, selectedMonth, m.status)) return;
                
                if (!targetObj.months[targetMonth]) targetObj.months[targetMonth] = initTimeBlock();
                targetObj.months[targetMonth].headcount++;
                if (m.isLoss && m.month.toString().trim().toLowerCase() === targetMonth.toLowerCase()) {
                  targetObj.months[targetMonth].losses++;
                }
                targetObj.months[targetMonth].p += (m.p || 0);
                targetObj.months[targetMonth].a += (m.a || 0);
              }
            });

            activeQuarters.forEach(targetQ => {
              if (matchesQuarterFilter(m.quarter, targetQ, m.status)) {
                if (selectedQuarter !== 'ALL' && !matchesQuarterFilter(m.quarter, selectedQuarter, m.status)) return;

                if (!targetObj.quarters[targetQ]) targetObj.quarters[targetQ] = initTimeBlock();
                targetObj.quarters[targetQ].headcount++;
                if (m.isLoss && m.quarter.toString().trim().toUpperCase() === targetQ) {
                  targetObj.quarters[targetQ].losses++;
                }
                targetObj.quarters[targetQ].p += (m.p || 0);
                targetObj.quarters[targetQ].a += (m.a || 0);
              }
            });
          };

          recordData(trends[type]);
          recordData(trends.overall);
        });
      }
    }
  });

  const finalizeMetrics = (obj, isMonth = false) => {
    const sortedKeys = Object.keys(obj).sort((a, b) => {
      return isMonth ? MONTH_ORDER.indexOf(a) - MONTH_ORDER.indexOf(b) : a.localeCompare(b);
    });

    return sortedKeys.map(key => {
      const block = obj[key];
      const totalAtt = block.p + block.a;
      const attrRaw = block.headcount > 0 ? (block.losses / block.headcount) * 100 : 0;
      return {
        period: key,
        headcount: block.headcount,
        losses: block.losses,
        attritionNum: attrRaw,
        attritionRate: attrRaw.toFixed(1) + '%',
        attendanceRate: totalAtt > 0 ? ((block.p / totalAtt) * 100).toFixed(1) + '%' : '100.0%'
      };
    });
  };

  return {
    overall: { months: finalizeMetrics(trends.overall.months, true), quarters: finalizeMetrics(trends.overall.quarters, false) },
    inhouse: { months: finalizeMetrics(trends.inhouse.months, true), quarters: finalizeMetrics(trends.inhouse.quarters, false) },
    pst: { months: finalizeMetrics(trends.pst.months, true), quarters: finalizeMetrics(trends.pst.quarters, false) }
  };
}

function generateAccountMetrics(rawData) {
  const filteredData = getFilteredData(rawData);
  const accountsMap = {};

  ['inhouse', 'pst'].forEach(type => {
    if (!filteredData[type]?.groups) return;
    
    for (const accName in filteredData[type].groups) {
      const displayAcc = accName && accName.trim() !== "" ? accName.trim() : "General/Unassigned";
      
      if (!accountsMap[displayAcc]) {
        accountsMap[displayAcc] = { headcount: 0, losses: 0, ongoing: 0, p: 0, a: 0, trainees: [] };
      }

      for (const b in filteredData[type].groups[accName]) {
        filteredData[type].groups[accName][b].members.forEach(m => {
          accountsMap[displayAcc].headcount++;
          if (m.isLoss) accountsMap[displayAcc].losses++;
          
          if (m.status && m.status.toString().trim().toLowerCase() === 'ongoing') {
            accountsMap[displayAcc].ongoing++;
          }

          accountsMap[displayAcc].p += (m.p || 0);
          accountsMap[displayAcc].a += (m.a || 0);
          
          accountsMap[displayAcc].trainees.push({
            name: m.name,
            status: m.status,
            batch: b,
            timeline: `${m.quarter} / ${m.month}`,
            month: m.month,
            quarter: m.quarter,
            p: m.p,
            a: m.a,
            isEndorsed: m.isEndorsed,
            isLoss: m.isLoss,
            assignedTrainer: m.assignedTrainer,
            training: type === 'inhouse' ? 'Inhouse Training' : 'PST Training',
            accountName: displayAcc
          });
        });
      }
    }
  });

  return Object.keys(accountsMap).sort().map(name => {
    const item = accountsMap[name];
    const totalAtt = item.p + item.a;
    item.trainees.sort((x, y) => (x.name || '').toString().localeCompare((y.name || '').toString()));

    return {
      accountName: name,
      headcount: item.headcount,
      losses: item.losses,
      ongoing: item.ongoing,
      traineesList: item.trainees,
      attritionRate: item.headcount > 0 ? ((item.losses / item.headcount) * 100).toFixed(1) + '%' : '0.0%',
      attendanceRate: totalAtt > 0 ? ((item.p / totalAtt) * 100).toFixed(1) + '%' : '100.0%'
    };
  });
}

function expandChart(element) {
  const modal = document.getElementById('chartModal');
  const modalBody = document.getElementById('chartModalBody');
  if (modal && modalBody) {
    modalBody.innerHTML = element.innerHTML;
    modal.style.display = 'flex';
  }
}

function closeChartModal(event) {
  const modal = document.getElementById('chartModal');
  if (modal) modal.style.display = 'none';
}

function generateSvgChart(dataset, title) {
  if (!dataset || dataset.length === 0) {
    return `<div style="padding:15px; color:#aaa; font-size:0.85rem; text-align:center;">Not enough data matrix segments to map a timeline graph trajectory.</div>`;
  }
  
  const width = 650, height = 180, paddingLeft = 50, paddingRight = 30, paddingTop = 20, paddingBottom = 35;
  const chartWidth = width - paddingLeft - paddingRight, chartHeight = height - paddingTop - paddingBottom;
  
  let maxAttr = Math.max(...dataset.map(d => d.attritionNum));
  maxAttr = maxAttr > 0 ? Math.ceil(maxAttr / 5) * 5 : 10;

  const points = dataset.map((d, idx) => {
    const step = dataset.length > 1 ? idx / (dataset.length - 1) : 0.5;
    const x = paddingLeft + step * chartWidth;
    const y = (height - paddingBottom) - (d.attritionNum / maxAttr) * chartHeight;
    return { x, y, info: d };
  });

  const linePath = dataset.length === 1 
    ? `M ${points[0].x - 10} ${points[0].y} L ${points[0].x + 10} ${points[0].y}`
    : points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  let gridLines = '';
  const horizontalGridSteps = 4;
  for (let i = 0; i <= horizontalGridSteps; i++) {
    const val = ((maxAttr / horizontalGridSteps) * i).toFixed(0);
    const yPos = (height - paddingBottom) - (i / horizontalGridSteps) * chartHeight;
    gridLines += `
      <line x1="${paddingLeft}" y1="${yPos}" x2="${width - paddingRight}" y2="${yPos}" stroke="#eee" stroke-width="1" />
      <text x="${paddingLeft - 10}" y="${yPos + 4}" font-size="9" fill="#888" text-anchor="end">${val}%</text>
    `;
  }

  let nodesHtml = '';
  let labelsHtml = '';
  points.forEach((p) => {
    nodesHtml += `
      <circle cx="${p.x}" cy="${p.y}" r="4" fill="var(--indigo)" stroke="#fff" stroke-width="1.5" />
      <text x="${p.x}" y="${p.y - 8}" font-size="9" font-weight="bold" fill="var(--charcoal)" text-anchor="middle">${p.info.attritionRate}</text>
    `;
    labelsHtml += `
      <text x="${p.x}" y="${height - 12}" font-size="9" font-weight="600" fill="#666" text-anchor="middle">${escapeHtml(p.info.period)}</text>
    `;
  });

  return `
    <div class="chart-wrapper" onclick="expandChart(this)" title="Click to expand chart">
      <h4 style="margin: 0 0 15px 0; font-size:0.85rem; text-transform:uppercase; color:#555; letter-spacing:0.02em; display:flex; justify-content:space-between; align-items:center;">
        <span>${escapeHtml(title)} (Attrition % Trend)</span>
        <span style="font-size:0.75rem; color:#888; font-weight:normal; display:flex; align-items:center;">${ICONS.search} Click to enlarge</span>
      </h4>
      <svg viewBox="0 0 ${width} ${height}" style="width:100%; height:auto; overflow:visible;">
        ${gridLines}
        <path d="${linePath}" fill="none" stroke="var(--indigo)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
        ${nodesHtml}
        ${labelsHtml}
      </svg>
    </div>`;
}

function render(rawData) {
  const panel = document.getElementById('breakdown-panel');
  if (!panel) return;

  if (!rawData) {
    panel.innerHTML = '<div style="text-align:center; padding: 20px;">Error parsing dashboard configurations.</div>';
    return;
  }

  if (currentType === 'ai-report') {
    renderAIReportView();
    return;
  }

  /* ==========================================================================
     VIEW 1: TRAINERS DIRECTORY
     ========================================================================== */
  if (currentType === 'trainers') {
    const trainers = rawData.trainers || [];
    const searchQuery = (document.getElementById('search-query')?.value || '').toLowerCase();
    const selectedAccount = document.getElementById('filter-account')?.value || 'ALL';

    const filteredTrainers = trainers.filter(t => {
      const matchesSearch = !searchQuery || 
        t.name.toLowerCase().includes(searchQuery) || 
        (t.pos && t.pos.toLowerCase().includes(searchQuery));
      const matchesAcc = selectedAccount === 'ALL' || (t.accounts && t.accounts.includes(selectedAccount));
      return matchesSearch && matchesAcc;
    });

    if (filteredTrainers.length === 0) {
      panel.innerHTML = '<p style="text-align:center; padding:20px; color:#666;">No trainers found matching the search criteria.</p>';
      return;
    }

    if (window._selectedTrainerIndex === undefined || window._selectedTrainerIndex >= filteredTrainers.length) {
      window._selectedTrainerIndex = 0;
    }

    const selectedTrainer = filteredTrainers[window._selectedTrainerIndex] || filteredTrainers[0];

    window.selectTrainer = (index) => {
      window._selectedTrainerIndex = index;
      render(rawData);
    };

    let listHtml = `<div class="trainers-list-sidebar">`;
    filteredTrainers.forEach((t, idx) => {
      const isSelected = idx === window._selectedTrainerIndex;
      const statusBadgeStyle = getStatusBadgeStyle(t.status);

      listHtml += `
        <div class="trainer-list-item ${isSelected ? 'selected' : ''}" onclick="selectTrainer(${idx})">
          <div class="trainer-list-info">
            <span class="trainer-list-name">${escapeHtml(t.name)}</span>
            <span class="trainer-list-pos">${escapeHtml(t.pos || 'Trainer')}</span>
          </div>
          <span class="status-badge" style="${statusBadgeStyle}">${escapeHtml(t.status || 'ACTIVE')}</span>
        </div>
      `;
    });
    listHtml += `</div>`;

    const tagCounts = { ABSENCE: 0, SL: 0, VL: 0, BL: 0, MED: 0, SUS: 0, HOL: 0, ML: 0, PL: 0 };
    const tagDates = { ABSENCE: [], SL: [], VL: [], BL: [], MED: [], SUS: [], HOL: [], ML: [], PL: [] };

    const selectedMonth = document.getElementById('filter-month')?.value || 'ALL';
    const selectedQuarter = document.getElementById('filter-quarter')?.value || 'ALL';

    const reliabilityGroups = rawData.trainerReliability?.groups || {};

    for (const gName in reliabilityGroups) {
      if (isTrainerMatch(gName, selectedTrainer.name) || gName.trim().toLowerCase() === selectedTrainer.name.trim().toLowerCase()) {
        reliabilityGroups[gName].members.forEach(m => {
          const mMatch = (selectedMonth === 'ALL' || m.month === selectedMonth);
          const qMatch = (selectedQuarter === 'ALL' || m.quarter === selectedQuarter);
          
          if (mMatch && qMatch) {
            const tag = String(m.tag || '').toUpperCase().trim();
            const dateStr = m.date || 'Unknown Date';

            if (tag === 'A' || tag === 'ABSENT') { tagCounts.ABSENCE++; tagDates.ABSENCE.push(dateStr); }
            else if (tag === 'SL') { tagCounts.SL++; tagDates.SL.push(dateStr); }
            else if (tag === 'VL') { tagCounts.VL++; tagDates.VL.push(dateStr); }
            else if (tag === 'BL') { tagCounts.BL++; tagDates.BL.push(dateStr); }
            else if (tag === 'MED') { tagCounts.MED++; tagDates.MED.push(dateStr); }
            else if (tag === 'SUS') { tagCounts.SUS++; tagDates.SUS.push(dateStr); }
            else if (tag === 'HOL') { tagCounts.HOL++; tagDates.HOL.push(dateStr); }
            else if (tag === 'ML') { tagCounts.ML++; tagDates.ML.push(dateStr); }
            else if (tag === 'PL') { tagCounts.PL++; tagDates.PL.push(dateStr); }
          }
        });
      }
    }

    window._currentTrainerTagDates = tagDates;

    window.toggleLeaveDates = (tagKey, cardEl) => {
      const leavePanel = document.getElementById('leave-dates-panel');
      const titleEl = document.getElementById('leave-dates-title');
      const containerEl = document.getElementById('leave-dates-container');
      
      if (!leavePanel || !window._currentTrainerTagDates) return;

      document.querySelectorAll('.leave-card').forEach(c => c.classList.remove('active-tag'));

      const dates = window._currentTrainerTagDates[tagKey] || [];
      
      if (leavePanel.style.display === 'block' && leavePanel.dataset.activeTag === tagKey) {
        leavePanel.style.display = 'none';
        leavePanel.dataset.activeTag = '';
        return;
      }

      cardEl.classList.add('active-tag');
      leavePanel.dataset.activeTag = tagKey;
      leavePanel.style.display = 'block';
      titleEl.innerText = `${tagKey} Recorded Dates (${dates.length})`;

      if (dates.length === 0) {
        containerEl.innerHTML = `<span style="font-size:0.8rem; color:#94a3b8;">No recorded dates for ${tagKey}.</span>`;
      } else {
        const isAlert = ['ABSENCE', 'SL', 'SUS', 'MED'].includes(tagKey);
        containerEl.innerHTML = dates.map(d => `<span class="date-pill ${isAlert ? 'tag-alert' : ''}">${ICONS.calendar} ${escapeHtml(d)}</span>`).join('');
      }
    };

    const leaveBreakdownHtml = `
      <div class="leave-breakdown-section">
        <h4>
          <span>${ICONS.clipboard} Attendance & Leave Breakdown</span>
          <small style="font-size:0.75rem; font-weight:normal; color:#64748b;">(Click any box to view recorded dates)</small>
        </h4>
        <div class="leave-grid">
          ${Object.keys(tagCounts).map(tagKey => {
            const count = tagCounts[tagKey];
            const hasCount = count > 0;
            return `
              <div class="leave-card clickable ${hasCount ? 'has-count' : ''}" onclick="toggleLeaveDates('${tagKey}', this)">
                <label>${tagKey}</label>
                <span>${count}</span>
              </div>
            `;
          }).join('')}
        </div>

        <div id="leave-dates-panel" class="leave-dates-panel" data-active-tag="">
          <div class="leave-dates-header">
            <span id="leave-dates-title">Recorded Dates</span>
            <span style="cursor:pointer; color:#64748b; font-size:1.1rem; font-weight:bold;" onclick="document.getElementById('leave-dates-panel').style.display='none';">&times;</span>
          </div>
          <div id="leave-dates-container" class="leave-date-pills"></div>
        </div>
      </div>
    `;

    const handledBatches = [];

    ['inhouse', 'pst'].forEach(deptType => {
      const groups = rawData[deptType]?.groups || {};
      for (const accName in groups) {
        for (const bName in groups[accName]) {
          const group = groups[accName][bName];
          if (!group.members) continue;

          const assignedMembers = group.members.filter(m => 
            isTrainerMatch(m.assignedTrainer, selectedTrainer.name)
          );

          if (assignedMembers.length > 0) {
            const hc = assignedMembers.length;
            const losses = assignedMembers.filter(m => m.isLoss).length;
            const attrNum = hc > 0 ? (losses / hc) * 100 : 0;
            const successNum = 100 - attrNum;

            handledBatches.push({
              department: deptType.toUpperCase(),
              account: accName,
              batch: bName,
              headcount: hc,
              losses: losses,
              attritionRate: attrNum.toFixed(1) + '%',
              successRate: successNum.toFixed(1) + '%',
              successNum: successNum,
              members: assignedMembers.sort((x, y) => (x.name || '').toString().localeCompare((y.name || '').toString()))
            });
          }
        }
      }
    });

    let overallHandledHC = 0, overallHandledLosses = 0;
    handledBatches.forEach(b => {
      overallHandledHC += b.headcount;
      overallHandledLosses += b.losses;
    });
    const overallSuccessRate = overallHandledHC > 0 
      ? (((overallHandledHC - overallHandledLosses) / overallHandledHC) * 100).toFixed(1) + '%' 
      : 'N/A';

    let handledBatchesHtml = '';
    if (handledBatches.length > 0) {
      handledBatchesHtml = `
        <div class="handled-batches-section">
          <h4>
            <span class="flex items-center">${ICONS.academicCap} Handled Batches & Success Rates (${handledBatches.length})</span>
            <span style="font-size:0.8rem; font-weight:600; color:#0369a1; background:#e0f2fe; padding:3px 10px; border-radius:12px; border:1px solid #bae6fd;">
              Overall Batch Success: <b>${overallSuccessRate}</b>
            </span>
          </h4>
          <small style="color:#64748b; margin-bottom:8px; display:block;">(Click any batch row to view its trainee roster)</small>
          
          <div style="border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; background: #fff;">
            <table class="handled-batches-table" style="margin-top:0;">
              <thead>
                <tr>
                  <th>Dept</th>
                  <th>Account</th>
                  <th>Batch</th>
                  <th style="text-align:center;">Trainees</th>
                  <th style="text-align:center;">Losses</th>
                  <th style="text-align:center;">Attrition Rate</th>
                  <th style="text-align:center;">Success Rate</th>
                </tr>
              </thead>
              <tbody>
                ${handledBatches.map((b, idx) => {
                  const successBadgeClass = b.successNum >= 90 ? 'badge-success-high' : 'badge-success-low';
                  return `
                    <tr style="cursor: pointer;" onclick="const row = document.getElementById('trainer-batch-roster-${idx}'); row.style.display = (row.style.display === 'none' || !row.style.display) ? 'table-row' : 'none';">
                      <td><b>${b.department}</b></td>
                      <td><b>${escapeHtml(b.account)}</b></td>
                      <td><b>${escapeHtml(b.batch)} ▾</b></td>
                      <td style="text-align:center;">${b.headcount}</td>
                      <td style="text-align:center; color:var(--crimson);"><b>${b.losses}</b></td>
                      <td style="text-align:center;">${b.attritionRate}</td>
                      <td style="text-align:center;">
                        <span class="badge-success-rate ${successBadgeClass}">${b.successRate}</span>
                      </td>
                    </tr>
                    <tr id="trainer-batch-roster-${idx}" style="display: none; background: #f8fafc;">
                      <td colspan="7" style="padding: 10px 15px;">
                        <div style="max-height: 200px; overflow-y: auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 6px;">
                          <table style="width: 100%; border-collapse: collapse; font-size: 0.78rem;">
                            <thead style="background: #f1f5f9;">
                              <tr>
                                <th style="padding: 6px 10px; text-align: left;">Trainee Name</th>
                                <th style="padding: 6px 10px; text-align: left;">Timeline</th>
                                <th style="padding: 6px 10px; text-align: center;">Present (P)</th>
                                <th style="padding: 6px 10px; text-align: center;">Absent (A)</th>
                                <th style="padding: 6px 10px; text-align: left;">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              ${b.members.map(m => `
                                <tr>
                                  <td style="padding: 6px 10px; border-bottom: 1px solid #f1f5f9;"><b>${escapeHtml(m.name)}</b></td>
                                  <td style="padding: 6px 10px; border-bottom: 1px solid #f1f5f9; color:#64748b;">${escapeHtml(m.quarter)} / ${escapeHtml(m.month)}</td>
                                  <td style="padding: 6px 10px; text-align: center; border-bottom: 1px solid #f1f5f9;">${m.p || 0}</td>
                                  <td style="padding: 6px 10px; text-align: center; border-bottom: 1px solid #f1f5f9; color: var(--crimson);"><b>${m.a || 0}</b></td>
                                  <td style="padding: 6px 10px; border-bottom: 1px solid #f1f5f9;"><span class="status-badge" style="${getStatusBadgeStyle(m.status)}">${escapeHtml(m.status)}</span></td>
                                </tr>
                              `).join('')}
                            </tbody>
                          </table>
                        </div>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    } else {
      handledBatchesHtml = `
        <div class="handled-batches-section">
          <h4 class="flex items-center">${ICONS.academicCap} Handled Batches & Success Rates</h4>
          <p style="color:#94a3b8; font-size:0.85rem; margin:8px 0 0 0;">No active or past batches are directly assigned to this trainer in the spreadsheet.</p>
        </div>
      `;
    }

    window.triggerAvatarUpload = () => {
      document.getElementById('trainer-photo-input').click();
    };

    window.handleAvatarFileChange = (event) => {
      const file = event.target.files[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        alert('Please select a valid image file.');
        return;
      }

      const spinner = document.getElementById('avatar-upload-spinner');
      if (spinner) spinner.style.display = 'flex';

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 500;
          const MAX_HEIGHT = 500;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.85);

          google.script.run
            .withSuccessHandler((res) => {
              if (spinner) spinner.style.display = 'none';
              if (res && res.success) {
                selectedTrainer.profilePic = res.url;
                render(cachedData);
              } else {
                alert('Upload error: ' + (res ? res.error : 'Unknown response from server'));
              }
            })
            .withFailureHandler((err) => {
              if (spinner) spinner.style.display = 'none';
              alert('Server error: ' + err.toString());
            })
            .uploadTrainerPhoto(selectedTrainer.name, compressedBase64, 'image/jpeg', file.name);
        };
        img.src = e.target.result;
      };

      reader.readAsDataURL(file);
    };

    const initials = escapeHtml(selectedTrainer.name.charAt(0).toUpperCase());
    const badgeStyle = getStatusBadgeStyle(selectedTrainer.status);

    const avatarImgTag = selectedTrainer.profilePic 
      ? `<img src="${escapeHtml(selectedTrainer.profilePic)}" alt="${escapeHtml(selectedTrainer.name)}" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';"><span style="display:none;">${initials}</span>` 
      : `<span>${initials}</span>`;

    const detailHtml = `
      <div class="trainer-detail-card">
        <input type="file" id="trainer-photo-input" accept="image/*" style="display:none;" onchange="handleAvatarFileChange(event)">

        <div class="trainer-profile-header">
          <div class="avatar-container" onclick="triggerAvatarUpload()" title="Click to upload profile photo">
            <div class="trainer-large-avatar">
              ${avatarImgTag}
            </div>
            <div class="avatar-upload-overlay">
              ${ICONS.camera}
              <span>Upload</span>
            </div>
            <div id="avatar-upload-spinner" class="avatar-upload-spinner">
              <span>Uploading...</span>
            </div>
          </div>

          <div class="trainer-header-details">
            <div style="display:flex; align-items:center; gap:10px;">
              <h2>${escapeHtml(selectedTrainer.name)}</h2>
              <span class="status-badge" style="${badgeStyle}">${escapeHtml(selectedTrainer.status || 'ACTIVE')}</span>
            </div>
            <span class="trainer-pos" style="font-size:0.82rem;">${escapeHtml(selectedTrainer.pos || 'Trainer')}</span>
          </div>
        </div>

        <div class="trainer-detail-grid">
          <div class="detail-box">
            <label>Employee ID</label>
            <span>${escapeHtml(selectedTrainer.employeeNo || 'N/A')}</span>
          </div>
          <div class="detail-box">
            <label>Start Date</label>
            <span>${escapeHtml(selectedTrainer.startDate || 'N/A')}</span>
          </div>
          <div class="detail-box">
            <label>Assigned Accounts</label>
            <span>${escapeHtml(selectedTrainer.accounts || 'Unassigned')}</span>
          </div>
          <div class="detail-box">
            <label>Assigned Tasks</label>
            <span>${escapeHtml(selectedTrainer.assignedTasks || 'None')}</span>
          </div>
          <div class="detail-box">
            <label>Attendance Rate</label>
            <span style="color:var(--indigo); font-weight:700;">${escapeHtml(selectedTrainer.attRate || 'N/A')}</span>
          </div>
          <div class="detail-box">
            <label>Reliability Rate</label>
            <span style="color:var(--indigo); font-weight:700;">${escapeHtml(selectedTrainer.relRate || 'N/A')}</span>
          </div>
        </div>

        ${leaveBreakdownHtml}
        ${handledBatchesHtml}
      </div>
    `;

    panel.innerHTML = `
      <h3 style="margin: 0 0 14px 0;">Trainers Directory (${filteredTrainers.length})</h3>
      <div class="trainers-split-container">
        ${listHtml}
        ${detailHtml}
      </div>
    `;
    return;
  }

  /* ==========================================================================
     VIEW 2 & 3: TRAINEES INHOUSE & PST
     ========================================================================== */
  if (currentType === 'inhouse' || currentType === 'pst') {
    const dept = currentType;
    const deptLabel = dept.toUpperCase();
    const filteredData = getFilteredData(rawData);
    const groups = filteredData[dept]?.groups || {};

    let html = `<div class="accounts-container"><h3 style="margin-bottom:15px;">${deptLabel} Trainees Breakdown</h3>`;
    let accountCount = 0;

    for (const accName in groups) {
      const batchKeys = Object.keys(groups[accName]).filter(b => groups[accName][b].members && groups[accName][b].members.length > 0);
      if (batchKeys.length === 0) continue;

      accountCount++;

      let accHeadcount = 0, accLosses = 0, accEndorsed = 0, accP = 0, accA = 0;
      batchKeys.forEach(b => {
        const g = groups[accName][b];
        accHeadcount += g.totalCount || 0;
        accLosses += g.losses || 0;
        accEndorsed += g.endorsed || 0;
        accP += g.p || 0;
        accA += g.a || 0;
      });

      const totalAttRecords = accP + accA;
      const accAttRate = totalAttRecords > 0 ? ((accP / totalAttRecords) * 100).toFixed(1) + '%' : '100.0%';
      const accAttrRate = accHeadcount > 0 ? ((accLosses / accHeadcount) * 100).toFixed(1) + '%' : '0.0%';
      const accColor = parseFloat(accAttrRate) > 10 ? 'var(--crimson)' : 'var(--indigo)';

      html += `
        <div class="account-group-card">
          <div class="account-header" onclick="this.classList.toggle('active');">
            <div class="account-title">
              <span>${ICONS.folder} ${escapeHtml(accName)}</span>
              <small style="font-weight:500; color:#64748b; font-size:0.78rem;">(${batchKeys.length} ${batchKeys.length === 1 ? 'Batch' : 'Batches'}) ▾</small>
            </div> 
            <div class="account-stats">
              <span>Headcount: <b>${accHeadcount}</b></span> | 
              <span>Losses: <b style="color:var(--crimson)">${accLosses}</b></span> | 
              <span>Endorsed: <b style="color:var(--indigo)">${accEndorsed}</b></span> | 
              <span style="margin-left:8px;">
                Att: <b>${accAttRate}</b> | Attr: <b style="color:${accColor}">${accAttrRate}</b>
              </span>
            </div>
          </div>
          
          <div class="account-content">
            ${batchKeys.map(batchName => {
              const group = groups[accName][batchName];
              const batchColor = parseFloat(group.attritionRate) > 10 ? 'var(--crimson)' : 'var(--indigo)';
              return `
                <div class="batch-subcard">
                  <div class="batch-subheader" onclick="this.classList.toggle('active');">
                    <div>
                      <span style="font-weight:700; color:var(--indigo);">Batch: ${escapeHtml(batchName)} ▾</span>
                    </div>
                    <div style="font-size:0.8rem; color:#475569;">
                      <span>HC: <b>${group.totalCount}</b></span> | 
                      <span>Losses: <b style="color:var(--crimson)">${group.losses}</b></span> | 
                      <span>Endorsed: <b style="color:var(--indigo)">${group.endorsed}</b></span> | 
                      <span>Att: <b>${group.attRate}</b> | Attr: <b style="color:${batchColor}">${group.attritionRate}</b></span>
                    </div>
                  </div>
                  <div class="batch-subcontent">
                    ${group.members.map(m => {
                      const statusBadgeStyle = getStatusBadgeStyle(m.status);
                      return `
                        <div class="trainee-row">
                          <span>
                            <b>${escapeHtml(m.name)}</b>
                            <small style="color:#aaa; margin-left: 10px;">(${escapeHtml(m.quarter)} / ${escapeHtml(m.month)})</small>
                          </span>
                          <span>
                            <span style="margin-right:15px; font-size:0.8rem; color:#555;">P: <b>${m.p}</b> | A: <b style="color:var(--crimson)">${m.a}</b></span>
                            <span class="status-badge" style="${statusBadgeStyle}">${escapeHtml(m.status)}</span>
                          </span>
                        </div>`;
                    }).join('')}
                  </div>
                </div>`;
            }).join('')}
          </div>
        </div>`;
    }

    if (accountCount === 0) {
      html += '<p style="text-align:center; padding:20px; color:#666;">No trainee accounts found matching the selected filters.</p>';
    }

    html += `</div>`;
    panel.innerHTML = html;
    return;
  }

  /* ==========================================================================
     VIEW 4: TRAINER ATTENDANCE & RELIABILITY
     ========================================================================== */
  if (currentType === 'trainer-attendance' || currentType === 'trainer-reliability') {
    const isRel = currentType === 'trainer-reliability';
    const rawDataset = isRel ? rawData.trainerReliability : rawData.trainerAttendance;
    
    if (!rawDataset || !rawDataset.groups || Object.keys(rawDataset.groups).length === 0) {
      panel.innerHTML = `<p style="text-align:center; padding:20px; color:#666;">No trainer ${isRel ? 'reliability' : 'attendance'} records found.</p>`;
      return;
    }

    const selectedMonth = document.getElementById('filter-month')?.value || 'ALL';
    const selectedQuarter = document.getElementById('filter-quarter')?.value || 'ALL';
    const searchQuery = (document.getElementById('search-query')?.value || '').toLowerCase();

    let html = `<div class="accounts-container"><h3>Trainer ${isRel ? 'Reliability (SL, VL, ML, PL, HOL, SUS, MED, BL counted as losses)' : 'Attendance (SUS counted as a loss)'} Breakdown</h3>`;
    
    let renderedCount = 0;
    for (const [trainerName, group] of Object.entries(rawDataset.groups)) {
      if (searchQuery && !trainerName.toLowerCase().includes(searchQuery)) continue;

      const filteredMembers = group.members.filter(m => {
        const mMatch = (selectedMonth === 'ALL' || m.month === selectedMonth);
        const qMatch = (selectedQuarter === 'ALL' || m.quarter === selectedQuarter);
        return mMatch && qMatch;
      });

      if (filteredMembers.length === 0 && (selectedMonth !== 'ALL' || selectedQuarter !== 'ALL')) continue;
      renderedCount++;

      let pCount = filteredMembers.reduce((acc, m) => acc + m.p, 0);
      let aCount = filteredMembers.reduce((acc, m) => acc + m.a, 0);
      let susCount = filteredMembers.reduce((acc, m) => acc + (m.sus || 0), 0);
      let lCount = filteredMembers.reduce((acc, m) => acc + (m.losses || 0), 0);
      let totalRec = isRel ? (pCount + aCount + lCount) : (pCount + aCount + susCount);
      let rate = totalRec > 0 ? ((pCount / totalRec) * 100).toFixed(1) + '%' : '100.0%';

      html += `
        <div class="batch-header" onclick="this.classList.toggle('active');" style="border-left-color: var(--indigo);">
          <div style="font-weight:bold; font-size:1.05rem;">${escapeHtml(trainerName)}</div> 
          <div class="batch-header-stats">
            <span>Present: <b>${pCount}</b></span> | 
            <span>Absent: <b style="color:var(--crimson)">${aCount}</b></span> | 
            ${!isRel ? `<span>Suspension: <b style="color:var(--crimson)">${susCount}</b></span> | ` : ''}
            ${isRel ? `<span>Losses (SL/VL/etc): <b style="color:var(--crimson)">${lCount}</b></span> | ` : ''}
            <span style="margin-left:10px; font-size:0.8rem; color:#666;">
              Rate: <b class="highlight-stat">${rate}</b>
            </span>
          </div>
        </div>
        <div class="batch-content">
          ${filteredMembers.map(m => `
            <div class="trainee-row">
              <span>Timeline: <b>${escapeHtml(m.quarter)} / ${escapeHtml(m.month)}</b></span>
              <span>Present: <b>${m.p}</b> | Absent: <b>${m.a}</b> ${isRel ? `| Losses: <b>${m.losses}</b>` : `| SUS: <b>${m.sus || 0}</b>`}</span>
            </div>`).join('')}
        </div>`;
    }

    if (renderedCount === 0) {
      html += '<p style="text-align:center; padding:20px; color:#666;">No records match your filters.</p>';
    }

    html += `</div>`;
    panel.innerHTML = html;
    return;
  }

  /* ==========================================================================
     VIEW 5: CLIENT ACCOUNTS
     ========================================================================== */
  if (currentType === 'accounts') {
    const accountRecords = generateAccountMetrics(rawData);
    const validRecords = accountRecords.filter(r => r.headcount > 0);

    if (validRecords.length === 0) {
      panel.innerHTML = '<p style="text-align:center; padding:20px; color:#666;">No account profiles match the chosen filters.</p>';
      return;
    }

    let html = `<div class="accounts-container"><h3>Client Accounts (Click rows to expand trainee lists)</h3>`;
    validRecords.forEach((acc) => {
      const color = parseFloat(acc.attritionRate) > 10 ? 'var(--crimson)' : 'var(--indigo)';
      html += `
        <div class="batch-header" onclick="this.classList.toggle('active');" style="border-left-color: var(--indigo);">
          <div style="font-weight:bold; font-size:1.05rem;">${escapeHtml(acc.accountName)}</div> 
          <div class="batch-header-stats">
            <span>HC: <b>${acc.headcount}</b></span> | 
            <span>Ongoing: <b style="color:#b45309">${acc.ongoing}</b></span> | 
            <span>Losses: <b style="color:var(--crimson)">${acc.losses}</b></span> | 
            <span style="margin-left:10px; font-size:0.8rem; color:#666;">
              (Att: ${acc.attendanceRate} | Attr: <b style="color:${color}">${acc.attritionRate}</b>)
            </span>
          </div>
        </div>
        <div class="batch-content">
          ${acc.traineesList.map(t => {
            const isOngoing = t.status && t.status.toString().trim().toLowerCase() === 'ongoing';
            const statusBadgeStyle = isOngoing 
              ? `background:#fffbeb; color:#b45309; border: 1px solid #fde68a;` 
              : `background:#fdf6e3; color:#856404; border: 1px solid var(--gold);`;
            return `
              <div class="trainee-row">
                <span>
                  <b>${escapeHtml(t.name)}</b> 
                  <small style="color:#888; margin-left: 12px;">Batch: ${escapeHtml(t.batch)}</small>
                  <small style="color:#aaa; margin-left: 10px;">(${escapeHtml(t.timeline)})</small>
                </span>
                <span class="status-badge" style="${statusBadgeStyle}">${escapeHtml(t.status)}</span>
              </div>`;
          }).join('')}
        </div>`;
    });
    html += `</div>`;
    panel.innerHTML = html;
    return;
  }

  /* ==========================================================================
     VIEW 6: ANALYTICS TRENDS
     ========================================================================== */
  if (currentType === 'analytics') {
    const trendData = generateTrendAnalytics(rawData);
    const renderTrendTable = (dataset) => `
      <table class="analytics-table">
        <thead>
          <tr>
            <th>Period Title</th>
            <th>Active HC</th>
            <th>Losses</th>
            <th>Attrition Rate</th>
            <th>Attendance Rate</th>
          </tr>
        </thead>
        <tbody>
          ${dataset.length === 0 
            ? '<tr><td colspan="5" style="text-align:center">No Matches Found</td></tr>' 
            : dataset.map(d => `
                <tr>
                  <td><b>${escapeHtml(d.period)}</b></td>
                  <td>${d.headcount}</td>
                  <td style="color:var(--crimson)">${d.losses}</td>
                  <td><span class="badge-rate alert-${parseFloat(d.attritionRate) > 10}">${d.attritionRate}</span></td>
                  <td>${d.attendanceRate}</td>
                </tr>`).join('')}
        </tbody>
      </table>`;

    const renderDepartmentSection = (title, dataKey) => `
      <div class="dept-trend-card">
        <h3 class="dept-trend-title">${escapeHtml(title)}</h3>
        <div class="trend-grid">
          <div class="trend-section">
            ${generateSvgChart(trendData[dataKey].quarters, `${title} - Quarterly Trajectory`)}
            ${renderTrendTable(trendData[dataKey].quarters)}
          </div>
          <div class="trend-section">
            ${generateSvgChart(trendData[dataKey].months, `${title} - Monthly Trajectory`)}
            ${renderTrendTable(trendData[dataKey].months)}
          </div>
        </div>
      </div>`;

    let html = `<div class="analytics-container">`;
    html += `<div class="side-by-side-container">`;
    html += renderDepartmentSection("INHOUSE Training Trends", "inhouse");
    html += renderDepartmentSection("PST Training Trends", "pst");
    html += `</div>`;
    html += `<div class="full-width-card">`;
    html += renderDepartmentSection("Overall Departmental Trends", "overall");
    html += `</div>`;
    html += `</div>`;

    panel.innerHTML = html;
    return;
  }

  /* ==========================================================================
     VIEW 7: EXECUTIVE SUMMARY
     ========================================================================== */
  const data = getFilteredData(rawData);

  if (currentType === 'summary') {
    const activeBatches = [];

    ['inhouse', 'pst'].forEach(type => {
      if (!data[type]?.groups) return;

      for (const accName in data[type].groups) {
        const displayAcc = accName && accName.trim() !== "" ? accName.trim() : "General/Unassigned";

        for (const bName in data[type].groups[accName]) {
          const group = data[type].groups[accName][bName];
          if (!group.members || group.members.length === 0) continue;

          const ongoingCount = group.members.filter(m => isOngoingStatus(m.status)).length;

          if (ongoingCount > 0) {
            const hc = group.members.length;
            const losses = group.members.filter(m => m.isLoss).length;
            const attritionRate = hc > 0 ? ((losses / hc) * 100).toFixed(1) + '%' : '0.0%';

            let totalP = 0, totalA = 0;
            group.members.forEach(m => {
              totalP += (m.p || 0);
              totalA += (m.a || 0);
            });
            const totalAtt = totalP + totalA;
            const attendanceRate = totalAtt > 0 ? ((totalP / totalAtt) * 100).toFixed(1) + '%' : '100.0%';

            activeBatches.push({
              accountName: displayAcc,
              batchName: bName,
              headcount: hc,
              ongoing: ongoingCount,
              losses: losses,
              attritionRate: attritionRate,
              attendanceRate: attendanceRate,
              members: group.members.sort((x, y) => (x.name || '').toString().localeCompare((y.name || '').toString()))
            });
          }
        }
      }
    });

    const ts = data.summary.trainersSummary || { 
      headcount: 0, 
      attendanceRate: '100.0%', 
      reliabilityRate: '100.0%', 
      attritionRate: '0.0%',
      totalLosses: 0 
    };

    let ongoingAccountsTableHtml = '';
    if (activeBatches.length > 0) {
      ongoingAccountsTableHtml = `
        <div style="border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; background: #fff;">
          <table class="analytics-table" style="margin-top:0;">
            <thead>
              <tr>
                <th>Account</th>
                <th>Batch</th>
                <th>HC</th>
                <th>Ongoing</th>
                <th>Losses</th>
                <th>Attrition</th>
                <th>Attendance</th>
              </tr>
            </thead>
            <tbody>
              ${activeBatches.map((b, idx) => `
                <tr style="cursor: pointer; background: #fff;" onclick="const row = document.getElementById('batch-row-${idx}'); row.style.display = (row.style.display === 'none' || !row.style.display) ? 'table-row' : 'none';">
                  <td><b>${escapeHtml(b.accountName)}</b></td>
                  <td><b>${escapeHtml(b.batchName)} ▾</b></td>
                  <td>${b.headcount}</td>
                  <td><b style="color:#b45309">${b.ongoing}</b></td>
                  <td style="color:var(--crimson)">${b.losses}</td>
                  <td><span class="badge-rate alert-${parseFloat(b.attritionRate) > 10}">${b.attritionRate}</span></td>
                  <td><b>${b.attendanceRate}</b></td>
                </tr>
                <tr id="batch-row-${idx}" style="display: none; background: #f8fafc;">
                  <td colspan="7" style="padding: 10px 15px;">
                    <div style="max-height: 200px; overflow-y: auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 6px;">
                      <table style="width: 100%; border-collapse: collapse; font-size: 0.82rem;">
                        <thead style="background: #f1f5f9;">
                          <tr>
                            <th style="padding: 6px; text-align: left;">Trainee Name</th>
                            <th style="padding: 6px; text-align: left;">Status</th>
                            <th style="padding: 6px; text-align: center;">P</th>
                            <th style="padding: 6px; text-align: center;">A</th>
                          </tr>
                        </thead>
                        <tbody>
                          ${b.members.map(m => `
                              <tr>
                                <td style="padding: 6px; border-bottom: 1px solid #f1f5f9;">${escapeHtml(m.name)}</td>
                                <td style="padding: 6px; border-bottom: 1px solid #f1f5f9;"><span class="status-badge" style="${getStatusBadgeStyle(m.status)}">${escapeHtml(m.status)}</span></td>
                                <td style="padding: 6px; text-align: center; border-bottom: 1px solid #f1f5f9;">${m.p}</td>
                                <td style="padding: 6px; text-align: center; border-bottom: 1px solid #f1f5f9; color: var(--crimson);">${m.a}</td>
                              </tr>
                          `).join('')}
                        </tbody>
                      </table>
                    </div>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>`;
    }

    const leftColumnHtml = `
      <div class="summary-column">
        <div class="summary-card-block">
          <h3>Executive Performance Overview</h3>
          
          <div class="stat-grid" style="margin-bottom: 16px;">
            <div><label>Headcount</label><p>${data.summary.totalHeadcount}</p></div>
            <div><label>Losses</label><p style="color:var(--crimson)">${data.summary.totalLosses}</p></div>
            <div><label>Global Attrition</label><p class="highlight-stat">${data.summary.globalRate}</p></div>
          </div>

          <div class="dept-card">
            <div class="dept-card-header">INHOUSE</div>
            <div class="dept-card-metrics">
              <div class="metric-item"><label>Headcount</label><span>${data.summary.inhouse.count}</span></div>
              <div class="metric-item"><label>Ongoing</label><span>${data.summary.inhouse.ongoing}</span></div>
              <div class="metric-item"><label>Losses</label><span style="color:var(--crimson)">${data.summary.inhouse.losses}</span></div>
              <div class="metric-item"><label>Attrition</label><span class="highlight-stat">${data.summary.inhouse.rate}</span></div>
            </div>
          </div>

          <div class="dept-card">
            <div class="dept-card-header">PST</div>
            <div class="dept-card-metrics">
              <div class="metric-item"><label>Headcount</label><span>${data.summary.pst.count}</span></div>
              <div class="metric-item"><label>Ongoing</label><span>${data.summary.pst.ongoing}</span></div>
              <div class="metric-item"><label>Losses</label><span style="color:var(--crimson)">${data.summary.pst.losses}</span></div>
              <div class="metric-item"><label>Attrition</label><span class="highlight-stat">${data.summary.pst.rate}</span></div>
            </div>
          </div>

          <div class="dept-card" style="border-left-color: var(--gold); margin-bottom: 0;">
            <div class="dept-card-header">TRAINERS</div>
            <div class="dept-card-metrics">
              <div class="metric-item"><label>Active Count</label><span>${ts.headcount}</span></div>
              <div class="metric-item"><label>Losses</label><span style="color:var(--crimson)">${ts.totalLosses}</span></div>
              <div class="metric-item"><label>Attrition</label><span class="highlight-stat">${ts.attritionRate || '0.0%'}</span></div>
              <div class="metric-item"><label>Attendance</label><span>${ts.attendanceRate}</span></div>
              <div class="metric-item"><label>Reliability</label><span>${ts.reliabilityRate}</span></div>
            </div>
          </div>
        </div>

        ${activeBatches.length > 0 ? `
          <div class="summary-card-block">
            <h3>Active Accounts & Batches in Training</h3>
            ${ongoingAccountsTableHtml}
          </div>
        ` : ''}
      </div>
    `;

    const trendData = generateTrendAnalytics(rawData);
    const rightColumnHtml = `
      <div class="summary-column">
        <div class="summary-card-block">
          <h3>Performance Trajectory Charts</h3>
          ${generateSvgChart(trendData.overall.quarters, "Quarterly Attrition Trajectory")}
          ${generateSvgChart(trendData.overall.months, "Monthly Attrition Trajectory")}
        </div>

        <div class="summary-card-block">
          <h3>Quarterly Analytics Breakdown</h3>
          <table class="analytics-table" style="margin-top:0;">
            <thead>
              <tr>
                <th>Period Title</th>
                <th>Active HC</th>
                <th>Losses</th>
                <th>Attrition Rate</th>
                <th>Attendance Rate</th>
              </tr>
            </thead>
            <tbody>
              ${trendData.overall.quarters.map(d => `
                <tr>
                  <td><b>${escapeHtml(d.period)}</b></td>
                  <td>${d.headcount}</td>
                  <td style="color:var(--crimson)">${d.losses}</td>
                  <td><span class="badge-rate alert-${parseFloat(d.attritionRate) > 10}">${d.attritionRate}</span></td>
                  <td>${d.attendanceRate}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;

    panel.innerHTML = `
      <div class="summary-split-container">
        ${leftColumnHtml}
        ${rightColumnHtml}
      </div>
    `;
  }

  /* ==========================================================================
     CONSOLIDATED TRAINEES VIEW
     ========================================================================== */
  if (currentType === 'trainees') {
    const filteredData = getFilteredData(rawData);
    const searchQuery = (document.getElementById('search-query')?.value || '').toLowerCase();
    const selectedAccount = document.getElementById('filter-account')?.value || 'ALL';

    const renderDepartmentBatches = (deptType) => {
      const groups = filteredData[deptType]?.groups || {};
      const batchList = [];

      for (const accName in groups) {
        if (selectedAccount !== 'ALL' && accName !== selectedAccount) continue;

        for (const bName in groups[accName]) {
          const group = groups[accName][bName];
          if (!group.members || group.members.length === 0) continue;

          const matchedMembers = group.members.filter(m => {
            if (!searchQuery) return true;
            return (m.name && m.name.toLowerCase().includes(searchQuery)) ||
                   accName.toLowerCase().includes(searchQuery) ||
                   bName.toLowerCase().includes(searchQuery) ||
                   (m.assignedTrainer && m.assignedTrainer.toLowerCase().includes(searchQuery));
          });

          if (matchedMembers.length === 0) continue;

          const hc = matchedMembers.length;
          const losses = matchedMembers.filter(m => m.isLoss).length;
          const attrRate = hc > 0 ? ((losses / hc) * 100).toFixed(1) + '%' : '0.0%';

          let totalP = 0, totalA = 0;
          matchedMembers.forEach(m => {
            totalP += (m.p || 0);
            totalA += (m.a || 0);
          });

          const totalAtt = totalP + totalA;
          const attRate = totalAtt > 0 ? ((totalP / totalAtt) * 100).toFixed(1) + '%' : '100.0%';

          const assignedTrainers = [...new Set(
            matchedMembers
              .map(m => m.assignedTrainer)
              .filter(t => t && t !== 'N/A' && t !== '')
          )];
          
          const primaryTrainer = assignedTrainers.length > 0 ? assignedTrainers.join(', ') : 'Unassigned';

          batchList.push({
            accountName: accName,
            batchName: bName,
            headcount: hc,
            losses: losses,
            attritionRate: attrRate,
            attendanceRate: attRate,
            assignedTrainer: primaryTrainer,
            members: matchedMembers.sort((x, y) => (x.name || '').toString().localeCompare((y.name || '').toString()))
          });
        }
      }

      if (batchList.length === 0) {
        return `<p style="color:#94a3b8; font-size:0.85rem; text-align:center; padding:15px 0;">No batches found.</p>`;
      }

      return batchList.map((b, idx) => `
        <div class="batch-subcard" style="margin-bottom:8px;">
          <div class="batch-subheader" onclick="const content = document.getElementById('${deptType}-batch-${idx}'); content.style.display = (content.style.display === 'none' || !content.style.display) ? 'block' : 'none';">
            <div>
              <span style="font-weight:700; color:var(--charcoal);">${escapeHtml(b.accountName)}</span>
              <small style="color:var(--indigo); font-weight:600; margin-left:4px;">-${escapeHtml(b.batchName)} ▾</small>
              ${deptType === 'pst' ? `<span class="trainer-badge" style="margin-left:6px;">${ICONS.user} ${escapeHtml(b.assignedTrainer)}</span>` : ''}
            </div>
            <div style="font-size:0.75rem; color:#64748b;">
              <span>HC: <b>${b.headcount}</b></span> | 
              <span>Attr: <b style="color:${parseFloat(b.attritionRate) > 10 ? 'var(--crimson)' : 'var(--indigo)'}">${b.attritionRate}</b></span>
            </div>
          </div>
          <div id="${deptType}-batch-${idx}" class="batch-subcontent" style="display:none; padding:8px;">
            <div style="max-height: 200px; overflow-y: auto;">
              <table style="width: 100%; border-collapse: collapse; font-size: 0.78rem;">
                <thead>
                  <tr style="background:#f1f5f9;">
                    <th style="padding:4px 6px; text-align:left;">Name</th>
                    ${deptType === 'pst' ? `<th style="padding:4px 6px; text-align:left;">Assigned Trainer</th>` : ''}
                    <th style="padding:4px 6px; text-align:center;">P</th>
                    <th style="padding:4px 6px; text-align:center;">A</th>
                    <th style="padding:4px 6px; text-align:left;">Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${b.members.map(m => `
                    <tr>
                      <td style="padding:4px 6px; border-bottom:1px solid #f1f5f9;"><button type="button" class="trainee-name-trigger" onclick="openTraineeDrawer('${traineeDrawerPayload({ ...m, accountName: b.accountName, batch: b.batchName, training: deptType === 'inhouse' ? 'Inhouse Training' : 'PST Training' })}')">${escapeHtml(m.name)}</button></td>
                      ${deptType === 'pst' ? `<td style="padding:4px 6px; border-bottom:1px solid #f1f5f9; color:#475569;">${escapeHtml(m.assignedTrainer || 'N/A')}</td>` : ''}
                      <td style="padding:4px 6px; text-align:center; border-bottom:1px solid #f1f5f9;">${m.p || 0}</td>
                      <td style="padding:4px 6px; text-align:center; border-bottom:1px solid #f1f5f9; color:var(--crimson);">${m.a || 0}</td>
                      <td style="padding:4px 6px; border-bottom:1px solid #f1f5f9;"><span class="status-badge" style="${getStatusBadgeStyle(m.status)}">${escapeHtml(m.status)}</span></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `).join('');
    };

    const renderAccountAggregates = () => {
      const accountRecords = generateAccountMetrics(rawData);
      const validRecords = accountRecords.filter(r => {
        if (selectedAccount !== 'ALL' && r.accountName !== selectedAccount) return false;
        if (!searchQuery) return r.headcount > 0;
        return r.accountName.toLowerCase().includes(searchQuery) ||
               r.traineesList.some(t => t.name.toLowerCase().includes(searchQuery));
      });

      if (validRecords.length === 0) {
        return `<p style="color:#94a3b8; font-size:0.85rem; text-align:center; padding:15px 0;">No client accounts found.</p>`;
      }

      return validRecords.map((acc, idx) => `
        <div class="batch-subcard" style="margin-bottom:8px;">
          <div class="batch-subheader" style="border-left-color: var(--gold);" onclick="const content = document.getElementById('acc-group-${idx}'); content.style.display = (content.style.display === 'none' || !content.style.display) ? 'block' : 'none';">
            <div>
              <span style="font-weight:700; color:var(--charcoal);">${escapeHtml(acc.accountName)} ▾</span>
            </div>
            <div style="font-size:0.75rem; color:#64748b;">
              <span>HC: <b>${acc.headcount}</b></span> | 
              <span>Attr: <b style="color:${parseFloat(acc.attritionRate) > 10 ? 'var(--crimson)' : 'var(--indigo)'}">${acc.attritionRate}</b></span>
            </div>
          </div>
          <div id="acc-group-${idx}" class="batch-subcontent" style="display:none; padding:8px;">
            <div style="max-height: 180px; overflow-y: auto;">
              <table style="width: 100%; border-collapse: collapse; font-size: 0.78rem;">
                <thead>
                  <tr style="background:#f1f5f9;">
                    <th style="padding:4px 6px; text-align:left;">Trainee Name</th>
                    <th style="padding:4px 6px; text-align:left;">Batch</th>
                    <th style="padding:4px 6px; text-align:left;">Status</th>
                  </tr>
                </thead>
                <tbody>
                  ${acc.traineesList.map(t => `
                    <tr>
                      <td style="padding:4px 6px; border-bottom:1px solid #f1f5f9;"><button type="button" class="trainee-name-trigger" onclick="openTraineeDrawer('${traineeDrawerPayload(t)}')">${escapeHtml(t.name)}</button></td>
                      <td style="padding:4px 6px; border-bottom:1px solid #f1f5f9; color:#64748b;">${escapeHtml(t.batch)}</td>
                      <td style="padding:4px 6px; border-bottom:1px solid #f1f5f9;"><span class="status-badge" style="${getStatusBadgeStyle(t.status)}">${escapeHtml(t.status)}</span></td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `).join('');
    };

    panel.innerHTML = `
      <div class="trainees-three-column-grid"> 
        <div class="trainee-section-card inhouse-theme">
          <h3>
            <span class="flex items-center">${ICONS.building} INHOUSE TRAINING</span>
            <span class="status-badge" style="background:#eff6ff; color:#1d4ed8;">Dept 1</span>
          </h3>
          ${renderDepartmentBatches('inhouse')}
        </div>

        <div class="trainee-section-card pst-theme">
          <h3>
            <span class="flex items-center">${ICONS.academicCap} PST TRAINING</span>
            <span class="status-badge" style="background:#f0fdf4; color:#15803d;">Dept 2</span>
          </h3>
          ${renderDepartmentBatches('pst')}
        </div>

        <div class="trainee-section-card accounts-theme">
          <h3>
            <span class="flex items-center">${ICONS.briefcase} CLIENT ACCOUNTS</span>
            <span class="status-badge" style="background:#fffbeb; color:#b45309;">Summary</span>
          </h3>
          ${renderAccountAggregates()}
        </div>
      </div>
    `;
    return;
  }
}

function traineeDrawerPayload(trainee) {
  return encodeURIComponent(JSON.stringify(trainee)).replace(/'/g, '%27');
}

function closeTraineeDrawer() {
  const drawer = document.getElementById('trainee-detail-drawer');
  if (!drawer) return;
  drawer.classList.remove('is-open');
  window.setTimeout(() => drawer.remove(), 240);
}

function openTraineeDrawer(encodedTrainee) {
  let trainee;
  try {
    trainee = JSON.parse(decodeURIComponent(encodedTrainee));
  } catch (error) {
    console.error('Unable to open trainee details.', error);
    return;
  }

  const currentDrawer = document.getElementById('trainee-detail-drawer');
  if (currentDrawer) currentDrawer.remove();

  const present = Number(trainee.p || 0);
  const absent = Number(trainee.a || 0);
  const attendance = present + absent > 0 ? `${((present / (present + absent)) * 100).toFixed(1)}%` : 'N/A';
  const status = trainee.status || 'Unknown';
  const outcome = trainee.isEndorsed ? 'Endorsed' : trainee.isLoss ? 'Marked as loss' : 'In progress';
  const detailRow = (label, value) => `<div class="trainee-drawer-row"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value || 'N/A')}</strong></div>`;

  const drawer = document.createElement('div');
  drawer.id = 'trainee-detail-drawer';
  drawer.className = 'trainee-detail-drawer';
  drawer.innerHTML = `
    <button class="trainee-drawer-backdrop" aria-label="Close trainee details" onclick="closeTraineeDrawer()"></button>
    <aside class="trainee-drawer-panel" role="dialog" aria-modal="true" aria-label="${escapeHtml(trainee.name)} details">
      <header class="trainee-drawer-header">
        <div>
          <div class="trainee-drawer-title-row"><h2>${escapeHtml(trainee.name)}</h2><span class="status-badge" style="${getStatusBadgeStyle(status)}">${escapeHtml(status)}</span></div>
          <p>${escapeHtml(trainee.batch || trainee.batchName || 'Unassigned batch')}</p>
          <small>${escapeHtml(trainee.accountName || trainee.account || 'Unassigned account')}</small>
        </div>
        <button class="trainee-drawer-close" type="button" aria-label="Close trainee details" onclick="closeTraineeDrawer()">&times;</button>
      </header>
      <div class="trainee-drawer-content">
        <section><h3>Trainee Information</h3><div class="trainee-drawer-list">
          ${detailRow('Full Name', trainee.name)}
          ${detailRow('Batch', trainee.batch || trainee.batchName)}
          ${detailRow('Account / Client', trainee.accountName || trainee.account)}
          ${detailRow('Training', trainee.training || trainee.trainingType)}
          ${detailRow('Trainer', trainee.assignedTrainer || 'Not assigned')}
          ${detailRow('Status', status)}
        </div></section>
        <section><h3>Performance</h3><div class="trainee-performance-grid">
          <div><span>Attendance</span><strong class="primary-blue">${attendance}</strong></div>
          <div><span>Present / Absent</span><strong>${present} <em>/</em> <b>${absent}</b></strong></div>
          <div class="full"><span>Training outcome</span><strong>${outcome}</strong></div>
        </div></section>
        ${(trainee.month || trainee.quarter || trainee.timeline) ? `<p class="trainee-drawer-period">Reporting period: ${escapeHtml(trainee.timeline || [trainee.month, trainee.quarter].filter(Boolean).join(' / '))}</p>` : ''}
      </div>
    </aside>`;
  document.body.appendChild(drawer);
  requestAnimationFrame(() => drawer.classList.add('is-open'));
}

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') closeTraineeDrawer();
});
