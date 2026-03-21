import React, { useState, useEffect } from 'react';
import { projectsAPI, organizationsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, X, Search, Calendar, Landmark, User, 
  DollarSign, ClipboardList, Beaker, Briefcase,
  ChevronLeft, ChevronRight, Info, FileText, Activity, Layers, Filter, AlertCircle, Loader2
} from 'lucide-react';

// --- Skeleton Component ---
const ProjectSkeleton = () => (
  <div className="space-y-6 sm:space-y-8 animate-pulse px-4">
    {[1, 2, 3].map((i) => (
      <div key={i} className="bg-white dark:bg-[#0b241f] rounded-[2rem] sm:rounded-[2.5rem] border border-slate-100 dark:border-white/5 p-6 sm:p-10 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="flex gap-4 sm:gap-6">
            <div className="h-12 w-12 sm:h-16 sm:w-16 bg-slate-100 dark:bg-white/5 rounded-xl sm:rounded-2xl shrink-0"></div>
            <div className="space-y-2 sm:space-y-3">
              <div className="h-5 sm:h-6 w-48 sm:w-64 bg-slate-100 dark:bg-white/5 rounded-lg"></div>
              <div className="h-3 sm:h-4 w-24 sm:w-32 bg-slate-50 dark:bg-white/5 rounded-md"></div>
            </div>
          </div>
          <div className="h-8 w-24 sm:w-28 bg-slate-50 dark:bg-white/5 rounded-full"></div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 pt-6 sm:pt-10 border-t border-slate-50 dark:border-white/5">
          {[1, 2, 3, 4].map((j) => <div key={j} className="h-10 sm:h-12 bg-slate-50 dark:bg-white/5 rounded-xl"></div>)}
        </div>
      </div>
    ))}
  </div>
);

