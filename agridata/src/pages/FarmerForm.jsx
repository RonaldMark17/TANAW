import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { farmersAPI, barangaysAPI, organizationsAPI, productsAPI } from '../services/api';
import {
  Save, X, Upload, Sprout, MapPin, User,
  Calendar, Phone, DollarSign, Ruler, Trash2,
  Plus, Loader2, ChevronLeft, AlertCircle, Fingerprint, Globe, Briefcase, GraduationCap, Building2, Hash, FileText
} from 'lucide-react';
import FarmerChildren from '../components/FarmerChildren';
import { db } from '../db';

const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

// 1. Uses VITE_API_URL from your .env file if it exists.
// 2. If not, and you are working locally, it uses your local backend (8080).
// 3. If you are on the live site, it uses your hosted domain.
const API_BASE_URL = (
  import.meta.env.VITE_API_URL || 
  (isLocal ? 'http://127.0.0.1:8080' : 'https://TANAW.ct.ws')
).replace(/\/api\/?$/, '');

export default function FarmerForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(isEditMode);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [barangays, setBarangays] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [availableProducts, setAvailableProducts] = useState([]);

  const [error, setError] = useState('');
  const [imagePreview, setImagePreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const [formData, setFormData] = useState({
    farmer_code: '',
    first_name: '',
    last_name: '',
    middle_name: '',
    extension_name: '',
    birth_date: '',
    gender: 'Male',
    civil_status: 'Single',
    barangay_id: '',
    organization_id: '',
    address: '',
    contact_number: '',
    education_level: 'High School Graduate',
    primary_occupation: 'Farming',
    years_farming: 0,
    farm_size_hectares: 0,
    land_ownership: 'Owner',
    annual_income: 0,
    income_source: 'Farming',
    profile_image: null,
    products: [],
    children: [],
    number_of_children: 0,
    children_farming_involvement: false
  });

  const [calculatedAge, setCalculatedAge] = useState(0);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    fetchDropdowns();
    if (isEditMode) {
      fetchFarmerDetails();
    } else {
      generateFarmerCode();
    }
  }, [id]);

  useEffect(() => {
    if (formData.birth_date) {
      const birthDate = new Date(formData.birth_date);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      setCalculatedAge(age >= 0 ? age : 0);
    }
  }, [formData.birth_date]);

  useEffect(() => {
    if (isEditMode && formData.children) {
      const calculatedChildrenCount = formData.children.length;
      const calculatedInvolvement = formData.children.some(
        c => c.continues_farming === true || c.continues_farming === 1 || String(c.continues_farming) === 'true'
      );

      if (formData.number_of_children !== calculatedChildrenCount || formData.children_farming_involvement !== calculatedInvolvement) {
        setFormData(prev => ({
          ...prev,
          number_of_children: calculatedChildrenCount,
          children_farming_involvement: calculatedInvolvement
        }));

        const patchAggregatesToDB = async () => {
          try {
            const syncData = new FormData();
            syncData.append('number_of_children', calculatedChildrenCount);
            syncData.append('children_farming_involvement', calculatedInvolvement);
            await farmersAPI.update(id, syncData);
          } catch (err) {
            console.error("Failed to auto-sync children metrics to DB", err);
          }
        };
        patchAggregatesToDB();
      }
    }
  }, [formData.children, isEditMode, id, formData.number_of_children, formData.children_farming_involvement]);

  const generateFarmerCode = () => {
    const random = Math.floor(1000 + Math.random() * 9000);
    const year = new Date().getFullYear();
    setFormData(prev => ({ ...prev, farmer_code: `FRM-${year}-${random}` }));
  };

  const fetchDropdowns = async () => {
    try {
      const [bRes, oRes, pRes] = await Promise.all([
        barangaysAPI.getAll(),
        organizationsAPI.getAll(),
        productsAPI.getAll()
      ]);
      setBarangays(bRes.data);
      setOrganizations(oRes.data);
      setAvailableProducts(pRes.data);
    } catch (err) { console.error("Dropdown Error:", err); }
  };

  const fetchFarmerDetails = async () => {
    try {
      const response = await farmersAPI.getById(id);
      const data = response.data;

      const getImageUrl = (path) => {
        if (!path) return null;
        if (path.startsWith('http')) return path.replace(/^http:\/\//i, 'https://');

        const cleanPath = path.replace(/^\/+/, '').replace(/^static\/uploads\//, '');
        const url = `${API_BASE_URL}/static/uploads/${cleanPath}`;
        return (window.location.protocol === 'https:' && url.startsWith('http://'))
          ? url.replace('http://', 'https://')
          : url;
      };

      if (data.profile_image) {
        setImagePreview(getImageUrl(data.profile_image));
      } else {
        const localImage = await db.farmerImages.get(String(id));
        if (localImage?.blob) {
          setImagePreview(URL.createObjectURL(localImage.blob));
        }
      }

      setFormData({
        ...data,
        barangay_id: data.barangay?.id || data.barangay_id || '',
        organization_id: data.organization?.id || data.organization_id || '',
        products: data.products || [],
        children: data.children || [],
        profile_image: data.profile_image || null
      });
    } catch (err) { setError('Could not load details.'); }
    finally { setInitialLoading(false); }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setHasUnsavedChanges(true);
  };

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => setIsDragging(false);
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      processFile(file);
    } else {
      alert("Please drop a valid image file.");
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) processFile(file);
  };

  const processFile = (file) => {
    setFormData(prev => ({ ...prev, profile_image: file }));
    setImagePreview(URL.createObjectURL(file));
    setHasUnsavedChanges(true);
  };

  const predictCategory = (name) => {
    if (!name) return 'Others';
    const lowerName = name.toLowerCase();
    const poultryLivestock = ['goat', 'pig', 'cow', 'chicken', 'duck', 'swine', 'cattle', 'carabao', 'sheep', 'quail', 'turkey', 'pork', 'beef', 'poultry', 'livestock'];
    const fishery = ['fish', 'tilapia', 'bangus', 'shrimp', 'crab', 'seaweed', 'oyster', 'mussel', 'aquaculture'];
    const crops = ['rice', 'corn', 'coconut', 'coffee', 'cacao', 'mango', 'banana', 'tomato', 'onion', 'garlic', 'cabbage', 'lettuce', 'crop', 'vegetable', 'fruit', 'wheat', 'soy', 'root', 'tuber'];
    if (poultryLivestock.some(k => lowerName.includes(k))) return 'Poultry';
    if (fishery.some(k => lowerName.includes(k))) return 'Fishery';
    if (crops.some(k => lowerName.includes(k))) return 'Crop';
    return 'Others';
  };

  const addProduct = () => {
    setFormData(prev => ({
      ...prev,
      products: [...prev.products, { product_name: '', is_primary: false, production_volume: 0, unit: 'kg', _isOthers: false, category: '' }]
    }));
    setHasUnsavedChanges(true);
  };

  const removeProduct = (index) => {
    setFormData(prev => {
      const newProducts = [...prev.products];
      newProducts.splice(index, 1);
      return { ...prev, products: newProducts };
    });
    setHasUnsavedChanges(true);
  };

  const handleProductSelect = (index, value) => {
    setFormData(prev => {
      const newProducts = [...prev.products];
      if (value === 'Others') {
        newProducts[index]._isOthers = true;
        newProducts[index].product_name = '';
        newProducts[index].category = 'Others';
      } else {
        const selectedProd = availableProducts.find(ap => ap.name === value);
        newProducts[index]._isOthers = false;
        newProducts[index].product_name = value;
        newProducts[index].category = selectedProd ? selectedProd.category : 'Crop';
      }
      return { ...prev, products: newProducts };
    });
    setHasUnsavedChanges(true);
  };

  const handleProductChange = (index, field, value) => {
    setFormData(prev => {
      const newProducts = [...prev.products];
      newProducts[index][field] = value;
      if (field === 'product_name' && newProducts[index]._isOthers) {
        newProducts[index].category = predictCategory(value);
      }
      return { ...prev, products: newProducts };
    });
    setHasUnsavedChanges(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (!formData.first_name || !formData.last_name || !formData.barangay_id) {
      setError("Please fill in all required fields (Name, Surname, Barangay).");
      setLoading(false);
      window.scrollTo(0, 0);
      return;
    }

    // --- CLOUDINARY UPLOAD LOGIC ---
    let finalImageUrl = formData.profile_image;

    if (formData.profile_image instanceof File) {
      try {
        const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'dui4heq6v';
        const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'static';

        const cloudData = new FormData();
        cloudData.append('file', formData.profile_image);
        cloudData.append('upload_preset', uploadPreset);

        const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: 'POST',
          body: cloudData
        });

        const cloudJson = await uploadRes.json();

        if (!uploadRes.ok) {
          throw new Error(cloudJson.error?.message || "Cloudinary rejected the upload.");
        }

        if (cloudJson.secure_url) {
          finalImageUrl = cloudJson.secure_url;
        }
      } catch (err) {
        setError(`Cloud Error: ${err.message}`);
        setLoading(false);
        window.scrollTo(0, 0);
        return;
      }
    }

    try {
      const data = new FormData();
      Object.keys(formData).forEach(key => {
        if (key === 'products') {
          const cleanProducts = formData.products.map(({ _isOthers, ...rest }) => rest);
          data.append('products', JSON.stringify(cleanProducts));
        } else if (key === 'children') {
          // Handled by child component
        } else if (key === 'profile_image') {
          if (finalImageUrl) {
            data.append('profile_image', finalImageUrl);
          }
        } else if (key === 'age') {
          data.append('age', calculatedAge);
        } else if (formData[key] !== null && formData[key] !== undefined) {
          data.append(key, formData[key]);
        }
      });

      let response;
      if (isEditMode) {
        response = await farmersAPI.update(id, data);
      } else {
        response = await farmersAPI.create(data);
      }

      // --- Save to Frontend Local Storage (IndexedDB) ---
      const savedFarmerId = isEditMode ? id : response.data.id;
      if (formData.profile_image instanceof File && savedFarmerId) {
        try {
          await db.farmerImages.put({
            id: String(savedFarmerId),
            blob: formData.profile_image
          });
        } catch (dbErr) {
          console.error("Local storage failed", dbErr);
        }
      }

      setHasUnsavedChanges(false);
      navigate('/farmers');

    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Submission failed.');
      window.scrollTo(0, 0);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center dark:bg-[#020c0a] rounded-[3rem]">
        <Loader2 className="animate-spin text-emerald-600 mb-4" size={40} />
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#020c0a] font-sans selection:bg-emerald-100 pb-20 transition-colors duration-300">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8 sm:space-y-12 animate-in fade-in duration-700">

        {/* HEADER */}
        <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 sm:gap-8">
          <div>
            <div className="flex items-center gap-2 sm:gap-3 mb-3 sm:mb-4">
              <Link to="/farmers" className="p-2 sm:p-2.5 bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl text-slate-400 hover:text-emerald-600 transition-all shadow-sm">
                <ChevronLeft size={18} className="sm:w-[20px] sm:h-[20px]" />
              </Link>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <div className="p-1.5 bg-emerald-600 rounded-lg text-white shadow-lg shadow-emerald-200 dark:shadow-none">
                  <Fingerprint size={14} className="sm:w-[16px] sm:h-[16px]" />
                </div>
                <span className="text-[9px] sm:text-[10px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-[0.3em]">Profile Info</span>
              </div>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase">
              {isEditMode ? 'Update Farmer' : 'Add New Farmer'}
            </h1>
            <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 font-medium mt-1 sm:mt-2">Enter the farmer's personal and farm details here.</p>
          </div>
        </header>

        {error && (
          <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 text-rose-600 dark:text-rose-400 p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2rem] flex items-center gap-3 sm:gap-4 shadow-sm animate-in slide-in-from-top-4">
            <AlertCircle size={20} className="sm:w-[24px] sm:h-[24px] shrink-0" />
            <span className="font-bold text-xs sm:text-sm tracking-tight uppercase tracking-widest leading-relaxed">{error}</span>
          </div>
        )}

        <div className="space-y-6 sm:space-y-10">

          <form id="farmer-profile-form" onSubmit={handleSubmit} className="space-y-6 sm:space-y-10">
            {/* SECTION 1: IDENTITY */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8">
              <div className="lg:col-span-4 space-y-6 sm:space-y-8">
                {/* IMAGE UPLOAD WITH DRAG & DROP */}
                <div
                  className={`bg-white dark:bg-[#0b241f] p-6 sm:p-10 rounded-[2rem] sm:rounded-[3rem] border shadow-sm flex flex-col items-center text-center relative overflow-hidden group transition-all duration-300
                  ${isDragging ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 border-dashed' : 'border-slate-100 dark:border-white/5'}`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  <div className="relative z-10">
                    <div className="relative group w-32 h-32 sm:w-44 sm:h-44 mb-4 sm:mb-6 mx-auto" onClick={() => fileInputRef.current.click()}>
                      <div className={`w-full h-full rounded-[2.5rem] sm:rounded-[3.5rem] overflow-hidden border-[6px] sm:border-8 border-slate-50 dark:border-[#020c0a] shadow-inner flex items-center justify-center bg-slate-100 dark:bg-[#020c0a] transition-all duration-500 group-hover:scale-105 cursor-pointer ${!imagePreview ? 'border-dashed border-slate-200 dark:border-white/10' : ''}`}>
                        {imagePreview ? (
                          <img
                            src={imagePreview}
                            alt="Preview"
                            className="w-full h-full object-cover"
                            // FIXED: Only use anonymous mode for Cloudinary URLs. 
                            // This stops InfinityFree from blocking the image on localhost.
                            crossOrigin={imagePreview.includes('cloudinary.com') ? "anonymous" : undefined}
                            onError={async (e) => {
                              // If live URL fails (CORS or Offline), try the local vault fallback
                              if (id) {
                                try {
                                  const localImage = await db.farmerImages.get(String(id));
                                  if (localImage?.blob) {
                                    e.target.src = URL.createObjectURL(localImage.blob);
                                    return;
                                  }
                                } catch (err) {
                                  console.error("Vault fallback failed", err);
                                }
                              }
                              // If all fails, hide the broken icon
                              e.target.style.display = 'none';
                            }}
                          />
                        ) : (
                          <User size={48} className="sm:w-[64px] sm:h-[64px] text-slate-300 dark:text-slate-700" />
                        )}
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center bg-slate-900/60 text-white opacity-0 group-hover:opacity-100 rounded-[2.5rem] sm:rounded-[3.5rem] cursor-pointer transition-all duration-300 backdrop-blur-sm pointer-events-none">
                        <Upload size={24} className="sm:w-[28px] sm:h-[28px]" />
                      </div>
                    </div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageChange}
                    />
                    <p className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Profile Picture</p>
                    <p className="text-[9px] sm:text-[10px] text-slate-300 mt-1 sm:mt-2">Drag image here or click to upload</p>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-8 bg-white dark:bg-[#0b241f] p-6 sm:p-10 md:p-12 rounded-[2rem] sm:rounded-[3rem] border border-slate-100 dark:border-white/5 shadow-sm space-y-6 sm:space-y-10 relative overflow-hidden">
                <div className="flex items-center gap-3 relative z-10">
                  <div className="p-2 sm:p-3 bg-slate-50 dark:bg-white/5 rounded-xl sm:rounded-2xl text-slate-400 dark:text-slate-500 shadow-inner"><User size={18} className="sm:w-[20px] sm:h-[20px]" /></div>
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Basic Information</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 relative z-10">
                  <div className="space-y-2 sm:space-y-3">
                    <label className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">ID Code</label>
                    <div className="relative">
                      <Hash size={14} className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600 sm:w-[16px] sm:h-[16px]" />
                      <input required type="text" name="farmer_code" value={formData.farmer_code ?? ''} onChange={handleChange} readOnly
                        className="w-full pl-10 sm:pl-14 pr-4 sm:pr-6 py-3 sm:py-4 bg-slate-50 dark:bg-white/5 border-none rounded-xl sm:rounded-2xl focus:ring-4 focus:ring-emerald-500/10 text-xs sm:text-sm font-bold dark:text-white shadow-inner outline-none opacity-70 cursor-not-allowed" />
                    </div>
                  </div>
                  <div className="space-y-2 sm:space-y-3">
                    <label className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Organization / Group</label>
                    <div className="relative">
                      <Building2 size={14} className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600 sm:w-[16px] sm:h-[16px]" />
                      <select required name="organization_id" value={formData.organization_id ?? ''} onChange={handleChange}
                        className="w-full pl-10 sm:pl-14 pr-4 sm:pr-6 py-3 sm:py-4 bg-slate-50 dark:bg-white/5 border-none rounded-xl sm:rounded-2xl focus:ring-4 focus:ring-emerald-500/10 text-xs sm:text-sm font-bold dark:text-white shadow-inner outline-none appearance-none">
                        <option value="">Select Organization...</option>
                        {organizations.map(org => <option key={org.id} value={org.id}>{org.name}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2 sm:space-y-3">
                    <label className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">First Name <span className="text-rose-500">*</span></label>
                    <input required type="text" name="first_name" value={formData.first_name ?? ''} onChange={handleChange}
                      className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-slate-50 dark:bg-white/5 border-none rounded-xl sm:rounded-2xl focus:ring-4 focus:ring-emerald-500/10 text-xs sm:text-sm font-bold dark:text-white shadow-inner outline-none" />
                  </div>
                  <div className="space-y-2 sm:space-y-3">
                    <label className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Last Name <span className="text-rose-500">*</span></label>
                    <input required type="text" name="last_name" value={formData.last_name ?? ''} onChange={handleChange}
                      className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-slate-50 dark:bg-white/5 border-none rounded-xl sm:rounded-2xl focus:ring-4 focus:ring-emerald-500/10 text-xs sm:text-sm font-bold dark:text-white shadow-inner outline-none" />
                  </div>

                  <div className="space-y-2 sm:space-y-3">
                    <label className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Middle Name</label>
                    <input type="text" name="middle_name" value={formData.middle_name ?? ''} onChange={handleChange}
                      className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-slate-50 dark:bg-white/5 border-none rounded-xl sm:rounded-2xl focus:ring-4 focus:ring-emerald-500/10 text-xs sm:text-sm font-bold dark:text-white shadow-inner outline-none" />
                  </div>
                  <div className="space-y-2 sm:space-y-3">
                    <label className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Suffix</label>
                    <input type="text" name="extension_name" value={formData.extension_name ?? ''} onChange={handleChange} placeholder="Jr., Sr., III"
                      className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-slate-50 dark:bg-white/5 border-none rounded-xl sm:rounded-2xl focus:ring-4 focus:ring-emerald-500/10 text-xs sm:text-sm font-bold dark:text-white shadow-inner outline-none" />
                  </div>

                  <div className="space-y-2 sm:space-y-3 sm:col-span-2 lg:col-span-1">
                    <label className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Birth Date</label>
                    <div className="flex flex-row gap-3 sm:gap-4 items-center">
                      <input type="date" name="birth_date" value={formData.birth_date ?? ''} onChange={handleChange}
                        className="flex-1 w-full px-4 sm:px-6 py-3 sm:py-4 bg-slate-50 dark:bg-white/5 border-none rounded-xl sm:rounded-2xl focus:ring-4 focus:ring-emerald-500/10 text-xs sm:text-sm font-bold dark:text-white shadow-inner outline-none" />
                      <div className="px-4 sm:px-6 py-3 sm:py-4 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl sm:rounded-2xl border border-emerald-100 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-black text-xs sm:text-sm min-w-[70px] sm:min-w-[80px] text-center">
                        {calculatedAge} Y/O
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:col-span-2 lg:col-span-1">
                    <div className="space-y-2 sm:space-y-3">
                      <label className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Gender</label>
                      <select name="gender" value={formData.gender ?? ''} onChange={handleChange}
                        className="w-full px-4 py-3 sm:py-4 bg-slate-50 dark:bg-white/5 border-none rounded-xl sm:rounded-2xl focus:ring-4 focus:ring-emerald-500/10 text-xs sm:text-sm font-bold dark:text-white shadow-inner outline-none appearance-none">
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                      </select>
                    </div>
                    <div className="space-y-2 sm:space-y-3">
                      <label className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Civil Status</label>
                      <select name="civil_status" value={formData.civil_status ?? ''} onChange={handleChange}
                        className="w-full px-4 py-3 sm:py-4 bg-slate-50 dark:bg-white/5 border-none rounded-xl sm:rounded-2xl focus:ring-4 focus:ring-emerald-500/10 text-xs sm:text-sm font-bold dark:text-white shadow-inner outline-none appearance-none">
                        <option value="Single">Single</option>
                        <option value="Married">Married</option>
                        <option value="Widowed">Widowed</option>
                        <option value="Separated">Separated</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 2: GEOGRAPHIC */}
            <div className="bg-white dark:bg-[#0b241f] p-6 sm:p-10 md:p-12 rounded-[2rem] sm:rounded-[3rem] border border-slate-100 dark:border-white/5 shadow-sm space-y-6 sm:space-y-10">
              <div className="flex items-center gap-3">
                <div className="p-2 sm:p-3 bg-blue-50 dark:bg-blue-500/10 text-blue-500 dark:text-blue-400 rounded-xl sm:rounded-2xl shadow-inner"><Globe size={18} className="sm:w-[20px] sm:h-[20px]" /></div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Location Details</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-8">
                <div className="space-y-2 sm:space-y-3">
                  <label className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Barangay <span className="text-rose-500">*</span></label>
                  <select required name="barangay_id" value={formData.barangay_id ?? ''} onChange={handleChange}
                    className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-slate-50 dark:bg-white/5 border-none rounded-xl sm:rounded-2xl focus:ring-4 focus:ring-blue-500/10 text-xs sm:text-sm font-bold dark:text-white shadow-inner outline-none appearance-none transition-all">
                    <option value="">Select Territory...</option>
                    {barangays.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2 sm:space-y-3 sm:col-span-2 md:col-span-2">
                  <label className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Exact Address (Purok/Sitio)</label>
                  <input type="text" name="address" value={formData.address ?? ''} onChange={handleChange}
                    className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-slate-50 dark:bg-white/5 border-none rounded-xl sm:rounded-2xl focus:ring-4 focus:ring-blue-500/10 text-xs sm:text-sm font-bold dark:text-white shadow-inner outline-none transition-all" placeholder="Unit, Street, Complex" />
                </div>
                <div className="space-y-2 sm:space-y-3 sm:col-span-2 md:col-span-1">
                  <label className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Contact Number</label>
                  <div className="relative">
                    <Phone size={14} className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600 sm:w-[16px] sm:h-[16px]" />
                    <input type="text" name="contact_number" value={formData.contact_number ?? ''} onChange={handleChange}
                      className="w-full pl-10 sm:pl-14 pr-4 sm:pr-6 py-3 sm:py-4 bg-slate-50 dark:bg-white/5 border-none rounded-xl sm:rounded-2xl focus:ring-4 focus:ring-blue-500/10 text-xs sm:text-sm font-bold dark:text-white shadow-inner outline-none transition-all" placeholder="+63 000 000 0000" />
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 3: METRICS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
              <div className="bg-white dark:bg-[#0b241f] p-6 sm:p-10 md:p-12 rounded-[2rem] sm:rounded-[3rem] border border-slate-100 dark:border-white/5 shadow-sm space-y-6 sm:space-y-10">
                <div className="flex items-center gap-3">
                  <div className="p-2 sm:p-3 bg-amber-50 dark:bg-amber-500/10 text-amber-500 dark:text-amber-400 rounded-xl sm:rounded-2xl shadow-inner"><Ruler size={18} className="sm:w-[20px] sm:h-[20px]" /></div>
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Farm Details</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div className="space-y-2 sm:space-y-3">
                    <label className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Land Area (HA)</label>
                    <input type="number" step="0.01" name="farm_size_hectares" value={formData.farm_size_hectares ?? ''} onChange={handleChange}
                      className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-slate-50 dark:bg-white/5 border-none rounded-xl sm:rounded-2xl focus:ring-4 focus:ring-amber-500/10 text-xs sm:text-sm font-bold dark:text-white shadow-inner outline-none transition-all" />
                  </div>
                  <div className="space-y-2 sm:space-y-3">
                    <label className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Tenure (Yrs)</label>
                    <input type="number" name="years_farming" value={formData.years_farming ?? ''} onChange={handleChange}
                      className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-slate-50 dark:bg-white/5 border-none rounded-xl sm:rounded-2xl focus:ring-4 focus:ring-amber-500/10 text-xs sm:text-sm font-bold dark:text-white shadow-inner outline-none transition-all" />
                  </div>
                  <div className="sm:col-span-2 space-y-2 sm:space-y-3">
                    <label className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Land Ownership Status</label>
                    <select name="land_ownership" value={formData.land_ownership ?? ''} onChange={handleChange}
                      className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-slate-50 dark:bg-white/5 border-none rounded-xl sm:rounded-2xl focus:ring-4 focus:ring-amber-500/10 text-xs sm:text-sm font-bold dark:text-white shadow-inner outline-none appearance-none transition-all">
                      <option value="Owner">Owner</option>
                      <option value="Tenant">Tenant</option>
                      <option value="Leaseholder">Leaseholder</option>
                      <option value="Caretaker">Caretaker</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-[#0b241f] p-6 sm:p-10 md:p-12 rounded-[2rem] sm:rounded-[3rem] border border-slate-100 dark:border-white/5 shadow-sm space-y-6 sm:space-y-10">
                <div className="flex items-center gap-3">
                  <div className="p-2 sm:p-3 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 rounded-xl sm:rounded-2xl shadow-inner"><DollarSign size={18} className="sm:w-[20px] sm:h-[20px]" /></div>
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Income and Education</h3>
                </div>
                <div className="space-y-4 sm:space-y-8">
                  <div className="space-y-2 sm:space-y-3">
                    <label className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Highest Education</label>
                    <select name="education_level" value={formData.education_level ?? ''} onChange={handleChange}
                      className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-slate-50 dark:bg-white/5 border-none rounded-xl sm:rounded-2xl focus:ring-4 focus:ring-indigo-500/10 text-xs sm:text-sm font-bold dark:text-white shadow-inner outline-none appearance-none transition-all">
                      <option value="Elementary">Elementary</option>
                      <option value="High School Graduate">High School Graduate</option>
                      <option value="College Undergraduate">College Undergrad</option>
                      <option value="College Graduate">College Graduate</option>
                      <option value="Vocational">Vocational</option>
                      <option value="None">None</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                    <div className="space-y-2 sm:space-y-3">
                      <label className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Yearly Income (₱)</label>
                      <input type="number" name="annual_income" value={formData.annual_income ?? ''} onChange={handleChange}
                        className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-slate-50 dark:bg-white/5 border-none rounded-xl sm:rounded-2xl focus:ring-4 focus:ring-indigo-500/10 text-xs sm:text-sm font-bold dark:text-white shadow-inner outline-none transition-all" />
                    </div>
                    <div className="space-y-2 sm:space-y-3">
                      <label className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Main Source of Income</label>
                      <input type="text" name="income_source" value={formData.income_source ?? ''} onChange={handleChange}
                        className="w-full px-4 sm:px-6 py-3 sm:py-4 bg-slate-50 dark:bg-white/5 border-none rounded-xl sm:rounded-2xl focus:ring-4 focus:ring-indigo-500/10 text-xs sm:text-sm font-bold dark:text-white shadow-inner outline-none transition-all" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 4: PRODUCTION */}
            <div className="bg-white dark:bg-[#0b241f] p-6 sm:p-10 md:p-12 rounded-[2rem] sm:rounded-[3rem] border border-slate-100 dark:border-white/5 shadow-sm space-y-6 sm:space-y-10 transition-all">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 sm:gap-6 pb-2 border-b border-slate-50 dark:border-white/5">
                <div className="flex items-center gap-3">
                  <div className="p-2 sm:p-3 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl sm:rounded-2xl shadow-inner"><Sprout size={18} className="sm:w-[20px] sm:h-[20px]" /></div>
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Farm Products / Crops</h3>
                </div>
                <button type="button" onClick={addProduct} className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 sm:py-3.5 bg-emerald-600 dark:bg-emerald-500 text-white dark:text-[#041d18] rounded-xl sm:rounded-2xl font-black text-[9px] sm:text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-200 dark:shadow-none hover:bg-emerald-500 active:scale-95 transition-all">
                  <Plus size={14} className="group-hover:rotate-90 transition-transform" /> Add Product
                </button>
              </div>

              <div className="space-y-4 sm:space-y-6">
                {formData.products.length === 0 ? (
                  <div className="p-10 sm:p-20 text-center bg-slate-50 dark:bg-white/5 rounded-[1.5rem] sm:rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-white/10">
                    <div className="p-4 sm:p-5 bg-white dark:bg-[#0b241f] rounded-full inline-flex text-slate-200 dark:text-slate-700 mb-4 sm:mb-6 shadow-sm"><FileText size={24} className="sm:w-[32px] sm:h-[32px]" /></div>
                    <h4 className="text-xs sm:text-sm font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">No crops or products added yet</h4>
                    <p className="text-[10px] sm:text-xs text-slate-400 dark:text-slate-600 mt-1 sm:mt-2">Click the button above to add what the farmer grows or raises.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:gap-6">
                    {formData.products.map((product, index) => {
                      const isCustomMode = product._isOthers || (product.product_name && !availableProducts.some(ap => ap.name === product.product_name));
                      return (
                        <div key={index} className="flex flex-col lg:flex-row gap-4 sm:gap-6 items-start lg:items-end p-5 sm:p-8 bg-slate-50 dark:bg-white/5 rounded-[1.5rem] sm:rounded-[2.5rem] border border-slate-100 dark:border-white/5 transition-all hover:bg-white dark:hover:bg-white/10 hover:shadow-xl group animate-in slide-in-from-right-4">
                          <div className="flex-1 w-full space-y-2 sm:space-y-3">
                            <label className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Product Type</label>
                            <div className="flex flex-col gap-2">
                              <select
                                value={isCustomMode ? 'Others' : (product.product_name || '')}
                                onChange={(e) => handleProductSelect(index, e.target.value)}
                                className="w-full px-4 sm:px-6 py-3 sm:py-3.5 bg-white dark:bg-[#041d18] border-none rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold dark:text-white shadow-sm focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none appearance-none"
                              >
                                <option value="" disabled>Select Product...</option>
                                {availableProducts.map(p => (
                                  <option key={p.id} value={p.name}>{p.name}</option>
                                ))}
                                <option value="Others">Others (Specify)</option>
                              </select>
                              {isCustomMode && (
                                <div className="flex flex-col gap-1 mt-1 animate-in fade-in zoom-in-95 duration-200">
                                  <input
                                    type="text"
                                    placeholder="Specify custom product (e.g. Goat, Mango)"
                                    value={product.product_name ?? ''}
                                    onChange={(e) => handleProductChange(index, 'product_name', e.target.value)}
                                    className="w-full px-4 sm:px-6 py-3 sm:py-3.5 bg-slate-50 dark:bg-[#020c0a] border border-emerald-100 dark:border-emerald-500/20 rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold dark:text-white shadow-inner focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none"
                                  />
                                  {product.product_name && (
                                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 ml-2 mt-1 transition-all">
                                      Automatically marked as: {product.category || 'Others'}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="w-full lg:w-40 space-y-2 sm:space-y-3">
                            <label className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Volume</label>
                            <input type="number" placeholder="0" value={product.production_volume ?? ''} onChange={(e) => handleProductChange(index, 'production_volume', e.target.value)}
                              className="w-full px-4 sm:px-6 py-3 sm:py-3.5 bg-white dark:bg-white/5 border-none rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold dark:text-white shadow-sm focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none" />
                          </div>
                          <div className="w-full lg:w-32 space-y-2 sm:space-y-3">
                            <label className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Unit</label>
                            <select value={product.unit ?? ''} onChange={(e) => handleProductChange(index, 'unit', e.target.value)}
                              className="w-full px-4 sm:px-6 py-3 sm:py-3.5 bg-white dark:bg-white/5 border-none rounded-xl sm:rounded-2xl text-xs sm:text-sm font-bold dark:text-white shadow-inner focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none appearance-none">
                              <option value="kg">kg</option>
                              <option value="tons">tons</option>
                              <option value="sacks">sacks</option>
                              <option value="heads">heads</option>
                            </select>
                          </div>
                          <div className="flex items-center justify-between w-full lg:w-auto gap-4 sm:gap-6 pb-1 sm:pb-2 pt-2 lg:pt-0">
                            <label className="flex items-center gap-2 sm:gap-3 cursor-pointer group/check">
                              <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded-md sm:rounded-lg border-2 flex items-center justify-center transition-all ${product.is_primary ? 'bg-emerald-500 border-emerald-500 shadow-lg shadow-emerald-200 dark:shadow-none' : 'border-slate-200 dark:border-white/20 bg-white dark:bg-white/5 group-hover/check:border-emerald-300'}`}>
                                {product.is_primary && <Plus size={14} className="text-white rotate-45" />}
                              </div>
                              <input type="checkbox" className="hidden" checked={product.is_primary} onChange={(e) => handleProductChange(index, 'is_primary', e.target.checked)} />
                              <span className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Main Product</span>
                            </label>
                            <button type="button" onClick={() => removeProduct(index)} className="p-2.5 sm:p-3 bg-white dark:bg-[#041d18] border border-rose-100 dark:border-rose-500/20 text-rose-400 hover:bg-rose-500 dark:hover:bg-rose-500 hover:text-white rounded-lg sm:rounded-xl transition-all shadow-sm active:scale-90">
                              <Trash2 size={16} className="sm:w-[18px] sm:h-[18px]" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </form>

          {/* SECTION 5: FAMILY & SUCCESSION */}
          {isEditMode && (
            <FarmerChildren
              farmerId={id}
              children={formData.children || []}
              onUpdate={fetchFarmerDetails}
            />
          )}

          {/* ACTION DECK */}
          <footer className="flex flex-col-reverse sm:flex-row justify-end gap-3 sm:gap-6 pt-6 sm:pt-10 border-t border-slate-100 dark:border-white/5">
            <button type="button" onClick={() => navigate('/farmers')} className="w-full sm:w-auto px-8 sm:px-10 py-4 sm:py-5 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 font-black text-[9px] sm:text-[10px] uppercase tracking-[0.2em] rounded-xl sm:rounded-2xl hover:bg-slate-50 dark:hover:bg-white/10 transition-all active:scale-95 text-center">
              Cancel
            </button>
            <button type="submit" form="farmer-profile-form" disabled={loading} className="w-full sm:w-auto px-8 sm:px-12 py-4 sm:py-5 bg-emerald-600 dark:bg-emerald-500 text-white dark:text-[#041d18] font-black text-[9px] sm:text-[10px] uppercase tracking-[0.2em] rounded-xl sm:rounded-2xl shadow-xl sm:shadow-2xl shadow-emerald-200 dark:shadow-none hover:bg-emerald-500 hover:-translate-y-1 active:scale-95 transition-all flex items-center justify-center gap-2 sm:gap-3 disabled:opacity-50">
              {loading ? <Loader2 size={16} className="sm:w-[18px] sm:h-[18px] animate-spin" /> : <Save size={16} className="sm:w-[18px] sm:h-[18px]" />}
              <span>{isEditMode ? 'Save Changes' : 'Save New Farmer'}</span>
            </button>
          </footer>
        </div>
      </div>
    </div>
  );
}