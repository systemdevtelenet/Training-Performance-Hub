'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

export type UserRole = 'SUPER_ADMIN' | 'HOT_ADMIN' | 'QAS_ADMIN' | 'VIEW_ADMIN' | 'EMPLOYEE' | 'GUEST';

interface RoleContextType {
  role: UserRole;
  email: string | null;
  isLoading: boolean;
  setSimulatedRole: (role: UserRole | null) => void;
  actualRole: UserRole; // Expose actual role too so the switcher knows if it's allowed
}

const RoleContext = createContext<RoleContextType>({
  role: 'GUEST',
  actualRole: 'GUEST',
  email: null,
  isLoading: true,
  setSimulatedRole: () => {},
});

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [actualRole, setActualRole] = useState<UserRole>('GUEST');
  const [simulatedRole, setSimulatedRole] = useState<UserRole | null>(null);
  const [email, setEmail] = useState<string | null>(null);
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

        // Fetch role from our new user_roles table
        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('email', userEmail)
          .single();

        if (userEmail.toLowerCase().includes('bosssilver')) {
          setActualRole('VIEW_ADMIN');
        } else if (error || !data) {
          // Default to EMPLOYEE if they have an active session but no explicit role
          setActualRole('EMPLOYEE');
        } else {
          setActualRole(data.role as UserRole);
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
    <RoleContext.Provider value={{ role: activeRole, actualRole, email, isLoading, setSimulatedRole }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  return useContext(RoleContext);
}