export default function ResearchProjects() {
  const [projects, setProjects] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false); 
  const [showModal, setShowModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [errorMessage, setErrorMessage] = useState(''); 
  
  // ADDED user extract here to check role
  const { user, hasPermission } = useAuth();

  // Unified Initial State
  const initialFormData = {
    project_code: '',
    title: '',
    description: '',
    organization_id: '',
    principal_investigator_name: '', 
    start_date: '',
    end_date: '',
    status: 'Planning',
    research_type: 'Mixed Methods',
    objectives: '',
    methodology: '',
    budget: '',
    funding_source: ''
  };

  const [formData, setFormData] = useState(initialFormData);

  useEffect(() => {
    fetchProjects();
    fetchOrganizations();
  }, [currentPage]);

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const response = await projectsAPI.getAll({ page: currentPage });
      setProjects(response.data.projects);
      setTotalPages(response.data.pages);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setTimeout(() => setLoading(false), 600);
    }
  };

  const fetchOrganizations = async () => {
    try {
      const response = await organizationsAPI.getAll();
      setOrganizations(response.data);
    } catch (error) {
      console.error('Error fetching organizations:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage('');

    try {
      const payload = {
        ...formData,
        organization_id: formData.organization_id ? parseInt(formData.organization_id) : null,
        budget: formData.budget ? parseFloat(formData.budget) : 0
      };

      await projectsAPI.create(payload);
      setShowModal(false);
      setFormData(initialFormData); 
      fetchProjects(); 
    } catch (error) {
      const msg = error.response?.data?.error || error.response?.data?.message || 'Failed to create project. Please verify all fields.';
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // --- ROLE BASED LOGIC ---
  const canCreate = hasPermission(['admin', 'researcher']);
  const isViewer = user?.role === 'viewer';

  // Filter projects so viewers only see 'Completed' ones
  const displayedProjects = isViewer 
    ? projects.filter(project => project.status === 'Completed') 
    : projects;

  const getStatusStyle = (status) => {
    const styles = {
      'Planning': 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
      'Active': 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
      'Completed': 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-white/5 dark:text-slate-400 dark:border-white/10',
      'On Hold': 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20',
      'Cancelled': 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20'
    };
    return styles[status] || styles['Planning'];
  };

  const getResearchTheme = (type) => {
    const themes = {
      'Qualitative': { icon: ClipboardList, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-500/10' },
      'Quantitative': { icon: Beaker, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
      'Mixed Methods': { icon: Layers, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10' },
      'default': { icon: FileText, color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-50 dark:bg-white/5' }
    };
    return themes[type] || themes['default'];
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#020c0a] font-sans selection:bg-emerald-100 pb-20 transition-colors duration-300">
      <div className="max-w-[1400px] mx-auto space-y-8 sm:space-y-12 animate-in fade-in duration-700">
        
        {/* Header Section */}
        <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 sm:gap-8 px-4 py-6">
          <div>
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <div className="p-1.5 sm:p-2 bg-emerald-600 rounded-lg sm:rounded-xl text-white shadow-xl shadow-emerald-200 dark:shadow-none">
                <Beaker size={18} className="sm:w-[20px] sm:h-[20px]" />
              </div>
              <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-[0.3em]">System Research Hub</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Research Initiatives</h1>
            <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 font-medium mt-1 sm:mt-2">
              {isViewer 
                ? 'Viewing publicly available completed research data.'
                : 'Strategic monitoring and documentation of agricultural advancement.'}
            </p>
          </div>
          
          {canCreate && (
            <button 
              onClick={() => setShowModal(true)} 
              className="w-full lg:w-auto group flex items-center justify-center gap-2 sm:gap-3 px-6 sm:px-8 py-3.5 sm:py-4 bg-slate-900 dark:bg-emerald-600 text-white rounded-xl sm:rounded-[1.25rem] font-black text-[10px] sm:text-xs uppercase tracking-widest shadow-xl sm:shadow-2xl shadow-slate-200 dark:shadow-none hover:bg-slate-800 dark:hover:bg-emerald-500 active:scale-95 transition-all"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5 group-hover:rotate-90 transition-transform duration-300" />
              <span>Initiate Project</span>
            </button>
          )}
        </header>

        {/* Project Feed */}
        <div className="space-y-6 sm:space-y-8 px-4">
          {loading ? (
            <ProjectSkeleton />
          ) : displayedProjects.length === 0 ? (
            <div className="bg-white dark:bg-[#0b241f] rounded-[2rem] sm:rounded-[3rem] border-2 border-dashed border-slate-100 dark:border-white/5 py-20 sm:py-32 text-center transition-all">
              <div className="p-6 sm:p-8 bg-slate-50 dark:bg-white/5 rounded-full inline-flex text-slate-200 dark:text-slate-700 mb-6 sm:mb-8">
                <Search size={36} className="sm:w-[48px] sm:h-[48px]" />
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Archives Empty</h3>
              <p className="text-sm sm:text-base text-slate-400 dark:text-slate-500 font-medium mt-2 sm:mt-3">
                {isViewer 
                  ? 'No completed research initiatives found at this time.' 
                  : 'No initiatives found. Begin by recording your first research project.'}
              </p>
            </div>
          ) : (
            displayedProjects.map((project) => {
              const theme = getResearchTheme(project.research_type);
              const Icon = theme.icon;
              return (
                <div key={project.id} className="group bg-white dark:bg-[#0b241f] rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-12 border border-slate-100 dark:border-white/5 shadow-sm hover:shadow-xl sm:hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.08)] dark:hover:shadow-black/40 hover:-translate-y-1 transition-all duration-500 overflow-hidden relative">
                  
                  <div className="flex flex-col lg:flex-row justify-between items-start gap-4 sm:gap-8 mb-6 sm:mb-10 relative z-10">
                    <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 w-full">
                      <div className={`h-16 w-16 sm:h-20 sm:w-20 rounded-2xl sm:rounded-[1.5rem] ${theme.bg} ${theme.color} flex items-center justify-center shadow-inner shrink-0 group-hover:scale-110 transition-transform duration-500`}>
                        <Icon size={28} className="sm:w-[36px] sm:h-[36px]" />
                      </div>
                      <div className="min-w-0 flex flex-col justify-center w-full">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1.5 sm:mb-2">
                           <span className="text-[9px] sm:text-[10px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 sm:px-3 py-1 rounded-md sm:rounded-lg uppercase tracking-[0.15em] border border-emerald-100 dark:border-emerald-500/20 truncate max-w-full">
                            {project.project_code || 'UNTITLED'}
                          </span>
                          <span className="hidden sm:inline text-slate-300 dark:text-slate-700 font-black text-lg select-none">•</span>
                          <span className="text-[10px] sm:text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{project.research_type}</span>
                        </div>
                        <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 dark:text-white leading-tight group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors uppercase tracking-tight">{project.title}</h3>
                      </div>
                    </div>
                    
                    <div className="flex items-start shrink-0 mt-2 lg:mt-0">
                        <div className={`inline-flex items-center px-4 py-1.5 sm:px-5 sm:py-2 rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest border shadow-sm ${getStatusStyle(project.status)}`}>
                        <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-current mr-2 sm:mr-3 animate-pulse" />
                        {project.status}
                        </div>
                    </div>
                  </div>

                  <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 font-medium leading-relaxed max-w-5xl mb-8 sm:mb-12 italic border-l-4 border-slate-100 dark:border-emerald-500/20 pl-4 sm:pl-8 relative z-10 line-clamp-3 sm:line-clamp-none">
                    {project.description || 'Institutional abstract is currently being finalized.'}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8 pt-6 sm:pt-10 border-t border-slate-50 dark:border-white/5 relative z-10">
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="p-2.5 sm:p-3 bg-slate-50 dark:bg-white/5 text-slate-400 dark:text-slate-500 rounded-lg sm:rounded-xl group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors"><User size={16} className="sm:w-[18px] sm:h-[18px]" strokeWidth={2.5} /></div>
                      <div className="min-w-0">
                        <p className="text-[9px] sm:text-[10px] uppercase font-black text-slate-400 dark:text-slate-500 tracking-widest mb-0.5 sm:mb-1">Lead Investigator</p>
                        <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{project.principal_investigator_name}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="p-2.5 sm:p-3 bg-slate-50 dark:bg-white/5 text-slate-400 dark:text-slate-500 rounded-lg sm:rounded-xl group-hover:text-amber-500 dark:group-hover:text-amber-400 transition-colors"><Landmark size={16} className="sm:w-[18px] sm:h-[18px]" strokeWidth={2.5} /></div>
                      <div className="min-w-0">
                        <p className="text-[9px] sm:text-[10px] uppercase font-black text-slate-400 dark:text-slate-500 tracking-widest mb-0.5 sm:mb-1">Institution</p>
                        <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 truncate">{project.organization_name || 'TANAW Network'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="p-2.5 sm:p-3 bg-slate-50 dark:bg-white/5 text-slate-400 dark:text-slate-500 rounded-lg sm:rounded-xl group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors"><Calendar size={16} className="sm:w-[18px] sm:h-[18px]" strokeWidth={2.5} /></div>
                      <div className="min-w-0">
                        <p className="text-[9px] sm:text-[10px] uppercase font-black text-slate-400 dark:text-slate-500 tracking-widest mb-0.5 sm:mb-1">Schedule</p>
                        <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200">
                          {project.start_date ? new Date(project.start_date).getFullYear() : '--'} — {project.end_date ? new Date(project.end_date).getFullYear() : 'Active'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="p-2.5 sm:p-3 bg-slate-50 dark:bg-white/5 text-slate-400 dark:text-slate-500 rounded-lg sm:rounded-xl group-hover:text-rose-500 dark:group-hover:text-rose-400 transition-colors"><DollarSign size={16} className="sm:w-[18px] sm:h-[18px]" strokeWidth={2.5} /></div>
                      <div className="min-w-0">
                        <p className="text-[9px] sm:text-[10px] uppercase font-black text-slate-400 dark:text-slate-500 tracking-widest mb-0.5 sm:mb-1">Total Budget</p>
                        <p className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                          {project.budget ? `₱${Number(project.budget).toLocaleString()}` : 'Allocating...'}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Decorative Background Element */}
                  <div className={`absolute -right-16 -bottom-16 sm:-right-20 sm:-bottom-20 w-48 h-48 sm:w-64 sm:h-64 ${theme.bg} opacity-10 rounded-full blur-2xl sm:blur-3xl group-hover:opacity-30 transition-opacity duration-700 pointer-events-none`} />
                </div>
              );
            })
          )}
        </div>

        {/* Global Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between bg-white dark:bg-[#0b241f] px-6 sm:px-10 py-5 sm:py-6 rounded-3xl sm:rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-sm mx-4 transition-colors gap-4">
            <p className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">
              Page <span className="text-slate-900 dark:text-white">{currentPage}</span> of {totalPages}
            </p>
            <div className="flex gap-3 sm:gap-4 w-full sm:w-auto justify-center">
              <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} className="flex-1 sm:flex-none p-3 sm:p-4 flex justify-center bg-white dark:bg-[#041d18] border border-slate-100 dark:border-white/10 rounded-xl sm:rounded-2xl text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 disabled:opacity-30 transition-all shadow-sm">
                <ChevronLeft size={18} className="sm:w-[20px] sm:h-[20px]" />
              </button>
              <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} className="flex-1 sm:flex-none p-3 sm:p-4 flex justify-center bg-white dark:bg-[#041d18] border border-slate-100 dark:border-white/10 rounded-xl sm:rounded-2xl text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 disabled:opacity-30 transition-all shadow-sm">
                <ChevronRight size={18} className="sm:w-[20px] sm:h-[20px]" />
              </button>
            </div>
          </div>
        )}

        {/* MODAL REDESIGN - MOBILE OPTIMIZED */}
        {showModal && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-0 sm:p-4 md:p-8 overflow-hidden">
            <div className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setShowModal(false)} />
            
            <div className="relative bg-white dark:bg-[#041d18] rounded-none sm:rounded-[3rem] shadow-2xl w-full h-full sm:h-auto sm:max-w-4xl sm:max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 sm:slide-in-from-bottom-0 duration-500 border-none sm:border dark:border-white/5">
              
              <div className="p-6 sm:p-10 border-b border-slate-50 dark:border-white/5 flex items-center justify-between sticky top-0 bg-white/80 dark:bg-[#041d18]/80 backdrop-blur-xl z-10 shrink-0 pt-safe">
                <div>
                  <h2 className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Initiate Research</h2>
                  <p className="text-slate-400 dark:text-slate-500 font-medium text-xs sm:text-sm mt-0.5 sm:mt-1">Populate technical fields to establish project identity.</p>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2.5 sm:p-4 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl sm:rounded-2xl transition-all text-slate-300 dark:text-slate-600">
                  <X size={24} className="sm:w-[28px] sm:h-[28px]" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-8 sm:space-y-12 no-scrollbar pb-safe">
                
                {/* Error Callout */}
                {errorMessage && (
                  <div className="p-4 sm:p-6 bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 rounded-2xl sm:rounded-3xl flex items-center gap-3 sm:gap-4 text-rose-600 dark:text-rose-400 animate-in slide-in-from-top-4">
                    <AlertCircle size={20} className="sm:w-[24px] sm:h-[24px] shrink-0" />
                    <p className="text-xs sm:text-sm font-bold uppercase tracking-widest leading-relaxed">{errorMessage}</p>
                  </div>
                )}

                {/* Section 1: Identity */}
                <div className="space-y-6 sm:space-y-8">
                  <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600 dark:text-emerald-500 flex items-center gap-2 sm:gap-3">
                    <Activity size={12} className="sm:w-[14px] sm:h-[14px]" /> Identity Protocols
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-8">
                    <div className="space-y-2 sm:space-y-3">
                      <label className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Reference Code</label>
                      <input type="text" required className="w-full px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-50 dark:bg-white/5 border-none rounded-xl sm:rounded-2xl focus:ring-4 focus:ring-emerald-500/10 text-xs sm:text-sm font-bold dark:text-white shadow-inner outline-none" value={formData.project_code} onChange={(e) => setFormData({ ...formData, project_code: e.target.value })} placeholder="e.g., AGRI-2026-X" />
                    </div>
                    <div className="space-y-2 sm:space-y-3">
                      <label className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Organization Affiliation</label>
                      <select required className="w-full px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-50 dark:bg-white/5 border-none rounded-xl sm:rounded-2xl focus:ring-4 focus:ring-emerald-500/10 text-xs sm:text-sm font-bold dark:text-white shadow-inner outline-none appearance-none" value={formData.organization_id} onChange={(e) => setFormData({ ...formData, organization_id: e.target.value })}>
                        <option value="" className="dark:bg-[#041d18]">Select Entity...</option>
                        {organizations.map((org) => (<option key={org.id} value={org.id} className="dark:bg-[#041d18]">{org.name}</option>))}
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2 sm:space-y-3">
                    <label className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Full Scientific Title</label>
                    <input type="text" required className="w-full px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-50 dark:bg-white/5 border-none rounded-xl sm:rounded-2xl focus:ring-4 focus:ring-emerald-500/10 text-xs sm:text-sm font-bold dark:text-white shadow-inner outline-none" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Enter formal title..." />
                  </div>
                  <div className="space-y-2 sm:space-y-3">
                    <label className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Project Abstract</label>
                    <textarea className="w-full px-4 sm:px-6 py-4 sm:py-5 bg-slate-50 dark:bg-white/5 border-none rounded-2xl sm:rounded-3xl focus:ring-4 focus:ring-emerald-500/10 text-xs sm:text-sm font-medium dark:text-slate-200 shadow-inner min-h-[120px] sm:min-h-[100px] outline-none" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Brief summary of the research..." />
                  </div>
                  <div className="space-y-2 sm:space-y-3">
                    <label className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Lead Investigator (Full Name)</label>
                    <input type="text" required className="w-full px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-50 dark:bg-white/5 border-none rounded-xl sm:rounded-2xl focus:ring-4 focus:ring-emerald-500/10 text-xs sm:text-sm font-bold dark:text-white shadow-inner outline-none" value={formData.principal_investigator_name} onChange={(e) => setFormData({ ...formData, principal_investigator_name: e.target.value })} placeholder="Who is leading this research?" />
                  </div>
                </div>

                {/* Section 2: Parameters */}
                <div className="space-y-6 sm:space-y-8">
                  <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] text-indigo-600 dark:text-indigo-400 flex items-center gap-2 sm:gap-3">
                    <Layers size={12} className="sm:w-[14px] sm:h-[14px]" /> Research Parameters
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-8">
                    <div className="space-y-2 sm:space-y-3">
                      <label className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Methodology</label>
                      <select className="w-full px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-50 dark:bg-white/5 border-none rounded-xl sm:rounded-2xl focus:ring-4 focus:ring-emerald-500/10 text-xs sm:text-sm font-bold dark:text-white shadow-inner outline-none appearance-none" value={formData.research_type} onChange={(e) => setFormData({ ...formData, research_type: e.target.value })}>
                        <option value="Qualitative" className="dark:bg-[#041d18]">Qualitative</option>
                        <option value="Quantitative" className="dark:bg-[#041d18]">Quantitative</option>
                        <option value="Mixed Methods" className="dark:bg-[#041d18]">Mixed Methods</option>
                      </select>
                    </div>
                    <div className="space-y-2 sm:space-y-3">
                      <label className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Launch Date</label>
                      <input type="date" required className="w-full px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-50 dark:bg-white/5 border-none rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold dark:text-white shadow-inner outline-none transition-all" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} />
                    </div>
                    <div className="space-y-2 sm:space-y-3">
                      <label className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Conclusion</label>
                      <input type="date" className="w-full px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-50 dark:bg-white/5 border-none rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold dark:text-white shadow-inner outline-none transition-all" value={formData.end_date} onChange={(e) => setFormData({ ...formData, end_date: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-2 sm:space-y-3">
                    <label className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Capital Expenditure (Budget in ₱)</label>
                    <div className="relative">
                      <DollarSign size={16} className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600 sm:w-[18px] sm:h-[18px]" />
                      <input type="number" className="w-full pl-10 sm:pl-14 pr-4 sm:pr-6 py-3.5 sm:py-4 bg-slate-50 dark:bg-white/5 border-none rounded-xl sm:rounded-2xl focus:ring-4 focus:ring-emerald-500/10 text-xs sm:text-sm font-bold dark:text-white shadow-inner outline-none" value={formData.budget} onChange={(e) => setFormData({ ...formData, budget: e.target.value })} placeholder="0.00" />
                    </div>
                  </div>
                </div>

                <div className="space-y-2 sm:space-y-3 pb-6 sm:pb-10">
                    <label className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Objectives & KPI</label>
                    <textarea className="w-full px-4 sm:px-6 py-4 sm:py-5 bg-slate-50 dark:bg-white/5 border-none rounded-2xl sm:rounded-3xl focus:ring-4 focus:ring-emerald-500/10 text-xs sm:text-sm font-medium dark:text-slate-200 shadow-inner min-h-[140px] sm:min-h-[160px] outline-none" value={formData.objectives} onChange={(e) => setFormData({ ...formData, objectives: e.target.value })} placeholder="Outline key performance indicators..." />
                </div>
              </form>

              <div className="px-6 sm:px-10 py-6 sm:py-8 bg-slate-50 dark:bg-black/20 border-t border-slate-100 dark:border-white/5 flex flex-col-reverse sm:flex-row justify-end gap-3 sm:gap-6 shrink-0">
                <button type="button" onClick={() => setShowModal(false)} className="w-full sm:w-auto px-6 sm:px-10 py-3.5 sm:py-4 text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-600 bg-white dark:bg-transparent rounded-xl sm:rounded-none border border-slate-200 sm:border-none dark:border-white/10 hover:text-slate-600 dark:hover:text-slate-400 transition-colors">Discard</button>
                <button 
                  onClick={handleSubmit} 
                  disabled={submitting}
                  className="w-full sm:w-auto px-8 sm:px-12 py-4 sm:py-5 bg-emerald-600 dark:bg-emerald-600 text-white rounded-xl sm:rounded-[1.25rem] font-black text-[10px] sm:text-xs uppercase tracking-widest shadow-xl sm:shadow-2xl shadow-emerald-200 dark:shadow-none hover:bg-emerald-500 active:scale-95 transition-all flex items-center justify-center gap-2 sm:gap-3 disabled:opacity-50"
                >
                  {submitting ? <Loader2 className="animate-spin sm:w-[18px] sm:h-[18px]" size={16} /> : <Plus size={16} className="sm:w-[18px] sm:h-[18px]" />}
                  {submitting ? 'Processing...' : 'Record Initiative'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <style dangerouslySetInnerHTML={{ __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; } 
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @supports (padding-top: env(safe-area-inset-top)) {
          .pt-safe { padding-top: max(1.5rem, env(safe-area-inset-top)); }
          .pb-safe { padding-bottom: max(1.5rem, env(safe-area-inset-bottom)); }
        }
      `}} />
    </div>
  );
}