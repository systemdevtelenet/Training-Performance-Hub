'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { fetchUserProfile } from '@/lib/actions/profile';

export type UserRole = 'SUPER_ADMIN' | 'HOT_ADMIN' | 'QAS_ADMIN' | 'TRAINER' | 'EMPLOYEE' | 'GUEST';

export interface UserMetaDetails {
  employeeId: string;
  startDate: string;
  accounts: string;
  primaryTask: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  suffix?: string;
  mobileNo?: string;
  homeAddress?: string;
  systemRole?: string;
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
  employeeId: 'N/A',
  startDate: 'N/A',
  accounts: 'N/A',
  primaryTask: 'N/A',
  firstName: 'N/A',
  middleName: 'N/A',
  lastName: 'N/A',
  suffix: 'N/A',
  mobileNo: 'N/A',
  homeAddress: 'N/A',
  systemRole: 'N/A',
};

const RoleContext = createContext<RoleContextType>({
  role: 'GUEST',
  actualRole: 'GUEST',
  email: null,
  userName: null,
  assignedTrainer: null,
  userMeta: defaultUserMeta,
  avatarUrl: null,
  setAvatarUrl: () => { },
  isLoading: true,
  setSimulatedRole: () => { },
});

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [actualRole, setActualRole] = useState<UserRole>('GUEST');
  const [simulatedRole, setSimulatedRole] = useState<UserRole | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
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
          setActualRole('GUEST');
          setEmail(null);
          setUserName(null);
          setUserMeta(defaultUserMeta);
          setIsLoading(false);
          return;
        }

        const userEmail = session.user.email;
        setEmail(userEmail);

        // Fetch user profile securely on server to access trainers_profile, trainers, employees
        const res = await fetchUserProfile(userEmail);

        if (res.success) {
          setActualRole((res.role as UserRole) || 'EMPLOYEE');
          setUserName(res.userName || null);
          setAssignedTrainer(res.assignedTrainer || null);
          setUserMeta(res.userMeta || defaultUserMeta);

          if (res.avatarUrl) {
            const localAvatar = typeof window !== 'undefined' ? localStorage.getItem('user_avatar_url') : null;
            if (!localAvatar) {
              setAvatarUrl(res.avatarUrl);
              localStorage.setItem('user_avatar_url', res.avatarUrl);
            }
          }
        }
      } catch (e) {
        console.error('Error fetching role:', e);
        setActualRole('GUEST');
        setEmail(null);
        setUserName(null);
        setUserMeta(defaultUserMeta);
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
        setUserMeta(defaultUserMeta);
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
