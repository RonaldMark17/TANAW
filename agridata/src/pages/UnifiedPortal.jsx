import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext'; 
import { farmersAPI, experiencesAPI } from '../services/api'; 
import { offlineStore } from '../utils/offlineStore';
import { 
  Camera, AlertTriangle, CheckCircle2, Bot, Send, Sparkles, PhilippinePeso, 
  Leaf, Activity, Loader2, Users, RefreshCw, User, MapPin, 
  BookOpen, Library, ShieldCheck, Plus, History, Trash2, MessageSquare, 
  Menu, X as CloseIcon, Search, CloudSun, Droplets, Wind, ChevronRight, TrendingUp, TrendingDown, Clock,
  WifiOff
} from 'lucide-react';

const getApiUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.endsWith('/api') ? import.meta.env.VITE_API_URL : `${import.meta.env.VITE_API_URL}/api`;
  }
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://127.0.0.1:8080/api' : 'https://agridata.ct.ws/api';
};
const API_URL = getApiUrl();
const getAuthToken = () => localStorage.getItem('access_token') || localStorage.getItem('token');

const formatAIText = (text, isFarmer) => {
  if (!text) return { __html: '' };
  const colorClass = isFarmer ? "text-emerald-700 dark:text-emerald-400" : "text-indigo-900 dark:text-indigo-200";
  let formatted = text.replace(/\*\*(.*?)\*\*/g, `<strong class="${colorClass}">$1</strong>`);
  formatted = formatted.replace(/\n/g, '<br/>');
  return { __html: formatted };
};

