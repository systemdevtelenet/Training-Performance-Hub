import { unstable_cache } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import dummyPayload from '@/data/dashboard-mock.json'; // Fallback
import {
  calculateAttrition,
  calculateRosterAttrition,
  getTrainerStatusCode,
  isTrainerAttendanceLoss,
  isTrainerMatch,
  isTrainerReliabilityLoss,
} from '@/lib/analytics-utils';
import { fetchWorkforceAttendance } from '@/lib/workforce-attendance';

// Create a standard client that doesn't access Next.js cookies
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Create an admin client to bypass RLS if needed for server-side fetching
const supabaseAdminKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseKey;
const supabaseAdmin = createClient(supabaseUrl, supabaseAdminKey);

export async function getTraineeTrainerAssignmentMap(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  try {
    const { data } = await supabaseAdmin
      .from('traffic_light_metrics')
      .select('source_table, traffic_status')
      .eq('metric_group', 'trainee_trainer_assignment');

    (data || []).forEach((row: any) => {
      let traineeName = '';
      if (row.source_table && row.source_table.includes('::')) {
        traineeName = row.source_table.split('::')[1]?.trim().toLowerCase();
      }
      if (traineeName && row.traffic_status) {
        map.set(traineeName, row.traffic_status.trim());
      }
    });
  } catch (err) {
    console.error('Error fetching trainee trainer assignment map:', err);
  }
  return map;
}

