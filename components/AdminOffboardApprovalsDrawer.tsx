'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  GraduationCap,
  Calendar,
  Layers,
  FileText,
  AlertTriangle,
  Loader2,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { useRole } from '@/components/providers/RoleProvider';

export interface PendingOffboardRequest {
  id: string | number;
  sourceKey: string;
  traineeName: string;
  trainingType: 'PST' | 'INHOUSE';
  batchName: string;
  accountName: string;
  assignedTrainer: string;
  status: string;
  departureDate: string;
  reasonCategory: string;
  remarks: string;
  requestedBy: string;
  requestedAt: string;
}

interface AdminOffboardApprovalsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onApprovedOrDeclined: () => void;
  pendingCount?: number;
  onUpdateCount?: (count: number) => void;
}

export function AdminOffboardApprovalsDrawer({
  isOpen,
  onClose,
  onApprovedOrDeclined,
  onUpdateCount
}: AdminOffboardApprovalsDrawerProps) {
  const { userName } = useRole();
  const [rendered, setRendered] = useState(isOpen);
  const [open, setOpen] = useState(isOpen);
  const [requests, setRequests] = useState<PendingOffboardRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | number | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'decline' | null>(null);

  const fetchRequests = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/trainees/offboard');
      const data = await res.json();
      if (data.success && Array.isArray(data.requests)) {
        setRequests(data.requests);
        if (onUpdateCount) onUpdateCount(data.requests.length);
      }
    } catch (err) {
      console.error('Failed to load pending offboarding requests:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setRendered(true);
      requestAnimationFrame(() => setOpen(true));
      fetchRequests();
    } else {
      setOpen(false);
      const timer = setTimeout(() => setRendered(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleAction = async (req: PendingOffboardRequest, action: 'approve' | 'decline') => {
    setProcessingId(req.id);
    setActionType(action);
    try {
      const res = await fetch('/api/trainees/offboard', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          traineeName: req.traineeName,
          adminName: userName || 'Nissi',
          requestData: req
        })
      });
      const data = await res.json();
      if (data.success) {
        setRequests(prev => prev.filter(r => r.traineeName !== req.traineeName));
        if (onUpdateCount) onUpdateCount(Math.max(0, requests.length - 1));
        onApprovedOrDeclined();
      } else {
        alert(data.error || 'Failed to process request');
      }
    } catch (err: any) {
      alert(err.message || 'Error executing action');
    } finally {
      setProcessingId(null);
      setActionType(null);
    }
  };

  if (!rendered) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className={`fixed inset-0 z-50 flex justify-end transition-opacity duration-300 ${
        open ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
      />

      {/* Drawer Panel */}
      <div
        className={`relative w-full max-w-xl bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col z-10 transform transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-amber-50/50 dark:bg-amber-950/20">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 dark:bg-amber-500/25 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 shadow-xs">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black text-slate-800 dark:text-slate-100 tracking-tight">
                  Offboarding Approval Queue
                </h2>
                <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-200 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300">
                  {requests.length} PENDING
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                Trainer requests awaiting administrative review and separation confirmation.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Requests List Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-[#2F6798]" />
              <span className="text-xs font-semibold">Loading pending approval requests...</span>
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3 shadow-xs">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">
                All Cleared! No Pending Approvals
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                There are currently no trainee offboarding requests awaiting review. All rosters and separations are up to date.
              </p>
            </div>
          ) : (
            requests.map(req => {
              const isProcessing = processingId === req.id;
              const cleanDate = req.requestedAt
                ? new Date(req.requestedAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })
                : 'Recent';

              return (
                <div
                  key={req.id}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 shadow-xs space-y-3.5 hover:border-slate-300 dark:hover:border-slate-600 transition-all"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-[#2F6798] text-white font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                        {req.traineeName.split(' ').map(n => n[0]).slice(0, 2).join('')}
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-slate-900 dark:text-white">
                          {req.traineeName}
                        </h4>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                          <span>{req.trainingType}</span>
                          <span>•</span>
                          <span>{req.batchName || 'General'}</span>
                          <span>•</span>
                          <span>{req.accountName || 'General'}</span>
                        </div>
                      </div>
                    </div>

                    <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                      req.status === 'TERMINATED'
                        ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                        : req.status === 'RESIGNED'
                        ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300'
                        : 'bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300'
                    }`}>
                      {req.status}
                    </span>
                  </div>

                  {/* Metadata Grid */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] bg-white dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200/60 dark:border-slate-700/50">
                    <div>
                      <span className="text-slate-400 font-medium block text-[9.5px] uppercase">Assigned Trainer</span>
                      <span className="font-bold text-slate-700 dark:text-slate-200">{req.assignedTrainer || 'Trainer'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium block text-[9.5px] uppercase">Effective Separation</span>
                      <span className="font-bold text-slate-700 dark:text-slate-200">{req.departureDate || 'Immediate'}</span>
                    </div>
                    <div className="col-span-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                      <span className="text-slate-400 font-medium block text-[9.5px] uppercase">Reason Category</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{req.reasonCategory || 'General departure'}</span>
                    </div>
                    {req.remarks && (
                      <div className="col-span-2 pt-1 border-t border-slate-100 dark:border-slate-800">
                        <span className="text-slate-400 font-medium block text-[9.5px] uppercase">Trainer Exit Remarks</span>
                        <p className="font-medium text-slate-600 dark:text-slate-300 italic text-[10.5px] mt-0.5">
                          "{req.remarks}"
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Submitter Info */}
                  <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 px-1">
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" /> Requested by <strong>{req.requestedBy}</strong>
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {cleanDate}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleAction(req, 'decline')}
                      className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                    >
                      {isProcessing && actionType === 'decline' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-rose-500" />
                      )}
                      Decline
                    </button>

                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleAction(req, 'approve')}
                      className="px-4 py-1.5 rounded-xl bg-[#2F6798] hover:bg-[#24527a] text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                    >
                      {isProcessing && actionType === 'approve' ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      )}
                      Approve &amp; Offboard
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
            Author attribution: <strong>{userName || 'Nissi'}</strong>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
