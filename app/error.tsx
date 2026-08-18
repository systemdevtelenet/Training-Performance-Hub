'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <h2 className="text-lg font-bold text-slate-800">Something went wrong</h2>
      <p className="text-sm text-slate-500">{error.message}</p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-[#2F6798] text-white text-sm font-semibold rounded-xl hover:bg-[#245580] transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