// We export direct async functions for real-time live data consistency across all pages
export const getDashboardData = async () => {
  try {
    const assignmentMap = await getTraineeTrainerAssignmentMap();

    // Fetch live data from Supabase tables
    const { data: inhouseData, error: inhouseError } = await supabaseAdmin
      .from('inhouse')
      .select('*');

    const { data: pstData, error: pstError } = await supabaseAdmin
      .from('product_spec_training')
      .select('*');

    const { data: trainersData } = await supabaseAdmin
      .from('trainers')
      .select('*');

    const { data: trainerEmployees } = await supabaseAdmin
      .from('employees')
      .select('id, employee_code, employee_name, status_id');

    const { data: employeeStatuses } = await supabaseAdmin
      .from('statuses')
      .select('status_id, status_name');

    const inhouseList = inhouseData || [];
    const pstList = pstData || [];
    const trainersList = trainersData || [];
    const employeeList = trainerEmployees || [];
    const statusNameById = new Map<number, string>(
      (employeeStatuses || []).map((status: any) => [Number(status.status_id), String(status.status_name || '')]),
    );
    const employeeByCode = new Map<string, any>(
      employeeList.map((employee: any) => [String(employee.employee_code || '').trim().toLowerCase(), employee]),
    );

    const trainerNamesSet = new Set<string>();
    trainersList.forEach((trainer: any) => {
      const employee = employeeByCode.get(String(trainer.employee_num || '').trim().toLowerCase());
      if (employee?.employee_name) trainerNamesSet.add(employee.employee_name.trim());
    });

    // Consolidate unique trainers and track active vs losses (RESIGNED, AWOL, LATERAL count as losses)
    const TRAINER_LOSS_STATUSES = ['RESIGNED', 'AWOL', 'LATERAL', 'TERMINATED', 'INACTIVE'];
    const trainerStatusMap = new Map<string, string>();
    trainersList.forEach((t: any) => {
      const num = String(t.employee_num || '').trim();
      const employee = employeeByCode.get(num.toLowerCase());
      if (!employee) return;
      const effectiveStatus = (statusNameById.get(Number(employee.status_id)) || 'ACTIVE').toUpperCase().trim();
      const nameKey = (employee.employee_name || (num ? `emp_${num}` : `t_${t.trainer_id}`)).trim().toLowerCase();
      trainerStatusMap.set(nameKey, effectiveStatus);
    });

    let activeTrainers = 0;
    let trainerLosses = 0;
    trainerStatusMap.forEach((s) => {
      if (TRAINER_LOSS_STATUSES.some(ls => s.includes(ls))) {
        trainerLosses++;
      } else {
        activeTrainers++;
      }
    });

    const totalEvaluatedTrainers = activeTrainers + trainerLosses;
    const trainerAttrition = calculateAttrition(
      trainerLosses,
      totalEvaluatedTrainers,
      activeTrainers,
    );
    const trainerAttritionRate = trainerAttrition.formattedRate;

    const totalTrainees = inhouseList.length + pstList.length;
    const lossStatuses = ['FAILED', 'RESIGNED', 'TERMINATED', 'AWOL', 'LATERAL', 'RED', 'ACCOUNT REMOVED', 'LOSS', 'ATTRITION', 'EOC'];

    let totalLosses = 0;
    const accountsSet = new Set<string>();

    const inhouseAttCols = ['NHO', 'MESH', 'comms_day_1', 'comms_day_2', 'comms_day_3'];

    // Grouping for Inhouse
    const inhouseGroups: any = {};
    inhouseList.forEach(item => {
      const accountName = (item.account || item.acount || '').trim() || 'General';
      const batchName = item.batch ? `Batch ${item.batch}` : 'Unassigned Batch';
      accountsSet.add(accountName);

      if (!inhouseGroups[accountName]) inhouseGroups[accountName] = {};
      if (!inhouseGroups[accountName][batchName]) inhouseGroups[accountName][batchName] = { members: [] };

      const statusUpper = (item.status || '').toUpperCase();
      const isLoss = lossStatuses.some(ls => statusUpper.includes(ls));
      if (isLoss) totalLosses++;

      let pCount = 0, aCount = 0;
      for (const col of inhouseAttCols) {
        const val = (item[col] || '').toString().trim().toUpperCase();
        if (val === 'P') pCount++;
        if (val === 'A') aCount++;
      }

      const cleanName = (item.name || '').trim().toLowerCase();
      const resolvedTrainer = assignmentMap.get(cleanName) || item.assigned_trainer || item.assignedTrainer || item.trainer || undefined;

      inhouseGroups[accountName][batchName].members.push({
        id: item.id || item.name,
        name: item.name,
        assignedTrainer: resolvedTrainer,
        status: item.status || 'ACTIVE',
        accountName,
        batchName,
        month: item.month || 'January',
        quarter: item.quarter || 'Q1',
        isLoss,
        p: pCount,
        a: aCount
      });
    });

    // Grouping for PST
    const pstGroups: any = {};
    pstList.forEach(item => {
      const accountName = (item.account || item.accountName || '').trim() || 'General';
      const rawWave = item.wave ? `${item.wave}`.replace(/^(wave\s*)/i, '').trim() : '';
      const batchName = rawWave ? `Batch ${rawWave}` : (item.batch ? `Batch ${item.batch}` : item.batchName || 'Unassigned Batch');
      accountsSet.add(accountName);

      if (!pstGroups[accountName]) pstGroups[accountName] = {};
      if (!pstGroups[accountName][batchName]) pstGroups[accountName][batchName] = { members: [] };

      const statusUpper = (item.status || '').toUpperCase();
      const isLoss = lossStatuses.some(ls => statusUpper.includes(ls));
      if (isLoss) totalLosses++;

      let pCount = 0, aCount = 0;
      for (let i = 1; i <= 62; i++) {
        const val = (item[`att_status_day_${i}`] || '').toString().trim().toUpperCase();
        if (val === 'P') pCount++;
        if (val === 'A') aCount++;
      }

      const cleanName = (item.name || '').trim().toLowerCase();
      const resolvedTrainer = assignmentMap.get(cleanName) || item.assigned_trainer || item.assignedTrainer || item.trainer || undefined;

      pstGroups[accountName][batchName].members.push({
        id: item.id || item.name,
        name: item.name,
        assignedTrainer: resolvedTrainer,
        status: item.status || 'ACTIVE',
        accountName,
        batchName,
        month: item.month || 'January',
        quarter: item.quarter || 'Q1',
        isLoss,
        p: pCount,
        a: aCount
      });
    });

    const batchSet = new Set();
    Object.keys(inhouseGroups).forEach(acc => Object.keys(inhouseGroups[acc]).forEach(b => batchSet.add(`IH-${acc}-${b}`)));
    Object.keys(pstGroups).forEach(acc => Object.keys(pstGroups[acc]).forEach(b => batchSet.add(`PST-${acc}-${b}`)));

    const overallAttrition = calculateRosterAttrition(totalLosses, totalTrainees).formattedRate;

    const trainerPerformance = await getTrainersData();
    const trainerAttendanceGroups: Record<string, { members: any[] }> = {};
    const trainerReliabilityGroups: Record<string, { members: any[] }> = {};
    let totalTrainerAttendanceDays = 0;
    let totalTrainerAttendanceLosses = 0;
    let totalTrainerReliabilityPresent = 0;
    let totalTrainerReliabilityLosses = 0;

    const getQuarterFromMonth = (month: string) => {
      const monthIndex = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December',
      ].findIndex(item => item.toLowerCase() === String(month || '').toLowerCase());
      return monthIndex >= 0 ? `Q${Math.floor(monthIndex / 3) + 1}` : 'Unknown';
    };

    trainerPerformance.forEach((trainer: any) => {
      const attendanceMembers: any[] = [];
      const reliabilityMembers: any[] = [];

      (trainer.timeline || []).forEach((record: any) => {
        const statusCode = getTrainerStatusCode(record.status);
        const month = record.month || 'Unknown';
        const quarter = getQuarterFromMonth(month);

        if (!['RD', 'HOL'].includes(statusCode)) {
          const isAttendanceLoss = isTrainerAttendanceLoss(statusCode);
          totalTrainerAttendanceDays++;
          if (isAttendanceLoss) totalTrainerAttendanceLosses++;
          attendanceMembers.push({
            month,
            quarter,
            p: isAttendanceLoss ? 0 : 1,
            a: isAttendanceLoss ? 1 : 0,
          });
        }

        if (statusCode === 'P' || isTrainerReliabilityLoss(statusCode)) {
          const isReliabilityLoss = isTrainerReliabilityLoss(statusCode);
          if (statusCode === 'P') totalTrainerReliabilityPresent++;
          if (isReliabilityLoss) totalTrainerReliabilityLosses++;
          reliabilityMembers.push({
            month,
            quarter,
            p: statusCode === 'P' ? 1 : 0,
            a: 0,
            losses: isReliabilityLoss ? 1 : 0,
          });
        }
      });

      if (attendanceMembers.length > 0) {
        trainerAttendanceGroups[trainer.name] = { members: attendanceMembers };
      }
      if (reliabilityMembers.length > 0) {
        trainerReliabilityGroups[trainer.name] = { members: reliabilityMembers };
      }
    });

    const trainerAttendanceRate = totalTrainerAttendanceDays > 0
      ? `${(((totalTrainerAttendanceDays - totalTrainerAttendanceLosses) / totalTrainerAttendanceDays) * 100).toFixed(1)}%`
      : '100.0%';
    const trainerReliabilityEvaluated = totalTrainerReliabilityPresent + totalTrainerReliabilityLosses;
    const trainerReliabilityRate = trainerReliabilityEvaluated > 0
      ? `${((totalTrainerReliabilityPresent / trainerReliabilityEvaluated) * 100).toFixed(1)}%`
      : '100.0%';

    const transformed = JSON.parse(JSON.stringify(dummyPayload));
    transformed.metrics = {
      totalTrainees,
      overallAttrition,
      activeTrainers,
      classesInSession: batchSet.size
    };
    transformed.allAccounts = Array.from(accountsSet).sort();
    transformed.allTrainers = Array.from(trainerNamesSet).sort();
    transformed.inhouse.groups = inhouseGroups;
    transformed.pst.groups = pstGroups;
    transformed.trainerAttendance.groups = trainerAttendanceGroups;
    transformed.trainerReliability.groups = trainerReliabilityGroups;
    transformed.summary.trainersSummary = {
      headcount: activeTrainers,
      startingHeadcount: trainerAttrition.startingHeadcount,
      endingHeadcount: trainerAttrition.endingHeadcount,
      averageHeadcount: trainerAttrition.averageHeadcount,
      totalLosses: trainerLosses,
      attritionRate: trainerAttritionRate,
      attendanceRate: trainerAttendanceRate,
      reliabilityRate: trainerReliabilityRate
    };

    return transformed;
  } catch (err) {
    console.error('Error in getDashboardData:', err);
    return dummyPayload;
  }
};

