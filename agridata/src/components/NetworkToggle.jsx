// src/components/NetworkToggle.jsx
import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff } from 'lucide-react';

export default function NetworkToggle() {
    const [isForcedOffline, setIsForcedOffline] = useState(
        localStorage.getItem('force_offline') === 'true'
    );

    useEffect(() => {
        const handleToggle = () => {
            const newState = localStorage.getItem('force_offline') === 'true';
            setIsForcedOffline(newState);
        };

        window.addEventListener('network-mode-change', handleToggle);

        return () => {
            window.removeEventListener('network-mode-change', handleToggle);
        };
    }, []);

    const toggleMode = () => {
        const newState = !isForcedOffline;
        setIsForcedOffline(newState);

        // Save the setting to the phone
        localStorage.setItem('force_offline', newState);

        // Notify the app
        window.dispatchEvent(new Event('network-mode-change'));
    };

    // 🔥 Completely invisible (no UI rendered)
    return null;
}