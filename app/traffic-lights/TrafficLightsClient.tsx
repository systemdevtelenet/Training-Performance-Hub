'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Loader2, 
  Search, 
  RefreshCw, 
  ShieldCheck, 
  Activity, 
  Users, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  Save,
  X,
  Layers,
  ChevronDown
} from 'lucide-react';
import { useRole } from '@/components/providers/RoleProvider';
import { getTrafficLightData, updateTrafficLightCell } from '@/lib/actions/traffic-lights';
import { CustomSelect } from '@/components/ui/CustomSelect';

// Custom Popover Dropdown for Traffic Light Status Cells
function StatusSelect({
  value,
  onChange,
  disabled,
  isPending
}: {
  value: string;
  onChange: (newValue: string) => void;
  disabled?: boolean;
  isPending?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const options = [
    { value: '', label: 'None', dot: '⚪', color: 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700' },
    { value: 'Okay', label: 'Okay', dot: '🟢', color: 'text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 font-bold' },
    { value: 'Shaky', label: 'Shaky', dot: '🟡', color: 'text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/60 font-bold' },
    { value: 'Terminated', label: 'Terminated', dot: '🔴', color: 'text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/60 font-bold' },
    { value: 'Resigned', label: 'Resigned', dot: '🔴', color: 'text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/60 font-bold' },
    { value: 'Account Removed', label: 'Account Removed', dot: '🔴', color: 'text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/60 font-bold' },
  ];

  const getStatusBadgeStyle = (val: string) => {
    if (!val) return 'bg-slate-50 text-slate-400 dark:bg-slate-900/50 dark:text-slate-500 border border-slate-200/60 dark:border-slate-800';
    const v = val.toUpperCase().trim();
    if (v === 'OKAY' || v === 'GREEN') {
      return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/80 font-semibold shadow-2xs';
    }
    if (v === 'SHAKY' || v === 'AMBER' || v === 'YELLOW') {
      return 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/80 dark:border-amber-800/80 font-semibold shadow-2xs';
    }
    if (['TERMINATED', 'RESIGNED', 'ACCOUNT REMOVED', 'RED'].includes(v)) {
      return 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/80 font-semibold shadow-2xs';
    }
    return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700';
  };

  const selectedOpt = options.find(o => o.value.toUpperCase() === (value || '').toUpperCase());
  const displayLabel = selectedOpt ? `${selectedOpt.dot} ${selectedOpt.label}` : (value ? value : 'None');

  return (
    <div className="relative w-full text-left" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full text-[10px] font-bold uppercase tracking-wider py-1.5 pl-3 pr-7 rounded-xl text-left relative transition-all outline-none ${getStatusBadgeStyle(value)} ${
          isPending ? 'ring-2 ring-[#2F6798]' : ''
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-[1.01]'}`}
      >
        <span className="truncate block pr-2">{displayLabel}</span>
        <ChevronDown className={`w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 z-50 mt-1.5 w-44 rounded-2xl bg-white dark:bg-slate-800 p-1.5 shadow-2xl border border-slate-200/80 dark:border-slate-700 animate-in fade-in zoom-in-95 duration-150">
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setIsOpen(false);
              }}
              className={`w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl transition-all text-left ${opt.color} ${
                (value || '').toUpperCase() === opt.value.toUpperCase() ? 'bg-slate-100 dark:bg-slate-700/80' : ''
              }`}
            >
              <span>{opt.dot}</span>
              <span>{opt.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function TrafficLightsClient({ initialAccounts }: { initialAccounts?: { id: string; name: string }[] }) {
  const { actualRole, role: simulatedRole, email } = useRole();
  const currentRole = simulatedRole || actualRole;

  const accounts = (initialAccounts && initialAccounts.length > 0) ? initialAccounts : [
    { id: 'rm', name: 'RM' },
    { id: 'xpn', name: 'XPN' },
    { id: 'fleet', name: 'Fleet' },
    { id: 'leaders', name: 'Leaders' },
    { id: 'trainers', name: 'Trainers' },
    { id: 'dft', name: 'DFT' },
    { id: 'js', name: 'JS' },
    { id: 'ono', name: 'ONO' },
    { id: 'awd', name: 'AWD' },
    { id: 'flexar', name: 'FLEXAR' },
    { id: 'hh', name: 'HH' },
    { id: 'mm_transpo', name: 'MM Transpo' },
    { id: 'other_acc', name: 'Other Acc' },
  ];

  const [account, setAccount] = useState(accounts[0]?.id || 'rm');
  const [quarter, setQuarter] = useState('q2');
  const [selectedTeam, setSelectedTeam] = useState<string>('ALL');
  const [data, setData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Track pending status edits before saving
  const [pendingEdits, setPendingEdits] = useState<Record<string, { rowIndex: number; colKey: string; newValue: string }>>({});
  const [toast, setToast] = useState<{ title: string; description: string; type: 'success' | 'info' | 'error' } | null>(null);

  const quarters = [
    { id: 'q1', name: 'Q1 2026' },
    { id: 'q2', name: 'Q2 2026' },
    { id: 'q3', name: 'Q3 2026' },
    { id: 'q4', name: 'Q4 2026' },
  ];

  const fetchTableData = async () => {
    setIsLoading(true);
    setPendingEdits({});
    setSelectedTeam('ALL');
    const { data: result, error } = await getTrafficLightData(account, quarter);
    if (error || !result || result.length === 0) {
      if (error) console.error('Error fetching traffic light data:', error);
      setData([]);
      setColumns([]);
    } else {
      processData(result);
    }
    setIsLoading(false);
  };

  const processData = (rawData: any[]) => {
    if (!rawData || rawData.length === 0) {
      setData([]);
      setColumns([]);
      return;
    }

    const firstRow = rawData[0];
    const allKeys = Object.keys(firstRow);
    const nameCol = allKeys.find(k => k.toLowerCase() === 'teams' || k.toLowerCase() === 'name') || allKeys[0];
    const excludeCols = ['id', 'created_at', 'teams', 'name', 'account', 'position', nameCol];
    const dateCols = allKeys.filter(k => !excludeCols.includes(k.toLowerCase()));

    dateCols.sort((a, b) => {
      const dateA = new Date(a).getTime();
      const dateB = new Date(b).getTime();
      if (!isNaN(dateA) && !isNaN(dateB)) return dateA - dateB;
      return 0;
    });

    setColumns([nameCol, ...dateCols]);
    setData(rawData);
  };

  useEffect(() => {
    fetchTableData();
  }, [account, quarter]);

  // Dynamically extract teams and member counts
  const teamsList = useMemo(() => {
    if (!data || data.length === 0 || !columns || columns.length === 0) return [];
    const teams: { name: string; count: number }[] = [];
    let currentTeamName = '';

    data.forEach(row => {
      const val = String(row[columns[0]] || '').trim();
      if (val.toUpperCase().startsWith('TEAM')) {
        currentTeamName = val;
        if (!teams.find(t => t.name === currentTeamName)) {
          teams.push({ name: currentTeamName, count: 0 });
        }
      } else if (currentTeamName) {
        const teamObj = teams.find(t => t.name === currentTeamName);
        if (teamObj) teamObj.count++;
      }
    });

    return teams;
  }, [data, columns]);

  // Handle local cell edit change
  const handleCellChange = (rowIndex: number, colKey: string, newValue: string) => {
    const canEditAll = ['SUPER_ADMIN', 'HOT_ADMIN', 'QAS_ADMIN', 'VIEW_ADMIN'].includes(currentRole);
    const rowName = String(data[rowIndex][columns[0]] || '').toLowerCase();
    const userEmailStr = (email || '').toLowerCase();
    const isOwnRow = userEmailStr && (userEmailStr.includes(rowName.replace(/\s+/g, '')) || userEmailStr.includes(rowName.split(' ')[0]));

    if (!canEditAll && !isOwnRow) {
      alert('You can only edit your own traffic light status.');
      return;
    }

    const updatedData = [...data];
    updatedData[rowIndex] = { ...updatedData[rowIndex], [colKey]: newValue };
    setData(updatedData);

    const key = `${rowIndex}_${colKey}`;
    setPendingEdits(prev => ({
      ...prev,
      [key]: { rowIndex, colKey, newValue }
    }));
  };

  // Batch Save changes to database
  const handleSaveAll = async () => {
    const editsToSave = Object.values(pendingEdits);
    if (editsToSave.length === 0) return;

    setIsSaving(true);
    let hasError = false;

    for (const edit of editsToSave) {
      const row = data[edit.rowIndex];
      const nameCol = columns[0];
      const matchKey = row.id ? 'id' : nameCol;
      const matchValue = row.id ? row.id : row[nameCol];

      const res = await updateTrafficLightCell(account, quarter, matchKey, matchValue, edit.colKey, edit.newValue);
      if (!res.success) {
        console.error('Failed to save status:', res.error);
        hasError = true;
      }
    }

    setIsSaving(false);

    if (!hasError) {
      setPendingEdits({});
      setToast({
        title: 'Status Saved Successfully',
        description: `Successfully updated ${editsToSave.length} status record${editsToSave.length > 1 ? 's' : ''} in the database.`,
        type: 'success'
      });
      setTimeout(() => setToast(null), 3000);
    } else {
      setToast({
        title: 'Save Failed',
        description: 'Failed to save some status changes. Please try again.',
        type: 'error'
      });
      setTimeout(() => setToast(null), 3000);
    }
  };

  const handleDiscardEdits = () => {
    fetchTableData();
  };

  // Compute KPI metrics dynamically from active table data
  const kpis = useMemo(() => {
    let greenCount = 0;
    let yellowCount = 0;
    let redCount = 0;
    let employeeCount = 0;

    data.forEach((row) => {
      const name = String(row[columns[0]] || '').trim();
      if (!name || name.toUpperCase().startsWith('TEAM')) return;
      employeeCount++;

      columns.slice(1).forEach((col) => {
        const val = String(row[col] || '').toUpperCase().trim();
        if (val === 'OKAY' || val === 'GREEN') greenCount++;
        else if (val === 'SHAKY' || val === 'AMBER' || val === 'YELLOW') yellowCount++;
        else if (['TERMINATED', 'RESIGNED', 'ACCOUNT REMOVED', 'RED'].includes(val)) redCount++;
      });
    });

    return { employeeCount, greenCount, yellowCount, redCount };
  }, [data, columns]);

  // Filter dataset by team and search query
  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return [];

    let currentTeamName = '';
    return data.filter(row => {
      const nameVal = String(row[columns[0]] || '').trim();
      
      if (nameVal.toUpperCase().startsWith('TEAM')) {
        currentTeamName = nameVal;
        if (selectedTeam !== 'ALL' && selectedTeam !== currentTeamName) {
          return false;
        }
      } else {
        if (selectedTeam !== 'ALL' && currentTeamName !== selectedTeam) {
          return false;
        }
      }

      if (searchQuery) {
        return nameVal.toLowerCase().includes(searchQuery.toLowerCase());
      }

      return true;
    });
  }, [data, columns, selectedTeam, searchQuery]);

  const pendingCount = Object.keys(pendingEdits).length;

  return (
    <div className="space-y-3.5 w-full max-w-full px-0 pb-8">
      
      {/* Top-Right Success Toast Notification */}
      {toast && (
        <div className={`fixed top-6 right-6 z-[100] flex items-start gap-3 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700 px-4 py-3 rounded-xl shadow-2xl transition-all animate-in slide-in-from-top-5 duration-200 min-w-[320px] max-w-sm ${
          toast.type === 'success' ? 'border-l-4 border-l-emerald-500' : toast.type === 'info' ? 'border-l-4 border-l-[#2F6798]' : 'border-l-4 border-l-rose-500'
        }`}>
          <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-white ${
            toast.type === 'success' ? 'bg-emerald-500' : toast.type === 'info' ? 'bg-[#2F6798]' : 'bg-rose-500'
          }`}>
            <CheckCircle2 className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0 pr-2">
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-tight">
              {toast.title}
            </h4>
            <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
              {toast.description}
            </p>
          </div>
          <button onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-0.5 shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-slate-200/60 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-[#2F6798]/10 text-[#2F6798] flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
            Traffic Light Monitoring
          </h1>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            Real-time status tracking across accounts and quarterly performance flags
          </p>
        </div>

        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveAll}
                disabled={isSaving}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#2F6798] hover:bg-[#24527a] text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all animate-bounce"
              >
                {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                Save Changes ({pendingCount})
              </button>
              <button
                onClick={handleDiscardEdits}
                disabled={isSaving}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold transition-all"
              >
                Discard
              </button>
            </div>
          )}

          <button
            onClick={fetchTableData}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-xs hover:bg-slate-50/80 dark:hover:bg-slate-700/50 hover:border-slate-300 transition-all disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-3.5 h-3.5 text-[#2F6798] animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 text-[#2F6798]" />}
            Refresh Data
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/70 dark:border-slate-700/70 p-3 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Monitored Staff</p>
            <p className="text-2xl font-black text-slate-900 dark:text-slate-50 mt-0.5">{kpis.employeeCount}</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-[#2F6798] flex items-center justify-center">
            <Users className="w-4.5 h-4.5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/70 dark:border-slate-700/70 p-3 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Okay Flags (Green)</p>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">{kpis.greenCount}</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-4.5 h-4.5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/70 dark:border-slate-700/70 p-3 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Shaky Flags (Yellow)</p>
            <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-0.5">{kpis.yellowCount}</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200/80 dark:border-amber-900/60 flex items-center justify-center">
            <AlertTriangle className="w-4.5 h-4.5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/70 dark:border-slate-700/70 p-3 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Critical / Offboarded</p>
            <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-0.5">{kpis.redCount}</p>
          </div>
          <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <XCircle className="w-4.5 h-4.5" />
          </div>
        </div>
      </div>

      {/* Control / Filter Bar */}
      <div className="flex flex-col md:flex-row gap-3 bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200/70 dark:border-slate-700/70 shadow-sm items-center">
        <div className="w-full md:w-56">
          <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1 px-1">Client Account</label>
          <CustomSelect 
            value={account} 
            options={accounts.map(acc => ({ value: acc.id, label: acc.name }))}
            onChange={(val) => setAccount(val)}
          />
        </div>

        <div className="w-full md:w-40">
          <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1 px-1">Quarter Period</label>
          <CustomSelect 
            value={quarter} 
            options={quarters.map(q => ({ value: q.id, label: q.name }))}
            onChange={(val) => setQuarter(val)}
          />
        </div>

        {teamsList.length > 0 && (
          <div className="w-full md:w-60">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1 px-1 flex items-center gap-1">
              <Layers className="w-3 h-3 text-[#2F6798]" /> Team Filter
            </label>
            <CustomSelect 
              value={selectedTeam} 
              options={[
                { value: 'ALL', label: `All Teams (${teamsList.length})` },
                ...teamsList.map(t => ({ value: t.name, label: `${t.name} (${t.count})` }))
              ]}
              onChange={(val) => setSelectedTeam(val)}
            />
          </div>
        )}

        <div className="w-full md:flex-1">
          <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1 px-1">Search Employee</label>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input 
              type="text" 
              placeholder="Type name or batch..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200/80 bg-white/80 pl-9 pr-4 py-2.5 text-xs font-medium text-slate-700 shadow-2xs outline-none transition-all hover:border-slate-300 focus:border-[#2F6798] focus:ring-2 focus:ring-[#2F6798]/10 dark:border-slate-700/80 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:border-slate-600"
            />
          </div>
        </div>
      </div>

      {/* Interactive Team Navigation Tabs */}
      {teamsList.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 pt-0.5 scrollbar-none border-b border-slate-200/50 dark:border-slate-800">
          <button
            onClick={() => setSelectedTeam('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
              selectedTeam === 'ALL'
                ? 'bg-[#2F6798] text-white shadow-xs'
                : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/80 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            All Teams
            <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${selectedTeam === 'ALL' ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>
              {kpis.employeeCount}
            </span>
          </button>

          {teamsList.map(t => (
            <button
              key={t.name}
              onClick={() => setSelectedTeam(t.name)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                selectedTeam === t.name
                  ? 'bg-[#2F6798] text-white shadow-xs'
                  : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/80 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              {t.name}
              <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${selectedTeam === t.name ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500'}`}>
                {t.count}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Extended Main Container & Full Width Data Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm overflow-hidden flex flex-col w-full">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-24 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-[#2F6798]" />
            <p className="text-xs font-semibold">Loading traffic light records...</p>
          </div>
        ) : filteredData.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-24 text-slate-400">
            <ShieldCheck className="w-12 h-12 mb-3 text-slate-300 dark:text-slate-600" />
            <p className="text-xs font-medium text-slate-500">No records found for this team / filter selection.</p>
          </div>
        ) : (
          <div className="overflow-x-auto min-h-[600px] max-h-[calc(100vh-14rem)]">
            <table className="w-full text-left border-collapse min-w-[1000px]">
              <thead className="sticky top-0 z-20 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-xs border-b border-slate-200 dark:border-slate-700">
                <tr>
                  {columns.map((col, idx) => (
                    <th 
                      key={col} 
                      className={`px-4 py-3.5 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest ${
                        idx === 0 
                          ? 'sticky left-0 bg-slate-50 dark:bg-slate-900 z-30 min-w-[240px] border-r border-slate-200/80 dark:border-slate-700/80 shadow-[2px_0_4px_rgba(0,0,0,0.02)]' 
                          : 'min-w-[135px] text-center'
                      }`}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {filteredData.map((row, rowIndex) => {
                  const nameVal = String(row[columns[0]] || '').trim();
                  const isTeamHeader = nameVal.toUpperCase().startsWith('TEAM');

                  // Highlight Team Headers with a prominent row banner
                  if (isTeamHeader) {
                    return (
                      <tr key={rowIndex} className="bg-slate-100/80 dark:bg-slate-900/80 border-y border-slate-200/80 dark:border-slate-700/80">
                        <td colSpan={columns.length} className="px-4 py-2.5 text-xs font-black text-[#2F6798] dark:text-[#5a9fd4] uppercase tracking-widest sticky left-0 z-10 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[#2F6798]" />
                          {nameVal}
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={rowIndex} className="hover:bg-slate-50/60 dark:hover:bg-slate-700/30 transition-colors">
                      {columns.map((col, colIndex) => {
                        const isNameCol = colIndex === 0;
                        const val = row[col];

                        if (isNameCol) {
                          return (
                            <td key={col} className="px-4 py-3 sticky left-0 bg-white dark:bg-slate-800 z-10 border-r border-slate-100 dark:border-slate-700/50 shadow-[1px_0_2px_rgba(0,0,0,0.02)]">
                              <div className="flex items-center gap-2.5">
                                <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-600 dark:text-slate-300 shrink-0">
                                  {nameVal.charAt(0) || '?'}
                                </div>
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{nameVal || 'Unknown'}</span>
                              </div>
                            </td>
                          );
                        }

                        const userEmailStr = (email || '').toLowerCase();
                        const isOwnRow = userEmailStr && (userEmailStr.includes(nameVal.toLowerCase().replace(/\s+/g, '')) || userEmailStr.includes(nameVal.toLowerCase().split(' ')[0]));
                        const canEdit = ['SUPER_ADMIN', 'HOT_ADMIN', 'QAS_ADMIN', 'VIEW_ADMIN'].includes(currentRole) || isOwnRow;
                        const isPending = pendingEdits[`${rowIndex}_${col}`];

                        return (
                          <td key={col} className="px-2 py-2 text-center align-middle">
                            <StatusSelect 
                              value={val || ''}
                              onChange={(newVal) => handleCellChange(rowIndex, col, newVal)}
                              disabled={!canEdit}
                              isPending={!!isPending}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Floating Save Bar at bottom when edits are pending */}
      {pendingCount > 0 && !isSaving && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-4 text-xs font-bold z-[90] animate-in slide-in-from-bottom-5 border border-slate-700">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>{pendingCount} unsaved change{pendingCount > 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveAll}
              disabled={isSaving}
              className="px-4 py-2 bg-[#2F6798] hover:bg-[#24527a] text-white rounded-xl font-bold transition-all flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              Save Changes
            </button>
            <button
              onClick={handleDiscardEdits}
              disabled={isSaving}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all cursor-pointer"
            >
              Discard
            </button>
          </div>
        </div>
      )}

      {/* Centered Modal Loading Dialog during Save */}
      {isSaving && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 shadow-2xl border border-slate-200/80 dark:border-slate-700 flex flex-col items-center gap-3 min-w-[260px] text-center">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/50 text-[#2F6798] flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Saving Changes</h3>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">Updating traffic light records in database...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
