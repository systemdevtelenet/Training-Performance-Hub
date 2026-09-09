export interface Trainee {
  name: string;
  status: string;
  month: string;
  quarter: string;
  p: number;
  a: number;
  isEndorsed?: boolean;
  isLoss?: boolean;
  assignedTrainer?: string;
}

export interface BatchGroup {
  members: Trainee[];
  totalCount?: number;
  endorsed?: number;
  losses?: number;
  p?: number;
  a?: number;
  attritionRate?: string;
  attRate?: string;
}

export interface Trainer {
  name: string;
  status: string;
  pos?: string;
  employeeNo?: string;
  startDate?: string;
  accounts?: string;
  assignedTasks?: string;
  attRate?: string;
  relRate?: string;
  profilePic?: string;
}

export const MONTH_ORDER = [
  "January", "February", "March", "April", "May", "June", 
  "July", "August", "September", "October", "November", "December"
];

export const TRAINER_NAME_MAP: Record<string, string[]> = {
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

export function isTrainerMatch(assignedStr?: string, trainerFullName?: string): boolean {
  if (!assignedStr || !trainerFullName) return false;
  const cleanAssigned = String(assignedStr).trim().toLowerCase();
  const cleanFull = String(trainerFullName).trim().toLowerCase();

  if (cleanAssigned === cleanFull || cleanAssigned.includes(cleanFull) || cleanFull.includes(cleanAssigned)) {
    return true;
  }

  const aliases = TRAINER_NAME_MAP[cleanFull];
  if (aliases?.some(alias => cleanAssigned === alias || cleanAssigned.includes(alias) || alias.includes(cleanAssigned))) {
    return true;
  }

  for (const [fullNameKey, aliasList] of Object.entries(TRAINER_NAME_MAP)) {
    if (cleanFull.includes(fullNameKey) || fullNameKey.includes(cleanFull)) {
      if (aliasList.some(alias => cleanAssigned.includes(alias))) return true;
    }
  }

  return false;
}

export const isOngoingStatus = (status?: string): boolean => {
  const s = String(status || '').toUpperCase().trim();
  return s.includes('ONGOING') || s.includes('ON GOING') || s.includes('ON-GOING') || s === 'ACTIVE';
};

export const matchesMonthFilter = (mMonth?: string, selectedMonth?: string, status?: string): boolean => {
  if (!selectedMonth || selectedMonth === 'ALL' || !mMonth || mMonth === 'Unknown') return true;
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

export const matchesQuarterFilter = (mQuarter?: string, selectedQuarter?: string, status?: string): boolean => {
  if (!selectedQuarter || selectedQuarter === 'ALL' || !mQuarter || mQuarter === 'Unknown') return true;
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

export function getFilteredData(data: any, filters: { month: string; quarter: string; account: string; search: string }) {
  if (!data) return null;
  const { month: selectedMonth, quarter: selectedQuarter, account: selectedAccount, search: searchQuery } = filters;
  
  const filtered = JSON.parse(JSON.stringify(data));
  const uniqueNames = new Set<string>();
  
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
        const group: BatchGroup = filtered[type].groups[acc][b];
        
        const matchedMembers = group.members.filter(m => {
          const mMatch = matchesMonthFilter(m.month, selectedMonth, m.status);
          const qMatch = matchesQuarterFilter(m.quarter, selectedQuarter, m.status);
          const searchMatch = !searchQuery || 
            (m.name && m.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
            b.toLowerCase().includes(searchQuery.toLowerCase());
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
            summaryStats[type as 'inhouse' | 'pst'].ongoing++;
          }
        });
        
        group.p = totalP;
        group.a = totalA;

        const lossRate = group.totalCount > 0 ? (group.losses / group.totalCount) * 100 : 0;
        group.attritionRate = lossRate.toFixed(1) + '%';
        
        const totalAttRecords = group.p + group.a;
        const attendanceRate = totalAttRecords > 0 ? (group.p / totalAttRecords) * 100 : 100.0; 
        group.attRate = attendanceRate.toFixed(1) + '%';

        summaryStats[type as 'inhouse' | 'pst'].losses += group.losses;
        summaryStats[type as 'inhouse' | 'pst'].count += group.totalCount;
        summaryStats.global.losses += group.losses;
      }
    }
  });

  let trainerAttP = 0, trainerAttA = 0, trainerRelP = 0, trainerRelA = 0, trainerRelLosses = 0, trainerRelSched = 0;
  const uniqueTrainersSet = new Set<string>();

  if (filtered.trainerAttendance?.groups) {
    for (const [trainerName, group] of Object.entries<any>(filtered.trainerAttendance.groups)) {
      const filteredMembers = group.members.filter((m: any) => {
        const mMatch = (selectedMonth === 'ALL' || m.month === selectedMonth);
        const qMatch = (selectedQuarter === 'ALL' || m.quarter === selectedQuarter);
        const searchMatch = !searchQuery || trainerName.toLowerCase().includes(searchQuery.toLowerCase());
        return mMatch && qMatch && searchMatch;
      });
      
      group.members = filteredMembers;
      if (filteredMembers.length > 0) {
        uniqueTrainersSet.add(trainerName.toUpperCase());
        filteredMembers.forEach((m: any) => {
          trainerAttP += m.p;
          trainerAttA += m.a;
        });
      }
    }
  }

  if (filtered.trainerReliability?.groups) {
    for (const [trainerName, group] of Object.entries<any>(filtered.trainerReliability.groups)) {
      const filteredMembers = group.members.filter((m: any) => {
        const mMatch = (selectedMonth === 'ALL' || m.month === selectedMonth);
        const qMatch = (selectedQuarter === 'ALL' || m.quarter === selectedQuarter);
        const searchMatch = !searchQuery || trainerName.toLowerCase().includes(searchQuery.toLowerCase());
        return mMatch && qMatch && searchMatch;
      });
      
      group.members = filteredMembers;
      filteredMembers.forEach((m: any) => {
        trainerRelP += m.p;
        trainerRelA += m.a;
        trainerRelLosses += (m.losses || 0);
        let total = (m.losses || 0) + m.p + m.a;
        trainerRelSched += total;
      });
    }
  }

  const calcRate = (l: number, t: number) => t > 0 ? ((l / t) * 100).toFixed(1) + '%' : '0.0%';
  
  const tAttTotal = trainerAttP + trainerAttA;
  const tAttRate = tAttTotal > 0 ? ((trainerAttP / tAttTotal) * 100).toFixed(1) + '%' : '100.0%';
  const tRelActual = trainerRelP + trainerRelA;
  const tRelRate = trainerRelSched > 0 ? ((tRelActual / trainerRelSched) * 100).toFixed(1) + '%' : '100.0%';

    const totalOperationalHeadcount = summaryStats.inhouse.count + summaryStats.pst.count;

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
      totalHeadcount: totalOperationalHeadcount,
      totalLosses: summaryStats.global.losses,
      globalRate: totalOperationalHeadcount > 0 ? ((summaryStats.global.losses / totalOperationalHeadcount) * 100).toFixed(1) + '%' : '0.0%',
      trainersSummary: {
        headcount: data.summary?.trainersSummary?.headcount || (data.trainers ? Object.keys(data.trainers).length : uniqueTrainersSet.size) || 16,
        totalLosses: data.summary?.trainersSummary?.totalLosses || 0,
        attritionRate: data.summary?.trainersSummary?.attritionRate || '0.0%',
        attendanceRate: tAttRate,
        reliabilityRate: tRelRate
      }
    };

  return filtered;
}

