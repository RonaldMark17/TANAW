import React, { useState, useEffect, memo, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip, useMap, Marker, ZoomControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { farmersAPI } from '../services/api';
import { 
  MapPinned, Users, Sprout, Search, Navigation, Globe, 
  BrainCircuit, User, MapPin, TrendingDown, ShieldCheck, AlertTriangle, Loader2 
} from 'lucide-react';

// Fix Vite default icon issue for the User Location Pin
const userIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Center of Nagcarlan (Base coordinates for simulation)
const MAP_CENTER = [14.1333, 121.4167];

// --- HELPER: Risk Color Coding ---
const getRiskColor = (level) => {
  if (level === 'High') return { fill: '#ef4444', stroke: '#b91c1c' }; // Red
  if (level === 'Medium') return { fill: '#f59e0b', stroke: '#b45309' }; // Amber
  return { fill: '#10b981', stroke: '#047857' }; // Green
};

// --- COMPONENT: Smooth Count-Up Animation ---
const AnimatedCounter = ({ value, decimals = 0, duration = 1500 }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime = null;
    const endValue = parseFloat(value) || 0;
    if (endValue === 0) { setCount(0); return; }

    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 4); 
      setCount(endValue * easeProgress);

      if (progress < 1) window.requestAnimationFrame(step);
      else setCount(endValue);
    };

    window.requestAnimationFrame(step);
  }, [value, duration]);

  return <>{count.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}</>;
};

// --- COMPONENT: Map Controller for Fly-To Animation ---
function MapController({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, zoom, { duration: 1.5, easeLinearity: 0.25 });
  }, [center, zoom, map]);
  return null;
}

