import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { dashboardAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Sprout, ArrowRight, BarChart3, Users, Globe,
  ShieldCheck, ChevronRight, Activity, Menu, X,
  CheckCircle2, MessageSquare, HelpCircle,
  Smartphone, Database, Map, Plus, Landmark,
  Award, Building2, Tractor, ArrowUpRight, Download, Apple
} from 'lucide-react';

/* ============================= */
/* ===== ANIMATED COUNTER ====== */
/* ============================= */

const AnimatedCounter = ({ value, duration = 2000, suffix = "" }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime = null;
    const stringVal = String(value).replace(/,/g, '');
    const endValue = parseFloat(stringVal) || 0;

    if (endValue === 0) return;

    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 4);
      setCount(endValue * easeProgress);

      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setCount(endValue);
      }
    };

    window.requestAnimationFrame(step);
  }, [value, duration]);

  let displayValue = count.toLocaleString('en-US', {
    maximumFractionDigits: String(value).includes('.') ? 1 : 0
  });

  return <>{displayValue}{suffix}</>;
};

/* ============================= */
/* ===== SCROLL REVEAL HOOK ==== */
/* ============================= */

const useScrollReveal = () => {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    if (ref.current) observer.observe(ref.current);
    return () => { if (ref.current) observer.unobserve(ref.current); };
  }, []);

  return [ref, isVisible];
};

/* ============================= */
/* ========= MAIN PAGE ========= */
/* ============================= */

