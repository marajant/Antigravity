import { useState, useEffect } from 'react';
import { Download, Share, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed', platform: string }>;
}

export function InstallPrompt() {
    const [showPrompt, setShowPrompt] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

    useEffect(() => {
        // Detect iOS
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
        setIsIOS(isIosDevice);

        // Handle Android/Desktop "BeforeInstallPrompt"
        const handler = (e: Event) => {
            const promptEvent = e as BeforeInstallPromptEvent;
            promptEvent.preventDefault();
            setDeferredPrompt(promptEvent);
            setTimeout(() => setShowPrompt(true), 3000);
        };

        window.addEventListener('beforeinstallprompt', handler);

        // For iOS, show if not in standalone mode
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
        if (isIosDevice && !isStandalone) {
            const hasSeenPrompt = localStorage.getItem('installPromptSeen');
            if (!hasSeenPrompt) {
                setTimeout(() => setShowPrompt(true), 3000);
            }
        }

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setShowPrompt(false);
        }
        setDeferredPrompt(null);
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        localStorage.setItem('installPromptSeen', 'true');
    };

    return (
        <AnimatePresence>
            {showPrompt && (
                <motion.div
                    initial={{ y: 100, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 100, opacity: 0 }}
                    style={{
                        position: 'fixed',
                        bottom: '1rem',
                        left: '1rem',
                        right: '1rem',
                        zIndex: 9999,
                        pointerEvents: 'none', // Allow clicking through empty space
                        display: 'flex',
                        justifyContent: 'center'
                    }}
                >
                    <div
                        className="glass-panel"
                        style={{
                            padding: '1.25rem',
                            width: '100%',
                            maxWidth: '400px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '1rem',
                            position: 'relative',
                            overflow: 'hidden',
                            border: '1px solid var(--primary-glow)',
                            pointerEvents: 'auto', // Re-enable clicks
                            background: 'var(--surface-color)' // Ensure readability
                        }}
                    >

                        {/* Background Glow */}
                        <div style={{
                            position: 'absolute',
                            top: '-40px',
                            right: '-40px',
                            width: '150px',
                            height: '150px',
                            background: 'var(--primary-glow)',
                            filter: 'blur(50px)',
                            borderRadius: '50%',
                            pointerEvents: 'none'
                        }} />

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700 }}>
                                    Install ExpenseFlow
                                </h3>
                                <p style={{ margin: '0.25rem 0 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                    Get the native app experience with offline access.
                                </p>
                            </div>
                            <button
                                onClick={handleDismiss}
                                style={{ padding: '0.25rem', color: 'var(--text-secondary)', cursor: 'pointer' }}
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {isIOS ? (
                            <div style={{
                                background: 'rgba(0,0,0,0.05)',
                                padding: '0.75rem',
                                borderRadius: 'var(--radius-md)',
                                fontSize: '0.9rem',
                                border: '1px solid var(--border-color)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                                    <div style={{ padding: '0.25rem', background: 'white', borderRadius: '4px', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                                        <Share size={16} color="var(--primary)" />
                                    </div>
                                    <span>Tap the <strong>Share</strong> button</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <div style={{ padding: '0.25rem', background: 'white', borderRadius: '4px', boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
                                        <PlusSquareIcon />
                                    </div>
                                    <span>Select <strong>Add to Home Screen</strong></span>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={handleInstall}
                                style={{
                                    width: '100%',
                                    padding: '0.75rem',
                                    background: 'var(--primary)',
                                    color: 'white',
                                    fontWeight: 600,
                                    borderRadius: 'var(--radius-md)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '0.5rem',
                                    boxShadow: '0 4px 12px var(--primary-glow)',
                                    cursor: 'pointer',
                                    transition: 'transform 0.1s'
                                }}
                            >
                                <Download size={18} />
                                Install App
                            </button>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}

// Helper icon
const PlusSquareIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'black' }}>
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
        <line x1="12" y1="8" x2="12" y2="16" />
        <line x1="8" y1="12" x2="16" y2="12" />
    </svg>
);
