import 'server-only';
import { unstable_cache } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import { getSupabasePublishableKey } from '@/lib/supabase/public-env';
import { getSupabaseServerConfig } from '@/lib/supabase/server-env';
import { getTrainingTraineeRecords, readAllRows, type TrainingTraineeRecord } from '@/lib/training-data';
import dummyPayload from '@/data/dashboard-mock.json'; // Fallback
import {
  calculateAttrition,
  calculateRosterAttrition,
  getTrainerStatusCode,
  isTrainerAttendanceLoss,
  isTrainerMatch,
  isTrainerReliabilityLoss,
  isTraineeLossStatus,
  isAttritionLossStatus,
  MONTH_ORDER,
} from '@/lib/analytics-utils';
import { fetchWorkforceAttendance } from '@/lib/workforce-attendance';
import { getTrainingPositionLabel, isTrainerEmployee, isTrainerPosition } from '@/lib/trainer-position';

// Create a standard client that doesn't access Next.js cookies
const supabaseUrl = getSupabaseServerConfig().url;
const supabaseKey = getSupabasePublishableKey();
const supabase = createClient(supabaseUrl, supabaseKey);

// Create an admin client to bypass RLS if needed for server-side fetching
const supabaseAdminKey = getSupabaseServerConfig().key;
const supabaseAdmin = createClient(supabaseUrl, supabaseAdminKey);
export async function getTraineeTrainerAssignmentMap(records?: TrainingTraineeRecord[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  try {
    const trainees = records || await getTrainingTraineeRecords(supabaseAdmin);
    trainees.forEach((row) => {
      if (row.name && row.assignedTrainer && row.assignedTrainer !== 'Unassigned') {
        map.set(row.name.trim().toLowerCase(), row.assignedTrainer);
      }
    });
  } catch (err) {
    console.error('Error fetching trainee trainer assignments:', err);
  }
  return map;
}

// We export direct async functions for real-time live data consistency across all pages
export const getDashboardData = async () => {
  try {
    // Trainer timelines are independent of the dashboard source reads. Start
    // them immediately so database latency overlaps with the other reads and
    // their CPU-side aggregation instead of waiting until the end.
    const trainerPerformancePromise = getTrainersData();
    const [roster, trainerEmployeesResult, employeeStatusesResult, employeePositionsResult, employeeRolesResult] = await Promise.all([
      getTrainingTraineeRecords(supabaseAdmin),
      supabaseAdmin.from('employees').select('id, employee_code, employee_name, status_id, role_id, position_id'),
      supabaseAdmin.from('statuses').select('status_id, status_name'),
      supabaseAdmin.from('positions').select('position_id, position_name, position_code'),
      supabaseAdmin.from('roles').select('role_id, role_name')
    ]);
    const assignmentMap = await getTraineeTrainerAssignmentMap(roster);
    const inhouseData = roster.filter((row) => row.trainingType === 'INHOUSE');
    const pstData = roster.filter((row) => row.trainingType === 'PST');
    const { data: trainerEmployees, error: employeesError } = trainerEmployeesResult;
    const { data: employeeStatuses, error: statusesError } = employeeStatusesResult;
    const { data: employeePositions, error: positionsError } = employeePositionsResult;
    const { data: employeeRoles, error: rolesError } = employeeRolesResult;

    const sourceError = employeesError || statusesError || positionsError || rolesError;
    if (sourceError) throw sourceError;

    const inhouseList = inhouseData;
    const pstList = pstData;
    const employeeList = trainerEmployees || [];
    const statusNameById = new Map<number, string>(
      (employeeStatuses || []).map((status: any) => [Number(status.status_id), String(status.status_name || '')]),
    );
    const positionById = new Map<number, any>(
      (employeePositions || []).map((position: any) => [Number(position.position_id), position]),
    );
    const roleById = new Map<number, string>(
      (employeeRoles || []).map((role: any) => [Number(role.role_id), String(role.role_name || '')]),
    );

    const trainerNamesSet = new Set<string>();
    employeeList.forEach((employee: any) => {
      if (employee.employee_name && isTrainerEmployee(positionById.get(Number(employee.position_id)), roleById.get(Number(employee.role_id)))) {
        trainerNamesSet.add(employee.employee_name.trim());
      }
    });

    // Consolidate unique trainers and track active vs losses (RESIGNED, AWOL, LATERAL count as losses)
    const TRAINER_LOSS_STATUSES = ['RESIGNED', 'AWOL', 'LATERAL', 'TERMINATED', 'INACTIVE'];
    const trainerStatusMap = new Map<string, string>();
    employeeList.forEach((employee: any) => {
      if (!isTrainerEmployee(positionById.get(Number(employee.position_id)), roleById.get(Number(employee.role_id)))) return;
      const effectiveStatus = (statusNameById.get(Number(employee.status_id)) || 'ACTIVE').toUpperCase().trim();
      const employeeKey = String(employee.id || employee.employee_code || employee.employee_name || '').trim().toLowerCase();
      if (employeeKey) trainerStatusMap.set(employeeKey, effectiveStatus);
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
    const trainerAttritionLosses = Array.from(trainerStatusMap.values()).filter(isAttritionLossStatus).length;
    const trainerAttrition = calculateAttrition(
      trainerAttritionLosses,
      totalEvaluatedTrainers,
      activeTrainers,
    );
    const trainerAttritionRate = trainerAttrition.formattedRate;

    const totalTrainees = inhouseList.length + pstList.length;
    let totalLosses = 0;
    const accountsSet = new Set<string>();
    const getQuarterFromMonth = (month: string) => {
      const monthPrefix = String(month || '').trim().slice(0, 3).toLowerCase();
      if (!monthPrefix) return 'Unspecified';
      const monthIndex = MONTH_ORDER.findIndex(item =>
        item.toLowerCase().startsWith(monthPrefix),
      );
      return monthIndex >= 0 ? `Q${Math.floor(monthIndex / 3) + 1}` : 'Unspecified';
    };

    // Grouping for Inhouse
    const inhouseGroups: any = {};
    inhouseList.forEach(item => {
      const accountName = (item.account || item.accountName || '').trim() || 'General';
      const batchName = item.batchName || (item.batch ? `Batch ${item.batch}` : 'Unassigned Batch');
      accountsSet.add(accountName);

      if (!inhouseGroups[accountName]) inhouseGroups[accountName] = {};
      if (!inhouseGroups[accountName][batchName]) inhouseGroups[accountName][batchName] = { members: [] };

      const statusUpper = (item.status || '').toUpperCase();
      const isLoss = isTraineeLossStatus(statusUpper);
      if (isAttritionLossStatus(statusUpper)) totalLosses++;

      const pCount = Number(item.p || 0);
      const aCount = Number(item.a || 0);

      const cleanName = (item.name || '').trim().toLowerCase();
      const resolvedTrainer = assignmentMap.get(cleanName) || item.assigned_trainer || item.assignedTrainer || item.trainer || undefined;

      inhouseGroups[accountName][batchName].members.push({
        id: item.id || item.name,
        name: item.name,
        assignedTrainer: resolvedTrainer,
        status: item.status || 'ACTIVE',
        accountName,
        batchName,
        month: item.month || 'Unspecified',
        quarter: item.quarter || getQuarterFromMonth(item.month),
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
      const batchName = item.batchName || (rawWave ? `Batch ${rawWave}` : (item.batch ? `Batch ${item.batch}` : 'Unassigned Batch'));
      accountsSet.add(accountName);

      if (!pstGroups[accountName]) pstGroups[accountName] = {};
      if (!pstGroups[accountName][batchName]) pstGroups[accountName][batchName] = { members: [] };

      const statusUpper = (item.status || '').toUpperCase();
      const isLoss = isTraineeLossStatus(statusUpper);
      if (isAttritionLossStatus(statusUpper)) totalLosses++;

      const pCount = Number(item.p || 0);
      const aCount = Number(item.a || 0);

      const cleanName = (item.name || '').trim().toLowerCase();
      const resolvedTrainer = assignmentMap.get(cleanName) || item.assigned_trainer || item.assignedTrainer || item.trainer || undefined;

      pstGroups[accountName][batchName].members.push({
        id: item.id || item.name,
        name: item.name,
        assignedTrainer: resolvedTrainer,
        status: item.status || 'ACTIVE',
        accountName,
        batchName,
        month: item.month || 'Unspecified',
        quarter: item.quarter || getQuarterFromMonth(item.month),
        isLoss,
        p: pCount,
        a: aCount
      });
    });

    const batchSet = new Set();
    Object.keys(inhouseGroups).forEach(acc => Object.keys(inhouseGroups[acc]).forEach(b => batchSet.add(`IH-${acc}-${b}`)));
    Object.keys(pstGroups).forEach(acc => Object.keys(pstGroups[acc]).forEach(b => batchSet.add(`PST-${acc}-${b}`)));

    const overallAttrition = calculateRosterAttrition(totalLosses, totalTrainees).formattedRate;

    const trainerPerformance = await trainerPerformancePromise;
    const trainerAttendanceGroups: Record<string, { members: any[] }> = {};
    const trainerReliabilityGroups: Record<string, { members: any[] }> = {};
    let totalTrainerAttendanceDays = 0;
    let totalTrainerAttendanceLosses = 0;
    let totalTrainerReliabilityPresent = 0;
    let totalTrainerReliabilityLosses = 0;

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
      totalLosses: trainerAttritionLosses,
      attritionRate: trainerAttritionRate,
      attendanceRate: trainerAttendanceRate,
      reliabilityRate: trainerReliabilityRate
    };
    transformed.dataSource = 'live';
    transformed.generatedAt = new Date().toISOString();

    return transformed;
  } catch (err) {
    console.error('Error in getDashboardData:', err);
    return {
      dataSource: 'unavailable',
      dataError: 'Live dashboard data could not be loaded.'
    };
  }
};

export const getTrainersData = async () => {
  try {
    const [
      employeesResult,
      statusesResult,
      positionsResult,
      rolesResult,
      accountsResult,
      assignmentsResult,
      primaryTasksResult,
      rosterResult,
      attendanceRowsResult,
    ] = await Promise.all([
      supabaseAdmin.from('employees').select('id, employee_code, employee_name, employee_email, status_id, role_id, position_id, hire_date, avatar_url'),
      supabaseAdmin.from('statuses').select('status_id, status_name'),
      supabaseAdmin.from('positions').select('position_id, position_name, position_code'),
      supabaseAdmin.from('roles').select('role_id, role_name'),
      supabaseAdmin.from('accounts').select('account_id, account_name, account_code'),
      supabaseAdmin.from('employee_assignments').select('employee_id, account_id'),
      supabaseAdmin.schema('trainingHub_system').from('primary_tasks_api').select('employee_id, task_name'),
      getTrainingTraineeRecords(supabaseAdmin),
      readAllRows<any>((from, to) => supabaseAdmin.schema('trainingHub_system').from('trainer_attendance_api')
        .select('trainer_employee_id, trainer_attendance_id, attendance_date, status, attendance_code')
        .order('attendance_date', { ascending: true })
        .range(from, to)),
    ]);

    const { data: trainerEmployees, error: employeesError } = employeesResult;
    const { data: statuses } = statusesResult;
    const { data: positions } = positionsResult;
    const { data: roles } = rolesResult;
    const { data: accounts } = accountsResult;
    const { data: employeeAssignments } = assignmentsResult;
    const roster = rosterResult;
    const inhouseData = roster.filter((row) => row.trainingType === 'INHOUSE');
    const pstData = roster.filter((row) => row.trainingType === 'PST');

    const primaryTaskByEmployeeId = new Map<string, string>();
    if (employeesError) {
      console.error('Error fetching employees for primary tasks:', employeesError);
    } else {
      if (primaryTasksResult.error) {
        console.warn('primary_tasks is not available yet; using legacy trainer task values.');
      } else {
        const taskByEmployeeId = new Map(
          (primaryTasksResult.data || []).map((task: any) => [String(task.employee_id), task.task_name]),
        );

        taskByEmployeeId.forEach((task, employeeId) => primaryTaskByEmployeeId.set(employeeId, task));
      }
    }

    const statusNameById = new Map<number, string>(
      (statuses || []).map((status: any) => [Number(status.status_id), String(status.status_name || '')]),
    );
    const positionById = new Map<number, any>(
      (positions || []).map((position: any) => [Number(position.position_id), position]),
    );
    const roleById = new Map<number, string>(
      (roles || []).map((role: any) => [Number(role.role_id), String(role.role_name || '')]),
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

    const allAttendanceData = attendanceRowsResult.map((row: any) => ({
      ...row,
      trainer_id: row.trainer_employee_id,
      status: row.attendance_code || row.status,
    }));
    
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
          attendance_id: row.trainer_attendance_id,
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
    
    const assignmentMap = await getTraineeTrainerAssignmentMap(roster);

    const consolidatedTrainers = (trainerEmployees || [])
      .filter((employee: any) => isTrainerEmployee(positionById.get(Number(employee.position_id)), roleById.get(Number(employee.role_id))))
      .map((employee: any) => {
        return {
          ...employee,
          employee_num: employee.employee_code,
          employee,
        };
      });

    if (consolidatedTrainers.length === 0) return [];

    const workforceAttendanceMap = await fetchWorkforceAttendance(
      supabaseAdmin,
      consolidatedTrainers.map((trainer: any) => String(trainer.employee_num || trainer.trainer_id || '')),
      {
        startDate: `${new Date().getFullYear()}-09-01`,
        endDateExclusive: `${new Date().getFullYear()}-10-01`,
      },
    );

    const lossStatuses = ['FAIL', 'FAILED', 'DROP', 'DROPPED', 'FALLOUT', 'TERMINATED', 'RESIGNED', 'ATTRITION', 'INACTIVE', 'EOC', 'AWOL', 'LATERAL', 'REPROFILED'];

    // Map DB rows to standard format
    const mapped = consolidatedTrainers.map(t => {
      const employee = t.employee;
      const trainerName = employee.employee_name || 'Unknown';
      const legacyAttRow = attendanceMap.get(Number(employee.id)) || attendanceMap.get(String(employee.id));
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
        if (isAttritionLossStatus(s)) {
          batchMap[fullKey].losses++;
          totalTraineeLosses++;
        }
        if (!lossStatuses.some(ls => s.includes(ls))) {
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

      const rawPic = employee.avatar_url;
      const cleanPic = (rawPic && typeof rawPic === 'string' && rawPic.trim() !== '' && !['none', 'null', 'undefined', 'n/a'].includes(rawPic.trim().toLowerCase()) && (rawPic.startsWith('http') || rawPic.startsWith('/') || rawPic.startsWith('data:'))) ? rawPic.trim() : '';
      const employeeAccounts = accountsByEmployeeId.get(String(employee.id)) || [];

      return {
        id: employee.employee_code || String(employee.id),
        trainer_id: t.trainer_id || employee.id,
        employeeId: employee.id,
        name: trainerName,
        email: employee.employee_email || '',
        profilePic: cleanPic,
        role: getTrainingPositionLabel(positionById.get(Number(employee.position_id))),
        status: (statusNameById.get(Number(employee.status_id)) || 'ACTIVE').toUpperCase(),
        statusId: employee.status_id,
        startDate: employee.hire_date || 'N/A',
        accounts: (() => {
          const traineeAccs = Array.from(new Set(assignedTrainees.map((row: any) => (row.account || row.acount || row.accountName || '').trim()).filter(Boolean)));
          return Array.from(new Set([...employeeAccounts, ...traineeAccs])).filter(a => a.toLowerCase() !== 'n/a').join(', ');
        })(),
        tasks: primaryTaskByEmployeeId.get(String(employee.id)) || '',
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
    const roster = await getTrainingTraineeRecords(supabaseAdmin);
    return roster.map((row) => ({
      ...row,
      id: String(row.id),
      profilePic: row.assignedTrainerAvatar,
    }));
  } catch (e) {
    console.error('getTraineesData error:', e);
    return [];
  }
};

export const getEmployeesData = async () => {
  try {
    const [employeesResult, statusesResult, accountsResult, rolesResult, assignmentsResult, positionsResult] = await Promise.all([
      supabaseAdmin.from('employees').select('*').order('id', { ascending: false }),
      supabaseAdmin.from('statuses').select('*'),
      supabaseAdmin.from('accounts').select('*'),
      supabaseAdmin.from('roles').select('*'),
      supabaseAdmin.from('employee_assignments').select('*'),
      supabaseAdmin.from('positions').select('position_id, position_name, position_code'),
    ]);
    const { data: employees, error: empErr } = employeesResult;

    if (empErr) console.error('Error fetching employees:', empErr);

    const { data: statuses } = statusesResult;
    const { data: accounts } = accountsResult;
    const { data: roles } = rolesResult;
    const { data: assignments } = assignmentsResult;
    const { data: positions } = positionsResult;

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

    const positionById = new Map<number, any>(
      (positions || []).map((position: any) => [Number(position.position_id), position]),
    );
    const resultList: any[] = [];

    // Employees is authoritative for every employee, including trainers.
    (employees || []).forEach(emp => {
      const code = String(emp.employee_code || '').trim().toLowerCase();
      const trainerPosition = positionById.get(Number(emp.position_id));
      const positionLabel = trainerPosition ? getTrainingPositionLabel(trainerPosition) : 'Unassigned';
      const isTrainerEmployeeRecord = isTrainerEmployee(trainerPosition, roleMap.get(emp.role_id));
      const assignedAccs = empAccountsMap.get(emp.id) || [];
      const statusName = statusMap.get(emp.status_id) || (emp.status_id === 1 ? 'Active' : emp.status_id === 2 ? 'Inactive' : 'Active');
      const roleName = roleMap.get(emp.role_id) || 'Agent';

      let category = 'AGENT';
      const rUpper = roleName.toUpperCase();
      const nUpper = (emp.employee_name || '').toUpperCase();

      if (isTrainerEmployeeRecord) {
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
        position_label: positionLabel,
        category,
        assigned_accounts: assignedAccs.length > 0 ? assignedAccs.join(', ') : 'Unassigned',
        account_ids: (assignments || []).filter(a => a.employee_id === emp.id).map(a => a.account_id),
        is_primary_trainer: isTrainerEmployeeRecord
      });
    });

    return {
      employees: resultList,
      accounts: accounts || [],
      statuses: statuses || [],
      roles: roles || [],
      positions: positions || []
    };
  } catch (e) {
    console.error('getEmployeesData error:', e);
    return { employees: [], accounts: [], statuses: [], roles: [], positions: [] };
  }
};

