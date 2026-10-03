import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Smartphone, Download, ShieldCheck, ChevronDown, ChevronUp, Sparkles, CheckCircle2, ArrowRight, ExternalLink } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';

// ─── Config ──────────────────────────────────────────────────────────────────
const GITHUB_REPO_URL = 'https://github.com/Parthh1002/Aapno-Rasto';
const APK_RELEASE_URL = `${GITHUB_REPO_URL}/releases/latest`;
const APP_VERSION = '1.0.0';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function AppDownloadBanner() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const isGujarati = language === 'gu';

  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showHowToInstall, setShowHowToInstall] = useState(false);

  // Listen for native PWA install prompt
  useEffect(() => {
    // Check if already in standalone mode (already installed app)
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as unknown as { standalone?: boolean }).standalone === true) {
      setIsInstalled(true);
      return;
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Show banner after 1.2s on landing page unless dismissed this session
    if (!sessionStorage.getItem('aapno-apk-banner-dismissed')) {
      const timer = setTimeout(() => setVisible(true), 1200);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      };
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setVisible(false);
    sessionStorage.setItem('aapno-apk-banner-dismissed', '1');
  };

  const handleInstallClick = async (e: React.MouseEvent) => {
    e.stopPropagation();

    // If browser triggered native PWA install prompt
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          toast({
            title: isGujarati ? 'એપ સફળતાપૂર્વક ઇન્સ્ટોલ થઈ રહી છે!' : 'App Installing!',
            description: isGujarati 
              ? 'આપણો રસ્તો એપ તમારા ફોનના હોમ સ્ક્રીન પર ઉમેરાઈ રહી છે.' 
              : 'Aapno Rasto is being installed on your home screen.',
          });
          setVisible(false);
        }
        setDeferredPrompt(null);
        return;
      } catch (err) {
        console.warn('Install prompt error:', err);
      }
    }

    // If native prompt is not available, show the interactive install guide
    setExpanded(true);
    setShowHowToInstall(true);
  };

  if (!visible || isInstalled) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="apk-download-popup"
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[9999] max-w-[calc(100vw-2rem)] sm:max-w-md"
      >
        {/* Compact Popup Container - Rounded with Gujarat Govt UI Theme */}
        <div className="relative overflow-hidden rounded-2xl border border-border/80 bg-card/95 backdrop-blur-xl shadow-2xl transition-all duration-300">
          {/* Subtle Tricolor Accent Top Bar */}
          <div className="h-1 w-full flex">
            <div className="h-full flex-1 bg-[#FF9933]" />
            <div className="h-full flex-1 bg-white" />
            <div className="h-full flex-1 bg-[#138808]" />
          </div>

          {/* Main Compact Row */}
          <div className="p-3 sm:p-3.5 flex items-center gap-3">
            {/* App Icon with subtle pulse */}
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#002147] via-[#003580] to-[#FF9933] p-0.5 flex items-center justify-center shadow-md">
                <div className="w-full h-full bg-[#002147] rounded-[10px] flex items-center justify-center overflow-hidden">
                  <img 
                    src="/icons/icon-192x192.png" 
                    alt="Aapno Rasto" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback icon
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                  <Smartphone className="w-5 h-5 text-[#FF9933]" />
                </div>
              </div>
              <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF9933] opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#FF9933]" />
              </span>
            </div>

            {/* App Info Text */}
            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h4 className={`font-semibold text-xs sm:text-sm text-foreground truncate leading-tight ${isGujarati ? 'font-gujarati' : ''}`}>
                  {isGujarati ? 'આપણો રસ્તો મોબાઇલ એપ' : 'Aapno Rasto App'}
                </h4>
                <span className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="w-2.5 h-2.5" />
                  Official
                </span>
              </div>
              <p className={`text-[11px] text-muted-foreground truncate leading-snug mt-0.5 ${isGujarati ? 'font-gujarati' : ''}`}>
                {isGujarati ? 'મોબાઇલમાં સીધું ઇન્સ્ટોલ કરો • ફ્રી' : 'Install on phone • Fast & Offline'}
              </p>
            </div>

            {/* Actions: Install Button & Dismiss */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                id="apk-quick-download-btn"
                onClick={handleInstallClick}
                className="
                  flex items-center gap-1.5
                  bg-gradient-to-r from-[#FF9933] to-orange-600
                  hover:from-orange-500 hover:to-orange-700
                  text-white font-medium text-xs
                  px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl
                  shadow-sm hover:shadow
                  transition-all active:scale-95
                "
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span className="font-semibold">
                  {isGujarati ? 'ઇન્સ્ટોલ કરો' : 'Install App'}
                </span>
              </button>

              {/* Expand Toggle */}
              <button
                type="button"
                onClick={() => setExpanded(prev => !prev)}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                title={expanded ? 'Collapse' : 'Details'}
                aria-label="Toggle details"
              >
                {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
              </button>

              {/* Close Button */}
              <button
                id="apk-banner-close-btn"
                onClick={handleDismiss}
                className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                title="Dismiss"
                aria-label="Dismiss banner"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Expandable Info & Guide Drawer */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="border-t border-border/60 bg-muted/30 px-3.5 py-3 text-[11px]"
              >
                {showHowToInstall ? (
                  /* Step-by-Step Installation Guide */
                  <div className="space-y-2 mb-3 bg-card p-2.5 rounded-xl border border-border/70">
                    <p className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#FF9933]" />
                      {isGujarati ? 'ફોનમાં ઇન્સ્ટોલ કરવાની સરળ રીત:' : 'How to install on your Android phone:'}
                    </p>
                    <ol className="space-y-1.5 text-muted-foreground text-[11px] pl-1">
                      <li className="flex items-start gap-2">
                        <span className="bg-[#002147] text-white w-4 h-4 rounded-full flex items-center justify-center text-[10px] shrink-0 mt-0.5 font-bold">1</span>
                        <span>{isGujarati ? 'બ્રાઉઝરમાં ઉપર જમણી બાજુ 3 ટપકાં (⋮) પર ટેપ કરો.' : 'Tap the 3 dots (⋮) menu at top right of Chrome.'}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="bg-[#002147] text-white w-4 h-4 rounded-full flex items-center justify-center text-[10px] shrink-0 mt-0.5 font-bold">2</span>
                        <span>{isGujarati ? '"Install app" અથવા "Add to Home screen" પર ક્લિક કરો.' : 'Tap "Install app" or "Add to Home screen".'}</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="bg-[#138808] text-white w-4 h-4 rounded-full flex items-center justify-center text-[10px] shrink-0 mt-0.5 font-bold">✓</span>
                        <span>{isGujarati ? 'એપ સીધી તમારા મોબાઇલ સ્ક્રીન પર ઇન્સ્ટોલ થઈ જશે!' : 'The app icon will instantly appear on your home screen!'}</span>
                      </li>
                    </ol>
                  </div>
                ) : (
                  /* App Features */
                  <div className="grid grid-cols-2 gap-2 text-muted-foreground mb-2.5">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3 h-3 text-[#FF9933]" />
                      <span>GPS Auto-location</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3 h-3 text-[#FF9933]" />
                      <span>Camera Direct Upload</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3 h-3 text-[#138808]" />
                      <span>Works 100% Offline</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3 h-3 text-[#138808]" />
                      <span>No APK Parse Issues</span>
                    </div>
                  </div>
                )}

                {/* Footer with APK Release Link */}
                <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[10px] text-muted-foreground/80">
                  <button
                    type="button"
                    onClick={() => setShowHowToInstall(prev => !prev)}
                    className="text-[#FF9933] hover:underline font-medium"
                  >
                    {showHowToInstall ? '← View Features' : 'Need help installing?'}
                  </button>

                  <a 
                    href={APK_RELEASE_URL} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-foreground/80 hover:text-foreground hover:underline"
                  >
                    <Download className="w-3 h-3 text-muted-foreground" />
                    <span>APK Releases</span>
                    <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                  </a>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
