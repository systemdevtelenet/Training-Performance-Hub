'use client';

import { useState, useMemo, useEffect, useDeferredValue } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  ChevronDown,
  RefreshCw,
  Download,
  Printer,
  Users,
  UserCheck,
  UserX,
  UserCog,
  Eye,
  Plus,
  Edit2,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Building2,
  Calendar,
  Mail,
  Link as LinkIcon,
  Table as TableIcon
} from 'lucide-react';
import { useRole } from '@/components/providers/RoleProvider';
import { useToast } from '@/components/CustomToast';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { EmployeeDetailDrawer } from '@/components/EmployeeDetailDrawer';
import { EmployeeFormDrawer } from '@/components/EmployeeFormDrawer';
import PageLoading from '@/components/PageLoading';
import { cn } from '@/lib/utils';

export type EmployeeRecord = {
  id: number;
  employee_code: string;
  employee_name: string;
  employee_email: string | null;
  status_id: number;
  status_name?: string;
  role_id?: number;
  role_name?: string;
  category?: string;
  is_primary_trainer?: boolean;
  hire_date: string | null;
  vici_link: string | null;
  avatar_url?: string | null;
  assigned_accounts?: string;
  account_ids?: number[];
};

export default function EmployeesClient({
  initialEmployees = [],
  accounts = [],
  statuses = [],
  roles = []
}: {
  initialEmployees?: EmployeeRecord[];
  accounts?: any[];
  statuses?: any[];
  roles?: any[];
}) {
  const { role, actualRole, avatarUrl, userName, email: userEmail } = useRole();
  const toast = useToast();
  const currentRole = role || actualRole;
  const isAdmin = ['SUPER_ADMIN', 'HOT_ADMIN', 'QAS_ADMIN', 'VIEW_ADMIN'].includes(currentRole);
  const canManage = ['SUPER_ADMIN', 'HOT_ADMIN', 'QAS_ADMIN'].includes(currentRole);

  const [employees, setEmployees] = useState<EmployeeRecord[]>(initialEmployees);
  const [rolesList, setRolesList] = useState<any[]>(roles);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedAccount, setSelectedAccount] = useState('All');

  // Sync search param from URL if navigated from Topbar
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const s = params.get('search');
      if (s) {
        setSearchQuery(s);
      }
      const cat = params.get('category') || params.get('role');
      if (cat) {
        setSelectedCategory(cat.toUpperCase());
      }
    }
  }, []);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modals & Drawers state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<EmployeeRecord | null>(null);
  const [deletingEmp, setDeletingEmp] = useState<EmployeeRecord | null>(null);
  const [viewingEmp, setViewingEmp] = useState<EmployeeRecord | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    employee_code: '',
    employee_name: '',
    employee_email: '',
    status_id: 1,
    role_id: 1,
    hire_date: '',
    vici_link: '',
    account_id: ''
  });

  const showToast = (msg: string, title?: string, type: 'success' | 'error' | 'info' = 'success') => {
    if (type === 'success') toast.success(msg, title || 'Success');
    else if (type === 'error') toast.error(msg, title || 'Error');
    else toast.info(msg, title || 'Info');
  };

  // Refresh data from server API
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/employees');
      const resData = await res.json();
      if (resData.success && resData.data) {
        setEmployees(resData.data);
        if (resData.roles) setRolesList(resData.roles);
        toast.success('Employees list refreshed', 'Refreshed');
      }
    } catch (e) {
      console.error('Error refreshing employees:', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (initialEmployees && initialEmployees.length > 0) {
      setEmployees(initialEmployees);
    } else {
      handleRefresh();
    }
    if (roles && roles.length > 0) {
      setRolesList(roles);
    }
  }, [initialEmployees, roles]);

  // Unique list of accounts from employees
  const availableAccounts = useMemo(() => {
    if (accounts && accounts.length > 0) {
      return ['All', ...accounts.map(a => a.account_name || a.account_code).filter(Boolean).sort()];
    }
    const set = new Set<string>();
    employees.forEach(e => {
      if (e.assigned_accounts && e.assigned_accounts !== 'Unassigned') {
        e.assigned_accounts.split(',').forEach(a => set.add(a.trim()));
      }
    });
    return ['All', ...Array.from(set).sort()];
  }, [accounts, employees]);

  const deferredSearchQuery = useDeferredValue(searchQuery);

  // Filtered employees dataset with primary Trainer prioritization
  const filteredEmployees = useMemo(() => {
    const list = employees.filter(e => {
      // Role / Category filter
      if (selectedCategory !== 'All') {
        const cat = (e.category || '').toUpperCase();
        const rName = (e.role_name || '').toUpperCase();
        if (selectedCategory === 'TRAINER') {
          if (cat !== 'TRAINER' && !rName.includes('TRAINER') && !rName.includes('COORDINATOR') && !rName.includes('HEAD OF TRAINING')) return false;
        } else if (selectedCategory === 'TRAINEE') {
          if (cat !== 'TRAINEE' && !rName.includes('TRAINEE')) return false;
        } else if (selectedCategory === 'ADMIN') {
          if (cat !== 'ADMIN' && !rName.includes('ADMIN') && !rName.includes('SUPERVISOR') && !rName.includes('HEAD OF TRAINING')) return false;
        } else if (selectedCategory === 'QA') {
          if (cat !== 'QA' && !rName.includes('QA') && !rName.includes('QUALITY')) return false;
        } else if (selectedCategory === 'TL') {
          if (cat !== 'TL' && !rName.includes('TL') && !rName.includes('LEADER') && !rName.includes('MANAGER')) return false;
        } else if (selectedCategory === 'AGENT') {
          if (cat !== 'AGENT' && !rName.includes('AGENT')) return false;
        }
      }

      // Status filter
      if (selectedStatus !== 'All') {
        const sName = (e.status_name || '').toLowerCase();
        if (selectedStatus.toLowerCase() === 'active' && e.status_id !== 1 && sName !== 'active') return false;
        if (selectedStatus.toLowerCase() === 'inactive' && e.status_id !== 2 && sName !== 'inactive') return false;
        if (selectedStatus.toLowerCase() === 'resigned' && e.status_id !== 3 && sName !== 'resigned') return false;
        if (selectedStatus.toLowerCase() === 'on leave' && e.status_id !== 4 && sName !== 'on leave') return false;
      }

      // Account filter
      if (selectedAccount !== 'All') {
        const assigned = (e.assigned_accounts || '').toLowerCase();
        if (!assigned.includes(selectedAccount.toLowerCase())) return false;
      }

      // Search query
      if (deferredSearchQuery.trim()) {
        const q = deferredSearchQuery.toLowerCase();
        const matchesName = (e.employee_name || '').toLowerCase().includes(q);
        const matchesCode = (e.employee_code || '').toLowerCase().includes(q);
        const matchesEmail = (e.employee_email || '').toLowerCase().includes(q);
        const matchesAcc = (e.assigned_accounts || '').toLowerCase().includes(q);
        const matchesRole = (e.role_name || '').toLowerCase().includes(q);
        const matchesCat = (e.category || '').toLowerCase().includes(q);
        if (!matchesName && !matchesCode && !matchesEmail && !matchesAcc && !matchesRole && !matchesCat) return false;
      }

      return true;
    });

    // Always sort Trainers to the top as the PRIMARY employees
    return list.sort((a, b) => {
      const aIsTrainer = a.is_primary_trainer || a.category === 'TRAINER' || (a.role_name || '').toLowerCase().includes('trainer');
      const bIsTrainer = b.is_primary_trainer || b.category === 'TRAINER' || (b.role_name || '').toLowerCase().includes('trainer');
      if (aIsTrainer && !bIsTrainer) return -1;
      if (!aIsTrainer && bIsTrainer) return 1;
      return 0;
    });
  }, [employees, selectedCategory, selectedStatus, selectedAccount, deferredSearchQuery]);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [deferredSearchQuery, selectedCategory, selectedStatus, selectedAccount]);

  // KPI Metrics
  const kpis = useMemo(() => {
    const total = employees.length;
    const trainersCount = employees.filter(e => e.category === 'TRAINER' || (e.role_name || '').toLowerCase().includes('trainer')).length;
    const traineesCount = employees.filter(e => e.category === 'TRAINEE' || (e.role_name || '').toLowerCase().includes('trainee')).length;
    const activeStaff = employees.filter(e => e.status_id === 1 || (e.status_name && e.status_name.toLowerCase() === 'active')).length;

    return { total, trainersCount, traineesCount, activeStaff };
  }, [employees]);

  // Pagination logic
  const totalPages = Math.ceil(filteredEmployees.length / pageSize) || 1;
  const paginatedEmployees = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredEmployees.slice(start, start + pageSize);
  }, [filteredEmployees, currentPage, pageSize]);

  // Add Employee Handler
  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) {
      alert('You do not have permission to add employees.');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const resData = await res.json();
      if (resData.success) {
        showToast('Employee created successfully!', 'Employee Created', 'success');
        setIsAddModalOpen(false);
        handleRefresh();
      } else {
        showToast(resData.error || 'Failed to create employee.', 'Creation Failed', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error creating employee.', 'Creation Error', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Edit Employee Handler
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmp || !canManage) return;
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/employees', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingEmp.id,
          ...formData
        })
      });
      const resData = await res.json();
      if (resData.success) {
        showToast('Employee updated successfully!', 'Employee Updated', 'success');
        setEditingEmp(null);
        handleRefresh();
      } else {
        showToast(resData.error || 'Failed to update employee.', 'Update Failed', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error updating employee.', 'Update Error', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Employee Handler
  const handleDeleteSubmit = async () => {
    if (!deletingEmp || !canManage) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/employees?id=${deletingEmp.id}`, {
        method: 'DELETE'
      });
      const resData = await res.json();
      if (resData.success) {
        setEmployees(prev => prev.filter(e => e.id !== deletingEmp.id));
        showToast('Employee record was deleted successfully.', 'Employee Deleted', 'success');
        setDeletingEmp(null);
      } else {
        showToast(resData.error || 'Failed to delete employee.', 'Delete Failed', 'error');
      }
    } catch (err: any) {
      showToast(err.message || 'Error deleting employee.', 'Delete Error', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Role badge with distinctive visual styling
  const renderRoleBadge = (roleId?: number, roleName?: string, category?: string) => {
    const name = roleName || (category === 'TRAINER' ? 'Trainer' : category === 'TRAINEE' ? 'Trainee' : roleId === 9 ? 'QA SUPERVISOR' : roleId === 5 ? 'Admin' : roleId === 2 ? 'QA' : roleId === 6 ? 'TL' : 'Agent');
    const upper = (name + ' ' + (category || '')).toUpperCase();
    
    if (upper.includes('TRAINER') || upper.includes('COORDINATOR') || upper.includes('HEAD OF TRAINING') || category === 'TRAINER') {
      return (
        <span className="px-3 py-1 rounded-full text-[10px] font-black border border-blue-300 text-[#1967D2] bg-blue-50 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 shadow-2xs">
          {name}
        </span>
      );
    }
    if (upper.includes('TRAINEE') || category === 'TRAINEE') {
      return (
        <span className="px-3 py-1 rounded-full text-[10px] font-black border border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 shadow-2xs">
          {name}
        </span>
      );
    }
    if (upper.includes('SUPERVISOR') || upper.includes('ADMIN') || category === 'ADMIN') {
      return (
        <span className="px-3 py-1 rounded-full text-[10px] font-bold border border-purple-300 text-purple-700 bg-purple-50 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800 shadow-2xs">
          {name}
        </span>
      );
    }
    if (upper.includes('QA') || upper.includes('QUALITY') || category === 'QA') {
      return (
        <span className="px-3 py-1 rounded-full text-[10px] font-bold border border-teal-300 text-teal-700 bg-teal-50 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800 shadow-2xs">
          {name}
        </span>
      );
    }
    if (upper.includes('TL') || upper.includes('MANAGER') || category === 'TL') {
      return (
        <span className="px-3 py-1 rounded-full text-[10px] font-bold border border-sky-300 text-sky-700 bg-sky-50 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800 shadow-2xs">
          {name}
        </span>
      );
    }
    return (
      <span className="px-3 py-1 rounded-full text-[10px] font-bold border border-slate-200 text-slate-700 bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700 shadow-2xs">
        {name}
      </span>
    );
  };

  // Pill badge matching Trainees table design
  const renderStatusBadge = (statusId: number, statusName?: string) => {
    const s = (statusName || (statusId === 1 ? 'ACTIVE' : statusId === 2 ? 'INACTIVE' : 'ACTIVE')).toUpperCase();
    if (s === 'ACTIVE') {
      return (
        <span className="px-3 py-1 rounded-full text-[10px] font-bold border border-emerald-300 text-emerald-700 bg-emerald-50 shadow-sm">
          ACTIVE
        </span>
      );
    }
    if (s === 'INACTIVE' || s === 'RESIGNED') {
      return (
        <span className="px-3 py-1 rounded-full text-[10px] font-bold border border-slate-300 text-slate-700 bg-slate-100 shadow-sm">
          {s}
        </span>
      );
    }
    if (s === 'ON LEAVE') {
      return (
        <span className="px-3 py-1 rounded-full text-[10px] font-bold border border-amber-300 text-amber-700 bg-amber-50 shadow-sm">
          ON LEAVE
        </span>
      );
    }
    return (
      <span className="px-3 py-1 rounded-full text-[10px] font-bold border border-blue-300 text-blue-700 bg-blue-50 shadow-sm">
        {s}
      </span>
    );
  };

  if (!isAdmin) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-xs">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <div className="max-w-md space-y-1.5">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Admin Access Only</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Employee Master Directory &amp; Headcount Management are reserved exclusively for Administrators.
          </p>
        </div>
        <a
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2F6798] hover:bg-[#24527a] text-white font-bold text-xs shadow-md transition-all"
        >
          Return to Dashboard
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-full pb-10 font-sans text-slate-800 dark:text-slate-200">
      {isRefreshing && (
        <PageLoading 
          title="Refreshing Employees & Trainers Directory..." 
          subtitle="Syncing latest personnel records from database..." 
        />
      )}
      {/* Top Action Bar matching Trainees page */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#2F6798] dark:text-[#5a9fd4] ${isRefreshing ? 'animate-spin' : ''}`} /> Refresh Data
          </button>
          <button
            onClick={() => {
              const csvContent = 'data:text/csv;charset=utf-8,' + [
                ['Employee Name', 'Employee Code', 'Email', 'Role / Department', 'Status', 'Hire Date', 'Assigned Accounts'].join(','),
                ...filteredEmployees.map(e => [
                  `"${e.employee_name || ''}"`,
                  `"${e.employee_code || ''}"`,
                  `"${e.employee_email || ''}"`,
                  `"${e.role_name || e.category || ''}"`,
                  `"${e.status_name || ''}"`,
                  `"${e.hire_date || ''}"`,
                  `"${e.assigned_accounts || ''}"`
                ].join(','))
              ].join('\n');
              const encodedUri = encodeURI(csvContent);
              const link = document.createElement('a');
              link.setAttribute('href', encodedUri);
              link.setAttribute('download', `employees_export_${new Date().toISOString().split('T')[0]}.csv`);
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-[#2F6798] dark:text-[#5a9fd4]" /> Export Summary
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <Printer className="w-3.5 h-3.5 text-[#2F6798] dark:text-[#5a9fd4]" /> Print / PDF
          </button>
        </div>

        <div className="flex items-center gap-3">
          {canManage && (
            <button
              onClick={() => {
                setFormData({
                  employee_code: '',
                  employee_name: '',
                  employee_email: '',
                  status_id: 1,
                  role_id: 1,
                  hire_date: '',
                  vici_link: '',
                  account_id: ''
                });
                setIsAddModalOpen(true);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-[#2F6798] hover:bg-[#24527a] text-white rounded-xl text-xs font-bold shadow-sm transition-all transform hover:-translate-y-0.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add Employee
            </button>
          )}
        </div>
      </div>

      {/* TOP SUMMARY KPI BOXES - MATCHING TRAINEES TABLE DESIGN */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Box 1: Total Employees Headcount */}
        <div className="relative overflow-hidden bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between hover:shadow-md transition-all group">
          <div className="absolute -right-2 -bottom-2 w-32 sm:w-44 pointer-events-none select-none opacity-[0.28] dark:opacity-[0.16] group-hover:opacity-[0.42] dark:group-hover:opacity-[0.28] transition-all duration-300 transform group-hover:scale-105 z-0">
            <img src="https://zhdmsmwrskxowvytedgh.supabase.co/storage/v1/object/public/Images/design%20(1).png" alt="Watermark" className="w-full h-auto object-cover object-bottom" />
          </div>
          <div className="min-w-0 relative z-10">
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate">TOTAL HEADCOUNT</p>
            <h4 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-0.5">{kpis.total.toLocaleString()}</h4>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-[#2F6798] dark:text-[#5a9fd4] shrink-0 ml-2 relative z-10">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* Box 2: Primary Trainers */}
        <div className="relative overflow-hidden bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between hover:shadow-md transition-all group">
          <div className="absolute -right-2 -bottom-2 w-32 sm:w-44 pointer-events-none select-none opacity-[0.28] dark:opacity-[0.16] group-hover:opacity-[0.42] dark:group-hover:opacity-[0.28] transition-all duration-300 transform group-hover:scale-105 z-0">
            <img src="https://zhdmsmwrskxowvytedgh.supabase.co/storage/v1/object/public/Images/design%20(1).png" alt="Watermark" className="w-full h-auto object-cover object-bottom" />
          </div>
          <div className="min-w-0 relative z-10">
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate">PRIMARY TRAINERS</p>
            <h4 className="text-2xl font-black text-[#1967D2] dark:text-blue-400 mt-0.5">{kpis.trainersCount.toLocaleString()}</h4>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-[#1967D2] dark:text-blue-400 shrink-0 ml-2 relative z-10">
            <UserCog className="w-5 h-5" />
          </div>
        </div>

        {/* Box 3: Active Trainees */}
        <div className="relative overflow-hidden bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between hover:shadow-md transition-all group">
          <div className="absolute -right-2 -bottom-2 w-32 sm:w-44 pointer-events-none select-none opacity-[0.28] dark:opacity-[0.16] group-hover:opacity-[0.42] dark:group-hover:opacity-[0.28] transition-all duration-300 transform group-hover:scale-105 z-0">
            <img src="https://zhdmsmwrskxowvytedgh.supabase.co/storage/v1/object/public/Images/design%20(1).png" alt="Watermark" className="w-full h-auto object-cover object-bottom" />
          </div>
          <div className="min-w-0 relative z-10">
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate">ACTIVE TRAINEES</p>
            <h4 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{kpis.traineesCount.toLocaleString()}</h4>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0 ml-2 relative z-10">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        {/* Box 4: Active Operations Staff */}
        <div className="relative overflow-hidden bg-white dark:bg-slate-800/90 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between hover:shadow-md transition-all group">
          <div className="absolute -right-2 -bottom-2 w-32 sm:w-44 pointer-events-none select-none opacity-[0.28] dark:opacity-[0.16] group-hover:opacity-[0.42] dark:group-hover:opacity-[0.28] transition-all duration-300 transform group-hover:scale-105 z-0">
            <img src="https://zhdmsmwrskxowvytedgh.supabase.co/storage/v1/object/public/Images/design%20(1).png" alt="Watermark" className="w-full h-auto object-cover object-bottom" />
          </div>
          <div className="min-w-0 relative z-10">
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider truncate">ACTIVE STAFF</p>
            <h4 className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-0.5">{kpis.activeStaff.toLocaleString()}</h4>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0 ml-2 relative z-10">
            <Building2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* GLOBAL FILTER BAR WITH ROLE / DEPARTMENT FILTER */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl p-5 rounded-3xl border border-slate-200/80 dark:border-slate-700/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] relative z-20">
        {/* Role / Category Filter */}
        <div>
          <label className="text-[0.6rem] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
            <UserCog className="w-3.5 h-3.5 text-[#2F6798]" /> Role / Department Filter
          </label>
          <CustomSelect
            value={selectedCategory}
            onChange={val => setSelectedCategory(val)}
            options={[
              { value: 'All', label: 'All Roles / Departments' },
              { value: 'TRAINER', label: 'Trainers' },
              { value: 'TRAINEE', label: 'Trainees' },
              { value: 'ADMIN', label: 'Admin' },
              { value: 'QA', label: 'QA' },
              { value: 'TL', label: 'Team Leaders (TL)' },
              { value: 'AGENT', label: 'Agents' },
            ]}
          />
        </div>

        {/* Status Filter */}
        <div>
          <label className="text-[0.6rem] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#2F6798]" /> Status Filter
          </label>
          <CustomSelect
            value={selectedStatus}
            onChange={val => setSelectedStatus(val)}
            options={[
              { value: 'All', label: 'All Statuses' },
              { value: 'Active', label: 'Active' },
              { value: 'Inactive', label: 'Inactive' },
              { value: 'Resigned', label: 'Resigned' },
              { value: 'On Leave', label: 'On Leave' },
            ]}
          />
        </div>

        {/* Client Account Filter */}
        <div>
          <label className="text-[0.6rem] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-[#2F6798]" /> Client Account Filter
          </label>
          <CustomSelect
            value={selectedAccount}
            onChange={val => setSelectedAccount(val)}
            options={availableAccounts.map(a => ({
              value: a,
              label: a === 'All' ? 'All Client Accounts' : a
            }))}
          />
        </div>

        {/* Search */}
        <div>
          <label className="text-[0.6rem] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1.5">
            Search Employee / Code / Email
          </label>
          <div className="relative group">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-[#2F6798] transition-colors" />
            <input
              type="search"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Type name, code, or email..."
              className="h-10 w-full rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-white/80 dark:bg-slate-900/80 py-2 pl-9 pr-4 text-xs font-medium text-slate-700 dark:text-slate-200 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-[#2F6798] focus:ring-4 focus:ring-[#2F6798]/10 hover:border-slate-300 dark:hover:border-slate-600 shadow-sm"
            />
          </div>
        </div>
      </div>

      {/* ALL EMPLOYEES TABLE WITH PAGINATION & MATCHING TRAINEES DIRECTORY DESIGN */}
      <div className="bg-white dark:bg-slate-800/90 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/80 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <TableIcon className="w-4 h-4 text-[#2F6798] dark:text-[#5a9fd4]" />
            <h3 className="text-xs font-black tracking-wider text-slate-800 dark:text-slate-100 uppercase font-mono">
              EMPLOYEES &amp; TRAINERS DIRECTORY ({filteredEmployees.length})
            </h3>
          </div>
          <div className="flex items-center gap-4 text-[11px] font-bold text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1.5">
              <span>Rows per page:</span>
              <select
                value={pageSize}
                onChange={e => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2F6798]"
              >
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
            <span>
              Showing {filteredEmployees.length === 0 ? 0 : (currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filteredEmployees.length)} of {filteredEmployees.length} records
            </span>
          </div>
        </div>

        <div className="w-full overflow-x-auto custom-horizontal-scrollbar touch-pan-x overscroll-x-contain pb-1 min-h-[360px]">
          <table className="w-full text-left text-xs border-collapse min-w-[950px]">
            <thead>
              <tr className="bg-slate-100/80 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px] whitespace-nowrap">
                <th className="py-3 px-4 min-w-[180px]">Employee Name</th>
                <th className="py-3 px-4 min-w-[110px]">Employee Code</th>
                <th className="py-3 px-4 min-w-[160px]">Email</th>
                <th className="py-3 px-4 min-w-[120px]">Role / Department</th>
                <th className="py-3 px-4 min-w-[100px]">Status</th>
                <th className="py-3 px-4 min-w-[110px]">Hire Date</th>
                <th className="py-3 px-4 min-w-[110px]">Vici Link</th>
                <th className="py-3 px-4 min-w-[150px]">Assigned Accounts</th>
                <th className="py-3 px-4 text-right min-w-[90px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60">
              {paginatedEmployees.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-slate-400 dark:text-slate-500 font-medium">
                    No employee records found matching your criteria.
                  </td>
                </tr>
              ) : (
                paginatedEmployees.map(emp => {
                  return (
                    <tr
                      key={emp.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors whitespace-nowrap"
                    >
                      <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-100 min-w-[180px]">
                        {(() => {
                          const isMatch = (emp.employee_name && userName && emp.employee_name.toLowerCase().includes(userName.toLowerCase())) ||
                            (emp.employee_email && userEmail && emp.employee_email.toLowerCase() === userEmail.toLowerCase()) ||
                            (emp.employee_name && emp.employee_name.toLowerCase().includes('nissi'));
                          const empPhoto = emp.avatar_url || (isMatch ? avatarUrl : null);
                          return (
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-blue-50 dark:bg-blue-950/60 text-[#2F6798] dark:text-[#5a9fd4] flex items-center justify-center text-[10px] font-bold shrink-0 border border-blue-100 dark:border-blue-800 overflow-hidden">
                                {empPhoto ? (
                                  <img src={empPhoto} alt={emp.employee_name} className="w-full h-full object-cover" />
                                ) : (
                                  emp.employee_name ? emp.employee_name.charAt(0).toUpperCase() : '?'
                                )}
                              </div>
                              <span>{emp.employee_name}</span>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="py-3 px-4 font-semibold text-[#2F6798] dark:text-[#5a9fd4]">
                        {emp.employee_code || 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-medium">
                        {emp.employee_email || 'N/A'}
                      </td>
                      <td className="py-3 px-4">
                        {renderRoleBadge(emp.role_id, emp.role_name, emp.category)}
                      </td>
                      <td className="py-3 px-4">
                        {renderStatusBadge(emp.status_id, emp.status_name)}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-medium">
                        {emp.hire_date || 'N/A'}
                      </td>
                      <td className="py-3 px-4">
                        {emp.vici_link ? (
                          <a
                            href={emp.vici_link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[#2F6798] dark:text-[#5a9fd4] hover:underline font-semibold text-xs"
                          >
                            <ExternalLink className="w-3 h-3" /> Vici Stats
                          </a>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500 font-medium text-xs">N/A</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-medium">
                        {emp.assigned_accounts || 'Unassigned'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {/* Unboxed Colored Icon Actions matching Trainees design */}
                        <div className="flex items-center justify-end gap-3">
                          <button
                            onClick={() => setViewingEmp(emp)}
                            title="View Details"
                            className="text-[#C8A54B] hover:opacity-80 transition-opacity p-0 bg-transparent border-0 cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {canManage && (
                            <>
                              <button
                                onClick={() => {
                                  setEditingEmp(emp);
                                  setFormData({
                                    employee_code: emp.employee_code || '',
                                    employee_name: emp.employee_name || '',
                                    employee_email: emp.employee_email || '',
                                    status_id: emp.status_id || 1,
                                    role_id: emp.role_id || 1,
                                    hire_date: emp.hire_date || '',
                                    vici_link: emp.vici_link || '',
                                    account_id: (emp.account_ids && emp.account_ids[0]) ? String(emp.account_ids[0]) : ''
                                  });
                                }}
                                title="Edit Employee"
                                className="text-[#2F6798] dark:text-[#5a9fd4] hover:opacity-80 transition-opacity p-0 bg-transparent border-0 cursor-pointer"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setDeletingEmp(emp)}
                                title="Delete Employee"
                                className="text-[#ED1C25] hover:opacity-80 transition-opacity p-0 bg-transparent border-0 cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* TABLE PAGINATION CONTROLS MATCHING TRAINEES TABLE */}
        {filteredEmployees.length > 0 && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 flex flex-wrap items-center justify-between gap-4">
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Page <strong className="text-slate-800 dark:text-slate-200">{currentPage}</strong> of <strong className="text-slate-800 dark:text-slate-200">{totalPages}</strong>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Previous
              </button>

              <div className="flex items-center gap-1 px-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => {
                  if (totalPages > 6 && Math.abs(pageNum - currentPage) > 2 && pageNum !== 1 && pageNum !== totalPages) {
                    if (pageNum === 2 || pageNum === totalPages - 1) {
                      return <span key={pageNum} className="text-xs text-slate-400 px-1">...</span>;
                    }
                    return null;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                        currentPage === pageNum
                          ? 'bg-[#2F6798] text-white shadow-xs'
                          : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ADD EMPLOYEE DRAWER */}
      {canManage && (
        <EmployeeFormDrawer
          isOpen={isAddModalOpen}
          mode="add"
          initialData={formData}
          roles={rolesList}
          accounts={accounts}
          statuses={statuses}
          existingEmployees={employees}
          onClose={() => setIsAddModalOpen(false)}
          onSubmit={async (data) => {
            setIsSubmitting(true);
            try {
              const res = await fetch('/api/employees', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
              });
              const resData = await res.json();
              if (resData.success) {
                showToast('Employee created successfully!', 'Employee Created', 'success');
                setIsAddModalOpen(false);
                handleRefresh();
              } else {
                showToast(resData.error || 'Failed to create employee.', 'Creation Failed', 'error');
              }
            } catch (err: any) {
              showToast(err.message || 'Error creating employee.', 'Creation Error', 'error');
            } finally {
              setIsSubmitting(false);
            }
          }}
          isSubmitting={isSubmitting}
        />
      )}

      {/* EDIT EMPLOYEE DRAWER */}
      {canManage && editingEmp && (
        <EmployeeFormDrawer
          isOpen={Boolean(editingEmp)}
          mode="edit"
          initialData={{
            id: editingEmp.id,
            employee_code: editingEmp.employee_code || '',
            employee_name: editingEmp.employee_name || '',
            employee_email: editingEmp.employee_email || '',
            status_id: editingEmp.status_id || 1,
            role_id: editingEmp.role_id || 1,
            hire_date: editingEmp.hire_date || '',
            vici_link: editingEmp.vici_link || '',
            account_id: (editingEmp.account_ids && editingEmp.account_ids[0]) ? String(editingEmp.account_ids[0]) : ''
          }}
          roles={rolesList}
          accounts={accounts}
          statuses={statuses}
          existingEmployees={employees}
          onClose={() => setEditingEmp(null)}
          onSubmit={async (data) => {
            setIsSubmitting(true);
            try {
              const res = await fetch('/api/employees', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  id: editingEmp.id,
                  ...data
                })
              });
              const resData = await res.json();
              if (resData.success) {
                showToast('Employee updated successfully!', 'Employee Updated', 'success');
                setEditingEmp(null);
                handleRefresh();
              } else {
                showToast(resData.error || 'Failed to update employee.', 'Update Failed', 'error');
              }
            } catch (err: any) {
              showToast(err.message || 'Error updating employee.', 'Update Error', 'error');
            } finally {
              setIsSubmitting(false);
            }
          }}
          isSubmitting={isSubmitting}
        />
      )}

      {/* DELETE CONFIRMATION MODAL - MATCHING LOGOUT MODAL DESIGN */}
      {canManage && deletingEmp && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 max-w-sm w-full relative shadow-2xl text-center space-y-6 animate-in fade-in zoom-in-95 duration-150 border border-slate-100 dark:border-slate-700">
            <button
              onClick={() => setDeletingEmp(null)}
              className="absolute top-5 right-5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="w-20 h-20 bg-[#ED1C25] rounded-full flex items-center justify-center mx-auto shadow-md shadow-red-200 dark:shadow-red-900/30">
              <Trash2 className="h-9 w-9 text-white stroke-[2.5]" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">Delete Employee</h3>
              <div className="flex flex-col gap-1 text-center text-slate-500 dark:text-slate-400">
                <span className="text-sm font-medium">
                  Are you sure you want to delete <strong className="text-slate-800 dark:text-slate-200">{deletingEmp.employee_name}</strong>?
                </span>
                <span className="text-xs font-normal leading-relaxed">
                  This action cannot be undone and will permanently remove this record.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingEmp(null)}
                className="px-6 py-2.5 rounded-full bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 font-bold text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteSubmit}
                disabled={isSubmitting}
                className="px-6 py-2.5 rounded-full bg-[#ED1C25] hover:bg-[#c8161e] text-white font-bold text-sm transition-colors shadow-md shadow-red-200 dark:shadow-red-900/30 disabled:opacity-50"
              >
                {isSubmitting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* VIEW DETAILS SIDE RIGHT DRAWER */}
      <EmployeeDetailDrawer employee={viewingEmp} onClose={() => setViewingEmp(null)} />
    </div>
  );
}
