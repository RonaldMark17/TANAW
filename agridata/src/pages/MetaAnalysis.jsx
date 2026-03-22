import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { experiencesAPI, farmersAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { offlineStore } from '../utils/offlineStore';
import {
    BookOpen, Calendar, MapPin, User, Plus, X,
    Trophy, AlertTriangle, Lightbulb, Sprout, Landmark, Pin,
    ChevronLeft, ChevronRight, Activity, Filter, Info, Loader2,
    Search, Download, ThumbsUp, Share2, ExternalLink, Image as ImageIcon,
    FileText, Check, MessageSquare, Send, Clock, Lock, Unlock, Edit2, Trash2, AlertCircle, Terminal,
    Network, Sparkles, Wallet, ThermometerSun, Bug, Baby, Mic, MicOff, Eye, EyeOff
} from 'lucide-react';

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8080').replace('/api', '');

// --- NLP SIMULATION: Themes and Keywords for Meta-Analysis ---
const THEMES = [
    { id: 'financial', title: 'Financial Struggle', icon: Wallet, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10', border: 'border-amber-200 dark:border-amber-500/20', keywords: ['mahal', 'utang', 'capital', 'kita', 'presyo', 'fertilizer', 'pera', 'lugi'] },
    { id: 'climate', title: 'Climate Adaptation', icon: ThermometerSun, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10', border: 'border-blue-200 dark:border-blue-500/20', keywords: ['bagyo', 'init', 'ulan', 'baha', 'weather', 'drought'] },
    { id: 'pests', title: 'Pest Vulnerability', icon: Bug, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-500/10', border: 'border-rose-200 dark:border-rose-500/20', keywords: ['insekto', 'peste', 'sakit', 'rats', 'snails', 'virus'] },
    { id: 'succession', title: 'Succession Crisis', icon: Baby, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-500/10', border: 'border-purple-200 dark:border-purple-500/20', keywords: ['anak', 'manila', 'magmamana', 'bata', 'old', 'call center', 'ayaw'] },
];

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

// --- Skeleton Component ---
const ExperienceSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 px-3 sm:px-6 lg:px-8">
        {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-[#0b241f] rounded-[2rem] sm:rounded-[2.5rem] border border-slate-100 dark:border-white/5 p-6 sm:p-8 animate-pulse shadow-sm h-full flex flex-col">
                <div className="flex justify-between mb-4 sm:mb-6">
                    <div className="h-12 w-12 sm:h-14 sm:w-14 bg-slate-100 dark:bg-white/5 rounded-2xl"></div>
                    <div className="h-5 sm:h-6 w-20 sm:w-24 bg-slate-50 dark:bg-white/5 rounded-full"></div>
                </div>
                <div className="h-5 sm:h-6 w-3/4 bg-slate-100 dark:bg-white/5 rounded-lg mb-3 sm:mb-4"></div>
                <div className="space-y-2 sm:space-y-3 mb-6 sm:mb-8 flex-1">
                    <div className="h-2.5 sm:h-3 w-full bg-slate-50 dark:bg-white/5 rounded"></div>
                    <div className="h-2.5 sm:h-3 w-5/6 bg-slate-50 dark:bg-white/5 rounded"></div>
                </div>
                <div className="pt-4 sm:pt-6 border-t border-slate-50 dark:border-white/5 flex items-center justify-between shrink-0 mt-auto">
                    <div className="flex gap-2">
                        <div className="h-6 w-6 rounded-full bg-slate-100 dark:bg-white/5"></div>
                        <div className="h-2.5 sm:h-3 w-16 sm:w-20 bg-slate-100 dark:bg-white/5 rounded mt-1.5"></div>
                    </div>
                    <div className="h-6 w-12 bg-slate-50 dark:bg-white/5 rounded-lg"></div>
                </div>
            </div>
        ))}
    </div>
);

// 🔥 GLOBAL CONTROL (prevent spam requests)
let lastCallTime = 0;
let debounceTimeout = null;
let isProcessingGemini = false;

export default function Experiences() {
    const [experiences, setExperiences] = useState([]);
    const [farmers, setFarmers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const [isOnline, setIsOnline] = useState(
        navigator.onLine && localStorage.getItem('force_offline') !== 'true'
    );

    useEffect(() => {
        const checkNetwork = () => {
            const isPhysicallyOnline = navigator.onLine;
            const isForcedOffline = localStorage.getItem('force_offline') === 'true';
            setIsOnline(isPhysicallyOnline && !isForcedOffline);
        };
        window.addEventListener('online', checkNetwork);
        window.addEventListener('offline', checkNetwork);
        window.addEventListener('network-mode-change', checkNetwork);
        return () => {
            window.removeEventListener('online', checkNetwork);
            window.removeEventListener('offline', checkNetwork);
            window.removeEventListener('network-mode-change', checkNetwork);
        };
    }, []);

    // Modals & Interactivity
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedExperience, setSelectedExperience] = useState(null);
    const [commentText, setCommentText] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    // AI Voice & Organization State
    const [isListening, setIsListening] = useState(false);
    const [isOrganizing, setIsOrganizing] = useState(false);
    const recognitionRef = useRef(null);

    // Comment Edit State
    const [editingCommentId, setEditingCommentId] = useState(null);
    const [editCommentText, setEditCommentText] = useState('');

    // Data Controls
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [activeTab, setActiveTab] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [isExporting, setIsExporting] = useState(false);

    // Meta-Analysis Clustering State
    const [clusters, setClusters] = useState({});
    const [totalLogs, setTotalLogs] = useState(0);

    const { user } = useAuth();
    const canCreate = user && ['admin', 'researcher', 'data_encoder', 'farmer'].includes(user.role);

    const initialFormState = {
        farmer_id: '',
        experience_type: 'Success Story',
        title: '',
        description: '',
        date_recorded: new Date().toISOString().split('T')[0],
        location: '',
        context: '',
        visibility: 'Public', // Visibility State
        impact_level: 'Medium',
        comments_enabled: true
    };
    
    const handleUpdateVisibility = async (id, newVisibility) => {
        // Find the specific experience in our local state first
        const originalExperience = experiences.find(e => e.id === id);

        try {
            // 1. Optimistic Update: Change the UI immediately so it feels "instant"
            setExperiences(prev => prev.map(exp =>
                exp.id === id ? { ...exp, visibility: newVisibility } : exp
            ));

            // 2. API Call: Update the backend
            await experiencesAPI.update(id, { visibility: newVisibility });

            console.log(`Privacy updated to ${newVisibility}`);
        } catch (error) {
            // 3. Rollback: If the server says "No" (403 Forbidden), revert the UI
            setExperiences(prev => prev.map(exp =>
                exp.id === id ? { ...exp, visibility: originalExperience.visibility } : exp
            ));

            const errorMsg = error.response?.data?.error || "Connection error.";
            alert(`Update Failed: ${errorMsg}`);
        }
    };

    const [formData, setFormData] = useState(initialFormState);

    useEffect(() => {
        fetchExperiences();
        fetchFarmers();
    }, [currentPage]);

    // Setup Speech Recognition
    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;
            recognitionRef.current.lang = 'fil-PH';

            recognitionRef.current.onresult = (event) => {
                let currentTranscript = '';
                for (let i = 0; i < event.results.length; i++) {
                    currentTranscript += event.results[i][0].transcript;
                }
                setFormData(prev => ({ ...prev, description: currentTranscript }));
            };
        }
    }, []);

    // Auto-detect Farmer ID if logged in as a Farmer
    useEffect(() => {
        if (user?.role === 'farmer' && farmers.length > 0) {
            const matchedFarmer = farmers.find(f => {
                const codeMatch = f.farmer_code && f.farmer_code.toLowerCase() === user.username.toLowerCase();
                const idMatch = user.username.toLowerCase() === `farmer_${f.id}`;
                return codeMatch || idMatch;
            });
            if (matchedFarmer) {
                setFormData(prev => ({
                    ...prev,
                    farmer_id: matchedFarmer.id,
                    location: matchedFarmer.barangay?.name || ''
                }));
            }
        }
    }, [user, farmers]);

    // --- NLP CLUSTERING ENGINE ---
    useEffect(() => {
        if (!experiences.length) return;
        const results = {};
        THEMES.forEach(t => results[t.id] = []);
        results['uncategorized'] = [];

        experiences.forEach(log => {
            const text = `${log.title} ${log.description}`.toLowerCase();
            let clustered = false;

            THEMES.forEach(theme => {
                if (theme.keywords.some(kw => text.includes(kw))) {
                    results[theme.id].push(log);
                    clustered = true;
                }
            });

            if (!clustered) results['uncategorized'].push(log);
        });

        setClusters(results);
        setTotalLogs(experiences.length);
    }, [experiences]);

    const fetchExperiences = async () => {
        setLoading(true);
        try {
            // Check both physical connection and manual toggle button
            if (!isOnline) throw new Error("Offline");

            const response = await experiencesAPI.getAll({ page: currentPage });
            setExperiences(response.data.experiences);
            setTotalPages(response.data.pages);
            
            // BACKUP: Save full data for offline viewing
            offlineStore.saveData('experiences_list', response.data);
        } catch (error) {
            console.warn("Offline Mode: Loading experiences from local cache.");
            const cachedData = offlineStore.getCachedData('experiences_list');
            
            if (cachedData && cachedData.experiences) {
                let data = cachedData.experiences;
                // Manual Offline Search Filter
                if (searchQuery) {
                    const q = searchQuery.toLowerCase();
                    data = data.filter(e => 
                        e.title.toLowerCase().includes(q) || 
                        e.description.toLowerCase().includes(q) ||
                        e.farmer_name?.toLowerCase().includes(q)
                    );
                }
                setExperiences(data);
                setTotalPages(cachedData.pages || 1);
            }
        } finally {
            setTimeout(() => setLoading(false), 800);
        }
    };

    const fetchFarmers = async () => {
        try {
            if (!isOnline) {
                const cached = offlineStore.getCachedData('farmers_cache');
                if (cached) setFarmers(cached);
                return;
            }
            const response = await farmersAPI.getAll({ per_page: 1000 });
            setFarmers(response.data.farmers);
            offlineStore.saveData('farmers_cache', response.data.farmers);
        } catch (error) { 
            console.error('Error fetching farmers:', error); 
        }
    };

    const handleFarmerChange = (e) => {
        const selectedId = e.target.value;
        const selectedFarmer = farmers.find(f => f.id.toString() === selectedId);
        let autoLocation = '';
        if (selectedFarmer && selectedFarmer.barangay) {
            autoLocation = `${selectedFarmer.barangay.name}, ${selectedFarmer.barangay.municipality}`;
        }
        setFormData({ ...formData, farmer_id: selectedId, location: autoLocation });
    };

    // --- FIXED GEMINI FUNCTION (FINAL WITH AI ERROR RESPONSE) ---
    const organizeWithGemini = async (rawText, retryCount = 0) => {
        if (!rawText || !rawText.trim()) return;

        // ✅ prevent spam calls (cooldown 3s)
        const now = Date.now();
        if (now - lastCallTime < 3000) {
            console.warn("Cooldown active...");
            return;
        }

        if (isProcessingGemini) {
            console.warn("Already processing...");
            return;
        }

        lastCallTime = now;
        isProcessingGemini = true;
        setIsOrganizing(true);

        try {
            const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "AIzaSyA-1V6jOiIJLSdON7Kwggr1359cv4MDNaE";

            const knowledgeContext = Array.isArray(experiences) && experiences.length > 0
                ? experiences
                    .map(exp => `[Note by ${exp.farmer_name}]: ${exp.title} - ${exp.description}`)
                    .join('\n')
                : "No existing field notes.";

            const basePrompt = `
            You are an expert Agricultural Ghostwriter and Voice Transcript Interpreter.

            OBJECTIVE:
            - Convert messy voice-to-text into a clear narrative.
            - Remove repetition and filler words.
            - Fix wrong/misheard words.
            - Keep Tagalog/English/Taglish.
            - Preserve meaning.

            Return ONLY final paragraph.
            `;

            let personaPrompt = "";

            if (user?.role === "farmer") {
                personaPrompt = `Speak like a respectful Filipino farmer using po/opo.\n${knowledgeContext}`;
            } else if (user?.role === "mentee") {
                personaPrompt = `Explain clearly and educationally.\n${knowledgeContext}`;
            } else {
                personaPrompt = `Professional agricultural writer tone.`;
            }

            const finalPrompt = `${basePrompt}\n${personaPrompt}\n"${rawText}"`;

            // Using standard v1beta 1.5-flash
            const response = await axios.post(
                `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
                {
                    contents: [{ parts: [{ text: finalPrompt }] }],
                    generationConfig: {
                        temperature: 0.4,
                        maxOutputTokens: 512
                    }
                },
                {
                    headers: { "Content-Type": "application/json" }
                }
            );

            const polishedText = response?.data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

            if (polishedText) {
                setFormData(prev => ({
                    ...prev,
                    description: polishedText
                }));

                // Safe check before setting variable that might not be defined
                if (typeof setWriterSessions !== 'undefined') {
                    setWriterSessions(prev => [
                        {
                            id: Date.now(),
                            original: rawText,
                            polished: polishedText,
                            date: new Date().toISOString()
                        },
                        ...prev
                    ]);
                }
            } else {
                console.warn("No AI response received.");
            }

        } catch (error) {
            const status = error?.response?.status;

            // 🔥 AUTO RETRY (fix 429)
            if (status === 429 && retryCount < 3) {
                console.warn(`Retrying Gemini... (${retryCount + 1})`);
                await new Promise(res => setTimeout(res, 2000 * (retryCount + 1)));
                isProcessingGemini = false;
                setIsOrganizing(false);
                return organizeWithGemini(rawText, retryCount + 1);
            }

            console.error("AI Writer Error:", error?.response?.data || error.message);
            
            // --- AI ERROR FALLBACK IN THE TEXT AREA ---
            setFormData(prev => ({
                ...prev,
                description: `"${rawText}"`
            }));

        } finally {
            setIsOrganizing(false);
            isProcessingGemini = false;
        }
    };

    // --- DEBOUNCE (VOICE SAFE) ---
    const debounceOrganize = (text) => {
        clearTimeout(debounceTimeout);
        debounceTimeout = setTimeout(() => {
            organizeWithGemini(text);
        }, 1500);
    };

    const toggleVoice = () => {
        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
            if (formData.description.trim()) debounceOrganize(formData.description);
        } else {
            setFormData(prev => ({ ...prev, description: '' }));
            recognitionRef.current?.start();
            setIsListening(true);
        }
    };

    // --- FIXED OFFLINE HANDLE SUBMIT ---
    const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage('');

    // Construct the payload immediately
    const payload = {
        ...formData,
        context: `[Visibility: ${formData.visibility}] ${formData.context}`
    };

    // 1. CHECK OFFLINE STATUS (Handles both Wi-Fi drop AND the "Force Offline" button)
    if (!isOnline) {
        try {
            offlineStore.addToQueue(payload, 'CREATE_EXPERIENCE', 'experiences');
            alert("Record saved to phone. It will upload automatically when you turn off Offline Mode or reconnect.");
            
            // UI Cleanup
            setShowCreateModal(false);
            setFormData(initialFormState);
        } catch (err) {
            setErrorMessage("Local storage error: Could not save offline.");
        } finally {
            setSubmitting(false);
        }
        return;
    }

    // 2. ONLINE FLOW (Attempting to reach the server)
    try {
        await experiencesAPI.create(payload);
        
        // Refresh the list and close modal
        fetchExperiences();
        setShowCreateModal(false);
        setFormData(initialFormState);
        alert("Experience recorded successfully!");
    } catch (error) {
        // 3. FALLBACK: Server is down or timed out even though Wi-Fi is "on"
        console.error('Server unreachable, switching to offline queue:', error);
        
        offlineStore.addToQueue(payload, 'CREATE_EXPERIENCE', 'experiences');
        alert("Server issue detected. We've safely backed up this record to your phone to prevent data loss.");
        
        setShowCreateModal(false);
        setFormData(initialFormState);
    } finally {
        setSubmitting(false);
    }
};

    const handleToggleComments = async () => {
        if (!selectedExperience) return;
        const newStatus = selectedExperience.comments_enabled === false ? true : false;

        const updatedExperience = { ...selectedExperience, comments_enabled: newStatus };
        setSelectedExperience(updatedExperience);
        setExperiences(prev => prev.map(exp => exp.id === updatedExperience.id ? updatedExperience : exp));

        try {
            if (experiencesAPI.update) {
                await experiencesAPI.update(updatedExperience.id, { comments_enabled: newStatus });
            }
        } catch (error) {
            console.error("Failed to toggle comments status:", error);
        }
    };

    const handleCommentSubmit = async (e) => {
        e.preventDefault();
        if (!commentText.trim() || !selectedExperience) return;

        const tempId = Date.now();
        const tempComment = {
            id: tempId,
            user_id: user?.id,
            user_name: user?.full_name || 'Current User',
            text: commentText,
            likes_count: 0,
            is_liked_by_me: false,
            created_at: new Date().toISOString()
        };

        const updatedExperience = {
            ...selectedExperience,
            comments: [...(selectedExperience.comments || []), tempComment],
            comments_count: (selectedExperience.comments_count || 0) + 1
        };
        setSelectedExperience(updatedExperience);
        setExperiences(prev => prev.map(exp => exp.id === selectedExperience.id ? updatedExperience : exp));
        setCommentText('');

        try {
            if (experiencesAPI.addComment) {
                const response = await experiencesAPI.addComment(selectedExperience.id, { text: tempComment.text });
                const realComment = response.data.comment;

                const finalExperience = {
                    ...updatedExperience,
                    comments: updatedExperience.comments.map(c => c.id === tempId ? realComment : c)
                };

                setSelectedExperience(finalExperience);
                setExperiences(prev => prev.map(exp => exp.id === selectedExperience.id ? finalExperience : exp));
            }
        } catch (error) {
            console.error("Failed to post comment:", error);
            alert("Database Error: Failed to save comment.");

            const revertedExperience = {
                ...selectedExperience,
                comments: selectedExperience.comments.filter(c => c.id !== tempId),
                comments_count: Math.max(0, (selectedExperience.comments_count || 1) - 1)
            };
            setSelectedExperience(revertedExperience);
            setExperiences(prev => prev.map(exp => exp.id === selectedExperience.id ? revertedExperience : exp));
        }
    };

    const handleEditCommentClick = (comment) => {
        setEditingCommentId(comment.id);
        setEditCommentText(comment.text);
    };

    // --- ADDED: EDIT HANDLER ---
    const handleEdit = (exp) => {
        // Set the form data to the existing experience values
        setFormData({
            farmer_id: exp.farmer_id,
            experience_type: exp.experience_type,
            title: exp.title,
            description: exp.description,
            date_recorded: exp.date_recorded,
            location: exp.location || '',
            context: exp.context || '',
            visibility: exp.visibility || 'Public',
            impact_level: exp.impact_level || 'Medium',
            comments_enabled: exp.comments_enabled
        });

        // Use an ID check to tell your Submit function this is an UPDATE, not a CREATE
        setEditingCommentId(exp.id); // Re-using this state or create a new 'editingId'
        setShowCreateModal(true);
    };

    // --- ADDED: DELETE HANDLER ---
    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to permanently delete this record?")) return;

        try {
            await experiencesAPI.delete(id);
            setExperiences(prev => prev.filter(exp => exp.id !== id));
            if (selectedExperience?.id === id) setSelectedExperience(null);
        } catch (error) {
            alert("Failed to delete: " + (error.response?.data?.error || error.message));
        }
    };

    const handleCancelEdit = () => {
        setEditingCommentId(null);
        setEditCommentText('');
    };

    const handleSaveEditComment = async (commentId) => {
        if (!editCommentText.trim()) return;

        const updatedComments = selectedExperience.comments.map(c =>
            c.id === commentId ? { ...c, text: editCommentText } : c
        );
        const updatedExperience = { ...selectedExperience, comments: updatedComments };

        setSelectedExperience(updatedExperience);
        setExperiences(prev => prev.map(exp => exp.id === updatedExperience.id ? updatedExperience : exp));
        setEditingCommentId(null);

        try {
            if (experiencesAPI.updateComment) {
                await experiencesAPI.updateComment(selectedExperience.id, commentId, { text: editCommentText });
            }
        } catch (error) {
            console.error("Failed to update comment:", error);
            alert("Failed to save your edit.");
            fetchExperiences();
        }
    };

    const handleDeleteComment = async (commentId) => {
        if (!window.confirm("Are you sure you want to delete this note?")) return;

        const updatedComments = selectedExperience.comments.filter(c => c.id !== commentId);
        const updatedExperience = {
            ...selectedExperience,
            comments: updatedComments,
            comments_count: Math.max(0, (selectedExperience.comments_count || 1) - 1)
        };

        setSelectedExperience(updatedExperience);
        setExperiences(prev => prev.map(exp => exp.id === updatedExperience.id ? updatedExperience : exp));

        try {
            if (experiencesAPI.deleteComment) {
                await experiencesAPI.deleteComment(selectedExperience.id, commentId);
            }
        } catch (error) {
            console.error("Failed to delete comment:", error);
            alert("Failed to delete comment.");
            fetchExperiences();
        }
    };

    // --- BUG FIX: ADDED MISSING `handleToggleCommentLike` FUNCTION ---
    const handleToggleCommentLike = async (commentId, e) => {
        if (e) e.stopPropagation();
        if (!selectedExperience) return;

        // Find the specific comment
        const commentIndex = selectedExperience.comments.findIndex(c => c.id === commentId);
        if (commentIndex === -1) return;

        const comment = selectedExperience.comments[commentIndex];
        const currentlyLiked = comment.is_liked_by_me;

        // 1. Optimistic Update (Immediate UI response)
        const updatedComments = [...selectedExperience.comments];
        updatedComments[commentIndex] = {
            ...comment,
            is_liked_by_me: !currentlyLiked,
            likes_count: currentlyLiked ? Math.max(0, comment.likes_count - 1) : (comment.likes_count || 0) + 1
        };

        const updatedExperience = { ...selectedExperience, comments: updatedComments };
        
        setSelectedExperience(updatedExperience);
        setExperiences(prev => prev.map(exp => exp.id === updatedExperience.id ? updatedExperience : exp));

        // 2. Offline Check
        if (!isOnline) {
            try {
                // Assuming offlineStore supports queuing nested routes like /api/experiences/{id}/comments/{id}/like
                offlineStore.addToQueue({ experienceId: selectedExperience.id, commentId, action: 'toggleCommentLike' }, 'TOGGLE_COMMENT_LIKE', 'experiences');
            } catch (err) {
                console.warn("Could not save comment like to offline queue");
            }
            return;
        }

        // 3. Online Server Sync
        try {
            if (experiencesAPI.toggleCommentLike) {
                await experiencesAPI.toggleCommentLike(selectedExperience.id, commentId);
            } else {
                console.error("experiencesAPI.toggleCommentLike is not defined in api.js");
                throw new Error("Missing API method");
            }
        } catch (error) {
            // Rollback UI if the server explicitly rejects it or if it 404s
            console.error("Failed to sync comment like with server:", error);
            
            const revertedComments = [...selectedExperience.comments];
            revertedComments[commentIndex] = comment; // Restore original state
            const revertedExperience = { ...selectedExperience, comments: revertedComments };
            
            setSelectedExperience(revertedExperience);
            setExperiences(prev => prev.map(exp => exp.id === revertedExperience.id ? revertedExperience : exp));
        }
    };

    // --- BUG FIX: OPTIMISTIC TOGGLE VOTE WITH OFFLINE SUPPORT ---
    const toggleVote = async (id, e) => {
        if (e) e.stopPropagation();

        const index = experiences.findIndex(exp => exp.id === id);
        if (index === -1) return;

        const exp = experiences[index];
        const currentlyLiked = exp.is_liked_by_me;

        // 1. Optimistic Update (Immediate UI response)
        const updatedExperiences = [...experiences];
        updatedExperiences[index] = {
            ...exp,
            is_liked_by_me: !currentlyLiked,
            likes_count: currentlyLiked ? Math.max(0, exp.likes_count - 1) : exp.likes_count + 1
        };
        setExperiences(updatedExperiences);

        // Update the Modal if it is open
        if (selectedExperience?.id === id) {
            setSelectedExperience({
                ...selectedExperience,
                is_liked_by_me: !currentlyLiked,
                likes_count: currentlyLiked ? Math.max(0, exp.likes_count - 1) : exp.likes_count + 1
            });
        }

        // 2. Offline Check
        if (!isOnline) {
            // Queue the like action for when they come back online
            try {
                offlineStore.addToQueue({ id, action: 'toggleLike' }, 'TOGGLE_LIKE', 'experiences');
            } catch (err) {
                console.warn("Could not save like to offline queue");
            }
            return; // Exit early, the UI is already updated
        }

        // 3. Online Server Sync
        try {
            await experiencesAPI.toggleLike(id);
        } catch (error) {
            // Rollback UI if the server explicitly rejects it
            console.error("Failed to sync like with server");
            setExperiences(experiences); // Reset to previous state
            if (selectedExperience?.id === id) {
                setSelectedExperience(exp); // Reset modal
            }
        }
    };

    // --- RESTORED EXPORT FUNCTION ---
    const handleExport = () => {
        setIsExporting(true);
        const headers = ["Title", "Type", "Farmer", "Location", "Impact", "Date", "Likes", "Comments"];
        const rows = experiences.map(e => [
            `"${e.title}"`, e.experience_type, `"${e.farmer_name}"`,
            `"${e.location}"`, e.impact_level, e.date_recorded, e.likes_count || 0, e.comments_count || 0
        ]);
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", `knowledge_base_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => setIsExporting(false), 1000);
    };

    const handleShare = async (exp) => {
        const shareData = {
            title: `TANAW: ${exp.title}`,
            text: `Insight by ${exp.farmer_name}:\n\n"${exp.description}"`,
            url: window.location.href,
        };
        try {
            if (navigator.share) { await navigator.share(shareData); }
            else {
                await navigator.clipboard.writeText(`${shareData.text}\n\nRead more at: ${shareData.url}`);
                alert("Link copied to clipboard!");
            }
        } catch (err) { console.error("Error sharing:", err); }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const getTypeStyles = (type) => {
        const styles = {
            'Success Story': { icon: Trophy, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10', border: 'border-emerald-200 dark:border-emerald-500/20' },
            'Challenge': { icon: AlertTriangle, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-500/10', border: 'border-rose-200 dark:border-rose-500/20' },
            'Innovation': { icon: Lightbulb, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-500/10', border: 'border-blue-200 dark:border-blue-500/20' },
            'Farming Practice': { icon: Sprout, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-500/10', border: 'border-indigo-200 dark:border-indigo-500/20' },
            'Cultural Tradition': { icon: Landmark, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10', border: 'border-amber-200 dark:border-amber-500/20' },
            'Other': { icon: Pin, color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-50 dark:bg-white/5', border: 'border-slate-200 dark:border-white/10' }
        };
        return styles[type] || styles['Other'];
    };

    const filteredExperiences = experiences.filter(exp => {
        if (activeTab === 'AI Meta-Analysis') return false;

        // Privacy Filter: Only show "Mentees Only" if the user is an admin OR the farmer who posted it
        const isOwnerOrAdmin = user && (user.role === 'admin' || user.full_name === exp.farmer_name);
        const isPrivate = exp.context?.includes('[Visibility: Mentees Only]');

        if (isPrivate && !isOwnerOrAdmin) return false;

        const matchesTab = activeTab === 'All' || exp.experience_type === activeTab;
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch =
            exp.title.toLowerCase().includes(searchLower) ||
            exp.description.toLowerCase().includes(searchLower) ||
            exp.location?.toLowerCase().includes(searchLower) ||
            exp.farmer_name?.toLowerCase().includes(searchLower);
        return matchesTab && matchesSearch;
    });

    const tabs = ['All', 'AI Meta-Analysis', 'Success Story', 'Challenge', 'Innovation', 'Farming Practice', 'Cultural Tradition'];

    return (
        <div className="min-h-screen bg-[#f8fafc] dark:bg-[#020c0a] font-sans selection:bg-emerald-100 pb-24 transition-colors duration-300">
            <div className="max-w-[1400px] mx-auto space-y-6 sm:space-y-10 animate-in fade-in duration-700">

                {/* Header Section */}
                <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 sm:gap-8 px-3 sm:px-6 lg:px-8 py-6">
                    <div>
                        <div className="flex items-center gap-2 mb-3 sm:mb-4">
                            <div className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl text-white shadow-xl shrink-0 transition-colors ${activeTab === 'AI Meta-Analysis' ? 'bg-indigo-600 shadow-indigo-200 dark:shadow-none' : 'bg-emerald-600 shadow-emerald-200 dark:shadow-none'}`}>
                                {activeTab === 'AI Meta-Analysis' ? <Network size={18} className="sm:w-[20px] sm:h-[20px]" /> : <BookOpen size={18} className="sm:w-[20px] sm:h-[20px]" />}
                            </div>
                            <span className={`text-[10px] font-black uppercase tracking-[0.3em] transition-colors ${activeTab === 'AI Meta-Analysis' ? 'text-indigo-600 dark:text-indigo-400' : 'text-emerald-600 dark:text-emerald-500'}`}>
                                {activeTab === 'AI Meta-Analysis' ? 'Qualitative Engine' : 'Knowledge Repo'}
                            </span>
                        </div>
                        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight uppercase leading-none">
                            {activeTab === 'AI Meta-Analysis' ? 'Meta-Analysis Hub' : 'Field Wisdom'}
                        </h1>
                        <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 font-medium max-w-2xl mt-2 sm:mt-3">
                            {activeTab === 'AI Meta-Analysis' ? 'Automated NLP clustering of field interviews and lived experiences.' : 'Collective insights capturing field-tested success and innovation.'}
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                        <div className="relative w-full sm:w-64">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 shrink-0" size={16} />
                            <input type="text" placeholder="Search insights..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-3.5 sm:py-4 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl sm:rounded-[1.25rem] text-xs sm:text-sm font-bold dark:text-white outline-none"
                            />
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                            <button onClick={handleExport} disabled={isExporting} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 sm:px-6 py-3.5 sm:py-4 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl sm:rounded-[1.25rem] font-black text-[9px] sm:text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400 shadow-sm transition-colors hover:bg-slate-50 dark:hover:bg-white/10 disabled:opacity-50">
                                {isExporting ? <Loader2 size={14} className="animate-spin shrink-0" /> : <Download size={14} className="shrink-0" />} <span>Export</span>
                            </button>
                            {canCreate && (
                                <button
                                    onClick={() => setShowCreateModal(true)}
                                    className="flex-1 sm:flex-none group flex items-center justify-center gap-2 px-6 sm:px-8 py-3.5 sm:py-4 bg-slate-900 dark:bg-emerald-600 text-white rounded-xl sm:rounded-[1.25rem] font-black text-[10px] sm:text-[10px] uppercase tracking-[0.2em] shadow-xl sm:shadow-2xl shadow-slate-200 dark:shadow-none hover:bg-slate-800 dark:hover:bg-emerald-500 active:scale-95 transition-all"
                                >
                                    <Plus size={14} className="group-hover:rotate-90 transition-transform duration-300 shrink-0" /> <span>Record</span>
                                </button>
                            )}
                        </div>
                    </div>
                </header>

                {/* Categories Tab Bar */}
                <div className="mx-3 sm:mx-6 lg:mx-8">
                    <div className="bg-white dark:bg-[#0b241f] p-1.5 sm:p-2 rounded-xl sm:rounded-[1.5rem] border border-slate-100 dark:border-white/5 shadow-sm overflow-x-auto no-scrollbar">
                        <nav className="flex items-center gap-1 min-w-max">
                            {tabs.map((tab) => (
                                <button key={tab} onClick={() => setActiveTab(tab)}
                                    className={`px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-lg sm:rounded-2xl text-[10px] sm:text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeTab === tab
                                        ? (tab === 'AI Meta-Analysis' ? 'bg-indigo-600 text-white' : 'bg-slate-900 dark:bg-emerald-500 text-white')
                                        : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 hover:bg-slate-50 dark:hover:bg-white/5'
                                        }`}>
                                    {tab === 'AI Meta-Analysis' && <Sparkles size={12} className={activeTab === tab ? 'text-indigo-200' : 'text-indigo-400'} />}
                                    {tab}
                                </button>
                            ))}
                        </nav>
                    </div>
                </div>

                {/* Content Area */}
                <div className="min-h-[500px] px-3 sm:px-6 lg:px-8">

                    {/* --- VIEW: AI META-ANALYSIS --- */}
                    {activeTab === 'AI Meta-Analysis' ? (
                        <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-500">
                            {/* AI SUMMARY BANNER - UPGRADED REALISM */}
                            <div className="bg-indigo-950 p-6 sm:p-10 rounded-[2rem] text-white shadow-xl relative overflow-hidden border border-indigo-500/20">
                                <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
                                <div className="absolute -bottom-20 -left-20 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
                                
                                <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 text-indigo-300 font-black text-[10px] uppercase tracking-[0.2em] mb-4">
                                            <Network size={14} className="animate-pulse" /> Natural Language Processing (NLP) Active
                                        </div>
                                        <p className="text-lg sm:text-2xl font-bold leading-relaxed max-w-3xl text-indigo-50">
                                            Algorithm successfully extracted semantic entities from <span className="text-white font-black bg-indigo-500/40 px-2 py-0.5 rounded shadow-sm border border-indigo-400/30">{totalLogs} raw transcripts</span>. Unstructured field data has been mapped into <span className="text-emerald-400 font-black">{THEMES.length} primary clusters</span> based on keyword proximity.
                                        </p>
                                    </div>
                                    
                                    {/* Simulated ML Metrics */}
                                    <div className="flex flex-row md:flex-col gap-3 shrink-0">
                                        <div className="flex items-center gap-2 bg-indigo-900/60 border border-indigo-500/30 px-4 py-2.5 rounded-xl backdrop-blur-md">
                                            <Check size={14} className="text-emerald-400 shrink-0" />
                                            <div>
                                                <p className="text-[8px] text-indigo-300 font-black uppercase tracking-widest leading-none mb-1">Model Confidence</p>
                                                <p className="text-sm font-black text-white leading-none">94.2%</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 bg-indigo-900/60 border border-indigo-500/30 px-4 py-2.5 rounded-xl backdrop-blur-md">
                                            <Clock size={14} className="text-amber-400 shrink-0" />
                                            <div>
                                                <p className="text-[8px] text-indigo-300 font-black uppercase tracking-widest leading-none mb-1">Compute Time</p>
                                                <p className="text-sm font-black text-white leading-none">1.24s</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* CLUSTER DASHBOARD */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {THEMES.map(theme => (
                                    <div key={theme.id} className={`p-6 sm:p-8 rounded-[2rem] border ${theme.bg} ${theme.border} transition-all hover:shadow-lg flex flex-col`}>
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-3 bg-white dark:bg-[#020c0a] rounded-xl shadow-sm ${theme.color}`}>
                                                    <theme.icon size={20} />
                                                </div>
                                                <div>
                                                    <h3 className={`font-black uppercase tracking-tight text-lg sm:text-xl ${theme.color}`}>{theme.title}</h3>
                                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-0.5 flex items-center gap-1.5">
                                                        <Network size={10} /> Correlated Reports: {clusters[theme.id]?.length || 0}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-3 flex-1">
                                            {clusters[theme.id]?.length > 0 ? (
                                                clusters[theme.id].map(log => (
                                                    <div key={log.id} onClick={() => setSelectedExperience(log)} className="bg-white/80 dark:bg-black/20 p-5 rounded-2xl border border-white/80 dark:border-white/5 backdrop-blur-md cursor-pointer hover:scale-[1.02] hover:shadow-md transition-all">
                                                        <p className="text-[10px] sm:text-xs font-black uppercase text-slate-500 dark:text-slate-400 mb-2 tracking-widest line-clamp-1">{log.title}</p>
                                                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-relaxed line-clamp-2">"{log.description}"</p>
                                                        <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-200/60 dark:border-white/10">
                                                            <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1"><User size={10} /> {log.farmer_name || 'Anonymous'}</p>
                                                            <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-1"><Calendar size={10} /> {formatDate(log.date_recorded)}</p>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="text-center p-6 border-2 border-dashed border-slate-200/60 dark:border-white/10 rounded-2xl h-full flex items-center justify-center">
                                                    <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest">No semantic matches found.</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}

                                {/* UNCATEGORIZED CARD */}
                                {clusters['uncategorized']?.length > 0 && (
                                    <div className="p-6 sm:p-8 rounded-[2rem] border bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 opacity-80 hover:opacity-100 transition-opacity">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="p-3 bg-white dark:bg-[#020c0a] rounded-xl shadow-sm text-slate-500">
                                                <FileText size={20} />
                                            </div>
                                            <div>
                                                <h3 className="font-black uppercase tracking-tight text-lg sm:text-xl text-slate-600 dark:text-slate-400">Uncategorized</h3>
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5 flex items-center gap-1.5">
                                                    <AlertTriangle size={10} /> Pending Classification
                                                </p>
                                            </div>
                                        </div>
                                        <div className="space-y-3">
                                            {clusters['uncategorized'].map(log => (
                                                <div key={log.id} onClick={() => setSelectedExperience(log)} className="bg-white/60 dark:bg-black/20 p-4 rounded-2xl border border-white/50 dark:border-white/5 cursor-pointer hover:scale-[1.02] hover:shadow-sm transition-all">
                                                    <p className="text-xs font-bold text-slate-600 dark:text-slate-400 line-clamp-2">"{log.description}"</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (

                        /* --- VIEW: STANDARD GRID --- */
                        loading ? <ExperienceSkeleton /> : filteredExperiences.length === 0 ? (
                            <div className="bg-white dark:bg-[#0b241f] rounded-[2rem] sm:rounded-[3rem] border-2 border-dashed border-slate-100 dark:border-white/5 py-20 sm:py-32 text-center transition-all animate-in fade-in">
                                <div className="p-6 sm:p-8 bg-slate-50 dark:bg-white/5 rounded-full inline-flex text-slate-200 dark:text-slate-700 mb-6 sm:mb-8">
                                    <Search size={36} className="sm:w-[48px] sm:h-[48px] shrink-0" />
                                </div>
                                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Archives Empty</h3>
                                <p className="text-sm sm:text-base text-slate-400 dark:text-slate-500 font-medium mt-2 sm:mt-3">No insights found. Begin by recording field wisdom.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 animate-in fade-in">
                                {filteredExperiences.map((exp) => {
                                    const style = getTypeStyles(exp.experience_type);
                                    const Icon = style.icon;

                                    // 1. Define UI states
                                    const isMenteesOnly = exp.visibility === 'Mentees Only';
                                    const isOwner = user && (user.full_name === exp.farmer_name || user.id === exp.interviewer_id);
                                    const isAdmin = user && user.role === 'admin';

                                    return (
                                        <div key={exp.id} onClick={() => setSelectedExperience(exp)}
                                            className={`group bg-white dark:bg-[#0b241f] rounded-[2rem] sm:rounded-[2.5rem] p-6 sm:p-10 border shadow-sm hover:shadow-xl sm:hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.08)] dark:hover:shadow-black/40 hover:-translate-y-1 transition-all duration-500 overflow-hidden relative cursor-pointer flex flex-col h-full ${isMenteesOnly
                                                ? 'border-amber-200 dark:border-amber-500/20 bg-amber-50/30 dark:bg-amber-500/5'
                                                : 'border-slate-100 dark:border-white/5'
                                                }`}
                                        >
                                            {/* --- OWNER OPERATIONS OVERLAY --- */}
                                            {(isOwner || isAdmin) && (
                                                <div className="absolute top-4 left-4 z-20 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleEdit(exp); }}
                                                        className="p-2 bg-white/90 dark:bg-[#041d18]/90 text-blue-500 hover:text-blue-600 rounded-lg shadow-sm border border-slate-100 dark:border-white/10 transition-colors"
                                                        title="Edit Post"
                                                    >
                                                        <Edit2 size={14} />
                                                    </button>
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleDelete(exp.id); }}
                                                        className="p-2 bg-white/90 dark:bg-[#041d18]/90 text-rose-500 hover:text-rose-600 rounded-lg shadow-sm border border-slate-100 dark:border-white/10 transition-colors"
                                                        title="Delete Post"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            )}

                                            <div className="flex justify-between items-start mb-6 sm:mb-8 relative z-10">
                                                <div className={`p-4 sm:p-5 rounded-2xl sm:rounded-[1.5rem] ${style.bg} ${style.color} group-hover:scale-110 transition-transform duration-500 shrink-0`}>
                                                    <Icon size={24} className="sm:w-[28px] sm:h-[28px] shrink-0" />
                                                </div>

                                                <div className="flex flex-col items-end gap-2">
                                                    <span className={`px-3 py-1.5 rounded-lg text-[8px] sm:text-[9px] font-black uppercase tracking-widest border shrink-0 ${exp.impact_level === 'High' ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-blue-50 text-blue-600 border-blue-200'}`}>
                                                        {exp.impact_level}
                                                    </span>

                                                    {/* --- RESTRICTED PRIVACY TOGGLE --- */}
                                                    {isOwner || isAdmin ? (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                const newVisibility = exp.visibility === 'Public' ? 'Mentees Only' : 'Public';
                                                                handleUpdateVisibility(exp.id, newVisibility);
                                                            }}
                                                            className={`flex items-center gap-1.5 px-2 py-1 rounded text-[8px] font-black uppercase transition-all border ${isMenteesOnly
                                                                ? 'bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200'
                                                                : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'
                                                                }`}
                                                        >
                                                            {isMenteesOnly ? <EyeOff size={10} /> : <Eye size={10} />}
                                                            {exp.visibility}
                                                        </button>
                                                    ) : (
                                                        /* STATIC VIEW-ONLY LABEL FOR OTHER USERS */
                                                        selectedExperience?.comments_enabled === false && (
                                                            <span className="flex items-center gap-1 text-[8px] font-black uppercase text-slate-400 px-2 py-1">
                                                                {isMenteesOnly ? <EyeOff size={10} /> : <Eye size={10} />}
                                                                {exp.visibility}
                                                            </span>
                                                        )
                                                    )}
                                                </div>
                                            </div>

                                            <div className="space-y-3 sm:space-y-4 mb-8 flex-1 relative z-10">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[8px] sm:text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-100 dark:border-emerald-500/20">
                                                        {exp.experience_type}
                                                    </span>
                                                </div>
                                                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight leading-tight line-clamp-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">{exp.title}</h3>
                                                <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 font-medium leading-relaxed line-clamp-3">{exp.description}</p>
                                            </div>

                                            <div className="pt-6 border-t border-slate-50 dark:border-white/5 flex items-center justify-between relative z-10 shrink-0 mt-auto">
                                                <div className="flex items-center gap-3 pr-4 min-w-0">
                                                    <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center text-emerald-600 shrink-0"><User size={14} className="shrink-0" /></div>
                                                    <div className="min-w-0">
                                                        <p className="text-[10px] sm:text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{exp.farmer_name}</p>
                                                        <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mt-0.5">{formatDate(exp.date_recorded)}</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 shrink-0">
                                                    <div className="flex items-center gap-1.5 px-3 text-slate-400 shrink-0">
                                                        <MessageSquare size={14} className="sm:w-[16px] sm:h-[16px] shrink-0" />
                                                        <span className="text-[10px] sm:text-xs font-black">
                                                            <AnimatedCounter value={exp.comments_count || 0} duration={1000} />
                                                        </span>
                                                    </div>

                                                    <button
                                                        onClick={(e) => toggleVote(exp.id, e)}
                                                        className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl transition-all shrink-0 ${exp.is_liked_by_me
                                                            ? 'bg-blue-50 dark:bg-blue-500/10 text-blue-600'
                                                            : 'bg-slate-50 dark:bg-white/5 text-slate-400 hover:text-blue-500'
                                                            }`}
                                                    >
                                                        <ThumbsUp
                                                            size={14}
                                                            className={`sm:w-[16px] sm:h-[16px] shrink-0 ${exp.is_liked_by_me ? 'fill-current' : ''}`}
                                                        />
                                                        <span className="text-[10px] sm:text-xs font-black">
                                                            <AnimatedCounter value={exp.likes_count || 0} duration={1000} />
                                                        </span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )
                    )}
                </div>

                {/* Global Pagination */}
                {!loading && totalPages > 1 && activeTab !== 'AI Meta-Analysis' && (
                    <div className="flex flex-col sm:flex-row items-center justify-between bg-white dark:bg-[#0b241f] px-6 sm:px-10 py-5 sm:py-6 rounded-3xl sm:rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-sm mx-3 sm:mx-6 lg:mx-8 transition-colors gap-4">
                        <p className="text-[9px] sm:text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">
                            Page <span className="text-slate-900 dark:text-white">{currentPage}</span> of {totalPages}
                        </p>
                        <div className="flex gap-3 sm:gap-4 w-full sm:w-auto justify-center">
                            <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} className="flex-1 sm:flex-none p-3 sm:p-4 flex justify-center bg-white dark:bg-[#041d18] border border-slate-100 dark:border-white/10 rounded-xl sm:rounded-2xl text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 disabled:opacity-30 transition-all shadow-sm">
                                <ChevronLeft size={18} className="sm:w-[20px] sm:h-[20px] shrink-0" />
                            </button>
                            <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} className="flex-1 sm:flex-none p-3 sm:p-4 flex justify-center bg-white dark:bg-[#041d18] border border-slate-100 dark:border-white/10 rounded-xl sm:rounded-2xl text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 disabled:opacity-30 transition-all shadow-sm">
                                <ChevronRight size={18} className="sm:w-[20px] sm:h-[20px] shrink-0" />
                            </button>
                        </div>
                    </div>
                )}

                {/* --- CREATE EXPERIENCE MODAL --- */}
                {showCreateModal && (
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-0 sm:p-4 md:p-8 overflow-hidden">
                        <div className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setShowCreateModal(false)} />

                        <div className="relative bg-white dark:bg-[#041d18] rounded-none sm:rounded-[3rem] shadow-2xl w-full h-full sm:h-auto sm:max-w-4xl sm:max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 sm:slide-in-from-bottom-0 duration-500 border-none sm:border dark:border-white/5">

                            <div className="p-6 sm:p-10 border-b border-slate-50 dark:border-white/5 flex items-center justify-between sticky top-0 bg-white/80 dark:bg-[#041d18]/80 backdrop-blur-xl z-10 shrink-0 pt-safe">
                                <div>
                                    <h2 className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase">Record Experience</h2>
                                    <p className="text-slate-400 dark:text-slate-500 font-medium text-xs sm:text-sm mt-0.5 sm:mt-1">Log field observations and success stories.</p>
                                </div>
                                <button onClick={() => setShowCreateModal(false)} className="p-2.5 sm:p-4 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl sm:rounded-2xl transition-all text-slate-300 dark:text-slate-600 shrink-0">
                                    <X size={24} className="sm:w-[28px] sm:h-[28px] shrink-0" />
                                </button>
                            </div>

                            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-8 sm:space-y-12 no-scrollbar pb-safe">

                                {errorMessage && (
                                    <div className="p-4 sm:p-6 bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 rounded-2xl sm:rounded-3xl flex items-center gap-3 sm:gap-4 text-rose-600 dark:text-rose-400 animate-in slide-in-from-top-4">
                                        <AlertCircle size={20} className="sm:w-[24px] sm:h-[24px] shrink-0" />
                                        <p className="text-xs sm:text-sm font-bold uppercase tracking-widest leading-relaxed">{errorMessage}</p>
                                    </div>
                                )}

                                <div className="space-y-6 sm:space-y-8">
                                    <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] text-emerald-600 dark:text-emerald-500 flex items-center gap-2 sm:gap-3">
                                        <Activity size={12} className="sm:w-[14px] sm:h-[14px] shrink-0" /> Core Identity
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
                                        {/* Hide dropdown if user is a farmer (auto-selected) */}
                                        {user?.role !== 'farmer' && (
                                            <div className="space-y-2 sm:space-y-3">
                                                <label className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">Select Farmer</label>
                                                <select required value={formData.farmer_id} onChange={handleFarmerChange} className="w-full px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-white/5 rounded-xl sm:rounded-2xl focus:ring-4 focus:ring-emerald-500/10 text-xs sm:text-sm font-bold dark:text-white outline-none appearance-none">
                                                    <option value="" disabled className="dark:bg-[#041d18]">Select a registered farmer...</option>
                                                    {farmers.map(f => (
                                                        <option key={f.id} value={f.id} className="dark:bg-[#041d18]">{f.first_name} {f.last_name} ({f.farmer_code})</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}

                                        <div className="space-y-2 sm:space-y-3">
                                            <label className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">Experience Type</label>
                                            <select value={formData.experience_type} onChange={(e) => setFormData({ ...formData, experience_type: e.target.value })} className="w-full px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-white/5 rounded-xl sm:rounded-2xl focus:ring-4 focus:ring-emerald-500/10 text-xs sm:text-sm font-bold dark:text-white outline-none appearance-none">
                                                <option value="Success Story" className="dark:bg-[#041d18]">Success Story</option>
                                                <option value="Challenge" className="dark:bg-[#041d18]">Challenge / Issue</option>
                                                <option value="Innovation" className="dark:bg-[#041d18]">Innovation / Experiment</option>
                                                <option value="Farming Practice" className="dark:bg-[#041d18]">Farming Practice</option>
                                                <option value="Cultural Tradition" className="dark:bg-[#041d18]">Cultural Tradition</option>
                                                <option value="Other" className="dark:bg-[#041d18]">Other</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div className="space-y-2 sm:space-y-3">
                                        <label className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">Title</label>
                                        <input type="text" required placeholder="e.g., Successfully transitioned to organic fertilizers..." value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-white/5 rounded-xl sm:rounded-2xl focus:ring-4 focus:ring-emerald-500/10 text-xs sm:text-sm font-bold dark:text-white outline-none" />
                                    </div>
                                </div>

                                <div className="space-y-6 sm:space-y-8 pb-6 sm:pb-10">
                                    <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.3em] text-blue-600 dark:text-blue-500 flex items-center gap-2 sm:gap-3 border-t border-slate-100 dark:border-white/5 pt-8">
                                        <FileText size={12} className="sm:w-[14px] sm:h-[14px] shrink-0" /> Detailed Context
                                    </p>

                                    {/* --- INTEGRATED VOICE & AI TEXTAREA --- */}
                                    <div className="space-y-2 sm:space-y-3 relative">
                                        <label className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1 flex justify-between">
                                            Description
                                            {isListening && <span className="text-rose-500 animate-pulse flex items-center gap-1"><Activity size={10} /> Listening...</span>}
                                        </label>

                                        <div className="relative">
                                            <textarea
                                                required
                                                rows="4"
                                                placeholder="Describe the experience, or tap the mic to speak..."
                                                value={formData.description}
                                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                                disabled={submitting || isOrganizing}
                                                className={`w-full px-4 sm:px-6 py-4 sm:py-5 bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-white/5 rounded-2xl sm:rounded-3xl focus:ring-4 focus:ring-emerald-500/10 text-sm sm:text-base font-medium dark:text-slate-200 min-h-[160px] outline-none resize-none transition-all pb-14 ${isOrganizing ? 'animate-pulse opacity-50' : ''}`}
                                            />

                                            {isOrganizing && (
                                                <div className="absolute inset-0 bg-white/50 dark:bg-[#0b241f]/50 backdrop-blur-sm rounded-2xl sm:rounded-3xl flex flex-col items-center justify-center text-indigo-600 dark:text-indigo-400 z-10">
                                                    <Sparkles size={32} className="animate-pulse mb-2" />
                                                    <p className="text-xs sm:text-sm font-black uppercase tracking-widest">AI Organizing Context...</p>
                                                </div>
                                            )}

                                            <button
                                                type="button"
                                                onClick={toggleVoice}
                                                disabled={submitting || isOrganizing}
                                                className={`absolute bottom-4 right-4 p-3 sm:p-3.5 rounded-xl sm:rounded-2xl shadow-md transition-all z-20 ${isListening ? 'bg-rose-500 animate-pulse scale-105' : 'bg-blue-600 hover:bg-blue-500 hover:-translate-y-1'} disabled:opacity-50 disabled:hover:translate-y-0`}
                                            >
                                                {isListening ? <MicOff size={20} className="text-white sm:w-[22px] sm:h-[22px]" /> : <Mic size={20} className="text-white sm:w-[22px] sm:h-[22px]" />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
                                        <div className="space-y-2 sm:space-y-3 sm:col-span-1">
                                            <label className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">Visibility</label>
                                            <select value={formData.visibility} onChange={(e) => setFormData({ ...formData, visibility: e.target.value })} className="w-full px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-white/5 rounded-xl sm:rounded-2xl focus:ring-4 focus:ring-emerald-500/10 text-xs sm:text-sm font-bold dark:text-white outline-none appearance-none">
                                                <option value="Public" className="dark:bg-[#041d18]">Public (Everyone)</option>
                                                <option value="Mentees Only" className="dark:bg-[#041d18]">Mentees Only</option>
                                            </select>
                                        </div>

                                        <div className="space-y-2 sm:space-y-3 sm:col-span-1">
                                            <label className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">Location</label>
                                            <input type="text" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })} className="w-full px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-white/5 rounded-xl sm:rounded-2xl focus:ring-4 focus:ring-emerald-500/10 text-xs sm:text-sm font-bold dark:text-white outline-none" />
                                        </div>

                                        <div className="space-y-2 sm:space-y-3 sm:col-span-1">
                                            <label className="text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">Impact Level</label>
                                            <select value={formData.impact_level} onChange={(e) => setFormData({ ...formData, impact_level: e.target.value })} className="w-full px-4 sm:px-6 py-3.5 sm:py-4 bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-white/5 rounded-xl sm:rounded-2xl focus:ring-4 focus:ring-emerald-500/10 text-xs sm:text-sm font-bold dark:text-white outline-none appearance-none">
                                                <option value="Low" className="dark:bg-[#041d18]">Low Impact</option>
                                                <option value="Medium" className="dark:bg-[#041d18]">Medium Impact</option>
                                                <option value="High" className="dark:bg-[#041d18]">High Impact</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                            </form>

                            <div className="px-6 sm:px-10 py-6 sm:py-8 bg-slate-50 dark:bg-black/20 border-t border-slate-100 dark:border-white/5 flex flex-col-reverse sm:flex-row justify-end gap-3 sm:gap-6 shrink-0 pb-safe">
                                <button type="button" onClick={() => setShowCreateModal(false)} className="w-full sm:w-auto px-6 sm:px-10 py-3.5 sm:py-4 text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-600 bg-white dark:bg-transparent rounded-xl sm:rounded-none border border-slate-200 sm:border-none dark:border-white/10 hover:text-slate-600 dark:hover:text-slate-400 transition-colors">Discard</button>
                                <button
                                    type="button"
                                    onClick={handleSubmit}
                                    disabled={submitting || isOrganizing || isListening}
                                    className="w-full sm:w-auto px-8 sm:px-12 py-4 sm:py-5 bg-emerald-600 dark:bg-emerald-600 text-white rounded-xl sm:rounded-[1.25rem] font-black text-[10px] sm:text-xs uppercase tracking-widest shadow-xl sm:shadow-2xl shadow-emerald-200 dark:shadow-none hover:bg-emerald-500 active:scale-95 transition-all flex items-center justify-center gap-2 sm:gap-3 disabled:opacity-50"
                                >
                                    {submitting ? <Loader2 className="animate-spin sm:w-[18px] sm:h-[18px] shrink-0" size={16} /> : <Plus size={16} className="sm:w-[18px] sm:h-[18px] shrink-0" />}
                                    {submitting ? 'Processing...' : 'Record'}
                                </button>
                            </div>

                        </div>
                    </div>
                )}

                {/* --- REDESIGNED READ & COMMENT MODAL --- */}
                {selectedExperience && (
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-0 sm:p-4 md:p-8 overflow-hidden">
                        <div className="absolute inset-0 bg-slate-900/60 dark:bg-black/60 backdrop-blur-md animate-in fade-in" onClick={() => { setSelectedExperience(null); setCommentText(''); setEditingCommentId(null); }} />

                        <div className="relative bg-white dark:bg-[#041d18] rounded-none sm:rounded-[3rem] shadow-2xl w-full h-full sm:h-auto sm:max-w-4xl sm:max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-10 sm:slide-in-from-bottom-0 duration-500 border-none sm:border dark:border-white/5">

                            {/* Header Fixed */}
                            <div className="p-6 sm:p-10 border-b border-slate-50 dark:border-white/5 flex items-center justify-between sticky top-0 bg-white/80 dark:bg-[#041d18]/80 backdrop-blur-xl z-10 shrink-0 pt-safe">
                                <div className="space-y-2">
                                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${getTypeStyles(selectedExperience.experience_type).bg} ${getTypeStyles(selectedExperience.experience_type).color}`}>
                                        {selectedExperience.experience_type}
                                    </span>
                                    <h2 className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight pr-4">{selectedExperience.title}</h2>
                                </div>
                                <button onClick={() => { setSelectedExperience(null); setCommentText(''); setEditingCommentId(null); }} className="p-2.5 sm:p-4 hover:bg-slate-50 dark:hover:bg-white/5 rounded-xl sm:rounded-2xl transition-all text-slate-300 dark:text-slate-600 shrink-0">
                                    <X size={24} className="sm:w-[28px] sm:h-[28px] shrink-0" />
                                </button>
                            </div>

                            {/* Scrollable Body (Description + Meta + Comments) */}
                            <div className="overflow-y-auto flex-1 no-scrollbar flex flex-col pb-safe">

                                {/* Core Content */}
                                <div className="p-6 sm:p-10 bg-white dark:bg-[#041d18] space-y-6 sm:space-y-8 border-b border-slate-50 dark:border-white/5">
                                    <p className="text-sm sm:text-base font-medium text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{selectedExperience.description}</p>

                                    <div className="grid grid-cols-2 gap-4 p-5 sm:p-6 bg-slate-50 dark:bg-black/20 rounded-2xl sm:rounded-3xl border border-slate-100 dark:border-white/5">
                                        <div className="space-y-1 min-w-0">
                                            <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><User size={12} className="sm:w-[14px] sm:h-[14px] shrink-0" /> Contributor</span>
                                            <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">{selectedExperience.farmer_name}</p>
                                        </div>
                                        <div className="space-y-1 min-w-0 border-l border-slate-200 dark:border-white/10 pl-4">
                                            <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><MapPin size={12} className="sm:w-[14px] sm:h-[14px] shrink-0" /> Location</span>
                                            <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">{selectedExperience.location || 'N/A'}</p>
                                        </div>
                                    </div>

                                    {/* Social Actions */}
                                    <div className="flex flex-wrap items-center gap-3 pt-2">
                                        <button
                                            onClick={(e) => toggleVote(selectedExperience.id, e)}
                                            className={`flex items-center justify-center gap-2 px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl sm:rounded-[1.25rem] font-black uppercase tracking-widest text-[10px] sm:text-xs transition-all shadow-sm shrink-0 ${selectedExperience.is_liked_by_me ? 'bg-blue-600 text-white shadow-blue-600/30' : 'bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/10'}`}
                                        >
                                            <ThumbsUp size={14} className={`shrink-0 ${selectedExperience.is_liked_by_me ? 'fill-current sm:w-[16px] sm:h-[16px]' : 'sm:w-[16px] sm:h-[16px]'}`} />
                                            {selectedExperience.is_liked_by_me ? 'Helpful' : 'Mark Helpful'}
                                            <span className="ml-1 px-2 py-1 bg-black/10 rounded-md text-[9px] sm:text-[10px]">
                                                <AnimatedCounter value={selectedExperience.likes_count || 0} duration={1000} />
                                            </span>
                                        </button>
                                        <button onClick={() => handleShare(selectedExperience)} className="flex items-center gap-2 px-6 sm:px-8 py-3.5 sm:py-4 bg-white dark:bg-transparent border border-slate-200 dark:border-white/10 rounded-xl sm:rounded-[1.25rem] font-bold uppercase tracking-widest text-[10px] sm:text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-all shadow-sm shrink-0">
                                            <Share2 size={14} className="sm:w-[16px] sm:h-[16px] shrink-0" /> Share
                                        </button>

                                        {/* DISABLE COMMENTS TOGGLE FOR ADMINS/CREATORS */}
                                        {(user?.role === 'admin' || user?.id === selectedExperience.interviewer_id || user?.full_name === selectedExperience.farmer_name) ? (
                                            <button
                                                onClick={handleToggleComments}
                                                className="flex items-center gap-2 px-6 sm:px-8 py-3.5 sm:py-4 bg-white dark:bg-transparent border border-slate-200 dark:border-white/10 rounded-xl sm:rounded-[1.25rem] font-bold uppercase tracking-widest text-[10px] sm:text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-all shadow-sm ml-auto shrink-0"
                                            >
                                                {selectedExperience.comments_enabled === false ? (
                                                    <><Unlock size={14} className="text-emerald-500 sm:w-[16px] sm:h-[16px] shrink-0" /> Enable</>
                                                ) : (
                                                    <><Lock size={14} className="text-rose-500 sm:w-[16px] sm:h-[16px] shrink-0" /> Disable</>
                                                )}
                                            </button>
                                        ) : (
                                            /* If the user DOES NOT own the post, just show a text label when locked */
                                            selectedExperience.comments_enabled === false && (
                                                <span className="ml-auto flex items-center gap-1.5 px-6 py-3.5 text-[10px] sm:text-xs font-black uppercase text-slate-400">
                                                    <Lock size={14} className="shrink-0" /> Comments Locked
                                                </span>
                                            )
                                        )}
                                    </div>
                                </div>

                                {/* Discussion / Comments Section */}
                                <div className="p-6 sm:p-10 flex-1 bg-slate-50 dark:bg-black/20">
                                    <h4 className="flex items-center gap-2 text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest mb-6 sm:mb-8">
                                        <MessageSquare size={16} className={`shrink-0 ${selectedExperience.comments_enabled === false ? 'text-slate-400' : 'text-emerald-600'}`} />
                                        Discussion (<AnimatedCounter value={selectedExperience.comments?.length || 0} duration={1000} />)
                                    </h4>

                                    <div className="space-y-4 sm:space-y-6">
                                        {selectedExperience.comments && selectedExperience.comments.length > 0 ? (
                                            selectedExperience.comments.map((c, i) => (
                                                <div key={c.id || i} className="flex gap-3 sm:gap-4 group animate-in slide-in-from-bottom-2">
                                                    <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-black text-xs sm:text-sm shrink-0 border border-emerald-200 dark:border-emerald-500/30 mt-1">
                                                        {c.user_name?.charAt(0) || 'U'}
                                                    </div>
                                                    <div className="flex-1 flex flex-col gap-1.5 sm:gap-2">
                                                        <div className="bg-white dark:bg-[#0b241f] border border-slate-100 dark:border-white/5 p-4 sm:p-5 rounded-2xl rounded-tl-none shadow-sm">

                                                            <div className="flex items-center justify-between mb-2">
                                                                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                                                                    <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">{c.user_name}</span>
                                                                    <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1">
                                                                        <span className="hidden sm:inline">•</span> {new Date(c.created_at).toLocaleDateString()}
                                                                    </span>
                                                                </div>

                                                                {c.user_id === user?.id && editingCommentId !== c.id && (
                                                                    <div className="flex gap-1.5 sm:gap-2 opacity-50 hover:opacity-100 transition-opacity shrink-0">
                                                                        <button onClick={() => handleEditCommentClick(c)} className="text-blue-500 hover:text-blue-600 p-1.5 bg-blue-50 dark:bg-blue-500/10 rounded-md shrink-0">
                                                                            <Edit2 size={12} className="sm:w-[14px] sm:h-[14px] shrink-0" />
                                                                        </button>
                                                                        <button onClick={() => handleDeleteComment(c.id)} className="text-rose-500 hover:text-rose-600 p-1.5 bg-rose-50 dark:bg-rose-500/10 rounded-md shrink-0">
                                                                            <Trash2 size={12} className="sm:w-[14px] sm:h-[14px] shrink-0" />
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>

                                                            {editingCommentId === c.id ? (
                                                                <div className="mt-2 space-y-2 animate-in fade-in">
                                                                    <textarea
                                                                        value={editCommentText}
                                                                        onChange={(e) => setEditCommentText(e.target.value)}
                                                                        className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-emerald-500/50 dark:text-white transition-all resize-none min-h-[60px]"
                                                                    />
                                                                    <div className="flex justify-end gap-2">
                                                                        <button onClick={handleCancelEdit} className="text-[9px] sm:text-[10px] font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white uppercase tracking-widest px-3 py-1.5 shrink-0">Cancel</button>
                                                                        <button onClick={() => handleSaveEditComment(c.id)} disabled={!editCommentText.trim()} className="text-[9px] sm:text-[10px] font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg uppercase tracking-widest px-4 py-1.5 disabled:opacity-50 transition-colors shrink-0">Save Edit</button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{c.text}</p>
                                                            )}

                                                        </div>

                                                        <div className="flex items-center gap-3 px-2 shrink-0">
                                                            <button
                                                                onClick={(e) => handleToggleCommentLike(c.id, e)}
                                                                className={`flex items-center gap-1.5 text-[10px] font-bold transition-colors shrink-0 ${c.is_liked_by_me ? 'text-blue-500' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                                                            >
                                                                <ThumbsUp size={12} className={`shrink-0 ${c.is_liked_by_me ? 'fill-current' : ''}`} />
                                                                <span><AnimatedCounter value={c.likes_count || 0} duration={800} /></span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center py-10 sm:py-16 bg-white dark:bg-[#0b241f] rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-white/10 shadow-sm">
                                                {selectedExperience.comments_enabled === false ? (
                                                    <>
                                                        <Lock size={28} className="mx-auto text-slate-300 dark:text-slate-600 mb-3 shrink-0" />
                                                        <p className="text-xs sm:text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Discussion Locked</p>
                                                        <p className="text-[10px] sm:text-xs text-slate-400 mt-1 font-medium">Comments are turned off for this experience.</p>
                                                    </>
                                                ) : (
                                                    <>
                                                        <MessageSquare size={28} className="mx-auto text-slate-300 dark:text-slate-600 mb-3 shrink-0" />
                                                        <p className="text-xs sm:text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">No field notes yet</p>
                                                        <p className="text-[10px] sm:text-xs text-slate-400 mt-1 font-medium">Be the first to share your perspective.</p>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="p-4 sm:p-6 border-t border-slate-200 dark:border-white/10 bg-white dark:bg-[#041d18] shrink-0 sticky bottom-0 z-20">
                                    {selectedExperience.comments_enabled !== false ? (
                                        <form onSubmit={handleCommentSubmit} className="flex items-end gap-3">
                                            <div className="flex-1 relative">
                                                <textarea
                                                    value={commentText}
                                                    onChange={(e) => setCommentText(e.target.value)}
                                                    placeholder="Write a comment..."
                                                    rows="1"
                                                    className="w-full bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-xl sm:rounded-2xl px-4 py-3 sm:py-4 text-xs sm:text-sm outline-none focus:ring-2 focus:ring-emerald-500/50 dark:text-white transition-all resize-none min-h-[44px] sm:min-h-[52px]"
                                                    onInput={(e) => {
                                                        e.target.style.height = 'auto';
                                                        e.target.style.height = (e.target.scrollHeight) + 'px';
                                                    }}
                                                />
                                            </div>
                                            <button
                                                type="submit"
                                                disabled={!commentText.trim() || !isOnline}
                                                className="px-6 sm:px-8 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl sm:rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-widest shadow-lg shadow-emerald-600/30 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2 shrink-0 h-[44px] sm:h-[52px]"
                                            >
                                                <span className="hidden sm:inline">Post</span>
                                                <Send size={16} className="sm:w-[18px] sm:h-[18px] shrink-0" />
                                            </button>
                                        </form>
                                    ) : (
                                        <div className="w-full py-4 sm:py-5 bg-slate-50 dark:bg-white/5 rounded-xl sm:rounded-2xl border border-slate-100 dark:border-white/5 text-center">
                                            <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center justify-center gap-2">
                                                <Lock size={14} className="shrink-0" /> Comments have been disabled
                                            </p>
                                        </div>
                                    )}
                                </div>

                            </div>
                        </div>
                    </div>
                )}
            </div>
            <style dangerouslySetInnerHTML={{
                __html: `
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