// --- COMPONENT: Memoized Markers to prevent Context crashes ---
const MapMarkers = memo(({ data, onSelectFarm }) => {
  return (
    <>
      {data.map((farm) => {
        const colors = getRiskColor(farm.riskLevel);
        return (
          <CircleMarker
            key={`marker-${farm.id}`}
            center={[farm.lat, farm.lng]}
            radius={farm.riskLevel === 'High' ? 14 : (farm.riskLevel === 'Medium' ? 10 : 8)}
            fillColor={colors.fill}
            color={colors.stroke}
            weight={2}
            fillOpacity={farm.riskLevel === 'High' ? 0.8 : 0.6}
            eventHandlers={{ click: () => onSelectFarm(farm) }}
          >
            <Tooltip direction="top" offset={[0, -10]} opacity={1} className="custom-tooltip">
              <span className="font-black uppercase text-[10px] tracking-widest">{farm.full_name}</span>
            </Tooltip>
            
            <Popup className="custom-popup">
              <div className="p-3 text-center font-sans bg-white dark:bg-[#041d18] rounded-xl shadow-lg border border-slate-100 dark:border-white/10">
                <p className="font-black text-xs text-slate-900 dark:text-white uppercase tracking-tight">{farm.full_name}</p>
                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">{farm.barangay?.name || 'Unknown Location'}</p>
                <div className="mt-2 pt-2 border-t border-slate-100 dark:border-white/10">
                  <span className="text-[9px] font-black uppercase tracking-widest" style={{ color: colors.fill }}>
                    {farm.riskLevel} Risk
                  </span>
                </div>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </>
  );
});

export default function VulnerabilityMap() {
  const [farmers, setFarmers] = useState([]);
  const [selectedFarm, setSelectedFarm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  // Map & Controls State
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [mapTheme, setMapTheme] = useState('light');
  const [mapCenter, setMapCenter] = useState(MAP_CENTER); 
  const [mapZoom, setMapZoom] = useState(13);
  const [userLocation, setUserLocation] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const mapTiles = {
    light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
  };

  useEffect(() => {
    const checkTheme = () => {
      const darkGlobal = document.documentElement.classList.contains('dark');
      setIsDarkMode(darkGlobal);
      setMapTheme(prev => prev === 'satellite' ? 'satellite' : (darkGlobal ? 'dark' : 'light'));
    };
    checkTheme(); 
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setIsMounted(true);
    let isSubscribed = true;

    const fetchAndProcessFarmers = async () => {
      try {
        const response = await farmersAPI.getAll({ per_page: 200 });
        if (!isSubscribed) return;
        
        const rawFarmers = response.data.farmers || [];

        // Apply Hackathon Predictive ML Heuristic
        const processed = rawFarmers.map(farmer => {
          let riskScore = 0;
          let issues = [];

          if (farmer.age >= 65) { riskScore += 45; issues.push("Critical Age (>65)"); }
          else if (farmer.age >= 55) { riskScore += 25; issues.push("Aging Workforce"); }

          if (!farmer.children_farming_involvement) { riskScore += 40; issues.push("No Successor"); }
          else { riskScore -= 15; }

          if (farmer.annual_income < 50000) { riskScore += 15; issues.push("Financial Vulnerability"); }

          riskScore = Math.max(0, Math.min(100, riskScore));

          let riskLevel = 'Low';
          if (riskScore > 70) riskLevel = 'High';
          else if (riskScore > 40) riskLevel = 'Medium';

          return {
            ...farmer,
            riskScore,
            riskLevel,
            issues,
            crop: farmer.products?.[0]?.product_name || "Unrecorded",
            // SIMULATE COORDINATES FOR HACKATHON DEMO AROUND NAGCARLAN
            lat: MAP_CENTER[0] + (Math.random() - 0.5) * 0.05,
            lng: MAP_CENTER[1] + (Math.random() - 0.5) * 0.05,
          };
        });

        setFarmers(processed);
        if (processed.length > 0) setSelectedFarm(processed[0]);
      } catch (error) {
        console.error("Failed to load map data", error);
      } finally {
        if (isSubscribed) setLoading(false);
      }
    };

    fetchAndProcessFarmers();
    return () => { isSubscribed = false; };
  }, []);

  const handleSearchSelect = (e) => {
    const selectedId = e.target.value;
    setSearchQuery(selectedId);
    if (!selectedId) return;

    const target = farmers.find(f => f.id.toString() === selectedId);
    if (target && target.lat && target.lng) {
      setMapCenter([target.lat, target.lng]);
      setMapZoom(17); 
      setSelectedFarm(target);
    }
  };

  const handleLocateMe = () => {
    if (!navigator.geolocation) return alert("Geolocation is not supported by your browser.");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation([latitude, longitude]);
        setMapCenter([latitude, longitude]);
        setMapZoom(15);
      },
      () => alert("Unable to retrieve location.")
    );
  };

  if (!isMounted || loading) {
    return (
      <div className="space-y-6 pb-20 w-full animate-in fade-in duration-500">
        <header className="flex flex-col sm:flex-row justify-between gap-4 px-2">
          <div className="space-y-3">
            <div className="w-32 h-3 bg-slate-200 dark:bg-[#0b241f] rounded animate-pulse"></div>
            <div className="w-64 h-8 bg-slate-200 dark:bg-[#0b241f] rounded-xl animate-pulse"></div>
          </div>
          <div className="w-full sm:w-48 h-16 bg-white dark:bg-[#0b241f] rounded-2xl animate-pulse"></div>
        </header>
        <div className="relative h-[70vh] w-full rounded-[2rem] bg-slate-100 dark:bg-[#020c0a] animate-pulse border-4 border-white dark:border-[#0b241f] shadow-xl flex items-center justify-center">
           <Loader2 className="animate-spin text-emerald-500 opacity-50" size={40} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-in fade-in duration-700 pb-16">
      
      {/* COMPACT RESPONSIVE HEADER */}
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 px-2">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-1.5 bg-emerald-600 rounded-md text-white shadow-sm">
              <MapPinned size={14} />
            </div>
            <span className="text-[9px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-[0.2em]">Geospatial Intelligence</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase leading-none">Vulnerability Map</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">AI-driven predictive abandonment risk profiling.</p>
        </div>

        <div className="bg-white dark:bg-[#0b241f] border border-slate-100 dark:border-white/5 rounded-[1.25rem] px-5 py-3 shadow-sm flex items-center gap-4 w-full sm:w-auto">
          <div className="p-2.5 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <Users size={18} />
          </div>
          <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Farmers Mapped</p>
            <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-none">
              <AnimatedCounter value={farmers.length} />
            </p>
          </div>
        </div>
      </header>

      {/* COMPACT SPLIT SCREEN LAYOUT */}
      <div className="flex flex-col lg:flex-row h-[70vh] gap-4 lg:gap-6">
        
        {/* LEFT SIDE: MAP */}
        <div className="relative w-full lg:w-2/3 h-[50vh] lg:h-full rounded-[2rem] overflow-hidden border-[4px] border-white dark:border-[#0b241f] shadow-xl z-0 bg-slate-100 dark:bg-[#020c0a] isolate">
          
          {/* MAP CONTROLS OVERLAY */}
          <div className="absolute inset-0 z-[1000] pointer-events-none flex flex-col justify-between p-4 sm:p-5">
            
            {/* Top Row: Search & Tools */}
            <div className="flex justify-between items-start gap-3 w-full">
              {/* Search Bar */}
              <div className="pointer-events-auto flex-1 max-w-[200px] sm:max-w-xs bg-white/90 dark:bg-black/70 backdrop-blur-md rounded-xl shadow-md border border-slate-200 dark:border-white/20 flex items-center px-3 py-2 sm:py-2.5">
                <Search size={14} className="text-slate-500 mr-2 shrink-0" />
                <select 
                  value={searchQuery}
                  onChange={handleSearchSelect}
                  className="bg-transparent border-none outline-none text-xs font-bold text-slate-700 dark:text-slate-200 w-full cursor-pointer appearance-none truncate pr-2"
                >
                  <option value="">Search Farmer...</option>
                  {farmers.sort((a,b) => a.full_name.localeCompare(b.full_name)).map(f => (
                    <option key={f.id} value={f.id}>{f.full_name}</option>
                  ))}
                </select>
              </div>

              {/* Toggles */}
              <div className="pointer-events-auto flex flex-col gap-2 shrink-0">
                <button onClick={() => setMapTheme(prev => prev === 'satellite' ? (isDarkMode ? 'dark' : 'light') : 'satellite')} className={`p-2.5 rounded-xl shadow-md border border-slate-200 dark:border-white/20 backdrop-blur-md transition-all ${mapTheme === 'satellite' ? 'bg-indigo-600 text-white' : 'bg-white/90 dark:bg-black/60 text-slate-500'}`}>
                  <Globe size={16} />
                </button>
                <button onClick={handleLocateMe} className="bg-white/90 dark:bg-black/60 backdrop-blur-md p-2.5 rounded-xl shadow-md border border-slate-200 dark:border-white/20 text-blue-600 hover:bg-blue-50 transition-all flex justify-center">
                  <Navigation size={16} />
                </button>
              </div>
            </div>

            {/* Bottom Legend */}
            <div className="pointer-events-auto bg-white/90 dark:bg-black/70 backdrop-blur-md p-3 sm:p-4 rounded-2xl shadow-md border border-slate-200 dark:border-white/20 w-fit">
               <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-400 mb-2 border-b dark:border-white/10 pb-1">AI Risk Index</h4>
               <div className="flex flex-col gap-1.5">
                 <span className="flex items-center gap-2 text-[9px] font-bold text-emerald-600 dark:text-emerald-400"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500"/> Secure (Low)</span>
                 <span className="flex items-center gap-2 text-[9px] font-bold text-amber-600 dark:text-amber-400"><div className="w-2.5 h-2.5 rounded-full bg-amber-500"/> Monitor (Med)</span>
                 <span className="flex items-center gap-2 text-[9px] font-bold text-rose-600 dark:text-rose-400"><div className="w-2.5 h-2.5 rounded-full bg-rose-500"/> Critical (High)</span>
               </div>
            </div>
          </div>

          <MapContainer center={mapCenter} zoom={mapZoom} scrollWheelZoom={true} zoomControl={false} style={{ height: '100%', width: '100%', backgroundColor: 'transparent' }}>
            <ZoomControl position="bottomright" />
            <TileLayer key={mapTheme} url={mapTiles[mapTheme]} maxZoom={19} />
            <MapController center={mapCenter} zoom={mapZoom} />
            {userLocation && (
              <Marker position={userLocation} icon={userIcon}>
                <Popup className="font-sans font-bold">You are here</Popup>
              </Marker>
            )}
            <MapMarkers data={farmers} onSelectFarm={setSelectedFarm} />
          </MapContainer>
        </div>

        {/* RIGHT SIDE: ML DETAILS SIDEBAR */}
        <div className="w-full lg:w-1/3 h-[50vh] lg:h-full overflow-y-auto bg-white dark:bg-[#0b241f] rounded-[2rem] shadow-xl border border-slate-100 dark:border-white/5 p-5 sm:p-6 no-scrollbar">
          {selectedFarm ? (
            <div className="animate-in slide-in-from-right-4 duration-300">
              <header className="border-b border-slate-100 dark:border-white/10 pb-3 mb-4">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight truncate">{selectedFarm.full_name}</h2>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-[9px] flex items-center gap-1.5 mt-1 truncate">
                  <MapPin size={12}/> {selectedFarm.barangay?.name || "Unassigned"}
                </p>
              </header>

              {/* ML CARD */}
              <div className={`p-4 sm:p-5 rounded-2xl border-2 transition-all ${
                selectedFarm.riskLevel === 'High' ? 'bg-rose-50 border-rose-200 dark:bg-rose-950/30 dark:border-rose-500/30' : 
                selectedFarm.riskLevel === 'Medium' ? 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-500/30' : 
                'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-500/30'}`}>
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-1.5">
                    <BrainCircuit className={selectedFarm.riskLevel === 'High' ? 'text-rose-500' : selectedFarm.riskLevel === 'Medium' ? 'text-amber-500' : 'text-emerald-500'} size={16} />
                    <h3 className={`font-black uppercase tracking-widest text-[9px] ${
                      selectedFarm.riskLevel === 'High' ? 'text-rose-700 dark:text-rose-400' : 
                      selectedFarm.riskLevel === 'Medium' ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                      AI Abandonment Risk
                    </h3>
                  </div>
                  <span className={`text-2xl font-black tracking-tighter ${
                    selectedFarm.riskLevel === 'High' ? 'text-rose-600' : 
                    selectedFarm.riskLevel === 'Medium' ? 'text-amber-600' : 'text-emerald-600'}`}>{selectedFarm.riskScore}%</span>
                </div>
                <p className="text-[10px] sm:text-xs font-bold text-slate-700 dark:text-slate-300 leading-snug">
                  {selectedFarm.riskLevel === 'High' ? "CRITICAL: High probability of abandonment in 5 yrs due to lack of succession/age." : selectedFarm.riskLevel === 'Medium' ? "WARNING: Moderate risk. Monitor yield and succession." : "STABLE: Strong indicators for long-term viability."}
                </p>
              </div>

              {/* DEMOGRAPHICS GRID */}
              <div className="grid grid-cols-2 gap-2.5 mt-4">
                 <div className="bg-slate-50 dark:bg-white/5 p-3 rounded-xl border border-slate-100 dark:border-white/5">
                   <p className="text-[8px] uppercase font-black text-slate-400 tracking-widest mb-0.5 flex items-center gap-1"><User size={10}/> Age</p>
                   <p className="text-base font-black text-slate-800 dark:text-white leading-none">{selectedFarm.age} <span className="text-[8px] text-slate-400">YRS</span></p>
                 </div>
                 <div className="bg-slate-50 dark:bg-white/5 p-3 rounded-xl border border-slate-100 dark:border-white/5">
                   <p className="text-[8px] uppercase font-black text-slate-400 tracking-widest mb-0.5 flex items-center gap-1"><Users size={10}/> Successors</p>
                   <p className={`text-base font-black leading-none ${!selectedFarm.children_farming_involvement ? 'text-rose-500' : 'text-emerald-500'}`}>
                     {selectedFarm.number_of_children} <span className="text-[8px] text-slate-400">{selectedFarm.children_farming_involvement ? 'Actv' : 'Inactv'}</span>
                   </p>
                 </div>
                 <div className="bg-slate-50 dark:bg-white/5 p-3 rounded-xl border border-slate-100 dark:border-white/5">
                   <p className="text-[8px] uppercase font-black text-slate-400 tracking-widest mb-0.5 flex items-center gap-1"><Sprout size={10}/> Crop</p>
                   <p className="text-xs font-black text-slate-800 dark:text-white truncate">{selectedFarm.crop}</p>
                 </div>
                 <div className="bg-slate-50 dark:bg-white/5 p-3 rounded-xl border border-slate-100 dark:border-white/5">
                   <p className="text-[8px] uppercase font-black text-slate-400 tracking-widest mb-0.5 flex items-center gap-1"><MapPin size={10}/> Size</p>
                   <p className="text-base font-black text-slate-800 dark:text-white leading-none">{selectedFarm.farm_size_hectares} <span className="text-[8px] text-slate-400">HA</span></p>
                 </div>
              </div>

              {/* VULNERABILITIES */}
              <div className="mt-4">
                <p className="text-[8px] uppercase font-black text-slate-400 tracking-widest mb-2 flex items-center gap-1"><TrendingDown size={10}/> Heuristic Factors</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedFarm.issues.length > 0 ? selectedFarm.issues.map((issue, idx) => (
                    <span key={idx} className="px-2 py-1 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 rounded-md text-[9px] font-black uppercase tracking-wider border border-rose-200 dark:border-rose-500/20">
                      {issue}
                    </span>
                  )) : (
                    <span className="text-[10px] font-bold text-emerald-500 italic flex items-center gap-1"><ShieldCheck size={12}/> No major risks</span>
                  )}
                </div>
              </div>

            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
               <MapPin size={32} className="mb-3" />
               <p className="text-[9px] font-black uppercase tracking-[0.2em]">Awaiting Selection</p>
               <p className="text-[10px] font-bold mt-1 max-w-[150px] text-center">Tap a geospatial marker to execute analysis.</p>
            </div>
          )}
        </div>

      </div>

      {/* Global CSS Map Overrides */}
      <style dangerouslySetInnerHTML={{ __html: `
        .leaflet-container { font-family: inherit; touch-action: none; }
        .leaflet-popup-content-wrapper { background: transparent !important; box-shadow: none !important; padding: 0 !important; }
        .leaflet-popup-content { margin: 0 !important; width: auto !important; }
        .leaflet-popup-tip { background: ${isDarkMode ? '#041d18' : '#ffffff'} !important; }
        .custom-tooltip { 
          background-color: ${isDarkMode ? '#041d18' : '#ffffff'} !important; 
          color: ${isDarkMode ? 'white' : '#0f172a'} !important; 
          border: 1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} !important; 
          border-radius: 8px; padding: 4px 8px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.2); 
        }
        .leaflet-tooltip-top:before { border-top-color: ${isDarkMode ? '#041d18' : '#ffffff'} !important; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(156, 163, 175, 0.5); border-radius: 4px; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .leaflet-control-zoom a {
            background-color: ${isDarkMode ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.9)'} !important;
            color: ${isDarkMode ? '#e2e8f0' : '#475569'} !important;
            border: 1px solid ${isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'} !important;
            backdrop-filter: blur(8px);
        }
      `}} />
    </div>
  );
}