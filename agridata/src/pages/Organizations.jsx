import React, { useState, useEffect } from 'react';
import { organizationsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Building2, Plus, Search, MapPin, Globe, 
  Users, Edit2, Trash2, X, Save, Loader2, 
  Briefcase, Building, AlertCircle, Filter, Download, ArrowUpDown, Eye, PieChart,
  ChevronLeft, ChevronRight, Landmark, Handshake
} from 'lucide-react';

const ORG_TYPES = ['Cooperative', 'Government', 'NGO', 'Private', 'Association'];

// --- COMPONENT: Smooth Count-Up Animation ---
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

// --- SKELETON COMPONENT ---
const OrganizationSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8 px-4 sm:px-0">
    {[...Array(6)].map((_, i) => (
      <div key={i} className="bg-white dark:bg-[#0b241f] rounded-[1.5rem] sm:rounded-[2.5rem] border border-slate-100 dark:border-white/5 p-6 sm:p-8 animate-pulse shadow-sm h-64">
        <div className="flex justify-between mb-4 sm:mb-6">
          <div className="space-y-2 sm:space-y-3 flex-1 pr-4">
            <div className="h-5 sm:h-6 w-24 sm:w-32 bg-slate-100 dark:bg-white/5 rounded-lg"></div>
            <div className="h-3 sm:h-4 w-32 sm:w-48 bg-slate-50 dark:bg-white/5 rounded-md"></div>
          </div>
          <div className="h-10 w-10 sm:h-12 sm:w-12 bg-slate-50 dark:bg-white/5 rounded-xl sm:rounded-2xl shrink-0"></div>
        </div>
        <div className="space-y-4 pt-4 sm:pt-6 border-t border-slate-50 dark:border-white/5">
          <div className="space-y-2">
            <div className="h-2 w-full bg-slate-50 dark:bg-white/5 rounded-full"></div>
            <div className="h-2 w-2/3 bg-slate-50 dark:bg-white/5 rounded-full"></div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

export default function Organizations() {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // Modals
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false); 
  
  // Selection & Forms
  const [editingOrg, setEditingOrg] = useState(null);
  const [selectedOrg, setSelectedOrg] = useState(null); 
  const [error, setError] = useState('');

  // Filters, Sorting & Pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('All'); 
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' }); 
  const [currentPage, setCurrentPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  
  // Auth & Permissions
  const { user, hasPermission } = useAuth();
  const canManage = hasPermission(['admin', 'researcher']); // Define management privilege

  const ITEMS_PER_PAGE = 9;

  const initialForm = {
    name: '',
    type: 'Cooperative',
    description: '',
    location: ''
  };

  const [formData, setFormData] = useState(initialForm);

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    setLoading(true);
    try {
      const response = await organizationsAPI.getAll();
      setOrganizations(response.data);
    } catch (err) {
      console.error(err);
    } finally {
      setTimeout(() => setLoading(false), 600);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canManage) return; // Permission Guard

    setSubmitting(true);
    setError('');

    try {
      if (editingOrg) {
        await organizationsAPI.update(editingOrg.id, formData);
      } else {
        await organizationsAPI.create(formData);
      }
      closeModal();
      fetchOrganizations();
    } catch (err) {
      setError(err.response?.data?.error || 'Transaction failed. Name might be duplicate.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!canManage) return; // Permission Guard

    if (window.confirm('Dissolve this organizational record? This may detach linked farmers.')) {
      try {
        await organizationsAPI.delete(id);
        setOrganizations(prev => prev.filter(o => o.id !== id));
      } catch (err) {
        alert('Cannot delete: Organization has active members.');
      }
    }
  };

  // --- FEATURES ---

  const handleExport = () => {
    setIsExporting(true);
    const headers = ["Name", "Type", "Location", "Description"];
    const rows = organizations.map(o => [
      `"${o.name}"`, o.type, `"${o.location}"`, `"${o.description}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `partners_registry_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => setIsExporting(false), 1000);
  };

  const handleSort = () => {
    setSortConfig(prev => ({
      key: 'name',
      direction: prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleEdit = (org) => {
    if (!canManage) return; // Permission Guard
    setEditingOrg(org);
    setFormData({
      name: org.name,
      type: org.type || 'Cooperative',
      description: org.description || '',
      location: org.location || ''
    });
    setShowModal(true);
  };

  const handleView = (org) => {
    setSelectedOrg(org);
    setShowViewModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setShowViewModal(false);
    setEditingOrg(null);
    setSelectedOrg(null);
    setFormData(initialForm);
    setError('');
  };

  // --- FILTER & SORT LOGIC ---
  const filteredOrgs = organizations
    .filter(o => {
      const matchesSearch = o.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            o.type?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === 'All' || o.type === typeFilter;
      return matchesSearch && matchesType;
    })
    .sort((a, b) => {
      if (sortConfig.direction === 'asc') {
        return a.name.localeCompare(b.name);
      }
      return b.name.localeCompare(a.name);
    });

  // --- PAGINATION LOGIC ---
  const totalPages = Math.ceil(filteredOrgs.length / ITEMS_PER_PAGE);
  const paginated = filteredOrgs.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  // --- STATS CALCULATION ---
  const totalOrgs = organizations.length;
  const totalCoops = organizations.filter(o => o.type === 'Cooperative').length;
  const totalGovNGO = organizations.filter(o => ['Government', 'NGO'].includes(o.type)).length;

  const getTypeStyle = (type) => {
    switch(type) {
      case 'Government': return 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20';
      case 'NGO': return 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20';
      case 'Cooperative': return 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20';
      case 'Private': return 'bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20';
      default: return 'bg-slate-50 text-slate-600 border-slate-100 dark:bg-white/5 dark:text-slate-400 dark:border-white/10';
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#020c0a] font-sans selection:bg-blue-100 transition-colors duration-300 pb-20 relative">
      <div className="max-w-[1400px] mx-auto space-y-8 sm:space-y-12 animate-in fade-in duration-700">
        
        {/* HEADER */}
        <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 sm:gap-8 px-4 pt-6 sm:pt-8">
          <div>
            <div className="flex items-center gap-2 mb-2 sm:mb-4">
              <div className="p-1.5 sm:p-2 bg-emerald-600 rounded-lg sm:rounded-xl text-white shadow-xl shadow-emerald-200 dark:shadow-none">
                <Building2 size={18} className="sm:w-[20px] sm:h-[20px]" />
              </div>
              <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-[0.3em]">Network Registry</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Institutional Partners</h1>
            <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 font-medium mt-1 sm:mt-2">Manage cooperatives, agencies, and funding bodies.</p>
          </div>
          
          {/* Conditional Action: Only for managers */}
          {canManage && (
            <button 
              onClick={() => setShowModal(true)} 
              className="w-full lg:w-auto group flex items-center justify-center gap-3 px-6 sm:px-8 py-3.5 sm:py-4 bg-slate-900 dark:bg-emerald-600 text-white rounded-xl sm:rounded-[1.25rem] font-black text-[10px] sm:text-xs uppercase tracking-widest shadow-xl sm:shadow-2xl shadow-slate-200 dark:shadow-none hover:bg-slate-800 dark:hover:bg-blue-500 active:scale-95 transition-all mt-2 lg:mt-0 shrink-0"
            >
              <Plus size={16} className="sm:w-[18px] sm:h-[18px] group-hover:rotate-90 transition-transform duration-300 shrink-0" />
              <span>Register Entity</span>
            </button>
          )}
        </header>

        {/* STATS SUMMARY */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8 px-4">
          {[
            { label: 'Total Entities', val: totalOrgs, icon: Globe, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-500/10' },
            { label: 'Active Cooperatives', val: totalCoops, icon: Handshake, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
            { label: 'Govt & NGOs', val: totalGovNGO, icon: Landmark, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10' },
          ].map((stat, i) => (
            <div key={i} className="group bg-white dark:bg-[#0b241f] p-6 sm:p-8 rounded-[1.5rem] sm:rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-sm hover:shadow-xl transition-all duration-300 flex items-center gap-4 sm:gap-6 relative overflow-hidden">
               <div className={`p-4 sm:p-5 rounded-xl sm:rounded-2xl ${stat.bg} ${stat.color} shrink-0 group-hover:scale-110 transition-transform`}>
                <stat.icon size={24} className="sm:w-[28px] sm:h-[28px]" />
              </div>
              <div className="min-w-0 relative z-10">
                <p className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-0.5 sm:mb-1">{stat.label}</p>
                <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tighter">
                  <AnimatedCounter value={stat.val} duration={1000} />
                </p>
              </div>
              <div className={`absolute -right-6 -bottom-6 w-20 h-20 sm:w-24 sm:h-24 rounded-full ${stat.bg} opacity-10 dark:opacity-5 group-hover:scale-150 transition-transform duration-700 pointer-events-none`} />
            </div>
          ))}
        </div>

        {/* TOOLBAR: SEARCH, FILTER, SORT, EXPORT */}
        <div className="px-4 flex flex-col md:flex-row gap-3 sm:gap-4">
          
          <div className="bg-white dark:bg-[#0b241f] rounded-xl sm:rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-sm p-1.5 sm:p-2 flex items-center transition-colors flex-[2] w-full">
            <div className="relative flex-1 w-full">
              <Search size={16} className="sm:w-[20px] sm:h-[20px] absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 shrink-0" />
              <input 
                type="text" 
                placeholder="Search partner network..." 
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full pl-12 sm:pl-16 pr-4 sm:pr-6 py-3 sm:py-4 bg-transparent border-none focus:ring-0 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 outline-none"
              />
            </div>
          </div>

          <div className="flex flex-row gap-3 w-full md:w-auto">
            <div className="bg-white dark:bg-[#0b241f] rounded-xl sm:rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-sm p-1.5 sm:p-2 flex items-center gap-2 sm:gap-4 px-3 sm:px-4 flex-1">
              <Filter size={16} className="text-slate-400 shrink-0 hidden sm:block" />
              <select 
                value={typeFilter}
                onChange={(e) => { setTypeFilter(e.target.value); setCurrentPage(1); }}
                className="bg-transparent border-none outline-none text-[10px] sm:text-sm font-bold text-slate-600 dark:text-slate-400 cursor-pointer appearance-none w-full py-3 sm:py-0 truncate"
              >
                <option value="All">All Entities</option>
                {ORG_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            <div className="flex gap-2 shrink-0">
                <button onClick={handleSort} className="p-3 sm:p-4 bg-white dark:bg-[#0b241f] border border-slate-100 dark:border-white/5 rounded-xl sm:rounded-[2rem] text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors shadow-sm flex items-center justify-center w-12 sm:w-14">
                    <ArrowUpDown size={18} className={`sm:w-[20px] sm:h-[20px] shrink-0 ${sortConfig.direction === 'desc' ? 'rotate-180 transition-transform' : 'transition-transform'}`}/>
                </button>
                <button onClick={handleExport} disabled={isExporting} className="p-3 sm:p-4 bg-white dark:bg-[#0b241f] border border-slate-100 dark:border-white/5 rounded-xl sm:rounded-[2rem] text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors shadow-sm flex items-center justify-center w-12 sm:w-14">
                    {isExporting ? <Loader2 className="animate-spin sm:w-[20px] sm:h-[20px] shrink-0" size={18}/> : <Download size={18} className="sm:w-[20px] sm:h-[20px] shrink-0" />}
                </button>
            </div>
          </div>
        </div>

        {/* GRID LAYOUT */}
        <div className="px-4">
          {loading ? (
            <OrganizationSkeleton />
          ) : paginated.length === 0 ? (
            <div className="py-20 sm:py-32 bg-white dark:bg-[#0b241f] rounded-[2rem] sm:rounded-[3rem] border-2 border-dashed border-slate-100 dark:border-white/10 text-center transition-colors">
              <div className="p-6 sm:p-8 bg-slate-50 dark:bg-white/5 rounded-full inline-flex text-slate-200 dark:text-slate-700 mb-6 sm:mb-8">
                <Building size={36} className="sm:w-[48px] sm:h-[48px] shrink-0" />
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">No Organizations Found</h3>
              <p className="text-xs sm:text-sm text-slate-400 dark:text-slate-500 font-medium mt-2 sm:mt-3 px-4">Try refining your search or filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8">
              {paginated.map(org => (
                <div key={org.id} className="group bg-white dark:bg-[#0b241f] p-6 sm:p-8 rounded-[1.5rem] sm:rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-sm hover:shadow-xl dark:hover:shadow-black/40 hover:-translate-y-1 transition-all relative overflow-hidden flex flex-col justify-between h-full">
                  
                  {/* Action Menu: Conditional Rendering based on permissions */}
                  <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex gap-1.5 sm:gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity duration-300 z-10">
                    <button onClick={() => handleView(org)} className="p-1.5 sm:p-2 bg-white dark:bg-black/40 backdrop-blur-md hover:text-emerald-500 rounded-lg sm:rounded-xl transition-colors text-slate-400 border border-slate-100 dark:border-white/10 shrink-0" title="View Profile"><Eye size={14} className="sm:w-[16px] sm:h-[16px] shrink-0" /></button>
                    
                    {/* HIDE FOR VIEWERS */}
                    {canManage && (
                      <>
                        <button onClick={() => handleEdit(org)} className="p-1.5 sm:p-2 bg-white dark:bg-black/40 backdrop-blur-md hover:text-blue-600 rounded-lg sm:rounded-xl transition-colors text-slate-400 border border-slate-100 dark:border-white/10 shrink-0" title="Edit Entity"><Edit2 size={14} className="sm:w-[16px] sm:h-[16px] shrink-0" /></button>
                        <button onClick={() => handleDelete(org.id)} className="p-1.5 sm:p-2 bg-white dark:bg-black/40 backdrop-blur-md hover:text-rose-600 rounded-lg sm:rounded-xl transition-colors text-slate-400 border border-slate-100 dark:border-white/10 shrink-0" title="Remove Entity"><Trash2 size={14} className="sm:w-[16px] sm:h-[16px] shrink-0" /></button>
                      </>
                    )}
                  </div>

                  <div className="mt-4 sm:mt-0">
                    <div className="flex items-start justify-between mb-4 sm:mb-6">
                      <div className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl border transition-colors shrink-0 ${getTypeStyle(org.type)}`}>
                        <Building size={20} className="sm:w-[24px] sm:h-[24px] shrink-0" />
                      </div>
                    </div>

                    <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white leading-tight mb-1.5 sm:mb-2 uppercase tracking-tight pr-12 line-clamp-2">{org.name}</h3>
                    <span className={`inline-block px-2.5 py-1 rounded-md sm:rounded-lg text-[8px] sm:text-[10px] font-black uppercase tracking-widest border mb-3 sm:mb-4 transition-colors shrink-0 ${getTypeStyle(org.type)}`}>
                      {org.type || 'Organization'}
                    </span>
                    
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed line-clamp-3">
                      {org.description || 'No institutional description available.'}
                    </p>
                  </div>

                  <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-slate-50 dark:border-white/5 flex items-center gap-2 sm:gap-3 text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                    <MapPin size={12} className="sm:w-[14px] sm:h-[14px] shrink-0" />
                    <span className="truncate">{org.location || 'Unspecified location'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* PAGINATION CONTROLS */}
        {!loading && totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between bg-white dark:bg-[#0b241f] px-6 sm:px-10 py-5 sm:py-6 rounded-3xl sm:rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-sm mx-4 transition-colors gap-4">
            <p className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">
                Page <span className="text-slate-900 dark:text-white">{currentPage}</span> of {totalPages}
            </p>
            <div className="flex gap-3 sm:gap-4 w-full sm:w-auto justify-center">
                <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} className="flex-1 sm:flex-none p-3 sm:p-4 flex justify-center bg-white dark:bg-[#041d18] border border-slate-100 dark:border-white/10 rounded-xl sm:rounded-2xl text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-30 transition-all shadow-sm shrink-0">
                <ChevronLeft size={18} className="sm:w-[20px] sm:h-[20px] shrink-0" />
                </button>
                <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} className="flex-1 sm:flex-none p-3 sm:p-4 flex justify-center bg-white dark:bg-[#041d18] border border-slate-100 dark:border-white/10 rounded-xl sm:rounded-2xl text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-30 transition-all shadow-sm shrink-0">
                <ChevronRight size={18} className="sm:w-[20px] sm:h-[20px] shrink-0" />
                </button>
            </div>
            </div>
        )}

        {/* VIEW MODAL (Responsive) */}
        {showViewModal && selectedOrg && (
            <div className="fixed inset-0 z-[1000] flex items-center justify-center p-0 sm:p-4 md:p-8 overflow-hidden">
                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={closeModal} />
                <div className="relative bg-white dark:bg-[#041d18] rounded-none sm:rounded-[3rem] shadow-2xl w-full h-full sm:h-auto sm:max-w-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-500 border-none sm:border dark:border-white/5">
                    <div className="p-6 sm:p-8 border-b border-slate-100 dark:border-white/5 flex justify-between items-start bg-slate-50/50 dark:bg-black/20 shrink-0 pt-safe">
                        <h3 className="text-[10px] sm:text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Globe size={14} className="shrink-0" /> Entity Profile
                        </h3>
                        <button onClick={closeModal} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-full text-slate-400 transition-colors shrink-0"><X size={20} className="sm:w-[24px] sm:h-[24px] shrink-0" /></button>
                    </div>
                    <div className="p-6 sm:p-10 space-y-6 sm:space-y-8 overflow-y-auto no-scrollbar flex-1 pb-safe">
                        <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4 sm:gap-6">
                            <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl sm:rounded-[1.5rem] flex items-center justify-center shrink-0 border ${getTypeStyle(selectedOrg.type)}`}>
                                <Building size={32} className="sm:w-[48px] sm:h-[48px] shrink-0" />
                            </div>
                            <div className="min-w-0">
                                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white uppercase leading-tight mb-2 tracking-tight">{selectedOrg.name}</h2>
                                <span className={`inline-block px-3 py-1 rounded-md sm:rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-widest border transition-colors shrink-0 ${getTypeStyle(selectedOrg.type)}`}>
                                    {selectedOrg.type || 'Organization'}
                                </span>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                            <div className="p-5 sm:p-6 bg-slate-50 dark:bg-white/5 rounded-2xl sm:rounded-3xl border border-slate-100 dark:border-white/5">
                                <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 sm:mb-2 flex items-center justify-center sm:justify-start gap-2"><MapPin size={14} className="shrink-0"/> Base of Operations</p>
                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 text-center sm:text-left">{selectedOrg.location || 'N/A'}</p>
                            </div>
                            <div className="p-5 sm:p-6 bg-slate-50 dark:bg-white/5 rounded-2xl sm:rounded-3xl border border-slate-100 dark:border-white/5 md:col-span-2">
                                <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 sm:mb-2 flex items-center justify-center sm:justify-start gap-2"><Briefcase size={14} className="shrink-0"/> Institutional Mandate</p>
                                <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400 leading-relaxed text-center sm:text-left">{selectedOrg.description || 'No description provided.'}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* EDIT/CREATE MODAL (Responsive & Restricted) */}
        {showModal && canManage && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-0 sm:p-4 md:p-8 overflow-hidden">
            <div className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={closeModal} />
            <div className="relative bg-white dark:bg-[#041d18] rounded-none sm:rounded-[3rem] shadow-2xl w-full h-full sm:h-auto sm:max-w-2xl sm:max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-500 border-none sm:border dark:border-white/5">
              
              <div className="p-6 sm:p-10 border-b border-slate-50 dark:border-white/5 flex items-center justify-between bg-white/80 dark:bg-[#041d18]/80 backdrop-blur-xl shrink-0 z-10 pt-safe">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase leading-none">{editingOrg ? 'Update Entity' : 'Register Entity'}</h2>
                  <p className="text-slate-400 dark:text-slate-500 font-medium text-xs sm:text-sm mt-1">Define institutional parameters.</p>
                </div>
                <button onClick={closeModal} className="p-2 sm:p-4 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl sm:rounded-2xl transition-all text-slate-300 dark:text-slate-600 shrink-0"><X size={24} className="sm:w-[28px] sm:h-[28px]" /></button>
              </div>

              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-8 sm:space-y-10 no-scrollbar pb-safe">
                
                {error && (
                  <div className="p-4 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl sm:rounded-2xl flex items-center gap-2 sm:gap-3 border border-rose-100 dark:border-rose-500/20">
                    <AlertCircle size={16} className="sm:w-[18px] sm:h-[18px] shrink-0" />
                    <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest">{error}</span>
                  </div>
                )}

                <div className="space-y-2 sm:space-y-3">
                  <label className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Organization Name</label>
                  <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-50 dark:bg-white/5 border-none rounded-xl sm:rounded-2xl focus:ring-4 focus:ring-blue-500/10 text-xs sm:text-sm font-bold dark:text-white shadow-inner outline-none transition-all" placeholder="e.g. Laguna Rice Cooperative" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2 sm:space-y-3">
                    <label className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Entity Type</label>
                    <select value={formData.type} onChange={(e) => setFormData({...formData, type: e.target.value})}
                      className="w-full px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-50 dark:bg-white/5 border-none rounded-xl sm:rounded-2xl focus:ring-4 focus:ring-blue-500/10 text-xs sm:text-sm font-bold dark:text-white shadow-inner outline-none appearance-none cursor-pointer">
                      {ORG_TYPES.map(t => <option key={t} value={t} className="dark:bg-[#041d18]">{t}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2 sm:space-y-3">
                    <label className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Headquarters</label>
                    <input type="text" value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})}
                      className="w-full px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-50 dark:bg-white/5 border-none rounded-xl sm:rounded-2xl focus:ring-4 focus:ring-blue-500/10 text-xs sm:text-sm font-bold dark:text-white shadow-inner outline-none transition-all" placeholder="City, Province" />
                  </div>
                </div>

                <div className="space-y-2 sm:space-y-3 pb-6 sm:pb-0">
                  <label className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Description & Mandate</label>
                  <textarea value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-50 dark:bg-white/5 border-none rounded-xl sm:rounded-2xl focus:ring-4 focus:ring-blue-500/10 text-xs sm:text-sm font-bold dark:text-slate-200 shadow-inner outline-none min-h-[100px] sm:min-h-[120px] transition-all" placeholder="Brief summary of the organization..." />
                </div>

              </form>

              <div className="px-6 sm:px-10 py-6 sm:py-8 bg-slate-50 dark:bg-black/20 border-t border-slate-100 dark:border-white/5 flex flex-col-reverse sm:flex-row justify-end gap-3 sm:gap-6 shrink-0">
                <button type="button" onClick={closeModal} className="w-full sm:w-auto px-6 sm:px-10 py-3.5 sm:py-4 text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-600 bg-white dark:bg-transparent rounded-xl sm:rounded-none border border-slate-200 sm:border-none dark:border-white/10 hover:text-slate-600 dark:hover:text-slate-400 transition-colors text-center shrink-0">Cancel</button>
                <button 
                  onClick={handleSubmit} 
                  disabled={submitting}
                  className="w-full sm:w-auto px-8 sm:px-12 py-3.5 sm:py-5 bg-blue-600 dark:bg-blue-600 text-white rounded-xl sm:rounded-[1.25rem] font-black text-[10px] sm:text-xs uppercase tracking-widest shadow-xl sm:shadow-2xl shadow-blue-200 dark:shadow-none hover:bg-blue-500 active:scale-95 transition-all flex items-center justify-center gap-2 sm:gap-3 disabled:opacity-50 shrink-0"
                >
                  {submitting ? <Loader2 className="animate-spin sm:w-[18px] sm:h-[18px] shrink-0" size={16} /> : <Save size={16} className="sm:w-[18px] sm:h-[18px] shrink-0" />}
                  <span>{editingOrg ? 'Save Changes' : 'Register Entity'}</span>
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
          .pt-safe { padding-top: max(1.25rem, env(safe-area-inset-top)); }
          .pb-safe { padding-bottom: max(1.25rem, env(safe-area-inset-bottom)); }
        }
      `}} />
    </div>
  );
}