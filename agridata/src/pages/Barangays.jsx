import React, { useState, useEffect } from 'react';
import { barangaysAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, Search, MapPin, Users, Sprout, 
  X, Info, TrendingUp, ChevronLeft, ChevronRight, Activity, Globe, Loader2,
  Download, ArrowUpDown, Edit, Trash2, Filter, Crosshair
} from 'lucide-react';

import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const mapIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
});

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

function LocationPicker({ position, setPosition }) {
    const map = useMapEvents({
        click(e) {
            setPosition({ lat: e.latlng.lat, lng: e.latlng.lng });
            map.flyTo(e.latlng, map.getZoom());
        }
    });

    useEffect(() => {
        if (position) {
            map.flyTo(position, map.getZoom());
        }
    }, [position, map]);

    return position ? (
        <Marker position={position} icon={mapIcon}>
            <Popup className="custom-popup font-sans font-bold text-slate-800 dark:text-white">Selected Location</Popup>
        </Marker>
    ) : null;
}

const BarangaySkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8">
    {[...Array(6)].map((_, i) => (
      <div key={i} className="bg-white dark:bg-[#0b241f] rounded-[1.5rem] sm:rounded-[2.5rem] border border-slate-100 dark:border-white/5 p-6 sm:p-8 animate-pulse shadow-sm">
        <div className="flex justify-between mb-4 sm:mb-6">
          <div className="space-y-2 sm:space-y-3 flex-1">
            <div className="h-5 sm:h-6 w-24 sm:w-32 bg-slate-100 dark:bg-white/5 rounded-lg"></div>
            <div className="h-3 sm:h-4 w-32 sm:w-48 bg-slate-50 dark:bg-white/5 rounded-md"></div>
          </div>
          <div className="h-10 w-10 sm:h-12 sm:w-12 bg-slate-50 dark:bg-white/5 rounded-xl sm:rounded-2xl"></div>
        </div>
        <div className="space-y-4 sm:space-y-5 pt-4 sm:pt-6 border-t border-slate-50 dark:border-white/5">
          <div className="flex justify-between"><div className="h-3 sm:h-4 w-16 sm:w-20 bg-slate-50 dark:bg-white/5 rounded"></div><div className="h-3 sm:h-4 w-10 sm:w-12 bg-slate-100 dark:bg-white/5 rounded"></div></div>
          <div className="space-y-2 sm:space-y-3">
            <div className="h-2 w-full bg-slate-50 dark:bg-white/5 rounded-full"></div>
            <div className="h-2 w-2/3 bg-slate-50 dark:bg-white/5 rounded-full"></div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

export default function Barangays() {
  const [barangays, setBarangays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [sortConfig, setSortConfig] = useState({ key: 'name', direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [isExporting, setIsExporting] = useState(false);
  const [editingId, setEditingId] = useState(null); 
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  // Map Theme State
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  const { hasPermission } = useAuth();
  const canManage = hasPermission(['admin', 'data_encoder']);
  const ITEMS_PER_PAGE = 9;

  const initialForm = {
    name: '', 
    municipality: 'San Pablo City', 
    province: 'Laguna',
    region: 'Region IV-A (CALABARZON)',
    population: '', total_households: '', agricultural_households: '',
    latitude: '', longitude: '' 
  };

  const [formData, setFormData] = useState(initialForm);

  // Sync Map Theme with Global App Theme
  useEffect(() => {
    const checkTheme = () => setIsDarkMode(document.documentElement.classList.contains('dark'));
    checkTheme(); 
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    fetchBarangays();
  }, []);

  const fetchBarangays = async () => {
    setLoading(true);
    try {
      const response = await barangaysAPI.getAll();
      setBarangays(response.data);
    } catch (error) {
      console.error('Error fetching barangays:', error);
    } finally {
      setTimeout(() => setLoading(false), 800);
    }
  };

  const handleAutoLocate = async () => {
    if (!formData.name || !formData.municipality || !formData.province) {
        alert("Please enter a Barangay, Municipality, and Province first.");
        return;
    }
    setIsLocating(true);
    try {
        const query = `${formData.name}, ${formData.municipality}, ${formData.province}, Philippines`;
        const geoResponse = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
        const geoData = await geoResponse.json();
        
        if (geoData && geoData.length > 0) {
            setFormData(prev => ({
                ...prev,
                latitude: geoData[0].lat,
                longitude: geoData[0].lon
            }));
        } else {
            alert("Could not locate automatically. Please click the map to drop a pin.");
        }
    } catch (error) {
        console.error("Geocoding failed", error);
        alert("Network error while finding location.");
    } finally {
        setIsLocating(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const payload = {
          ...formData,
          latitude: formData.latitude ? parseFloat(formData.latitude) : null,
          longitude: formData.longitude ? parseFloat(formData.longitude) : null
      };

      if (editingId) {
        alert("Update feature requires backend integration. Simulating refresh.");
      } else {
        await barangaysAPI.create(payload);
      }
      
      closeModal();
      fetchBarangays();
    } catch (error) {
      console.error('Error saving barangay:', error);
      alert('Failed to save the territorial record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (b) => {
    setEditingId(b.id);
    setFormData({
      name: b.name || '',
      municipality: b.municipality || 'San Pablo City',
      province: b.province || 'Laguna',
      region: b.region || 'Region IV-A (CALABARZON)',
      population: b.population || '',
      total_households: b.total_households || '',
      agricultural_households: b.agricultural_households || '',
      latitude: b.latitude || '',
      longitude: b.longitude || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to remove this territory? This may affect linked farmer records.")) {
      try {
        alert("Delete feature requires backend integration. Simulating removal.");
        setBarangays(prev => prev.filter(b => b.id !== id));
      } catch (error) {
        console.error("Delete failed", error);
      }
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setFormData(initialForm);
  };

  const handleExport = () => {
    setIsExporting(true);
    const headers = ["Name", "Municipality", "Province", "Population", "Total HH", "Agri HH", "Agri Density (%)"];
    const rows = barangays.map(b => {
      const density = ((b.agricultural_households / b.total_households) * 100).toFixed(2);
      return [b.name, b.municipality, b.province, b.population, b.total_households, b.agricultural_households, density];
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const link = document.createElement("a");
    link.setAttribute("href", encodeURI(csvContent));
    link.setAttribute("download", `barangay_masterlist_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => setIsExporting(false), 800);
  };

  const getAgriPercentage = (b) => {
    if (!b.total_households || !b.agricultural_households) return 0;
    return ((b.agricultural_households / b.total_households) * 100).toFixed(1);
  };

  const filtered = barangays.filter(b =>
    b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.municipality.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.province.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sorted = [...filtered].sort((a, b) => {
    if (sortConfig.key === 'population') {
      return sortConfig.direction === 'asc' ? a.population - b.population : b.population - a.population;
    }
    if (sortConfig.key === 'agri_density') {
      const denA = (a.agricultural_households / a.total_households) || 0;
      const denB = (b.agricultural_households / b.total_households) || 0;
      return sortConfig.direction === 'asc' ? denA - denB : denB - denA;
    }
    return sortConfig.direction === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
  });

  const totalPages = Math.ceil(sorted.length / ITEMS_PER_PAGE);
  const paginated = sorted.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const totalPopulation = barangays.reduce((sum, b) => sum + (Number(b.population) || 0), 0);
  const totalAgriHouseholds = barangays.reduce((sum, b) => sum + (Number(b.agricultural_households) || 0), 0);

  const mapPosition = formData.latitude && formData.longitude 
    ? { lat: parseFloat(formData.latitude), lng: parseFloat(formData.longitude) } 
    : null;

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#020c0a] font-sans selection:bg-emerald-100 transition-colors duration-300 pb-20">
      <div className="max-w-[1400px] mx-auto space-y-8 sm:space-y-12 animate-in fade-in duration-700">
        
        {/* Header Section */}
        <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 sm:gap-8 px-4 pt-6 sm:pt-8">
          <div>
            <div className="flex items-center gap-2 mb-3 sm:mb-4">
              <div className="p-1.5 sm:p-2 bg-emerald-600 rounded-lg sm:rounded-xl text-white shadow-xl shadow-emerald-200 dark:shadow-none">
                <Globe size={18} className="sm:w-[20px] sm:h-[20px]" />
              </div>
              <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-[0.3em]">Territorial Mapping</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Community Profiles</h1>
            <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 font-medium mt-1 sm:mt-2">Comprehensive demographic and agricultural data per barangay.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
            <button 
                onClick={handleExport}
                disabled={isExporting}
                className="w-full sm:w-auto flex-1 lg:flex-none flex items-center justify-center gap-2 px-6 py-3.5 sm:py-4 bg-white dark:bg-white/5 border border-slate-100 dark:border-white/10 rounded-xl sm:rounded-[1.25rem] font-black text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-all shadow-sm"
            >
                {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                <span>Export CSV</span>
            </button>
            {canManage && (
              <button 
                onClick={() => setShowModal(true)} 
                className="w-full sm:w-auto flex-1 lg:flex-none group flex items-center justify-center gap-2 sm:gap-3 px-8 py-3.5 sm:py-4 bg-slate-900 dark:bg-emerald-600 text-white rounded-xl sm:rounded-[1.25rem] font-black text-[10px] sm:text-xs uppercase tracking-widest shadow-xl sm:shadow-2xl shadow-slate-200 dark:shadow-none hover:bg-slate-800 dark:hover:bg-emerald-500 active:scale-95 transition-all"
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5 group-hover:rotate-90 transition-transform duration-300" />
                <span>Add Barangay</span>
              </button>
            )}
          </div>
        </header>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8 px-4">
          {[
            { label: 'Mapped Units', val: barangays.length, icon: MapPin, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-500/10' },
            { label: 'Regional Population', val: totalPopulation, icon: Users, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
            { label: 'Active Agri Units', val: totalAgriHouseholds, icon: Sprout, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10' },
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

        {/* Search & Filter Toolbar */}
        <div className="px-4 flex flex-col md:flex-row gap-3 sm:gap-4">
          <div className="bg-white dark:bg-[#0b241f] rounded-xl sm:rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-sm p-1.5 sm:p-2 flex items-center transition-colors flex-1 w-full">
            <div className="relative flex-1 w-full">
              <Search size={18} className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 sm:w-[20px] sm:h-[20px]" />
              <input
                type="text"
                className="w-full pl-12 sm:pl-16 pr-4 sm:pr-6 py-3 sm:py-4 bg-transparent border-none focus:ring-0 text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-600 outline-none"
                placeholder="Filter by name or municipality..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              />
            </div>
          </div>
          
          <div className="bg-white dark:bg-[#0b241f] rounded-xl sm:rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-sm p-1.5 sm:p-2 flex items-center gap-2 sm:gap-4 px-3 sm:px-6 w-full md:w-auto overflow-hidden">
             <Filter size={16} className="text-slate-400 shrink-0 hidden sm:block" />
             <select 
                className="bg-transparent border-none outline-none text-[10px] sm:text-sm font-bold text-slate-600 dark:text-slate-400 cursor-pointer appearance-none pr-6 sm:pr-8 py-3 sm:py-0 w-full md:w-auto"
                onChange={(e) => setSortConfig({ key: e.target.value, direction: 'desc' })}
             >
                <option value="name">Name</option>
                <option value="population">Population</option>
                <option value="agri_density">Agri Density</option>
             </select>
             <button 
                onClick={() => setSortConfig(prev => ({ ...prev, direction: prev.direction === 'asc' ? 'desc' : 'asc' }))}
                className="p-1.5 sm:p-2 hover:bg-slate-50 dark:hover:bg-white/5 rounded-full transition-colors shrink-0"
             >
                <ArrowUpDown size={16} className={`text-slate-400 transition-transform ${sortConfig.direction === 'asc' ? 'rotate-180' : ''}`} />
             </button>
          </div>
        </div>

        {/* Content Grid */}
        <div className="px-4">
          {loading ? (
            <BarangaySkeleton />
          ) : paginated.length === 0 ? (
            <div className="py-20 sm:py-32 bg-white dark:bg-[#0b241f] rounded-[2rem] sm:rounded-[3rem] border-2 border-dashed border-slate-100 dark:border-white/10 text-center transition-colors">
              <div className="p-6 sm:p-8 bg-slate-50 dark:bg-white/5 rounded-full inline-flex text-slate-200 dark:text-slate-700 mb-6 sm:mb-8">
                <MapPin size={36} className="sm:w-[48px] sm:h-[48px]" />
              </div>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Location Not Found</h3>
              <p className="text-xs sm:text-sm text-slate-400 dark:text-slate-500 font-medium mt-2 sm:mt-3">Try refining your search terms.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8">
              {paginated.map((b) => {
                const agriPerc = getAgriPercentage(b);
                return (
                  <div key={b.id} className="group bg-white dark:bg-[#0b241f] rounded-[1.5rem] sm:rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-sm hover:shadow-xl dark:hover:shadow-black/40 hover:-translate-y-1 transition-all duration-500 overflow-hidden relative">
                    {canManage && (
                        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex gap-1.5 sm:gap-2 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity z-10">
                            <button onClick={() => handleEdit(b)} className="p-1.5 sm:p-2 bg-white dark:bg-black/40 backdrop-blur-md rounded-lg sm:rounded-xl text-slate-400 hover:text-emerald-500 shadow-sm border border-slate-100 dark:border-white/10 transition-colors"><Edit size={14} className="sm:w-[16px] sm:h-[16px]" /></button>
                            <button onClick={() => handleDelete(b.id)} className="p-1.5 sm:p-2 bg-white dark:bg-black/40 backdrop-blur-md rounded-lg sm:rounded-xl text-slate-400 hover:text-rose-500 shadow-sm border border-slate-100 dark:border-white/10 transition-colors"><Trash2 size={14} className="sm:w-[16px] sm:h-[16px]" /></button>
                        </div>
                    )}

                    <div className="p-6 sm:p-10">
                      <div className="flex justify-between items-start mb-6 sm:mb-8">
                        <div className="min-w-0 pr-4">
                          <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors uppercase tracking-tight truncate">{b.name}</h3>
                          <div className="flex items-center gap-1.5 sm:gap-2 mt-1.5 sm:mt-2">
                             <div className="p-1 bg-slate-50 dark:bg-white/5 text-slate-400 dark:text-slate-500 rounded-md shrink-0">
                                <MapPin size={10} className="sm:w-[12px] sm:h-[12px]" />
                             </div>
                             <span className="text-[10px] sm:text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest truncate">{b.municipality}, {b.province}</span>
                          </div>
                        </div>
                        <div className="text-slate-100 dark:text-white/5 group-hover:text-emerald-500 transition-colors shrink-0">
                          <TrendingUp size={24} className="sm:w-[32px] sm:h-[32px]" />
                        </div>
                      </div>

                      <div className="space-y-4 sm:space-y-6 pt-6 sm:pt-8 border-t border-slate-50 dark:border-white/5">
                        <div className="flex justify-between items-end gap-2">
                          <div className="space-y-0.5 sm:space-y-1 min-w-0">
                             <p className="text-[8px] sm:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Total Population</p>
                             <p className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">{(b.population || 0).toLocaleString()}</p>
                          </div>
                          <div className="text-right space-y-0.5 sm:space-y-1 shrink-0">
                             <p className="text-[8px] sm:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Agri Coverage</p>
                             <p className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400">{agriPerc}%</p>
                          </div>
                        </div>
                        
                        <div className="space-y-2 sm:space-y-3">
                          <div className="w-full bg-slate-50 dark:bg-black/20 rounded-full h-2.5 sm:h-3 overflow-hidden shadow-inner">
                            <div 
                              className="h-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600 transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(16,185,129,0.4)]"
                              style={{ width: `${agriPerc}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
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

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-0 sm:p-4 md:p-8 overflow-hidden">
            <div className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={closeModal} />
            <div className="relative bg-white dark:bg-[#041d18] rounded-none sm:rounded-[3rem] shadow-2xl w-full h-full sm:h-auto sm:max-w-2xl sm:max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-500 border-none sm:border dark:border-white/5">
              
              <div className="p-6 sm:p-10 border-b border-slate-50 dark:border-white/5 flex items-center justify-between sticky top-0 bg-white/80 dark:bg-[#041d18]/80 backdrop-blur-xl z-10 shrink-0 pt-safe">
                <div>
                  <h2 className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase leading-none">{editingId ? 'Edit Profile' : 'New Profile'}</h2>
                  <p className="text-slate-400 dark:text-slate-500 font-medium text-xs sm:text-sm mt-1">{editingId ? 'Update demographic metrics.' : 'Register territorial data.'}</p>
                </div>
                <button type="button" onClick={closeModal} disabled={isSubmitting} className="p-2.5 sm:p-4 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl sm:rounded-2xl transition-all text-slate-300 dark:text-slate-600 shrink-0">
                  <X size={24} className="sm:w-[28px] sm:h-[28px]" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-8 sm:space-y-12 no-scrollbar pb-safe">
                
                <div className="space-y-6 sm:space-y-8">
                  <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600 dark:text-emerald-500 flex items-center gap-2 sm:gap-3">
                    <Activity size={12} className="sm:w-[14px] sm:h-[14px]" /> Geographical Context
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-8">
                    <div className="space-y-1.5 sm:space-y-3">
                      <label className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Barangay Name</label>
                      <input type="text" required disabled={isSubmitting} className="w-full px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-50 dark:bg-white/5 border-none rounded-xl sm:rounded-2xl focus:ring-4 focus:ring-emerald-500/10 text-xs sm:text-sm font-bold dark:text-white shadow-inner outline-none transition-all disabled:opacity-60" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Ex: San Ignacio" />
                    </div>
                    <div className="space-y-1.5 sm:space-y-3">
                      <label className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Municipality</label>
                      <input type="text" required disabled={isSubmitting} className="w-full px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-50 dark:bg-white/5 border-none rounded-xl sm:rounded-2xl focus:ring-4 focus:ring-emerald-500/10 text-xs sm:text-sm font-bold dark:text-white shadow-inner outline-none transition-all disabled:opacity-60" value={formData.municipality} onChange={(e) => setFormData({ ...formData, municipality: e.target.value })} placeholder="Enter municipality..." />
                    </div>
                    <div className="space-y-1.5 sm:space-y-3">
                      <label className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Province</label>
                      <input type="text" required disabled={isSubmitting} className="w-full px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-50 dark:bg-white/5 border-none rounded-xl sm:rounded-2xl focus:ring-4 focus:ring-emerald-500/10 text-xs sm:text-sm font-bold dark:text-white shadow-inner outline-none transition-all disabled:opacity-60" value={formData.province} onChange={(e) => setFormData({ ...formData, province: e.target.value })} placeholder="Enter province..." />
                    </div>
                  </div>

                  {/* Dynamic Map Picker Interface */}
                  <div className="space-y-3 sm:space-y-4 pt-4 border-t border-slate-100 dark:border-white/5">
                    <div className="flex justify-between items-end gap-2">
                      <label className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Pin Location on Map</label>
                      <button 
                        type="button" 
                        onClick={handleAutoLocate}
                        disabled={isLocating || isSubmitting}
                        className="flex items-center gap-1.5 sm:gap-2 text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 disabled:opacity-50 transition-colors shrink-0"
                      >
                         {isLocating ? <Loader2 size={12} className="sm:w-[14px] sm:h-[14px] animate-spin"/> : <Crosshair size={12} className="sm:w-[14px] sm:h-[14px]" />}
                         Auto-Locate
                      </button>
                    </div>
                    
                    <div className="h-48 sm:h-64 w-full rounded-2xl sm:rounded-3xl overflow-hidden border-[3px] sm:border-4 border-slate-100 dark:border-white/5 relative z-0">
                      <MapContainer 
                        key={`form-map-${isDarkMode ? 'dark' : 'light'}`}
                        center={mapPosition || [14.0673, 121.3242]} 
                        zoom={mapPosition ? 16 : 13} 
                        scrollWheelZoom={true} 
                        style={{ height: '100%', width: '100%', zIndex: 0, backgroundColor: isDarkMode ? '#020c0a' : '#f1f5f9' }}
                      >
                         <TileLayer
                           url={isDarkMode 
                             ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
                             : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
                           }
                         />
                         <LocationPicker 
                           position={mapPosition} 
                           setPosition={(pos) => setFormData({...formData, latitude: pos.lat, longitude: pos.lng})} 
                         />
                      </MapContainer>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                       <input type="text" readOnly className="w-full px-4 sm:px-5 py-2.5 sm:py-3 bg-slate-100 dark:bg-white/5 border-none rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 outline-none cursor-not-allowed" value={formData.latitude || ''} placeholder="Latitude" />
                       <input type="text" readOnly className="w-full px-4 sm:px-5 py-2.5 sm:py-3 bg-slate-100 dark:bg-white/5 border-none rounded-lg sm:rounded-xl text-[10px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 outline-none cursor-not-allowed" value={formData.longitude || ''} placeholder="Longitude" />
                    </div>
                    <p className="text-[8px] sm:text-[10px] text-slate-400 dark:text-slate-500 font-medium ml-1">Tap the map to drop a pin, or use the Auto-Locate tool.</p>
                  </div>
                </div>

                <div className="space-y-6 sm:space-y-8 pb-6 sm:pb-0">
                  <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] text-blue-600 dark:text-blue-400 flex items-center gap-2 sm:gap-3">
                    <Users size={12} className="sm:w-[14px] sm:h-[14px]" /> Demographic Specs
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-8">
                    <div className="space-y-1.5 sm:space-y-3">
                      <label className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Population</label>
                      <input type="number" disabled={isSubmitting} className="w-full px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-50 dark:bg-white/5 border-none rounded-xl sm:rounded-2xl focus:ring-4 focus:ring-blue-500/10 text-xs sm:text-sm font-bold dark:text-white shadow-inner outline-none transition-all disabled:opacity-60" value={formData.population} onChange={(e) => setFormData({ ...formData, population: e.target.value })} />
                    </div>
                    <div className="space-y-1.5 sm:space-y-3">
                      <label className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Total Households</label>
                      <input type="number" disabled={isSubmitting} className="w-full px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-50 dark:bg-white/5 border-none rounded-xl sm:rounded-2xl focus:ring-4 focus:ring-blue-500/10 text-xs sm:text-sm font-bold dark:text-white shadow-inner outline-none transition-all disabled:opacity-60" value={formData.total_households} onChange={(e) => setFormData({ ...formData, total_households: e.target.value })} />
                    </div>
                    <div className="space-y-1.5 sm:space-y-3">
                      <label className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Agri Units</label>
                      <input type="number" disabled={isSubmitting} className="w-full px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-50 dark:bg-white/5 border-none rounded-xl sm:rounded-2xl focus:ring-4 focus:ring-blue-500/10 text-xs sm:text-sm font-bold dark:text-white shadow-inner outline-none transition-all disabled:opacity-60" value={formData.agricultural_households} onChange={(e) => setFormData({ ...formData, agricultural_households: e.target.value })} />
                    </div>
                  </div>
                </div>
              </form>

              <div className="px-6 sm:px-10 py-6 sm:py-8 bg-slate-50 dark:bg-black/20 border-t border-slate-100 dark:border-white/5 flex flex-col-reverse sm:flex-row justify-end gap-3 sm:gap-6 shrink-0 pb-safe">
                <button type="button" disabled={isSubmitting} onClick={closeModal} className="w-full sm:w-auto px-6 sm:px-10 py-3.5 sm:py-4 text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-600 bg-white dark:bg-transparent rounded-xl sm:rounded-none border border-slate-200 sm:border-none dark:border-white/10 hover:text-slate-600 dark:hover:text-slate-400 transition-colors disabled:opacity-50 text-center">Discard</button>
                <button 
                  onClick={handleSubmit} 
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-8 sm:px-12 py-4 sm:py-5 bg-emerald-600 dark:bg-emerald-600 text-white rounded-xl sm:rounded-[1.25rem] font-black text-[10px] sm:text-xs uppercase tracking-widest shadow-xl sm:shadow-2xl shadow-emerald-200 dark:shadow-none hover:bg-emerald-500 active:scale-95 transition-all flex items-center justify-center gap-2 sm:gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Saving...
                      </>
                    ) : (
                      editingId ? 'Update Profile' : 'Save Profile'
                    )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .no-scrollbar::-webkit-scrollbar { display: none; } 
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .leaflet-popup-content-wrapper { background: transparent !important; box-shadow: none !important; padding: 0 !important; }
        .leaflet-popup-content { margin: 0 !important; }
        .leaflet-popup-tip { background: ${isDarkMode ? '#041d18' : '#ffffff'} !important; }
        .custom-popup { background-color: ${isDarkMode ? '#041d18' : '#ffffff'} !important; border-radius: 12px; padding: 8px 12px; }
        @supports (padding-top: env(safe-area-inset-top)) {
          .pt-safe { padding-top: max(1.25rem, env(safe-area-inset-top)); }
          .pb-safe { padding-bottom: max(1.25rem, env(safe-area-inset-bottom)); }
        }
      `}} />
    </div>
  );
}