'use client';

import { useState, useCallback, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Settings,
  Bell,
  Save,
  RotateCcw,
  X,
  AlertTriangle,
  Monitor,
  Sun,
  Moon,
  CheckCircle2,
  Loader2,
  User,
  FileText,
  ShieldCheck,
  Camera,
  Upload,
  Trash2,
  Phone,
  MapPin,
  CreditCard,
  Tag,
  Crop,
  Check,
  ZoomIn,
  ZoomOut,
  Move,
  Sparkles,
  Plus,
  Minus
} from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import { useRole } from '@/components/providers/RoleProvider';
import { uploadAvatar, deleteAvatar } from '@/lib/actions/avatar';
import { useToast } from '@/components/CustomToast';

type SettingsTab = 'profile' | 'notifications' | 'general';

function SettingsContent() {
  const { theme: globalTheme, setTheme: setGlobalTheme } = useTheme();
  const { userName, email: userEmail, userMeta } = useRole();
  const toast = useToast();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as SettingsTab) || 'profile';
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);

  useEffect(() => {
    const tabParam = searchParams.get('tab') as SettingsTab;
    if (tabParam && ['profile', 'notifications', 'general'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);
  const [isHydrating, setIsHydrating] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  
  // Avatar & Crop Modal State
  const [showAvatarDropdown, setShowAvatarDropdown] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [baseDimensions, setBaseDimensions] = useState<{ width: number; height: number }>({ width: 260, height: 260 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [savingAvatar, setSavingAvatar] = useState(false);

  const avatarDropdownRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success', title?: string) => {
    if (type === 'success') toast.success(message, title || 'Success');
    else toast.error(message, title || 'Error');
  };

  const [preferences, setPreferences] = useState({
    theme: 'light',
    timezone: 'Asia/Manila',
    dateFormat: 'MM/DD/YYYY',
  });

  const profile = {
    firstName: userMeta?.firstName || (userName ? userName.trim().split(/\s+/).slice(0, -1).join(' ') || userName.trim().split(/\s+/)[0] : 'N/A'),
    middleName: userMeta?.middleName || 'N/A',
    lastName: userMeta?.lastName || (userName && userName.trim().split(/\s+/).length > 1 ? userName.trim().split(/\s+/).slice(-1)[0] : 'N/A'),
    suffix: userMeta?.suffix || 'N/A',
    employeeId: userMeta?.employeeId || 'N/A',
    systemRole: userMeta?.systemRole || 'N/A',
    mobileNo: userMeta?.mobileNo || 'N/A',
    homeAddress: userMeta?.homeAddress || 'N/A'
  };

  const [notifications, setNotifications] = useState({
    performanceAlerts: true,
    trainingUpdates: true,
    deliveryInApp: true,
    deliveryEmail: false,
  });

  // Load avatar from localStorage on mount
  useEffect(() => {
    const savedAvatar = localStorage.getItem('user_avatar_url');
    if (savedAvatar) {
      setAvatarUrl(savedAvatar);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setIsHydrating(false), 800);
    return () => clearTimeout(timer);
  }, []);

  // Close avatar dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (avatarDropdownRef.current && !avatarDropdownRef.current.contains(event.target as Node)) {
        setShowAvatarDropdown(false);
      }
    }
    if (showAvatarDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAvatarDropdown]);

  const markUnsaved = useCallback(() => {
    setHasUnsavedChanges(true);
    setShowSaved(false);
  }, []);

  const toggleNotification = (key: keyof typeof notifications) => {
    setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
    markUnsaved();
  };

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      setShowSaved(true);
      setHasUnsavedChanges(false);
      showToast('Settings saved successfully.', 'success');
      setTimeout(() => setShowSaved(false), 3000);
    }, 800);
  };

  const handleReset = () => {
    setShowResetDialog(true);
  };

  const confirmReset = () => {
    setPreferences({ theme: 'light', timezone: 'Asia/Manila', dateFormat: 'MM/DD/YYYY' });
    setNotifications({
      performanceAlerts: true,
      trainingUpdates: true,
      deliveryInApp: true,
      deliveryEmail: false,
    });
    setHasUnsavedChanges(false);
    setShowResetDialog(false);
    setShowSaved(false);
    showToast('Settings reset to default.', 'success');
  };

  // Avatar file selection handler
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Please select a valid image file', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const nw = img.naturalWidth || 500;
        const nh = img.naturalHeight || 500;
        
        // Fit so the smaller side matches the 250px crop circle at 100% zoom
        let bw = 250;
        let bh = 250;
        if (nw >= nh) {
          bh = 250;
          bw = Math.round(250 * (nw / nh));
        } else {
          bw = 250;
          bh = Math.round(250 * (nh / nw));
        }

        setBaseDimensions({ width: bw, height: bh });
        setRawImageSrc(reader.result as string);
        setZoom(1);
        setPan({ x: 0, y: 0 });
        setShowCropModal(true);
        setShowAvatarDropdown(false);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);

    // Reset input value so same file can be chosen again if desired
    e.target.value = '';
  };

  // Mouse / Touch drag handlers for cropping
  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX - pan.x, y: e.touches[0].clientY - pan.y });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    setPan({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Perform crop on canvas and upload to Supabase storage
  const handleSaveCrop = async () => {
    if (!rawImageSrc || !imageRef.current) return;

    try {
      setSavingAvatar(true);

      const canvas = document.createElement('canvas');
      const size = 512; // High-res 1:1 square
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');

      if (!ctx) throw new Error('Could not get canvas context');

      const img = imageRef.current;
      const naturalWidth = img.naturalWidth;
      const naturalHeight = img.naturalHeight;

      // Crop box diameter inside the UI is 260px
      const cropBoxSize = 260;
      
      // Calculate how the image is rendered in the viewport
      const displayedWidth = baseDimensions.width * zoom;
      const displayedHeight = baseDimensions.height * zoom;

      // Ratio from displayed coordinates to natural image pixels
      const scaleX = naturalWidth / displayedWidth;
      const scaleY = naturalHeight / displayedHeight;

      // Center offset of crop box inside container
      const centerOffsetX = displayedWidth / 2 + pan.x;
      const centerOffsetY = displayedHeight / 2 + pan.y;

      // Top-left of crop box relative to natural image
      const srcX = (centerOffsetX - cropBoxSize / 2) * scaleX;
      const srcY = (centerOffsetY - cropBoxSize / 2) * scaleY;
      const srcWidth = cropBoxSize * scaleX;
      const srcHeight = cropBoxSize * scaleY;

      // Draw onto 512x512 canvas
      ctx.drawImage(img, srcX, srcY, srcWidth, srcHeight, 0, 0, size, size);

      // Convert to blob
      canvas.toBlob(async (blob) => {
        if (!blob) {
          setSavingAvatar(false);
          showToast('Failed to process cropped photo', 'error');
          return;
        }

        const formData = new FormData();
        formData.append('file', blob, 'avatar.png');
        formData.append('employeeId', userMeta?.employeeId || profile.employeeId || '1597');
        formData.append('email', userEmail || '');
        formData.append('name', userName || '');

        const res = await uploadAvatar(formData);

        setSavingAvatar(false);

        if (res.success && res.url) {
          setAvatarUrl(res.url);
          localStorage.setItem('user_avatar_url', res.url);
          window.dispatchEvent(new CustomEvent('avatar-updated', { detail: { url: res.url } }));
          setShowCropModal(false);
          setRawImageSrc(null);
          showToast('Profile photo saved successfully!', 'success');
        } else {
          showToast(res.error || 'Failed to upload photo to storage', 'error');
        }
      }, 'image/png', 0.95);

    } catch (err: any) {
      setSavingAvatar(false);
      showToast(err.message || 'Error cropping photo', 'error');
    }
  };

  // Remove photo handler
  const handleRemovePhoto = async () => {
    setShowAvatarDropdown(false);
    if (avatarUrl) {
      await deleteAvatar(avatarUrl, userMeta?.employeeId || profile.employeeId, userEmail || '');
    }
    setAvatarUrl(null);
    localStorage.removeItem('user_avatar_url');
    window.dispatchEvent(new CustomEvent('avatar-updated', { detail: { url: null } }));
    showToast('Profile photo removed.', 'success');
  };

  const tabs: { key: SettingsTab; label: string; icon: any }[] = [
    { key: 'profile', label: 'Profile Information', icon: User },
    { key: 'notifications', label: 'Notification', icon: Bell },
    { key: 'general', label: 'Preferences', icon: Settings },
  ];

  const Toggle = ({ enabled, onToggle, label }: { enabled: boolean; onToggle: () => void; label?: string }) => (
    <button
      type="button"
      onClick={onToggle}
      role="switch"
      aria-checked={enabled}
      aria-label={label}
      className={`relative inline-flex h-[22px] w-[40px] shrink-0 rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2F6798]/40 cursor-pointer ${enabled ? 'bg-[#2F6798]' : 'bg-slate-200 dark:bg-slate-600'}`}
    >
      <span className={`inline-block h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-transform duration-200 mt-[2px] ${enabled ? 'translate-x-[20px]' : 'translate-x-[2px]'}`} />
    </button>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 relative">
      {/* Hidden File Input */}
      <input
        id="avatar-file-input"
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">System Settings</h2>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5 max-w-lg">Configure your personal profile details, notification preferences, and application display settings.</p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          {hasUnsavedChanges && !showSaved && (
            <span className="text-[10px] font-semibold text-amber-600 mr-1 hidden sm:inline">Unsaved changes</span>
          )}
          <button
            onClick={handleReset}
            disabled={isHydrating || saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 hover:border-slate-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isHydrating ? <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" /> : <RotateCcw className="w-3.5 h-3.5" />}
            Reset to Default
          </button>
          <button
            onClick={handleSave}
            disabled={isHydrating || saving}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[#2F6798] hover:bg-[#24527a] text-white font-bold text-xs shadow-xs transition-all disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
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

      {/* Success Toast Banner */}
      {showSaved && (
        <div className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800/50 rounded-xl text-xs font-semibold text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          Settings saved successfully.
        </div>
      )}

      {/* Navigation Tabs - Profile, Notifications, General */}
      <div className="flex items-center gap-1.5 border-b border-slate-200 dark:border-slate-700/80 pb-px">
          {[
            { id: 'profile', label: 'Profile', icon: User },
            { id: 'notifications', label: 'Notifications', icon: Bell },
            { id: 'general', label: 'General', icon: Settings },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-slate-800 text-[#2F6798] shadow-xs border border-slate-200/80 dark:border-slate-700'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100/60 dark:hover:bg-slate-800/50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Dynamic Tab Body */}
        <div className="space-y-6">
          {isHydrating ? (
            <div className="space-y-6 animate-pulse">
              <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
                <div className="h-10 w-full max-w-xs bg-slate-200 dark:bg-slate-700 rounded-xl mb-4" />
              </div>
            </div>
          ) : (
            <>
              {/* ────────────── PROFILE ────────────── */}
              {activeTab === 'profile' && (
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 shadow-sm border border-slate-200 dark:border-slate-700 space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight">
                        Profile Information
                      </h3>
                      <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
                        View your verified company profile details, contact information, and system credentials.
                      </p>
                    </div>
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 text-xs font-bold shrink-0 whitespace-nowrap self-start sm:self-center border border-slate-200/60 dark:border-slate-600/60">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#2F6798]" />
                      Company Managed
                    </div>
                  </div>
                  
                  {/* Hero Card */}
                  <div className="bg-[#2F6798] rounded-[24px] p-5 max-w-[95%] mx-auto shadow-xl relative z-10 flex flex-col md:flex-row items-center gap-8">
                    {/* Background decorations */}
                    <div className="absolute inset-0 rounded-[24px] overflow-hidden pointer-events-none">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
                      <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-2xl translate-y-1/3 -translate-x-1/4"></div>
                    </div>
                    
                    <div className="relative shrink-0 z-30" ref={avatarDropdownRef}>
                      <div className="w-32 h-32 rounded-full border-[4px] border-white/20 bg-white/10 p-2 backdrop-blur-sm relative">
                        <div className="w-full h-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden flex items-center justify-center">
                          {avatarUrl ? (
                            <img src={avatarUrl} alt="User Avatar" className="w-full h-full object-cover rounded-full" />
                          ) : (
                            <User className="w-14 h-14 text-slate-400 dark:text-slate-300" />
                          )}
                        </div>
                        {/* Camera Button */}
                        <button
                          type="button"
                          onClick={() => setShowAvatarDropdown(!showAvatarDropdown)}
                          className="absolute bottom-1 right-1 w-8 h-8 bg-slate-800 hover:bg-slate-700 text-white rounded-full flex items-center justify-center border-2 border-white shadow-md transition-colors z-20 cursor-pointer"
                          title="Change profile photo"
                        >
                          <Camera className="w-4 h-4" />
                        </button>
                        
                        {/* Dropdown Menu - Compact & Always Visible */}
                        {showAvatarDropdown && (
                          <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-40 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 p-1 z-50 animate-in fade-in zoom-in-95 duration-150">
                            <label
                              htmlFor="avatar-file-input"
                              onClick={() => setShowAvatarDropdown(false)}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700/50 rounded-lg transition-colors cursor-pointer text-left"
                            >
                              <Upload className="w-3.5 h-3.5 text-[#2F6798]" />
                              <span>Upload Photo</span>
                            </label>
                            <button
                              type="button"
                              onClick={handleRemovePhoto}
                              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors cursor-pointer text-left"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Remove Photo</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="relative text-white flex-1 text-center md:text-left">
                      <h2 className="text-xl md:text-2xl font-black tracking-tight mb-1.5">{userName || 'N/A'}</h2>
                      <div className="mb-2">
                        <span className="inline-block px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white font-extrabold text-[11px] uppercase tracking-wider border border-white/25 shadow-2xs">
                          {userMeta.primaryTask || 'N/A'}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-white/80 mb-3">{userEmail || 'N/A'}</p>
                      
                      <div className="bg-white/10 rounded-2xl p-4 backdrop-blur-md border border-white/15 shadow-sm mt-3">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 divide-y sm:divide-y-0 sm:divide-x divide-white/15">
                          <div className="pr-2">
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-0.5">Employee ID</p>
                            <p className="text-xs font-bold text-white">{userMeta.employeeId || 'N/A'}</p>
                          </div>
                          <div className="sm:pl-3 pr-2 pt-2 sm:pt-0">
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-0.5">Start Date</p>
                            <p className="text-xs font-bold text-white">{userMeta.startDate || 'N/A'}</p>
                          </div>
                          <div className="sm:pl-3 pr-2 pt-2 sm:pt-0">
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-0.5">Accounts</p>
                            <p className="text-xs font-bold text-white truncate" title={userMeta.accounts || 'N/A'}>{userMeta.accounts || 'N/A'}</p>
                          </div>
                          <div className="sm:pl-3 pt-2 sm:pt-0">
                            <p className="text-[10px] font-black uppercase tracking-widest text-white/60 mb-0.5">Primary Task</p>
                            <p className="text-xs font-bold text-white truncate" title={userMeta.primaryTask || 'N/A'}>{userMeta.primaryTask || 'N/A'}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Form - Read-Only Company Details with Matching Icons & Label Color */}
                  <div className="mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 dark:text-slate-400 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400 dark:text-slate-400" />
                          First Name
                        </label>
                        <input type="text" readOnly value={profile.firstName} className="w-full px-4 py-3 bg-[#f1f1f1] dark:bg-slate-700/50 border-none rounded-xl text-sm font-medium text-slate-800 dark:text-slate-200 cursor-default select-none pointer-events-none" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 dark:text-slate-400 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400 dark:text-slate-400" />
                          Middle Name
                        </label>
                        <input type="text" readOnly value={profile.middleName} className="w-full px-4 py-3 bg-[#f1f1f1] dark:bg-slate-700/50 border-none rounded-xl text-sm font-medium text-slate-800 dark:text-slate-200 cursor-default select-none pointer-events-none" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 dark:text-slate-400 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400 dark:text-slate-400" />
                          Last Name
                        </label>
                        <input type="text" readOnly value={profile.lastName} className="w-full px-4 py-3 bg-[#f1f1f1] dark:bg-slate-700/50 border-none rounded-xl text-sm font-medium text-slate-800 dark:text-slate-200 cursor-default select-none pointer-events-none" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 dark:text-slate-400 flex items-center gap-1.5">
                          <Tag className="w-3.5 h-3.5 text-slate-400 dark:text-slate-400" />
                          Suffix Name
                        </label>
                        <input type="text" readOnly value={profile.suffix} className="w-full px-4 py-3 bg-[#f1f1f1] dark:bg-slate-700/50 border-none rounded-xl text-sm font-medium text-slate-800 dark:text-slate-200 cursor-default select-none pointer-events-none" />
                      </div>
                      
                      {/* Read-Only Displays */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 dark:text-slate-400 flex items-center gap-1.5">
                          <CreditCard className="w-3.5 h-3.5 text-slate-400 dark:text-slate-400" />
                          Employee ID
                        </label>
                        <input type="text" readOnly value={userMeta.employeeId || profile.employeeId} className="w-full px-4 py-3 bg-[#f1f1f1] dark:bg-slate-700/50 border-none rounded-xl text-sm font-medium text-slate-800 dark:text-slate-200 cursor-default select-none pointer-events-none" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 dark:text-slate-400 flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-slate-400 dark:text-slate-400" />
                          System Role
                        </label>
                        <input type="text" readOnly value={profile.systemRole} className="w-full px-4 py-3 bg-[#f1f1f1] dark:bg-slate-700/50 border-none rounded-xl text-sm font-medium text-slate-800 dark:text-slate-200 cursor-default select-none pointer-events-none" />
                      </div>

                      {/* Contact Info */}
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 dark:text-slate-400 flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400 dark:text-slate-400" />
                          Mobile No.
                        </label>
                        <input type="text" readOnly value={profile.mobileNo} className="w-full px-4 py-3 bg-[#f1f1f1] dark:bg-slate-700/50 border-none rounded-xl text-sm font-medium text-slate-800 dark:text-slate-200 cursor-default select-none pointer-events-none" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 dark:text-slate-400 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 dark:text-slate-400" />
                          Home Address
                        </label>
                        <input type="text" readOnly value={profile.homeAddress} className="w-full px-4 py-3 bg-[#f1f1f1] dark:bg-slate-700/50 border-none rounded-xl text-sm font-medium text-slate-800 dark:text-slate-200 cursor-default select-none pointer-events-none" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ────────────── NOTIFICATIONS ────────────── */}
              {activeTab === 'notifications' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div>
                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Notification Preferences</h3>
                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">Manage which critical events notify you and how you receive them.</p>
                  </div>

                  {/* Core Alert Subscriptions */}
                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-xs">
                    <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-100 dark:border-slate-700/60">
                      <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">Alert Triggers</h4>
                        <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500">Essential operational and performance notifications.</p>
                      </div>
                    </div>
                    
                    <div className="space-y-0 divide-y divide-slate-100 dark:divide-slate-700/60">
                      <div className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-100">Performance & KPI Alerts</p>
                          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                            Notify when attrition, attendance, or reliability fall below target thresholds.
                          </p>
                        </div>
                        <Toggle 
                          enabled={notifications.performanceAlerts} 
                          onToggle={() => toggleNotification('performanceAlerts')} 
                          label="Toggle performance alerts" 
                        />
                      </div>

                      <div className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-800 dark:text-slate-100">Batch & Trainer Updates</p>
                          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                            Alert when new batches are assigned, trainer rosters change, or status updates occur.
                          </p>
                        </div>
                        <Toggle 
                          enabled={notifications.trainingUpdates} 
                          onToggle={() => toggleNotification('trainingUpdates')} 
                          label="Toggle training updates" 
                        />
                      </div>
                    </div>
                  </div>

                  {/* Delivery Channels */}
                  <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-6 shadow-xs">
                    <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-slate-100 dark:border-slate-700/60">
                      <div className="w-8 h-8 rounded-xl bg-[#2F6798]/10 flex items-center justify-center">
                        <Bell className="w-4 h-4 text-[#2F6798]" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">Delivery Channels</h4>
                        <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500">Choose where alerts are delivered.</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-4 p-3.5 bg-slate-50 dark:bg-slate-700/40 rounded-xl">
                        <div className="flex items-center gap-3">
                          <Bell className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                          <div>
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block">In-App Notifications</span>
                            <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">Display banner badges and alerts within the application</span>
                          </div>
                        </div>
                        <Toggle enabled={notifications.deliveryInApp} onToggle={() => toggleNotification('deliveryInApp')} label="Toggle in-app notifications" />
                      </div>
                      
                      <div className="flex items-center justify-between gap-4 p-3.5 bg-slate-50 dark:bg-slate-700/40 rounded-xl">
                        <div className="flex items-center gap-3">
                          <FileText className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                          <div>
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-200 block">Email Digest & Alerts</span>
                            <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">Send critical summaries directly to your registered email</span>
                          </div>
                        </div>
                        <Toggle enabled={notifications.deliveryEmail} onToggle={() => toggleNotification('deliveryEmail')} label="Toggle email notifications" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ────────────── GENERAL / PREFERENCES ────────────── */}
              {activeTab === 'general' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div>
                    <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Preferences</h3>
                    <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500 mt-0.5">Customize your interface theme.</p>
                  </div>

                  {/* Theme Mode */}
                  <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-7 h-7 rounded-lg bg-[#2F6798]/10 flex items-center justify-center">
                        <Monitor className="w-3.5 h-3.5 text-[#2F6798]" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-100">Theme Preference</h4>
                        <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500">Select how the interface should appear on your device.</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3 max-w-md pt-2">
                      {[
                        { value: 'light', label: 'Light', icon: Sun },
                        { value: 'dark', label: 'Dark', icon: Moon },
                        { value: 'system', label: 'System', icon: Monitor },
                      ].map((item) => (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => {
                            setPreferences(prev => ({ ...prev, theme: item.value }));
                            setGlobalTheme(item.value as any);
                            markUnsaved();
                          }}
                          className={`flex flex-col items-center gap-2 p-3.5 rounded-xl border-2 transition-all cursor-pointer ${
                            preferences.theme === item.value
                              ? 'border-[#2F6798] bg-[#2F6798]/5 text-[#2F6798] font-bold shadow-xs'
                              : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-600 dark:text-slate-400'
                          }`}
                        >
                          <item.icon className="w-5 h-5" />
                          <span className="text-xs">{item.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

      {/* ────────────── RESET CONFIRMATION DIALOG ────────────── */}
      {showResetDialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" role="dialog" aria-modal="true" aria-label="Reset settings confirmation">
          <div className="bg-white dark:bg-slate-800 rounded-[28px] p-6 max-w-[320px] w-full shadow-2xl relative">
            {/* Close Button */}
            <button onClick={() => setShowResetDialog(false)} className="absolute top-4 right-4 p-2 rounded-full text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" aria-label="Close">
              <X className="w-4 h-4" />
            </button>
            
            {/* Icon */}
            <div className="w-16 h-16 mx-auto bg-[#2F6798] text-white rounded-full flex items-center justify-center shadow-lg shadow-[#2F6798]/30 mt-4 mb-5">
              <AlertTriangle className="w-8 h-8" />
            </div>
            
            {/* Text Content */}
            <div className="text-center space-y-1.5 mb-8">
              <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Reset Settings?</h3>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed px-2 mt-2">
                This will restore all configurable settings to their default values. Your current customizations will be lost.
              </p>
            </div>
            
            {/* Actions */}
            <div className="flex justify-center gap-3">
              <button
                onClick={() => setShowResetDialog(false)}
                className="px-6 py-2.5 rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-sm font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmReset}
                className="px-6 py-2.5 rounded-full bg-[#2F6798] hover:bg-[#24527a] text-white text-sm font-bold shadow-md shadow-[#2F6798]/20 transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ────────────── CROP PROFILE PHOTO MODAL ────────────── */}
      {showCropModal && rawImageSrc && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 dark:bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200" role="dialog" aria-modal="true" aria-label="Crop Profile Photo">
          <div className="bg-white dark:bg-slate-900 rounded-[28px] max-w-[580px] w-full shadow-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 flex flex-col space-y-4 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-0.5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#2F6798]/10 dark:bg-[#2F6798]/20 text-[#2F6798] flex items-center justify-center shrink-0 border border-[#2F6798]/20 shadow-xs">
                  <Crop className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight leading-none mb-1">Crop Profile Photo</h3>
                  <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500 leading-none">Drag to reposition and zoom to fit your avatar</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowCropModal(false);
                  setRawImageSrc(null);
                }}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Framed Interactive Crop Viewport with Neutral Gray Overlay */}
            <div
              className="relative w-full h-[270px] bg-slate-800/90 dark:bg-slate-900 rounded-2xl overflow-hidden select-none border border-slate-700/60 shadow-inner flex items-center justify-center cursor-grab active:cursor-grabbing"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
            >
              {/* Floating Helper Tag */}
              <div className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded-full bg-slate-900/60 backdrop-blur-md text-[10px] font-semibold text-white/90 border border-white/10 flex items-center gap-1.5 pointer-events-none">
                <Move className="w-3 h-3 text-[#2F6798]" />
                <span>Drag to pan</span>
              </div>

              {/* Reset View Button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setPan({ x: 0, y: 0 });
                  setZoom(1);
                }}
                className="absolute top-3 right-3 z-10 px-2.5 py-1 rounded-full bg-slate-900/60 backdrop-blur-md text-[10px] font-semibold text-white/80 hover:text-white hover:bg-slate-900/80 border border-white/10 transition-all flex items-center gap-1 cursor-pointer"
                title="Reset View"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>

              {/* Image Preview */}
              <img
                ref={imageRef}
                src={rawImageSrc}
                alt="Crop Preview"
                draggable={false}
                className="max-w-none max-h-none select-none pointer-events-none"
                style={{
                  width: `${baseDimensions.width * zoom}px`,
                  height: `${baseDimensions.height * zoom}px`,
                  transform: `translate(${pan.x}px, ${pan.y}px)`,
                  objectFit: 'contain'
                }}
              />

              {/* Circular Cutout Overlay with Neutral Gray Shadow & Grid Lines */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="w-[250px] h-[250px] rounded-full border-2 border-white/95 shadow-[0_0_0_9999px_rgba(51,65,85,0.7)] relative overflow-hidden ring-1 ring-slate-900/30">
                  {/* 3x3 Rule-of-Thirds Grid */}
                  <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-25">
                    <div className="border-r border-b border-white" />
                    <div className="border-r border-b border-white" />
                    <div className="border-b border-white" />
                    <div className="border-r border-b border-white" />
                    <div className="border-r border-b border-white" />
                    <div className="border-b border-white" />
                    <div className="border-r border-white" />
                    <div className="border-r border-white" />
                    <div />
                  </div>
                </div>
              </div>
            </div>

            {/* Zoom Slider Controls */}
            <div className="space-y-1.5 pt-0.5">
              <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
                <span className="flex items-center gap-1.5">
                  <ZoomIn className="w-3.5 h-3.5 text-[#2F6798]" />
                  Zoom Level
                </span>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                  {Math.round(zoom * 100)}%
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setZoom(prev => Math.max(1, parseFloat((prev - 0.1).toFixed(2))))}
                  className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                  title="Zoom Out"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.01"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-[#2F6798]"
                />
                <button
                  type="button"
                  onClick={() => setZoom(prev => Math.min(3, parseFloat((prev + 0.1).toFixed(2))))}
                  className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                  title="Zoom In"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Informative Hint Pill */}
            <div className="flex items-center justify-center gap-1.5 py-0.5 px-3 rounded-full bg-slate-50 dark:bg-slate-800/60 text-[11px] font-medium text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-800/80 w-fit mx-auto">
              <Sparkles className="w-3 h-3 text-[#2F6798]" />
              <span>Saved as 1:1 high-resolution avatar photo</span>
            </div>

            {/* Action Buttons Footer */}
            <div className="flex items-center justify-end gap-3 pt-1 border-t border-slate-100 dark:border-slate-800/80">
              <button
                type="button"
                onClick={() => {
                  setShowCropModal(false);
                  setRawImageSrc(null);
                }}
                disabled={savingAvatar}
                className="px-5 py-2.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCrop}
                disabled={savingAvatar}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#2F6798] hover:bg-[#24527a] text-white font-bold text-xs shadow-lg shadow-[#2F6798]/25 hover:shadow-xl transition-all cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {savingAvatar ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving Photo...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Save Photo
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[400px] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#2F6798] animate-spin" />
      </div>
    }>
      <SettingsContent />
    </Suspense>
  );
}
