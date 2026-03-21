import React, { useState, useEffect } from 'react';
import { usersAPI, authAPI, organizationsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  UserPlus, ShieldCheck, Microscope, PenTool, Eye, 
  Building, Lock, X, Edit2, Search,
  Fingerprint, Loader2, AlertCircle, 
  Ban, CheckCircle, Trash2, Filter, Download, ArrowUpDown, Sprout,
  UsersRound,
  UserCheck, UserX, Clock, ShieldAlert,
  LayoutList,
  CheckSquare, Square, MinusSquare,
  ChevronLeft, ChevronRight
} from 'lucide-react';

// --- Skeleton Component ---
const UserSkeleton = () => (
  <>
    {[...Array(6)].map((_, i) => (
      <tr key={i} className="animate-pulse border-b border-slate-50 dark:border-white/5">
        <td className="px-4 py-4 sm:px-6 sm:py-5"><div className="h-5 w-5 bg-slate-100 dark:bg-white/5 rounded"></div></td>
        <td className="px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="h-10 w-10 sm:h-12 sm:w-12 bg-slate-100 dark:bg-white/5 rounded-xl shrink-0"></div>
            <div className="space-y-2 flex-1 min-w-0">
              <div className="h-3 sm:h-4 w-24 sm:w-32 bg-slate-100 dark:bg-white/5 rounded"></div>
              <div className="h-2 sm:h-3 w-16 sm:w-20 bg-slate-50 dark:bg-white/5 rounded"></div>
            </div>
          </div>
        </td>
        <td className="px-4 py-4 sm:px-6 sm:py-5"><div className="h-6 sm:h-7 w-20 sm:w-24 bg-slate-50 dark:bg-white/5 rounded-md sm:rounded-lg"></div></td>
        <td className="px-4 py-4 sm:px-6 sm:py-5"><div className="h-3 sm:h-4 w-24 sm:w-32 bg-slate-50 dark:bg-white/5 rounded"></div></td>
        <td className="px-4 py-4 sm:px-6 sm:py-5"><div className="h-5 sm:h-6 w-16 sm:w-20 bg-slate-50 dark:bg-white/5 rounded-full"></div></td>
        <td className="px-4 py-4 sm:px-6 sm:py-5 text-right"><div className="h-8 w-20 sm:h-10 sm:w-24 bg-slate-50 dark:bg-white/5 rounded-lg sm:rounded-xl ml-auto"></div></td>
      </tr>
    ))}
  </>
);

const ROLE_OPTIONS = ['All', 'admin', 'researcher', 'data_encoder', 'viewer', 'farmer', 'mentee'];

