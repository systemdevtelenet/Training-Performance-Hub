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

export function generateTrendAnalytics(rawData: any, filters: { month: string; quarter: string; search: string }) {
  const { month: selectedMonth, quarter: selectedQuarter, search: searchQuery } = filters;

  let maxMonthIdx = -1;
  let maxQuarterNum = 1;

  ['inhouse', 'pst'].forEach(type => {
    if (!rawData[type]?.groups) return;
    for (const acc in rawData[type].groups) {
      for (const b in rawData[type].groups[acc]) {
        rawData[type].groups[acc][b].members.forEach((m: any) => {
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

  const trends: any = { 
    overall: { months: {}, quarters: {} },
    inhouse: { months: {}, quarters: {} },
    pst: { months: {}, quarters: {} }
  };

  const initTimeBlock = () => ({ headcount: 0, losses: 0, p: 0, a: 0 });

  ['inhouse', 'pst'].forEach(type => {
    if (!rawData[type]?.groups) return;
    
    for (const acc in rawData[type].groups) {
      for (const b in rawData[type].groups[acc]) {
        rawData[type].groups[acc][b].members.forEach((m: any) => {
          if (searchQuery && !m.name?.toLowerCase().includes(searchQuery.toLowerCase()) && !b.toLowerCase().includes(searchQuery.toLowerCase())) {
            return;
          }

          const recordData = (targetObj: any) => {
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

  const finalizeMetrics = (obj: any, isMonth = false) => {
    const sortedKeys = Object.keys(obj).sort((a, b) => {
      return isMonth ? MONTH_ORDER.indexOf(a) - MONTH_ORDER.indexOf(b) : a.localeCompare(b);
    });

    return sortedKeys.map(key => {
      const block = obj[key];
      const totalAtt = block.p + block.a;
      // For quarterly metrics, divide aggregated 3-month headcount by 3 to get average quarterly headcount
      const effectiveHC = isMonth ? block.headcount : (block.headcount > 0 ? block.headcount / 3 : 0);
      const attrRaw = effectiveHC > 0 ? (block.losses / effectiveHC) * 100 : 0;
      return {
        period: key,
        headcount: isMonth ? block.headcount : Math.round(effectiveHC),
        losses: block.losses,
        attritionNum: parseFloat(attrRaw.toFixed(1)),
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