'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Loader2, Search, RefreshCw, AlertTriangle, ShieldCheck, Download, Activity, Check } from 'lucide-react';
import { useRole } from '@/components/providers/RoleProvider';

export default function TrafficLightsClient() {
  const supabase = createClient();
  const { actualRole, role: simulatedRole } = useRole();
  const currentRole = simulatedRole || actualRole;
  
  const [account, setAccount] = useState(currentRole === 'HOT_ADMIN' ? 'trainers' : 'rm');
  const [quarter, setQuarter] = useState('q1');
  const [data, setData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const allAccounts = [
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

  const accounts = currentRole === 'HOT_ADMIN' 
    ? [{ id: 'trainers', name: 'Trainers' }] 
    : allAccounts;

  const quarters = [
    { id: 'q1', name: 'Q1 2026' },
    { id: 'q2', name: 'Q2 2026' },
    { id: 'q3', name: 'Q3 2026' },
    { id: 'q4', name: 'Q4 2026' },
  ];

  const fetchTableData = async () => {
    setIsLoading(true);
    // e.g. "traffic_light_mon_rm_q1" 
    // note: some tables had spaces in the name in your DB like "traffic_light_mon_ mm_transpo_q1", 
    // we'll try without space first, if fails try with space.
    let tableName = `traffic_light_mon_${account}_${quarter}`;
    
    // For mm_transpo and others, they might have a space in the DB
    if (['mm_transpo', 'fleet', 'js', 'dft', 'awd', 'flexar', 'ono', 'hh', 'other_acc'].includes(account)) {
       tableName = `traffic_light_mon_ ${account}_${quarter}`;
    }

    const { data: result, error } = await supabase
      .from(tableName.replace(' _', '_')) // clean up just in case
      .select('*');

    if (error) {
       // fallback try with space
       const { data: fallback, error: err2 } = await supabase
        .from(`traffic_light_mon_ ${account}_${quarter}`)
        .select('*');
        
       if (err2) {
           console.error("Error fetching data:", err2);
           setData([]);
           setColumns([]);
       } else if (fallback) {
           processData(fallback);
       }
    } else if (result) {
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
      
      // Extract column keys dynamically. Assuming 'teams' or 'name' is the primary identifier.
      const firstRow = rawData[0];
      const allKeys = Object.keys(firstRow);
      
      // Find the identifier column (teams, name, Name)
      const nameCol = allKeys.find(k => k.toLowerCase() === 'teams' || k.toLowerCase() === 'name') || allKeys[0];
      
      // Get date columns (filter out id, created_at, name, account, position etc)
      const excludeCols = ['id', 'created_at', 'teams', 'name', 'account', 'position', nameCol];
      const dateCols = allKeys.filter(k => !excludeCols.includes(k.toLowerCase()));
      
      // Sort dates assuming they are formatted like M/D/YYYY
      dateCols.sort((a, b) => {
          const dateA = new Date(a).getTime();
          const dateB = new Date(b).getTime();
          if (!isNaN(dateA) && !isNaN(dateB)) return dateA - dateB;
          return 0; // fallback
      });

      setColumns([nameCol, ...dateCols]);
      setData(rawData);
  };

  useEffect(() => {
    fetchTableData();
  }, [account, quarter]);

  const updateCell = async (rowIndex: number, colKey: string, newValue: string) => {
      setIsSaving(true);
      const updatedData = [...data];
      updatedData[rowIndex] = { ...updatedData[rowIndex], [colKey]: newValue };
      setData(updatedData);

      // Save to Supabase (assuming 'id' exists, otherwise we match on 'teams' or 'name')
      const row = data[rowIndex];
      
      let tableName = `traffic_light_mon_${account}_${quarter}`;
      if (['mm_transpo', 'fleet', 'js', 'dft', 'awd', 'flexar', 'ono', 'hh', 'other_acc'].includes(account)) {
          tableName = `traffic_light_mon_ ${account}_${quarter}`;
      }

      // We need a unique identifier. If 'id' is missing, use the name column.
      const nameCol = columns[0];
      const matchKey = row.id ? 'id' : nameCol;
      const matchValue = row.id ? row.id : row[nameCol];

      const { error } = await supabase
        .from(tableName.replace(' _', '_'))
        .update({ [colKey]: newValue })
        .eq(matchKey, matchValue);

      if (error) {
         const { error: fallbackErr } = await supabase
          .from(`traffic_light_mon_ ${account}_${quarter}`)
          .update({ [colKey]: newValue })
          .eq(matchKey, matchValue);
          
         if(fallbackErr) console.error("Failed to save:", fallbackErr);
      }
      setIsSaving(false);
  };

  const getStatusColor = (val: string) => {
      if (!val) return 'bg-slate-50 dark:bg-slate-800 text-slate-400';
      const v = val.toUpperCase();
      if (v === 'GREEN') return 'bg-emerald-500 text-white shadow-sm';
      if (v === 'RED') return 'bg-rose-500 text-white shadow-sm';
      if (v === 'AMBER' || v === 'YELLOW') return 'bg-amber-500 text-white shadow-sm';
      return 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300';
  };

  const filteredData = data.filter(row => {
      if (!searchQuery) return true;
      const nameVal = row[columns[0]];
      return nameVal && String(nameVal).toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
             <Activity className="w-6 h-6 text-[#2F6798]" />
             Traffic Light Monitoring
          </h1>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-0.5">
            Manage weekly employee status flags across all accounts. Changes save instantly.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchTableData}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 shadow-xs hover:bg-slate-50/80 dark:hover:bg-slate-700/50 hover:border-slate-300 transition-all disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-3.5 h-3.5 text-[#2F6798] animate-spin" /> : <RefreshCw className="w-3.5 h-3.5 text-[#2F6798]" />}
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200/70 dark:border-slate-700/70 shadow-sm">
        <div className="w-full md:w-64">
           <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5 px-1">Account</label>
           <select 
             value={account} 
             onChange={(e) => setAccount(e.target.value)}
             className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#2F6798]/30"
           >
             {accounts.map(acc => (
                 <option key={acc.id} value={acc.id}>{acc.name}</option>
             ))}
           </select>
        </div>
        <div className="w-full md:w-48">
           <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5 px-1">Quarter</label>
           <select 
             value={quarter} 
             onChange={(e) => setQuarter(e.target.value)}
             className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#2F6798]/30"
           >
             {quarters.map(q => (
                 <option key={q.id} value={q.id}>{q.name}</option>
             ))}
           </select>
        </div>
        <div className="w-full md:flex-1">
           <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5 px-1">Search Employee</label>
           <div className="relative">
             <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
             <input 
               type="text" 
               placeholder="Type a name to filter..."
               value={searchQuery}
               onChange={(e) => setSearchQuery(e.target.value)}
               className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl pl-9 pr-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#2F6798]/30"
             />
           </div>
        </div>
      </div>

      {/* Data Grid */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm overflow-hidden flex flex-col">
          {isLoading ? (
              <div className="flex flex-col items-center justify-center p-20 text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin mb-4 text-[#2F6798]" />
                  <p className="text-sm font-medium">Loading traffic light data...</p>
              </div>
          ) : data.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-20 text-slate-400">
                  <ShieldCheck className="w-12 h-12 mb-4 text-slate-300 dark:text-slate-600" />
                  <p className="text-sm font-medium text-slate-500">No records found for this account/quarter combination.</p>
              </div>
          ) : (
              <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[800px]">
                      <thead>
                          <tr className="bg-slate-50/80 dark:bg-slate-900/50 border-b border-slate-200/80 dark:border-slate-700/80">
                              {columns.map((col, idx) => (
                                  <th 
                                    key={col} 
                                    className={`px-4 py-3 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider ${idx === 0 ? 'sticky left-0 bg-slate-50 dark:bg-slate-900 z-10 min-w-[200px] border-r border-slate-200/50 dark:border-slate-700/50' : 'min-w-[120px] text-center'}`}
                                  >
                                      {col}
                                  </th>
                              ))}
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                          {filteredData.map((row, rowIndex) => (
                              <tr key={rowIndex} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                  {columns.map((col, colIndex) => {
                                      const isNameCol = colIndex === 0;
                                      const val = row[col];
                                      
                                      if (isNameCol) {
                                          return (
                                              <td key={col} className="px-4 py-3 sticky left-0 bg-white dark:bg-slate-800 z-10 border-r border-slate-100 dark:border-slate-700/50 shadow-[1px_0_2px_rgba(0,0,0,0.02)]">
                                                  <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{val || 'Unknown'}</span>
                                              </td>
                                          );
                                      }

                                      return (
                                          <td key={col} className="px-2 py-2 text-center align-middle">
                                              <select 
                                                value={val || ''}
                                                onChange={(e) => updateCell(rowIndex, col, e.target.value)}
                                                className={`w-full text-[10px] font-black uppercase tracking-wider py-2 px-1 rounded-lg appearance-none text-center cursor-pointer transition-all border-none focus:ring-2 focus:ring-[#2F6798]/50 ${getStatusColor(val)}`}
                                                style={{ textAlignLast: 'center' }}
                                              >
                                                  <option value="" className="bg-white text-slate-900">None</option>
                                                  <option value="GREEN" className="bg-emerald-500 text-white">GREEN</option>
                                                  <option value="AMBER" className="bg-amber-500 text-white">AMBER</option>
                                                  <option value="RED" className="bg-rose-500 text-white">RED</option>
                                              </select>
                                          </td>
                                      );
                                  })}
                              </tr>
                          ))}
                      </tbody>
                  </table>
              </div>
          )}
      </div>
      
      {isSaving && (
          <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 text-sm font-medium z-50 animate-in slide-in-from-bottom-5">
              <Loader2 className="w-4 h-4 animate-spin text-[#2F6798]" />
              Saving changes to database...
          </div>
      )}
    </div>
  );
}
