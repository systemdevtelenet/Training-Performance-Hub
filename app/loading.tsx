export default function DashboardLoading() {
  return (
    <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-white animate-in fade-in duration-150">
      <div className="flex flex-col items-center justify-center space-y-4">
        <div className="w-14 h-14 rounded-full border-4 border-slate-100 border-t-[#2F6798] animate-spin" />
        <p className="text-sm font-bold text-slate-600 tracking-tight">
          Loading workspace metrics...
        </p>
      </div>
    </div>
  );
}
