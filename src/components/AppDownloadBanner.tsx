import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Smartphone, Download, ShieldCheck, ChevronDown, ChevronUp, Sparkles, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';

// ─── Config ──────────────────────────────────────────────────────────────────
const APK_DOWNLOAD_URL = '/downloads/aapno-rasto.apk';
const APP_VERSION = '1.0.0';

export function AppDownloadBanner() {
  const { language } = useLanguage();
  const { toast } = useToast();
  const isGujarati = language === 'gu';

  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Show after 1.2s on landing page unless dismissed this session
  useEffect(() => {
    if (sessionStorage.getItem('aapno-apk-banner-dismissed')) return;
    const timer = setTimeout(() => setVisible(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setVisible(false);
    sessionStorage.setItem('aapno-apk-banner-dismissed', '1');
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDownloading(true);

    try {
      const a = document.createElement('a');
      a.href = APK_DOWNLOAD_URL;
      a.download = `aapno-rasto-v${APP_VERSION}.apk`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      toast({
        title: isGujarati ? 'ડાઉનલોડ શરૂ થયું!' : 'Downloading Aapno Rasto APK',
        description: isGujarati 
          ? 'એપ ડાઉનલોડ થયા પછી ઇન્સ્ટોલ કરો અને રસ્તાની સમસ્યા નોંધાવો.' 
          : `v${APP_VERSION} APK is downloading. Open it to install on your Android device.`,
      });
    } catch {
      toast({
        title: 'Download Notice',
        description: 'Please check your download folder.',
      });
    } finally {
      setTimeout(() => setDownloading(false), 2000);
    }
  };

  if (!visible) return null;

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
                <div className="w-full h-full bg-[#002147] rounded-[10px] flex items-center justify-center">
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
                  {isGujarati ? 'આપણો રસ્તો એપ' : 'Aapno Rasto App'}
                </h4>
                <span className="inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="w-2.5 h-2.5" />
                  APK
                </span>
              </div>
              <p className={`text-[11px] text-muted-foreground truncate leading-snug mt-0.5 ${isGujarati ? 'font-gujarati' : ''}`}>
                {isGujarati ? 'લાઇવ રિપોર્ટિંગ • ઑફલાઇન સુવિધા' : 'Instant road complaint reporting'}
              </p>
            </div>

            {/* Actions: Download Button & Dismiss */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                id="apk-quick-download-btn"
                onClick={handleDownload}
                disabled={downloading}
                className="
                  flex items-center gap-1.5
                  bg-gradient-to-r from-[#FF9933] to-orange-600
                  hover:from-orange-500 hover:to-orange-700
                  text-white font-medium text-xs
                  px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl
                  shadow-sm hover:shadow
                  transition-all active:scale-95 disabled:opacity-70
                "
              >
                <Download className="w-3.5 h-3.5" />
                <span className="font-semibold">
                  {downloading ? '...' : (isGujarati ? 'ડાઉનલોડ' : 'Download')}
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

          {/* Expandable Info Drawer */}
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="border-t border-border/60 bg-muted/30 px-3.5 py-2.5 text-[11px]"
              >
                <div className="grid grid-cols-2 gap-2 text-muted-foreground mb-2">
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-[#FF9933]" />
                    <span>GPS Auto-detection</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-[#FF9933]" />
                    <span>Direct Photo Upload</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-[#138808]" />
                    <span>Works Offline</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-[#138808]" />
                    <span>Verified Official APK</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[10px] text-muted-foreground/80">
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-[#FF9933]" />
                    Android 8.0+ Compatible
                  </span>
                  <span>Version {APP_VERSION} (12.4 MB)</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