export default function Users() {
  const [users, setUsers] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [sortOrder, setSortOrder] = useState('asc'); 
  const [isExporting, setIsExporting] = useState(false);
  const [transactionError, setTransactionError] = useState('');
  const [activeTab, setActiveTab] = useState('all'); 
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const initialForm = {
    username: '', email: '', password: '', confirmPassword: '', full_name: '', role: 'viewer', organization: ''
  };

  const [formData, setFormData] = useState(initialForm);

  useEffect(() => { 
    fetchUsers(); 
    fetchOrganizations();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedUsers([]);
  }, [searchTerm, roleFilter, activeTab]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await usersAPI.getAll();
      setUsers(response.data);
    } catch (error) {
      console.error('Fetch error:', error);
    } finally {
      setTimeout(() => setLoading(false), 600);
    }
  };

  const fetchOrganizations = async () => {
    try {
      const response = await organizationsAPI.getAll();
      setOrganizations(response.data);
    } catch (error) {
      console.error('Organization fetch error:', error);
    }
  };

  const handleToggleSelect = (userId) => {
    setSelectedUsers(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const handleSelectAll = (visibleOnPage) => {
    const visibleIds = visibleOnPage.map(u => u.id);
    const allOnPageSelected = visibleIds.every(id => selectedUsers.includes(id));
    if (allOnPageSelected) {
      setSelectedUsers(prev => prev.filter(id => !visibleIds.includes(id)));
    } else {
      setSelectedUsers(prev => [...new Set([...prev, ...visibleIds])]);
    }
  };

  const handleBulkApprove = async () => {
    const pendingToApprove = users.filter(u => selectedUsers.includes(u.id) && u.status === 'pending');
    if (!isAdmin || pendingToApprove.length === 0) return;
    if (window.confirm(`Approve all ${pendingToApprove.length} selected pending requests?`)) {
      setIsBulkProcessing(true);
      try {
        await Promise.all(pendingToApprove.map(u => 
          usersAPI.update(u.id, { status: 'approved', is_active: true })
        ));
        setSelectedUsers([]);
        await fetchUsers();
      } catch (error) {
        alert("Bulk action failed.");
      } finally {
        setIsBulkProcessing(false);
      }
    }
  };

  const handleBulkDecline = async () => {
    const pendingToDecline = users.filter(u => selectedUsers.includes(u.id) && u.status === 'pending');
    if (!isAdmin || pendingToDecline.length === 0) return;
    if (window.confirm(`Decline access for ${pendingToDecline.length} users?`)) {
      setIsBulkProcessing(true);
      try {
        await Promise.all(pendingToDecline.map(u => 
          usersAPI.update(u.id, { status: 'declined', is_active: false })
        ));
        setSelectedUsers([]);
        await fetchUsers();
      } catch (error) {
        alert("Bulk action failed.");
      } finally {
        setIsBulkProcessing(false);
      }
    }
  };

  const handleApproveUser = async (targetUser) => {
    if (!isAdmin) return;
    if (window.confirm(`Grant full access to ${targetUser.full_name}?`)) {
      try {
        await usersAPI.update(targetUser.id, { status: 'approved', is_active: true });
        await fetchUsers();
      } catch (error) {
        alert("Approval failed.");
      }
    }
  };

  const handleDeclineUser = async (targetUser) => {
    if (!isAdmin) return;
    if (window.confirm(`Decline request from ${targetUser.full_name}?`)) {
      try {
        await usersAPI.update(targetUser.id, { status: 'declined', is_active: false });
        await fetchUsers();
      } catch (error) {
        alert("Decline failed.");
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAdmin) return; 
    setSubmitting(true);
    setTransactionError('');
    try {
      const payload = { ...formData, organization: formData.organization || null };
      if (editingUser) {
        if (!payload.password) delete payload.password;
        delete payload.confirmPassword;
        await usersAPI.update(editingUser.id, payload);
      } else {
        delete payload.confirmPassword;
        await authAPI.register(payload);
      }
      closeModal();
      await fetchUsers(); 
    } catch (error) {
      setTransactionError(error?.response?.data?.error || 'Transaction rejected.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (targetUser) => {
    if (!isAdmin) return;
    const newStatus = !targetUser.is_active;
    if (window.confirm(newStatus ? `Authorize ${targetUser.full_name}?` : `Revoke ${targetUser.full_name}?`)) {
      try {
        await usersAPI.update(targetUser.id, { is_active: newStatus });
        await fetchUsers();
      } catch (error) {
        alert(`Failed to update status.`);
      }
    }
  };

  const handleDelete = async (id, name) => {
    if (!isAdmin) return;
    if (window.confirm(`PERMANENTLY OFFBOARD USER: ${name}?`)) {
        try {
            await usersAPI.delete(id);
            setUsers(prev => prev.filter(u => u.id !== id));
        } catch (error) {
            alert("Deletion failed.");
        }
    }
  };

  const handleEdit = (targetUser) => {
    if (!isAdmin) return;
    setEditingUser(targetUser);
    setFormData({
      username: targetUser.username,
      email: targetUser.email,
      password: '',
      confirmPassword: '',
      full_name: targetUser.full_name,
      role: targetUser.role,
      organization: targetUser.organization_id || '' 
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setFormData(initialForm);
    setTransactionError('');
  };

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => setIsExporting(false), 1000);
  };

  const pendingCount = users.filter(u => u.status === 'pending').length;
  const hasPendingSelected = users.some(u => selectedUsers.includes(u.id) && u.status === 'pending');

  const filteredUsers = users
    .filter(u => {
        const matchesSearch = u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                              u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                              u.username?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesRole = roleFilter === 'All' || u.role === roleFilter;
        const matchesTab = activeTab === 'all' || u.status === 'pending';
        return matchesSearch && matchesRole && matchesTab;
    })
    .sort((a, b) => {
        return sortOrder === 'asc' 
            ? a.full_name.localeCompare(b.full_name) 
            : b.full_name.localeCompare(a.full_name);
    });

  const totalItems = filteredUsers.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + itemsPerPage);

  const roleConfigs = {
    admin: { icon: ShieldCheck, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-500/10', border: 'border-rose-200 dark:border-rose-500/20' },
    researcher: { icon: Microscope, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-500/10', border: 'border-blue-200 dark:border-blue-500/20' },
    data_encoder: { icon: PenTool, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10', border: 'border-emerald-200 dark:border-emerald-500/20' },
    viewer: { icon: Eye, color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-50 dark:bg-white/5', border: 'border-slate-200 dark:border-white/10' },
    farmer: { icon: Sprout, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10', border: 'border-amber-200 dark:border-amber-500/20' },
    mentee: { icon: UsersRound, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-500/10', border: 'border-indigo-200 dark:border-indigo-500/20' }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#020c0a] font-sans selection:bg-emerald-100 transition-colors duration-300 pb-20">
      <div className="max-w-[1400px] mx-auto space-y-4 sm:space-y-8 animate-in fade-in duration-700 px-2 sm:px-4">
        
        {/* HEADER */}
        <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 sm:gap-6 pt-4 sm:pt-6 px-2 sm:px-0">
          <div>
            <div className="flex items-center gap-2 mb-1.5 sm:mb-3">
              <div className="p-1 sm:p-2 bg-emerald-600 rounded-lg text-white shadow-lg shrink-0">
                <ShieldCheck size={14} className="sm:w-[18px] sm:h-[18px]" />
              </div>
              <span className="text-[9px] sm:text-[10px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-widest">Governance Module</span>
            </div>
            <h1 className="text-xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase leading-none">Identity Governance</h1>
            <p className="text-[10px] sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-1 sm:mt-2">Manage team access and secure system credentials.</p>
          </div>
          
          <div className="flex flex-row items-center gap-2 w-full lg:w-auto">
            <button onClick={handleExport} disabled={isExporting} className="flex-1 lg:flex-none flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2.5 bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl font-black text-[9px] sm:text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:text-emerald-600 transition-all shadow-sm">
                {isExporting ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                <span>Export</span>
            </button>
            {isAdmin && (
              <button onClick={() => setShowModal(true)} className="flex-1 lg:flex-none flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-6 py-2.5 bg-slate-900 dark:bg-emerald-600 text-white rounded-xl font-black text-[9px] sm:text-[10px] uppercase shadow-lg hover:bg-slate-800 active:scale-95 transition-all">
                  <UserPlus size={12} />
                  <span>Onboard</span>
              </button>
            )}
          </div>
        </header>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-white/5 rounded-xl sm:rounded-2xl w-fit">
          <button onClick={() => setActiveTab('all')} className={`flex items-center gap-2 px-4 sm:px-6 py-2 rounded-lg font-black text-[9px] sm:text-[10px] uppercase transition-all ${activeTab === 'all' ? 'bg-white dark:bg-emerald-600 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
            <LayoutList size={14} /><span>All Identities</span>
          </button>
          <button onClick={() => setActiveTab('pending')} className={`flex items-center gap-2 px-4 sm:px-6 py-2 rounded-lg font-black text-[9px] sm:text-[10px] uppercase transition-all relative ${activeTab === 'pending' ? 'bg-white dark:bg-emerald-600 text-slate-900 dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>
            <Clock size={14} /><span>Pending</span>
            {pendingCount > 0 && <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[8px] font-black bg-emerald-600 text-white ml-1">{pendingCount}</span>}
          </button>
        </div>

        {/* DATA CONTAINER */}
        <div className="bg-white dark:bg-[#0b241f] rounded-[1.5rem] sm:rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-sm overflow-hidden transition-all relative">
          
          <div className="p-3 sm:p-6 border-b border-slate-50 dark:border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-5">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 flex-1">
              <div className="relative flex-[2] sm:max-w-sm">
                  <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input type="text" placeholder="Search identity..." className="w-full pl-8 sm:pl-11 pr-3 sm:pr-4 py-2.5 bg-slate-50 dark:bg-white/5 border-none rounded-lg sm:rounded-xl focus:ring-2 focus:ring-emerald-500/20 text-[10px] sm:text-sm font-bold dark:text-white shadow-inner outline-none transition-all" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1 sm:w-48">
                    <Filter className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
                    <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="w-full pl-7 sm:pl-11 pr-6 py-2.5 bg-slate-50 dark:bg-white/5 border-none rounded-lg focus:ring-2 focus:ring-emerald-500/20 text-[9px] sm:text-[10px] font-black uppercase text-slate-600 shadow-inner appearance-none cursor-pointer outline-none">
                        {ROLE_OPTIONS.map(r => <option key={r} value={r} className="dark:bg-[#0b241f]">{r.replace('_', ' ').toUpperCase()}</option>)}
                    </select>
                </div>
                <button onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')} className="p-2.5 bg-slate-50 dark:bg-white/5 rounded-lg text-slate-400 hover:text-emerald-600 transition-colors shrink-0">
                    <ArrowUpDown size={14} className={`${sortOrder === 'desc' ? 'rotate-180' : ''}`}/>
                </button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto w-full no-scrollbar">
            <table className="w-full text-left min-w-[700px] sm:min-w-[900px] whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-white/5 text-slate-400 text-[10px] uppercase font-black tracking-widest border-b border-slate-100 dark:border-white/5">
                  <th className="px-4 py-4 sm:px-6 sm:py-5 w-10">
                    <button onClick={() => handleSelectAll(paginatedUsers)} className="text-slate-400 hover:text-emerald-600 transition-colors">
                      {paginatedUsers.length > 0 && paginatedUsers.every(u => selectedUsers.includes(u.id)) ? <CheckSquare size={18} className="text-emerald-600" /> : selectedUsers.some(id => paginatedUsers.map(u => u.id).includes(id)) ? <MinusSquare size={18} className="text-emerald-600" /> : <Square size={18} />}
                    </button>
                  </th>
                  <th className="px-4 py-4 sm:px-6 sm:py-5">Identity</th>
                  <th className="px-4 py-4 sm:px-6 sm:py-5">Privilege</th>
                  <th className="px-4 py-4 sm:px-6 sm:py-5">Affiliation</th>
                  <th className="px-4 py-4 sm:px-6 sm:py-5">Clearance</th>
                  <th className="px-4 py-4 sm:px-6 sm:py-5 text-right">Operations</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                {loading ? <UserSkeleton /> : paginatedUsers.length === 0 ? <tr><td colSpan="7" className="p-12 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">No entries found</td></tr> : (
                  paginatedUsers.map((u) => {
                  const roleStyle = roleConfigs[u.role] || roleConfigs['viewer'];
                  const isSelected = selectedUsers.includes(u.id);
                  return (
                    <tr key={u.id} className={`group hover:bg-slate-50/50 dark:hover:bg-white/5 transition-all duration-300 ${isSelected ? 'bg-emerald-50/30 dark:bg-emerald-500/5' : ''}`}>
                      <td className="px-4 py-4 sm:px-6 sm:py-5"><button onClick={() => handleToggleSelect(u.id)} className={`transition-colors ${isSelected ? 'text-emerald-600' : 'text-slate-300 dark:text-slate-700'}`}>{isSelected ? <CheckSquare size={18} /> : <Square size={18} />}</button></td>
                      <td className="px-4 py-4 sm:px-6 sm:py-5"><div className="flex items-center gap-3"><div className={`h-10 w-10 rounded-xl flex items-center justify-center font-black border border-slate-100 dark:border-white/10 ${u.is_active ? 'bg-slate-50 dark:bg-[#020c0a] text-emerald-700' : 'bg-slate-200 text-slate-400'}`}>{u.full_name?.charAt(0)}</div><div><p className="text-[11px] sm:text-sm font-black dark:text-white">{u.full_name}</p><p className="text-[9px] text-slate-400 font-bold mt-0.5">@{u.username}</p></div></div></td>
                      <td className="px-4 py-4 sm:px-6 sm:py-5"><span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[9px] font-black uppercase border ${roleStyle.bg} ${roleStyle.color} ${roleStyle.border}`}>{roleStyle.icon && <roleStyle.icon size={10} />}{u.role.replace('_', ' ')}</span></td>
                      <td className="px-4 py-4 sm:px-6 sm:py-5"><div className="text-[10px] sm:text-sm font-bold text-slate-500 truncate max-w-[150px]">{organizations.find(o => o.id === u.organization_id)?.name || 'Independent'}</div></td>
                      <td className="px-4 py-4 sm:px-6 sm:py-5">{u.status === 'pending' ? <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[8px] sm:text-[9px] font-black uppercase text-amber-700 bg-amber-50 border border-amber-100"><Clock size={10} className="animate-pulse" />Approval Pending</div> : <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[8px] sm:text-[9px] font-black uppercase ${u.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}><span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-emerald-500' : 'bg-rose-500'}`} />{u.is_active ? 'Active' : 'Locked'}</div>}</td>
                      <td className="px-4 py-4 sm:px-6 sm:py-5 text-right">
                        <div className="flex justify-end gap-1.5">
                          {u.status === 'pending' ? (
                            <>
                              <button onClick={() => handleApproveUser(u)} disabled={!isAdmin} className="p-2 sm:p-2.5 bg-emerald-500 text-white hover:bg-emerald-600 rounded-lg sm:rounded-xl shadow-lg flex items-center gap-2 transition-all"><UserCheck size={14} /><span className="hidden xl:inline text-[10px] font-black uppercase">Approve</span></button>
                              <button onClick={() => handleDeclineUser(u)} disabled={!isAdmin} className="p-2 sm:p-2.5 bg-white dark:bg-[#041d18] text-rose-500 hover:bg-rose-500 hover:text-white rounded-lg sm:rounded-xl transition-all"><UserX size={14} /></button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => handleEdit(u)} disabled={!isAdmin} className="p-2 sm:p-2.5 bg-white dark:bg-[#041d18] text-slate-400 hover:text-emerald-600 rounded-lg sm:rounded-xl transition-colors"><Edit2 size={14} /></button>
                              <button onClick={() => handleToggleStatus(u)} disabled={!isAdmin} className="p-2 sm:p-2.5 bg-white dark:bg-[#041d18] text-slate-400 hover:text-amber-600 rounded-lg sm:rounded-xl transition-colors">{u.is_active ? <Ban size={14} /> : <CheckCircle size={14} />}</button>
                              <button onClick={() => handleDelete(u.id, u.full_name)} disabled={!isAdmin} className="p-2 sm:p-2.5 bg-white dark:bg-[#041d18] text-slate-400 hover:text-rose-600 rounded-lg sm:rounded-xl transition-colors"><Trash2 size={14} /></button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                }))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="px-6 py-5 border-t border-slate-50 dark:border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/30 dark:bg-black/10">
              <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest">
                Showing <span className="text-slate-900 dark:text-white">{startIndex + 1}</span> to <span className="text-slate-900 dark:text-white">{Math.min(startIndex + itemsPerPage, totalItems)}</span> of <span className="text-slate-900 dark:text-white">{totalItems}</span> identities
              </p>
              <div className="flex items-center gap-2">
                <button disabled={currentPage === 1} onClick={() => setCurrentPage(prev => prev - 1)} className="p-2 rounded-xl bg-white dark:bg-white/5 border border-slate-100 text-slate-400 hover:text-emerald-600 disabled:opacity-30 transition-all shadow-sm"><ChevronLeft size={16} /></button>
                <div className="flex items-center gap-1">
                  {[...Array(totalPages)].map((_, i) => (
                    <button key={i + 1} onClick={() => setCurrentPage(i + 1)} className={`h-8 w-8 rounded-xl font-black text-[10px] transition-all ${currentPage === i + 1 ? 'bg-emerald-600 text-white' : 'bg-white dark:bg-white/5 text-slate-400 border border-slate-100'}`}>{i + 1}</button>
                  ))}
                </div>
                <button disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => prev + 1)} className="p-2 rounded-xl bg-white dark:bg-white/5 border border-slate-100 text-slate-400 hover:text-emerald-600 disabled:opacity-30 transition-all shadow-sm"><ChevronRight size={16} /></button>
              </div>
            </div>
          )}
        </div>

        {/* BULK ACTION BAR */}
        {selectedUsers.length > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[500] w-full max-w-xl px-4 animate-in slide-in-from-bottom-10">
            <div className="bg-slate-900 dark:bg-emerald-950 text-white rounded-[2rem] p-4 shadow-2xl flex items-center justify-between gap-4 border border-white/10">
              <div className="flex items-center gap-4 pl-4"><div className="h-10 w-10 bg-white/10 rounded-full flex items-center justify-center font-black text-emerald-400">{selectedUsers.length}</div><div className="flex flex-col"><p className="text-[10px] font-black uppercase text-white/60">Selected</p><p className="text-sm font-bold">Identity Action</p></div></div>
              <div className="flex gap-2">
                {hasPendingSelected && (
                  <>
                    <button onClick={handleBulkApprove} disabled={isBulkProcessing} className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 rounded-2xl font-black text-[10px] uppercase flex items-center gap-2 transition-all">{isBulkProcessing ? <Loader2 size={14} className="animate-spin" /> : <UserCheck size={14} />}Approve</button>
                    <button onClick={handleBulkDecline} disabled={isBulkProcessing} className="px-6 py-3 bg-white/10 hover:bg-rose-500 rounded-2xl font-black text-[10px] uppercase flex items-center gap-2 transition-all"><UserX size={14} />Decline</button>
                  </>
                )}
                <button onClick={() => setSelectedUsers([])} className="p-3 text-white/40 hover:text-white transition-colors"><X size={20} /></button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL (UNCHANGED) */}
        {showModal && isAdmin && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-0 sm:p-4 md:p-8 overflow-hidden">
            <div className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={closeModal} />
            <div className="relative bg-white dark:bg-[#041d18] rounded-none sm:rounded-[3rem] shadow-2xl w-full h-full sm:h-auto sm:max-w-3xl flex flex-col overflow-hidden border-none sm:border dark:border-white/5 animate-in zoom-in-95">
              <div className="p-6 sm:p-10 border-b border-slate-50 dark:border-white/5 flex items-center justify-between"><h2 className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white uppercase leading-none">{editingUser ? 'Update Identity' : 'Onboard User'}</h2><button onClick={closeModal} className="p-2 sm:p-4 text-slate-300 hover:bg-slate-50 rounded-xl shrink-0"><X size={24} /></button></div>
              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-8 no-scrollbar pb-safe">
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5"><label className="text-[10px] font-black uppercase text-slate-400">Username</label><input type="text" required disabled={!!editingUser} className="w-full px-5 py-3.5 bg-slate-50 dark:bg-white/5 border-none rounded-xl focus:ring-4 focus:ring-emerald-500/10 text-xs font-bold dark:text-white outline-none" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} /></div>
                    <div className="space-y-1.5"><label className="text-[10px] font-black uppercase text-slate-400">Email</label><input type="email" required className="w-full px-5 py-3.5 bg-slate-50 dark:bg-white/5 border-none rounded-xl focus:ring-4 focus:ring-emerald-500/10 text-xs font-bold dark:text-white outline-none" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} /></div>
                  </div>
                  <div className="space-y-1.5"><label className="text-[10px] font-black uppercase text-slate-400">Full Name</label><input type="text" required className="w-full px-5 py-3.5 bg-slate-50 dark:bg-white/5 border-none rounded-xl focus:ring-4 focus:ring-emerald-500/10 text-xs font-bold dark:text-white outline-none" value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} /></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5"><label className="text-[10px] font-black uppercase text-slate-400">Role</label><select className="w-full px-5 py-3.5 bg-slate-50 dark:bg-white/5 border-none rounded-xl text-xs font-bold dark:text-white appearance-none outline-none" value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })}><option value="viewer">Viewer</option><option value="data_encoder">Data Encoder</option><option value="researcher">Researcher</option><option value="admin">Admin</option><option value="farmer">Farmer</option><option value="mentee">Mentee</option></select></div>
                    <div className="space-y-1.5"><label className="text-[10px] font-black uppercase text-slate-400">Affiliation</label><select className="w-full px-5 py-3.5 bg-slate-50 dark:bg-white/5 border-none rounded-xl text-xs font-bold dark:text-white appearance-none outline-none" value={formData.organization} onChange={(e) => setFormData({ ...formData, organization: e.target.value })}><option value="">Select...</option>{organizations.map(org => (<option key={org.id} value={org.id}>{org.name}</option>))}</select></div>
                  </div>
                </div>
              </form>
              <div className="px-6 py-6 bg-slate-50 dark:bg-black/20 border-t border-slate-100 flex flex-col-reverse sm:flex-row justify-end gap-3 pb-safe"><button type="button" onClick={closeModal} className="px-6 py-3.5 text-xs font-black uppercase text-slate-400">Abort</button><button onClick={handleSubmit} className="px-8 py-3.5 bg-emerald-600 text-white rounded-xl font-black text-xs uppercase shadow-xl hover:bg-emerald-500 transition-all">Commit Changes</button></div>
            </div>
          </div>
        )}
      </div>
      <style dangerouslySetInnerHTML={{ __html: `.no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; } @supports (padding-top: env(safe-area-inset-top)) { .pt-safe { padding-top: max(1.25rem, env(safe-area-inset-top)); } .pb-safe { padding-bottom: max(1.25rem, env(safe-area-inset-bottom)); } }`}} />
    </div>
  );
}