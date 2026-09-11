'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { fetchUserProfile } from '@/lib/actions/profile';

export type UserRole = 'SUPER_ADMIN' | 'HOT_ADMIN' | 'QAS_ADMIN' | 'VIEW_ADMIN' | 'TRAINER' | 'TRAINEE' | 'EMPLOYEE' | 'UNAUTHORIZED' | 'GUEST';

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

const CACHE_PROFILE_KEY = 'ctnp_cached_auth_profile_v3';

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

  // Hydrate immediately from localStorage on client mount to prevent UI flashing to GUEST on reload
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const cachedStr = localStorage.getItem(CACHE_PROFILE_KEY);
        if (cachedStr) {
          const cached = JSON.parse(cachedStr);
          if (cached && cached.role && cached.role !== 'GUEST') {
            setActualRole(cached.role);
            if (cached.email) setEmail(cached.email);
            if (cached.userName) setUserName(cached.userName);
            if (cached.assignedTrainer) setAssignedTrainer(cached.assignedTrainer);
            if (cached.userMeta) setUserMeta(cached.userMeta);
            if (cached.avatarUrl) setAvatarUrl(cached.avatarUrl);
            setIsLoading(false);
          }
        }
      } catch (err) {
        console.warn('Error reading cached profile:', err);
      }
    }
  }, []);

  // Scope avatar storage to user email so accounts never leak avatars on shared browsers
  const getAvatarKey = (userMail: string) => `user_avatar_url_${userMail.toLowerCase().trim()}`;

  // Listen for avatar updates
  useEffect(() => {
    // Purge obsolete legacy un-scoped key if present
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('user_avatar_url');
      } catch (err) {
        // ignore
      }
    }

    const handleAvatarUpdate = (e?: any) => {
      const explicitUrl = e?.detail?.url;
      const targetEmail = e?.detail?.email || email;
      
      if (explicitUrl !== undefined) {
        setAvatarUrl(explicitUrl);
        if (targetEmail) {
          const key = getAvatarKey(targetEmail);
          if (explicitUrl) localStorage.setItem(key, explicitUrl);
          else localStorage.removeItem(key);
        }
      } else if (targetEmail) {
        const saved = typeof window !== 'undefined' ? localStorage.getItem(getAvatarKey(targetEmail)) : null;
        setAvatarUrl(saved);
      }
    };

    window.addEventListener('avatar-updated', handleAvatarUpdate);
    window.addEventListener('storage', handleAvatarUpdate);
    return () => {
      window.removeEventListener('avatar-updated', handleAvatarUpdate);
      window.removeEventListener('storage', handleAvatarUpdate);
    };
  }, [email]);

  useEffect(() => {
    async function fetchRole() {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session?.user?.email) {
          setActualRole('GUEST');
          setEmail(null);
          setUserName(null);
          setUserMeta(defaultUserMeta);
          setAvatarUrl(null);
          if (typeof window !== 'undefined') {
            localStorage.removeItem(CACHE_PROFILE_KEY);
          }
          setIsLoading(false);
          return;
        }

        const userEmail = session.user.email;
        setEmail(userEmail);

        // Fetch user profile securely on server to access trainers_profile, trainers, employees
        const res = await fetchUserProfile(userEmail);

        if (res.success) {
          const resolvedRole = (res.role as UserRole) || 'UNAUTHORIZED';
          setActualRole(resolvedRole);
          const resolvedName = (res.userName && res.userName !== 'N/A') 
            ? res.userName 
            : (session.user.user_metadata?.name || userEmail.split('@')[0].split(/[\._]/).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' '));
          setUserName(resolvedName);
          setAssignedTrainer(res.assignedTrainer || null);
          setUserMeta(res.userMeta || defaultUserMeta);

          const emailKey = getAvatarKey(userEmail);
          let finalAvatar = res.avatarUrl;
          if (res.avatarUrl) {
            setAvatarUrl(res.avatarUrl);
            localStorage.setItem(emailKey, res.avatarUrl);
          } else {
            const localSaved = typeof window !== 'undefined' ? localStorage.getItem(emailKey) : null;
            finalAvatar = localSaved || null;
            setAvatarUrl(finalAvatar);
          }

          // Persist to local cache so next reload has 0ms hydration delay
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem(CACHE_PROFILE_KEY, JSON.stringify({
                role: resolvedRole,
                email: userEmail,
                userName: resolvedName,
                assignedTrainer: res.assignedTrainer || null,
                userMeta: res.userMeta || defaultUserMeta,
                avatarUrl: finalAvatar
              }));
            } catch (err) {
              // ignore
            }
          }
        } else {
          setAvatarUrl(null);
        }
      } catch (e) {
        console.error('Error fetching role:', e);
        // Only set GUEST if we have no prior session
        if (!email) {
          setActualRole('GUEST');
          setEmail(null);
          setUserName(null);
          setUserMeta(defaultUserMeta);
          setAvatarUrl(null);
        }
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
        setAvatarUrl(null);
        if (typeof window !== 'undefined') {
          localStorage.removeItem(CACHE_PROFILE_KEY);
        }
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