export const OFFICIAL_MONTHLY_OVERALL = [
  { period: 'January', activeHC: 46, headcount: 46, losses: 6, attritionNum: 13.0, attritionRate: '13.0%', attendanceRate: '92.8%' },
  { period: 'February', activeHC: 32, headcount: 32, losses: 3, attritionNum: 9.4, attritionRate: '9.4%', attendanceRate: '97.2%' },
  { period: 'March', activeHC: 16, headcount: 16, losses: 3, attritionNum: 18.8, attritionRate: '18.8%', attendanceRate: '83.8%' },
  { period: 'April', activeHC: 39, headcount: 39, losses: 6, attritionNum: 15.4, attritionRate: '15.4%', attendanceRate: '97.3%' },
  { period: 'May', activeHC: 19, headcount: 19, losses: 1, attritionNum: 5.3, attritionRate: '5.3%', attendanceRate: '95.5%' },
  { period: 'June', activeHC: 38, headcount: 38, losses: 2, attritionNum: 5.3, attritionRate: '5.3%', attendanceRate: '98.5%' },
  { period: 'July', activeHC: 40, headcount: 40, losses: 3, attritionNum: 7.5, attritionRate: '7.5%', attendanceRate: '97.0%' },
  { period: 'August', activeHC: 16, headcount: 16, losses: 2, attritionNum: 12.5, attritionRate: '12.5%', attendanceRate: '92.0%' },
];

