'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, BarChart3 } from 'lucide-react';
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
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-[#0A192F] via-[#0F2744] to-[#172A45]">
      {/* Centered Split Modal */}
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 md:grid-cols-2 min-h-[480px]">
        
        {/* Left Hero Panel */}
        <div className="bg-[#2F6798] p-8 flex flex-col items-center justify-center text-white text-center space-y-6 relative">
          <div className="relative flex items-center justify-center">
            <div className="w-24 h-24 rounded-full border-4 border-white/30 flex items-center justify-center bg-white/10 backdrop-blur-sm">
              <BarChart3 className="w-12 h-12 text-white" />
            </div>
          </div>

          <div className="space-y-1">
            <h1 className="text-2xl font-black tracking-wider uppercase">
              CEBU TELE-NET
            </h1>
            <p className="text-xs text-blue-100 font-medium tracking-wide">
              Training Performance Hub & Analytics
            </p>
          </div>
        </div>

        {/* Right Form Panel */}
        <div className="p-8 sm:p-12 flex flex-col justify-center bg-white">
          <h2 className="text-xl font-bold text-[#2F6798] text-center tracking-wider uppercase mb-8">
            LOGIN
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <input
                type="email"
                required
                placeholder="Email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-4 py-3 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2F6798] focus:border-transparent transition-all placeholder:text-slate-400 text-slate-800"
              />
            </div>

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-3 pr-10 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2F6798] focus:border-transparent transition-all placeholder:text-slate-400 text-slate-800"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
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
                className="w-4 h-4 rounded border-slate-300 text-[#2F6798] focus:ring-[#2F6798]"
              />
              <label htmlFor="rememberMe" className="text-xs text-slate-600 font-medium cursor-pointer select-none">
                Remember me
              </label>
            </div>

            <div className="pt-2">
              <Button
                type="submit"
                className="w-full py-6 rounded-full bg-[#2F6798] hover:bg-[#24527a] text-white font-bold text-sm tracking-wider uppercase transition-all shadow-md hover:shadow-lg"
              >
                LOGIN
              </Button>
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}