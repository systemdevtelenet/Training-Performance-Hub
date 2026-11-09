/**
 * Data Loader - Fetches dashboard data from Supabase
 * Falls back to mock data if Supabase is not configured
 */

import { supabase } from './supabase';
import mockData from '@/data/dashboard-mock.json';
import { getTrainingPositionLabel, isTrainerEmployee } from '@/lib/trainer-position';

export interface TraineeRecord {
  id: string;
  name: string;
  status: 'ACTIVE' | 'DROPPED' | 'COMPLETED';
  month: string;
  quarter: string;
  p: number;
  a: number;
  isEndorsed?: boolean;
  isLoss?: boolean;
  assignedTrainer?: string;
  batchName?: string;
  accountName: string;
  created_at?: string;
}

export interface TrainerRecord {
  id: string;
  name: string;
  status: 'ACTIVE' | 'INACTIVE';
  pos: string;
  employeeNo?: string;
  startDate?: string;
  accounts?: string[];
  attRate?: number;
  relRate?: number;
  profilePic?: string;
  created_at?: string;
}

export interface DashboardData {
  inhouse: {
    [batchGroup: string]: TraineeRecord[];
  };
  pst: {
    [batchGroup: string]: TraineeRecord[];
  };
  trainerAttendance: {
    [trainerName: string]: TraineeRecord[];
  };
  trainerReliability: {
    [trainerName: string]: TraineeRecord[];
  };
  summary: {
    [key: string]: any;
  };
}

async function loadTrainerRecords(): Promise<TrainerRecord[]> {
  const [employeesResult, rolesResult, positionsResult, statusesResult, assignmentsResult, accountsResult] = await Promise.all([
    supabase.from('employees').select('id, employee_code, employee_name, status_id, role_id, position_id, hire_date, avatar_url'),
    supabase.from('roles').select('role_id, role_name'),
    supabase.from('positions').select('position_id, position_name, position_code'),
    supabase.from('statuses').select('status_id, status_name'),
    supabase.from('employee_assignments').select('employee_id, account_id'),
    supabase.from('accounts').select('account_id, account_name, account_code'),
  ]);
  const sourceError = employeesResult.error || rolesResult.error || positionsResult.error || statusesResult.error || assignmentsResult.error || accountsResult.error;
  if (sourceError) throw sourceError;

  const roleById = new Map((rolesResult.data || []).map((row: any) => [Number(row.role_id), row.role_name]));
  const positionById = new Map((positionsResult.data || []).map((row: any) => [Number(row.position_id), row]));
  const statusById = new Map((statusesResult.data || []).map((row: any) => [Number(row.status_id), String(row.status_name || '')]));
  const accountById = new Map((accountsResult.data || []).map((row: any) => [Number(row.account_id), String(row.account_name || row.account_code || '')]));
  const accountsByEmployeeId = new Map<string, string[]>();
  (assignmentsResult.data || []).forEach((row: any) => {
    const employeeId = String(row.employee_id || '');
    const account = accountById.get(Number(row.account_id));
    if (!employeeId || !account) return;
    const current = accountsByEmployeeId.get(employeeId) || [];
    if (!current.includes(account)) current.push(account);
    accountsByEmployeeId.set(employeeId, current);
  });

  return (employeesResult.data || [])
    .filter((employee: any) => isTrainerEmployee(positionById.get(Number(employee.position_id)), roleById.get(Number(employee.role_id))))
    .map((employee: any) => {
      const status = String(statusById.get(Number(employee.status_id)) || '').toUpperCase();
      const isInactive = /RESIGNED|TERMINATED|INACTIVE|AWOL/.test(status);
      return {
        id: String(employee.employee_code || employee.id),
        name: String(employee.employee_name || ''),
        status: isInactive ? 'INACTIVE' : 'ACTIVE',
        pos: getTrainingPositionLabel(positionById.get(Number(employee.position_id))),
        employeeNo: employee.employee_code ? String(employee.employee_code) : undefined,
        startDate: employee.hire_date || undefined,
        accounts: accountsByEmployeeId.get(String(employee.id)) || [],
        profilePic: employee.avatar_url || undefined,
      };
    });
}

/**
 * Fetch dashboard data from Supabase
 * Transforms rows into the expected dashboard structure
 */
export async function fetchDashboardData(): Promise<DashboardData> {
  try {
    // Check if Supabase is configured
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.warn('⚠️  Supabase not configured. Using mock data.');
      return mockData as unknown as DashboardData;
    }

    const [traineesResult, trainers] = await Promise.all([
      supabase.schema('training_system').from('trainees').select('*'),
      loadTrainerRecords(),
    ]);
    const { data: trainees, error: traineesError } = traineesResult;
    if (traineesError) throw traineesError;

    // Transform data into dashboard structure
    const dashboardData: DashboardData = {
      inhouse: {},
      pst: {},
      trainerAttendance: {},
      trainerReliability: {},
      summary: {
        totalTrainees: trainees?.length || 0,
        totalTrainers: trainers.length,
      },
    };

    // Populate inhouse and pst groups
    if (trainees) {
      trainees.forEach((trainee: TraineeRecord) => {
        const accountName = trainee.accountName;
        const isInhouse = accountName && ['ALPHA', 'BRAVO'].includes(accountName.toUpperCase());
        const category = isInhouse ? 'inhouse' : 'pst';
        const batchKey = trainee.batchName || 'UNASSIGNED';

        if (!dashboardData[category][batchKey]) {
          dashboardData[category][batchKey] = [];
        }
        dashboardData[category][batchKey].push(trainee);
      });
    }

    // Populate trainer attendance/reliability
    if (trainers.length) {
      trainers.forEach((trainer: TrainerRecord) => {
        if (!dashboardData.trainerAttendance[trainer.name]) {
          dashboardData.trainerAttendance[trainer.name] = [];
        }
        if (!dashboardData.trainerReliability[trainer.name]) {
          dashboardData.trainerReliability[trainer.name] = [];
        }
      });
    }

    console.log('✅ Dashboard data loaded from Supabase');
    return dashboardData;
  } catch (error) {
    console.error('❌ Error fetching Supabase data:', error);
    console.warn('⚠️  Falling back to mock data');
    return mockData as unknown as DashboardData;
  }
}

/**
 * Fetch only trainees from Supabase
 */
export async function fetchTrainees(): Promise<TraineeRecord[]> {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      throw new Error('Supabase not configured');
    }

    const { data, error } = await supabase.schema('training_system').from('trainees').select('*');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching trainees:', error);
    return [];
  }
}

/**
 * Fetch only trainers from Supabase
 */
export async function fetchTrainers(): Promise<TrainerRecord[]> {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
      throw new Error('Supabase not configured');
    }

    return await loadTrainerRecords();
  } catch (error) {
    console.error('Error fetching trainers:', error);
    return [];
  }
}