export const OFFICIAL_QUARTERLY_OVERALL = [
  { period: 'Q1', activeHC: 77, headcount: 77, losses: 12, attritionNum: 15.6, attritionRate: '15.6%', attendanceRate: '95.7%' },
  { period: 'Q2', activeHC: 79, headcount: 79, losses: 9, attritionNum: 11.4, attritionRate: '11.4%', attendanceRate: '97.7%' },
  { period: 'Q3', activeHC: 47, headcount: 47, losses: 5, attritionNum: 10.6, attritionRate: '10.6%', attendanceRate: '97.1%' },
];

export function generateTrendAnalytics(rawData: any, filters: { month: string; quarter: string; search: string }) {
  const { month: selectedMonth, quarter: selectedQuarter, search: searchQuery } = filters;

  const monthsList = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August'];
  const quartersList = ['Q1', 'Q2', 'Q3'];

  // Check if rawData has members
  const hasData = rawData && (rawData.inhouse?.groups || rawData.pst?.groups);

  let dynamicMonths: any[] = [];
  let dynamicQuarters: any[] = [];

  if (hasData) {
    const allMembers: any[] = [];
    ['inhouse', 'pst'].forEach(type => {
      if (!rawData[type]?.groups) return;
      for (const acc in rawData[type].groups) {
        for (const b in rawData[type].groups[acc]) {
          (rawData[type].groups[acc][b].members || []).forEach((m: any) => {
            if (searchQuery && !m.name?.toLowerCase().includes(searchQuery.toLowerCase()) && !b.toLowerCase().includes(searchQuery.toLowerCase()) && !acc.toLowerCase().includes(searchQuery.toLowerCase())) {
              return;
            }
            allMembers.push(m);
          });
        }
      }
    });

    dynamicMonths = monthsList.map(m => {
      const activeMembers = allMembers.filter(t => matchesMonthFilter(t.month, m, t.status));
      const hc = activeMembers.length;
      const losses = activeMembers.filter(t => t.isLoss && (t.month || '').toLowerCase().startsWith(m.toLowerCase().slice(0, 3))).length;
      const p = activeMembers.reduce((sum, t) => sum + (t.p || 0), 0);
      const a = activeMembers.reduce((sum, t) => sum + (t.a || 0), 0);
      const attrNum = hc > 0 ? parseFloat(((losses / hc) * 100).toFixed(1)) : 0.0;
      const totalAtt = p + a;
      const attNum = totalAtt > 0 ? parseFloat(((p / totalAtt) * 100).toFixed(1)) : 100.0;
      return {
        period: m,
        activeHC: hc,
        headcount: hc,
        losses,
        attritionNum: attrNum,
        attritionRate: `${attrNum.toFixed(1)}%`,
        attendanceRate: `${attNum.toFixed(1)}%`,
        p,
        a
      };
    });

    dynamicQuarters = quartersList.map(q => {
      const activeMembers = allMembers.filter(t => matchesQuarterFilter(t.quarter, q, t.status));
      const hc = activeMembers.length;
      const losses = activeMembers.filter(t => t.isLoss && (t.quarter || '').toUpperCase().includes(q)).length;
      const p = activeMembers.reduce((sum, t) => sum + (t.p || 0), 0);
      const a = activeMembers.reduce((sum, t) => sum + (t.a || 0), 0);
      const attrNum = hc > 0 ? parseFloat(((losses / hc) * 100).toFixed(1)) : 0.0;
      const totalAtt = p + a;
      const attNum = totalAtt > 0 ? parseFloat(((p / totalAtt) * 100).toFixed(1)) : 100.0;
      return {
        period: q,
        activeHC: hc,
        headcount: hc,
        losses,
        attritionNum: attrNum,
        attritionRate: `${attrNum.toFixed(1)}%`,
        attendanceRate: `${attNum.toFixed(1)}%`,
        p,
        a
      };
    });
  }

  const baseMonths = dynamicMonths.length > 0 ? dynamicMonths : OFFICIAL_MONTHLY_OVERALL;
  const baseQuarters = dynamicQuarters.length > 0 ? dynamicQuarters : OFFICIAL_QUARTERLY_OVERALL;

  const filteredQuarters = baseQuarters.filter(d => {
    if (selectedQuarter !== 'ALL' && d.period !== selectedQuarter) return false;
    if (searchQuery && !hasData) {
      const q = searchQuery.toLowerCase();
      return d.period.toLowerCase().includes(q) || d.activeHC.toString().includes(q) || d.losses.toString().includes(q);
    }
    return true;
  });

  const filteredMonths = baseMonths.filter(d => {
    if (selectedQuarter === 'Q1' && !['January', 'February', 'March'].includes(d.period)) return false;
    if (selectedQuarter === 'Q2' && !['April', 'May', 'June'].includes(d.period)) return false;
    if (selectedQuarter === 'Q3' && !['July', 'August'].includes(d.period)) return false;
    if (selectedMonth !== 'ALL' && d.period.toLowerCase() !== selectedMonth.toLowerCase()) return false;
    if (searchQuery && !hasData) {
      const q = searchQuery.toLowerCase();
      return d.period.toLowerCase().includes(q) || d.activeHC.toString().includes(q) || d.losses.toString().includes(q);
    }
    return true;
  });

  return {
    overall: {
      months: filteredMonths,
      quarters: filteredQuarters
    },
    inhouse: {
      months: filteredMonths,
      quarters: filteredQuarters
    },
    pst: {
      months: filteredMonths,
      quarters: filteredQuarters
    }
  };
}

export function generateAccountMetrics(rawData: any, filters: any) {
  const filteredData = getFilteredData(rawData, filters);
  const accountsMap: Record<string, any> = {};

  ['inhouse', 'pst'].forEach(type => {
    if (!filteredData[type]?.groups) return;
    
    for (const accName in filteredData[type].groups) {
      const displayAcc = accName && accName.trim() !== "" ? accName.trim() : "General/Unassigned";
      
      if (!accountsMap[displayAcc]) {
        accountsMap[displayAcc] = { headcount: 0, losses: 0, ongoing: 0, p: 0, a: 0, trainees: [] };
      }

      for (const b in filteredData[type].groups[accName]) {
        filteredData[type].groups[accName][b].members.forEach((m: any) => {
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
            timeline: `${m.quarter} / ${m.month}`
          });
        });
      }
    }
  });

  return Object.keys(accountsMap).sort().map(name => {
    const item = accountsMap[name];
    const totalAtt = item.p + item.a;
    item.trainees.sort((x: any, y: any) => (x.name || '').toString().localeCompare((y.name || '').toString()));

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