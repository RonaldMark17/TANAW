import React, { useState, useEffect } from 'react';
import { farmersAPI, productsAPI } from '../services/api';
import { 
  ShoppingBasket, Plus, X, Save, Loader2, 
  Scale, Tag, CheckCircle2, AlertCircle, Sprout 
} from 'lucide-react';

export default function FarmerProducts({ farmerId, products = [], onUpdate }) {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [catalog, setCatalog] = useState([]); // List of all available product types (Rice, Corn, etc.)
  const [error, setError] = useState('');

  const initialForm = {
    product_id: '',
    production_volume: '',
    unit: 'kg',
    is_primary: false,
    selling_price: ''
  };

  const [formData, setFormData] = useState(initialForm);

  // Fetch the global product catalog when the component loads
  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const response = await productsAPI.getAll();
        setCatalog(response.data);
      } catch (err) {
        console.error("Failed to load product catalog");
      }
    };
    fetchCatalog();
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!farmerId) return;

    setLoading(true);
    setError('');

    try {
      // Ensure numeric values are sent as numbers
      const payload = {
        ...formData,
        product_id: parseInt(formData.product_id),
        production_volume: parseFloat(formData.production_volume),
        selling_price: parseFloat(formData.selling_price) || 0
      };

      await farmersAPI.addProduct(farmerId, payload);
      setFormData(initialForm);
      setShowModal(false);
      if (onUpdate) onUpdate(); // Refresh the parent view
    } catch (err) {
      console.error(err);
      setError('Failed to add commodity. Ensure all fields are valid.');
    } finally {
      setLoading(false);
    }
  };

  // Guard for "Create Mode"
  if (!farmerId) {
    return (
      <div className="bg-slate-50 border border-slate-100 rounded-[2.5rem] p-8 text-center border-dashed">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
          Production Data Locked
        </p>
        <p className="text-slate-400 text-xs mt-2">
          Save the main profile before assigning production metrics.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white p-10 md:p-12 rounded-[3rem] border border-slate-100 shadow-sm space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-6 pb-2 border-b border-slate-50">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl shadow-inner">
            <ShoppingBasket size={20} />
          </div>
          <div>
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">Production & Yield</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Active Agricultural Outputs</p>
          </div>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="group inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-200 hover:bg-emerald-500 active:scale-95 transition-all"
        >
          <Plus size={14} className="group-hover:rotate-90 transition-transform"/> Add Output
        </button>
      </div>

      {/* Product List */}
      <div className="space-y-4">
        {products.length === 0 ? (
          <div className="p-12 text-center bg-slate-50 rounded-[2rem] border border-slate-100">
            <div className="inline-flex p-4 bg-white rounded-full text-slate-300 mb-4 shadow-sm">
              <Sprout size={24} />
            </div>
            <p className="text-xs font-bold text-slate-400">No production records found.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((item, idx) => (
              <div key={idx} className="relative p-6 bg-slate-50 hover:bg-white border border-slate-100 rounded-[2rem] transition-all hover:shadow-xl group">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-emerald-600 shadow-sm">
                      <Sprout size={18} />
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 text-sm">{item.product_name || 'Unknown Product'}</h4>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                        {item.category || 'Crop'}
                      </span>
                    </div>
                  </div>
                  {item.is_primary && (
                    <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-widest rounded-lg">
                      Primary
                    </span>
                  )}
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                    <span className="text-slate-400 font-bold">Volume</span>
                    <span className="text-slate-900 font-black">{item.production_volume} {item.unit}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
                    <span className="text-slate-400 font-bold">Value</span>
                    <span className="text-slate-900 font-black">₱{Number(item.selling_price || 0).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-8">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-[3rem] shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
            
            <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-white/80 backdrop-blur-xl z-10">
              <div>
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Log Output</h3>
                <p className="text-slate-400 text-xs font-bold mt-1">Record a new production line.</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-3 hover:bg-slate-50 rounded-xl transition-colors text-slate-400">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8 space-y-6 no-scrollbar">
              
              {error && (
                <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl flex items-center gap-3 border border-rose-100">
                  <AlertCircle size={18} />
                  <span className="text-xs font-bold">{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Commodity Type</label>
                <div className="relative">
                  <Tag className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                  <select 
                    name="product_id" 
                    value={formData.product_id} 
                    onChange={handleInputChange}
                    required
                    className="w-full pl-12 pr-6 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold shadow-inner focus:ring-4 focus:ring-emerald-500/10 outline-none appearance-none transition-all"
                  >
                    <option value="">Select from Catalog...</option>
                    {catalog.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.category})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Volume</label>
                  <input type="number" name="production_volume" value={formData.production_volume} onChange={handleInputChange} placeholder="0.00"
                    required className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold shadow-inner focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Unit</label>
                  <select name="unit" value={formData.unit} onChange={handleInputChange}
                    className="w-full px-6 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold shadow-inner focus:ring-4 focus:ring-emerald-500/10 outline-none appearance-none">
                    <option value="kg">Kilograms (kg)</option>
                    <option value="tons">Metric Tons</option>
                    <option value="sacks">Sacks/Bags</option>
                    <option value="pcs">Pieces</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Estimated Value (₱)</label>
                <div className="relative">
                  <Scale className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                  <input type="number" name="selling_price" value={formData.selling_price} onChange={handleInputChange} placeholder="0.00"
                    className="w-full pl-12 pr-6 py-4 bg-slate-50 border-none rounded-2xl text-sm font-bold shadow-inner focus:ring-4 focus:ring-emerald-500/10 outline-none transition-all" />
                </div>
              </div>

              <label className="flex items-center justify-between p-4 bg-emerald-50 rounded-2xl border border-emerald-100 cursor-pointer group">
                <span className="text-xs font-black text-emerald-700 uppercase tracking-wide flex items-center gap-2">
                  <CheckCircle2 size={16} /> Primary Source?
                </span>
                <div className={`w-12 h-7 flex items-center rounded-full p-1 duration-300 ${formData.is_primary ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                  <div className={`bg-white w-5 h-5 rounded-full shadow-md transform duration-300 ${formData.is_primary ? 'translate-x-5' : ''}`} />
                </div>
                <input type="checkbox" name="is_primary" checked={formData.is_primary} onChange={handleInputChange} className="hidden" />
              </label>

            </form>

            <div className="p-8 border-t border-slate-50 bg-slate-50/50 flex justify-end gap-4">
              <button type="button" onClick={() => setShowModal(false)} className="px-8 py-4 text-xs font-black text-slate-400 hover:text-slate-600 uppercase tracking-widest transition-colors">Cancel</button>
              <button 
                onClick={handleSubmit} 
                disabled={loading}
                className="px-10 py-4 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-200 hover:bg-emerald-500 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                <span>Save Record</span>
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}