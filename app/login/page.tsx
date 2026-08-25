'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '', rememberMe: false });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push('/');
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative">
      <div className="absolute inset-0 bg-[url('/images/ctnp-bg-image-1.png')] bg-cover bg-center" />
      <div className="absolute inset-0 bg-black/50" />

      {/* Centered Split Modal */}
      <div className="w-full max-w-3xl bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-2 min-h-[440px] relative z-10">

        {/* Left Hero Panel */}
        <div className="bg-[#2F6798]/95 p-8 flex flex-col items-center justify-center text-white text-center space-y-6 relative">
          <div className="relative flex items-center justify-center">
            <div className="w-[104px] h-[104px] rounded-full border-4 border-white/30 flex items-center justify-center bg-white/10 backdrop-blur-sm overflow-hidden shrink-0">
              <Image src="/images/ctnp-logo.png" alt="CTNP Logo" width={96} height={96} className="object-contain pointer-events-none select-none" />
            </div>
          </div>

          <div className="space-y-1 pointer-events-none select-none">
            <h1 className="text-xl font-black tracking-wider uppercase whitespace-nowrap">
              CEBU TELE-NET PHILIPPINES
            </h1>
            <p className="text-xs text-blue-100 font-medium tracking-wide">
              Training Performance Hub
            </p>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="p-6 sm:px-6 sm:py-12 flex flex-col justify-center bg-white dark:bg-slate-800">
          <div className="mb-8 text-center space-y-2 pointer-events-none select-none">
            <h2 className="text-3xl font-bold text-[#2F6798] tracking-wider uppercase dark:text-[#5a9fd4]">
              LOGIN
            </h2>
            <p className="text-xs text-slate-400 font-normal">
              Enter your credentials to access the Training Performance Hub.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <input
                type="email"
                required
                placeholder="Email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2F6798] focus:border-transparent transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-800 dark:text-slate-300 dark:border-slate-700 dark:bg-slate-900"
              />
            </div>

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-3 pr-10 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2F6798] focus:border-transparent transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-800 dark:text-slate-300 dark:border-slate-700 dark:bg-slate-900"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="rememberMe"
                checked={formData.rememberMe}
                onChange={(e) => setFormData({ ...formData, rememberMe: e.target.checked })}
                className="w-4 h-4 rounded border-slate-300 text-[#2F6798] focus:ring-[#2F6798] accent-[#2F6798]"
              />
              <label htmlFor="rememberMe" className="text-xs text-slate-600 dark:text-slate-400 font-medium cursor-pointer select-none">
                Remember me
              </label>
            </div>

            <div className="pt-2 flex flex-col items-center">
              <Button
                type="submit"
                className="w-10/12 py-5 rounded-lg bg-[#2F6798] hover:bg-[#24527a] text-white font-bold text-sm tracking-wider uppercase transition-all shadow-md hover:shadow-lg mx-auto"
              >
                LOGIN
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-10/12 py-2 mt-6 -mb-3 rounded-lg border border-slate-200 hover:bg-slate-50 bg-slate-50/50 text-slate-700 font-normal text-xs transition-all shadow-sm mx-auto flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Continue with Google
              </Button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}