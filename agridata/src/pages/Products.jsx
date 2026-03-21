import React, { useState, useEffect } from 'react';
import { productsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Plus, X, Search, Filter, Wheat,
  Dog, Bird, Fish, Trees, Box, Info, Activity, ChevronRight, Loader2,
  Edit, Trash2, Download, Eye, ArrowUpDown, AlertCircle, Save,
  Wrench, Tractor // Added new icons for Tools and Vehicles
} from 'lucide-react';

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

// --- Compact Skeleton Component ---
const ProductSkeleton = () => (
  <div className="space-y-8 animate-pulse">
    <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3 sm:gap-6 px-4 sm:px-0">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="h-28 sm:h-40 bg-white dark:bg-[#0b241f] rounded-2xl sm:rounded-[2rem] border border-slate-100 dark:border-white/5 p-3 sm:p-6 space-y-3">
          <div className="w-8 h-8 sm:w-12 sm:h-12 bg-slate-100 dark:bg-white/5 rounded-lg sm:rounded-2xl mx-auto"></div>
          <div className="h-2 w-10 sm:w-16 bg-slate-50 dark:bg-white/5 rounded-full mx-auto"></div>
          <div className="h-4 w-6 sm:w-10 bg-slate-100 dark:bg-white/5 rounded-md mx-auto"></div>
        </div>
      ))}
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-8 px-4 sm:px-0">
      {[...Array(8)].map((_, i) => (
        <div key={i} className="bg-white dark:bg-[#0b241f] rounded-2xl sm:rounded-[2.5rem] border border-slate-100 dark:border-white/5 p-5 sm:p-8 h-56 sm:h-72 space-y-4">
          <div className="flex justify-between">
            <div className="h-10 w-10 sm:h-14 sm:w-14 bg-slate-100 dark:bg-white/5 rounded-xl"></div>
            <div className="h-4 w-16 bg-slate-50 dark:bg-white/5 rounded-full"></div>
          </div>
          <div className="h-4 w-3/4 bg-slate-100 dark:bg-white/5 rounded-lg"></div>
          <div className="space-y-2">
            <div className="h-2 w-full bg-slate-50 dark:bg-white/5 rounded-full"></div>
            <div className="h-2 w-5/6 bg-slate-50 dark:bg-white/5 rounded-full"></div>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);

  const [editingProduct, setEditingProduct] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [filterCategory, setFilterCategory] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('asc');
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState('');

  const { hasPermission } = useAuth();
  const canManage = hasPermission(['admin', 'researcher']);

  const initialForm = { name: '', category: 'Crops', description: '' };
  const [formData, setFormData] = useState(initialForm);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const response = await productsAPI.getAll();
      setProducts(response.data);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setTimeout(() => setLoading(false), 800);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      if (editingProduct) {
        await productsAPI.update(editingProduct.id, formData);
      } else {
        await productsAPI.create(formData);
      }
      closeModal();
      fetchProducts();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to save commodity.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Archive this commodity/asset?")) {
      try {
        await productsAPI.delete(id);
        setProducts(prev => prev.filter(p => p.id !== id));
      } catch (err) {
        alert(err.response?.data?.error || "Cannot delete asset.");
      }
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({ name: product.name, category: product.category, description: product.description || '' });
    setShowModal(true);
  };

  const handleView = (product) => {
    setSelectedProduct(product);
    setShowViewModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setShowViewModal(false);
    setEditingProduct(null);
    setSelectedProduct(null);
    setFormData(initialForm);
    setError('');
  };

  const handleExport = () => {
    setIsExporting(true);
    const headers = ["ID", "Name", "Category", "Description"];
    const rows = products.map(p => [p.id, `"${p.name}"`, p.category, `"${p.description}"`]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `assets_registry_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.remove();
    setTimeout(() => setIsExporting(false), 800);
  };

  const filteredProducts = products
    .filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = !filterCategory || p.category === filterCategory;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => sortOrder === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name));

  const categories = [...new Set(products.map(p => p.category))];

  // Updated to include Equipment/Tools and Vehicles/Machinery
  const categoryMap = {
    'Crops': { icon: Wheat, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10', active: 'bg-emerald-500', shadow: 'shadow-emerald-200' },
    'Livestock': { icon: Dog, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10', active: 'bg-amber-500', shadow: 'shadow-amber-200' },
    'Poultry': { icon: Bird, color: 'text-orange-600 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-500/10', active: 'bg-orange-500', shadow: 'shadow-orange-200' },
    'Fishery': { icon: Fish, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-500/10', active: 'bg-blue-500', shadow: 'shadow-blue-200' },
    'Forestry': { icon: Trees, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-500/10', active: 'bg-green-500', shadow: 'shadow-green-200' },
    'Equipment/Tools': { icon: Wrench, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-500/10', active: 'bg-indigo-500', shadow: 'shadow-indigo-200' },
    'Vehicles/Machinery': { icon: Tractor, color: 'text-cyan-600 dark:text-cyan-400', bg: 'bg-cyan-50 dark:bg-cyan-500/10', active: 'bg-cyan-500', shadow: 'shadow-cyan-200' },
    'Other': { icon: Box, color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-50 dark:bg-white/5', active: 'bg-slate-500', shadow: 'shadow-slate-200' }
  };

  const getTheme = (cat) => categoryMap[cat] || categoryMap['Other'];

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#020c0a] font-sans transition-colors duration-300 pb-20 relative overflow-x-hidden">
      <div className="max-w-[1400px] mx-auto space-y-6 sm:space-y-10 animate-in fade-in duration-700">

        {/* Compact Header */}
        <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 px-4 pt-4 sm:pt-8">
          <div>
            <div className="flex items-center gap-2 mb-1.5 sm:mb-4">
              <div className="p-1.5 bg-emerald-600 rounded-lg text-white shadow-lg shrink-0">
                <Activity size={16} />
              </div>
              <span className="text-[9px] sm:text-xs font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-widest">Asset & Supply Registry</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Commodities & Assets</h1>
            <p className="hidden sm:block text-slate-500 dark:text-slate-400 font-medium mt-1">Centralized database for agricultural outputs and farming equipment.</p>
          </div>

          <div className="flex gap-2 w-full lg:w-auto">
            <button 
              onClick={handleExport}
              disabled={isExporting}
              className="w-full sm:w-auto flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-3.5 sm:py-4 bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl sm:rounded-[1.25rem] font-black text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all shadow-sm"
            >
                {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                <span>Export CSV</span>
            </button>
            {canManage && (
              <button onClick={() => setShowModal(true)}
                className="w-full sm:w-auto flex-1 lg:flex-none group flex items-center justify-center gap-2 sm:gap-3 px-8 py-3.5 sm:py-4 bg-slate-900 dark:bg-emerald-600 text-white rounded-xl sm:rounded-[1.25rem] font-black text-[10px] sm:text-xs uppercase tracking-widest shadow-xl sm:shadow-2xl shadow-slate-200 dark:shadow-none hover:bg-slate-800 dark:hover:bg-emerald-500 active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5 group-hover:rotate-90 transition-transform duration-300" />
                <span>Add New</span>
              </button>
            )}
          </div>
        </header>

        {loading ? (
          <div className="px-4"><ProductSkeleton /></div>
        ) : (
          <>
            {/* Shrunk Category Grid - Updated for 8 items */}
            <div className="px-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-2 sm:gap-4">
                {Object.entries(categoryMap).map(([name, theme]) => {
                  const count = products.filter(p => p.category === name).length;
                  const isActive = filterCategory === name;
                  const Icon = theme.icon;

                  return (
                    <button
                      key={name}
                      onClick={() => setFilterCategory(isActive ? '' : name)}
                      className={`min-w-0 p-3 sm:p-5 rounded-2xl sm:rounded-[2rem] border transition-all duration-300 text-center flex flex-col items-center group
                        ${isActive
                          ? `${theme.bg} border-transparent shadow-md -translate-y-1`
                          : 'bg-white dark:bg-[#0b241f] border-slate-100 dark:border-white/5 hover:border-slate-300 shadow-sm'}`}
                    >
                      <div className={`p-2.5 sm:p-3.5 rounded-xl sm:rounded-2xl mb-2 sm:mb-3 transition-all duration-300 ${isActive ? `${theme.active} text-white scale-105` : `${theme.bg} ${theme.color}`}`}>
                        <Icon size={18} className="sm:w-[24px] sm:h-[24px]" />
                      </div>
                      <span className={`text-[7px] sm:text-[9px] font-black uppercase tracking-widest mb-0.5 ${isActive ? theme.color : 'text-slate-400 dark:text-slate-500'}`}>{name}</span>
                      <span className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white tracking-tighter">
                        <AnimatedCounter value={count} duration={1000} />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Shrunk Toolbar */}
            <div className="px-4 flex flex-col md:flex-row gap-2 sm:gap-4">
              <div className="bg-white dark:bg-[#0b241f] rounded-xl sm:rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-sm p-1 flex flex-col sm:flex-row items-center flex-1 gap-1">
                <div className="relative flex-1 w-full">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input type="text" className="w-full pl-10 pr-4 py-2.5 sm:py-4 bg-slate-50 dark:bg-white/5 border-none rounded-lg sm:rounded-2xl text-xs sm:text-sm font-bold dark:text-white outline-none" placeholder="Search entries..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <div className="relative w-full md:w-56">
                  <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <select className="w-full pl-10 pr-8 py-2.5 sm:py-4 bg-slate-50 dark:bg-white/5 border-none rounded-lg sm:rounded-2xl text-[10px] sm:text-sm font-bold dark:text-white appearance-none outline-none" value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}>
                    <option value="">All Categories</option>
                    {categories.map(cat => <option key={cat} value={cat} className="dark:bg-[#0b241f]">{cat}</option>)}
                  </select>
                </div>
              </div>
              <button onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')} className="self-end sm:self-center bg-white dark:bg-[#0b241f] p-2.5 sm:p-4 rounded-xl border border-slate-100 dark:border-white/5 shadow-sm text-slate-400 shrink-0">
                <ArrowUpDown size={16} className={sortOrder === 'desc' ? 'rotate-180 transition-transform' : 'transition-transform'} />
              </button>
            </div>

            {/* Shrunk Grid Cards */}
            <div className="px-4">
              {filteredProducts.length === 0 ? (
                <div className="py-20 bg-white dark:bg-[#0b241f] rounded-3xl border-2 border-dashed border-slate-100 dark:border-white/10 text-center">
                  <Box size={32} className="mx-auto text-slate-200 mb-4" />
                  <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase">Empty Registry</h3>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-8">
                  {filteredProducts.map((product) => {
                    const theme = getTheme(product.category);
                    return (
                      <div key={product.id} className="group bg-white dark:bg-[#0b241f] rounded-2xl sm:rounded-[2.5rem] p-5 sm:p-8 border border-slate-100 dark:border-white/5 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col relative overflow-hidden h-full">
                        <div className="absolute top-4 right-4 flex gap-1.5 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleView(product)} className="p-1.5 bg-white dark:bg-black/40 rounded-lg text-slate-400 border border-slate-100 dark:border-white/10"><Eye size={14} /></button>
                          {canManage && (
                            <>
                              <button onClick={() => handleEdit(product)} className="p-1.5 bg-white dark:bg-black/40 rounded-lg text-slate-400 border border-slate-100 dark:border-white/10"><Edit size={14} /></button>
                              <button onClick={() => handleDelete(product.id)} className="p-1.5 bg-white dark:bg-black/40 rounded-lg text-slate-400 border border-slate-100 dark:border-white/10"><Trash2 size={14} /></button>
                            </>
                          )}
                        </div>
                        <div className="flex justify-between items-start mb-4 sm:mb-8 mt-4 lg:mt-0">
                          <div className={`p-3 rounded-xl ${theme.bg} ${theme.color} shadow-inner`}>
                            <theme.icon size={20} className="sm:w-[24px] sm:h-[24px]" />
                          </div>
                          <span className={`px-2.5 py-1 rounded-lg text-[7px] sm:text-[9px] font-black uppercase tracking-widest border ${theme.bg} ${theme.color} border-slate-100 dark:border-white/5`}>{product.category}</span>
                        </div>
                        <h3 className="text-base sm:text-xl font-black text-slate-900 dark:text-white mb-2 leading-tight uppercase truncate">{product.name}</h3>
                        <p className="text-[10px] sm:text-sm font-medium text-slate-400 dark:text-slate-500 line-clamp-2 leading-relaxed flex-grow">"{product.description || 'No background information.'}"</p>
                        <div className="pt-4 mt-4 border-t border-slate-50 dark:border-white/5 flex items-center justify-between">
                          <span className="text-[8px] sm:text-[10px] font-black uppercase text-slate-300">ID: {product.id}</span>
                          <div onClick={() => handleView(product)} className="p-1.5 bg-slate-50 dark:bg-white/5 rounded-full text-slate-400 cursor-pointer"><ChevronRight size={14} /></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* Shrunk View Modal */}
        {showViewModal && selectedProduct && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 overflow-hidden">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={closeModal} />
            <div className="relative bg-white dark:bg-[#041d18] rounded-3xl shadow-2xl w-full max-w-sm flex flex-col overflow-hidden animate-in zoom-in-95 border dark:border-white/5">
              <div className="p-5 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-black/20">
                <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest">Asset View</h3>
                <button onClick={closeModal} className="p-1.5 text-slate-400"><X size={18} /></button>
              </div>
              <div className="p-6 space-y-4 text-center">
                <div className={`p-4 ${getTheme(selectedProduct.category).bg} ${getTheme(selectedProduct.category).color} rounded-2xl w-16 h-16 mx-auto flex items-center justify-center mb-2`}>
                  {React.createElement(getTheme(selectedProduct.category).icon, { size: 32 })}
                </div>
                <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase">{selectedProduct.name}</h2>
                <p className="text-xs text-slate-500 dark:text-slate-300 leading-relaxed bg-slate-50 dark:bg-white/5 p-4 rounded-xl">{selectedProduct.description || "No description provided."}</p>
              </div>
            </div>
          </div>
        )}

        {/* Create / Edit Form Modal */}
        {showModal && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-0 sm:p-4 overflow-hidden">
            <div className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-md" onClick={closeModal} />
            <div className="relative bg-white dark:bg-[#041d18] rounded-none sm:rounded-3xl shadow-2xl w-full h-full sm:h-auto sm:max-w-lg flex flex-col animate-in slide-in-from-bottom-10 border dark:border-white/5">
              <div className="p-5 border-b border-slate-50 dark:border-white/5 flex items-center justify-between pt-safe">
                <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">{editingProduct ? 'Edit Asset' : 'Register New Asset'}</h2>
                <button onClick={closeModal} className="p-2 text-slate-400 hover:text-slate-700 transition-colors"><X size={20} /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-6 space-y-6 flex-1 overflow-y-auto pb-safe">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Asset Name</label>
                  <input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border-none rounded-xl text-sm font-bold dark:text-white outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all" placeholder="e.g., Kubota Tractor, Mango..." />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Classification</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {['Crops', 'Livestock', 'Poultry', 'Fishery', 'Forestry', 'Equipment/Tools', 'Vehicles/Machinery', 'Other'].map(cat => (
                      <button 
                        key={cat} 
                        type="button" 
                        onClick={() => setFormData({ ...formData, category: cat })} 
                        className={`py-2 px-1 rounded-lg text-[9px] font-black uppercase transition-all ${formData.category === cat ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-50 dark:bg-white/5 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10'}`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Specifications / Notes</label>
                  <textarea rows={4} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="w-full px-4 py-3 bg-slate-50 dark:bg-white/5 border-none rounded-xl text-sm font-medium dark:text-slate-200 outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all" placeholder="Details about this asset..." />
                </div>
                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={closeModal} className="flex-1 py-3.5 text-[10px] font-black uppercase bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors text-slate-500 rounded-xl tracking-widest">Abort</button>
                  <button type="submit" disabled={submitting} className="flex-[2] py-3.5 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-emerald-500 active:scale-95 transition-all flex items-center justify-center gap-2">
                    {submitting ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} <span>Save Record</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
      <style dangerouslySetInnerHTML={{
        __html: `
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