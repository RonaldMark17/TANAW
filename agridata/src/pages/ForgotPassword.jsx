import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../services/api';
import { Mail, ArrowRight, Loader2, ChevronLeft, ShieldAlert, KeyRound, Lock, CheckCircle2, ShieldCheck, RotateCcw } from 'lucide-react';

export default function ForgotPassword() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState({ type: '', message: '' });
  const [loading, setLoading] = useState(false);
  
  // Resend Logic
  const [canResend, setCanResend] = useState(false);
  const [countdown, setCountdown] = useState(60);

  const navigate = useNavigate();

  useEffect(() => {
    let timer;
    if (step === 2 && countdown > 0) {
      timer = setInterval(() => setCountdown(prev => prev - 1), 1000);
    } else if (countdown === 0) {
      setCanResend(true);
    }
    return () => clearInterval(timer);
  }, [step, countdown]);

  const handleRequestOTP = async (e) => {
    if (e) e.preventDefault();
    setLoading(true);
    setStatus({ type: '', message: '' });
    setCanResend(false);
    setCountdown(60);

    try {
      await authAPI.requestOTP(email); 
      setStep(2);
      setStatus({ type: 'success', message: 'New verification code dispatched to your Gmail.' });
    } catch (err) {
      setStatus({ type: 'error', message: err.response?.data?.error || 'Failed to initiate protocol.' });
    } finally {
      setLoading(false);
    }
  };

  // ... (keep previous state and useEffect)

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus({ type: '', message: '' });

    try {
      // PROCESSED: Call backend to compare the entered code with the one sent via Gmail
      await authAPI.verifyOTP({ email, otp }); 
      
      setStep(3); // Only move to password reset if the backend returns 200 OK
      setStatus({ type: 'success', message: 'Identity confirmed. You may now define new credentials.' });
    } catch (err) {
      // FAILURE: Code did not match or session timed out
      setStatus({ 
        type: 'error', 
        message: err.response?.data?.error || 'Verification failed. Incorrect code.' 
      });
    } finally {
      setLoading(false);
    }
  };

