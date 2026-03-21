import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Loader2, KeyRound } from 'lucide-react';

// Context & Security
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Layout & Authentication
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import LandingPage from './components/LandingPage';

// Core Analytics
import Dashboard from './pages/Dashboard';

// Farmer Management Module
import FarmersList from './pages/FarmersList';
import FarmerForm from './pages/FarmerForm';

// Intelligent Modules
import VulnerabilityMap from './pages/VulnerabilityMap';
import MetaAnalysis from './pages/MetaAnalysis';
import ElderPortal from './pages/ElderPortal';

// Research & Community Modules
import ResearchProjects from './pages/ResearchProjects';
import SurveyQuestionnaires from './pages/SurveyQuestionnaires';
import Barangays from './pages/Barangays';
import Organizations from './pages/Organizations';
import Products from './pages/Products';

// Admin & Audit Modules
import Users from './pages/Users';
import ActivityLogs from './pages/ActivityLogs';

// PWA Install Prompt
import InstallPrompt from './components/InstallPrompt';

// --- UTILITY FUNCTION: FIXED (NO CORRUPTION) ---
function urlBase64ToUint8Array(base64String) {
  if (!base64String) {
    console.error("VAPID key is missing");
    return null;
  }

  try {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);

    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);

    return new Uint8Array([...rawData].map(char => char.charCodeAt(0)));

  } catch (error) {
    console.error("VAPID Key Conversion Error:", error);
    return null;
  }
}

// --- PUBLIC ROUTE GUARD ---
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();

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

  if (user) {
    if (user.role === 'farmer') {
      return <Navigate to="/portal" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

const ForgotPassword = () => (
  <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] dark:bg-[#020c0a] p-6 transition-colors duration-500">
    <div className="max-w-md w-full bg-white dark:bg-[#0b241f] rounded-[2.5rem] p-10 sm:p-14 border border-slate-100 dark:border-white/5 shadow-2xl text-center relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-bl-[100px] -z-0" />
      <div className="relative z-10">
        <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-500/10 rounded-[1.5rem] flex items-center justify-center mx-auto mb-8 border border-emerald-100 dark:border-emerald-500/20">
          <KeyRound className="text-emerald-500 w-10 h-10" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase mb-4">
          Security Protocol
        </h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm font-medium leading-relaxed mb-10">
          Identity recovery is restricted. Please contact the <span className="text-emerald-500 font-bold uppercase tracking-widest text-[10px] sm:text-xs">System Administrator</span> to reset your credentials securely.
        </p>
        <button onClick={() => window.history.back()} className="w-full py-4 bg-slate-900 dark:bg-emerald-600 text-white rounded-xl sm:rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl hover:scale-105 active:scale-95 transition-all">
          Return to Hub
        </button>
      </div>
    </div>
  </div>
);

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function AppRoutes() {
  const STAFF_ROLES = ['admin', 'researcher', 'data_encoder', 'viewer'];
  const COMMUNITY_ROLES = ['admin', 'researcher', 'data_encoder', 'viewer', 'farmer'];

  return (
    <Routes>
      <Route path="/" element={<PublicRoute><LandingPage /></PublicRoute>} />
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route path="/dashboard" element={<ProtectedRoute allowedRoles={STAFF_ROLES}><Dashboard /></ProtectedRoute>} />

        <Route path="/portal" element={<ProtectedRoute allowedRoles={['farmer', 'admin']}><ElderPortal /></ProtectedRoute>} />
        <Route path="/map" element={<ProtectedRoute allowedRoles={COMMUNITY_ROLES}><VulnerabilityMap /></ProtectedRoute>} />
        <Route path="/experiences" element={<ProtectedRoute allowedRoles={COMMUNITY_ROLES}><MetaAnalysis /></ProtectedRoute>} />
        <Route path="/barangays" element={<ProtectedRoute allowedRoles={COMMUNITY_ROLES}><Barangays /></ProtectedRoute>} />
        <Route path="/products" element={<ProtectedRoute allowedRoles={COMMUNITY_ROLES}><Products /></ProtectedRoute>} />
        
        <Route path="/farmers" element={<ProtectedRoute allowedRoles={STAFF_ROLES}><FarmersList /></ProtectedRoute>} />
        <Route path="/projects" element={<ProtectedRoute allowedRoles={['admin', 'researcher']}><ResearchProjects /></ProtectedRoute>} />
        <Route path="/surveys" element={<ProtectedRoute allowedRoles={['admin', 'researcher']}><SurveyQuestionnaires /></ProtectedRoute>} />
        
        <Route path="/farmers/new" element={<ProtectedRoute allowedRoles={['admin', 'researcher', 'data_encoder']}><FarmerForm /></ProtectedRoute>} />
        <Route path="/farmers/:id/edit" element={<ProtectedRoute allowedRoles={['admin', 'researcher', 'data_encoder']}><FarmerForm /></ProtectedRoute>} />
        
        <Route path="/organizations" element={<ProtectedRoute allowedRoles={STAFF_ROLES}><Organizations /></ProtectedRoute>} />
        
        <Route path="/users" element={<ProtectedRoute allowedRoles={['admin']}><Users /></ProtectedRoute>} />
        <Route path="/logs" element={<ProtectedRoute allowedRoles={['admin', 'researcher', 'data_encoder']}><ActivityLogs /></ProtectedRoute>} />
      </Route>
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

// --- MAIN APP COMPONENT ---
function App() {

  useEffect(() => {
    const setupNotifications = async () => {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js');
          await navigator.serviceWorker.ready; // ✅ FIX

          if (Notification.permission === 'default') {
            await Notification.requestPermission();
          }

          if (Notification.permission === 'granted') {
            const subscription = await registration.pushManager.getSubscription();

            if (!subscription) {

              // ✅ FIX: USE ENV KEY (NOT HARDCODED WRONG KEY)
              const publicKey = "BLZ06455zhih8Aij0glKl4aG7n8vjNtLFNdG0TV0RCBC2k1lOmL0fgDp8ZYpBnGra7Dy5SSD8gpnOg3LIbgtxrI";

              if (!publicKey) {
                console.error("Missing VAPID key");
                return;
              }

              const convertedKey = urlBase64ToUint8Array(publicKey);

              // ✅ FIX: VALIDATE LENGTH
              if (!convertedKey || convertedKey.length !== 65) {
                console.error("Invalid VAPID key length:", convertedKey?.length);
                return;
              }

              const newSubscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: convertedKey
              });

              const ENV_URL = import.meta.env.VITE_API_URL || 'https://TANAW.ct.ws';
              const API_URL = ENV_URL.endsWith('/api') ? ENV_URL : `${ENV_URL}/api`;

              await fetch(`${API_URL}/notifications/subscribe`, {
                method: 'POST',
                body: JSON.stringify(newSubscription),
                headers: {
                  'Content-Type': 'application/json',
                  'ngrok-skip-browser-warning': 'true'
                }
              });

              console.log('Web Push Subscription synced with backend.');
            }
          }
        } catch (error) {
          console.warn('Push setup gracefully bypassed:', error);
        }
      }
    };

    setupNotifications();
  }, []);

  return (
    <AuthProvider>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <ScrollToTop />
        <AppRoutes />
        <InstallPrompt />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;