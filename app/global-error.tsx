'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-6 text-center shadow-xl space-y-4">
          <h2 className="text-xl font-bold text-slate-100">Something went wrong</h2>
          <p className="text-xs text-slate-400">{error.message || 'An unexpected error occurred'}</p>
          <button
            onClick={() => reset()}
            className="px-5 py-2.5 bg-[#2F6798] hover:bg-[#24527a] text-white text-xs font-bold rounded-xl transition-all shadow-sm"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
