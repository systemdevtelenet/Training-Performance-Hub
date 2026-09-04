/**
 * Data Loader - Fetches dashboard data from Supabase
 * Falls back to mock data if Supabase is not configured
 */

import { supabase } from './supabase';
import mockData from '@/data/dashboard-mock.json';

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

    // Fetch trainees
    const { data: trainees, error: traineesError } = await supabase
      .from('trainees')
      .select('*');

    if (traineesError) throw traineesError;

    // Fetch trainers
    const { data: trainers, error: trainersError } = await supabase
      .from('trainers')
      .select('*');

    if (trainersError) throw trainersError;

    // Transform data into dashboard structure
    const dashboardData: DashboardData = {
      inhouse: {},
      pst: {},
      trainerAttendance: {},
      trainerReliability: {},
      summary: {
        totalTrainees: trainees?.length || 0,
        totalTrainers: trainers?.length || 0,
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
    if (trainers) {
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

    const { data, error } = await supabase.from('trainees').select('*');

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

    const { data, error } = await supabase.from('trainers').select('*');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching trainers:', error);
    return [];
  }
}
