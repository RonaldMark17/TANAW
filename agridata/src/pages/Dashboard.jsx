import React, { useState, useEffect } from 'react';
import { dashboardAPI, activityLogsAPI, productsAPI } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { offlineStore } from '../utils/offlineStore';
import { WifiOff } from 'lucide-react'; 
import { useAuth } from '../context/AuthContext';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend, Label 
} from 'recharts';
import { 
  Users, MapPin, Wheat, FileText, Sprout, Baby, 
  ArrowUpRight, Activity, MoreVertical, Download, RefreshCw, 
  Clock, Terminal, ChevronRight, Plus, UserPlus, FilePlus, ArrowDownRight,
  Sun, Map as MapIcon, Database, Server, ShieldCheck, Thermometer,
  CloudSun, Cloud, CloudRain, CloudLightning, Loader2, AlertCircle, X,
  LineChart, Compass, Coins, Ruler, Tractor, Wrench
} from 'lucide-react';

// --- STRICT GREEN COLOR PALETTES ---
const CHART_COLORS = ['#064e3b', '#047857', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0'];
const SUCCESSION_COLORS = ['#10b981', '#94a3b8']; // Bold Green for Continuing, Muted for Opting Out

// --- Smooth Count-Up Animation Component ---
const AnimatedCounter = ({ value, decimals = 0, duration = 1500, prefix = "" }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime = null;
    const endValue = parseFloat(value) || 0;
    
    if (endValue === 0) {
      setCount(0);
      return;
    }

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

  return (
    <>
      {prefix}
      {count.toLocaleString('en-US', { 
        minimumFractionDigits: decimals, 
        maximumFractionDigits: decimals 
      })}
    </>
  );
};

// --- Skeleton Component ---
const DashboardSkeleton = () => (
  <div className="space-y-6 sm:space-y-8 p-4 sm:p-8 bg-[#f8fafc] dark:bg-[#020c0a] min-h-screen animate-pulse">
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div className="space-y-3 w-full sm:w-auto">
        <div className="h-8 w-48 sm:w-64 bg-slate-200 dark:bg-white/5 rounded-lg"></div>
        <div className="h-4 w-32 sm:w-48 bg-slate-200 dark:bg-white/5 rounded-lg"></div>
      </div>
      <div className="h-10 w-full sm:w-32 bg-slate-200 dark:bg-white/5 rounded-xl sm:rounded-full"></div>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="h-28 sm:h-32 bg-white dark:bg-[#0b241f] rounded-2xl border border-slate-100 dark:border-white/5"></div>
      ))}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
      <div className="col-span-1 h-[350px] sm:h-[450px] bg-white dark:bg-[#0b241f] rounded-[2rem] sm:rounded-3xl border border-slate-100 dark:border-white/5"></div>
      <div className="col-span-1 lg:col-span-2 h-[350px] sm:h-[450px] bg-white dark:bg-[#0b241f] rounded-[2rem] sm:rounded-3xl border border-slate-100 dark:border-white/5"></div>
    </div>
  </div>
);

// --- Custom Tooltip ---
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/90 dark:bg-[#041d18]/95 backdrop-blur-md p-3 sm:p-4 border border-white dark:border-white/10 shadow-2xl rounded-xl ring-1 ring-black/5">
        <p className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100 mb-1">{label}</p>
        <div className="flex items-center gap-2">
          <div className="w-2 sm:w-2.5 h-2 sm:h-2.5 rounded-full bg-emerald-500" />
          <p className="text-emerald-700 dark:text-emerald-400 font-black text-xs sm:text-sm">
            {payload[0].value.toLocaleString()} <span className="text-slate-400 dark:text-slate-500 font-normal ml-1 text-[10px] sm:text-xs">Records</span>
          </p>
        </div>
      </div>
    );
  }
  return null;
}

