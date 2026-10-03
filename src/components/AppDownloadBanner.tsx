import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, Smartphone, PlusCircle, CheckCircle2,
  ChevronDown, Sparkles, MoreVertical, Compass, Zap
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';

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
    // Check if app is already running in standalone PWA mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
      document.referrer.includes('android-app://');

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Capture Chrome's beforeinstallprompt
    const handleBIP = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    // Listen for successful PWA installation
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setVisible(false);
      setDeferredPrompt(null);
      toast({
        title: isGu ? '🎉 સફળતાપૂર્વક ઇન્સ્ટોલ થયું!' : '🎉 Added to Home Screen!',
        description: isGu
          ? 'આપણો રસ્તો એપ તમારા ફોનની હોમ સ્ક્રીન પર ઉમેરાઈ ગઈ છે.'
          : 'Aapno Rasto has been successfully added to your home screen.',
      });
    };

    window.addEventListener('beforeinstallprompt', handleBIP);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Show after slight delay if not dismissed in current session
    if (!sessionStorage.getItem('aapno-pwa-dismissed')) {
      timerRef.current = setTimeout(() => setVisible(true), 1200);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBIP);
      window.removeEventListener('appinstalled', handleAppInstalled);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isGu, toast]);

  const dismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setVisible(false);
    sessionStorage.setItem('aapno-pwa-dismissed', '1');
  };

  const handleInstallClick = async (e: React.MouseEvent) => {
    e.stopPropagation();

    // If Chrome provided the native prompt, trigger it directly
    if (deferredPrompt) {
      setInstalling(true);
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          toast({
            title: isGu ? '🎉 ઇન્સ્ટોલેશન શરૂ થયું!' : '🎉 Installing App!',
            description: isGu
              ? 'એપ થોડીક સેકન્ડમાં હોમ સ્ક્રીન પર ઉમેરાઈ જશે.'
              : 'Aapno Rasto is being added to your home screen.',
          });
          setVisible(false);
        }
        setDeferredPrompt(null);
      } catch (err) {
        console.error('Install prompt error:', err);
        setExpanded(true);
      } finally {
        setInstalling(false);
      }
      return;
    }

    // If deferredPrompt is not available (e.g. Chrome 3-dot flow on Android), expand the guide
    setExpanded(true);
  };

  if (isInstalled || !visible) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="pwa-add-banner"
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 50, scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 420, damping: 30, mass: 0.8 }}
        className="fixed bottom-4 right-3 left-3 sm:left-auto sm:right-6 sm:bottom-6 sm:w-[350px] z-[9999]"
      >
        {/* Floating Glassmorphic Container with Rounded Corners */}
        <div
          className="rounded-2xl overflow-hidden shadow-2xl border border-white/15"
          style={{
            background: 'linear-gradient(145deg, rgba(0, 33, 71, 0.98) 0%, rgba(2, 22, 51, 0.98) 100%)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}
        >
          {/* Indian Tricolor Top Micro-Stripe */}
          <div className="flex h-[3px] w-full">
            <div className="flex-1 bg-[#FF9933]" />
            <div className="flex-1 bg-white/95" />
            <div className="flex-1 bg-[#138808]" />
          </div>

          {/* ── Main Compact Row ─────────────────────────────────────────── */}
          <div
            className="px-3.5 py-2.5 flex items-center gap-3 cursor-pointer select-none"
            onClick={() => setExpanded((prev) => !prev)}
          >
            {/* App Icon */}
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center shadow-md overflow-hidden relative">
                <img
                  src="/icons/icon-192x192.png"
                  alt="Aapno Rasto"
                  className="w-9 h-9 object-contain"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = 'none';
                  }}
                />
                <Smartphone className="w-5 h-5 text-[#FF9933] absolute" aria-hidden="true" />
              </div>
              {/* Online / Active pulse dot */}
              <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#138808] opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#138808]" />
              </span>
            </div>

            {/* Title & Description */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className={`font-bold text-xs sm:text-sm text-white leading-tight truncate ${isGu ? 'font-gujarati' : ''}`}>
                  {isGu ? 'આપણો રસ્તો' : 'Aapno Rasto'}
                </p>
                <span className="inline-flex items-center text-[9px] font-semibold px-1.5 py-0.2 rounded-full bg-[#FF9933]/20 text-[#FF9933] border border-[#FF9933]/40">
                  App
                </span>
              </div>
              <p className={`text-[11px] text-white/70 truncate mt-0.5 ${isGu ? 'font-gujarati' : ''}`}>
                {isGu ? 'હોમ સ્ક્રીન પર ઉમેરો • ફ્રી' : 'Add to Home Screen • Fast'}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1 shrink-0">
              <motion.button
                id="pwa-add-to-home-btn"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleInstallClick}
                disabled={installing}
                title={isGu ? 'હોમ સ્ક્રીન પર ઉમેરો' : 'Add to Home Screen'}
                className="
                  flex items-center gap-1 rounded-xl px-2.5 py-1.5
                  bg-gradient-to-r from-[#FF9933] to-orange-500
                  hover:from-orange-500 hover:to-orange-600
                  text-white font-bold text-xs shadow-md shadow-orange-500/20
                  transition-all disabled:opacity-60
                "
              >
                {installing ? (
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                    <Sparkles className="w-3.5 h-3.5" />
                  </motion.div>
                ) : (
                  <PlusCircle className="w-3.5 h-3.5" />
                )}
                <span>{installing ? '...' : (isGu ? 'ઉમેરો' : 'Add')}</span>
              </motion.button>

              {/* Expand Toggle */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpanded((p) => !p);
                }}
                className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Toggle details"
              >
                <motion.span animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronDown className="w-4 h-4" />
                </motion.span>
              </button>

              {/* Close Button */}
              <button
                id="pwa-banner-dismiss"
                type="button"
                onClick={dismiss}
                className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ── Expandable Interactive Guide (Chrome 3-Dot Instructions) ──── */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                key="pwa-expanded"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.22 }}
                className="border-t border-white/10 overflow-hidden bg-black/20"
              >
                <div className="px-4 py-3 space-y-3">
                  {/* Visual Chrome 3-Dot Header Mockup */}
                  <div className="rounded-xl bg-white/5 border border-white/10 p-2.5 flex items-center justify-between text-[11px] text-white/80">
                    <div className="flex items-center gap-2 truncate">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      <span className="font-mono text-[10px] text-white/60 truncate">no-rasto.vercel.app</span>
                    </div>
                    {/* Animated 3 Dots Pointer */}
                    <div className="flex items-center gap-1 text-[#FF9933] font-semibold bg-[#FF9933]/15 px-2 py-0.5 rounded-md border border-[#FF9933]/30">
                      <span>{isGu ? '3-ટપકાં' : '3-Dots'}</span>
                      <MoreVertical className="w-3.5 h-3.5 animate-pulse" />
                    </div>
                  </div>

                  {/* 3 Step Instruction List */}
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold text-[#FF9933] flex items-center gap-1.5">
                      <Compass className="w-3 h-3" />
                      {isGu ? 'હોમ સ્ક્રીન પર કેવી રીતે ઉમેરવું:' : 'How to Add to Home Screen:'}
                    </p>

                    <ol className="space-y-2">
                      {/* Step 1 */}
                      <li className="flex items-start gap-2.5">
                        <span className="bg-[#FF9933] text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                          1
                        </span>
                        <div className="text-[11px] text-white/80 leading-snug">
                          {isGu ? (
                            <>
                              Chrome ના ઉપર જમણા ખૂણે <strong className="text-white">3 ટપકાં (⋮)</strong> પર ટેપ કરો
                            </>
                          ) : (
                            <>
                              Tap the <strong className="text-white">3 dots (⋮)</strong> at the top-right in Chrome
                            </>
                          )}
                        </div>
                      </li>

                      {/* Step 2 */}
                      <li className="flex items-start gap-2.5">
                        <span className="bg-blue-500 text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                          2
                        </span>
                        <div className="text-[11px] text-white/80 leading-snug">
                          {isGu ? (
                            <>
                              મેનૂમાંથી <strong className="text-[#FF9933]">"Add to Home screen"</strong> અથવા <strong className="text-[#FF9933]">"Install app"</strong> પસંદ કરો
                            </>
                          ) : (
                            <>
                              Select <strong className="text-[#FF9933]">"Add to Home screen"</strong> or <strong className="text-[#FF9933]">"Install app"</strong>
                            </>
                          )}
                        </div>
                      </li>

                      {/* Step 3 */}
                      <li className="flex items-start gap-2.5">
                        <span className="bg-[#138808] text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                          ✓
                        </span>
                        <div className="text-[11px] text-white/80 leading-snug">
                          {isGu ? (
                            <>
                              <strong className="text-white">"Add" / "Install"</strong> દબાવો — એપ સીધી ફોનમાં આવી જશે!
                            </>
                          ) : (
                            <>
                              Tap <strong className="text-white">"Add" / "Install"</strong> — Opens like a native app!
                            </>
                          )}
                        </div>
                      </li>
                    </ol>
                  </div>

                  {/* Feature badges */}
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    {[
                      { icon: <Zap className="w-3 h-3 text-[#FF9933]" />, label: isGu ? '1-ટેપ એક્સેસ' : '1-Tap Fast Launch' },
                      { icon: <CheckCircle2 className="w-3 h-3 text-emerald-400" />, label: isGu ? 'ઑફલાઇન સપોર્ટ' : 'Offline Ready' },
                    ].map(({ icon, label }, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 bg-white/5 rounded-lg px-2.5 py-1.5">
                        {icon}
                        <span className="text-[10px] text-white/70 font-medium">{label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Direct trigger button inside guide */}
                  {deferredPrompt && (
                    <button
                      type="button"
                      onClick={handleInstallClick}
                      className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-[#FF9933] to-orange-500 hover:from-orange-500 hover:to-orange-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-orange-500/20"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span>{isGu ? 'હમણાં હોમ સ્ક્રીન પર ઉમેરો' : 'Add to Home Screen Now'}</span>
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
