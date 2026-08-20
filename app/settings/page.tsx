'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Settings,
  Bell,
  Globe,
  Calendar,
  ShieldAlert,
  Users,
  Database,
  RefreshCw,
  Save,
  RotateCcw,
  Check,
  X,
  ChevronDown,
  AlertTriangle,
  Activity,
  Link2,
  Wifi,
  ServerCog,
  Monitor,
  Sun,
  Moon,
  CheckCircle2,
  Clock,
  Loader2,
  Shield,
  Eye,
  Sparkles,
  BarChart3,
  GraduationCap,
  FileText,
  Zap,
  Server,
} from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';

type SettingsTab = 'general' | 'notifications' | 'thresholds' | 'roles' | 'integrations';

export default function SettingsPage() {
  const { theme: globalTheme, setTheme: setGlobalTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [isHydrating, setIsHydrating] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);

  const [preferences, setPreferences] = useState({
    theme: 'light',
    timezone: 'Asia/Manila',
    dateFormat: 'MM/DD/YYYY',
  });

  const initialPrefsRef = useRef(preferences);

  const [notifications, setNotifications] = useState({
    highAttrition: true,
    attendanceBelow: true,
    reliabilityBelow: true,
    newBatch: true,
    trainerAssignment: false,
    batchStatus: true,
    syncCompleted: false,
    syncFailed: true,
    integrationDisconnected: true,
    deliveryInApp: true,
    deliveryEmail: false,
  });

  const [thresholds, setThresholds] = useState({
    criticalAttrition: '15.0',
    criticalAttendance: '90.0',
    warningAttrition: '10.0',
    warningAttendance: '95.0',
    minBatchSuccess: '80.0',
  });

  const [users, setUsers] = useState([
    { id: '1', name: 'Nico Reguero', email: 'n.reguero@cebutele.net', role: 'ADMIN', status: 'Active' },
    { id: '2', name: 'Nissi-Jeh Reguero', email: 'nissi.reguero@cebutele.net', role: 'ADMIN', status: 'Active' },
    { id: '3', name: 'Jeremy Rigodon', email: 'j.rigodon@cebutele.net', role: 'EMPLOYEE', status: 'Active' },
    { id: '4', name: 'Nina Joy Briones', email: 'nj.briones@cebutele.net', role: 'EMPLOYEE', status: 'Active' },
    { id: '5', name: 'Michelle Yncierto', email: 'myncierto@cebutele.net', role: 'EMPLOYEE', status: 'Active' },
    { id: '6', name: 'Rommel Mendoza', email: 'r.mendoza@cebutele.net', role: 'EMPLOYEE', status: 'Active' },
  ]);

  const [integrations] = useState([
    { id: '1', name: 'Supabase', purpose: 'Application database for trainee and trainer records', status: 'connected', lastSync: 'Aug 20, 2026 04:10 AM', icon: Database },
    { id: '2', name: 'HRIS Sync', purpose: 'Employee data integration from the Human Resource Information System', status: 'disconnected', lastSync: null, icon: ServerCog },
    { id: '3', name: 'Phone Tracker DB', purpose: 'Call monitoring and agent activity tracking system', status: 'connected', lastSync: 'Aug 20, 2026 03:45 AM', icon: Activity },
    { id: '4', name: 'SSO / LDAP', purpose: 'Single Sign-On via Active Directory for centralized authentication', status: 'disconnected', lastSync: null, icon: ShieldAlert },
  ]);

  useEffect(() => {
    const timer = setTimeout(() => setIsHydrating(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const markUnsaved = useCallback(() => {
    setHasUnsavedChanges(true);
    setShowSaved(false);
  }, []);

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
    markUnsaved();
  };

  const updateThreshold = (key: keyof typeof thresholds, value: string) => {
    setThresholds(prev => ({ ...prev, [key]: value }));
    markUnsaved();
  };

  const updateUserRole = (userId: string, role: string) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role } : u));
    markUnsaved();
  };

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setShowSaved(true);
      setHasUnsavedChanges(false);
      setTimeout(() => setShowSaved(false), 3000);
    }, 800);
  };

  const handleReset = () => {
    setShowResetDialog(true);
  };

  const confirmReset = () => {
    setThresholds({
      criticalAttrition: '15.0',
      criticalAttendance: '90.0',
      warningAttrition: '10.0',
      warningAttendance: '95.0',
      minBatchSuccess: '80.0',
    });
    setPreferences({ theme: 'light', timezone: 'Asia/Manila', dateFormat: 'MM/DD/YYYY' });
    setNotifications({
      highAttrition: true,
      attendanceBelow: true,
      reliabilityBelow: true,
      newBatch: true,
      trainerAssignment: false,
      batchStatus: true,
      syncCompleted: false,
      syncFailed: true,
      integrationDisconnected: true,
      deliveryInApp: true,
      deliveryEmail: false,
    });
    setHasUnsavedChanges(false);
    setShowResetDialog(false);
    setShowSaved(false);
  };

  const tabs: { key: SettingsTab; label: string; icon: typeof Settings }[] = [
    { key: 'general', label: 'General', icon: Settings },
    { key: 'notifications', label: 'Notifications', icon: Bell },
    { key: 'thresholds', label: 'KPI Thresholds', icon: ShieldAlert },
    { key: 'roles', label: 'User Roles', icon: Users },
    { key: 'integrations', label: 'Integrations', icon: Link2 },
  ];

  const Toggle = ({ enabled, onToggle, label }: { enabled: boolean; onToggle: () => void; label?: string }) => (
    <button
      type="button"
      onClick={onToggle}
      role="switch"
      aria-checked={enabled}
      aria-label={label}
      className={`relative inline-flex h-[22px] w-[40px] shrink-0 rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F6798]/40 ${enabled ? 'bg-[#2F6798]' : 'bg-slate-200 dark:bg-slate-600'}`}
    >
      <span className={`inline-block h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-transform duration-200 mt-[2px] ${enabled ? 'translate-x-[20px]' : 'translate-x-[2px]'}`} />
    </button>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">System Settings</h2>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5 max-w-lg">Configure application preferences, notifications, KPI thresholds, user access, and system integrations.</p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          {hasUnsavedChanges && !showSaved && (
            <span className="text-[10px] font-semibold text-amber-600 mr-1 hidden sm:inline">Unsaved changes</span>
          )}
          <button
            onClick={handleReset}
            disabled={isHydrating || saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isHydrating ? <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" /> : <RotateCcw className="w-3.5 h-3.5" />}
            Reset to Default
          </button>
          <button
            onClick={handleSave}
            disabled={isHydrating || saving}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#2F6798] hover:bg-[#24527a] text-white font-bold text-xs shadow-xs transition-all disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isHydrating || saving ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : showSaved ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            {saving ? 'Saving...' : showSaved ? 'Saved' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Success Toast */}
      {showSaved && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-xl text-xs font-semibold text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          Settings saved successfully.
        </div>
      )}

      {/* Settings Navigation */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-xs overflow-hidden">
        <div className="flex overflow-x-auto border-b border-slate-100 dark:border-slate-700 scrollbar-none">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 py-3.5 px-5 text-xs font-semibold whitespace-nowrap transition-all border-b-2 shrink-0 ${
                activeTab === tab.key
                  ? 'border-[#2F6798] text-[#2F6798]'
                  : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-50/50 dark:hover:bg-slate-700/50'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* SKELETON RENDER */}
          {isHydrating ? (
            <div className="space-y-6 animate-pulse">
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
                <div className="h-10 w-full max-w-xs bg-slate-200 dark:bg-slate-700 rounded-xl mb-4" />
                <div className="grid grid-cols-2 gap-3 max-w-xs">
                  <div className="h-12 w-full bg-slate-200 dark:bg-slate-700 rounded-xl" />
                  <div className="h-12 w-full bg-slate-200 dark:bg-slate-700 rounded-xl" />
                </div>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="h-10 w-full bg-slate-200 dark:bg-slate-700 rounded-xl" />
                  <div className="h-10 w-full bg-slate-200 dark:bg-slate-700 rounded-xl" />
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* ────────────── GENERAL ────────────── */}
              {activeTab === 'general' && (
            <div className="space-y-6">
              {/* Display Preferences */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                <div className="mb-4">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Display Preferences</h3>
                  <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mt-0.5">Customize how information is displayed throughout the Training Performance Hub.</p>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-2.5">Theme</label>
                  <div className="grid grid-cols-2 gap-3 max-w-xs">
                    {[
                      { value: 'light', label: 'Light', icon: Sun },
                      { value: 'dark', label: 'Dark', icon: Moon },
                    ].map((theme) => {
                      const isSelected = preferences.theme === theme.value;
                      return (
                        <button
                          key={theme.value}
                          onClick={() => { 
                            setPreferences(prev => ({ ...prev, theme: theme.value })); 
                            setGlobalTheme(theme.value as 'light' | 'dark');
                            markUnsaved(); 
                          }}
                          className={`flex items-center gap-3 p-3.5 rounded-xl border-2 text-xs font-semibold transition-all ${
                            isSelected
                              ? 'border-[#2F6798] bg-[#2F6798]/5 text-[#2F6798] dark:border-[#4B8AB8] dark:bg-[#4B8AB8]/10 dark:text-[#4B8AB8]'
                              : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50/50 dark:hover:bg-slate-700/50'
                          }`}
                        >
                          <theme.icon className="w-4 h-4 shrink-0" />
                          <span className="flex-1 text-left">{theme.label}</span>
                          {isSelected && <Check className="w-4 h-4 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Regional Preferences */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                <div className="mb-4">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Regional Preferences</h3>
                  <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mt-0.5">Set your timezone and date display format.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">Timezone</label>
                    <div className="relative">
                      <Globe className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <select
                        value={preferences.timezone}
                        onChange={(e) => { setPreferences(prev => ({ ...prev, timezone: e.target.value })); markUnsaved(); }}
                        className="w-full pl-9 pr-10 py-2.5 text-xs font-medium text-slate-800 dark:text-slate-300 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2F6798]/30 focus:border-[#2F6798] appearance-none cursor-pointer transition-all"
                      >
                        <option>Asia/Manila</option>
                        <option>Asia/Singapore</option>
                        <option>America/New_York</option>
                        <option>Europe/London</option>
                        <option>Australia/Sydney</option>
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">Date Format</label>
                    <div className="relative">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                      <select
                        value={preferences.dateFormat}
                        onChange={(e) => { setPreferences(prev => ({ ...prev, dateFormat: e.target.value })); markUnsaved(); }}
                        className="w-full pl-9 pr-10 py-2.5 text-xs font-medium text-slate-800 dark:text-slate-300 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-[#2F6798]/30 focus:border-[#2F6798] appearance-none cursor-pointer transition-all"
                      >
                        <option>MM/DD/YYYY</option>
                        <option>DD/MM/YYYY</option>
                        <option>YYYY-MM-DD</option>
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                <div className="mb-3">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Display Preview</h3>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-100 dark:border-slate-700 px-4 py-3 flex items-center gap-3">
                  <Monitor className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Today&apos;s date will appear as{' '}
                    <span className="font-bold text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-700">
                      {preferences.dateFormat === 'MM/DD/YYYY' ? '08/20/2026' : preferences.dateFormat === 'DD/MM/YYYY' ? '20/08/2026' : '2026-08-20'}
                    </span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ────────────── NOTIFICATIONS ────────────── */}
          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Notification Preferences</h3>
                <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mt-0.5">Choose which system events should generate notifications.</p>
              </div>

              {/* Performance Alerts */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">Performance Alerts</h4>
                </div>
                <div className="space-y-0 divide-y divide-slate-100 dark:divide-slate-700">
                  {[
                    { key: 'highAttrition' as const, label: 'High Attrition Detected', desc: 'Notify when a batch exceeds the configured attrition threshold.' },
                    { key: 'attendanceBelow' as const, label: 'Attendance Rate Below Threshold', desc: 'Alert when trainer attendance drops below the configured minimum.' },
                    { key: 'reliabilityBelow' as const, label: 'Reliability Rate Below Threshold', desc: 'Alert when trainer reliability falls below the target level.' },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{item.label}</p>
                        <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">{item.desc}</p>
                      </div>
                      <Toggle enabled={notifications[item.key]} onToggle={() => toggleNotification(item.key)} label={`Toggle ${item.label}`} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Training Updates */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 rounded-lg bg-[#2F6798]/10 flex items-center justify-center">
                    <GraduationCap className="w-3.5 h-3.5 text-[#2F6798]" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">Training Updates</h4>
                </div>
                <div className="space-y-0 divide-y divide-slate-100 dark:divide-slate-700">
                  {[
                    { key: 'newBatch' as const, label: 'New Batch Assigned', desc: 'Notify when a new training batch is created and assigned.' },
                    { key: 'trainerAssignment' as const, label: 'Trainer Assignment Changed', desc: 'Alert when a trainer is reassigned to a different batch.' },
                    { key: 'batchStatus' as const, label: 'Batch Status Changed', desc: 'Notify when a batch status transitions between states.' },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{item.label}</p>
                        <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">{item.desc}</p>
                      </div>
                      <Toggle enabled={notifications[item.key]} onToggle={() => toggleNotification(item.key)} label={`Toggle ${item.label}`} />
                    </div>
                  ))}
                </div>
              </div>

              {/* System Notifications */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                    <Server className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">System Notifications</h4>
                </div>
                <div className="space-y-0 divide-y divide-slate-100 dark:divide-slate-700">
                  {[
                    { key: 'syncCompleted' as const, label: 'Data Synchronization Completed', desc: 'Notify when a background data sync finishes successfully.' },
                    { key: 'syncFailed' as const, label: 'Data Synchronization Failed', desc: 'Alert when a data synchronization process encounters an error.' },
                    { key: 'integrationDisconnected' as const, label: 'Integration Disconnected', desc: 'Alert when an external integration loses its connection.' },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{item.label}</p>
                        <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">{item.desc}</p>
                      </div>
                      <Toggle enabled={notifications[item.key]} onToggle={() => toggleNotification(item.key)} label={`Toggle ${item.label}`} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Notification Delivery */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                <div className="mb-4">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">Notification Delivery</h4>
                  <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mt-0.5">Choose how you want to receive notifications.</p>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-4 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                    <div className="flex items-center gap-2.5">
                      <Bell className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">In-app notifications</span>
                    </div>
                    <Toggle enabled={notifications.deliveryInApp} onToggle={() => toggleNotification('deliveryInApp')} label="Toggle in-app notifications" />
                  </div>
                  <div className="flex items-center justify-between gap-4 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl">
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Email notifications</span>
                    </div>
                    <Toggle enabled={notifications.deliveryEmail} onToggle={() => toggleNotification('deliveryEmail')} label="Toggle email notifications" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ────────────── KPI THRESHOLDS ────────────── */}
          {activeTab === 'thresholds' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">KPI Thresholds</h3>
                <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mt-0.5">Define the thresholds used to identify performance risks and generate alerts.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Attrition Rate */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">Attrition Rate</h4>
                      <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">Monitors trainee dropout and loss percentages per batch.</p>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-900/20 flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-4 h-4 text-rose-500" />
                    </div>
                  </div>
                  <div className="space-y-2 mb-4">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Critical Threshold</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={thresholds.criticalAttrition}
                        onChange={(e) => updateThreshold('criticalAttrition', e.target.value)}
                        className="w-full px-3 py-2.5 text-sm font-bold text-slate-800 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2F6798]/30 focus:border-[#2F6798] text-center transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-semibold">
                      <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Low Risk</span>
                      <span className="text-slate-500 dark:text-slate-400">0% &ndash; 10%</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-semibold">
                      <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" /> Moderate Risk</span>
                      <span className="text-slate-500 dark:text-slate-400">10% &ndash; 20%</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-semibold">
                      <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-400" /> High Risk</span>
                      <span className="text-slate-500 dark:text-slate-400">Above 20%</span>
                    </div>
                  </div>
                </div>

                {/* Attendance Rate */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">Attendance Rate</h4>
                      <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">Minimum acceptable trainer attendance percentage.</p>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center shrink-0">
                      <Clock className="w-4 h-4 text-amber-500" />
                    </div>
                  </div>
                  <div className="space-y-2 mb-4">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Critical Threshold</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={thresholds.criticalAttendance}
                        onChange={(e) => updateThreshold('criticalAttendance', e.target.value)}
                        className="w-full px-3 py-2.5 text-sm font-bold text-slate-800 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2F6798]/30 focus:border-[#2F6798] text-center transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-semibold">
                      <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Excellent</span>
                      <span className="text-slate-500 dark:text-slate-400">Above 95%</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-semibold">
                      <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" /> Needs Attention</span>
                      <span className="text-slate-500 dark:text-slate-400">80% &ndash; 95%</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-semibold">
                      <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-400" /> Critical</span>
                      <span className="text-slate-500 dark:text-slate-400">Below 80%</span>
                    </div>
                  </div>
                </div>

                {/* Reliability Rate */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">Reliability Rate</h4>
                      <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">Tracks trainer consistency excluding leave types.</p>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-[#2F6798]/10 flex items-center justify-center shrink-0">
                      <ShieldAlert className="w-4 h-4 text-[#2F6798]" />
                    </div>
                  </div>
                  <div className="space-y-2 mb-4">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Warning Threshold</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={thresholds.warningAttendance}
                        onChange={(e) => updateThreshold('warningAttendance', e.target.value)}
                        className="w-full px-3 py-2.5 text-sm font-bold text-slate-800 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2F6798]/30 focus:border-[#2F6798] text-center transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-semibold">
                      <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Reliable</span>
                      <span className="text-slate-500 dark:text-slate-400">Above 90%</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-semibold">
                      <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" /> Moderate</span>
                      <span className="text-slate-500 dark:text-slate-400">80% &ndash; 90%</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-semibold">
                      <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-400" /> Unreliable</span>
                      <span className="text-slate-500 dark:text-slate-400">Below 80%</span>
                    </div>
                  </div>
                </div>

                {/* Training Success Rate */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">Training Success Rate</h4>
                      <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">Minimum target for batch completion success.</p>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center shrink-0">
                      <Check className="w-4 h-4 text-emerald-500" />
                    </div>
                  </div>
                  <div className="space-y-2 mb-4">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Minimum Threshold</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={thresholds.minBatchSuccess}
                        onChange={(e) => updateThreshold('minBatchSuccess', e.target.value)}
                        className="w-full px-3 py-2.5 text-sm font-bold text-slate-800 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-[#2F6798]/30 focus:border-[#2F6798] text-center transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[10px] font-semibold">
                      <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Target Met</span>
                      <span className="text-slate-500 dark:text-slate-400">Above 90%</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-semibold">
                      <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" /> Below Target</span>
                      <span className="text-slate-500 dark:text-slate-400">80% &ndash; 90%</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] font-semibold">
                      <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-400" /> At Risk</span>
                      <span className="text-slate-500 dark:text-slate-400">Below 80%</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-xl">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <p className="text-[10px] font-semibold text-amber-700">Changes to thresholds apply retroactively to all analytics and dashboard views.</p>
              </div>
            </div>
          )}

          {/* ────────────── USER ROLES ────────────── */}
          {activeTab === 'roles' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">User Management & Roles</h3>
                <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mt-0.5">Manage user access levels and role-based permissions.</p>
              </div>

              {/* Role Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Admin Role */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#2F6798]/10 flex items-center justify-center">
                        <Shield className="w-4 h-4 text-[#2F6798]" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">Admin</h4>
                        <span className="inline-flex px-2 py-0.5 rounded-full bg-[#2F6798]/10 text-[#2F6798] text-[9px] font-bold border border-[#2F6798]/20 mt-0.5">FULL ACCESS</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-3">Full system access to all modules and configuration.</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {['Dashboard', 'Trainees', 'Trainers', 'Analytics Trends', 'AI Insights', 'System Settings', 'Notifications', 'Integrations'].map((perm) => (
                      <div key={perm} className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                        <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                        {perm}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Employee Role */}
                <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                        <Users className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">Employee</h4>
                        <span className="inline-flex px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[9px] font-bold border border-slate-200 dark:border-slate-600 mt-0.5">STANDARD ACCESS</span>
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-3">Limited operational access to training and view modules.</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { label: 'Dashboard', enabled: true },
                      { label: 'Trainees', enabled: true },
                      { label: 'Trainers', enabled: true },
                      { label: 'Analytics Trends', enabled: true },
                      { label: 'AI Insights', enabled: false },
                      { label: 'System Settings', enabled: false },
                      { label: 'Notifications', enabled: true },
                      { label: 'Integrations', enabled: false },
                    ].map((perm) => (
                      <div key={perm.label} className={`flex items-center gap-1.5 text-[10px] font-semibold ${perm.enabled ? 'text-slate-600 dark:text-slate-400' : 'text-slate-300 dark:text-slate-600'}`}>
                        {perm.enabled ? (
                          <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                        ) : (
                          <X className="w-3 h-3 text-slate-300 shrink-0" />
                        )}
                        {perm.label}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* User Table */}
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-700/40">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">System Users</h4>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-700">
                  {users.map((user) => (
                    <div key={user.id} className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center gap-3 bg-white dark:bg-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-[#2F6798]/10 text-[#2F6798] flex items-center justify-center text-[10px] font-bold shrink-0">
                          {user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{user.name}</p>
                          <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="relative">
                          <select
                            value={user.role}
                            onChange={(e) => updateUserRole(user.id, e.target.value)}
                            className={`pl-2.5 pr-8 py-1.5 text-[10px] font-bold rounded-lg border appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#2F6798]/30 ${
                              user.role === 'ADMIN' ? 'bg-[#2F6798]/10 text-[#2F6798] border-[#2F6798]/20' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600'
                            }`}
                          >
                            <option value="ADMIN">ADMIN</option>
                            <option value="EMPLOYEE">EMPLOYEE</option>
                          </select>
                          <ChevronDown className="w-3 h-3 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-current opacity-50" />
                        </div>
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[9px] font-bold border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Active
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ────────────── INTEGRATIONS ────────────── */}
          {activeTab === 'integrations' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Data Sync & Integrations</h3>
                <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mt-0.5">Manage external system connections and data feeds.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {integrations.map((integration) => {
                  const isConnected = integration.status === 'connected';
                  return (
                    <div key={integration.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5 hover:border-slate-300 dark:hover:border-slate-600 transition-colors">
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isConnected ? 'bg-emerald-50 dark:bg-emerald-900/20' : 'bg-slate-100 dark:bg-slate-700'}`}>
                            <integration.icon className={`w-5 h-5 ${isConnected ? 'text-emerald-600' : 'text-slate-400 dark:text-slate-500'}`} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800 dark:text-slate-100">{integration.name}</p>
                            <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">{integration.purpose}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mb-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-bold border ${
                          isConnected ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-600'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                          {isConnected ? 'Connected' : 'Disconnected'}
                        </span>
                      </div>
                      {integration.lastSync ? (
                        <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 mb-4">
                          Last synchronized: <span className="font-semibold text-slate-700 dark:text-slate-300">{integration.lastSync}</span>
                        </p>
                      ) : (
                        <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mb-4 italic">Never synchronized</p>
                      )}
                      <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                        <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[10px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                          <Settings className="w-3 h-3" />
                          Configure
                        </button>
                        {isConnected && (
                          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[10px] font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                            <RefreshCw className="w-3 h-3" />
                            Sync Now
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          </>
          )}
        </div>
      </div>

      {/* ────────────── RESET CONFIRMATION DIALOG ────────────── */}
      {showResetDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4" role="dialog" aria-modal="true" aria-label="Reset settings confirmation">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50">Reset Settings?</h3>
              <button onClick={() => setShowResetDialog(false)} className="p-1 rounded-lg text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              </div>
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400 leading-relaxed">
                This will restore all configurable settings to their default values. Your current customizations will be lost.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                onClick={() => setShowResetDialog(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmReset}
                className="px-4 py-2 rounded-xl bg-[#2F6798] text-white text-xs font-bold hover:bg-[#24527a] transition-colors"
              >
                Reset Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