export const getTrainersData = async () => {
  try {
    const { data: trainers, error: trainersError } = await supabaseAdmin
      .from('trainers')
      .select('*');

    if (trainersError) {
      console.error('Error fetching trainers:', trainersError);
      return [];
    }

    const primaryTaskByEmployeeId = new Map<string, string>();
    const { data: trainerEmployees, error: employeesError } = await supabaseAdmin
      .from('employees')
      .select('id, employee_code, employee_name, employee_email, status_id, role_id, hire_date, avatar_url');

    const { data: statuses } = await supabaseAdmin
      .from('statuses')
      .select('status_id, status_name');

    const { data: accounts } = await supabaseAdmin
      .from('accounts')
      .select('account_id, account_name, account_code');

    const { data: employeeAssignments } = await supabaseAdmin
      .from('employee_assignments')
      .select('employee_id, account_id');

    if (employeesError) {
      console.error('Error fetching employees for primary tasks:', employeesError);
    } else {
      const { data: primaryTasks, error: primaryTasksError } = await supabaseAdmin
        .from('primary_tasks')
        .select('employee_id, task_name');

      if (primaryTasksError) {
        console.warn('primary_tasks is not available yet; using legacy trainer task values.');
      } else {
        const taskByEmployeeId = new Map(
          (primaryTasks || []).map((task: any) => [String(task.employee_id), task.task_name]),
        );

        taskByEmployeeId.forEach((task, employeeId) => primaryTaskByEmployeeId.set(employeeId, task));
      }
    }

    const employeeByCode = new Map<string, any>(
      (trainerEmployees || []).map((employee: any) => [String(employee.employee_code || '').trim().toLowerCase(), employee]),
    );
    const statusNameById = new Map<number, string>(
      (statuses || []).map((status: any) => [Number(status.status_id), String(status.status_name || '')]),
    );
    const accountNameById = new Map<number, string>(
      (accounts || []).map((account: any) => [Number(account.account_id), String(account.account_name || account.account_code || '')]),
    );
    const accountsByEmployeeId = new Map<string, string[]>();
    (employeeAssignments || []).forEach((assignment: any) => {
      const employeeId = String(assignment.employee_id || '');
      const accountName = accountNameById.get(Number(assignment.account_id));
      if (!employeeId || !accountName) return;
      const current = accountsByEmployeeId.get(employeeId) || [];
      if (!current.includes(accountName)) current.push(accountName);
      accountsByEmployeeId.set(employeeId, current);
    });

    // Fetch all attendance records using pagination (Supabase 1000 row limit)
    let allAttendanceData: any[] = [];
    let hasMore = true;
    let page = 0;
    const PAGE_SIZE = 1000;

    while (hasMore) {
      const { data, error: attError } = await supabaseAdmin
        .from('trainer_attendance_strat')
        .select('*')
        .order('attendance_date', { ascending: true })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (attError) {
        console.error('Error fetching trainer_attendance_strat:', attError);
        break;
      }

      if (data && data.length > 0) {
        allAttendanceData = allAttendanceData.concat(data);
        page++;
        if (data.length < PAGE_SIZE) {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
    }
    
    // Build map using trainer_id as key
    const attendanceMap = new Map();
    if (allAttendanceData.length > 0) {
      for (const row of allAttendanceData) {
        const tId = row.trainer_id;
        if (!tId) continue;

        if (!attendanceMap.has(tId)) {
          attendanceMap.set(tId, {
            timeline: [],
            records: { ABS: [], SL: [], VL: [], BL: [], MED: [], SUS: [], HOL: [], ML: [], PL: [], UND: [] }
          });
        }
        const current = attendanceMap.get(tId);
        
        // Month names
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        let monthName = 'Unknown';
        if (row.attendance_month) {
          monthName = monthNames[row.attendance_month - 1] || 'Unknown';
        } else if (row.attendance_date) {
          monthName = monthNames[new Date(row.attendance_date).getMonth()] || 'Unknown';
        }

        // Push record to timeline
        current.timeline.push({
          attendance_id: row.attendance_id,
          trainer_id: tId,
          date: row.attendance_date,
          month: monthName,
          day: row.attendance_day,
          weekday: row.weekday_name,
          status: row.status
        });

        if (row.status && typeof row.status === 'string') {
          const s = getTrainerStatusCode(row.status);
          const dText = row.attendance_date;
          
          if (s === 'ABS') current.records.ABS.push(dText);
          else if (s === 'SL') current.records.SL.push(dText);
          else if (s === 'VL') current.records.VL.push(dText);
          else if (s === 'BL') current.records.BL.push(dText);
          else if (s === 'MED') current.records.MED.push(dText);
          else if (s === 'SUS') current.records.SUS.push(dText);
          else if (s === 'HOL') current.records.HOL.push(dText);
          else if (s === 'ML') current.records.ML.push(dText);
          else if (s === 'PL') current.records.PL.push(dText);
          else if (s === 'UND' || s === 'UT') current.records.UND.push(dText);
        }
      }
    }
    
    const { data: inhouseData } = await supabaseAdmin
      .from('inhouse')
      .select('*');

    const { data: pstData } = await supabaseAdmin
      .from('product_spec_training')
      .select('*');

    const assignmentMap = await getTraineeTrainerAssignmentMap();

    const consolidatedTrainers = (trainers || [])
      .map((trainer: any) => ({
        ...trainer,
        employee: employeeByCode.get(String(trainer.employee_num || '').trim().toLowerCase()),
      }))
      .filter((trainer: any) => Boolean(trainer.employee));

    if (consolidatedTrainers.length === 0) return [];

    const workforceAttendanceMap = await fetchWorkforceAttendance(
      supabaseAdmin,
      consolidatedTrainers.map((trainer: any) => String(trainer.employee_num || trainer.trainer_id || '')),
    );

    const lossStatuses = ['FAIL', 'FAILED', 'DROP', 'DROPPED', 'FALLOUT', 'TERMINATED', 'RESIGNED', 'ATTRITION', 'INACTIVE', 'EOC', 'AWOL', 'LATERAL', 'REPROFILED'];

    // Map DB rows to standard format
    const mapped = consolidatedTrainers.map(t => {
      const employee = t.employee;
      const trainerName = employee.employee_name || 'Unknown';
      const legacyAttRow = attendanceMap.get(t.trainer_id) || attendanceMap.get(String(t.trainer_id));
      const workforceTimeline = workforceAttendanceMap.get(String(t.employee_num || t.trainer_id || '').trim()) || [];
      const timelineByDate = new Map<string, any>();

      (legacyAttRow?.timeline || []).forEach((record: any) => {
        if (record.date) timelineByDate.set(record.date, record);
      });
      workforceTimeline.forEach(record => timelineByDate.set(record.date, record));

      const mergedTimeline = Array.from(timelineByDate.values())
        .sort((a: any, b: any) => String(a.date).localeCompare(String(b.date)));
      const mergedRecords = { ABS: [] as string[], SL: [] as string[], VL: [] as string[], BL: [] as string[], MED: [] as string[], SUS: [] as string[], HOL: [] as string[], ML: [] as string[], PL: [] as string[], UND: [] as string[] };

      mergedTimeline.forEach((record: any) => {
        const status = getTrainerStatusCode(record.status);
        const date = String(record.date || '');
        if (status === 'ABS') mergedRecords.ABS.push(date);
        else if (status === 'SL') mergedRecords.SL.push(date);
        else if (status === 'VL') mergedRecords.VL.push(date);
        else if (status === 'BL') mergedRecords.BL.push(date);
        else if (status === 'MED') mergedRecords.MED.push(date);
        else if (status === 'SUS') mergedRecords.SUS.push(date);
        else if (status === 'HOL') mergedRecords.HOL.push(date);
        else if (status === 'ML') mergedRecords.ML.push(date);
        else if (status === 'PL') mergedRecords.PL.push(date);
        else if (status === 'UND' || status === 'UT') mergedRecords.UND.push(date);
      });

      const attRow = mergedTimeline.length > 0
        ? { timeline: mergedTimeline, records: mergedRecords }
        : legacyAttRow;
      
      let leaves = { absence: 0, sl: 0, vl: 0, bl: 0, med: 0, sus: 0, hol: 0, ml: 0, pl: 0, und: 0, records: {} };
      let attendanceRate = '0.0%';

      if (attRow) {
        leaves = {
          absence: attRow.records.ABS.length,
          sl: attRow.records.SL.length,
          vl: attRow.records.VL.length,
          bl: attRow.records.BL.length,
          med: attRow.records.MED.length,
          sus: attRow.records.SUS.length,
          hol: attRow.records.HOL.length,
          ml: attRow.records.ML.length,
          pl: attRow.records.PL.length,
          und: attRow.records.UND.length,
          records: attRow.records
        };
      }

      // Calculate present, absent, sus, and total losses from true timeline
      let totalPresent = 0;
      let totalLosses = 0;
      let totalAbsent = 0;
      let totalSus = 0;
      let timeline = [];
      let calculatedReliabilityRate = '100.0%';

      if (attRow) {
        timeline = attRow.timeline;
        totalPresent = attRow.timeline.filter((r: any) => getTrainerStatusCode(r.status) === 'P').length;
        totalLosses = attRow.timeline.filter((r: any) => isTrainerReliabilityLoss(r.status)).length;

        totalAbsent = leaves.absence;
        totalSus = leaves.sus;
        
        // Attendance losses are ABS and SUS. Rest days and holidays are not scheduled attendance days.
        const workingDays = attRow.timeline.filter((r: any) => !['RD', 'HOL'].includes(getTrainerStatusCode(r.status))).length;
        const attendanceLosses = attRow.timeline.filter((r: any) => isTrainerAttendanceLoss(r.status)).length;
        if (workingDays > 0) {
           attendanceRate = `${((Math.max(0, workingDays - attendanceLosses) / workingDays) * 100).toFixed(1)}%`;
        }

        const totalEvaluated = totalPresent + totalLosses;
        if (totalEvaluated > 0) {
          calculatedReliabilityRate = `${((totalPresent / totalEvaluated) * 100).toFixed(1)}%`;
        }
      }
      
      // Calculate handled batches
      const allTrainees = [...(pstData || []), ...(inhouseData || [])];
      const assignedTrainees = allTrainees.filter(row => {
        const cleanName = (row.name || '').trim().toLowerCase();
        const assigned = assignmentMap.get(cleanName) || row.assigned_trainer || row.assignedTrainer || row.trainer;
        return isTrainerMatch(assigned, trainerName);
      });

      const batchMap: Record<string, { batch: string; account: string; headcount: number; passed: number; losses: number; successRate?: string; attritionRate?: string; attrition?: string; trainees: any[] }> = {};
      let totalHeadcount = 0;
      let totalPassed = 0;
      let totalTraineeLosses = 0;

      assignedTrainees.forEach(row => {
        const batchKey = row.batch ? `Batch ${row.batch}` : (row.wave ? `Batch ${row.wave}` : 'Batch Unassigned');
        const acc = (row.account || row.acount || row.accountName || 'General').toString().trim();
        const fullKey = `${acc} - ${batchKey}`;
        if (!batchMap[fullKey]) {
          batchMap[fullKey] = { batch: batchKey, account: acc, headcount: 0, losses: 0, passed: 0, trainees: [] };
        }
        batchMap[fullKey].headcount++;
        totalHeadcount++;

        const s = (row.status || '').toUpperCase();
        if (lossStatuses.some(ls => s.includes(ls))) {
          batchMap[fullKey].losses++;
          totalTraineeLosses++;
        } else {
          batchMap[fullKey].passed++;
          totalPassed++;
        }

        let pCount = 0;
        let aCount = 0;
        for (let i = 1; i <= 62; i++) {
          const val = (row[`att_status_day_${i}`] || '').toString().trim().toUpperCase();
          if (val === 'P') pCount++;
          if (val === 'A') aCount++;
        }
        for (const col of ['NHO', 'MESH', 'comms_day_1', 'comms_day_2', 'comms_day_3']) {
          const val = (row[col] || '').toString().trim().toUpperCase();
          if (val === 'P') pCount++;
          if (val === 'A') aCount++;
        }

        const cleanTraineeName = (row.name || '').trim().toLowerCase();
        const resolvedTrainer = assignmentMap.get(cleanTraineeName) || row.assigned_trainer || row.assignedTrainer || row.trainer || trainerName;

        batchMap[fullKey].trainees.push({
          id: row.id || row.name,
          name: row.name,
          assignedTrainer: resolvedTrainer,
          p: pCount,
          a: aCount,
          status: row.status || 'ACTIVE'
        });
      });

      const computedBatches = Object.values(batchMap).map(b => ({
        ...b,
        attrition: calculateRosterAttrition(b.losses, b.headcount).formattedRate,
        attritionRate: calculateRosterAttrition(b.losses, b.headcount).formattedRate,
        successRate: b.headcount > 0 ? `${((b.passed / b.headcount) * 100).toFixed(1)}%` : '0.0%',
      }));

      const finalBatches = computedBatches;

      let overallSuccess = 'N/A';
      let avgAttrition = 'N/A';
      if (totalHeadcount > 0) {
        overallSuccess = `${((totalPassed / totalHeadcount) * 100).toFixed(1)}%`;
        avgAttrition = calculateRosterAttrition(totalTraineeLosses, totalHeadcount).formattedRate;
      }

      const rawPic = employee.avatar_url || t.profile_pic;
      const cleanPic = (rawPic && typeof rawPic === 'string' && rawPic.trim() !== '' && !['none', 'null', 'undefined', 'n/a'].includes(rawPic.trim().toLowerCase()) && (rawPic.startsWith('http') || rawPic.startsWith('/') || rawPic.startsWith('data:'))) ? rawPic.trim() : '';
      const employeeAccounts = accountsByEmployeeId.get(String(employee.id)) || [];

      return {
        id: employee.employee_code || String(employee.id),
        trainer_id: t.trainer_id,
        employeeId: employee.id,
        name: trainerName,
        email: employee.employee_email || '',
        profilePic: cleanPic,
        role: t.position || 'TRAINER',
        status: (statusNameById.get(Number(employee.status_id)) || 'ACTIVE').toUpperCase(),
        statusId: employee.status_id,
        startDate: employee.hire_date || t.start_date || 'N/A',
        accounts: (() => {
          const traineeAccs = Array.from(new Set(assignedTrainees.map((row: any) => (row.account || row.acount || row.accountName || '').trim()).filter(Boolean)));
          return Array.from(new Set([...employeeAccounts, ...traineeAccs])).filter(a => a.toLowerCase() !== 'n/a').join(', ');
        })(),
        tasks: primaryTaskByEmployeeId.get(String(employee.id)) || t.assigned_task || '',
        attendanceRate: attendanceRate,
        reliabilityRate: calculatedReliabilityRate,
        overallSuccess: overallSuccess,
        avgAttrition: avgAttrition,
        leaves: leaves,
        batches: finalBatches,
        timeline: timeline,
        present: totalPresent,
        absent: totalAbsent,
        losses: totalLosses,
        suspension: totalSus
      };
    });

    // Sequence defined by the user
    const roleOrder = [
      'HEAD OF TRAINING',
      'TRAINING COORDINATOR',
      'CORP-TR',
      'PST-RM',
      'PST-BF',
      'SYS-DEV'
    ];

    mapped.sort((a, b) => {
      const idxA = roleOrder.indexOf(a.role.toUpperCase());
      const idxB = roleOrder.indexOf(b.role.toUpperCase());
      
      // If both are in the order list, sort by order
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      // If only A is in the list, it comes first
      if (idxA !== -1) return -1;
      // If only B is in the list, it comes first
      if (idxB !== -1) return 1;
      // Otherwise, alphabetical
      return a.role.localeCompare(b.role);
    });

    return mapped;
  } catch (err) {
    console.error('Error fetching trainers data:', err);
    return [];
  }
};

export const getTraineesData = async () => {
  try {
    const { data: inhouseData, error: err1 } = await supabaseAdmin
      .from('inhouse')
      .select('*')
      .order('name', { ascending: true });

    const { data: pstData, error: err2 } = await supabaseAdmin
      .from('product_spec_training')
      .select('*')
      .order('name', { ascending: true });

    const assignmentMap = await getTraineeTrainerAssignmentMap();

    if (err1) console.error('Error fetching INHOUSE:', err1);
    if (err2) console.error('Error fetching PST:', err2);

    const isLossStatus = (st?: string) => {
      if (!st) return false;
      const s = st.toUpperCase().trim();
      return ['LOSS', 'ATTRITION', 'EOC', 'AWOL', 'LATERAL', 'FAILED', 'RESIGNED', 'TERMINATED', 'RED', 'ACCOUNT REMOVED'].some(code => s.includes(code));
    };

    const inhouseAttCols = ['NHO', 'MESH', 'comms_day_1', 'comms_day_2', 'comms_day_3'];

    // Map INHOUSE rows to Trainee type
    const mappedInhouse = (inhouseData || []).map((row: any) => {
      let pCount = 0;
      let aCount = 0;
      for (const col of inhouseAttCols) {
        const val = (row[col] || '').trim().toUpperCase();
        if (val === 'P') pCount++;
        if (val === 'A') aCount++;
      }

      const isLoss = isLossStatus(row.status);
      const cleanName = (row.name || '').trim().toLowerCase();
      const resolvedTrainer = assignmentMap.get(cleanName) || row.assigned_trainer || row.assignedTrainer || row.trainer || 'Unassigned';

      return {
        id: row.name || Math.random().toString(),
        name: row.name || 'Unknown',
        status: row.status || 'ACTIVE',
        month: row.month || '',
        quarter: row.quarter || '',
        p: pCount,
        a: aCount,
        isEndorsed: !isLoss && (row.status || '').toUpperCase() === 'ENDORSED',
        isLoss,
        assignedTrainer: resolvedTrainer,
        batchName: row.batch ? `General -${row.batch}` : 'General -Unassigned',
        accountName: row.account || row.acount || 'General',
        trainingType: 'INHOUSE' as const
      };
    });

    // Map PST rows to Trainee type
    const mappedPst = (pstData || []).map((row: any) => {
      let pCount = 0;
      let aCount = 0;
      for (let i = 1; i <= 62; i++) {
        const val = row[`att_status_day_${i}`];
        if (val === 'P') pCount++;
        if (val === 'A') aCount++;
      }

      const acct = (row.account || row.acount || 'PST Account').trim();
      const rawWave = row.wave ? `${row.wave}`.replace(/^(wave\s*)/i, '').trim() : '1';
      const batchName = `${acct} -${rawWave || '1'}`;
      const isLoss = isLossStatus(row.status);
      const cleanName = (row.name || '').trim().toLowerCase();
      const resolvedTrainer = assignmentMap.get(cleanName) || row.assigned_trainer || row.assignedTrainer || row.trainer || 'Unassigned';

      return {
        id: row.name || Math.random().toString(),
        name: row.name || 'Unknown',
        status: row.status || 'ACTIVE',
        month: row.month || '',
        quarter: row.quarter || '',
        p: pCount,
        a: aCount,
        isEndorsed: !isLoss && (row.status || '').toUpperCase() === 'ENDORSED',
        isLoss,
        assignedTrainer: resolvedTrainer,
        batchName: batchName,
        accountName: acct,
        trainingType: 'PST' as const
      };
    });

    return [...mappedInhouse, ...mappedPst];
  } catch (e) {
    console.error('getTraineesData error:', e);
    return [];
  }
};

export const getEmployeesData = async () => {
  try {
    const { data: employees, error: empErr } = await supabaseAdmin
      .from('employees')
      .select('*')
      .order('id', { ascending: false });

    if (empErr) console.error('Error fetching employees:', empErr);

    const { data: statuses } = await supabaseAdmin.from('statuses').select('*');
    const { data: accounts } = await supabaseAdmin.from('accounts').select('*');
    const { data: roles } = await supabaseAdmin.from('roles').select('*');
    const { data: assignments } = await supabaseAdmin.from('employee_assignments').select('*');
    const { data: trainers } = await supabaseAdmin.from('trainers').select('employee_num, position');
    const { data: inhouseData } = await supabaseAdmin.from('inhouse').select('*');
    const { data: pstData } = await supabaseAdmin.from('product_spec_training').select('*');

    const statusMap = new Map<number, string>();
    (statuses || []).forEach(s => statusMap.set(s.status_id, s.status_name));

    const roleMap = new Map<number, string>();
    (roles || []).forEach(r => roleMap.set(r.role_id, r.role_name));

    const accountMap = new Map<number, string>();
    (accounts || []).forEach(a => accountMap.set(a.account_id, a.account_name || a.account_code));

    const empAccountsMap = new Map<number, string[]>();
    (assignments || []).forEach(asg => {
      const accName = accountMap.get(asg.account_id);
      if (accName && asg.employee_id) {
        const existing = empAccountsMap.get(asg.employee_id) || [];
        if (!existing.includes(accName)) {
          existing.push(accName);
          empAccountsMap.set(asg.employee_id, existing);
        }
      }
    });

    const trainerByCode = new Map<string, any>(
      (trainers || []).map((trainer: any) => [String(trainer.employee_num || '').trim().toLowerCase(), trainer]),
    );
    const resultList: any[] = [];

    // Employees is authoritative for every employee, including trainers.
    (employees || []).forEach(emp => {
      const code = String(emp.employee_code || '').trim().toLowerCase();
      const trainer = trainerByCode.get(code);
      const assignedAccs = empAccountsMap.get(emp.id) || [];
      const statusName = statusMap.get(emp.status_id) || (emp.status_id === 1 ? 'Active' : emp.status_id === 2 ? 'Inactive' : 'Active');
      const roleName = trainer?.position || roleMap.get(emp.role_id) || 'Agent';

      let category = 'AGENT';
      const rUpper = roleName.toUpperCase();
      const nUpper = (emp.employee_name || '').toUpperCase();

      if (trainer) {
        category = 'TRAINER';
      } else if (rUpper.includes('SUPERVISOR') || rUpper.includes('ADMIN') || nUpper.startsWith('HOT ') || nUpper.startsWith('ADMIN ')) {
        category = 'ADMIN';
      } else if (rUpper.includes('QA') || rUpper.includes('QUALITY') || nUpper.startsWith('QA ') || nUpper.startsWith('QAS ')) {
        category = 'QA';
      } else if (rUpper.includes('TL') || rUpper.includes('LEADER') || rUpper.includes('MANAGER') || nUpper.startsWith('TL ')) {
        category = 'TL';
      } else {
        category = 'AGENT';
      }

      resultList.push({
        ...emp,
        status_name: statusName,
        role_id: emp.role_id || 1,
        role_name: roleName,
        category,
        assigned_accounts: assignedAccs.length > 0 ? assignedAccs.join(', ') : 'Unassigned',
        account_ids: (assignments || []).filter(a => a.employee_id === emp.id).map(a => a.account_id),
        is_primary_trainer: Boolean(trainer)
      });
    });

    // Add active Trainees from inhouse and PST
    const traineeNames = new Set<string>();
    let traineeIndex = 0;
    (inhouseData || []).concat(pstData || []).forEach(t => {
      const tName = (t.name || '').trim();
      if (!tName || traineeNames.has(tName.toLowerCase())) return;
      traineeNames.add(tName.toLowerCase());

      const isLoss = ['LOSS', 'ATTRITION', 'EOC', 'AWOL', 'LATERAL', 'FAILED', 'RESIGNED', 'TERMINATED', 'RED'].some(k => (t.status || '').toUpperCase().includes(k));
      const statusName = isLoss ? 'Resigned' : (t.status || 'ACTIVE').toUpperCase() === 'ACTIVE' ? 'Active' : (t.status || 'Active');

      resultList.push({
        id: -(5000 + traineeIndex++),
        employee_code: 'TRAINEE',
        employee_name: tName,
        employee_email: null,
        status_id: isLoss ? 3 : 1,
        status_name: statusName,
        role_id: 11,
        role_name: 'Trainee',
        category: 'TRAINEE',
        hire_date: null,
        vici_link: null,
        assigned_accounts: t.account || t.acount || 'Training Roster',
        is_primary_trainer: false
      });
    });

    return {
      employees: resultList,
      accounts: accounts || [],
      statuses: statuses || [],
      roles: roles || []
    };
  } catch (e) {
    console.error('getEmployeesData error:', e);
    return { employees: [], accounts: [], statuses: [], roles: [] };
  }
};

