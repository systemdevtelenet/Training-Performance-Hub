'use client';

import { useState } from 'react';
import { 
  User, 
  Camera, 
  Phone, 
  Mail, 
  ChevronDown, 
  Save,
  Briefcase,
  Building2,
  ShieldCheck,
  IdCard,
  MapPin
} from 'lucide-react';

export default function ProfilePage() {
  const [formData, setFormData] = useState({
    firstName: 'Nico',
    lastName: 'Reguero',
    employeeId: 'CTN-80429',
    email: 'n.reguero@cebutele.net',
    mobileNo: '+63 917 123 4567',
    role: 'Training Admin',
    department: 'Operations Training',
    assignedAccount: 'All Client Accounts',
    workSite: 'Cebu IT Park Hub - Tower 2'
  });

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Saved Profile:', formData);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Account Profile</h2>
          <p className="text-xs text-slate-500">Manage your operational credentials, contact details, and account scope</p>
        </div>
        <button
          onClick={handleSubmit}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#2F6798] hover:bg-[#24527a] text-white font-bold text-xs shadow-sm transition-colors"
        >
          <Save className="w-4 h-4" />
          Save Changes
        </button>
      </div>

      {/* Main Profile Card Container */}
      <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm flex flex-col lg:flex-row items-start gap-10">
        
        {/* Left Side: Circular Avatar with Upload Camera Badge */}
        <div className="flex flex-col items-center justify-center shrink-0 w-full lg:w-48 pt-4">
          <div className="relative">
            <div className="w-36 h-36 rounded-full bg-blue-100/80 p-2 border-4 border-blue-50 flex items-center justify-center">
              <div className="w-full h-full rounded-full bg-[#2F6798] flex items-center justify-center overflow-hidden">
                <User className="w-20 h-20 text-white/90 translate-y-2" />
              </div>
            </div>

            <button
              type="button"
              className="absolute bottom-1 right-1 w-9 h-9 rounded-full bg-[#2F6798] border-2 border-white text-white flex items-center justify-center shadow-md hover:bg-[#24527a] transition-colors"
              title="Upload Photo"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>
          <span className="mt-3 text-xs font-semibold text-slate-500">{formData.employeeId}</span>
        </div>

        {/* Right Side: Operations Profile Form */}
        <form onSubmit={handleSubmit} className="flex-1 space-y-8 w-full">
          
          {/* SECTION 1: BASIC & WORK INFORMATION */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-[#2F6798] tracking-wider uppercase">
              BASIC & WORK INFORMATION
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* First Name */}
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1.5 block">First Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#2F6798] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => handleChange('firstName', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 text-sm rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2F6798] text-slate-800 font-medium"
                  />
                </div>
              </div>

              {/* Last Name */}
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Last Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#2F6798] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => handleChange('lastName', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 text-sm rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2F6798] text-slate-800 font-medium"
                  />
                </div>
              </div>

              {/* Employee ID */}
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Employee ID</label>
                <div className="relative">
                  <IdCard className="w-4 h-4 text-[#2F6798] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={formData.employeeId}
                    onChange={(e) => handleChange('employeeId', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 text-sm rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2F6798] text-slate-800 font-medium"
                  />
                </div>
              </div>

              {/* Corporate Email */}
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Corporate Email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#2F6798] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 text-sm rounded-2xl border border-slate-200 bg-slate-50/60 focus:outline-none text-slate-800 font-medium"
                  />
                </div>
              </div>

              {/* Contact Mobile No. */}
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Mobile No.</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-[#2F6798] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={formData.mobileNo}
                    onChange={(e) => handleChange('mobileNo', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 text-sm rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2F6798] text-slate-800 font-medium"
                  />
                </div>
              </div>

              {/* System Role */}
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1.5 block">System Access Role</label>
                <div className="relative">
                  <ShieldCheck className="w-4 h-4 text-[#2F6798] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <select
                    value={formData.role}
                    onChange={(e) => handleChange('role', e.target.value)}
                    className="w-full pl-10 pr-10 py-3 text-sm rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2F6798] text-slate-800 font-medium appearance-none bg-white cursor-pointer"
                  >
                    <option value="Training Admin">Training Admin</option>
                    <option value="Operations Manager">Operations Manager</option>
                    <option value="Senior Trainer">Senior Trainer</option>
                    <option value="Quality Specialist">Quality Specialist</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

            </div>
          </div>

          <hr className="border-slate-100" />

          {/* SECTION 2: ORGANIZATIONAL & SCOPE DETAILS */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-[#2F6798] tracking-wider uppercase">
              ORGANIZATIONAL & SCOPE DETAILS
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              {/* Department */}
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Department</label>
                <div className="relative">
                  <Briefcase className="w-4 h-4 text-[#2F6798] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <select
                    value={formData.department}
                    onChange={(e) => handleChange('department', e.target.value)}
                    className="w-full pl-10 pr-10 py-3 text-sm rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2F6798] text-slate-800 font-medium appearance-none bg-white cursor-pointer"
                  >
                    <option value="Operations Training">Operations Training</option>
                    <option value="PST Division">PST Division</option>
                    <option value="Inhouse Training">Inhouse Training</option>
                    <option value="Quality Assurance">Quality Assurance</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Primary Assigned Client Account */}
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Assigned Client Account</label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-[#2F6798] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <select
                    value={formData.assignedAccount}
                    onChange={(e) => handleChange('assignedAccount', e.target.value)}
                    className="w-full pl-10 pr-10 py-3 text-sm rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2F6798] text-slate-800 font-medium appearance-none bg-white cursor-pointer"
                  >
                    <option value="All Client Accounts">All Client Accounts</option>
                    <option value="Silver Account">Silver Account</option>
                    <option value="Central Monitoring">Central Monitoring</option>
                    <option value="Administrative">Administrative</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Primary Site/Location */}
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1.5 block">Primary Work Site</label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-[#2F6798] absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={formData.workSite}
                    onChange={(e) => handleChange('workSite', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 text-sm rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2F6798] text-slate-800 font-medium"
                  />
                </div>
              </div>

            </div>
          </div>

        </form>

      </div>
    </div>
  );
}