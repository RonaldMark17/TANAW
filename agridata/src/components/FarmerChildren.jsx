import React, { useState } from 'react';
import { farmersAPI } from '../services/api';
import { 
  Users, Plus, X, Save, Loader2, GraduationCap, 
  Briefcase, Sprout, User, AlertCircle, Edit, Trash2, Heart
} from 'lucide-react';

export default function FarmerChildren({ farmerId, children = [], onUpdate }) {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // --- MODIFICATION ENGINE ---
  const [editingId, setEditingId] = useState(null); 

  const initialForm = {
    name: '',
    age: '',
    gender: 'Male',
    education_level: 'High School',
    current_occupation: '',
    continues_farming: false,
    involvement_level: 'None',
    notes: ''
  };

  const [formData, setFormData] = useState(initialForm);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Switch protocol to Edit Mode and fill form data
  const handleEditClick = (child) => {
    setEditingId(child.id);
    setFormData({
      name: child.name || '',
      age: child.age || '',
      gender: child.gender || 'Male',
      education_level: child.education_level || 'High School',
      current_occupation: child.current_occupation || '',
      continues_farming: child.continues_farming || false,
      involvement_level: child.involvement_level || 'None',
      notes: child.notes || ''
    });
    setShowModal(true);
  };

  // Reset internal states upon closure
  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData(initialForm);
    setError('');
  };

  const handleSubmit = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation(); // Prevent triggering parent form submission
    }
    
    if (!farmerId) return;

    setLoading(true);
    setError('');

    try {
      if (editingId) {
        // PROTOCOL: Update Existing Identity
        await farmersAPI.updateChild(farmerId, editingId, formData);
      } else {
        // PROTOCOL: Create New Identity
        await farmersAPI.addChild(farmerId, formData);
      }
      
      closeModal();
      if (onUpdate) onUpdate(); 
    } catch (err) {
      setError(err.response?.data?.error || 'Registry modification failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteChild = async (childId, name) => {
    if (window.confirm(`Revoke profile for ${name} from registry?`)) {
      try {
        await farmersAPI.deleteChild(farmerId, childId);
        if (onUpdate) onUpdate();
      } catch (err) {
        alert("Deletion protocol failed.");
      }
    }
  };

  // Guard: Locks family section until main profile is saved
  if (!farmerId) {
    return (
      <div className="bg-slate-50 dark:bg-white/[0.02] border border-slate-100 dark:border-white/5 rounded-[2.5rem] p-6 sm:p-8 text-center border-dashed mx-4 sm:mx-0">
        <p className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">Registry Locked</p>
        <p className="text-slate-400 dark:text-slate-500 text-xs mt-2 font-medium">Finalize the primary profile to enable lineage documentation.</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-[#0b241f] p-5 sm:p-10 md:p-12 rounded-3xl sm:rounded-[3rem] border border-slate-100 dark:border-white/5 shadow-sm space-y-6 sm:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 transition-colors">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 sm:gap-6 pb-4 sm:pb-2 border-b border-slate-50 dark:border-white/5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 sm:p-3 bg-rose-50 dark:bg-rose-500/10 text-rose-500 rounded-xl sm:rounded-2xl shadow-inner shrink-0">
            <Users size={20} className="sm:w-[24px] sm:h-[24px]" />
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Family & Succession</h3>
            <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-0.5">Institutional Lineage Registry</p>
          </div>
        </div>
        <button 
          type="button" 
          onClick={() => setShowModal(true)}
          className="w-full sm:w-auto group inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 dark:bg-emerald-600 text-white rounded-xl sm:rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-slate-800 dark:hover:bg-emerald-500 active:scale-95 transition-all"
        >
          <Plus size={14} className="group-hover:rotate-90 transition-transform"/> Append Record
        </button>
      </div>

      {/* DATA LIST GRID */}
      <div className="space-y-4">
        {children.length === 0 ? (
          <div className="py-10 sm:py-12 text-center bg-slate-50 dark:bg-white/[0.02] rounded-2xl sm:rounded-[2rem] border border-slate-100 dark:border-white/5">
            <p className="text-[10px] sm:text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">No lineage records found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {children.map((child, idx) => (
              <div key={idx} className="group relative p-4 sm:p-6 bg-slate-50 dark:bg-white/[0.02] hover:bg-white dark:hover:bg-white/[0.05] border border-slate-100 dark:border-white/5 rounded-2xl sm:rounded-[2rem] transition-all hover:shadow-lg">
                <div className="flex justify-between items-start mb-3 sm:mb-4">
                  <div className="flex items-center gap-3 min-w-0 pr-4">
                    <div className={`h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl flex items-center justify-center font-black text-xs sm:text-sm shadow-inner shrink-0 ${child.gender === 'Female' ? 'bg-rose-100 text-rose-600 dark:bg-rose-500/20' : 'bg-blue-100 text-blue-600 dark:bg-blue-500/20'}`}>
                      {child.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-black text-slate-900 dark:text-white text-xs sm:text-sm tracking-tight truncate">{child.name}</h4>
                      <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">{child.age} Yrs</span>
                    </div>
                  </div>
                  
                  {/* Action Buttons: Visible on mobile, hover-only on desktop */}
                  <div className="flex gap-1.5 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all duration-300">
                    <button 
                        type="button"
                        onClick={() => handleEditClick(child)} 
                        className="p-1.5 sm:p-2 bg-white dark:bg-[#041d18] rounded-lg text-slate-400 hover:text-emerald-500 border border-slate-100 dark:border-white/5 shadow-sm transition-all shrink-0"
                    >
                        <Edit size={12} className="sm:w-[14px] sm:h-[14px]" />
                    </button>
                    <button 
                        type="button"
                        onClick={() => handleDeleteChild(child.id, child.name)} 
                        className="p-1.5 sm:p-2 bg-white dark:bg-[#041d18] rounded-lg text-slate-400 hover:text-rose-500 border border-slate-100 dark:border-white/5 shadow-sm transition-all shrink-0"
                    >
                        <Trash2 size={12} className="sm:w-[14px] sm:h-[14px]" />
                    </button>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-x-2 sm:gap-x-4 text-[10px] sm:text-xs">
                  <div className="flex items-center gap-1.5 sm:gap-2 text-slate-500 dark:text-slate-400 font-bold truncate">
                    <GraduationCap size={12} className="text-slate-300 dark:text-slate-600 shrink-0" />
                    <span className="truncate">{child.education_level}</span>
                  </div>
                  {child.continues_farming && (
                    <div className="flex items-center gap-1.5 sm:gap-2 text-emerald-600 dark:text-emerald-400 font-black uppercase text-[8px] sm:text-[9px] tracking-widest shrink-0"><Sprout size={10} className="shrink-0" /> Successor</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* --- IDENTITY MODAL (Responsive Redesign) --- */}
      {showModal && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-0 sm:p-4 md:p-8 overflow-hidden">
          {/* BACKGROUND OVERLAY */}
          <div 
            className="absolute inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md animate-in fade-in duration-300" 
            onClick={closeModal} 
          />
          
          <div 
            className="relative bg-white dark:bg-[#041d18] rounded-none sm:rounded-[2.5rem] md:rounded-[3rem] shadow-2xl w-full h-full sm:h-auto sm:max-w-2xl sm:max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 duration-300 border-none sm:border dark:border-white/5"
            onClick={(e) => e.stopPropagation()} 
          >
            
            <div className="p-6 sm:p-8 border-b border-slate-50 dark:border-white/5 flex justify-between items-center bg-white/80 dark:bg-[#041d18]/80 backdrop-blur-xl shrink-0 z-10 pt-safe">
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-none">
                  {editingId ? 'Modify Identity' : 'Enroll Identity'}
                </h3>
                <p className="text-slate-400 dark:text-slate-500 text-[10px] sm:text-xs font-bold mt-1 sm:mt-2 uppercase tracking-widest">
                   {editingId ? `Spec Revision: #MOD-${editingId}` : 'Initial Registry Protocol'}
                </p>
              </div>
              <button 
                type="button"
                onClick={closeModal} 
                className="p-2 sm:p-3 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl sm:rounded-2xl text-slate-400 dark:text-slate-500 transition-all shrink-0"
              >
                <X size={20} className="sm:w-[24px] sm:h-[24px]" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 sm:space-y-8 no-scrollbar pb-safe">
              
              {error && (
                <div className="p-4 bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-xl sm:rounded-2xl flex items-center gap-3 border border-rose-100 dark:border-rose-500/20">
                  <AlertCircle size={16} className="shrink-0" />
                  <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest">{error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                <div className="md:col-span-2 space-y-1.5 sm:space-y-2">
                  <label className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Legal Full Name</label>
                  <div className="relative">
                    <User size={14} className="absolute left-4 sm:left-5 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600 sm:w-[16px] sm:h-[16px]" />
                    <input required type="text" name="name" value={formData.name} onChange={handleInputChange}
                      className="w-full pl-10 sm:pl-12 pr-4 sm:pr-6 py-3.5 sm:py-4 bg-slate-50 dark:bg-white/5 border-none rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold dark:text-white shadow-inner focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all" />
                  </div>
                </div>

                <div className="space-y-1.5 sm:space-y-2">
                  <label className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Current Age</label>
                  <input required type="number" name="age" value={formData.age} onChange={handleInputChange}
                    className="w-full px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-50 dark:bg-white/5 border-none rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold dark:text-white shadow-inner focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all" />
                </div>

                <div className="space-y-1.5 sm:space-y-2">
                  <label className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Gender</label>
                  <select name="gender" value={formData.gender} onChange={handleInputChange}
                    className="w-full px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-50 dark:bg-white/5 border-none rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold dark:text-white shadow-inner focus:ring-4 focus:ring-emerald-500/10 outline-none appearance-none cursor-pointer">
                    <option value="Male">Male</option><option value="Female">Female</option>
                  </select>
                </div>

                <div className="space-y-1.5 sm:space-y-2">
                  <label className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Academic Cycle</label>
                  <select name="education_level" value={formData.education_level} onChange={handleInputChange}
                    className="w-full px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-50 dark:bg-white/5 border-none rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold dark:text-white shadow-inner focus:ring-4 focus:ring-emerald-500/10 outline-none appearance-none cursor-pointer">
                    <option value="Elementary">Elementary Cycle</option>
                    <option value="High School">High School Diploma</option>
                    <option value="College">Academic Degree</option>
                    <option value="Vocational">Vocational Certificate</option>
                    <option value="None">None</option>
                  </select>
                </div>

                <div className="space-y-1.5 sm:space-y-2">
                  <label className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Primary Occupation</label>
                  <input type="text" name="current_occupation" value={formData.current_occupation} onChange={handleInputChange} placeholder="e.g. Student, Labor"
                    className="w-full px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-50 dark:bg-white/5 border-none rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold dark:text-white shadow-inner focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all" />
                </div>
              </div>

              {/* SUCCESSION PROTOCOL */}
              <div className="p-5 sm:p-6 bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl sm:rounded-3xl border border-emerald-100 dark:border-white/5 space-y-4 sm:space-y-6">
                <div className="flex items-center gap-2 sm:gap-3 text-emerald-800 dark:text-emerald-400 border-b border-emerald-100/50 dark:border-white/5 pb-2">
                  <Sprout size={16} className="sm:w-[18px] sm:h-[18px]" />
                  <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest">Succession Protocol</span>
                </div>
                
                <label className="flex items-center justify-between cursor-pointer group">
                  <span className="text-[11px] sm:text-xs font-bold text-emerald-700 dark:text-emerald-500/80">Labor Continuity Eligibility?</span>
                  <div className={`w-10 h-6 sm:w-12 sm:h-7 flex items-center rounded-full p-1 duration-300 transition-colors ${formData.continues_farming ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-white/10'}`}>
                    <div className={`bg-white dark:bg-slate-200 w-4 h-4 sm:w-5 sm:h-5 rounded-full shadow-md transform duration-300 ${formData.continues_farming ? 'translate-x-4 sm:translate-x-5' : ''}`} />
                  </div>
                  <input type="checkbox" name="continues_farming" checked={formData.continues_farming} onChange={handleInputChange} className="hidden" />
                </label>

                {formData.continues_farming && (
                  <div className="animate-in fade-in slide-in-from-top-2 pt-2">
                    <label className="text-[8px] sm:text-[10px] font-black text-emerald-600 dark:text-emerald-400/60 uppercase tracking-widest ml-1 mb-2 block">Intensity</label>
                    <select name="involvement_level" value={formData.involvement_level} onChange={handleInputChange}
                      className="w-full px-4 sm:px-6 py-2.5 sm:py-3 bg-white dark:bg-[#0b241f] border-none rounded-xl text-xs sm:text-sm font-bold shadow-sm outline-none text-emerald-800 dark:text-emerald-200 cursor-pointer">
                      <option value="High">High - Direct Labor</option>
                      <option value="Moderate">Moderate - Part-time</option>
                      <option value="Low">Low - Seasonal Only</option>
                    </select>
                  </div>
                )}
              </div>
            </form>

            <div className="p-6 sm:p-8 border-t border-slate-50 dark:border-white/5 bg-slate-50/50 dark:bg-black/20 flex flex-col-reverse sm:flex-row justify-end gap-3 sm:gap-4 shrink-0 pb-safe">
              <button 
                type="button" 
                onClick={closeModal} 
                className="w-full sm:w-auto px-8 py-3.5 sm:py-4 text-[10px] sm:text-xs font-black text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 uppercase tracking-widest transition-colors text-center"
              >
                Abort
              </button>
              <button 
                type="submit" 
                onClick={handleSubmit} 
                disabled={loading}
                className="w-full sm:w-auto px-8 sm:px-10 py-3.5 sm:py-4 bg-emerald-600 dark:bg-emerald-600 text-white rounded-xl sm:rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-widest shadow-xl hover:bg-emerald-500 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                <span>{editingId ? 'Update Record' : 'Commit Entry'}</span>
              </button>
            </div>

          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; } 
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        @supports (padding-top: env(safe-area-inset-top)) {
          .pt-safe { padding-top: max(1rem, env(safe-area-inset-top)); }
          .pb-safe { padding-bottom: max(1rem, env(safe-area-inset-bottom)); }
        }
      `}} />
    </div>
  );
}