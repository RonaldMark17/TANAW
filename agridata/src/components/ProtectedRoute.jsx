import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, Loader2, Lock } from 'lucide-react';

export default function ProtectedRoute({ children, allowedRoles = [] }) {
  const { user, loading } = useAuth();

  // 1. PREMIUM LOADING STATE
  // Prevents the "Auto-Logout" flicker on refresh by showing a themed splash screen
  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-[#f8fafc] dark:bg-[#020c0a] transition-colors duration-500">
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full animate-pulse" />
          <Loader2 className="w-10 h-10 text-emerald-600 animate-spin relative z-10" />
        </div>
        <div className="mt-8 space-y-2 text-center relative z-10">
          <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.4em] animate-pulse">
            TANAW Security
          </p>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
            Verifying Session Integrity...
          </p>
        </div>
      </div>
    );
  }

  // 2. UNAUTHORIZED REDIRECT
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 3. ACCESS DENIED (ROLE MISMATCH)
  // Replaced basic text with a polished "Restricted" card
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] dark:bg-[#020c0a] p-6 transition-colors duration-500">
        <div className="max-w-md w-full bg-white dark:bg-[#0b241f] rounded-[2.5rem] p-10 sm:p-14 border border-slate-100 dark:border-white/5 shadow-2xl text-center relative overflow-hidden">
          {/* Decorative Background Accent */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-bl-[100px] -z-0" />
          
          <div className="relative z-10">
            <div className="w-20 h-20 bg-rose-50 dark:bg-rose-500/10 rounded-[1.5rem] flex items-center justify-center mx-auto mb-8 border border-rose-100 dark:border-rose-500/20">
              <Lock className="text-rose-500 w-10 h-10" />
            </div>
            
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase mb-4">
              Access Restricted
            </h2>
            
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-relaxed mb-10">
              Your current role (<span className="text-rose-500 font-bold uppercase tracking-widest text-xs">{user.role}</span>) does not have the necessary clearance level to view this registry protocol.
            </p>
            
            <button 
              onClick={() => window.history.back()}
              className="w-full py-4 bg-slate-900 dark:bg-emerald-600 text-white rounded-xl sm:rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:scale-105 active:scale-95 transition-all"
            >
              Return to Previous
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 4. AUTHORIZED ACCESS
  return children;
}