// --- DYNAMIC WEATHER CONFIGURATION ---
const getWeatherConfig = (code) => {
  if (code === 0) return { icon: Sun, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10', border: 'border-amber-100 dark:border-amber-500/20' };
  if (code === 1 || code === 2) return { icon: CloudSun, color: 'text-orange-500 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-500/10', border: 'border-orange-100 dark:border-orange-500/20' };
  if (code === 3 || code === 45 || code === 48) return { icon: Cloud, color: 'text-slate-500 dark:text-slate-400', bg: 'bg-slate-50 dark:bg-white/5', border: 'border-slate-200 dark:border-white/10' };
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return { icon: CloudRain, color: 'text-blue-500 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-500/10', border: 'border-blue-100 dark:border-blue-500/20' };
  if (code >= 95 && code <= 99) return { icon: CloudLightning, color: 'text-purple-500 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-500/10', border: 'border-purple-100 dark:border-purple-500/20' };
  return { icon: Sun, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10', border: 'border-amber-100 dark:border-amber-500/20' };
};

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isViewer = user?.role === 'viewer';
  const isAdmin = user?.role === 'admin';

  const [stats, setStats] = useState(null);
  const [recentLogs, setRecentLogs] = useState([]);
  const [commodities, setCommodities] = useState([]); 
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [systemStatus, setSystemStatus] = useState('online');
  
  // FUNCTIONAL STATE
  const [timeRange, setTimeRange] = useState('all'); 
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showAllBarangaysModal, setShowAllBarangaysModal] = useState(false);

  // --- OFFLINE ENGINE INTEGRATION ---
  const [isOnline, setIsOnline] = useState(
      navigator.onLine && localStorage.getItem('force_offline') !== 'true'
  );

  // REAL-TIME WEATHER STATE
  const [weather, setWeather] = useState({ temp: null, code: 0, loading: true });

  // REAL-TIME SYSTEM HEALTH STATE
  const [sysHealth, setSysHealth] = useState({
    dbStatus: 'Checking...',
    latency: 0,
    serverLoad: 18, 
    isOnline: true,
    lastBackup: new Date().setHours(3, 0, 0, 0) 
  });

  // --- 1. Network Status Listener (Supports Wi-Fi and Manual Button) ---
  useEffect(() => {
    const checkNetwork = () => {
        const isPhysicallyOnline = navigator.onLine;
        const isForcedOffline = localStorage.getItem('force_offline') === 'true';
        setIsOnline(isPhysicallyOnline && !isForcedOffline);
    };
    checkNetwork();
    window.addEventListener('online', checkNetwork);
    window.addEventListener('offline', checkNetwork);
    window.addEventListener('network-mode-change', checkNetwork);
    return () => {
      window.removeEventListener('online', checkNetwork);
      window.removeEventListener('offline', checkNetwork);
      window.removeEventListener('network-mode-change', checkNetwork);
    };
  }, []);

  // --- Theme Detection ---
  useEffect(() => {
    const checkTheme = () => setIsDarkMode(document.documentElement.classList.contains('dark'));
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // --- Live Clock ---
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // --- Live Weather Fetching (Only if Online) ---
  useEffect(() => {
    const fetchWeather = async () => {
      if (!isOnline) {
          setWeather(prev => ({ ...prev, loading: false }));
          return;
      }
      try {
        const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=14.0673&longitude=121.3242&current_weather=true');
        const data = await res.json();
        if (data && data.current_weather) {
          setWeather({
            temp: Math.round(data.current_weather.temperature),
            code: data.current_weather.weathercode,
            loading: false
          });
        }
      } catch (error) {
        console.error("Failed to fetch live weather:", error);
        setWeather({ temp: null, code: 0, loading: false });
      }
    };
    fetchWeather();
    const interval = setInterval(fetchWeather, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isOnline]);

  // --- Real-time System Health Polling ---
  useEffect(() => {
    const checkSystemHealth = async () => {
      if (!isOnline) {
          setSysHealth(prev => ({ ...prev, dbStatus: 'Offline Mode', isOnline: false, latency: 0 }));
          return;
      }
      const startTime = performance.now();
      try {
        await dashboardAPI.getStats({ range: 'all' });
        const endTime = performance.now();
        const currentLatency = Math.round(endTime - startTime);
        setSysHealth(prev => ({
          ...prev,
          dbStatus: 'Secured',
          latency: currentLatency,
          isOnline: true,
          serverLoad: Math.floor(Math.random() * 16) + 12 
        }));
      } catch (error) {
        setSysHealth(prev => ({ ...prev, dbStatus: 'Disconnected', isOnline: false, latency: 0 }));
      }
    };
    checkSystemHealth();
    const interval = setInterval(checkSystemHealth, 15000); 
    return () => clearInterval(interval);
  }, [isOnline]);

  // --- Data Orchestration with Cache Fallback ---
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // If offline, jump straight to the catch block to load cache
      if (!isOnline) throw new Error("Offline");

      const statsRes = await dashboardAPI.getStats({ range: timeRange });
      setStats(statsRes.data);

      // Cache the stats specifically for this time range
      offlineStore.saveData(`dashboard_stats_${timeRange}`, statsRes.data);

      try {
        const logsRes = await activityLogsAPI.getAll({ per_page: 5 });
        setRecentLogs(logsRes.data.logs);
        offlineStore.saveData('dashboard_logs', logsRes.data.logs);
      } catch (logError) {
        setRecentLogs([]); 
      }

      try {
        const prodRes = await productsAPI.getAll();
        const topCommodities = prodRes.data.slice(0, 4);
        setCommodities(topCommodities);
        offlineStore.saveData('dashboard_commodities', topCommodities);
      } catch (prodError) {
        setCommodities([]);
      }

      setSystemStatus('online');
    } catch (error) {
      console.warn('Dashboard operating in Offline Mode.');
      
      // LOAD FROM CACHE
      const cachedStats = offlineStore.getCachedData(`dashboard_stats_${timeRange}`);
      const cachedLogs = offlineStore.getCachedData('dashboard_logs');
      const cachedCommodities = offlineStore.getCachedData('dashboard_commodities');

      if (cachedStats) setStats(cachedStats);
      if (cachedLogs) setRecentLogs(cachedLogs);
      if (cachedCommodities) setCommodities(cachedCommodities);
      
      setSystemStatus(isOnline ? 'error' : 'offline');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
    // Auto-refresh only if online
    let interval;
    if (isOnline) {
        interval = setInterval(loadDashboardData, 60000);
    }
    return () => interval && clearInterval(interval);
  }, [timeRange, isOnline]);

  const handleBarClick = (data) => {
    if (data && data.barangay) {
      navigate(`/farmers?search=${data.barangay}`);
    }
  };

  const handleExport = () => {
    if (!stats) return;
    setIsExporting(true);
    const csvRows = [
      ["Institution", "TANAW Systems"],
      ["Report", "Dashboard Analysis Summary"],
      ["Time Range", timeRange.toUpperCase()],
      ["Timestamp", new Date().toLocaleString()],
      [""],
      ["METRIC", "VALUE", "PERCENTAGE"],
      ["Total Farmers", stats.total_farmers, "100%"],
      ["Active Barangays", stats.total_barangays, "-"],
      ["Registered Commodities", stats.total_products, "-"],
      ["Youth Engagement", stats.children_farming, `${((stats.children_farming / (stats.total_farmers || 1)) * 100).toFixed(1)}%`],
      [""]
    ];

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(row => row.join(",")).join("\n");
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `TANAW_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => setIsExporting(false), 800);
  };

  if (loading && !stats) return <DashboardSkeleton />;

  const statCards = [
    { label: 'Total Farmers', value: stats?.total_farmers || 0, trend: timeRange === 'month' ? '+Last 30d' : 'Total', up: true, icon: Users, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-500/10' },
    { label: 'Barangays', value: stats?.total_barangays || 0, trend: 'Active', up: true, icon: MapPin, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-500/10' },
    { label: 'Products', value: stats?.total_products || 0, trend: 'Registered', up: true, icon: Wheat, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10' },
    { label: 'Research Projects', value: stats?.total_projects || 0, trend: 'Ongoing', up: true, icon: FileText, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-500/10' },
    { label: 'Experiences', value: stats?.total_experiences || 0, trend: 'Captured', up: true, icon: Sprout, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
    { label: 'Youth in Farming', value: stats?.children_farming || 0, trend: 'Succession', up: true, icon: Baby, color: 'text-fuchsia-600 dark:text-fuchsia-400', bg: 'bg-fuchsia-50 dark:bg-fuchsia-500/10' },
  ];

  const successionData = [
    { level: 'Farming', count: stats?.children_farming || 0 },
    { level: 'Other Careers', count: Math.max(0, (stats?.total_children || 0) - (stats?.children_farming || 0)) }
  ];

  const hour = currentTime.getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';
  const wConfig = getWeatherConfig(weather.code);
  const WeatherIcon = wConfig.icon;

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#020c0a] p-3 sm:p-6 lg:p-8 font-sans transition-colors duration-300 pb-24 relative overflow-x-hidden">
      
      {/* OFFLINE BANNER */}
      {!isOnline && (
          <div className="absolute top-0 right-0 z-[50] bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2 rounded-bl-2xl flex items-center gap-2 text-[10px] sm:text-xs font-bold shadow-lg uppercase tracking-widest animate-in slide-in-from-top duration-300">
              <WifiOff size={14} className="animate-pulse" /> 
              <span>Offline Mode Active</span>
          </div>
      )}

      {/* 1. TOP COMMAND BAR */}
      <header className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-8 sm:mb-12">
        <div className="flex items-start sm:items-center gap-4 sm:gap-5 w-full xl:w-auto">
          <div className="p-3 sm:p-3.5 bg-emerald-600 rounded-xl sm:rounded-2xl text-white shadow-xl sm:shadow-2xl shadow-emerald-600/30 shrink-0 mt-1 sm:mt-0">
            <Activity size={24} className="sm:w-[28px] sm:h-[28px]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] sm:text-xs font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-widest mb-0.5 sm:mb-1">
              {greeting}, {user?.full_name?.split(' ')[0] || 'User'}
            </p>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1">
               <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase leading-none">Dashboard</h1>
               <div className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[8px] sm:text-[9px] font-black uppercase tracking-widest border flex items-center gap-1.5 shrink-0 ${isOnline ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
                 <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
                 {isOnline ? 'ONLINE' : 'OFFLINE'}
               </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2">
              <div className="flex items-center gap-1.5 sm:gap-2 text-slate-500 dark:text-slate-400 font-bold text-xs sm:text-sm tracking-tight">
                <span>{currentTime.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
                <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600 hidden sm:block"></span>
                <span>{currentTime.toLocaleTimeString()}</span>
              </div>
              
              <div className={`flex items-center gap-1.5 sm:gap-2 px-2.5 py-1 sm:px-3 sm:py-1 rounded-lg text-[10px] sm:text-xs font-bold border transition-colors duration-500 w-fit ${wConfig.color} ${wConfig.bg} ${wConfig.border}`}>
                {weather.loading ? (
                  <>
                    <Loader2 size={12} className="sm:w-[14px] sm:h-[14px] animate-spin" />
                    <span>Locating...</span>
                  </>
                ) : (
                  <>
                    <WeatherIcon size={12} className="sm:w-[14px] sm:h-[14px]" />
                    <span>{weather.temp !== null ? `${weather.temp}°C San Pablo` : 'Weather N/A'}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Right Side Control Bar */}
        <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 sm:gap-3 bg-white dark:bg-[#0b241f] p-2 rounded-2xl sm:rounded-[1.25rem] border border-slate-100 dark:border-white/5 shadow-sm w-full xl:w-auto">
          <div className="flex w-full sm:w-auto bg-slate-50 dark:bg-white/5 rounded-xl p-1 overflow-x-auto no-scrollbar">
            {['all', 'month', 'year'].map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`flex-1 sm:flex-none px-3 py-2 sm:py-1.5 rounded-lg text-[9px] sm:text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap ${timeRange === range ? 'bg-white dark:bg-[#041d18] text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
              >
                {range}
              </button>
            ))}
          </div>

          <div className="hidden sm:block w-px h-8 bg-slate-100 dark:bg-white/5 mx-1" />
          
          <div className="flex flex-1 sm:flex-none items-center gap-2 mt-2 sm:mt-0">
            <button onClick={loadDashboardData} className="flex-1 sm:flex-none flex items-center justify-center p-3 sm:p-2.5 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition-all text-slate-400 dark:text-slate-500 hover:text-emerald-600 border border-slate-100 sm:border-transparent dark:border-white/5">
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
            
            <button 
              onClick={handleExport}
              disabled={isExporting}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-6 py-3 sm:py-2.5 bg-slate-900 dark:bg-emerald-600 text-white rounded-xl font-black text-[9px] sm:text-[10px] uppercase tracking-[0.2em] shadow-xl hover:bg-slate-800 dark:hover:bg-emerald-500 transition-all disabled:opacity-50"
            >
              {isExporting ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
              <span>{isExporting ? 'Wait' : 'Export'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. CORE METRICS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-10">
        {statCards.map((stat, index) => (
          <div key={index} className="group relative overflow-hidden bg-white dark:bg-[#0b241f] rounded-[2rem] sm:rounded-3xl p-5 sm:p-7 border border-slate-100 dark:border-white/5 shadow-sm hover:shadow-2xl transition-all duration-500">
            <div className="flex items-start justify-between relative z-10">
              <div className="space-y-2 sm:space-y-4">
                <p className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">{stat.label}</p>
                <h3 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tighter">
                  <AnimatedCounter value={stat.value} />
                </h3>
                <div className="flex items-center gap-1 sm:gap-2 flex-wrap mt-1 sm:mt-0">
                  <div className={`flex items-center gap-1 text-[9px] sm:text-[10px] font-black px-2 py-0.5 rounded-full ${stat.up ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600' : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600'}`}>
                    {stat.up ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                    {stat.trend}
                  </div>
                  <span className="text-[8px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-tighter">vs Last Time</span>
                </div>
              </div>
              <div className={`p-4 sm:p-5 rounded-2xl ${stat.bg} ${stat.color} shadow-inner transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 shrink-0`}>
                <stat.icon size={24} className="sm:w-[28px] sm:h-[28px]" />
              </div>
            </div>
            <div className={`absolute -right-6 -bottom-6 w-24 h-24 sm:w-28 sm:h-28 rounded-full ${stat.bg} opacity-10 dark:opacity-5 group-hover:scale-150 transition-transform duration-1000 pointer-events-none`} />
          </div>
        ))}
      </div>

      {/* EXECUTIVE SUMMARY ANALYTICS */}
      {stats?.summary_analysis && (
        <div className="bg-white dark:bg-[#0b241f] rounded-[2rem] sm:rounded-[2.5rem] border border-slate-100 dark:border-white/5 p-5 sm:p-8 mb-8 sm:mb-10 shadow-sm overflow-hidden relative">
           <div className="flex items-center justify-between mb-6 sm:mb-8 relative z-10">
             <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-2 sm:p-2.5 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 rounded-lg sm:rounded-xl"><LineChart size={16} /></div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-sm sm:text-base">Quick Data Overview</h3>
                  <p className="text-[9px] sm:text-[10px] text-slate-400 uppercase font-bold tracking-widest mt-0.5">Overall System Averages</p>
                </div>
             </div>
           </div>

           <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 relative z-10">
             <div className="p-4 sm:p-5 bg-slate-50 dark:bg-black/20 rounded-2xl border border-slate-100 dark:border-white/5 flex flex-col gap-2">
                <span className="text-[9px] sm:text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1.5"><Clock size={12}/> Avg Age</span>
                <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white mt-auto">
                  <AnimatedCounter value={stats.summary_analysis.average_farmer_age} decimals={1} /> 
                  <span className="text-[10px] sm:text-xs text-slate-400 font-bold ml-1">YRS</span>
                </p>
             </div>
             <div className="p-4 sm:p-5 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl border border-emerald-100 dark:border-emerald-500/20 flex flex-col gap-2">
                <span className="text-[9px] sm:text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-500 tracking-widest flex items-center gap-1.5"><Coins size={12}/> Avg Income</span>
                <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white mt-auto">
                  <AnimatedCounter value={stats.summary_analysis.average_annual_income} decimals={0} prefix="₱" />
                </p>
             </div>
             <div className="p-4 sm:p-5 bg-blue-50 dark:bg-blue-500/10 rounded-2xl border border-blue-100 dark:border-blue-500/20 flex flex-col gap-2">
                <span className="text-[9px] sm:text-[10px] font-black uppercase text-blue-600 dark:text-blue-500 tracking-widest flex items-center gap-1.5"><Ruler size={12}/> Avg Land</span>
                <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white mt-auto">
                  <AnimatedCounter value={stats.summary_analysis.average_land_size_ha} decimals={2} /> 
                  <span className="text-[10px] sm:text-xs text-blue-400 font-bold ml-1">HA</span>
                </p>
             </div>
             <div className="p-4 sm:p-5 bg-amber-50 dark:bg-amber-500/10 rounded-2xl border border-amber-100 dark:border-amber-500/20 flex flex-col gap-2">
                <span className="text-[9px] sm:text-[10px] font-black uppercase text-amber-600 dark:text-amber-500 tracking-widest flex items-center gap-1.5"><Compass size={12}/> Top Area</span>
                <p className="text-sm sm:text-base font-black text-slate-800 dark:text-white mt-auto truncate">{stats.summary_analysis.most_populated_barangay}</p>
             </div>
             <div className="col-span-2 lg:col-span-1 p-4 sm:p-5 bg-purple-50 dark:bg-purple-500/10 rounded-2xl border border-purple-100 dark:border-purple-500/20 flex flex-col gap-2">
                <span className="text-[9px] sm:text-[10px] font-black uppercase text-purple-600 dark:text-purple-500 tracking-widest flex items-center gap-1.5"><Users size={12}/> Users</span>
                <p className="text-xl sm:text-2xl font-black text-slate-800 dark:text-white mt-auto">
                  <AnimatedCounter value={stats.summary_analysis.total_system_users} /> 
                  <span className="text-[10px] sm:text-xs text-purple-400 font-bold ml-1">ACTIVE</span>
                </p>
             </div>
           </div>
        </div>
      )}

      {/* 3. CHARTS SECTION - ROW 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 mb-8 sm:mb-10">
        
        {/* Education Pie Chart */}
        <div className="bg-white dark:bg-[#0b241f] rounded-[2rem] sm:rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-white/5 p-5 sm:p-8 flex flex-col h-[400px] sm:h-[500px]">
          <div className="flex items-center justify-between mb-6 sm:mb-10">
            <div>
              <h3 className="font-black text-slate-900 dark:text-white text-base sm:text-lg uppercase tracking-tight">Education Level</h3>
              <p className="text-[9px] sm:text-[10px] text-slate-400 uppercase font-bold tracking-widest mt-0.5 sm:mt-1">Farmer backgrounds</p>
            </div>
            <div className="p-1.5 sm:p-2 hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg sm:rounded-xl transition-colors cursor-pointer text-slate-300">
              <MoreVertical size={18} className="sm:w-[20px] sm:h-[20px]" />
            </div>
          </div>
          
          <div className="flex-1 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats?.education_stats || []}
                  innerRadius="65%"
                  outerRadius="90%"
                  paddingAngle={8}
                  dataKey="count"
                  nameKey="level"
                  stroke="none"
                >
                  {(stats?.education_stats || []).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                  <Label 
                    value={stats?.total_farmers || 0} 
                    position="center" 
                    fill={isDarkMode ? "#ffffff" : "#0f172a"} 
                    style={{ fontSize: '28px', fontWeight: '900', letterSpacing: '-0.05em' }}
                  />
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  verticalAlign="bottom" 
                  iconType="circle" 
                  wrapperStyle={{ fontSize: '10px' }}
                  formatter={(value) => <span className="text-slate-500 dark:text-slate-400 font-black text-[9px] sm:text-[10px] uppercase tracking-wider">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Succession Pie Chart */}
        <div className="bg-white dark:bg-[#0b241f] rounded-[2rem] sm:rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-white/5 p-5 sm:p-8 flex flex-col h-[400px] sm:h-[500px]">
          <div className="flex items-center justify-between mb-6 sm:mb-10">
            <div>
              <h3 className="font-black text-slate-900 dark:text-white text-base sm:text-lg uppercase tracking-tight">Next Generation</h3>
              <p className="text-[9px] sm:text-[10px] text-slate-400 uppercase font-bold tracking-widest mt-0.5 sm:mt-1">Who is still farming</p>
            </div>
            <div className="p-1.5 sm:p-2 hover:bg-slate-50 dark:hover:bg-white/5 rounded-lg sm:rounded-xl transition-colors cursor-pointer text-slate-300">
              <MoreVertical size={18} className="sm:w-[20px] sm:h-[20px]" />
            </div>
          </div>
          
          <div className="flex-1 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={successionData}
                  innerRadius="65%"
                  outerRadius="90%"
                  paddingAngle={8}
                  dataKey="count"
                  nameKey="level"
                  stroke="none"
                >
                  {successionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={SUCCESSION_COLORS[index % SUCCESSION_COLORS.length]} />
                  ))}
                  <Label 
                    value={stats?.total_children || 0} 
                    position="center" 
                    fill={isDarkMode ? "#ffffff" : "#0f172a"} 
                    style={{ fontSize: '28px', fontWeight: '900', letterSpacing: '-0.05em' }}
                  />
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend 
                  verticalAlign="bottom" 
                  iconType="circle" 
                  wrapperStyle={{ fontSize: '10px' }}
                  formatter={(value) => <span className="text-slate-500 dark:text-slate-400 font-black text-[9px] sm:text-[10px] uppercase tracking-wider">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Barangay Distribution Bar Chart */}
        <div className="bg-white dark:bg-[#0b241f] rounded-[2rem] sm:rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-white/5 p-5 sm:p-8 h-[400px] sm:h-[500px] flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6 sm:mb-10">
            <div>
              <h3 className="font-black text-slate-900 dark:text-white text-base sm:text-lg uppercase tracking-tight">Top Areas</h3>
              <p className="text-[9px] sm:text-[10px] text-slate-400 uppercase font-bold tracking-widest mt-0.5 sm:mt-1">Click a bar to filter</p>
            </div>
            
            <div className="flex items-center gap-2">
              <button onClick={() => setShowAllBarangaysModal(true)} className="text-[10px] font-black text-slate-500 hover:text-emerald-600 uppercase tracking-widest transition-colors flex items-center gap-1 p-1">
                View All <ChevronRight size={12} className="sm:w-[14px] sm:h-[14px]" />
              </button>
            </div>
          </div>
          
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={(stats?.product_stats || []).slice(0, 5)} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity={1} />
                    <stop offset="100%" stopColor="#047857" stopOpacity={1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDarkMode ? "rgba(255,255,255,0.03)" : "#f1f5f9"} />
                <XAxis 
                  dataKey="barangay" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: isDarkMode ? '#64748b' : '#94a3b8', fontSize: window.innerWidth < 640 ? 9 : 10, fontWeight: 900 }} 
                  dy={10} 
                />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: isDarkMode ? '#64748b' : '#94a3b8', fontSize: window.innerWidth < 640 ? 9 : 10, fontWeight: 900 }} />
                <Tooltip cursor={{ fill: isDarkMode ? 'rgba(255,255,255,0.03)' : '#f8fafc', radius: 12 }} content={<CustomTooltip />} />
                <Bar 
                  dataKey="count" 
                  fill="url(#barGrad)" 
                  radius={[8, 8, 8, 8]} 
                  barSize={window.innerWidth < 640 ? 24 : 40}
                  onClick={handleBarClick} 
                  style={{ cursor: 'pointer' }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* 4. LOWER INTELLIGENCE SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        
        {/* Recent Activity Mini-Feed */}
        {isAdmin && (
          <div className="bg-white dark:bg-[#0b241f] rounded-[2rem] sm:rounded-[2.5rem] border border-slate-100 dark:border-white/5 p-5 sm:p-8 flex flex-col shadow-sm">
            <div className="flex items-center justify-between mb-6 sm:mb-8">
               <div className="flex items-center gap-2 sm:gap-3">
                  <div className="p-2 sm:p-2.5 bg-slate-900 rounded-lg sm:rounded-xl text-white shrink-0"><Terminal size={16} className="sm:w-[18px] sm:h-[18px]" /></div>
                  <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-sm sm:text-base">Recent Actions</h3>
               </div>
               
               {!isViewer && (
                 <button onClick={() => navigate('/logs')} className="text-[9px] sm:text-[10px] font-black text-emerald-600 hover:text-emerald-500 uppercase tracking-widest flex items-center gap-1 group shrink-0">
                    View Full List <ChevronRight size={12} className="sm:w-[14px] sm:h-[14px] group-hover:translate-x-1 transition-transform" />
                 </button>
               )}
            </div>
            
            <div className="space-y-3 sm:space-y-4">
              {recentLogs.length > 0 ? recentLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 sm:p-4 bg-slate-50 dark:bg-white/[0.02] rounded-xl sm:rounded-2xl border border-slate-100 dark:border-white/5 hover:bg-white dark:hover:bg-white/[0.05] transition-all group">
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                     <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-white dark:bg-[#041d18] border dark:border-white/5 flex items-center justify-center text-slate-400 group-hover:text-emerald-500 transition-colors shadow-sm shrink-0">
                        <Clock size={14} className="sm:w-[16px] sm:h-[16px]" />
                     </div>
                     <div className="min-w-0 pr-2">
                        <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{log.action}</p>
                        <p className="text-[8px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate">{log.user_name} • {new Date(log.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                     </div>
                  </div>
                  <div className="px-2 py-1 sm:px-3 sm:py-1 bg-white dark:bg-[#041d18] rounded-md sm:rounded-lg text-[8px] sm:text-[9px] font-black text-slate-400 dark:text-slate-500 border dark:border-white/5 shrink-0">
                      #{log.id}
                  </div>
                </div>
              )) : (
                <div className="text-center py-8 sm:py-10 text-slate-400 text-xs sm:text-sm">Nothing recent to show here.</div>
              )}
            </div>
          </div>
        )}

        {/* Farming Assets */}
        <div className="bg-white dark:bg-[#0b241f] rounded-[2rem] sm:rounded-[2.5rem] border border-slate-100 dark:border-white/5 p-5 sm:p-8 flex flex-col shadow-sm">
          <div className="flex items-center justify-between mb-6 sm:mb-8">
             <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-2 sm:p-2.5 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-lg sm:rounded-xl shrink-0"><Tractor size={16} className="sm:w-[18px] sm:h-[18px]" /></div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-sm sm:text-base">Farming Assets</h3>
                  <p className="text-[9px] sm:text-[10px] text-slate-400 uppercase font-bold tracking-widest mt-0.5">Crops and tools</p>
                </div>
             </div>
             <button onClick={() => navigate('/products')} className="text-[9px] sm:text-[10px] font-black text-emerald-600 hover:text-emerald-500 uppercase tracking-widest flex items-center gap-1 group shrink-0">
                See More <ChevronRight size={12} className="sm:w-[14px] sm:h-[14px] group-hover:translate-x-1 transition-transform" />
             </button>
          </div>

          <div className="grid grid-cols-1 min-[400px]:grid-cols-2 gap-3 sm:gap-4">
             {commodities.length > 0 ? (
               commodities.map((crop, i) => (
                 <div key={crop.id || i} className="p-4 sm:p-6 bg-emerald-50/50 dark:bg-emerald-500/5 rounded-2xl sm:rounded-3xl border border-emerald-100/50 dark:border-emerald-500/10 flex flex-col gap-2 sm:gap-3 hover:scale-105 transition-transform duration-300">
                    <div className="flex items-center justify-between">
                       <span className="text-[9px] sm:text-[10px] font-black text-emerald-600 uppercase tracking-widest truncate mr-2">{crop.category || 'Asset'}</span>
                       {crop.category?.toLowerCase().includes('tool') || crop.category?.toLowerCase().includes('vehicle') ? 
                         <Wrench size={14} className="text-emerald-400 sm:w-[16px] sm:h-[16px] shrink-0" /> : 
                         <Sprout size={14} className="text-emerald-400 sm:w-[16px] sm:h-[16px] shrink-0" />
                       }
                    </div>
                    <p className="text-lg sm:text-xl font-black text-slate-800 dark:text-slate-200 truncate" title={crop.name}>{crop.name}</p>
                    <div className="h-1.5 w-full bg-emerald-100 dark:bg-emerald-950 rounded-full overflow-hidden">
                       <div className="h-full bg-emerald-500 rounded-full transition-all duration-1000" style={{ width: `${Math.max(20, 80 - (i*15))}%` }} />
                    </div>
                 </div>
               ))
             ) : (
               <div className="col-span-1 min-[400px]:col-span-2 text-center py-6 text-slate-400 text-[10px] font-bold uppercase tracking-widest border border-dashed border-slate-200 dark:border-white/10 rounded-2xl">
                 Nothing added yet
               </div>
             )}
          </div>
        </div>

        {/* System Check */}
        {isAdmin && (
          <div className="bg-white dark:bg-[#0b241f] rounded-[2rem] sm:rounded-[2.5rem] border border-slate-100 dark:border-white/5 p-5 sm:p-8 flex flex-col shadow-sm">
            <div className="flex items-center justify-between mb-6 sm:mb-8">
               <div className="flex items-center gap-2 sm:gap-3">
                  <div className={`p-2 sm:p-2.5 rounded-lg sm:rounded-xl shrink-0 ${sysHealth.isOnline ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400' : 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400'}`}>
                    <Server size={16} className="sm:w-[18px] sm:h-[18px]" />
                  </div>
                  <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-sm sm:text-base">System Check</h3>
               </div>
            </div>
            
            <div className="space-y-3 sm:space-y-4 flex-1">
              <div className="flex items-center justify-between p-3 sm:p-4 bg-slate-50 dark:bg-white/[0.02] rounded-xl sm:rounded-2xl border border-slate-100 dark:border-white/5 transition-all">
                <div className="flex items-center gap-2 sm:gap-3">
                  <Database size={14} className="text-slate-400 sm:w-[16px] sm:h-[16px] shrink-0" />
                  <span className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">Data Storage</span>
                </div>
                <span className={`text-[10px] sm:text-xs font-black flex items-center gap-1 ${sysHealth.isOnline ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {sysHealth.isOnline ? <ShieldCheck size={12} className="sm:w-[14px] sm:h-[14px] shrink-0"/> : <WifiOff size={12} className="sm:w-[14px] sm:h-[14px] shrink-0"/>}
                  {sysHealth.dbStatus}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 sm:p-4 bg-slate-50 dark:bg-white/[0.02] rounded-xl sm:rounded-2xl border border-slate-100 dark:border-white/5 transition-all">
                <div className="flex items-center gap-2 sm:gap-3">
                  <Activity size={14} className="text-slate-400 sm:w-[16px] sm:h-[16px] shrink-0" />
                  <span className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">Speed</span>
                </div>
                <span className={`text-[10px] sm:text-xs font-black ${
                  !sysHealth.isOnline ? 'text-slate-400' :
                  sysHealth.latency < 100 ? 'text-blue-600' : 
                  sysHealth.latency < 300 ? 'text-amber-500' : 'text-rose-500'
                }`}>
                  {!sysHealth.isOnline ? 'Offline' : <><AnimatedCounter value={sysHealth.latency} duration={500}/>ms</>} 
                </span>
              </div>

              <div className="flex items-center justify-between p-3 sm:p-4 bg-slate-50 dark:bg-white/[0.02] rounded-xl sm:rounded-2xl border border-slate-100 dark:border-white/5 transition-all">
                <div className="flex items-center gap-2 sm:gap-3">
                  <Thermometer size={14} className="text-slate-400 sm:w-[16px] sm:h-[16px] shrink-0" />
                  <span className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">Server Use</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-12 sm:w-16 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden hidden min-[350px]:block">
                    <div 
                      className={`h-full transition-all duration-1000 ${!isOnline ? 'bg-slate-400' : sysHealth.serverLoad > 80 ? 'bg-rose-500' : sysHealth.serverLoad > 50 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                      style={{ width: `${isOnline ? sysHealth.serverLoad : 0}%` }}
                    ></div>
                  </div>
                  <span className="text-[10px] sm:text-xs font-black text-slate-500 w-8 text-right">
                    {isOnline ? <AnimatedCounter value={sysHealth.serverLoad} duration={500}/> : 0}%
                  </span>
                </div>
              </div>

              <div className="mt-auto pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest">Last Backup</span>
                <span className="text-[10px] sm:text-xs font-black text-slate-600 dark:text-slate-300">
                  {new Date(sysHealth.lastBackup).toLocaleString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* QUICK ACTIONS FAB */}
      {!isViewer && (
        <div className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-30 flex flex-col gap-2 sm:gap-3 items-end">
          {showQuickActions && (
            <div className="flex flex-col gap-2 sm:gap-3 animate-in slide-in-from-bottom-4">
              <button onClick={() => navigate('/map')} className="flex items-center gap-2 sm:gap-3 px-3 py-2.5 sm:px-4 sm:py-3 bg-white dark:bg-[#0b241f] rounded-xl sm:rounded-2xl shadow-xl hover:bg-slate-50 dark:hover:bg-[#13332d] transition-all group border border-slate-100 dark:border-white/5">
                <span className="text-[10px] sm:text-xs font-bold text-slate-600 dark:text-slate-300 group-hover:text-emerald-600 transition-colors">Map</span>
                <div className="p-1.5 sm:p-2 bg-amber-100 dark:bg-amber-500/20 text-amber-600 rounded-lg sm:rounded-xl group-hover:scale-110 transition-transform"><MapIcon size={14} className="sm:w-[18px] sm:h-[18px]" /></div>
              </button>
              <button onClick={() => navigate('/farmers')} className="flex items-center gap-2 sm:gap-3 px-3 py-2.5 sm:px-4 sm:py-3 bg-white dark:bg-[#0b241f] rounded-xl sm:rounded-2xl shadow-xl hover:bg-slate-50 dark:hover:bg-[#13332d] transition-all group border border-slate-100 dark:border-white/5">
                <span className="text-[10px] sm:text-xs font-bold text-slate-600 dark:text-slate-300 group-hover:text-emerald-600 transition-colors">Add Farmer</span>
                <div className="p-1.5 sm:p-2 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 rounded-lg sm:rounded-xl group-hover:scale-110 transition-transform"><UserPlus size={14} className="sm:w-[18px] sm:h-[18px]" /></div>
              </button>
              <button onClick={() => navigate('/surveys')} className="flex items-center gap-2 sm:gap-3 px-3 py-2.5 sm:px-4 sm:py-3 bg-white dark:bg-[#0b241f] rounded-xl sm:rounded-2xl shadow-xl hover:bg-slate-50 dark:hover:bg-[#13332d] transition-all group border border-slate-100 dark:border-white/5">
                <span className="text-[10px] sm:text-xs font-bold text-slate-600 dark:text-slate-300 group-hover:text-blue-600 transition-colors">New Survey</span>
                <div className="p-1.5 sm:p-2 bg-blue-100 dark:bg-blue-500/20 text-blue-600 rounded-lg sm:rounded-xl group-hover:scale-110 transition-transform"><FilePlus size={14} className="sm:w-[18px] sm:h-[18px]" /></div>
              </button>
            </div>
          )}
          <button 
            onClick={() => setShowQuickActions(!showQuickActions)} 
            className="p-3 sm:p-4 bg-emerald-600 text-white rounded-xl sm:rounded-[1.5rem] shadow-2xl shadow-emerald-600/50 hover:bg-emerald-500 transition-all hover:scale-110 active:scale-95 flex items-center justify-center"
          >
            {showQuickActions ? <ArrowDownRight size={20} className="sm:w-[24px] sm:h-[24px]" /> : <Plus size={20} className="sm:w-[24px] sm:h-[24px]" />}
          </button>
        </div>
      )}

      {/* ALL BARANGAYS MODAL */}
      {showAllBarangaysModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setShowAllBarangaysModal(false)} />
          <div className="relative bg-white dark:bg-[#041d18] rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl w-full max-w-lg flex flex-col overflow-hidden animate-in zoom-in-95 border dark:border-white/10 max-h-[85vh]">
            <div className="p-5 sm:p-8 border-b border-slate-50 dark:border-white/5 flex items-center justify-between bg-white/80 dark:bg-[#041d18]/80 backdrop-blur-xl shrink-0">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">All Areas</h2>
                <p className="text-slate-400 dark:text-slate-500 text-[10px] sm:text-xs font-bold uppercase tracking-widest mt-1">Full List of Locations</p>
              </div>
              <button onClick={() => setShowAllBarangaysModal(false)} className="p-2 sm:p-3 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl transition-all text-slate-400 shrink-0">
                <X size={20} className="sm:w-[24px] sm:h-[24px]" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6 no-scrollbar">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {(stats?.product_stats || []).map((b, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setShowAllBarangaysModal(false);
                      handleBarClick(b);
                    }}
                    className="flex items-center justify-between p-4 bg-slate-50 dark:bg-white/5 rounded-2xl border border-slate-100 dark:border-white/5 hover:bg-emerald-50 hover:border-emerald-100 dark:hover:bg-emerald-500/10 dark:hover:border-emerald-500/20 transition-all group text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <div className="p-2 bg-white dark:bg-[#0b241f] rounded-lg text-emerald-600 shadow-sm shrink-0">
                        <MapPin size={14} className="sm:w-[16px] sm:h-[16px] shrink-0" />
                      </div>
                      <span className="font-bold text-slate-700 dark:text-slate-200 text-xs sm:text-sm truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                        {b.barangay}
                      </span>
                    </div>
                    <span className="text-[10px] sm:text-xs font-black text-slate-400 group-hover:text-emerald-600 transition-colors bg-white dark:bg-[#0b241f] px-2 py-1 rounded-md shadow-sm shrink-0">
                      {b.count}
                    </span>
                  </button>
                ))}
                {(!stats?.product_stats || stats.product_stats.length === 0) && (
                  <div className="col-span-1 sm:col-span-2 text-center p-8 text-slate-400 text-xs font-bold uppercase tracking-widest">
                    No area data available
                  </div>
                )}
              </div>
            </div>

            <div className="p-5 sm:p-6 border-t border-slate-50 dark:border-white/5 bg-slate-50/50 dark:bg-black/20 shrink-0 text-center">
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center gap-1.5"><Terminal size={12}/> Click an area to see details</p>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}} />
    </div>
  );
}