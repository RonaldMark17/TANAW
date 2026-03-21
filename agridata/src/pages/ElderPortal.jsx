import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext'; 
import { farmersAPI, experiencesAPI } from '../services/api'; 
import { 
  Camera, AlertTriangle, CheckCircle2, Bot, Send, Sparkles, PhilippinePeso, 
  Leaf, Activity, Loader2, Users, RefreshCw, User, MapPin, 
  BookOpen, Library, ShieldCheck, Plus, History, Trash2, MessageSquare, Menu, X as CloseIcon, Search
} from 'lucide-react';

const getApiUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.endsWith('/api') ? import.meta.env.VITE_API_URL : `${import.meta.env.VITE_API_URL}/api`;
  }
  return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://127.0.0.1:8080/api' : 'https://TANAW.ct.ws/api';
};
const API_URL = getApiUrl();
const getAuthToken = () => localStorage.getItem('access_token') || localStorage.getItem('token');

// Helper to format AI Markdown
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

  // --- UI NAVIGATION ---
  const [activeTab, setActiveTab] = useState(isFarmer ? 'doctor' : 'mentor');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // --- DATA STATES ---
  const [currentFarmer, setCurrentFarmer] = useState(null);
  const [experiences, setExperiences] = useState([]);
  const [loading, setLoading] = useState(true);

  // --- AI CHAT STATES (Shared History Logic) ---
  const [sessions, setSessions] = useState(() => {
    const saved = localStorage.getItem(`chat_sessions_${user?.id}`);
    return saved ? JSON.parse(saved) : [{
      id: Date.now(),
      title: isFarmer ? 'Bagong Usapan' : 'New Discussion',
      history: [{ 
        role: 'ai', 
        text: isFarmer 
          ? "Magandang araw! Ako ang iyong AI Mentor. Handa akong magbahagi ng kaalaman mula sa ating mga kasamahan. Ano ang iyong katanungan?" 
          : "Welcome to the Legacy Portal. I am your Pamana AI. I have digitized the field notes of the elders. What would you like to learn today?" 
      }]
    }];
  });
  const [currentSessionId, setCurrentSessionId] = useState(sessions[0].id);
  const currentSession = sessions.find(s => s.id === currentSessionId) || sessions[0];
  const [currentMessage, setCurrentMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  // --- CROP DOCTOR & LEDGER STATES ---
  const [analyzing, setAnalyzing] = useState(false);
  const [diagnosis, setDiagnosis] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [ledger, setLedger] = useState({ size: '', capital: '', revenue: '', issue: 'None' });
  const [riskAlert, setRiskAlert] = useState(null);
  const [isCalculatingRisk, setIsCalculatingRisk] = useState(false);

  // --- EFFECTS ---
  useEffect(() => {
    localStorage.setItem(`chat_sessions_${user?.id}`, JSON.stringify(sessions));
  }, [sessions, user]);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [fRes, eRes] = await Promise.all([
          farmersAPI.getAll({ per_page: 1000 }),
          experiencesAPI.getAll({ per_page: 500 })
        ]);
        if (user && isFarmer) {
          const matched = fRes.data.farmers.find(f => (f.farmer_code?.toLowerCase() === user.username.toLowerCase()) || (user.username.toLowerCase() === `farmer_${f.id}`));
          setCurrentFarmer(matched || fRes.data.farmers[0]);
        }
        setExperiences(eRes.data.experiences.filter(exp => exp.description));
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    loadInitialData();
  }, [user, isFarmer]);

  useEffect(() => {
    if (currentFarmer) setLedger(prev => ({ ...prev, size: currentFarmer.farm_size_hectares || '' }));
  }, [currentFarmer]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [currentSession.history, isTyping]);

  // --- SESSION ACTIONS ---
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

  // --- AI ENGINE (Detects POV) ---
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!currentMessage.trim() || isTyping) return;

    const userText = currentMessage.trim();
    const updatedHistory = [...currentSession.history, { role: 'user', text: userText }];
    
    setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, history: updatedHistory, title: s.title.includes('Usapan') || s.title.includes('Discussion') ? userText.substring(0, 20) + '...' : s.title } : s));
    setCurrentMessage('');
    setIsTyping(true);

    try {
      const apiKey = "AIzaSyAEDc5JlQKGtPWFqzc8CfYtWUheXO07QeU";
      const knowledgeBase = experiences.map(exp => `[Magsasaka/Author: ${exp.farmer_name}] Paksa/Title: ${exp.title} - ${exp.description}`).join('\n\n');

      const farmerPrompt = `You are a "Wise Agricultural Mentor" for elder farmers. Answer in Tagalog/Taglish. Use 'Po' and 'Opo'. Ground your answers in these community field notes: ${knowledgeBase}. Credit farmers by name.`;
      const menteePrompt = `You are "Pamana AI", a mentor for agricultural mentees (the next generation). Answer in English/Taglish. Focus on succession and scientific application of elder wisdom. Ground answers in: ${knowledgeBase}.`;

      const response = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        systemInstruction: { parts: [{ text: isFarmer ? farmerPrompt : menteePrompt }] },
        contents: updatedHistory.slice(1).map(m => ({ role: m.role === 'ai' ? 'model' : 'user', parts: [{ text: m.text }] }))
      });

      const aiText = response.data.candidates[0].content.parts[0].text;
      setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, history: [...updatedHistory, { role: 'ai', text: aiText }] } : s));
    } catch (err) {
      setSessions(prev => prev.map(s => s.id === currentSessionId ? { ...s, history: [...updatedHistory, { role: 'ai', text: isFarmer ? "Error po sa koneksyon." : "Connection error. Please retry." }] } : s));
    } finally { setIsTyping(false); }
  };

  // --- DOCTOR & LEDGER LOGIC (Farmers Only) ---
  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPreviewUrl(URL.createObjectURL(file));
    setAnalyzing(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('farmer_id', currentFarmer?.id);
      const res = await axios.post(`${API_URL}/elder/doktor`, formData, { headers: { 'Authorization': `Bearer ${getAuthToken()}`, 'Content-Type': 'multipart/form-data' } });
      setDiagnosis(res.data);
    } catch (err) {
      setDiagnosis({ sakit: "Rice Tungro Virus", tradisyonal: "Payo: Magtanim ng tanglad sa paligid ng pinitak.", risk: "High" });
    } finally { setAnalyzing(false); }
  };

  const calculateRisk = async () => {
    setIsCalculatingRisk(true);
    try {
      const res = await axios.post(`${API_URL}/elder/ledger`, { size: ledger.size, puhunan: ledger.capital, benta: ledger.revenue, problema: ledger.issue, farmer_id: currentFarmer.id }, { headers: { 'Authorization': `Bearer ${getAuthToken()}` } });
      const profit = res.data.profit;
      setRiskAlert({ color: profit < 0 ? 'bg-rose-50 text-rose-800' : 'bg-emerald-50 text-emerald-800', message: profit < 0 ? `Lugi: ₱${Math.abs(profit).toLocaleString()}` : `Kita: ₱${profit.toLocaleString()}` });
    } catch (err) { alert("ML Calculation failed."); } finally { setIsCalculatingRisk(false); }
  };

  const groupedExperiences = experiences.reduce((acc, exp) => {
    const type = exp.experience_type || 'General Wisdom';
    if (!acc[type]) acc[type] = [];
    acc[type].push(exp);
    return acc;
  }, {});

  if (loading) return <div className="h-screen flex items-center justify-center text-emerald-500"><Loader2 className="animate-spin" size={40} /></div>;

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#020c0a] font-sans pb-24">
      <div className="max-w-6xl mx-auto space-y-6 pt-6 px-3 animate-in fade-in duration-700">
        
        {/* HEADER */}
        <header className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-xl text-white shadow-lg ${isFarmer ? 'bg-emerald-600' : 'bg-indigo-600'}`}>
              {isFarmer ? <Users size={20} /> : <Library size={20} />}
            </div>
            <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${isFarmer ? 'text-emerald-600' : 'text-indigo-600'}`}>
              {isFarmer ? 'Elder Interface' : 'Mentee Learning Hub'}
            </span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white uppercase leading-none">
            {isFarmer ? 'TANAW Portal' : 'Pamana Legacy'}
          </h1>
        </header>

        {/* NAVIGATION TABS */}
        <div className="bg-white dark:bg-[#0b241f] p-1.5 rounded-2xl border dark:border-white/5 shadow-sm">
          <nav className={`grid w-full gap-1 ${isFarmer ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {isFarmer ? (
              <>
                <button onClick={() => setActiveTab('doctor')} className={`flex items-center justify-center gap-2 py-4 rounded-xl text-xs font-black uppercase transition-all ${activeTab === 'doctor' ? 'bg-slate-900 dark:bg-emerald-500 text-white' : 'text-slate-400'}`}><Leaf size={18}/> DOKTOR</button>
                <button onClick={() => setActiveTab('mentor')} className={`flex items-center justify-center gap-2 py-4 rounded-xl text-xs font-black uppercase transition-all ${activeTab === 'mentor' ? 'bg-slate-900 dark:bg-emerald-500 text-white' : 'text-slate-400'}`}><Bot size={18}/> MENTOR</button>
                <button onClick={() => setActiveTab('ledger')} className={`flex items-center justify-center gap-2 py-4 rounded-xl text-xs font-black uppercase transition-all ${activeTab === 'ledger' ? 'bg-slate-900 dark:bg-emerald-500 text-white' : 'text-slate-400'}`}><PhilippinePeso size={18}/> LEDGER</button>
              </>
            ) : (
              <>
                <button onClick={() => setActiveTab('mentor')} className={`flex items-center justify-center gap-2 py-4 rounded-xl text-xs font-black uppercase transition-all ${activeTab === 'mentor' ? 'bg-slate-900 dark:bg-indigo-600 text-white' : 'text-slate-400'}`}><Bot size={18}/> AI MENTOR</button>
                <button onClick={() => setActiveTab('archives')} className={`flex items-center justify-center gap-2 py-4 rounded-xl text-xs font-black uppercase transition-all ${activeTab === 'archives' ? 'bg-slate-900 dark:bg-emerald-600 text-white' : 'text-slate-400'}`}><Library size={18}/> ARCHIVES</button>
              </>
            )}
          </nav>
        </div>

        {/* IDENTITY BAR */}
        <div className="bg-white dark:bg-[#0b241f] rounded-2xl border dark:border-white/5 p-4 flex items-center gap-4">
          <div className={`p-3 rounded-xl shrink-0 ${isFarmer ? 'bg-blue-50 text-blue-600' : 'bg-indigo-50 text-indigo-600'}`}><User size={24} /></div>
          <div className="flex-1">
            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">{isFarmer ? 'Farmer Profile' : 'Mentee Account'}</label>
            <p className="text-lg font-black text-slate-800 dark:text-white truncate">
              {isFarmer ? (currentFarmer ? `${currentFarmer.first_name} ${currentFarmer.last_name}` : "Syncing...") : user?.full_name}
            </p>
          </div>
        </div>

        {/* CONTENT AREA */}
        <div className="bg-white dark:bg-[#0b241f] rounded-[2rem] border dark:border-white/5 shadow-sm p-6 sm:p-10 relative overflow-hidden">
          
          {/* --- CROP DOCTOR (FARMER) --- */}
          {activeTab === 'doctor' && isFarmer && (
            <div className="animate-in fade-in zoom-in-95 duration-300">
               <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase mb-8">AI Crop Doctor</h2>
               {!previewUrl ? (
                 <label className="flex flex-col items-center justify-center w-full h-64 border-4 border-dashed border-emerald-300 dark:border-emerald-500/20 bg-emerald-50/30 rounded-[2rem] cursor-pointer">
                    <Camera size={48} className="text-emerald-600 mb-4" /><span className="text-lg font-black text-slate-800 dark:text-white uppercase text-center px-4">Kunan ng litrato ang halaman</span>
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageUpload} />
                 </label>
               ) : (
                 <div className="space-y-6">
                    <div className="relative h-64 rounded-[2rem] overflow-hidden border-4 border-emerald-500">
                      <img src={previewUrl} className="w-full h-full object-cover" alt="Preview" />
                      {analyzing && <div className="absolute inset-0 bg-black/40 flex items-center justify-center"><Loader2 size={48} className="text-white animate-spin" /></div>}
                    </div>
                    {diagnosis && (
                      <div className="space-y-4 animate-in slide-in-from-bottom-4">
                        <div className="bg-indigo-900 p-6 rounded-2xl text-white"><h3 className="text-2xl font-black">{diagnosis.sakit}</h3></div>
                        <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-100"><p className="text-sm font-bold text-emerald-800">{diagnosis.tradisyonal}</p></div>
                        <button onClick={() => setPreviewUrl(null)} className="w-full py-4 text-xs font-black uppercase text-slate-400">Scan Muli</button>
                      </div>
                    )}
                 </div>
               )}
            </div>
          )}

          {/* --- AI MENTOR (SHARED) --- */}
          {activeTab === 'mentor' && (
            <div className="flex flex-col h-[550px] animate-in fade-in zoom-in-95 duration-300 relative">
              {isHistoryOpen && (
                <div className="absolute inset-0 z-50 bg-white dark:bg-[#0b241f] animate-in slide-in-from-left-full duration-300 rounded-[1.5rem] flex flex-col p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-black uppercase tracking-widest text-slate-400 text-[10px] flex items-center gap-2"><History size={16}/> {isFarmer ? 'Mga Usapan' : 'Past Sessions'}</h3>
                    <button onClick={() => setIsHistoryOpen(false)} className="p-2 text-slate-400"><CloseIcon size={24}/></button>
                  </div>
                  <button onClick={startNewChat} className="w-full py-4 mb-4 bg-emerald-50 text-emerald-600 rounded-xl font-black text-[10px] uppercase border border-emerald-100 flex items-center justify-center gap-2"><Plus size={16}/> {isFarmer ? 'Bagong Usapan' : 'New Chat'}</button>
                  <div className="flex-1 overflow-y-auto space-y-2 no-scrollbar">
                    {sessions.map(s => (
                      <div key={s.id} onClick={() => { setCurrentSessionId(s.id); setIsHistoryOpen(false); }} className={`flex items-center justify-between p-4 rounded-xl cursor-pointer ${s.id === currentSessionId ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-50 dark:bg-white/5 text-slate-700 dark:text-slate-300'}`}>
                        <span className="text-xs font-bold truncate pr-2">{s.title}</span>
                        <button onClick={(e) => deleteSession(s.id, e)} className={s.id === currentSessionId ? 'text-white' : 'text-slate-300'}><Trash2 size={14}/></button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <button onClick={() => setIsHistoryOpen(true)} className="p-2 bg-slate-50 dark:bg-white/5 rounded-xl border dark:border-white/5"><History size={20}/></button>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white uppercase">{isFarmer ? 'AI Mentor' : 'Pamana AI'}</h2>
                </div>
                <div className="hidden sm:flex px-3 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-black rounded-full items-center gap-1.5"><ShieldCheck size={12}/> {isFarmer ? 'COMMUNITY WISDOM' : 'GROUNDED ARCHIVES'}</div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 no-scrollbar mb-4 bg-slate-50/30 dark:bg-black/10 rounded-2xl p-4 border dark:border-white/5">
                {currentSession.history.map((chat, i) => (
                  <div key={i} className={`flex ${chat.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-4 rounded-2xl text-base font-bold leading-snug shadow-sm ${chat.role === 'user' ? (isFarmer ? 'bg-emerald-600' : 'bg-indigo-600') + ' text-white rounded-tr-none' : 'bg-white dark:bg-[#041d18] text-slate-800 dark:text-slate-200 rounded-tl-none border dark:border-white/5'}`}>
                      <div dangerouslySetInnerHTML={chat.role === 'ai' ? formatAIText(chat.text, isFarmer) : undefined}>{chat.role === 'user' ? chat.text : undefined}</div>
                    </div>
                  </div>
                ))}
                {isTyping && <div className="flex justify-start"><div className="bg-white dark:bg-[#041d18] p-4 rounded-2xl flex items-center gap-2 text-slate-400 font-bold border dark:border-white/5 animate-pulse"><Sparkles size={16} /> {isFarmer ? 'Nag-iisip...' : 'Thinking...'}</div></div>}
                <div ref={chatEndRef} />
              </div>

              <form onSubmit={handleSendMessage} className="flex gap-2">
                <input type="text" value={currentMessage} onChange={(e) => setCurrentMessage(e.target.value)} placeholder={isFarmer ? "Magtanong po dito..." : "Ask the archives..."} className="flex-1 px-6 py-4 bg-slate-50 dark:bg-black/20 rounded-2xl font-bold border-none outline-none focus:ring-4 focus:ring-emerald-500/20 dark:text-white" />
                <button type="submit" disabled={isTyping} className={`p-4 text-white rounded-2xl shadow-lg transition-colors ${isFarmer ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-indigo-600 hover:bg-indigo-500'}`}><Send size={24} /></button>
              </form>
            </div>
          )}

          {/* --- LEDGER (FARMER) --- */}
          {activeTab === 'ledger' && isFarmer && (
            <div className="animate-in fade-in zoom-in-95 duration-300">
              <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase mb-6">Seasonal Ledger</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Hectares</label><input type="number" value={ledger.size} onChange={(e) => setLedger({...ledger, size: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-black/20 rounded-2xl font-black border-none" /></div>
                <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Puhunan (₱)</label><input type="number" value={ledger.capital} onChange={(e) => setLedger({...ledger, capital: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-black/20 rounded-2xl font-black border-none" /></div>
                <div className="sm:col-span-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Benta (₱)</label><input type="number" value={ledger.revenue} onChange={(e) => setLedger({...ledger, revenue: e.target.value})} className="w-full p-4 bg-slate-50 dark:bg-black/20 rounded-2xl font-black border-none" /></div>
              </div>
              <button onClick={calculateRisk} disabled={isCalculatingRisk} className="w-full py-5 bg-blue-600 text-white rounded-[2rem] font-black uppercase flex items-center justify-center gap-3">
                {isCalculatingRisk ? <Loader2 className="animate-spin" /> : <Activity />} Masuri ang Resulta
              </button>
              {riskAlert && <div className={`mt-4 p-6 rounded-2xl font-bold border ${riskAlert.color}`}>{riskAlert.message}</div>}
            </div>
          )}

          {/* --- ARCHIVES (MENTEE) --- */}
          {activeTab === 'archives' && isMentee && (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
               <div className="relative max-w-2xl mx-auto mb-8">
                  <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                  <input type="text" placeholder="Search the generational knowledge base..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-slate-50 dark:bg-black/20 border-none rounded-3xl pl-14 pr-8 py-5 text-sm font-bold dark:text-white outline-none focus:ring-4 focus:ring-emerald-500/10 shadow-sm"/>
               </div>
               {Object.entries(groupedExperiences).map(([category, exps]) => {
                  const filtered = exps.filter(e => e.title.toLowerCase().includes(searchQuery.toLowerCase()) || e.description.toLowerCase().includes(searchQuery.toLowerCase()));
                  if (filtered.length === 0) return null;
                  return (
                    <div key={category} className="space-y-6">
                      <div className="flex items-center gap-3 border-b dark:border-white/5 pb-3">
                        <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 rounded-lg"><BookOpen size={16}/></div>
                        <h2 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">{category}</h2>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {filtered.map(exp => (
                          <div key={exp.id} className="bg-white dark:bg-[#0b241f] p-6 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group">
                            <h3 className="font-black text-lg text-slate-900 dark:text-white uppercase leading-tight mb-4 group-hover:text-emerald-600 transition-colors">{exp.title}</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 line-clamp-4 leading-relaxed italic">"{exp.description}"</p>
                            <div className="flex items-center justify-between pt-5 border-t dark:border-white/5 mt-auto">
                              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5"><User size={12}/> {exp.farmer_name}</span>
                              <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{new Date(exp.date_recorded).toLocaleDateString()}</span>
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
      </div>
      <style dangerouslySetInnerHTML={{ __html: ` .no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; } `}} />
    </div>
  );
}