// ... (keep handleResetPassword and JSX)

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setStatus({ type: 'error', message: 'Credential mismatch. Passwords must be identical.' });
      return;
    }

    setLoading(true);
    try {
      await authAPI.resetPassword({ email, otp, new_password: newPassword });
      setStatus({ type: 'success', message: 'Security keys updated. Redirecting to login...' });
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      // If backend dictionary was cleared or OTP expired
      setStatus({ type: 'error', message: 'Finalization failed. Session expired. Please restart the protocol.' });
      setTimeout(() => setStep(1), 2000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#F8FAFC] font-sans selection:bg-emerald-100">
      {/* LEFT SIDE: Visual Brand Dossier */}
      <div className="hidden lg:flex lg:w-[55%] relative bg-[#041d18] overflow-hidden">
        <img className="absolute inset-0 h-full w-full object-cover opacity-30 grayscale-[0.2]" src="https://images.unsplash.com/photo-1625246333195-78d9c38ad449?q=80&w=2070&auto=format&fit=crop" alt="Field Registry" />
        <div className="relative z-10 flex flex-col justify-center h-full p-20 w-full">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-md rounded-full border border-white/10 mb-8 text-emerald-400">
              <ShieldAlert size={14} />
              <span className="text-[10px] font-black uppercase tracking-widest">Access Recovery Protocol</span>
            </div>
            <h2 className="text-5xl font-black text-white leading-[1.1] tracking-tighter mb-6 uppercase">
              Identity <br />
              <span className="text-emerald-500 italic font-serif lowercase">restoration</span> portal.
            </h2>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: Progressive Recovery Form */}
      <div className="flex-1 flex flex-col justify-center px-8 sm:px-16 lg:px-24 bg-white relative">
        <div className="mx-auto w-full max-w-sm">
          <Link to="/login" className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-colors mb-10 group">
            <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 group-hover:border-emerald-200 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-all"><ChevronLeft size={16} /></div>
            <span className="text-[10px] font-black uppercase tracking-widest">Abort & Login</span>
          </Link>

          <header className="mb-10">
            <div className="flex items-center gap-2 mb-4">
                <span className={`h-1.5 w-8 rounded-full ${step >= 1 ? 'bg-emerald-500' : 'bg-slate-100'}`} />
                <span className={`h-1.5 w-8 rounded-full ${step >= 2 ? 'bg-emerald-500' : 'bg-slate-100'}`} />
                <span className={`h-1.5 w-8 rounded-full ${step >= 3 ? 'bg-emerald-500' : 'bg-slate-100'}`} />
            </div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tight uppercase mb-2">
              {step === 1 && 'Locate Account'}
              {step === 2 && 'Verify Identity'}
              {step === 3 && 'New Credentials'}
            </h2>
            <p className="text-slate-400 font-medium">
              {step === 1 && 'Enter your registered Gmail handle.'}
              {step === 2 && 'Input the 6-digit code sent to your inbox.'}
              {step === 3 && 'Define your new system access keys.'}
            </p>
          </header>

          {status.message && (
            <div className={`mb-8 p-6 border rounded-[1.5rem] flex gap-4 animate-in slide-in-from-top-2 ${status.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-600'}`}>
              <div className="p-2 bg-white rounded-full shadow-sm h-fit">{status.type === 'success' ? <CheckCircle2 size={18} /> : <ShieldAlert size={18} />}</div>
              <p className="text-sm font-bold leading-snug">{status.message}</p>
            </div>
          )}

          {/* STEP 1: EMAIL */}
          {step === 1 && (
            <form onSubmit={handleRequestOTP} className="space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Identity Gmail</label>
                <div className="relative group">
                  <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors" size={18} />
                  <input type="email" required className="w-full pl-14 pr-6 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold shadow-inner focus:ring-4 focus:ring-emerald-500/5 outline-none transition-all" placeholder="user@gmail.com" value={email} onChange={(e) => setEmail(e.target.value)} />
                </div>
              </div>
              <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-3 py-5 bg-slate-900 text-white rounded-[1.25rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl hover:bg-slate-800 active:scale-95 transition-all disabled:opacity-50">
                {loading ? <Loader2 className="animate-spin" size={18} /> : <>Request OTP <ArrowRight size={16} /></>}
              </button>
            </form>
          )}

          {/* STEP 2: OTP VERIFICATION */}
          {step === 2 && (
            <form onSubmit={handleVerifyOTP} className="space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">6-Digit Code</label>
                <div className="relative group">
                  <KeyRound className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input type="text" maxLength="6" required className="w-full pl-14 pr-6 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold tracking-[0.5em] shadow-inner focus:ring-4 focus:ring-emerald-500/5 outline-none" placeholder="000000" value={otp} onChange={(e) => setOtp(e.target.value)} />
                </div>
              </div>
              <div className="space-y-4">
                <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-3 py-5 bg-slate-900 text-white rounded-[1.25rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl hover:bg-slate-800 active:scale-95 transition-all disabled:opacity-50">
                    {loading ? <Loader2 className="animate-spin" size={18} /> : <>Verify Code <ShieldCheck size={16} /></>}
                </button>
                <button 
                    type="button" 
                    disabled={!canResend || loading}
                    onClick={handleRequestOTP}
                    className="w-full flex items-center justify-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-emerald-600 transition-colors disabled:opacity-30"
                >
                    <RotateCcw size={12} /> {canResend ? 'Resend New Code' : `Resend available in ${countdown}s`}
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: PASSWORD RESET */}
          {step === 3 && (
            <form onSubmit={handleResetPassword} className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">New Access Key</label>
                <div className="relative group">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input type="password" required className="w-full pl-14 pr-6 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold shadow-inner focus:ring-4 focus:ring-emerald-500/5 outline-none" placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirm Access Key</label>
                <div className="relative group">
                  <Lock className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input type="password" required className="w-full pl-14 pr-6 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold shadow-inner focus:ring-4 focus:ring-emerald-500/5 outline-none" placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                </div>
              </div>
              <button type="submit" disabled={loading} className="w-full flex items-center justify-center gap-3 py-5 bg-emerald-600 text-white rounded-[1.25rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl hover:bg-emerald-500 active:scale-95 transition-all disabled:opacity-50">
                {loading ? <Loader2 className="animate-spin" size={18} /> : <>Update Credentials <CheckCircle2 size={16} /></>}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}