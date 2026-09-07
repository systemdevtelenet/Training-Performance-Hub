'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

export type UserRole = 'SUPER_ADMIN' | 'HOT_ADMIN' | 'QAS_ADMIN' | 'TRAINER' | 'EMPLOYEE' | 'GUEST';

interface RoleContextType {
  role: UserRole;
  email: string | null;
  userName: string | null;
  assignedTrainer: string | null;
  isLoading: boolean;
  setSimulatedRole: (role: UserRole | null) => void;
  actualRole: UserRole;
}

const RoleContext = createContext<RoleContextType>({
  role: 'GUEST',
  actualRole: 'GUEST',
  email: null,
  userName: null,
  assignedTrainer: null,
  isLoading: true,
  setSimulatedRole: () => { },
});

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [actualRole, setActualRole] = useState<UserRole>('GUEST');
  const [simulatedRole, setSimulatedRole] = useState<UserRole | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [assignedTrainer, setAssignedTrainer] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function fetchRole() {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session?.user?.email) {
          setActualRole('GUEST');
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
          .select('name, position')
          .eq('gmail_account', userEmail)
          .maybeSingle();

        // 3. Fetch employee details if exists
        const { data: empData } = await supabase
          .from('employees')
          .select('employee_name')
          .eq('employee_email', userEmail)
          .maybeSingle();

        // Determine user's full name
        const resolvedName = trainerData?.name || empData?.employee_name || session.user.user_metadata?.name || null;
        setUserName(resolvedName);

        // 4. If employee/trainee, find assigned trainer from inhouse/product_spec_training
        if (resolvedName) {
          const { data: ih } = await supabase
            .from('inhouse')
            .select('assignedTrainer, trainer')
            .ilike('name', `%${resolvedName}%`)
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
        setActualRole('GUEST');
      } finally {
        setIsLoading(false);
      }
    }

    fetchRole();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setActualRole('GUEST');
        setEmail(null);
        setUserName(null);
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
    <RoleContext.Provider value={{ role: activeRole, actualRole, email, userName, assignedTrainer, isLoading, setSimulatedRole }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  return useContext(RoleContext);
}
