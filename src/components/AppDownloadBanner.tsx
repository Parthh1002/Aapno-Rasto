import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Smartphone, Download, ShieldCheck, ChevronDown,
  Sparkles, CheckCircle2, ExternalLink, ArrowDownToLine, Info
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';

// ─── Config ──────────────────────────────────────────────────────────────────
const GITHUB_RELEASE_URL = 'https://github.com/Parthh1002/Aapno-Rasto/releases/latest';
const APP_VERSION = '1.0.0';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export function AppDownloadBanner() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const isGu = language === 'gu';

  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Already installed as PWA? Hide banner
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    ) {
      setIsInstalled(true);
      return;
    }

    const handleBIP = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handleBIP);

    if (!sessionStorage.getItem('aapno-banner-dismissed')) {
      timerRef.current = setTimeout(() => setVisible(true), 1500);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBIP);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const dismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setVisible(false);
    sessionStorage.setItem('aapno-banner-dismissed', '1');
  };

  const handleInstall = async (e: React.MouseEvent) => {
    e.stopPropagation();

    // Native PWA install (Chrome auto-prompt)
    if (deferredPrompt) {
      setInstalling(true);
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          toast({
            title: isGu ? '🎉 ઇન્સ્ટોલ સફળ!' : '🎉 App Installing!',
            description: isGu
              ? 'આપણો રસ્તો એપ તમારા ફોનના હોમ સ્ક્રીન પર ઉમેરાઈ ગઈ.'
              : 'Aapno Rasto has been added to your home screen.',
          });
          setVisible(false);
        }
        setDeferredPrompt(null);
      } catch {
        setExpanded(true);
      } finally {
        setInstalling(false);
      }
      return;
    }

    // Fallback: show install guide + APK download link
    setExpanded(true);
  };

  if (isInstalled || !visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="apk-banner"
        initial={{ opacity: 0, y: 80, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 80, scale: 0.94 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32, mass: 0.8 }}
        className="fixed bottom-4 right-3 left-3 sm:left-auto sm:right-6 sm:bottom-6 sm:w-[340px] z-[9999]"
      >
        {/* Card */}
        <div className="rounded-2xl overflow-hidden shadow-2xl border border-white/10"
          style={{
            background: 'linear-gradient(145deg, rgba(0,33,71,0.97) 0%, rgba(0,53,128,0.97) 100%)',
            backdropFilter: 'blur(20px)',
          }}
        >
          {/* Tricolor top stripe */}
          <div className="flex h-[3px] w-full">
            <div className="flex-1 bg-[#FF9933]" />
            <div className="flex-1 bg-white/90" />
            <div className="flex-1 bg-[#138808]" />
          </div>

          {/* ── Main row ─────────────────────────────────────────── */}
          <div className="px-4 py-3.5 flex items-center gap-3">
            {/* App icon */}
            <div className="relative shrink-0">
              <div className="w-11 h-11 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shadow-inner overflow-hidden">
                <img
                  src="/icons/icon-192x192.png"
                  alt="Aapno Rasto"
                  className="w-10 h-10 object-contain"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                />
                <Smartphone className="w-6 h-6 text-[#FF9933] absolute" aria-hidden="true" />
              </div>
              {/* Pulse dot */}
              <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF9933] opacity-60" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-[#FF9933]" />
              </span>
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className={`font-bold text-sm text-white leading-none ${isGu ? 'font-gujarati' : ''}`}>
                  {isGu ? 'આપણો રસ્તો' : 'Aapno Rasto'}
                </p>
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#FF9933]/20 text-[#FF9933] border border-[#FF9933]/30">
                  <ShieldCheck className="w-2.5 h-2.5" />
                  Official
                </span>
              </div>
              <p className={`text-[11px] text-white/60 mt-1 truncate ${isGu ? 'font-gujarati' : ''}`}>
                {isGu ? 'ફોન પર ઇન્સ્ટોલ કરો • ફ્રી' : 'Install on phone · Free · Android 7+'}
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-1.5 shrink-0">
              <motion.button
                id="apk-install-btn"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={handleInstall}
                disabled={installing}
                className="
                  flex items-center gap-1.5 rounded-xl px-3.5 py-2
                  bg-gradient-to-r from-[#FF9933] to-orange-500
                  hover:from-orange-500 hover:to-orange-600
                  text-white font-bold text-xs
                  shadow-lg shadow-orange-500/25
                  transition-shadow disabled:opacity-60
                "
              >
                {installing ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                    <Sparkles className="w-3.5 h-3.5" />
                  </motion.div>
                ) : (
                  <ArrowDownToLine className="w-3.5 h-3.5" />
                )}
                <span>{installing ? '...' : (isGu ? 'ઇન્સ્ટોલ' : 'Install')}</span>
              </motion.button>

              {/* Expand */}
              <button
                type="button"
                onClick={() => setExpanded(p => !p)}
                className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Details"
              >
                <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronDown className="w-4 h-4" />
                </motion.span>
              </button>

              {/* Close */}
              <button
                id="apk-banner-dismiss"
                type="button"
                onClick={dismiss}
                className="p-1.5 rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ── Expandable panel ─────────────────────────────────── */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                key="expanded"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22 }}
                className="border-t border-white/10 overflow-hidden"
              >
                <div className="px-4 py-3.5 space-y-3">
                  {/* Install guide */}
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold text-[#FF9933] flex items-center gap-1.5">
                      <Info className="w-3 h-3" />
                      {isGu ? 'ઇન્સ્ટોલ કરવાની રીત:' : 'How to install on Android:'}
                    </p>
                    <ol className="space-y-2">
                      {[
                        {
                          n: '1',
                          text: isGu ? 'Chrome ⋮ મેનૂ → "Install app" દબાવો' : 'Tap Chrome ⋮ menu → "Install app"',
                          color: 'bg-[#FF9933]',
                        },
                        {
                          n: '2',
                          text: isGu ? '"Install" દબાવો — ₄ sec માં ઇન્સ્ટોલ' : 'Tap "Install" — done in 4 seconds!',
                          color: 'bg-blue-500',
                        },
                        {
                          n: '✓',
                          text: isGu ? 'Home Screen પર Aapno Rasto આઇકન!' : 'Aapno Rasto icon appears on home screen',
                          color: 'bg-[#138808]',
                        },
                      ].map(({ n, text, color }) => (
                        <li key={n} className="flex items-start gap-2.5">
                          <span className={`${color} text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5`}>
                            {n}
                          </span>
                          <span className="text-[11px] text-white/70 leading-snug">{text}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  {/* Feature grid */}
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { icon: '📍', label: isGu ? 'GPS લોકેશન' : 'GPS Location' },
                      { icon: '📸', label: isGu ? 'ફોટો અપલોડ' : 'Photo Upload' },
                      { icon: '📶', label: isGu ? 'ઑફલાઇન' : 'Offline Ready' },
                      { icon: '🔔', label: isGu ? 'નોટિફિકેશન' : 'Notifications' },
                    ].map(({ icon, label }) => (
                      <div key={label} className="flex items-center gap-1.5 bg-white/5 rounded-lg px-2.5 py-1.5">
                        <span className="text-xs">{icon}</span>
                        <span className="text-[10px] text-white/70 font-medium">{label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Divider + APK link */}
                  <div className="border-t border-white/10 pt-2.5 flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-[10px] text-white/40">
                      <CheckCircle2 className="w-3 h-3 text-[#138808]" />
                      <span>v{APP_VERSION} · Android 7+</span>
                    </div>

                    <a
                      href={GITHUB_RELEASE_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-[10px] font-semibold text-[#FF9933] hover:text-orange-400 transition-colors"
                    >
                      <Download className="w-3 h-3" />
                      {isGu ? 'APK ડાઉનલોડ' : 'Download APK'}
                      <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                    </a>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