export default function LandingPage() {
  const { user } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);

  const [showIOSModal, setShowIOSModal] = useState(false);

  // --- STATE TO HOLD DATABASE NUMBERS ---
  const [landingStats, setLandingStats] = useState({
    farmers: "12500",
    villages: "48",
    updates: "1.2",
    uptime: "99.9"
  });

  const [featuresRef, featuresVisible] = useScrollReveal();
  const [processRef, processVisible] = useScrollReveal();
  const [accessRef, accessVisible] = useScrollReveal();
  const [impactRef, impactVisible] = useScrollReveal();
  const [faqRef, faqVisible] = useScrollReveal();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // --- MOBILE MENU RESIZE LOGIC FIX ---
  useEffect(() => {
    const handleResize = () => {
      // Auto-close mobile menu if screen resizes to desktop to prevent body lock bug
      if (window.innerWidth >= 1024 && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [mobileMenuOpen]);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen || showIOSModal ? 'hidden' : '';
    // Cleanup to ensure body scrolls again if component unmounts
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen, showIOSModal]);

  // --- FETCH DATA FROM DATABASE ---
  useEffect(() => {
    const loadStats = async () => {
      if (!user) return; // Prevent unauthorized errors

      try {
        const response = await dashboardAPI.getStats({ range: 'all' });
        if (response && response.data) {
          setLandingStats({
            farmers: response.data.total_farmers ? response.data.total_farmers.toString() : "12500",
            villages: response.data.total_barangays ? response.data.total_barangays.toString() : "48",
            updates: response.data.total_logs ? (response.data.total_logs / 1000000).toFixed(1) : "1.2",
            uptime: "99.9"
          });
        }
      } catch (error) {
        console.error("Stats fetch error:", error);
      }
    };
    loadStats();
  }, [user]);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    window.addEventListener('appinstalled', () => {
      setIsInstallable(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    const isIOS = /ipad|iphone|ipod/.test(window.navigator.userAgent.toLowerCase()) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    if (!deferredPrompt) {
      alert("To install the web app, please use a secure HTTPS connection.");
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setIsInstallable(false);
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans selection:bg-emerald-100 selection:text-emerald-900 w-full overflow-x-hidden scroll-smooth flex flex-col relative">

      {/* --- NAVIGATION --- */}
      <nav className={`fixed top-0 w-full z-[1000] transition-all duration-300 border-b ${scrolled || mobileMenuOpen ? 'bg-white/95 backdrop-blur-md border-slate-200 py-3' : 'bg-transparent border-transparent py-4 sm:py-5'}`}>
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 flex items-center justify-between relative z-[1001]">

          <div className="flex items-center gap-1.5 sm:gap-2 cursor-pointer group">
  <div className="p-1 sm:p-1.5 bg-transparent rounded-lg sm:rounded-xl shrink-0 group-hover:scale-105 transition-transform">
    <img
      src="/logo.png"
      alt="logo"
      className="w-10 h-10 sm:w-12 sm:h-12 object-contain"
    />
  </div>
  <div className="flex flex-col shrink-0">
    <span className="text-lg sm:text-2xl font-black tracking-tight text-slate-900 leading-none uppercase">TANAW</span>
    <span className="text-[8px] sm:text-[10px] font-bold text-emerald-600 uppercase tracking-[0.25em] mt-0.5">System Hub</span>
  </div>
</div>

          <div className="hidden lg:flex items-center gap-6 xl:gap-10 text-[11px] font-bold uppercase tracking-widest text-slate-500">
            <a href="#features" className="hover:text-emerald-600 hover:-translate-y-0.5 transition-all">Tools</a>
            <a href="#process" className="hover:text-emerald-600 hover:-translate-y-0.5 transition-all">How it Works</a>
            <a href="#access" className="hover:text-emerald-600 hover:-translate-y-0.5 transition-all">Roles</a>
            <a href="#faq" className="hover:text-emerald-600 hover:-translate-y-0.5 transition-all">FAQ</a>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden lg:flex items-center gap-2 border-r border-slate-200 pr-4 mr-2">
              <button
                onClick={() => setShowIOSModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-slate-200 transition-all border border-slate-200 shadow-sm"
              >
                <Apple size={14} /> iOS Setup
              </button>

              <a href="/TANAW.apk" download="TANAW.apk" className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-700 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-emerald-100 border border-emerald-200 shadow-sm transition-all">
                <Download size={14} /> Android APK
              </a>
            </div>

            <Link to="/login" className={`hidden ${!mobileMenuOpen ? 'sm:block' : ''} lg:block text-[11px] font-bold uppercase tracking-widest text-slate-600 hover:text-slate-900 transition-colors px-2`}>
              Login
            </Link>
            <Link to="/register" className={`hidden ${!mobileMenuOpen ? 'sm:flex' : ''} lg:flex items-center gap-1.5 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-[10px] sm:text-[11px] font-bold uppercase tracking-widest hover:bg-slate-800 transition-all shadow-md group shrink-0`}>
              Get Started <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </Link>

            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors rounded-lg border border-slate-200 shadow-sm focus:outline-none shrink-0 relative z-[1001]">
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </nav>

      {/* --- MOBILE MENU --- */}
      {/* Moved outside of <nav> to fix backdrop-blur containing block bug */}
      <div className={`fixed inset-0 bg-white z-[990] flex flex-col pt-28 pb-6 px-6 lg:hidden transition-all duration-300 overflow-y-auto ${mobileMenuOpen ? 'opacity-100 visible translate-y-0 pointer-events-auto' : 'opacity-0 invisible -translate-y-8 pointer-events-none'}`}>
        <div className="flex flex-col gap-2 w-full max-w-sm mx-auto">
          <a href="#features" onClick={() => setMobileMenuOpen(false)} className="text-sm font-black uppercase tracking-widest text-slate-700 hover:text-emerald-600 w-full py-4 px-4 bg-slate-50 rounded-xl border border-slate-100">Main Tools</a>
          <a href="#process" onClick={() => setMobileMenuOpen(false)} className="text-sm font-black uppercase tracking-widest text-slate-700 hover:text-emerald-600 w-full py-4 px-4 bg-slate-50 rounded-xl border border-slate-100">Our System</a>
          <a href="#access" onClick={() => setMobileMenuOpen(false)} className="text-sm font-black uppercase tracking-widest text-slate-700 hover:text-emerald-600 w-full py-4 px-4 bg-slate-50 rounded-xl border border-slate-100">User Roles</a>

          <div className="w-full h-px bg-slate-200 my-4" />

          <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 mb-2">
            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-3 block">App Installation</span>

            <button
              onClick={() => { setShowIOSModal(true); setMobileMenuOpen(false); }}
              className="w-full text-xs font-bold uppercase tracking-widest text-slate-700 mb-2 py-3.5 flex items-center justify-center gap-2 border border-slate-300 bg-white active:bg-slate-50 rounded-xl transition-colors shadow-sm"
            >
              <Apple size={16} /> iOS Setup Guide
            </button>

            <a
              href="/TANAW.apk"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-xs font-bold uppercase tracking-widest text-white mb-2 py-3.5 flex items-center justify-center gap-2 border border-emerald-600 bg-emerald-600 active:bg-emerald-700 rounded-xl transition-colors shadow-sm"
            >
              <Download size={16} /> Android APK Download
            </a>

            {isInstallable && (
              <button
                onClick={() => { handleInstallClick(); setMobileMenuOpen(false); }}
                className="w-full text-xs font-bold uppercase tracking-widest text-blue-700 py-3.5 flex items-center justify-center gap-2 border border-blue-200 bg-blue-50 active:bg-blue-100 rounded-xl transition-colors shadow-sm"
              >
                <Plus size={16} /> Browser Install
              </button>
            )}
          </div>

          <div className="w-full h-px bg-slate-200 my-2" />

          <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="text-xs font-black uppercase tracking-widest text-slate-600 mb-2 py-4 w-full text-center active:bg-slate-50 rounded-xl">Access Portal</Link>
          <Link to="/register" onClick={() => setMobileMenuOpen(false)} className="w-full flex justify-center py-4 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-xl active:scale-95 transition-transform">
            Create Account
          </Link>
        </div>
      </div>

      {/* --- HERO SECTION --- */}
      <header className="relative pt-36 pb-16 sm:pt-48 sm:pb-24 px-4 isolate bg-white border-b border-slate-200 overflow-hidden">
        <div
          className="absolute inset-0 z-[-1] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMiAzMiIgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiBmaWxsPSJub25lIiBzdHJva2U9IiNmMThmNWEiPjxwYXRoIGQ9Ik0wIC41SDMxLjVWMzIiLz48L3N2Zz4=')] opacity-50"
          style={{ WebkitMaskImage: 'linear-gradient(to bottom, white, transparent)', maskImage: 'linear-gradient(to bottom, white, transparent)' }}
        />

        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-emerald-400/10 blur-[100px] rounded-full -z-10 pointer-events-none" />

        <div className="max-w-[1200px] mx-auto text-center relative z-10">

          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-50 border border-emerald-200/60 rounded-full text-emerald-700 text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] mb-8 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-700 backdrop-blur-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            Modern Farming Tools for Everyone
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-slate-900 tracking-tight leading-[1.05] mb-6 uppercase">
            Better Data. <br className="hidden sm:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">Better Farming.</span>
          </h1>

          <p className="max-w-2xl mx-auto text-sm sm:text-lg text-slate-500 font-medium leading-relaxed mb-10 sm:mb-14 px-2">
            A simple system for local governments. Keep track of farmers, see what is being grown, and get easy reports to help your community.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 max-w-3xl mx-auto animate-in fade-in slide-in-from-bottom-10 duration-700 px-4">

            <Link to="/register" className="w-full sm:w-auto flex-1 sm:flex-none min-w-[200px] px-6 py-4 bg-slate-900 text-white rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-widest shadow-xl hover:bg-slate-800 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 group border border-slate-800">
              Start Now <ArrowUpRight className="w-4 h-4 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity" />
            </Link>

            <a
              href="/TANAW.apk"
              download="TANAW.apk"
              className="w-full sm:w-auto flex-1 sm:flex-none min-w-[200px] px-6 py-4 bg-emerald-50 text-emerald-700 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-widest shadow-sm hover:bg-emerald-100 hover:shadow-md active:translate-y-0 transition-all flex items-center justify-center gap-2 border border-emerald-200"
            >
              <Download className="w-4 h-4 shrink-0" /> Android .APK
            </a>

            <button
              onClick={() => setShowIOSModal(true)}
              className="w-full sm:w-auto flex-1 sm:flex-none min-w-[200px] px-6 py-4 bg-white text-slate-700 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-widest shadow-sm hover:bg-slate-50 hover:shadow-md active:translate-y-0 transition-all flex items-center justify-center gap-2 border border-slate-200"
            >
              <Apple className="w-4 h-4 shrink-0" /> iOS Setup Guide
            </button>

          </div>

          {/* Stats Bar */}
          <div className="mt-16 sm:mt-28 grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 max-w-5xl mx-auto border-t border-slate-100 pt-10 sm:pt-14 animate-in fade-in duration-1000 delay-500 px-4">
            {[
              { label: 'Farmers Registered', val: landingStats.farmers, suffix: '+' },
              { label: 'Villages Covered', val: landingStats.villages, suffix: '' },
              { label: 'Updates Logged', val: landingStats.updates, suffix: 'M' },
              { label: 'Always Online', val: landingStats.uptime, suffix: '%' }
            ].map((stat, idx) => (
              <div key={idx} className="text-center group hover:-translate-y-1 transition-transform cursor-default">
                <div className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tighter group-hover:text-emerald-600 transition-colors">
                  <AnimatedCounter value={stat.val} suffix={stat.suffix} />
                </div>
                <div className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1.5 group-hover:text-slate-500 transition-colors">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </header>

      {/* --- PARTNERS --- */}
      <section className="py-8 bg-slate-50 border-b border-slate-200 relative z-20">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 overflow-hidden">
          <p className="text-center text-[9px] sm:text-[10px] font-black text-slate-400 mb-5 uppercase tracking-[0.2em]">Trusted by local leaders</p>
          <div className="flex flex-row flex-wrap justify-center items-center gap-x-8 gap-y-6 sm:gap-16 opacity-50 grayscale hover:grayscale-0 transition-all duration-700">
            <div className="flex items-center justify-center gap-2 font-black text-slate-800 text-sm sm:text-lg cursor-default tracking-tight"><Landmark className="text-slate-600 shrink-0 w-5 h-5 sm:w-6 sm:h-6" /> LGU Laguna</div>
            <div className="flex items-center justify-center gap-2 font-black text-slate-800 text-sm sm:text-lg cursor-default tracking-tight"><Award className="text-slate-600 shrink-0 w-5 h-5 sm:w-6 sm:h-6" /> DAR Phil</div>
            <div className="flex items-center justify-center gap-2 font-black text-slate-800 text-sm sm:text-lg cursor-default tracking-tight"><Building2 className="text-slate-600 shrink-0 w-5 h-5 sm:w-6 sm:h-6" /> DOST Region IV-A</div>
          </div>
        </div>
      </section>

      {/* --- HOW IT WORKS --- */}
      <section id="process" className="py-20 sm:py-32 overflow-hidden relative px-4 bg-white">
        <div className="max-w-[1200px] mx-auto relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">

            <div ref={processRef} className={`flex-1 space-y-6 text-center lg:text-left w-full transition-all duration-1000 ${processVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'}`}>
              <div>
                <span className="text-[10px] font-black text-emerald-600 mb-3 block uppercase tracking-[0.2em]">Our Simple Plan</span>
                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-[1.1] uppercase">How it works</h2>
                <p className="text-slate-500 text-sm sm:text-base mt-4 max-w-lg mx-auto lg:mx-0 font-medium leading-relaxed">Turn your paper files into a fast, digital system that helps you manage everything without any stress.</p>
              </div>

              <div className="text-left max-w-sm mx-auto lg:mx-0 w-full flex flex-col pt-6">
                <ProcessStep number="01" title="Easy Sign-up" desc="Add farmers quickly using a phone or tablet while you are out in the field." icon={Smartphone} />
                <ProcessStep number="02" title="Safe Storage" desc="Keep all harvest data and farming info in one secure, digital place." icon={Database} />
                <ProcessStep number="03" title="Smart Maps & Reports" desc="Easily see farming maps and reports to help make better decisions for your community." icon={Map} isLast={true} />
              </div>
            </div>

            <div className={`flex-1 w-full relative mt-10 lg:mt-0 transition-all duration-1000 delay-300 ${processVisible ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'}`}>
              <div className="relative bg-slate-100 rounded-[2rem] sm:rounded-[2.5rem] p-3 sm:p-4 border border-slate-200/60 shadow-2xl shadow-slate-200/50">
                <div className="absolute inset-0 bg-gradient-to-tr from-emerald-100/50 to-transparent rounded-[2rem] sm:rounded-[2.5rem] -z-10" />
                <img
                  src="https://images.unsplash.com/photo-1550989460-0adf9ea622e2?auto=format&fit=crop&q=80&w=800"
                  alt="System Preview"
                  className="rounded-2xl sm:rounded-3xl shadow-sm relative z-10 w-full h-auto object-cover aspect-[4/3] sm:aspect-[16/10] border border-slate-200/50"
                />

                <div className="absolute -bottom-5 -right-2 sm:-bottom-8 sm:-right-8 bg-white p-4 sm:p-6 rounded-2xl shadow-xl z-20 border border-slate-100 flex items-center gap-4 animate-float">
                  <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-100/50">
                    <Activity className="text-emerald-600 w-5 h-5 shrink-0" />
                  </div>
                  <div>
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">System Status</div>
                    <div className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2 uppercase tracking-tight">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.6)]"></span> Running Great
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* --- TOOLS SECTION --- */}
      <section id="features" className="py-20 sm:py-32 bg-slate-50 relative px-4 border-t border-slate-200">
        <div className="max-w-[1400px] mx-auto">
          <div ref={featuresRef} className={`text-center max-w-3xl mx-auto mb-16 sm:mb-20 transition-all duration-1000 ${featuresVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <span className="text-[10px] font-black text-blue-600 mb-3 block uppercase tracking-[0.2em]">What we offer</span>
            <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight mb-4 uppercase">Main Tools</h2>
            <p className="text-slate-500 text-sm sm:text-base font-medium leading-relaxed">Tools built to help local governments and research teams manage everything in one spot.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 px-2 sm:px-0">
            <FeatureCard icon={Users} title="Farmer Info" desc="Store details like farmer names, their families, and if their children will continue farming." delay="100" visible={featuresVisible} />
            <FeatureCard icon={BarChart3} title="Harvest Tracking" desc="Easily see how much is being grown and harvested across different types of crops." delay="200" visible={featuresVisible} />
            <FeatureCard icon={Globe} title="Area Mapping" desc="Use our interactive map to see exactly where farming is happening in your region." delay="300" visible={featuresVisible} />
            <FeatureCard icon={ShieldCheck} title="Safe & Private" desc="Your data is safe with us. We use strong security to keep everything private and protected." delay="400" visible={featuresVisible} />
            <FeatureCard icon={Activity} title="Manage Projects" desc="Keep track of ongoing farming projects and see if they are reaching their goals." delay="500" visible={featuresVisible} />
            <FeatureCard icon={Sprout} title="Farming Stories" desc="A place to save farming tips, local problems, and success stories from the field." delay="600" visible={featuresVisible} />
          </div>
        </div>
      </section>

      {/* --- ACCESS ROLES SECTION --- */}
      <section id="access" ref={accessRef} className="py-20 sm:py-32 bg-slate-900 text-white relative px-4 overflow-hidden isolate">
        <div
          className="absolute inset-0 z-[-1] bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMiAzMiIgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiBmaWxsPSJub25lIiBzdHJva2U9IiMzMzQxNTUiPjxwYXRoIGQ9Ik0wIC41SDMxLjVWMzIiLz48L3N2Zz4=')] opacity-20"
        />

        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-emerald-500/10 blur-[120px] rounded-full -z-10" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/10 blur-[120px] rounded-full -z-10" />

        <div className={`max-w-[1000px] mx-auto relative z-10 transition-all duration-1000 ${accessVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="text-center mb-16 sm:mb-20">
            <span className="text-[10px] font-black text-emerald-400 mb-3 block uppercase tracking-[0.2em]">Platform Access</span>
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight mb-4 uppercase">User Roles</h2>
            <p className="text-slate-400 text-sm sm:text-base font-medium max-w-lg mx-auto">Different ways to join our community based on your role.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl mx-auto px-2 sm:px-0">
            {/* Farmer Card */}
            <div className={`p-8 sm:p-12 rounded-[2.5rem] border transition-all duration-500 flex flex-col h-full relative bg-slate-800/50 border-slate-700/50 backdrop-blur-sm group hover:border-emerald-500/50`}>
              <div className="relative z-10">
                <h3 className="text-[10px] font-black uppercase tracking-[0.25em] mb-4 text-slate-400">Farmer & Mentee</h3>
                <div className="flex items-baseline gap-1.5 mb-4">
                  <span className="text-4xl sm:text-5xl font-black tracking-tighter text-white">PORTAL</span>
                </div>
                <p className="text-sm mb-8 font-medium leading-relaxed text-slate-400">For farmers and their successors to manage their own farm profiles.</p>
                <div className="space-y-4 mb-10 flex-1 border-t pt-8 border-slate-700/50">
                  <div className="flex items-center gap-3 text-xs sm:text-sm font-bold">
                    <CheckCircle2 size={16} className="shrink-0 text-emerald-500" strokeWidth={3} />
                    <span className="text-slate-300">Update your farming info</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs sm:text-sm font-bold">
                    <CheckCircle2 size={16} className="shrink-0 text-emerald-500" strokeWidth={3} />
                    <span className="text-slate-300">Post field experiences</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs sm:text-sm font-bold">
                    <CheckCircle2 size={16} className="shrink-0 text-emerald-500" strokeWidth={3} />
                    <span className="text-slate-300">View local crop data</span>
                  </div>
                </div>
                <Link to="/register" className="block w-full py-4 rounded-xl font-black text-center text-[10px] sm:text-xs uppercase tracking-widest transition-all shadow-md active:scale-95 shrink-0 bg-slate-700 text-white hover:bg-slate-600">
                  Register for Portal
                </Link>
              </div>
            </div>

            {/* Admin Card */}
            <div className={`p-8 sm:p-12 rounded-[2.5rem] border transition-all duration-500 flex flex-col h-full relative bg-white border-slate-200 shadow-2xl lg:scale-105 z-10`}>
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-[40px] rounded-tr-[2.5rem] -z-0 opacity-50" />
              <div className="relative z-10">
                <h3 className="text-[10px] font-black uppercase tracking-[0.25em] mb-4 text-emerald-600">Office Access</h3>
                <div className="flex items-baseline gap-1.5 mb-4">
                  <span className="text-4xl sm:text-5xl font-black tracking-tighter text-slate-900">ADMIN</span>
                </div>
                <p className="text-sm mb-8 font-medium leading-relaxed text-slate-600">For office officials to manage the city-wide farmer registry.</p>
                <div className="space-y-4 mb-10 flex-1 border-t pt-8 border-slate-100">
                  <div className="flex items-center gap-3 text-xs sm:text-sm font-bold">
                    <CheckCircle2 size={16} className="shrink-0 text-emerald-500" strokeWidth={3} />
                    <span className="text-slate-700">Manage all farmer accounts</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs sm:text-sm font-bold">
                    <CheckCircle2 size={16} className="shrink-0 text-emerald-500" strokeWidth={3} />
                    <span className="text-slate-700">Full Maps & Analytics</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs sm:text-sm font-bold">
                    <CheckCircle2 size={16} className="shrink-0 text-emerald-500" strokeWidth={3} />
                    <span className="text-slate-700">System Activity Logs</span>
                  </div>
                </div>
                <Link to="/register" className="block w-full py-4 rounded-xl font-black text-center text-[10px] sm:text-xs uppercase tracking-widest transition-all shadow-md active:scale-95 shrink-0 bg-slate-900 text-white hover:bg-slate-800 hover:shadow-xl">
                  Request Admin Access
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- TESTIMONIALS --- */}
      <section id="impact" ref={impactRef} className="py-20 sm:py-32 bg-white px-4 border-b border-slate-100">
        <div className={`max-w-[1400px] mx-auto transition-all duration-1000 ${impactVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="text-center mb-16 sm:mb-20">
            <span className="text-[10px] font-black text-emerald-600 mb-3 block uppercase tracking-[0.2em]">Real Results</span>
            <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight uppercase">Success Stories</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 px-2 sm:px-0">
            <TestimonialCard quote="We now know exactly who needs help based on real harvest numbers. No more guessing." author="Engr. Mateo Cruz" role="Provincial Office" delay="100" />
            <TestimonialCard quote="Mapping helped us get insurance for our farmers twice as fast as before." author="Maria Santos" role="Co-op Manager" delay="200" />
            <TestimonialCard quote="Being able to download data easily saves my research team weeks of hard work." author="Dr. Alan Rivera" role="Lead Researcher" delay="300" />
          </div>
        </div>
      </section>

      {/* --- FAQ --- */}
      <section id="faq" ref={faqRef} className="py-20 sm:py-32 bg-slate-50 px-4">
        <div className={`max-w-3xl mx-auto transition-all duration-1000 ${faqVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <div className="text-center mb-12 sm:mb-16">
            <div className="flex justify-center mb-5"><HelpCircle className="text-slate-300 w-10 h-10 sm:w-12 sm:h-12 shrink-0" /></div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight uppercase leading-none">Common Questions</h2>
          </div>
          <div className="space-y-4 px-2 sm:px-0">
            <FAQItem question="Who owns the data in the system?" answer="You do. Your local office or group owns all the records. TANAW just provides the tools to help you manage and keep them safe." />
            <FAQItem question="Can I use it without internet?" answer="Yes. You can add farmer details even without internet. It saves to your phone and will update once you find a connection." />
            <FAQItem question="Can I download my data?" answer="Yes. Authorized users can download all their data as a simple file (CSV) whenever they need it." />
          </div>
        </div>
      </section>

      {/* --- CTA --- */}
      <section className="py-16 sm:py-24 px-4 bg-white relative z-10">
        <div className="max-w-[1200px] mx-auto">
          <div className="bg-slate-900 rounded-[2.5rem] p-10 sm:p-20 text-center relative overflow-hidden shadow-2xl border border-slate-800">
            <div className="absolute inset-0 z-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAzMiAzMiIgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiBmaWxsPSJub25lIiBzdHJva2U9IiMzMzQxNTUiPjxwYXRoIGQ9Ik0wIC41SDMxLjVWMzIiLz48L3N2Zz4=')] opacity-10" />

            <div className="relative z-10 max-w-2xl mx-auto flex flex-col items-center">
              <h2 className="text-3xl sm:text-5xl font-black text-white mb-5 tracking-tight uppercase leading-tight">Update Your <br className="hidden sm:block" />Farming Records Today</h2>
              <p className="text-slate-400 text-sm sm:text-base mb-10 font-medium max-w-md mx-auto leading-relaxed">Join other cities that are making farming data easier to handle. It is safe, fast, and ready to grow with you.</p>

              <div className="flex flex-col sm:flex-row justify-center gap-4 w-full sm:w-auto">
                <Link to="/register" className="w-full sm:w-auto px-8 py-4 bg-emerald-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-600/20 hover:bg-emerald-500 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 shrink-0">
                  Setup Now <ArrowUpRight className="w-4 h-4 shrink-0 opacity-80" />
                </Link>

                <a
                  href="/TANAW.apk"
                  download="TANAW.apk"
                  className="w-full sm:w-auto flex-1 sm:flex-none min-w-[200px] px-6 py-4 bg-emerald-50 text-emerald-700 rounded-xl text-[11px] sm:text-xs font-black uppercase tracking-widest shadow-sm hover:bg-emerald-100 hover:shadow-md active:translate-y-0 transition-all flex items-center justify-center gap-2 border border-emerald-200"
                >
                  <Download className="w-4 h-4 shrink-0" /> Android .APK
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="bg-white border-t border-slate-200 pt-12 pb-8 px-4 relative z-10">
        <div className="max-w-[1400px] mx-auto text-center md:text-left">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-slate-900 rounded-lg shrink-0"><Sprout className="text-white w-4 h-4 sm:w-5 sm:h-5 shrink-0" /></div>
              <span className="text-lg font-black text-slate-900 tracking-tight leading-none uppercase">TANAW Systems</span>
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">© 2026 Registry. Safe and Secure.</p>
            <div className="flex gap-5">
              {['Twitter', 'LinkedIn', 'GitHub'].map(s => <div key={s} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer">{s}</div>)}
            </div>
          </div>
        </div>
      </footer>

      {/* --- iOS MODAL --- */}
      {showIOSModal && (
        <div
          className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4 sm:p-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300"
          onClick={() => setShowIOSModal(false)}
        >
          <div
            className="bg-white w-full max-w-sm rounded-[2rem] p-6 sm:p-8 shadow-2xl animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-500 border border-slate-100"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-6">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-100 shadow-sm">
                <Apple className="w-6 h-6 text-slate-800" />
              </div>
              <button onClick={() => setShowIOSModal(false)} className="p-2 bg-slate-50 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase mb-2">Install on iOS</h3>
            <p className="text-slate-500 text-sm font-medium mb-6 leading-relaxed">Apple restricts direct web installations. To install TANAW natively on your iPhone or iPad, follow these quick steps:</p>

            <div className="space-y-4 mb-8 p-5 bg-slate-50 border border-slate-100 rounded-2xl">
              <div className="flex gap-3 items-center text-sm font-bold text-slate-700">
                <span className="w-6 h-6 rounded-full bg-white border border-slate-200 text-slate-400 flex items-center justify-center shrink-0 shadow-sm text-xs">1</span>
                <span>Open this page in <strong className="text-slate-900">Safari</strong>.</span>
              </div>
              <div className="flex gap-3 items-center text-sm font-bold text-slate-700">
                <span className="w-6 h-6 rounded-full bg-white border border-slate-200 text-slate-400 flex items-center justify-center shrink-0 shadow-sm text-xs">2</span>
                <span>Tap the <strong className="text-blue-600">Share</strong> icon at the bottom.</span>
              </div>
              <div className="flex gap-3 items-center text-sm font-bold text-slate-700">
                <span className="w-6 h-6 rounded-full bg-white border border-slate-200 text-slate-400 flex items-center justify-center shrink-0 shadow-sm text-xs">3</span>
                <span>Scroll down and tap <strong className="text-slate-900">Add to Home Screen <Plus className="inline w-3.5 h-3.5 ml-0.5 text-slate-400" /></strong>.</span>
              </div>
            </div>

            <button onClick={() => setShowIOSModal(false)} className="w-full py-4 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 active:scale-95 transition-all shadow-md">
              Got it
            </button>
          </div>
        </div>
      )}

      {/* Global CSS Injections for animations */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } }
        .animate-float { animation: float 6s ease-in-out infinite; }
      `}} />
    </div>
  );
}

/* ============================= */
/* ===== HELPER COMPONENTS ===== */
/* ============================= */

function FeatureCard({ icon: Icon, title, desc, visible, delay }) {
  return (
    <div
      style={{ transitionDelay: `${delay}ms` }}
      className={`bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:border-emerald-200 hover:-translate-y-1 transition-all duration-500 flex flex-col ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}
    >
      <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-[14px] flex items-center justify-center mb-6">
        <Icon className="w-5 h-5 text-emerald-600 shrink-0" strokeWidth={2.5} />
      </div>
      <h3 className="text-base font-black text-slate-900 mb-2 tracking-tight uppercase">{title}</h3>
      <p className="text-slate-500 text-xs sm:text-sm font-medium leading-relaxed flex-1">{desc}</p>
    </div>
  );
}

function ProcessStep({ number, title, desc, icon: Icon, isLast = false }) {
  return (
    <div className="flex gap-5 group h-full">
      <div className="flex flex-col items-center">
        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-50 text-slate-400 border border-slate-200 flex items-center justify-center font-black text-[10px] sm:text-xs shrink-0 group-hover:bg-slate-900 group-hover:text-white group-hover:border-slate-900 transition-all duration-500 shadow-sm">{number}</div>
        {!isLast && <div className="w-px flex-1 min-h-[24px] bg-slate-200 group-hover:bg-slate-300 my-2 shrink-0 transition-colors" />}
      </div>
      <div className="pb-8 pt-1 sm:pt-2">
        <div className="flex items-center gap-2.5 mb-2">
          <Icon className="text-emerald-500 w-4 h-4 shrink-0" strokeWidth={2.5} />
          <h4 className="font-black text-slate-900 tracking-tight text-sm sm:text-base uppercase">{title}</h4>
        </div>
        <p className="text-slate-500 text-xs sm:text-sm font-medium leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}

function TestimonialCard({ quote, author, role, delay }) {
  return (
    <div style={{ transitionDelay: `${delay}ms` }} className="bg-white p-8 sm:p-10 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-xl hover:border-emerald-100 transition-all duration-500 flex flex-col h-full group relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50/50 rounded-bl-[40px] -z-10 group-hover:scale-125 transition-transform duration-700" />
      <MessageSquare className="text-emerald-100 mb-6 w-8 h-8 shrink-0 group-hover:text-emerald-200 transition-colors" />
      <p className="text-slate-600 text-sm font-medium leading-relaxed flex-1 italic relative z-10">"{quote}"</p>
      <div className="mt-8 pt-6 border-t border-slate-50 relative z-10">
        <p className="font-black text-slate-900 text-xs uppercase tracking-tight mb-1">{author}</p>
        <p className="text-emerald-600 font-black text-[9px] uppercase tracking-[0.2em]">{role}</p>
      </div>
    </div>
  );
}

function FAQItem({ question, answer }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div onClick={() => setIsOpen(!isOpen)} className={`bg-white rounded-[1.5rem] border p-6 sm:p-8 transition-all duration-300 cursor-pointer shadow-sm hover:shadow-md ${isOpen ? 'border-emerald-200' : 'border-slate-100 hover:border-slate-200'}`}>
      <h4 className="font-black text-slate-900 text-sm sm:text-base flex justify-between items-center uppercase tracking-tight">
        <span className="pr-4 leading-relaxed">{question}</span>
        <div className={`p-2 rounded-xl transition-all duration-300 shrink-0 ${isOpen ? 'bg-emerald-50 text-emerald-600 rotate-45' : 'bg-slate-50 text-slate-400'}`}>
          <Plus className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" strokeWidth={3} />
        </div>
      </h4>
      <div className={`grid transition-all duration-300 ease-in-out ${isOpen ? 'grid-rows-[1fr] mt-4 opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
        <div className="overflow-hidden">
          <p className="text-slate-500 text-xs sm:text-sm font-medium leading-relaxed pt-2 border-t border-slate-50">
            {answer}
          </p>
        </div>
      </div>
    </div>
  );
}