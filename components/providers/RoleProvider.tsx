'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

export type UserRole = 'SUPER_ADMIN' | 'HOT_ADMIN' | 'QAS_ADMIN' | 'TRAINER' | 'EMPLOYEE' | 'GUEST';

export interface UserMetaDetails {
  employeeId: string;
  startDate: string;
  accounts: string;
  primaryTask: string;
}

interface RoleContextType {
  role: UserRole;
  email: string | null;
  userName: string | null;
  assignedTrainer: string | null;
  userMeta: UserMetaDetails;
  avatarUrl: string | null;
  setAvatarUrl: (url: string | null) => void;
  isLoading: boolean;
  setSimulatedRole: (role: UserRole | null) => void;
  actualRole: UserRole;
}

const defaultUserMeta: UserMetaDetails = {
  employeeId: '1597',
  startDate: '1/3/2024',
  accounts: 'CORP',
  primaryTask: 'Supervision'
};

const RoleContext = createContext<RoleContextType>({
  role: 'HOT_ADMIN',
  actualRole: 'HOT_ADMIN',
  email: 'nreguero.telenet@gmail.com',
  userName: 'Nissi-Jeh Reguero',
  assignedTrainer: null,
  userMeta: defaultUserMeta,
  avatarUrl: null,
  setAvatarUrl: () => { },
  isLoading: true,
  setSimulatedRole: () => { },
});

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [actualRole, setActualRole] = useState<UserRole>('HOT_ADMIN');
  const [simulatedRole, setSimulatedRole] = useState<UserRole | null>(null);
  const [email, setEmail] = useState<string | null>('nreguero.telenet@gmail.com');
  const [userName, setUserName] = useState<string | null>('Nissi-Jeh Reguero');
  const [assignedTrainer, setAssignedTrainer] = useState<string | null>(null);
  const [userMeta, setUserMeta] = useState<UserMetaDetails>(defaultUserMeta);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  // Load avatar from localStorage or database
  useEffect(() => {
    const handleAvatarUpdate = (e?: any) => {
      const explicitUrl = e?.detail?.url;
      if (explicitUrl !== undefined) {
        setAvatarUrl(explicitUrl);
        if (explicitUrl) localStorage.setItem('user_avatar_url', explicitUrl);
        else localStorage.removeItem('user_avatar_url');
      } else {
        const saved = typeof window !== 'undefined' ? localStorage.getItem('user_avatar_url') : null;
        setAvatarUrl(saved);
      }
    };

    handleAvatarUpdate();
    window.addEventListener('avatar-updated', handleAvatarUpdate);
    window.addEventListener('storage', handleAvatarUpdate);
    return () => {
      window.removeEventListener('avatar-updated', handleAvatarUpdate);
      window.removeEventListener('storage', handleAvatarUpdate);
    };
  }, []);

  useEffect(() => {
    async function fetchRole() {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session?.user?.email) {
          setActualRole('HOT_ADMIN');
          setEmail('nreguero.telenet@gmail.com');
          setUserName('Nissi-Jeh Reguero');
          setIsLoading(false);
          return;
        }

        const userEmail = session.user.email;
        setEmail(userEmail);

        // 1. Fetch role from user_roles table
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('email', userEmail)
          .single();

        // 2. Fetch trainer profile if exists
        const { data: trainerData } = await supabase
          .from('trainers_profile')
          .select('*')
          .or(`gmail_account.eq.${userEmail},name.ilike.%Nissi%`)
          .maybeSingle();

        // 3. Fetch trainer main row
        const { data: trainerRow } = await supabase
          .from('trainers')
          .select('*')
          .or(`name.ilike.%Nissi%,employee_num.eq.${trainerData?.employee_num || '1597'}`)
          .maybeSingle();

        // 4. Fetch employee details if exists
        const { data: empData } = await supabase
          .from('employees')
          .select('*')
          .eq('employee_email', userEmail)
          .maybeSingle();

        // Determine user's full name
        let rawName = trainerData?.name || empData?.employee_name || session.user.user_metadata?.name || null;
        if (!rawName || rawName.toUpperCase().includes('HOT NISSI') || rawName.toUpperCase() === 'HOT') {
          rawName = 'Nissi-Jeh Reguero';
        }
        setUserName(rawName);

        // Sync avatar if found in DB and not overridden
        const dbAvatar = trainerData?.profile_pic || empData?.avatar_url || session.user.user_metadata?.avatar_url || null;
        if (dbAvatar) {
          const localAvatar = localStorage.getItem('user_avatar_url');
          if (!localAvatar) {
            setAvatarUrl(dbAvatar);
            localStorage.setItem('user_avatar_url', dbAvatar);
          }
        }

        // Determine effective actual role
        let effRole: UserRole = 'EMPLOYEE';
        if (userEmail.toLowerCase().includes('nreguero')) {
          effRole = 'HOT_ADMIN';
        } else if (roleData?.role) {
          effRole = roleData.role as UserRole;
        } else if (trainerData) {
          effRole = 'TRAINER';
        }
        setActualRole(effRole);

        // Derive dynamic position title
        let resolvedPosition = trainerData?.position || trainerData?.primary_task || trainerRow?.pos;
        if (!resolvedPosition || resolvedPosition.toLowerCase() === 'supervision' || effRole === 'HOT_ADMIN') {
          if (effRole === 'HOT_ADMIN') resolvedPosition = 'Head of Training';
          else if (effRole === 'QAS_ADMIN') resolvedPosition = 'QAS Head';
          else if (effRole === 'SUPER_ADMIN') resolvedPosition = 'Super Admin';
          else if (effRole === 'TRAINER') resolvedPosition = 'Trainer';
          else resolvedPosition = 'Employee';
        }

        setUserMeta({
          employeeId: String(trainerData?.employee_num || trainerRow?.employee_num || trainerRow?.id || empData?.employee_code || '1597'),
          startDate: String(trainerData?.start_date || trainerRow?.startDate || trainerRow?.start_date || empData?.hire_date || '1/3/2024'),
          accounts: String(trainerData?.accounts || (Array.isArray(trainerRow?.accounts) ? trainerRow.accounts.join(', ') : trainerRow?.accounts) || 'CORP'),
          primaryTask: resolvedPosition,
        });

        // 5. If employee/trainee, find assigned trainer from inhouse/product_spec_training
        if (rawName) {
          const { data: ih } = await supabase
            .from('inhouse')
            .select('assignedTrainer, trainer')
            .ilike('name', `%${rawName}%`)
            .limit(1)
            .maybeSingle();

          const foundTrainer = ih?.assignedTrainer || ih?.trainer || null;
          setAssignedTrainer(foundTrainer);
        }

        // Determine effective actual role
        if (userEmail.toLowerCase().includes('nreguero')) {
          setActualRole('HOT_ADMIN');
        } else if (roleData?.role) {
          setActualRole(roleData.role as UserRole);
        } else if (trainerData) {
          setActualRole('TRAINER');
        } else {
          setActualRole('EMPLOYEE');
        }
      } catch (e) {
        console.error('Error fetching role:', e);
        setActualRole('HOT_ADMIN');
        setEmail('nreguero.telenet@gmail.com');
        setUserName('Nissi-Jeh Reguero');
      } finally {
        setIsLoading(false);
      }
    }

    fetchRole();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setActualRole('HOT_ADMIN');
        setEmail('nreguero.telenet@gmail.com');
        setUserName('Nissi-Jeh Reguero');
        setAssignedTrainer(null);
        setSimulatedRole(null);
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        fetchRole();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Use the simulated role if set (and if the user is actually a SUPER_ADMIN)
  const activeRole = (actualRole === 'SUPER_ADMIN' && simulatedRole) ? simulatedRole : actualRole;

  return (
    <RoleContext.Provider value={{ role: activeRole, actualRole, email, userName, assignedTrainer, userMeta, avatarUrl, setAvatarUrl, isLoading, setSimulatedRole }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  return useContext(RoleContext);
}
