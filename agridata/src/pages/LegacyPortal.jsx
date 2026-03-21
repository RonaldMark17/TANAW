import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { experiencesAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  BookOpen, Bot, Send, Sparkles, Search, MessageSquare, 
  Sprout, ChevronRight, Loader2, Library, ShieldCheck, User,
  Plus, History, Trash2, Menu, X as CloseIcon
} from 'lucide-react';

const formatAIText = (text) => {
  if (!text) return { __html: '' };
  let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong class="text-indigo-900 dark:text-indigo-200">$1</strong>');
  formatted = formatted.replace(/\*(.*?)\*/g, '<em class="text-slate-700 dark:text-slate-300">$1</em>');
  formatted = formatted.replace(/\n/g, '<br/>');
  return { __html: formatted };
};

export default function LegacyPortal() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('chat');
  const [experiences, setExperiences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // --- NEW: PERSISTENT HISTORY STATE ---
  const [sessions, setSessions] = useState(() => {
    const saved = localStorage.getItem('pamana_chat_sessions');
    return saved ? JSON.parse(saved) : [{
      id: Date.now(),
      title: 'New Discussion',
      history: [{ role: 'ai', text: "Hello. I am the Pamana AI. What guidance do you seek from the elders today?" }]
    }];
  });
  const [currentSessionId, setCurrentSessionId] = useState(sessions[0].id);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const currentSession = sessions.find(s => s.id === currentSessionId) || sessions[0];
  const [currentMessage, setCurrentMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  // Sync sessions to LocalStorage
  useEffect(() => {
    localStorage.setItem('pamana_chat_sessions', JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    const fetchPamanaData = async () => {
      try {
        const response = await experiencesAPI.getAll({ per_page: 500 });
        setExperiences(response.data.experiences.filter(exp => exp.description && exp.title));
      } catch (error) { console.error(error); } finally { setLoading(false); }
    };
    fetchPamanaData();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentSession.history, isTyping]);

  // --- SESSION MANAGEMENT ---
  const startNewChat = () => {
    const newSession = {
      id: Date.now(),
      title: 'New Discussion',
      history: [{ role: 'ai', text: "New session started. How can I assist you with the elder's wisdom?" }]
    };
    setSessions([newSession, ...sessions]);
    setCurrentSessionId(newSession.id);
    if (window.innerWidth < 768) setIsSidebarOpen(false);
  };

  const deleteSession = (id, e) => {
    e.stopPropagation();
    if (sessions.length === 1) return alert("You must keep at least one session.");
    const filtered = sessions.filter(s => s.id !== id);
    setSessions(filtered);
    if (currentSessionId === id) setCurrentSessionId(filtered[0].id);
  };

  // --- AI ENGINE ---
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!currentMessage.trim() || isTyping) return;

    const userText = currentMessage.trim();
    const updatedHistory = [...currentSession.history, { role: 'user', text: userText }];
    
    // Update the specific session's history
    setSessions(prev => prev.map(s => 
      s.id === currentSessionId 
        ? { ...s, history: updatedHistory, title: s.title === 'New Discussion' ? userText.substring(0, 25) + '...' : s.title } 
        : s
    ));
    
    setCurrentMessage('');
    setIsTyping(true);

    try {
      const apiKey = "AIzaSyAEDc5JlQKGtPWFqzc8CfYtWUheXO07QeU";
      const knowledgeBase = experiences.map(exp => 
        `[Category: ${exp.experience_type}] Title: ${exp.title} | Author: ${exp.farmer_name}\nContent: ${exp.description}`
      ).join('\n\n');

      const systemPrompt = `You are "Pamana AI", a wise agricultural mentor. 
      Answer strictly using the Knowledge Base below. 
      KNOWLEDGE BASE: ${knowledgeBase}
      CREDIT the elders by name. If not found, give general advice but state it is not in the records.`;

      const formattedHistory = updatedHistory.slice(1).map(msg => ({
        role: msg.role === 'ai' ? 'model' : 'user',
        parts: [{ text: msg.text }]
      }));

      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        { systemInstruction: { parts: [{ text: systemPrompt }] }, contents: formattedHistory },
        { headers: { 'Content-Type': 'application/json' } }
      );

      const aiResponse = response.data.candidates[0].content.parts[0].text;
      
      setSessions(prev => prev.map(s => 
        s.id === currentSessionId 
          ? { ...s, history: [...updatedHistory, { role: 'ai', text: aiResponse }] } 
          : s
      ));

    } catch (error) {
      setSessions(prev => prev.map(s => 
        s.id === currentSessionId 
          ? { ...s, history: [...updatedHistory, { role: 'ai', text: "**Connection Error:** Check your API status." }] } 
          : s
      ));
    } finally { setIsTyping(false); }
  };

  const groupedExperiences = experiences.reduce((acc, exp) => {
    const type = exp.experience_type || 'Uncategorized';
    if (!acc[type]) acc[type] = [];
    acc[type].push(exp);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#020c0a] font-sans transition-colors duration-300 pb-20">
      <div className="max-w-[1400px] mx-auto p-4 sm:p-8 animate-in fade-in duration-700">
        
        {/* Header */}
        <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 bg-emerald-600 rounded-lg text-white shadow-lg shrink-0">
                <BookOpen size={16} />
              </div>
              <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-widest">Generational Intelligence</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Pamana Mentor</h1>
          </div>

          <div className="bg-white dark:bg-[#0b241f] p-1.5 rounded-2xl border border-slate-100 dark:border-white/5 shadow-sm inline-flex w-full md:w-auto">
            <button onClick={() => setActiveTab('chat')} className={`flex-1 md:flex-none flex justify-center items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'chat' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400'}`}>
              <Bot size={14} /> AI MENTOR
            </button>
            <button onClick={() => setActiveTab('archives')} className={`flex-1 md:flex-none flex justify-center items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'archives' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-400'}`}>
              <Library size={14} /> ARCHIVES
            </button>
          </div>
        </header>

        {activeTab === 'chat' ? (
          <div className="flex flex-col lg:flex-row gap-6 h-[700px] animate-in slide-in-from-bottom-4 duration-500">
            
            {/* --- CHAT SIDEBAR (HISTORY) --- */}
            <aside className={`fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-[#0b241f] border-r border-slate-100 dark:border-white/5 p-6 transform transition-transform lg:relative lg:translate-x-0 lg:z-0 lg:rounded-[2rem] lg:border ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'}`}>
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2"><History size={14}/> Session History</h3>
                  <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-1 text-slate-400"><CloseIcon size={20}/></button>
                </div>

                <button onClick={startNewChat} className="w-full py-4 mb-6 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-indigo-100 dark:border-indigo-500/20 flex items-center justify-center gap-2 hover:bg-indigo-100 transition-all">
                  <Plus size={16}/> New Discussion
                </button>

                <div className="flex-1 overflow-y-auto space-y-2 no-scrollbar">
                  {sessions.map(s => (
                    <div 
                      key={s.id} 
                      onClick={() => { setCurrentSessionId(s.id); if(window.innerWidth < 1024) setIsSidebarOpen(false); }}
                      className={`group flex items-center justify-between p-4 rounded-xl cursor-pointer transition-all border ${s.id === currentSessionId ? 'bg-indigo-600 border-indigo-500 shadow-lg shadow-indigo-600/20' : 'bg-slate-50 dark:bg-white/5 border-transparent hover:border-slate-200 dark:hover:border-white/10'}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <MessageSquare size={14} className={s.id === currentSessionId ? 'text-indigo-200' : 'text-slate-400'} />
                        <span className={`text-xs font-bold truncate ${s.id === currentSessionId ? 'text-white' : 'text-slate-700 dark:text-slate-300'}`}>{s.title}</span>
                      </div>
                      <button onClick={(e) => deleteSession(s.id, e)} className={`p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity ${s.id === currentSessionId ? 'text-indigo-200 hover:text-white' : 'text-slate-400 hover:text-rose-500'}`}>
                        <Trash2 size={12}/>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </aside>

            {/* --- MAIN CHAT WINDOW --- */}
            <div className="flex-1 flex flex-col bg-white dark:bg-[#0b241f] rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-xl overflow-hidden relative">
              
              {/* Chat Header */}
              <div className="p-5 border-b border-slate-100 dark:border-white/5 bg-indigo-50/30 dark:bg-indigo-950/10 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 bg-white dark:bg-white/5 rounded-xl shadow-sm"><Menu size={20}/></button>
                  <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shrink-0"><Bot size={20}/></div>
                  <div>
                    <h3 className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-xs sm:text-sm">Pamana AI Mentor</h3>
                    <div className="flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"/>
                       <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Active Neural Link</p>
                    </div>
                  </div>
                </div>
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-indigo-100/50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-full border border-indigo-200/50 dark:border-indigo-500/20">
                  <ShieldCheck size={12}/> <span className="text-[9px] font-black uppercase tracking-widest">Grounded AI</span>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 no-scrollbar bg-slate-50/30 dark:bg-transparent">
                {currentSession.history.map((chat, idx) => (
                  <div key={idx} className={`flex w-full ${chat.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`flex gap-3 sm:gap-4 max-w-[95%] sm:max-w-[85%] ${chat.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className={`h-8 w-8 sm:h-10 sm:w-10 rounded-full flex items-center justify-center shrink-0 mt-1 ${chat.role === 'user' ? 'bg-emerald-600 text-white shadow-md' : 'bg-white dark:bg-[#041d18] border dark:border-white/10 text-indigo-600 shadow-sm'}`}>
                        {chat.role === 'user' ? <User size={16}/> : <Bot size={16}/>}
                      </div>
                      <div 
                        className={`p-4 sm:p-5 rounded-2xl text-sm sm:text-base leading-relaxed shadow-sm ${chat.role === 'user' ? 'bg-emerald-600 text-white rounded-tr-none font-medium' : 'bg-white dark:bg-[#041d18] border border-slate-100 dark:border-white/10 text-slate-700 dark:text-slate-300 rounded-tl-none'}`}
                        dangerouslySetInnerHTML={chat.role === 'ai' ? formatAIText(chat.text) : undefined}
                      >
                        {chat.role === 'user' ? chat.text : undefined}
                      </div>
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex justify-start gap-4 max-w-[85%] animate-pulse">
                    <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0"><Bot size={16}/></div>
                    <div className="p-5 rounded-2xl rounded-tl-none bg-white dark:bg-[#041d18] border border-indigo-100 text-indigo-500 font-bold flex items-center gap-2"><Sparkles size={16}/> Thinking...</div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              <div className="p-4 sm:p-6 bg-white dark:bg-[#041d18] border-t border-slate-100 dark:border-white/5 shrink-0">
                <form onSubmit={handleSendMessage} className="flex items-center gap-3 sm:gap-4 max-w-4xl mx-auto">
                  <input 
                    type="text" 
                    value={currentMessage} 
                    onChange={(e) => setCurrentMessage(e.target.value)}
                    placeholder="Ask about techniques, pests, or elder advice..."
                    disabled={isTyping}
                    className="flex-1 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-2xl px-5 sm:px-6 py-4 text-sm sm:text-base outline-none focus:ring-4 focus:ring-indigo-500/10 dark:text-white transition-all disabled:opacity-50"
                  />
                  <button type="submit" disabled={!currentMessage.trim() || isTyping} className="h-[52px] w-[52px] sm:h-14 sm:w-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center hover:bg-indigo-500 disabled:opacity-50 transition-all shadow-xl shadow-indigo-600/30 shrink-0">
                    <Send size={20} className="ml-1" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        ) : (
          /* --- TAB 2: ARCHIVES (Unchanged logic, updated design) --- */
          <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-500">
             <div className="relative max-w-2xl mx-auto mb-12">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input type="text" placeholder="Search the generational knowledge base..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white dark:bg-[#0b241f] border border-slate-200 dark:border-white/10 rounded-3xl pl-14 pr-8 py-5 text-sm font-bold dark:text-white outline-none focus:ring-4 focus:ring-emerald-500/10 shadow-lg"
                />
             </div>
             {/* ... mapping groupedExperiences same as before ... */}
             {Object.entries(groupedExperiences).map(([category, exps]) => {
                const filtered = exps.filter(e => e.title.toLowerCase().includes(searchQuery.toLowerCase()) || e.description.toLowerCase().includes(searchQuery.toLowerCase()));
                if (filtered.length === 0) return null;
                return (
                  <div key={category} className="space-y-6">
                    <div className="flex items-center gap-3 border-b dark:border-white/5 pb-3">
                      <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 rounded-lg"><BookOpen size={16}/></div>
                      <h2 className="text-sm font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">{category}</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filtered.map(exp => (
                        <div key={exp.id} className="bg-white dark:bg-[#0b241f] p-6 sm:p-8 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col group">
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
      <style dangerouslySetInnerHTML={{ __html: ` .no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; } `}} />
    </div>
  );
}