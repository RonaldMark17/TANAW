import React, { useState, useEffect } from 'react';
import { Download, X, Share, PlusSquare, Smartphone } from 'lucide-react';

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // 1. Check if the app is ALREADY installed
    const isCurrentlyStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    if (isCurrentlyStandalone) {
      setIsStandalone(true);
      return; // Do not show the prompt if they are already in the app
    }

    // 2. Detect iOS (Apple doesn't support the automatic install prompt)
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    if (isIosDevice && !isCurrentlyStandalone) {
      // Show the manual instruction banner for iOS users
      setIsVisible(true);
    }

    // 3. Listen for the native install prompt (Android / Chrome / Edge)
    const handleBeforeInstallPrompt = (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e);
      setIsInstallable(true);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 4. Listen for successful installation
    window.addEventListener('appinstalled', () => {
      setIsVisible(false);
      setDeferredPrompt(null);
      setIsInstallable(false);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Show the native install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
      setIsVisible(false);
    }
    
    // We can only use the prompt once, so clear it
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  if (!isVisible || isStandalone) return null;

  return (
    <div className="fixed bottom-4 left-0 right-0 z-[9999] px-4 pointer-events-none flex justify-center animate-in slide-in-from-bottom-10 duration-700">
      <div className="bg-white border border-slate-200 shadow-2xl rounded-2xl p-4 sm:p-5 flex items-center gap-4 max-w-md w-full pointer-events-auto relative">
        
        {/* Close Button */}
        <button 
          onClick={() => setIsVisible(false)}
          className="absolute -top-2 -right-2 bg-white border border-slate-200 text-slate-400 hover:text-slate-600 rounded-full p-1 shadow-sm transition-colors"
        >
          <X size={14} />
        </button>

        {/* Icon */}
        <div className="p-3 bg-emerald-50 rounded-xl shrink-0">
          <Smartphone className="text-emerald-600 w-6 h-6" />
        </div>

        {/* Content */}
        <div className="flex-1">
          <h4 className="text-sm font-extrabold text-slate-900 tracking-tight leading-none mb-1">
            Install TANAW
          </h4>
          
          {isIOS ? (
            <p className="text-[11px] text-slate-500 font-medium leading-snug">
              Install this app on your iPhone: tap <Share className="inline w-3 h-3 mx-0.5" /> and then <strong>Add to Home Screen</strong> <PlusSquare className="inline w-3 h-3 mx-0.5" />.
            </p>
          ) : (
            <p className="text-[11px] text-slate-500 font-medium leading-snug">
              Install the system hub for faster load times and offline field encoding.
            </p>
          )}
        </div>

        {/* Android/Desktop Install Button */}
        {isInstallable && (
          <button 
            onClick={handleInstallClick}
            className="shrink-0 bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest shadow-md hover:bg-slate-800 active:scale-95 transition-all flex items-center gap-1.5"
          >
            <Download size={14} /> Install
          </button>
        )}

      </div>
    </div>
  );
}