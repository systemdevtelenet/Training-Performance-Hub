'use client';

import { useState, useEffect } from 'react';
import {
  User,
  Camera,
  Phone,
  Mail,
  Save,
  Briefcase,
  Building2,
  ShieldCheck,
  IdCard,
  MapPin,
  Lock,
  Eye,
  EyeOff,
  CalendarDays,
  Users,
  GraduationCap,
  BarChart3,
  KeyRound,
  Trash2,
  Monitor,
  ChevronDown,
  Check,
  Loader2,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

type ProfileTab = 'personal' | 'security' | 'work';

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<ProfileTab>('personal');
  const [isHydrating, setIsHydrating] = useState(true);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [saving, setSaving] = useState(false);

  const [profile, setProfile] = useState({
    firstName: 'Nico',
    lastName: 'Reguero',
    employeeId: 'CTN-80429',
    email: 'n.reguero@cebutele.net',
    mobileNo: '+63 917 123 4567',
    role: 'Training Admin',
    department: 'Operations Training',
    assignedAccount: 'All Client Accounts',
    workSite: 'Cebu IT Park Hub - Tower 2',
    supervisor: 'Joven Aniñon',
    shiftSchedule: '6:00 AM - 3:00 PM',
    startDate: 'January 3, 2024',
  });

  const [passwords, setPasswords] = useState({
    current: '',
    newPw: '',
    confirm: '',
  });

  // Simulate initial data fetching delay
  useEffect(() => {
    const timer = setTimeout(() => setIsHydrating(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const updateProfile = (field: string, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const updatePassword = (field: string, value: string) => {
    setPasswords(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      console.log('Profile saved:', profile);
    }, 800);
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Password change requested');
    setPasswords({ current: '', newPw: '', confirm: '' });
  };

  const initials = `${profile.firstName.charAt(0)}${profile.lastName.charAt(0)}`;

  const tabs: { key: ProfileTab; label: string; icon: typeof User }[] = [
    { key: 'personal', label: 'Personal Details', icon: User },
    { key: 'security', label: 'Security & Password', icon: ShieldCheck },
    { key: 'work', label: 'Work Context', icon: Briefcase },
  ];

  const trainerStats = [
    { label: 'Active Batches', value: '6', icon: GraduationCap, color: 'text-[#2F6798]' },
    { label: 'Trainees Supervised', value: '42', icon: Users, color: 'text-emerald-600' },
    { label: 'Attendance Rate', value: '96.4%', icon: BarChart3, color: 'text-[#C8A54B]' },
  ];

  const inputClass = 'w-full pl-10 pr-4 py-2.5 text-xs font-medium text-slate-800 rounded-xl border border-slate-200 bg-white dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-[#2F6798]/30 focus:border-[#2F6798] transition-all';
  const readonlyInputClass = 'w-full pl-10 pr-4 py-2.5 text-xs font-medium text-slate-600 rounded-xl border border-slate-100 bg-slate-50/60 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-700';

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Profile Settings</h2>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">Manage your account credentials and preferences</p>
        </div>
        <button
          onClick={handleSave}
          disabled={isHydrating || saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2F6798] hover:bg-[#24527a] text-white font-bold text-xs shadow-xs transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Profile Summary Card (1/3) */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs overflow-hidden">
          <div className="bg-gradient-to-br from-[#2F6798] to-[#1e4a6e] px-6 pt-8 pb-12 text-center relative">
            <div className="relative inline-block">
              {isHydrating ? (
                <Skeleton className="w-24 h-24 rounded-full bg-white/20 border-4 border-white/30 mx-auto" />
              ) : (
                <div className="w-24 h-24 rounded-full bg-white/20 border-4 border-white/30 flex items-center justify-center mx-auto">
                  <span className="text-3xl font-bold text-white">{initials}</span>
                </div>
              )}
              <button
                type="button"
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-white dark:bg-slate-800 border-2 border-[#2F6798] text-[#2F6798] flex items-center justify-center shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                title="Upload Photo"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="px-6 -mt-6 text-center relative z-10">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xs p-4">
              {isHydrating ? (
                <div className="flex flex-col items-center gap-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-40" />
                </div>
              ) : (
                <>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50">{profile.firstName} {profile.lastName}</h3>
                  <p className="text-[10px] font-bold text-[#2F6798] uppercase tracking-wider mt-1">{profile.role}</p>
                  <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-1">{profile.email}</p>
                </>
              )}

              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 grid grid-cols-2 gap-2 text-center">
                <div>
                  <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Employee ID</p>
                  {isHydrating ? <Skeleton className="h-4 w-16 mx-auto mt-0.5" /> : <p className="text-xs font-bold text-slate-800 dark:text-slate-100 mt-0.5">{profile.employeeId}</p>}
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Department</p>
                  {isHydrating ? <Skeleton className="h-4 w-24 mx-auto mt-0.5" /> : <p className="text-xs font-bold text-slate-800 dark:text-slate-100 mt-0.5">{profile.department}</p>}
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 mt-3 space-y-2">
            <button
              type="button"
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
            >
              <Camera className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
              Upload Photo
            </button>
            <button
              type="button"
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-rose-200 text-xs font-semibold text-rose-600 hover:bg-rose-50/50 dark:hover:bg-rose-900/20 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Deactivate Account
            </button>
          </div>
        </div>

        {/* Right Column (2/3) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Personal Statistics */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {trainerStats.map((stat) => (
              <div key={stat.label} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-slate-50 dark:bg-slate-700 flex items-center justify-center">
                    <stat.icon className={`w-3.5 h-3.5 ${stat.color}`} />
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">{stat.label}</span>
                </div>
                {isHydrating ? <Skeleton className="h-7 w-16" /> : <p className="text-xl font-black text-slate-900 dark:text-slate-50">{stat.value}</p>}
              </div>
            ))}
          </div>

          {/* Tabs */}
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs overflow-hidden">
            <div className="flex border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-700/40 px-1">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-bold transition-all border-b-2 ${
                    activeTab === tab.key
                      ? 'border-[#2F6798] text-[#2F6798] bg-white dark:bg-slate-800'
                      : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </div>

            <div className="p-6">
              {isHydrating ? (
                <div className="space-y-6 animate-pulse">
                  <Skeleton className="h-4 w-40" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Skeleton className="h-10 w-full rounded-xl" />
                    <Skeleton className="h-10 w-full rounded-xl" />
                    <Skeleton className="h-10 w-full rounded-xl" />
                    <Skeleton className="h-10 w-full rounded-xl" />
                    <Skeleton className="md:col-span-2 h-10 w-full rounded-xl" />
                    <Skeleton className="md:col-span-2 h-10 w-full rounded-xl" />
                  </div>
                </div>
              ) : (
                <>
                  {/* Personal Details Tab */}
                  {activeTab === 'personal' && (
                <div className="space-y-5">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Personal Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">First Name</label>
                      <div className="relative">
                        <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={profile.firstName}
                          onChange={(e) => updateProfile('firstName', e.target.value)}
                          className={inputClass}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">Last Name</label>
                      <div className="relative">
                        <User className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={profile.lastName}
                          onChange={(e) => updateProfile('lastName', e.target.value)}
                          className={inputClass}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">Employee ID</label>
                      <div className="relative">
                        <IdCard className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input type="text" value={profile.employeeId} readOnly className={readonlyInputClass} />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">System Role</label>
                      <div className="relative">
                        <ShieldCheck className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <select
                          value={profile.role}
                          onChange={(e) => updateProfile('role', e.target.value)}
                          className={`${inputClass} appearance-none cursor-pointer pr-10`}
                        >
                          <option>Training Admin</option>
                          <option>Operations Manager</option>
                          <option>Senior Trainer</option>
                          <option>Corporate Trainer</option>
                          <option>Quality Specialist</option>
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">Corporate Email</label>
                      <div className="relative">
                        <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="email"
                          value={profile.email}
                          onChange={(e) => updateProfile('email', e.target.value)}
                          className={inputClass}
                        />
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">Mobile No.</label>
                      <div className="relative">
                        <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="tel"
                          value={profile.mobileNo}
                          onChange={(e) => updateProfile('mobileNo', e.target.value)}
                          className={inputClass}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Security Tab */}
              {activeTab === 'security' && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Change Password</h3>
                    <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mt-0.5">Ensure your account stays secure with a strong password</p>
                  </div>
                  <form onSubmit={handlePasswordChange} className="space-y-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">Current Password</label>
                      <div className="relative">
                        <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type={showCurrentPw ? 'text' : 'password'}
                          value={passwords.current}
                          onChange={(e) => updatePassword('current', e.target.value)}
                          placeholder="Enter current password"
                          className={`${inputClass} pr-10`}
                        />
                        <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                          {showCurrentPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">New Password</label>
                        <div className="relative">
                          <KeyRound className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type={showNewPw ? 'text' : 'password'}
                            value={passwords.newPw}
                            onChange={(e) => updatePassword('newPw', e.target.value)}
                            placeholder="Enter new password"
                            className={`${inputClass} pr-10`}
                          />
                          <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                            {showNewPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">Confirm Password</label>
                        <div className="relative">
                          <KeyRound className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type={showConfirmPw ? 'text' : 'password'}
                            value={passwords.confirm}
                            onChange={(e) => updatePassword('confirm', e.target.value)}
                            placeholder="Confirm new password"
                            className={`${inputClass} pr-10`}
                          />
                          <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                            {showConfirmPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2F6798] hover:bg-[#24527a] text-white font-bold text-xs shadow-xs transition-colors"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      Update Password
                    </button>
                  </form>

                  <hr className="border-slate-100 dark:border-slate-700" />

                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-3">Two-Factor Authentication</h3>
                    <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-[#2F6798]/10 flex items-center justify-center">
                          <ShieldCheck className="w-4 h-4 text-[#2F6798]" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-100">Authenticator App</p>
                          <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">Use an authenticator app to generate one-time codes</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="relative inline-flex h-6 w-11 items-center rounded-full bg-[#2F6798] transition-colors"
                        role="switch"
                        aria-checked="true"
                      >
                        <span className="inline-block h-4 w-4 translate-x-6 rounded-full bg-white transition-transform shadow-sm" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-3">Active Login Sessions</h3>
                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 divide-y divide-slate-100 dark:divide-slate-700">
                      {[
                        { device: 'Chrome on Windows', ip: '192.168.1.45', time: 'Current session', active: true },
                        { device: 'Safari on iPhone', ip: '10.0.0.32', time: '2 hours ago', active: false },
                      ].map((session, idx) => (
                        <div key={idx} className="flex items-center justify-between px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Monitor className="w-4 h-4 text-slate-400" />
                            <div>
                              <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{session.device}</p>
                              <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">IP: {session.ip} &middot; {session.time}</p>
                            </div>
                          </div>
                          {session.active ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[9px] font-bold border border-emerald-200">
                              <Check className="w-2.5 h-2.5" /> Current
                            </span>
                          ) : (
                            <button className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 hover:text-rose-600 transition-colors">Revoke</button>
                          )}
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-bold text-rose-600 hover:text-rose-700 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      Log out all sessions
                    </button>
                  </div>
                </div>
              )}

              {/* Work Context Tab */}
              {activeTab === 'work' && (
                <div className="space-y-5">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Work Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">Department</label>
                      <div className="relative">
                        <Briefcase className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <select
                          value={profile.department}
                          onChange={(e) => updateProfile('department', e.target.value)}
                          className={`${inputClass} appearance-none cursor-pointer pr-10`}
                        >
                          <option>Operations Training</option>
                          <option>PST Division</option>
                          <option>Inhouse Training</option>
                          <option>Quality Assurance</option>
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">Assigned Client Account</label>
                      <div className="relative">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <select
                          value={profile.assignedAccount}
                          onChange={(e) => updateProfile('assignedAccount', e.target.value)}
                          className={`${inputClass} appearance-none cursor-pointer pr-10`}
                        >
                          <option>All Client Accounts</option>
                          <option>Alpha Client</option>
                          <option>Bravo Client</option>
                          <option>Gamma Client</option>
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">Direct Supervisor</label>
                      <div className="relative">
                        <Users className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input type="text" value={profile.supervisor} readOnly className={readonlyInputClass} />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">Shift Schedule</label>
                      <div className="relative">
                        <CalendarDays className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input type="text" value={profile.shiftSchedule} readOnly className={readonlyInputClass} />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">Start Date</label>
                      <div className="relative">
                        <CalendarDays className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input type="text" value={profile.startDate} readOnly className={readonlyInputClass} />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">Primary Work Site</label>
                      <div className="relative">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={profile.workSite}
                          onChange={(e) => updateProfile('workSite', e.target.value)}
                          className={inputClass}
                        />
                      </div>
                    </div>
                  </div>

                  <hr className="border-slate-100 dark:border-slate-700" />

                  <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl">
                    <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                    <p className="text-[10px] font-semibold text-amber-700">Contact your administrator to modify Employee ID, System Role, or Assigned Accounts.</p>
                  </div>
                </div>
              )}
            </>
            )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
