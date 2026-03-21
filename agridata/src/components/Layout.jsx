import React, { useState, useEffect, useRef } from 'react';
import { Link, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { notificationsAPI, authAPI } from '../services/api'; 
import { 
  LayoutDashboard, Users, BookOpen, Beaker, Map, 
  ShoppingBasket, UsersRound, History, LogOut, 
  Menu, X, Sprout, ChevronRight, Bell, Search,
  PanelLeftClose, PanelLeftOpen, Settings, Sun, Moon, Monitor,
  AlertCircle, Building2, ClipboardList, CheckCheck, Trash2,
  Activity, RefreshCw, Smartphone, ShieldCheck, MapPinned, Plus,
  Library
} from 'lucide-react';

// --- IMAGE SETTINGS ---
const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const API_BASE_URL = (
  import.meta.env.VITE_API_URL || 
  (isLocal ? 'http://127.0.0.1:8080' : 'https://TANAW.ct.ws')
).replace(/\/api\/?$/, '');

// --- COMPONENT: User Photo ---
const UserAvatar = ({ backendPath, initials, className = "" }) => {
  const [imgUrl, setImgUrl] = useState(null);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!backendPath) {
      setImgUrl(null);
      return;
    }

    let url = backendPath;
    if (backendPath.startsWith('http')) {
      url = backendPath.replace(/^http:\/\//i, 'https://');
    } 
    else {
      const cleanPath = backendPath.replace(/^\/+/, '').replace(/^static\/uploads\//, '').replace(/^uploads\//, '');
      url = `${API_BASE_URL}/static/uploads/${cleanPath}`;
      if (window.location.protocol === 'https:' && url.startsWith('http://')) {
        url = url.replace('http://', 'https://');
      }
    }
    
    setImgUrl(url);
    setHasError(false);
  }, [backendPath]);

  if (!imgUrl || hasError) return <span className={className}>{initials}</span>;

  return (
    <img 
      src={imgUrl} 
      alt="Profile" 
      className="h-full w-full object-cover"
      crossOrigin={backendPath?.startsWith('http') ? "anonymous" : undefined}
      onError={() => setHasError(true)}
    />
  );
};

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // --- SAVED SETTINGS ---
  const [isCollapsed, setIsCollapsed] = useState(() => localStorage.getItem('agri-sidebar-collapsed') === 'true');
  const [theme, setTheme] = useState(() => localStorage.getItem('agri-theme') || 'system');
  
  const [otpEnabled, setOtpEnabled] = useState(() => {
    if (!user) return false;
    return user.otp_enabled === true || user.otp_enabled === 1 || user.otp_enabled === "1" || user.otp_enabled === "true";
  });
  
  // UI States
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false); 
  
  // Modal States
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  
  const isModalActive = settingsOpen || showLogoutConfirm;

  // --- NOTIFICATIONS ---
  const [notifications, setNotifications] = useState([]);
  const notificationRef = useRef(null);

  // --- SYNC SETTINGS ---
  useEffect(() => {
    const syncSecuritySettings = async () => {
      if (!user) return;
      try {
        const response = await authAPI.getCurrentUser();
        const serverUser = response.data;
        const isServerEnabled = 
          serverUser.otp_enabled === true || 
          serverUser.otp_enabled === 1 || 
          serverUser.otp_enabled === "1" ||
          serverUser.otp_enabled === "true";

        if (isServerEnabled !== otpEnabled) {
            setOtpEnabled(isServerEnabled);
        }
      } catch (err) {
        console.warn("Could not sync settings");
      }
    };

    syncSecuritySettings();
  }, [user, settingsOpen]);

  const fetchNotifications = async () => {
    if (!user) return; 
    try {
      const response = await notificationsAPI.getAll();
      if (response.data) {
        setNotifications(response.data);
      }
    } catch (err) {
      console.warn("Notification error");
    }
  };

  const markAsRead = async (id) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    try {
      await notificationsAPI.markAsRead(id);
    } catch (err) { 
      console.error("Failed to mark read"); 
    }
  };

  const handleNotificationClick = (notification) => {
    if (!notification.is_read) markAsRead(notification.id);
    setShowNotifications(false);
    const text = (notification.title + " " + notification.message).toLowerCase();
    
    if (text.includes('farmer')) navigate('/farmers');
    else if (text.includes('survey')) navigate('/surveys');
    else if (text.includes('research')) navigate('/projects');
    else if (text.includes('experience')) navigate('/experiences');
    else if (text.includes('organization')) navigate('/organizations');
    else if (text.includes('barangay')) navigate('/barangays');
    else if (text.includes('commodity')) navigate('/products');
    else if (text.includes('user')) navigate('/users');
    else navigate('/dashboard');
  };

  const markAllAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    try {
      await notificationsAPI.markAllRead();
    } catch (err) { console.error("Error marking all read"); }
  };

  const clearNotifications = async () => {
    if (window.confirm("Delete all notification history?")) {
      setNotifications([]); 
      try {
        await notificationsAPI.deleteAll();
      } catch (err) { 
        fetchNotifications();
      }
    }
  };

  const handleToggleOtp = async () => {
    if (user?.role === 'admin' && otpEnabled) {
      alert("Admin Rules: You cannot turn off Two-Factor login.");
      return;
    }
    const newState = !otpEnabled;
    setOtpEnabled(newState); 
    try {
      await authAPI.toggleOtp(newState);
    } catch (error) {
      setOtpEnabled(!newState); 
      alert("Error saving settings.");
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user]); 

  // --- THEME ---
  useEffect(() => {
    const root = window.document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const applyTheme = () => {
      root.classList.remove('light', 'dark');
      if (theme === 'dark') root.classList.add('dark');
      else if (theme === 'light') root.classList.add('light');
      else root.classList.add(mediaQuery.matches ? 'dark' : 'light');
    };
    applyTheme();
    localStorage.setItem('agri-theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('agri-sidebar-collapsed', isCollapsed);
  }, [isCollapsed]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (notificationRef.current && !notificationRef.current.contains(e.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => { setSidebarOpen(false); }, [location.pathname]);

  const handleLogout = () => {
    logout();
    setShowLogoutConfirm(false);
    navigate('/login');
  };

  // --- NAVIGATION LIST ---
  const rawNavigation = [
    { name: 'Farmer Hub', href: '/portal', icon: Sprout, roles: ['farmer'] },
    { name: 'Family Info', href: '/portal', icon: Library, roles: ['mentee'] }, 
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, roles: ['admin', 'researcher', 'data_encoder', 'viewer'] },
    { name: 'Live Map', href: '/map', icon: MapPinned, roles: ['admin', 'researcher', 'data_encoder', 'viewer'] },
    { name: 'Farmers', href: '/farmers', icon: Users, roles: ['admin', 'researcher', 'data_encoder', 'viewer'] },
    { name: 'Stories', href: '/experiences', icon: BookOpen, roles: ['admin', 'researcher', 'data_encoder', 'viewer', 'farmer', 'mentee'] },
    { name: 'Research', href: '/projects', icon: Beaker, roles: ['admin', 'researcher'] }, 
    { name: 'Surveys', href: '/surveys', icon: ClipboardList, roles: ['admin', 'researcher'] },
    { name: 'Barangays', href: '/barangays', icon: Map, roles: ['admin', 'researcher', 'data_encoder', 'viewer'] },
    { name: 'Groups', href: '/organizations', icon: Building2, roles: ['admin', 'researcher', 'data_encoder', 'viewer'] },
    { name: 'Products', href: '/products', icon: ShoppingBasket, roles: ['admin', 'researcher', 'data_encoder', 'viewer'] },
    { name: 'Users', href: '/users', icon: UsersRound, roles: ['admin'] },
    { name: 'History', href: '/logs', icon: History, roles: ['admin', 'researcher', 'data_encoder'] },
  ];

  const filteredNavigation = rawNavigation.filter(item => {
    if (!user || !user.role) return false;
    return item.roles.includes(user.role);
  });

  const pathSegments = location.pathname.split('/').filter(Boolean);
  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="h-screen bg-[#F8FAFC] dark:bg-[#020c0a] overflow-hidden font-sans text-slate-900 dark:text-slate-100 transition-colors duration-300 relative">
      
      <div className={`flex w-full h-full transition-all duration-300 ease-out ${isModalActive ? 'filter blur-sm brightness-75 scale-[0.99] pointer-events-none' : ''}`}>
        
        {sidebarOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] lg:hidden" onClick={() => setSidebarOpen(false)} />
        )}

        <aside className={`fixed inset-y-0 left-0 z-[110] bg-white dark:bg-[#041d18] text-slate-600 dark:text-white border-r border-slate-200 dark:border-white/5 shadow-2xl transition-all duration-500 lg:translate-x-0 lg:relative lg:flex lg:flex-col overflow-x-hidden ${sidebarOpen ? 'translate-x-0 w-72 sm:w-[280px]' : '-translate-x-full lg:translate-x-0'} ${isCollapsed ? 'lg:w-[90px]' : 'lg:w-72 xl:w-[280px]'}`}>
          <div className="flex flex-col h-full w-full">
            <div className={`h-16 sm:h-20 flex-shrink-0 flex items-center border-b border-slate-100 dark:border-white/5 transition-all duration-500 ${isCollapsed && !sidebarOpen ? 'justify-center' : 'px-5 sm:px-8 justify-between'}`}>
              <div className="flex items-center gap-3">
                <div className="p-2 sm:p-2.5 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-xl shadow-lg shrink-0">
                  <Sprout size={20} className="text-white sm:w-[22px] sm:h-[22px]" />
                </div>
                {(!isCollapsed || sidebarOpen) && (
                  <div className="flex flex-col animate-in fade-in">
                    <span className="text-base sm:text-lg font-bold leading-none text-slate-900 dark:text-white uppercase tracking-tighter">TANAW</span>
                    <span className="text-[9px] sm:text-[10px] text-emerald-600 dark:text-emerald-500 font-bold uppercase tracking-[0.2em] mt-0.5 sm:mt-1">Systems</span>
                  </div>
                )}
              </div>
              
              <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-2 text-slate-400 hover:text-rose-500 transition-colors">
                <X size={20} />
              </button>

              <button onClick={() => setIsCollapsed(!isCollapsed)} className="hidden lg:flex p-2 text-slate-400 hover:text-emerald-600 dark:hover:text-white rounded-lg transition-all">
                {isCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
              </button>
            </div>

            <nav className="flex-1 px-3 sm:px-4 py-4 sm:py-6 space-y-1 sm:space-y-1.5 overflow-y-auto no-scrollbar">
              {filteredNavigation.map((item) => {
                const isActive = location.pathname.startsWith(item.href);
                const Icon = item.icon;
                return (
                  <Link key={item.name} to={item.href} onClick={() => setSidebarOpen(false)} className={`flex items-center rounded-xl transition-all duration-300 group relative ${(isCollapsed && !sidebarOpen) ? 'justify-center h-12 w-12 mx-auto' : 'gap-3 sm:gap-4 px-3 sm:px-4 h-12'} ${isActive ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-emerald-600 dark:hover:text-white'}`}>
                    <Icon size={18} strokeWidth={isActive ? 2.5 : 2} className="shrink-0 sm:w-[20px] sm:h-[20px]" />
                    {(!isCollapsed || sidebarOpen) && <span className="font-bold text-sm tracking-tight truncate">{item.name}</span>}
                  </Link>
                );
              })}
            </nav>

            <div className="p-3 sm:p-4 mt-auto border-t border-slate-100 dark:border-white/5">
              <div className={`flex items-center rounded-2xl bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/5 transition-all duration-500 ${(isCollapsed && !sidebarOpen) ? 'justify-center p-2' : 'p-3 gap-3'}`}>
                
                <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center font-bold text-white shadow-lg shrink-0 overflow-hidden">
                  <UserAvatar 
                    backendPath={user?.profile_image || user?.avatar} 
                    initials={user?.full_name?.charAt(0) || 'U'} 
                  />
                </div>

                {(!isCollapsed || sidebarOpen) && (
                  <div className="flex-1 min-w-0 animate-in fade-in">
                    <p className="text-xs sm:text-sm font-bold truncate text-slate-900 dark:text-slate-100">{user?.full_name}</p>
                    <p className="text-[9px] sm:text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-black tracking-widest mt-0.5 truncate">{user?.role?.replace('_', ' ')}</p>
                  </div>
                )}
              </div>
              <button onClick={() => setShowLogoutConfirm(true)} className={`mt-2 sm:mt-3 w-full flex items-center rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all font-bold text-[10px] uppercase tracking-widest ${isCollapsed && !sidebarOpen ? 'justify-center h-12' : 'gap-3 sm:gap-4 px-3 sm:px-4 h-12'}`}>
                <LogOut size={16} className="shrink-0 sm:w-[18px] sm:h-[18px]" />
                {(!isCollapsed || sidebarOpen) && <span className="ml-1">Log Out</span>}
              </button>
            </div>
          </div>
        </aside>

        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative">
          <header className="h-16 sm:h-20 bg-white/80 dark:bg-[#041d18]/80 backdrop-blur-md border-b border-slate-200 dark:border-white/5 px-4 sm:px-6 md:px-10 flex items-center justify-between sticky top-0 z-40">
            <div className="flex items-center gap-2 sm:gap-4 overflow-hidden">
              <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-all shrink-0">
                <Menu size={22} className="sm:w-[24px] sm:h-[24px]" />
              </button>
              <nav className="hidden sm:flex items-center gap-2 sm:gap-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-emerald-500/50 truncate">
                <span>App</span>
                {pathSegments.map((segment, idx) => (
                  <React.Fragment key={idx}>
                    <ChevronRight size={12} className="shrink-0" />
                    <span className={`truncate ${idx === pathSegments.length - 1 ? 'text-slate-900 dark:text-white' : ''}`}>{segment.replace(/-/g, ' ')}</span>
                  </React.Fragment>
                ))}
              </nav>
            </div>

            <div className="flex items-center gap-1 sm:gap-5 shrink-0 relative">
              <div className="relative flex items-center" ref={notificationRef}>
                <button onClick={() => setShowNotifications(!showNotifications)} className={`p-2 sm:p-2.5 rounded-xl transition-all relative ${showNotifications ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600' : 'text-slate-400 hover:text-emerald-600'}`}>
                  <Bell size={18} className="sm:w-[20px] sm:h-[20px]" />
                  {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 sm:top-2.5 sm:right-2.5 w-3.5 h-3.5 sm:w-4 sm:h-4 bg-rose-500 text-white text-[8px] sm:text-[9px] font-black flex items-center justify-center rounded-full border-2 border-white dark:border-[#041d18] animate-bounce">{unreadCount}</span>}
                </button>

                {showNotifications && (
                  <div className="fixed top-16 left-4 right-4 sm:absolute sm:top-full sm:left-auto sm:right-0 sm:w-[380px] mt-2 sm:mt-4 max-w-[400px] mx-auto bg-white dark:bg-[#0b241f] rounded-3xl sm:rounded-[2rem] shadow-2xl border border-slate-100 dark:border-white/5 overflow-hidden z-[100] animate-in fade-in zoom-in-95">
                    <div className="p-4 sm:p-5 border-b dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-white/5">
                      <h3 className="font-bold text-xs sm:text-sm dark:text-white uppercase tracking-tight">Alerts</h3>
                      <div className="flex gap-1 sm:gap-2">
                        <button onClick={fetchNotifications} title="Refresh" className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 rounded-lg transition-colors"><RefreshCw size={14}/></button>
                        <button onClick={markAllAsRead} className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg"><CheckCheck size={14}/></button>
                        <button onClick={clearNotifications} className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg"><Trash2 size={14}/></button>
                      </div>
                    </div>
                    <div className="max-h-[60vh] sm:max-h-[400px] overflow-y-auto no-scrollbar">
                      {notifications.length === 0 ? (
                        <div className="p-10 text-center text-slate-400 text-xs italic">All clear</div>
                      ) : (
                        notifications.map(n => (
                          <div key={n.id} onClick={() => handleNotificationClick(n)} className={`p-4 sm:p-5 border-b dark:border-white/5 last:border-0 flex gap-3 sm:gap-4 cursor-pointer transition-all ${!n.is_read ? 'bg-emerald-50/30 dark:bg-emerald-500/5' : 'opacity-60 hover:opacity-100'}`}>
                            <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${!n.is_read ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-slate-300'}`} />
                            <div className="min-w-0">
                              <p className={`text-xs sm:text-sm tracking-tight leading-snug ${!n.is_read ? 'font-bold text-slate-900 dark:text-white' : 'font-medium'}`}>{n.title}</p>
                              <p className="text-[11px] sm:text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">{n.message}</p>
                              <p className="text-[8px] sm:text-[9px] font-black uppercase text-slate-300 dark:text-slate-600 mt-2 tracking-widest">{n.created_at_human || 'Just now'}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              <button onClick={() => setSettingsOpen(true)} className="p-2 sm:p-2.5 text-slate-400 hover:text-emerald-600 transition-all"><Settings size={18} className="sm:w-[20px] sm:h-[20px]" /></button>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto bg-[#F8FAFC] dark:bg-[#020c0a] no-scrollbar">
            <div className="max-w-[1600px] mx-auto p-4 sm:p-6 md:p-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <Outlet />
            </div>
          </main>
        </div>
      </div>

      {/* --- SETTINGS MODAL --- */}
      {settingsOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md animate-in fade-in" onClick={() => setSettingsOpen(false)} />
          <div className="relative bg-white dark:bg-[#0b241f] rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl w-[95vw] sm:w-full max-w-lg overflow-hidden animate-in zoom-in-95 border dark:border-white/10">
            <div className="p-5 sm:p-8 border-b border-slate-50 dark:border-white/5 flex items-center justify-between">
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Settings</h3>
                <p className="text-slate-400 text-[9px] sm:text-[10px] font-black uppercase tracking-widest mt-1">Change your preferences</p>
              </div>
              <button onClick={() => setSettingsOpen(false)} className="p-2 sm:p-3 bg-slate-50 dark:bg-white/5 rounded-xl sm:rounded-2xl text-slate-400 hover:text-slate-900 transition-all"><X size={20} className="sm:w-[24px] sm:h-[24px]" /></button>
            </div>
            
            <div className="p-5 sm:p-8 space-y-8 sm:space-y-10">
              
              <section>
                <h4 className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-4 flex items-center gap-2"><Activity size={14} /> Theme</h4>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {[{ id: 'light', icon: Sun, label: 'Light' }, { id: 'dark', icon: Moon, label: 'Dark' }, { id: 'system', icon: Monitor, label: 'System' }].map(t => (
                    <button key={t.id} onClick={() => setTheme(t.id)} className={`flex flex-col items-center gap-2 sm:gap-3 p-3 sm:p-5 rounded-2xl sm:rounded-3xl border-2 transition-all duration-300 ${theme === t.id ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'border-slate-50 dark:border-white/5 text-slate-400'}`}>
                      <t.icon size={20} className="sm:w-[22px] sm:h-[22px]" />
                      <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-wider">{t.label}</span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="pt-6 border-t border-slate-100 dark:border-white/5">
                <h4 className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-4 flex items-center gap-2">
                  <ShieldCheck size={14} /> Security
                </h4>
                <div className="flex flex-row items-center justify-between p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.02] gap-3">
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <div className={`p-2.5 sm:p-3 rounded-xl sm:rounded-2xl transition-colors shrink-0 ${otpEnabled ? 'bg-emerald-500 text-white shadow-lg' : 'bg-slate-200 dark:bg-white/10 text-slate-400'}`}>
                      <Smartphone size={18} className="sm:w-[20px] sm:h-[20px]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">Two-Factor Login</p>
                      <p className="text-[9px] sm:text-[10px] font-medium text-slate-400 truncate">Verify by email</p>
                      {user?.role === 'admin' && otpEnabled && (
                        <p className="text-[8px] sm:text-[9px] font-bold text-rose-500 mt-0.5 uppercase tracking-widest truncate">Required for Admins</p>
                      )}
                    </div>
                  </div>
                  
                  <button 
                    onClick={handleToggleOtp} 
                    disabled={user?.role === 'admin' && otpEnabled}
                    className={`relative w-12 h-7 sm:w-14 sm:h-8 rounded-full transition-all duration-300 focus:outline-none shrink-0
                      ${otpEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-white/10'} 
                      ${user?.role === 'admin' && otpEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className={`absolute top-1 left-1 bg-white w-5 h-5 sm:w-6 sm:h-6 rounded-full shadow-md transition-transform duration-300 transform ${otpEnabled ? 'translate-x-5 sm:translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

      {/* --- LOGOUT MODAL --- */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md animate-in fade-in" onClick={() => setShowLogoutConfirm(false)} />
          <div className="relative bg-white dark:bg-[#0b241f] rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl p-6 sm:p-8 max-w-[90vw] sm:max-w-sm w-full text-center border dark:border-white/10 animate-in zoom-in-95">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-rose-50 dark:bg-rose-500/10 text-rose-500 rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto mb-4 sm:mb-6 shadow-inner"><AlertCircle size={32} className="sm:w-[40px] sm:h-[40px]" /></div>
            <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight mb-2 dark:text-white">Log Out?</h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mb-6 sm:mb-8">You will be signed out. You need to log in again to enter the portal.</p>
            <div className="flex flex-col gap-2 sm:gap-3">
              <button onClick={handleLogout} className="w-full py-3 sm:py-4 bg-slate-900 dark:bg-emerald-600 text-white dark:text-[#041d18] rounded-xl sm:rounded-2xl font-black text-[9px] sm:text-[10px] uppercase tracking-[0.2em] shadow-xl">Confirm</button>
              <button onClick={() => setShowLogoutConfirm(false)} className="w-full py-3 sm:py-4 text-slate-400 font-black text-[9px] sm:text-[10px] uppercase tracking-[0.2em] mt-1 sm:mt-2">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* QUICK ACTIONS BUTTON */}
      {user?.role !== 'viewer' && user?.role !== 'farmer' && user?.role !== 'mentee' && (
        <div className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-50 flex flex-col gap-3 items-end">
          {showQuickActions && (
            <div className="flex flex-col gap-2 sm:gap-3 animate-in slide-in-from-bottom-4">
              <button onClick={() => { navigate('/map'); setShowQuickActions(false); }} className="flex items-center gap-3 px-3 py-2.5 sm:px-4 sm:py-3 bg-white dark:bg-[#0b241f] rounded-xl sm:rounded-2xl shadow-xl hover:bg-slate-50 dark:hover:bg-[#13332d] transition-all group border dark:border-white/5">
                <span className="text-[10px] sm:text-xs font-bold text-slate-600 dark:text-slate-300 group-hover:text-emerald-600 transition-colors">Map</span>
                <div className="p-1.5 sm:p-2 bg-amber-100 dark:bg-amber-500/20 text-amber-600 rounded-lg sm:rounded-xl group-hover:scale-110 transition-transform"><MapPinned size={16} className="sm:w-[18px] sm:h-[18px]"/></div>
              </button>
              <button onClick={() => { navigate('/farmers'); setShowQuickActions(false); }} className="flex items-center gap-3 px-3 py-2.5 sm:px-4 sm:py-3 bg-white dark:bg-[#0b241f] rounded-xl sm:rounded-2xl shadow-xl hover:bg-slate-50 dark:hover:bg-[#13332d] transition-all group border dark:border-white/5">
                <span className="text-[10px] sm:text-xs font-bold text-slate-600 dark:text-slate-300 group-hover:text-emerald-600 transition-colors">New Farmer</span>
                <div className="p-1.5 sm:p-2 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 rounded-lg sm:rounded-xl group-hover:scale-110 transition-transform"><Users size={16} className="sm:w-[18px] sm:h-[18px]"/></div>
              </button>
              <button onClick={() => { navigate('/surveys'); setShowQuickActions(false); }} className="flex items-center gap-3 px-3 py-2.5 sm:px-4 sm:py-3 bg-white dark:bg-[#0b241f] rounded-xl sm:rounded-2xl shadow-xl hover:bg-slate-50 dark:hover:bg-[#13332d] transition-all group border dark:border-white/5">
                <span className="text-[10px] sm:text-xs font-bold text-slate-600 dark:text-slate-300 group-hover:text-blue-600 transition-colors">Survey</span>
                <div className="p-1.5 sm:p-2 bg-blue-100 dark:bg-blue-500/20 text-blue-600 rounded-lg sm:rounded-xl group-hover:scale-110 transition-transform"><ClipboardList size={16} className="sm:w-[18px] sm:h-[18px]"/></div>
              </button>
            </div>
          )}
          <button 
            onClick={() => setShowQuickActions(!showQuickActions)} 
            className="p-3 sm:p-4 bg-emerald-600 text-white rounded-2xl sm:rounded-[1.5rem] shadow-2xl shadow-emerald-600/50 hover:bg-emerald-500 transition-all hover:scale-110 active:scale-95 flex items-center justify-center"
          >
            {showQuickActions ? <X size={20} className="sm:w-[24px] sm:h-[24px]" /> : <Plus size={20} className="sm:w-[24px] sm:h-[24px]" />}
          </button>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; overflow-x: hidden !important; }
      `}} />
    </div>
  );
}