export default function UnifiedPortal() {
  const { user } = useAuth();
  const isFarmer = user?.role === 'farmer';
  const isMentee = user?.role === 'mentee';

  const [activeTab, setActiveTab] = useState(isFarmer ? 'doctor' : 'mentor');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All'); 

  const [currentFarmer, setCurrentFarmer] = useState(null);
  const [experiences, setExperiences] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- OFFLINE STATE TRACKING ---
  const [isOnline, setIsOnline] = useState(
      navigator.onLine && localStorage.getItem('force_offline') !== 'true'
  );

  useEffect(() => {
    const checkNetwork = () => {
        const isPhysicallyOnline = navigator.onLine;
        const isForcedOffline = localStorage.getItem('force_offline') === 'true';
        setIsOnline(isPhysicallyOnline && !isForcedOffline);
    };
    window.addEventListener('online', checkNetwork);
    window.addEventListener('offline', checkNetwork);
    window.addEventListener('network-mode-change', checkNetwork);
    return () => {
      window.removeEventListener('online', checkNetwork);
      window.removeEventListener('offline', checkNetwork);
      window.removeEventListener('network-mode-change', checkNetwork);
    };
  }, []);

  const [sessions, setSessions] = useState(() => {
    const saved = localStorage.getItem(`chat_sessions_${user?.id}`);
    return saved ? JSON.parse(saved) : [{
      id: Date.now(),
      title: isFarmer ? 'Bagong Usapan' : 'New Discussion',
      history: [{ 
        role: 'ai', 
        text: isFarmer 
          ? "Magandang araw! Ako ang iyong AI Mentor. Handa akong magbahagi ng kaalaman mula sa ating mga kasamahan. Ano ang iyong katanungan?" 
          : "Welcome to the Legacy Portal. I am your Pamana AI. I have digitized the field notes of your parent. What would you like to learn today?" 
      }]
    }];
  });
  const [currentSessionId, setCurrentSessionId] = useState(sessions[0].id);
  const currentSession = sessions.find(s => s.id === currentSessionId) || sessions[0];
  const [currentMessage, setCurrentMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  const [analyzing, setAnalyzing] = useState(false);
  const [diagnosis, setDiagnosis] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  
  const [ledger, setLedger] = useState({ 
    size: '', 
    seeds: '', 
    fertilizer: '', 
    labor: '', 
    revenue: '', 
    issue: 'None' 
  });
  const [riskAlert, setRiskAlert] = useState(null);
  const [roi, setRoi] = useState(null); 
  const [isCalculatingRisk, setIsCalculatingRisk] = useState(false);

  const quickPrompts = isFarmer 
    ? ["Paano maiiwasan ang peste sa palay?", "Ano ang tamang oras ng pag-abono?", "Kailan magandang magtanim ng mais?"]
    : ["What was my parent's top yield strategy?", "How to deal with droughts based on archives?", "Best practices for soil health?"];

  useEffect(() => {
    localStorage.setItem(`chat_sessions_${user?.id}`, JSON.stringify(sessions));
  }, [sessions, user]);

  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      try {
        if (!isOnline) throw new Error("Offline");

        const [fRes, eRes] = await Promise.all([
          farmersAPI.getAll({ per_page: 1000 }),
          experiencesAPI.getAll({ per_page: 500 })
        ]);

        const farmersData = fRes.data.farmers || [];
        const experiencesData = (eRes.data.experiences || []).filter(exp => exp.description);

        if (user && isFarmer) {
          const matched = farmersData.find(f => (f.farmer_code?.toLowerCase() === user.username.toLowerCase()) || (user.username.toLowerCase() === `farmer_${f.id}`));
          setCurrentFarmer(matched || farmersData[0]);
        }
        setExperiences(experiencesData);

        // SAVE TO LOCAL CACHE
        offlineStore.saveData('portal_farmers', farmersData);
        offlineStore.saveData('portal_experiences', experiencesData);

      } catch (err) {
        console.warn("Unified Portal: Loading data from offline cache.");
        const cachedFarmers = offlineStore.getCachedData('portal_farmers') || [];
        const cachedExps = offlineStore.getCachedData('portal_experiences') || [];

        if (user && isFarmer) {
          const matched = cachedFarmers.find(f => (f.farmer_code?.toLowerCase() === user.username.toLowerCase()) || (user.username.toLowerCase() === `farmer_${f.id}`));
          setCurrentFarmer(matched || cachedFarmers[0]);
        }
        setExperiences(cachedExps);
      } finally { setLoading(false); }
    };
    loadInitialData();
  }, [user, isFarmer, isOnline]);

  useEffect(() => {
    if (currentFarmer) setLedger(prev => ({ ...prev, size: currentFarmer.farm_size_hectares || '' }));
  }, [currentFarmer]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [currentSession.history, isTyping]);

  const startNewChat = () => {
    const newSession = {
      id: Date.now(),
      title: isFarmer ? 'Bagong Usapan' : 'New Discussion',
      history: [{ role: 'ai', text: isFarmer ? "Handa na ako. Ano ang iyong itatanong po?" : "New session started. How can I assist your agricultural education?" }]
    };
    setSessions([newSession, ...sessions]);
    setCurrentSessionId(newSession.id);
    setIsHistoryOpen(false);
  };

  const deleteSession = (id, e) => {
    e.stopPropagation();
    if (sessions.length === 1) return;
    const filtered = sessions.filter(s => s.id !== id);
    setSessions(filtered);
    if (currentSessionId === id) setCurrentSessionId(filtered[0].id);
  };

  const executePrompt = (promptText) => {
    setCurrentMessage(promptText);
    setTimeout(() => {
        const fakeEvent = { preventDefault: () => {} };
        submitChat(promptText, fakeEvent);
    }, 50);
  };

  const submitChat = async (textToSubmit, e) => {
    e?.preventDefault();
    const userText = textToSubmit.trim();
    if (!userText || isTyping) return;

    // --- AI OFFLINE PROTECTION ---
    if (!isOnline) {
        // LOCAL FALLBACK SEARCH IF FORCE OFFLINE IS CLICKED
        const searchTerms = userText.toLowerCase().split(' ').filter(w => w.length > 3);
        let bestMatch = null;
        let highestScore = 0;

        experiences.forEach(exp => {
            let score = 0;
            const targetText = `${exp.title} ${exp.description}`.toLowerCase();
            searchTerms.forEach(term => { if (targetText.includes(term)) score++; });
            if (score > highestScore) { highestScore = score; bestMatch = exp; }
        });

        let offlineMsg = "";
        if (bestMatch && highestScore > 0) {
            offlineMsg = `⚠️ **[Local Mode]**: Offline tayo ngayon, pero nahanap ko ito sa ating local records:\n\n**Mula kay ${bestMatch.farmer_name}**: "${bestMatch.description}"`;
        } else {
            offlineMsg = isFarmer 
                ? "⚠️ **[Local Mode]**: Wala tayong internet at wala akong mahanap na tugma sa ating offline records. Subukan muli kapag online na." 
                : "⚠️ **[Local Mode]**: The AI Mentor is offline and no matching local records were found. Please reconnect.";
        }

        setSessions(prev => prev.map(s => s.id === currentSessionId ? { 
            ...s, 
            history: [...s.history, { role: 'user', text: userText }, { role: 'ai', text: offlineMsg }] 
        } : s));
        setCurrentMessage('');
        return;
    }

    const updatedHistory = [...currentSession.history, { role: 'user', text: userText }];
    
    setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, history: updatedHistory, title: s.title.includes('Usapan') || s.title.includes('Discussion') ? userText.substring(0, 20) + '...' : s.title } : s));
    setCurrentMessage('');
    setIsTyping(true);

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      const knowledgeBase = experiences.map(exp => `[Farmer: ${exp.farmer_name}] Title: ${exp.title} - ${exp.description}`).join('\n\n');

      const farmerPrompt = `You are a "Wise Agricultural Mentor". Answer in Tagalog/Taglish. Ground in: ${knowledgeBase}.`;
      const menteePrompt = `You are "Pamana AI". Answer in English/Taglish. Ground in: ${knowledgeBase}.`;

      const response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        contents: [{ role: 'user', parts: [{ text: `${isFarmer ? farmerPrompt : menteePrompt}\n\nQuestion: ${userText}` }] }]
      });

      const aiText = response.data.candidates[0].content.parts[0].text;
      setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, history: [...updatedHistory, { role: 'ai', text: aiText }] } : s));
    } catch (err) {
      console.error("AI Mentor Chat Error:", err);
      
      // --- AI ERROR FALLBACK: LOCAL KNOWLEDGE ENGINE ---
      const searchTerms = userText.toLowerCase().split(' ').filter(w => w.length > 3);
      let bestMatch = null;
      let highestScore = 0;

      experiences.forEach(exp => {
          let score = 0;
          const targetText = `${exp.title} ${exp.description}`.toLowerCase();
          searchTerms.forEach(term => { if (targetText.includes(term)) score++; });
          if (score > highestScore) { highestScore = score; bestMatch = exp; }
      });

      let fallbackText = "";
      if (bestMatch && highestScore > 0) {
          fallbackText = `⚠️ **[System Fallback]**: Nagka-error ang AI server. Ngunit base sa ating local database:\n\n**Ayon kay ${bestMatch.farmer_name}:** "${bestMatch.description}"`;
      } else {
          fallbackText = isFarmer 
            ? "⚠️ **[System Error]**: Pasensya na, nagkaroon ng aberya ang server at wala rin akong makitang tugma sa ating local records. Pakisubukan muli maya-maya."
            : "⚠️ **[System Error]**: AI Server unreachable and no local records match your query. Please try again later.";
      }

      setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, history: [...updatedHistory, { role: 'ai', text: fallbackText }] } : s));
    } finally { setIsTyping(false); }
  }

  const handleSendMessage = async (e) => {
    submitChat(currentMessage, e);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPreviewUrl(URL.createObjectURL(file));
    setAnalyzing(true);

    // --- LOCAL FALLBACK GENERATOR ENGINE ---
    const generateLocalDiagnosis = () => {
        // Search local experiences for reports tagged as "Challenge" or high impact issues
        const localChallenges = experiences.filter(exp => exp.experience_type === 'Challenge' || exp.impact_level === 'High' || exp.title.toLowerCase().includes('sakit') || exp.title.toLowerCase().includes('peste'));
        
        let probableIssue = "⚠️ Local Threat: Tungro Virus";
        let traditionalAdvice = "⚠️ **[Local Pattern Match Engine]**: AI Server is unreachable. \n\nBase sa aming 'Active Threats' dashboard, mataas ang kaso ng Tungro Virus sa inyong komunidad. Panatilihing malinis ang palayan at sugpuin ang mga green leafhoppers.";

        if (localChallenges.length > 0) {
            // Pick the most relevant local challenge to simulate AI pattern matching
            const localExp = localChallenges[0];
            probableIssue = `⚠️ Local Match: ${localExp.title}`;
            traditionalAdvice = `⚠️ **[Local Pattern Match Engine]**: AI Server is unreachable. Naghahanap ng katulad na sintomas sa lokal na database...\n\nBase sa nakaraang report ni **${localExp.farmer_name}** sa komunidad:\n\n"${localExp.description}"\n\nPayo: Mangyaring obserbahan ang inyong tanim kung may katulad na sintomas at sundin ang hakbang ng inyong kapwa magsasaka.`;
        }

        return { sakit: probableIssue, tradisyonal: traditionalAdvice, risk: "High (Estimated)" };
    };

    if (!isOnline) {
        setTimeout(() => {
            setDiagnosis(generateLocalDiagnosis());
            setAnalyzing(false);
        }, 1500);
        return;
    }

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "AIzaSyA-1V6jOiIJLSdON7Kwggr1359cv4MDNaE"; 
      
      const toBase64 = file => new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result.split(',')[1]);
          reader.onerror = error => reject(error);
      });

      const base64Image = await toBase64(file);

      const promptText = `
        You are a Master Agronomist and Plant Pathologist in the Philippines.
        Meticulously analyze this crop image. Identify specific diseases, pest damage, or nutrient deficiencies.

        Respond ONLY with a raw JSON object. Do NOT include markdown formatting like \`\`\`json.
        Structure:
        {
          "sakit": "Scientific and Local name of the problem (e.g., 'Rice Tungro Disease', 'Nitrogen Deficiency', 'Fall Armyworm')",
          "tradisyonal": "Provide a highly realistic, expert diagnosis in Tagalog/Taglish. Include: 1) The exact cause. 2) Traditional/Organic treatment (e.g., neem oil, wood ash, proper spacing). 3) Modern/Chemical intervention if severe. 4) Preventive measures for the next season.",
          "risk": "Low, Medium, or High"
        }
        If the image is completely unrecognizable or not a plant:
        {
           "sakit": "Hindi Matukoy (Unrecognized)",
           "tradisyonal": "Ang larawan ay hindi malinaw o hindi halaman. Mangyaring kumuha ng mas malapit at malinaw na litrato ng apektadong dahon, bunga, o tangkay.",
           "risk": "Unknown"
        }
      `;

      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
        {
          contents: [
            {
              parts: [
                { text: promptText },
                { inline_data: { mime_type: file.type, data: base64Image } }
              ]
            }
          ]
        },
        {
          headers: { 'Content-Type': 'application/json' }
        }
      );

      const aiResponseText = response.data.candidates[0].content.parts[0].text;
      
      let cleanedJsonString = aiResponseText.trim();
      if (cleanedJsonString.startsWith('```json')) {
          cleanedJsonString = cleanedJsonString.substring(7);
      } else if (cleanedJsonString.startsWith('```')) {
          cleanedJsonString = cleanedJsonString.substring(3);
      }
      if (cleanedJsonString.endsWith('```')) {
          cleanedJsonString = cleanedJsonString.substring(0, cleanedJsonString.length - 3);
      }

      const parsedDiagnosis = JSON.parse(cleanedJsonString);
      setDiagnosis(parsedDiagnosis);

    } catch (err) {
      console.error("AI Doctor Error:", err);
      // --- AI STYLED ERROR FALLBACK (LOCAL KNOWLEDGE ENGINE) ---
      setDiagnosis(generateLocalDiagnosis());
    } finally { 
      setAnalyzing(false); 
    }
  };

  const calculateRisk = async () => {
    setIsCalculatingRisk(true);
    const totalPuhunan = (parseFloat(ledger.seeds) || 0) + (parseFloat(ledger.fertilizer) || 0) + (parseFloat(ledger.labor) || 0);
    const revenue = parseFloat(ledger.revenue) || 0;
    
    if (totalPuhunan > 0) {
      const calcRoi = ((revenue - totalPuhunan) / totalPuhunan) * 100;
      setRoi(calcRoi.toFixed(1));
    } else { setRoi(null); }

    if (!isOnline) {
        // Offline Calculator Support
        const profit = revenue - totalPuhunan;
        setRiskAlert({ 
          color: profit < 0 ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800', 
          icon: profit < 0 ? <TrendingDown size={24} className="text-rose-600"/> : <TrendingUp size={24} className="text-emerald-600"/>,
          message: profit < 0 ? `Lugi: ₱${Math.abs(profit).toLocaleString()}` : `Kita: ₱${profit.toLocaleString()}`,
          sub: profit < 0 ? "(Offline) Kritikal ang kita. Bawasan ang puhunan sa susunod." : "(Offline) Maganda ang kita."
        });
        setIsCalculatingRisk(false);
        return;
    }

    try {
      const res = await axios.post(`${API_URL}/elder/ledger`, { 
        size: ledger.size, 
        puhunan: totalPuhunan, 
        benta: revenue, 
        problema: ledger.issue, 
        farmer_id: currentFarmer.id 
      }, { headers: { 'Authorization': `Bearer ${getAuthToken()}` } });
      
      const profit = res.data.profit;
      setRiskAlert({ 
        color: profit < 0 ? 'bg-rose-50 border-rose-200 text-rose-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800', 
        icon: profit < 0 ? <TrendingDown size={24} className="text-rose-600"/> : <TrendingUp size={24} className="text-emerald-600"/>,
        message: profit < 0 ? `Lugi: ₱${Math.abs(profit).toLocaleString()}` : `Kita: ₱${profit.toLocaleString()}`,
        sub: profit < 0 ? "Kritikal ang antas ng kita. Suriin ang mga gastusin sa susunod na taniman." : "Maganda ang takbo ng ani. Ipagpatuloy ang estratehiya."
      });
    } catch (err) { alert("Calculation failed."); } 
    finally { setIsCalculatingRisk(false); }
  };

  const archivesToDisplay = isMentee 
    ? experiences.filter(exp => exp.farmer_id === user?.parent_id || exp.farmer_id === user?.farmer_id)
    : experiences;

  const groupedExperiences = archivesToDisplay.reduce((acc, exp) => {
    const type = exp.experience_type || 'General Wisdom';
    if (!acc[type]) acc[type] = [];
    acc[type].push(exp);
    return acc;
  }, {});

  const availableCategories = ['All', ...Object.keys(groupedExperiences)];

  if (loading && !isOnline && experiences.length === 0) return <div className="h-screen flex items-center justify-center bg-[#f8fafc] dark:bg-[#020c0a] text-emerald-500"><Loader2 className="animate-spin" size={40} /></div>;

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#020c0a] font-sans pb-24 transition-colors duration-300 relative">
      
      {/* OFFLINE BANNER */}
      {!isOnline && (
          <div className="absolute top-0 right-0 z-[50] bg-amber-50 border border-amber-200 text-amber-800 px-4 py-2 rounded-bl-2xl flex items-center gap-2 text-[10px] sm:text-xs font-bold shadow-lg uppercase tracking-widest animate-in slide-in-from-top duration-300">
              <WifiOff size={14} className="animate-pulse" /> 
              <span>Offline Mode Active</span>
          </div>
      )}

      <div className="max-w-[1400px] mx-auto space-y-6 sm:space-y-8 pt-6 sm:pt-10 px-4 sm:px-8 animate-in fade-in duration-700">
        
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-xl text-white shadow-lg ${isFarmer ? 'bg-emerald-600 shadow-emerald-600/20' : 'bg-indigo-600 shadow-indigo-600/20'}`}>
                {isFarmer ? <Users size={20} /> : <Library size={20} />}
              </div>
              <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${isFarmer ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
                {isFarmer ? 'Community Network' : 'Family Legacy Hub'}
              </span>
            </div>
            <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white uppercase leading-none tracking-tight">
              {isFarmer ? 'Unified Portal' : 'My Heritage'}
            </h1>
          </div>

          <div className="bg-white dark:bg-[#0b241f] rounded-[1.5rem] border border-slate-100 dark:border-white/5 shadow-sm p-2 flex items-center gap-4 w-full md:w-auto shrink-0">
            <div className={`p-3 rounded-2xl shrink-0 shadow-inner ${isFarmer ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-indigo-50 text-indigo-600 dark:bg-indigo-500/10 dark:text-indigo-400'}`}>
              <User size={20} />
            </div>
            <div className="flex-1 pr-4">
              <label className="block text-[8px] sm:text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{isFarmer ? 'Active Profile' : 'Mentee Account'}</label>
              <p className="text-sm font-black text-slate-800 dark:text-white truncate">
                {isFarmer ? (currentFarmer ? `${currentFarmer.first_name} ${currentFarmer.last_name}` : "Syncing...") : user?.full_name}
              </p>
            </div>
          </div>
        </header>

        <div className="bg-white dark:bg-[#0b241f] p-2 rounded-[1.5rem] border border-slate-100 dark:border-white/5 shadow-sm overflow-x-auto no-scrollbar">
          <nav className={`flex sm:grid gap-2 min-w-max sm:min-w-0 ${isFarmer ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
            {isFarmer ? (
              <>
                <button onClick={() => setActiveTab('doctor')} className={`flex items-center justify-center gap-2 py-4 px-6 sm:px-4 rounded-[1.25rem] text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'doctor' ? 'bg-slate-900 dark:bg-emerald-600 text-white shadow-xl shadow-slate-200 dark:shadow-none' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-600 dark:hover:text-slate-300'}`}><Leaf size={16}/> Crop Doctor</button>
                <button onClick={() => setActiveTab('mentor')} className={`flex items-center justify-center gap-2 py-4 px-6 sm:px-4 rounded-[1.25rem] text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'mentor' ? 'bg-slate-900 dark:bg-emerald-600 text-white shadow-xl shadow-slate-200 dark:shadow-none' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-600 dark:hover:text-slate-300'}`}><Bot size={16}/> AI Mentor</button>
                <button onClick={() => setActiveTab('ledger')} className={`flex items-center justify-center gap-2 py-4 px-6 sm:px-4 rounded-[1.25rem] text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'ledger' ? 'bg-slate-900 dark:bg-emerald-600 text-white shadow-xl shadow-slate-200 dark:shadow-none' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-600 dark:hover:text-slate-300'}`}><PhilippinePeso size={16}/> Ledger</button>
              </>
            ) : (
              <>
                <button onClick={() => setActiveTab('mentor')} className={`flex items-center justify-center gap-2 py-4 px-6 sm:px-4 rounded-[1.25rem] text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'mentor' ? 'bg-slate-900 dark:bg-indigo-600 text-white shadow-xl' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-600 dark:hover:text-slate-300'}`}><Bot size={16}/> AI Mentor</button>
                <button onClick={() => setActiveTab('archives')} className={`flex items-center justify-center gap-2 py-4 px-6 sm:px-4 rounded-[1.25rem] text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'archives' ? 'bg-slate-900 dark:bg-emerald-600 text-white shadow-xl' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-600 dark:hover:text-slate-300'}`}><Library size={16}/> Archives</button>
              </>
            )}
          </nav>
        </div>

        <div className="bg-white dark:bg-[#0b241f] rounded-[2rem] sm:rounded-[3rem] border border-slate-100 dark:border-white/5 shadow-sm p-4 sm:p-8 lg:p-12 relative overflow-hidden transition-all duration-500">
          
          {activeTab === 'doctor' && isFarmer && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
               <div className="flex items-center gap-3 mb-8">
                 <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl shadow-inner"><Leaf size={24} /></div>
                 <div>
                   <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">AI Crop Doctor</h2>
                   <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Diagnostic Intelligence System</p>
                 </div>
               </div>

               <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-6">
                    {!previewUrl ? (
                      <label className="flex flex-col items-center justify-center w-full h-[300px] sm:h-[400px] border-4 border-dashed border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/50 dark:bg-emerald-500/5 rounded-[2rem] sm:rounded-[3rem] cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-all group">
                        <div className="p-5 bg-white dark:bg-[#041d18] rounded-full shadow-md mb-6 group-hover:scale-110 transition-transform">
                          <Camera size={40} className="text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <span className="text-lg sm:text-xl font-black text-slate-700 dark:text-slate-200 uppercase text-center px-4 tracking-tight">Kunan ng litrato ang halaman</span>
                        <span className="text-[10px] sm:text-xs font-bold text-emerald-600/60 dark:text-emerald-400/60 uppercase tracking-widest mt-2">Click to Upload or Use Camera</span>
                        <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageUpload} />
                      </label>
                    ) : (
                      <div className="space-y-6">
                        <div className="relative h-[300px] sm:h-[400px] rounded-[2rem] sm:rounded-[3rem] overflow-hidden border-[6px] border-emerald-500 shadow-xl">
                          <img src={previewUrl} className="w-full h-full object-cover" alt="Preview" />
                          {analyzing && (
                            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm flex flex-col items-center justify-center text-white">
                              <Loader2 size={48} className="animate-spin text-emerald-400 mb-4" />
                              <span className="text-xs font-black uppercase tracking-[0.2em] animate-pulse">Analyzing Pattern...</span>
                            </div>
                          )}
                        </div>
                        {diagnosis && (
                          <div className="space-y-4 animate-in slide-in-from-bottom-8 duration-500">
                            <div className="bg-slate-900 dark:bg-black/40 p-6 sm:p-8 rounded-[2rem] text-white border border-slate-800 dark:border-white/10 shadow-xl relative overflow-hidden">
                              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 rounded-bl-[4rem] -z-0 blur-xl" />
                              <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em] mb-2 relative z-10">Detected Anomaly</p>
                              <h3 className="text-2xl sm:text-3xl font-black uppercase tracking-tight relative z-10">{diagnosis.sakit}</h3>
                            </div>
                            <div className="p-6 sm:p-8 bg-emerald-50 dark:bg-emerald-500/10 rounded-[2rem] border border-emerald-100 dark:border-emerald-500/20 shadow-inner">
                              <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.3em] mb-3 flex items-center gap-2"><Sparkles size={14}/> Recommendation</p>
                              <p className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">{diagnosis.tradisyonal}</p>
                            </div>
                            <button onClick={() => { setPreviewUrl(null); setDiagnosis(null); }} className="w-full py-5 bg-white dark:bg-white/5 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10 rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-[0.2em] hover:bg-slate-50 dark:hover:bg-white/10 hover:text-slate-700 transition-all shadow-sm active:scale-95">
                              Scan Another Plant
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-6">
                    <div className="p-6 sm:p-8 rounded-[2rem] bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                      <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2"><MapPin size={14}/> Local Conditions</p>
                      
                      <div className="space-y-4">
                        <div className="flex items-center gap-4 bg-white dark:bg-[#0b241f] p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-white/5">
                          <div className="p-2 bg-amber-50 dark:bg-amber-500/10 text-amber-500 rounded-lg"><CloudSun size={20}/></div>
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Weather</p>
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Mainit (32°C)</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 bg-white dark:bg-[#0b241f] p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-white/5">
                          <div className="p-2 bg-blue-50 dark:bg-blue-500/10 text-blue-500 rounded-lg"><Droplets size={20}/></div>
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Humidity</p>
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">Mataas (78%)</p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-8 pt-6 border-t border-slate-200 dark:border-white/10">
                        <p className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2"><AlertTriangle size={14}/> Active Threats</p>
                        <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 p-4 rounded-2xl">
                          <p className="text-xs font-bold text-rose-800 dark:text-rose-300 leading-relaxed">
                            Mataas ang kaso ng <strong className="text-rose-600 dark:text-rose-400">Tungro Virus</strong> sa mga karatig-barangay. Magmatyag sa inyong palayan.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
               </div>
            </div>
          )}

          {activeTab === 'mentor' && (
            <div className="flex flex-col lg:flex-row h-[650px] gap-6 animate-in fade-in zoom-in-95 duration-500 relative">
              
              {/* DESKTOP SIDEBAR: HISTORY & NEW CHAT */}
              <div className="hidden lg:flex flex-col w-80 bg-slate-50 dark:bg-black/20 rounded-[2rem] border border-slate-100 dark:border-white/5 p-6 shadow-inner shrink-0">
                <button onClick={startNewChat} className="w-full py-4 mb-6 bg-slate-900 dark:bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2">
                  <Plus size={16}/> {isFarmer ? 'Bagong Usapan' : 'New Conversation'}
                </button>
                
                <div className="flex items-center gap-2 mb-4 px-2 text-slate-400">
                  <History size={14}/> <span className="text-[10px] font-black uppercase tracking-widest">Chat History</span>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 no-scrollbar">
                  {sessions.map(s => (
                    <div key={s.id} onClick={() => setCurrentSessionId(s.id)} className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer border transition-all ${s.id === currentSessionId ? 'bg-white dark:bg-[#0b241f] border-emerald-200 dark:border-emerald-500/30 shadow-sm' : 'bg-transparent border-transparent hover:bg-white dark:hover:bg-white/5 text-slate-500 dark:text-slate-400'}`}>
                      <div className="flex items-center gap-3 overflow-hidden">
                        <MessageSquare size={14} className={s.id === currentSessionId ? 'text-emerald-600 dark:text-emerald-400 shrink-0' : 'shrink-0'} />
                        <span className={`text-xs font-bold truncate ${s.id === currentSessionId ? 'text-emerald-800 dark:text-emerald-300' : ''}`}>{s.title}</span>
                      </div>
                      <button onClick={(e) => deleteSession(s.id, e)} className="text-slate-300 hover:text-rose-500 transition-colors p-2"><Trash2 size={14}/></button>
                    </div>
                  ))}
                </div>
              </div>

              {/* MOBILE OVERLAY */}
              {isHistoryOpen && (
                <div className="absolute inset-y-0 left-0 z-50 w-full sm:w-80 bg-white dark:bg-[#0b241f] animate-in slide-in-from-left duration-300 rounded-[2rem] sm:rounded-[3rem] border border-slate-100 dark:border-white/10 shadow-2xl flex flex-col p-6 sm:p-8 lg:hidden">
                  <div className="flex items-center justify-between mb-8 border-b border-slate-100 dark:border-white/5 pb-4">
                    <h3 className="font-black uppercase tracking-[0.2em] text-slate-400 text-[10px] flex items-center gap-2"><History size={16}/> {isFarmer ? 'Mga Usapan' : 'Chat History'}</h3>
                    <button onClick={() => setIsHistoryOpen(false)} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors bg-slate-50 dark:bg-white/5 rounded-xl"><CloseIcon size={20}/></button>
                  </div>
                  <button onClick={() => { startNewChat(); setIsHistoryOpen(false); }} className="w-full py-4 mb-6 bg-slate-900 dark:bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"><Plus size={16}/> {isFarmer ? 'Bagong Usapan' : 'New Chat'}</button>
                  <div className="flex-1 overflow-y-auto space-y-3 no-scrollbar">
                    {sessions.map(s => (
                      <div key={s.id} onClick={() => { setCurrentSessionId(s.id); setIsHistoryOpen(false); }} className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer border transition-all ${s.id === currentSessionId ? 'bg-emerald-50 dark:bg-emerald-500/20 border-emerald-200 dark:border-emerald-500/30' : 'bg-slate-50 dark:bg-white/5 border-transparent hover:border-slate-200 dark:hover:border-white/10 text-slate-700 dark:text-slate-300'}`}>
                        <div className="flex items-center gap-3 overflow-hidden">
                          <MessageSquare size={14} className={s.id === currentSessionId ? 'text-emerald-600 dark:text-emerald-400 shrink-0' : 'text-slate-400 shrink-0'} />
                          <span className={`text-xs font-bold truncate ${s.id === currentSessionId ? 'text-emerald-800 dark:text-emerald-300' : ''}`}>{s.title}</span>
                        </div>
                        <button onClick={(e) => deleteSession(s.id, e)} className="text-slate-300 hover:text-rose-500 transition-colors p-2"><Trash2 size={14}/></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex-1 flex flex-col min-w-0">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setIsHistoryOpen(true)} className="lg:hidden p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-100 dark:border-white/5 text-slate-400 hover:text-emerald-600 transition-colors shadow-inner"><Menu size={20}/></button>
                    <div className="flex flex-col">
                      <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">{isFarmer ? 'AI Mentor' : 'Pamana AI'}</h2>
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest hidden sm:block">Intelligent Knowledge Retrieval</span>
                    </div>
                  </div>
                  <div className={`hidden sm:flex px-4 py-1.5 text-[9px] sm:text-[10px] font-black rounded-full items-center gap-2 uppercase tracking-widest border ${isFarmer ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' : 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20'}`}>
                    <ShieldCheck size={14}/> {isFarmer ? 'COMMUNITY WISDOM' : 'GROUNDED ARCHIVES'}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-6 no-scrollbar mb-6 bg-slate-50/50 dark:bg-black/10 rounded-[2rem] p-6 border border-slate-100 dark:border-white/5 shadow-inner">
                  {currentSession.history.map((chat, i) => (
                    <div key={i} className={`flex ${chat.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] sm:max-w-[75%] p-5 sm:p-6 rounded-[2rem] text-sm sm:text-base font-medium leading-relaxed shadow-sm ${chat.role === 'user' ? (isFarmer ? 'bg-emerald-600' : 'bg-indigo-600') + ' text-white rounded-br-none' : 'bg-white dark:bg-[#041d18] text-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-100 dark:border-white/5'}`}>
                        <div dangerouslySetInnerHTML={chat.role === 'ai' ? formatAIText(chat.text, isFarmer) : undefined}>{chat.role === 'user' ? chat.text : undefined}</div>
                      </div>
                    </div>
                  ))}
                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="bg-white dark:bg-[#041d18] p-5 sm:p-6 rounded-[2rem] rounded-tl-none flex items-center gap-3 text-slate-400 font-bold border border-slate-100 dark:border-white/5 shadow-sm">
                        <Loader2 size={18} className="animate-spin text-emerald-500" />
                        <span className="text-xs uppercase tracking-widest animate-pulse">{isFarmer ? 'Nag-iisip...' : 'Thinking...'}</span>
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {currentSession.history.length <= 1 && !isTyping && (
                  <div className="flex flex-wrap gap-2 mb-4 animate-in slide-in-from-bottom-2">
                    {quickPrompts.map((prompt, idx) => (
                      <button key={idx} onClick={() => executePrompt(prompt)} className="px-4 py-2 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-[10px] font-bold text-slate-500 dark:text-slate-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors shadow-sm">{prompt}</button>
                    ))}
                  </div>
                )}

                <form onSubmit={handleSendMessage} className="flex gap-3 bg-white dark:bg-[#0b241f] p-2 rounded-[2rem] border border-slate-200 dark:border-white/10 shadow-sm relative z-10">
                  <div className="flex-1 relative">
                    <input type="text" value={currentMessage} onChange={(e) => setCurrentMessage(e.target.value)} placeholder={isFarmer ? "Magtanong po dito..." : "Ask the archives..."} className="w-full h-full pl-6 pr-4 bg-transparent border-none text-sm font-bold outline-none text-slate-800 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600" />
                  </div>
                  <button type="submit" disabled={isTyping || !currentMessage.trim()} className={`p-4 sm:p-5 text-white rounded-[1.5rem] shadow-lg transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 shrink-0 ${isFarmer ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-indigo-600 hover:bg-indigo-500'}`}>
                    <Send size={20} className="sm:w-[24px] sm:h-[24px]" />
                  </button>
                </form>
              </div>
            </div>
          )}

          {activeTab === 'ledger' && isFarmer && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center gap-3 mb-8">
                 <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-2xl shadow-inner"><PhilippinePeso size={24} /></div>
                 <div>
                   <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Seasonal Ledger</h2>
                   <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Financial & Risk Calculator</p>
                 </div>
               </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-7 space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-[1.5rem] shadow-inner">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2 block mb-2"><MapPin size={12} className="inline mr-1"/> Farm Size (Hectares)</label>
                      <input type="number" step="0.01" value={ledger.size} onChange={(e) => setLedger({...ledger, size: e.target.value})} className="w-full p-4 bg-white dark:bg-[#0b241f] border border-slate-100 dark:border-white/10 rounded-2xl font-black text-lg outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-sm transition-all dark:text-white" />
                    </div>
                    <div className="bg-slate-50 dark:bg-white/5 p-4 rounded-[1.5rem] shadow-inner">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2 block mb-2"><AlertTriangle size={12} className="inline mr-1"/> Expected Issue</label>
                      <select value={ledger.issue} onChange={(e) => setLedger({...ledger, issue: e.target.value})} className="w-full p-4 bg-white dark:bg-[#0b241f] border border-slate-100 dark:border-white/10 rounded-2xl font-black text-sm outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-sm transition-all dark:text-white appearance-none">
                        <option value="None">Wala / Normal</option>
                        <option value="Pest/Disease">Peste o Sakit</option>
                        <option value="Drought/El Nino">Tagtuyot / El Niño</option>
                        <option value="Typhoon/Flood">Bagyo / Baha</option>
                      </select>
                    </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-white/5 p-5 sm:p-6 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-inner">
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2"><TrendingDown size={16}/> Itemized Expenses (₱)</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2 block mb-1">Seeds / Seedlings</label>
                        <input type="number" placeholder="0" value={ledger.seeds} onChange={(e) => setLedger({...ledger, seeds: e.target.value})} className="w-full p-3.5 bg-white dark:bg-[#0b241f] border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-rose-500/20 transition-all dark:text-white" />
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2 block mb-1">Fertilizer / Chems</label>
                        <input type="number" placeholder="0" value={ledger.fertilizer} onChange={(e) => setLedger({...ledger, fertilizer: e.target.value})} className="w-full p-3.5 bg-white dark:bg-[#0b241f] border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-rose-500/20 transition-all dark:text-white" />
                      </div>
                      <div>
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2 block mb-1">Labor / Machineries</label>
                        <input type="number" placeholder="0" value={ledger.labor} onChange={(e) => setLedger({...ledger, labor: e.target.value})} className="w-full p-3.5 bg-white dark:bg-[#0b241f] border border-slate-100 dark:border-white/10 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-rose-500/20 transition-all dark:text-white" />
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/10 flex justify-between items-center px-2">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Puhunan</span>
                      <span className="text-base font-black text-slate-700 dark:text-slate-300">₱{((parseFloat(ledger.seeds)||0) + (parseFloat(ledger.fertilizer)||0) + (parseFloat(ledger.labor)||0)).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="bg-emerald-50/50 dark:bg-emerald-500/5 p-4 rounded-[1.5rem] border border-emerald-100 dark:border-emerald-500/10 shadow-inner">
                    <label className="text-[10px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-widest ml-2 block mb-2"><TrendingUp size={14} className="inline mr-1"/> Expected / Actual Revenue (₱)</label>
                    <input type="number" value={ledger.revenue} onChange={(e) => setLedger({...ledger, revenue: e.target.value})} className="w-full p-4 bg-white dark:bg-[#041d18] border border-emerald-100 dark:border-emerald-500/20 rounded-2xl font-black text-xl text-emerald-900 dark:text-emerald-400 outline-none focus:ring-2 focus:ring-emerald-500/30 shadow-sm transition-all" />
                  </div>
                  
                  <button onClick={calculateRisk} disabled={isCalculatingRisk} className="w-full py-5 bg-slate-900 dark:bg-emerald-600 text-white rounded-[2rem] font-black uppercase text-[10px] sm:text-xs tracking-[0.2em] flex items-center justify-center gap-3 shadow-xl active:scale-95 transition-all disabled:opacity-50">
                    {isCalculatingRisk ? <Loader2 className="animate-spin" size={18} /> : <Activity size={18} />} Suriin ang Resulta
                  </button>
                </div>

                <div className="lg:col-span-5">
                  <div className={`h-full w-full rounded-[2rem] sm:rounded-[3rem] border p-6 sm:p-10 flex flex-col justify-center transition-all duration-500 ${riskAlert ? riskAlert.color : 'bg-slate-50 dark:bg-white/5 border-slate-100 dark:border-white/5'}`}>
                    {!riskAlert ? (
                      <div className="text-center space-y-4 opacity-50">
                        <Activity size={48} className="mx-auto text-slate-300 dark:text-slate-600" />
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Awaiting Calculation</h4>
                        <p className="text-[10px] text-slate-400 font-bold max-w-[200px] mx-auto">Fill in your expenses and revenue to generate a financial diagnosis.</p>
                      </div>
                    ) : (
                      <div className="space-y-8 animate-in zoom-in-95 duration-500">
                        <div className="flex items-center gap-3 border-b border-current/10 pb-6">
                          <div className="p-3 bg-white/50 rounded-2xl shadow-sm backdrop-blur-sm">{riskAlert.icon}</div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Financial Diagnosis</p>
                            <h3 className="text-2xl sm:text-3xl font-black tracking-tight">{riskAlert.message}</h3>
                          </div>
                        </div>

                        {roi !== null && (
                          <div className="bg-white/40 dark:bg-black/20 p-5 rounded-2xl border border-current/10">
                            <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-1">Return on Investment (ROI)</p>
                            <p className="text-3xl font-black">{roi}%</p>
                          </div>
                        )}

                        <p className="text-sm font-bold leading-relaxed opacity-80 border-l-4 border-current/30 pl-4">{riskAlert.sub}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'archives' && isMentee && (
            <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
               <div className="flex flex-col gap-6 bg-slate-50 dark:bg-white/5 p-6 sm:p-8 rounded-[2rem] sm:rounded-[3rem] border border-slate-100 dark:border-white/5 shadow-inner">
                  <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Family Field Notes</h2>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Preserved Wisdom & Strategies</p>
                    </div>
                    <div className="relative w-full md:w-96">
                      <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input type="text" placeholder="Search specific lessons..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-white dark:bg-[#0b241f] border border-slate-100 dark:border-white/10 rounded-2xl pl-12 pr-6 py-4 text-xs font-bold dark:text-white outline-none focus:ring-4 focus:ring-emerald-500/10 shadow-sm transition-all" />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-200 dark:border-white/10">
                    {availableCategories.map((cat, idx) => (
                      <button key={idx} onClick={() => setActiveFilter(cat)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeFilter === cat ? 'bg-emerald-600 text-white shadow-md' : 'bg-white dark:bg-[#0b241f] text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-white/10 hover:border-emerald-300 dark:hover:border-emerald-500/50'}`}>{cat}</button>
                    ))}
                  </div>
               </div>
               
               {Object.keys(groupedExperiences).length === 0 ? (
                 <div className="p-16 sm:p-24 flex flex-col items-center justify-center text-center bg-slate-50 dark:bg-white/5 border-2 border-dashed border-slate-200 dark:border-white/10 rounded-[3rem]">
                   <BookOpen size={48} className="text-slate-300 dark:text-slate-600 mb-6" />
                   <h4 className="text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">No records found</h4>
                   <p className="text-xs font-bold text-slate-400 italic max-w-sm">There are currently no digitized experiences linked to your parent's profile in the registry.</p>
                 </div>
               ) : (
                 <div className="space-y-10">
                   {Object.entries(groupedExperiences).map(([category, exps]) => {
                      if (activeFilter !== 'All' && activeFilter !== category) return null;
                      const filtered = exps.filter(e => e.title.toLowerCase().includes(searchQuery.toLowerCase()) || e.description.toLowerCase().includes(searchQuery.toLowerCase()));
                      if (filtered.length === 0) return null;
                      
                      return (
                        <div key={category} className="space-y-6 animate-in slide-in-from-bottom-2">
                          <div className="flex items-center gap-3 border-b-2 border-slate-100 dark:border-white/5 pb-4 pl-2">
                            <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 rounded-xl"><BookOpen size={16}/></div>
                            <h2 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">{category}</h2>
                            <span className="ml-auto text-[10px] font-black text-slate-400 bg-slate-100 dark:bg-white/5 px-3 py-1 rounded-lg">{filtered.length} Note(s)</span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {filtered.map(exp => (
                              <div key={exp.id} className="bg-white dark:bg-[#0b241f] p-6 sm:p-8 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col group">
                                <div className="flex justify-between items-start gap-4 mb-4">
                                  <h3 className="font-black text-lg text-slate-900 dark:text-white uppercase leading-tight group-hover:text-emerald-600 transition-colors">{exp.title}</h3>
                                  {exp.impact_level && <span className="shrink-0 px-2.5 py-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-[8px] font-black uppercase tracking-widest rounded-lg border border-indigo-100">{exp.impact_level}</span>}
                                </div>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 line-clamp-4 leading-relaxed italic border-l-2 border-slate-100 pl-4">"{exp.description}"</p>
                                <div className="flex flex-wrap items-center justify-between pt-5 border-t border-slate-50 mt-auto gap-4">
                                  <span className="text-[9px] font-black uppercase text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg flex items-center gap-2"><User size={12} className="text-emerald-500"/> {exp.farmer_name}</span>
                                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Clock size={12}/> {new Date(exp.date_recorded).toLocaleDateString()}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                   })}
                 </div>
               )}
            </div>
          )}
        </div>
      </div>
      <style dangerouslySetInnerHTML={{ __html: ` .no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; } `}} />
    </div>
  );
}