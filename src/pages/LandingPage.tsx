import { useRef, memo, useState, type FC, type ReactNode } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, Camera, MapPin, Gift, Shield, Users,
  Globe, BarChart3, ChevronDown, Star, Clock, FileCheck, Award, Zap, AlertTriangle, HelpCircle, ExternalLink
} from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { GovtHeader } from '@/components/GovtHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import campusImg1 from '@/assets/ldrp-campus-1.jpg';
import campusImg2 from '@/assets/ldrp-campus-2.jpg';
import campusImg3 from '@/assets/ldrp-campus-3.jpg';

/* ─── Types ─────────────────────────────────────────────────────────────── */
interface StepData { step: number; title: string; description: string; icon: FC<{ className?: string }> }
interface GalleryData { img: string; title: string; location: string; status: string }
interface FeatureData { icon: FC<{ className?: string }>; title: string; description: string; gradient: string }
interface StatData { value: string; label: string; icon: FC<{ className?: string }> }

/* ─── Static data (outside component — avoids re-creation on every render) */
const FEATURES: FeatureData[] = [
  { icon: Shield, title: 'AI Analysis',    description: 'Instantly verifies complaints using AI, preventing duplicates and fakes.',  gradient: 'from-blue-600/30 to-cyan-500/30' },
  { icon: MapPin, title: 'GPS Tracking',    description: 'Automatic location tagging ensures accurate complaint registration.',    gradient: 'from-green-500/30 to-emerald-400/30' },
  { icon: Clock,   title: 'Real-Time Alerts',    description: 'Stay updated on the status of your complaints with live notifications.',         gradient: 'from-orange-500/30 to-amber-400/30' },
  { icon: Gift, title: 'Gamified Rewards',description: 'Earn points and badges for your active participation in making the city better.',     gradient: 'from-purple-600/30 to-pink-500/30' },
];

const STATS: StatData[] = [
  { value: '5,000+', label: 'Complaints Resolved', icon: FileCheck },
  { value: '12',     label: 'Districts Covered',   icon: MapPin },
  { value: '500+',   label: 'Active Engineers',     icon: Users },
  { value: '95%',    label: 'Resolution Rate',      icon: Star },
];

const STEPS: StepData[] = [
  { step: 1, title: 'Register & Verify', description: 'Sign up with Gmail and verify via link',                       icon: Users },
  { step: 2, title: 'Report Issue',      description: 'Capture photo with live camera and submit complaint',           icon: Camera },
  { step: 3, title: 'Track Progress',    description: 'Monitor status from Pending → In Progress → Completed',        icon: Clock },
  { step: 4, title: 'Earn Rewards',      description: 'Get 10 points when your complaint is resolved',                icon: Gift },
];

const GALLERY: GalleryData[] = [
  { img: campusImg1, title: 'Severe Pothole Near Campus', location: 'LDRP-ITR Main Road',   status: 'In Progress' },
  { img: campusImg2, title: 'Cracked Road at Gate',       location: 'LDRP-ITR Campus Gate', status: 'Pending' },
  { img: campusImg3, title: 'Waterlogged Road',           location: 'LDRP-ITR Access Road', status: 'Assigned' },
];

/* ─── Animation variants (static — no re-creation) ─────────────────────── */
const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.8, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  }),
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09 } },
};

const scaleIn = {
  hidden:  { opacity: 0, scale: 0.85, y: 30 },
  visible: { opacity: 1, scale: 1,    y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
};

/* ─── AnimatedCard — proper displayName for react/display-name ──────────── */
const AnimatedCard = memo(({ children, className }: { children: ReactNode; className?: string }) => (
  <motion.div
    whileHover={{ y: -8, scale: 1.02 }}
    transition={{ type: 'spring', stiffness: 300, damping: 20, mass: 0.8 }}
    className={className}
  >
    {children}
  </motion.div>
));
AnimatedCard.displayName = 'AnimatedCard';

/* ─── Reveal — intersection-triggered fade-up ───────────────────────────── */
function Reveal({ children, className, delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={fadeUp}
      custom={delay}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ─── StepItem — own component so hooks are always top-level ────────────── */
function StepItem({ item, index }: { item: StepData; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });
  const Icon = item.icon;
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: -40 }}
      animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{ delay: index * 0.08, type: 'spring', stiffness: 100, damping: 20, mass: 0.8 }}
      className="flex items-center gap-6 md:gap-10 group"
    >
      <motion.div
        whileHover={{ scale: 1.12, rotate: 4 }}
        className="w-16 h-16 md:w-24 md:h-24 rounded-3xl bg-card border-2 border-primary/20 flex items-center justify-center text-primary shrink-0 shadow-xl shadow-primary/10 relative z-10 group-hover:border-primary group-hover:bg-primary group-hover:text-white transition-all duration-300 overflow-hidden gpu-layer"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        <Icon className="w-8 h-8 md:w-10 md:h-10 relative z-10" />
      </motion.div>

      <AnimatedCard className="flex-1">
        <div className="bg-card rounded-3xl p-6 md:p-8 shadow-lg border border-border group-hover:border-primary/30 transition-colors duration-300 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors" />
          <div className="flex items-center gap-3 mb-3">
            <span className="text-sm font-black text-primary bg-primary/10 px-3 py-1 rounded-full uppercase tracking-wider">Step {item.step}</span>
          </div>
          <h3 className="font-bold text-2xl md:text-3xl mb-2 tracking-tight">{item.title}</h3>
          <p className="text-base md:text-lg text-muted-foreground font-medium">{item.description}</p>
        </div>
      </AnimatedCard>
    </motion.div>
  );
}

/* ─── GalleryItem — own component so hooks are always top-level ─────────── */
function GalleryItem({ item, index }: { item: GalleryData; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-50px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: index * 0.12, type: 'spring', stiffness: 100, damping: 20, mass: 0.8 }}
    >
      <Card className="overflow-hidden border-0 shadow-2xl rounded-[2rem] bg-card group relative gpu-layer">
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-80 z-10" />
        <div className="relative h-80 overflow-hidden">
          <motion.img
            whileHover={{ scale: 1.08 }}
            transition={{ duration: 0.6 }}
            src={item.img}
            alt={item.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
          <div className="absolute top-4 right-4 z-20">
            <span className={cn(
              'px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider backdrop-blur-md shadow-lg',
              item.status === 'Pending'     ? 'bg-red-500/90 text-white' :
              item.status === 'In Progress' ? 'bg-yellow-500/90 text-black' :
                                              'bg-green-500/90 text-white'
            )}>
              {item.status}
            </span>
          </div>
        </div>
        <CardContent className="absolute bottom-0 left-0 w-full p-6 z-20 text-white">
          <h3 className="font-bold text-2xl mb-2 leading-tight drop-shadow-md">{item.title}</h3>
          <div className="flex items-center gap-2 text-sm text-white/80 font-medium">
            <MapPin className="w-4 h-4 text-orange-400" />
            <span>{item.location}</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

/* ─── Intro Animation ─────────────────────────────────────────────────────── */
function IntroScreen({ onComplete }: { onComplete: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ delay: 3.5, duration: 1.5 }}
      onAnimationComplete={onComplete}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black overflow-hidden"
    >
      <div className="relative flex flex-col items-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 2, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center"
        >
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/5/55/Emblem_of_India.svg"
            alt="Govt Emblem"
            className="h-28 w-auto mb-8 drop-shadow-[0_0_25px_rgba(255,255,255,0.4)]"
          />
          <motion.h1
            initial={{ opacity: 0, filter: "blur(20px)", scale: 1.1 }}
            animate={{ opacity: 1, filter: "blur(0px)", scale: 1 }}
            transition={{ delay: 1, duration: 1.5, ease: "easeOut" }}
            className="text-6xl md:text-8xl font-black font-gujarati text-white tracking-widest drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]"
          >
            આપણો રસ્તો
          </motion.h1>
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "100%" }}
            transition={{ delay: 2, duration: 1.5, ease: "easeInOut" }}
            className="h-1 mt-6 bg-gradient-to-r from-orange-500 via-white to-green-500 rounded-full w-full max-w-sm drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]"
          />
          <motion.p
            initial={{ opacity: 0, letterSpacing: "0.1em" }}
            animate={{ opacity: 1, letterSpacing: "0.4em" }}
            transition={{ delay: 2.5, duration: 1 }}
            className="text-orange-400 mt-6 text-sm md:text-lg font-bold uppercase tracking-widest drop-shadow-md ml-2"
          >
            Government of Gujarat
          </motion.p>
        </motion.div>
      </div>
    </motion.div>
  );
}

/* ─── Main Page ─────────────────────────────────────────────────────────── */
export default function LandingPage() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [showIntro, setShowIntro] = useState(true);

  const handleIntroComplete = () => {
    setShowIntro(false);
  };

  return (
    <>
      <AnimatePresence>
        {showIntro && <IntroScreen onComplete={handleIntroComplete} />}
      </AnimatePresence>

      <div className={cn("landing-root min-h-screen bg-background text-foreground overflow-x-hidden selection:bg-primary/30", showIntro ? "h-screen overflow-y-hidden" : "")}>
        <GovtHeader variant="full" />

      {/* ════════════════════════════ HERO ════════════════════════════════ */}
      <section className="relative min-h-[90vh] flex flex-col items-center justify-center pt-20 pb-32 px-4 overflow-hidden bg-[#020817]">

        {/* CSS orbs — GPU compositor thread */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none" aria-hidden="true">
          <div className="orb orb-blue" />
          <div className="orb orb-orange" />
        </div>

        {/* CSS particles */}
        <div className="absolute inset-0 z-0 pointer-events-none" aria-hidden="true">
          {Array.from({ length: 12 }).map((_, i) => (
            <span key={i} className={`particle particle-${i}`} />
          ))}
        </div>

        {/* Content */}
        <div className="container mx-auto max-w-6xl text-center relative z-20 flex flex-col items-center">
          <motion.div variants={stagger} initial="hidden" animate="visible" className="flex flex-col items-center">

            <motion.div variants={fadeUp} custom={0}
              className="inline-flex items-center gap-3 bg-white/5 backdrop-blur-xl rounded-full pl-2 pr-5 py-2 mb-10 border border-white/10 shadow-[0_0_30px_rgba(255,153,51,0.15)]">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-tr from-green-500 to-emerald-400 shadow-lg shadow-green-500/30">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-semibold text-white/90 tracking-wide">Live &amp; Operational Across Gujarat</span>
            </motion.div>

            <motion.h1 variants={fadeUp} custom={1}
              className={cn(
                'text-5xl md:text-7xl lg:text-8xl font-black mb-8 leading-[1.1] tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-white/60',
                language === 'gu' ? 'font-gujarati' : ''
              )}>
              {t('welcomeMessage')}
            </motion.h1>

            <motion.p variants={fadeUp} custom={2}
              className={cn('text-lg md:text-2xl text-white/70 mb-12 max-w-3xl mx-auto leading-relaxed font-medium', language === 'gu' ? 'font-gujarati' : '')}>
              {t('description')}
            </motion.p>

            <motion.div variants={fadeUp} custom={3} className="flex flex-col sm:flex-row gap-5 justify-center w-full sm:w-auto">
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl blur-lg opacity-60 group-hover:opacity-100 transition-opacity duration-300" />
                <Button size="lg" onClick={() => navigate('/auth')}
                  className="relative w-full sm:w-auto bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white text-lg px-12 py-8 rounded-2xl shadow-xl border-t border-white/20">
                  <span className={cn('font-bold tracking-wide', language === 'gu' ? 'font-gujarati' : '')}>{t('reportAnIssue') || 'Report an Issue'}</span>
                  <ArrowRight className="ml-3 w-6 h-6 group-hover:translate-x-1.5 transition-transform" />
                </Button>
              </motion.div>

              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                <Button size="lg" variant="outline" onClick={() => navigate('/auth')}
                  className="w-full sm:w-auto bg-white/5 backdrop-blur-md border-white/10 text-white hover:bg-white/10 text-lg px-12 py-8 rounded-2xl hover:text-white transition-all">
                  <Users className="mr-3 w-6 h-6" />
                  <span className={cn('font-semibold tracking-wide', language === 'gu' ? 'font-gujarati' : '')}>{t('login')}</span>
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Stats grid */}
          <motion.div variants={stagger} initial="hidden" animate="visible"
            className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mt-24 w-full max-w-5xl relative z-20">
            {STATS.map((stat, i) => {
              const Icon = stat.icon;
              return (
                <motion.div key={stat.label} variants={scaleIn}
                  whileHover={{ y: -6, scale: 1.02 }}
                  className="bg-white/5 backdrop-blur-xl rounded-3xl p-6 border border-white/10 shadow-2xl relative overflow-hidden group gpu-layer">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <Icon className="w-8 h-8 text-orange-400 mb-4" />
                  <p className="text-3xl md:text-5xl font-black text-white tracking-tight">{stat.value}</p>
                  <p className="text-sm font-medium text-white/60 mt-2 uppercase tracking-wider">{stat.label}</p>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Scroll indicator */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5, duration: 1 }} className="absolute -bottom-16">
            <div className="bounce-arrow">
              <ChevronDown className="w-8 h-8 text-white/30" />
            </div>
          </motion.div>
        </div>

        <div className="absolute bottom-0 left-0 w-full h-40 bg-gradient-to-t from-background via-background/80 to-transparent z-10" />
      </section>

      {/* ═════════════════════════ THE ORIGIN STORY ════════════════════════════════ */}
      <section className="py-32 px-4 bg-muted/10 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-orange-500/5 pointer-events-none" />
        <div className="container mx-auto max-w-6xl relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <Reveal>
              <div className="space-y-8">
                <div className="inline-flex items-center gap-3 bg-red-500/10 text-red-600 px-4 py-2 rounded-full font-bold text-sm uppercase tracking-widest">
                  <AlertTriangle className="w-5 h-5" />
                  Why We Built This
                </div>
                <h2 className="text-4xl md:text-5xl font-black text-foreground tracking-tight leading-tight">
                  A Pothole? <br/>
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-orange-500">No, a Sinkhole.</span>
                </h2>
                <div className="space-y-6 text-lg text-muted-foreground font-medium">
                  <p>
                    In Ahmedabad, what appeared to be a minor pothole almost swallowed a commuter's vehicle. It was a massive sinkhole hidden in plain sight. 
                  </p>
                  <p>
                    Unreported civic issues are not just inconveniences—they are severe safety hazards. This platform was born from a simple idea: <strong className="text-foreground">What if every citizen could be the eyes and ears of the government?</strong>
                  </p>
                  <div className="bg-card p-6 rounded-2xl border border-border shadow-lg transition-transform hover:-translate-y-1">
                    <div className="flex items-start gap-4">
                      <div className="bg-orange-500/10 p-3 rounded-xl text-orange-500 shrink-0">
                        <Gift className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-bold text-foreground text-xl mb-2">The Reward System</h4>
                        <p className="text-base text-muted-foreground">
                          Don't just report—get rewarded. Every verified issue you report earns you <strong className="text-orange-500">Trust Points</strong>. Accumulate points and redeem them for exclusive discounts on government services, public transport, and more.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>

            <Reveal delay={0.3}>
               <div className="relative group">
                 <div className="absolute inset-0 bg-gradient-to-tr from-red-500 to-orange-500 blur-3xl opacity-20 rounded-full group-hover:opacity-40 transition-opacity duration-500" />
                 <Card className="relative overflow-hidden border border-border shadow-2xl rounded-3xl bg-card transition-transform duration-500 group-hover:scale-[1.02]">
                   <img 
                     src="https://images.hindustantimes.com/img/2023/02/22/1600x900/ahmedabad_pothole_1677054707831_1677054708108_1677054708108.jpg" 
                     alt="Ahmedabad Sinkhole Incident" 
                     className="w-full h-[400px] object-cover transition-transform duration-700 group-hover:scale-105"
                     onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&q=80' }}
                   />
                     <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black via-black/80 to-transparent pt-32 pb-8 px-8 z-10">
                       <p className="text-white/90 font-medium italic text-lg leading-relaxed">"Ahmedabad man thought it was just a pothole... then a sinkhole nearly swallowed his vehicle."</p>
                       <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-3">
                         <p className="text-white/50 text-sm font-semibold uppercase tracking-wider">— Real Incident, Hindustan Times</p>
                         <a 
                           href="https://timesofindia.indiatimes.com/city/ahmedabad/potholes-claimed-120-lives-on-gujarat-roads-last-year/articleshow/60418479.cms" 
                           target="_blank" 
                           rel="noopener noreferrer"
                           className="text-orange-400 hover:text-orange-300 text-sm font-medium flex items-center gap-1.5 transition-colors bg-orange-500/10 hover:bg-orange-500/20 px-3 py-1.5 rounded-full w-fit"
                         >
                           Read Full Article
                           <ExternalLink className="w-3.5 h-3.5" />
                         </a>
                       </div>
                     </div>
                  </Card>
                  
                </div>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ══════════════════════════ FEATURES ══════════════════════════════ */}
      <section className="py-32 px-4 relative z-20 bg-background">
        <div className="container mx-auto max-w-7xl">
          <div className="text-center mb-20">
            <Reveal>
              <span className="inline-block py-1.5 px-4 rounded-full bg-primary/10 text-primary font-bold text-sm uppercase tracking-widest mb-6">
                Next-Gen Platform
              </span>
              <h2 className="text-4xl md:text-6xl font-black text-foreground mb-6 tracking-tight">
                Why Choose {t('appName')}?
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto text-xl font-medium">
                A modern, transparent, and rewarding way to report civic issues across the state.
              </p>
            </Reveal>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {FEATURES.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <Reveal key={feature.title} delay={i * 0.5} className="h-full">
                  <AnimatedCard className="h-full">
                    <Card className="govt-card h-full overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm shadow-xl hover:shadow-2xl transition-shadow duration-500 rounded-3xl relative group gpu-layer">
                      <CardContent className="p-8 relative z-10 h-full flex flex-col">
                        <div className={cn('absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-100 transition-opacity duration-500', feature.gradient)} />
                        <div className="relative z-10 flex-1">
                          <div className="w-16 h-16 rounded-2xl bg-background shadow-inner flex items-center justify-center mb-6 relative overflow-hidden group-hover:scale-110 transition-transform duration-500">
                            <div className={cn('absolute inset-0 bg-gradient-to-br opacity-50', feature.gradient)} />
                            <Icon className="w-8 h-8 relative z-10 text-foreground" />
                          </div>
                          <h3 className="font-bold text-2xl mb-3 tracking-tight">{feature.title}</h3>
                          <p className="text-base text-muted-foreground leading-relaxed font-medium">{feature.description}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </AnimatedCard>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ═══════════════════════ HOW IT WORKS ════════════════════════════ */}
      <section className="py-32 px-4 bg-muted/30 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-full bg-gradient-to-b from-primary/5 via-transparent to-primary/5 blur-3xl pointer-events-none" />

        <div className="container mx-auto max-w-5xl relative z-10">
          <Reveal className="text-center mb-24">
            <span className="text-primary font-bold text-sm uppercase tracking-widest bg-primary/10 py-1.5 px-4 rounded-full">The Process</span>
            <h2 className="text-4xl md:text-5xl font-black text-foreground mt-6 mb-4 tracking-tight">Simple. Fast. Effective.</h2>
          </Reveal>

          <div className="relative">
            <div className="absolute left-8 md:left-12 top-0 bottom-0 w-1 bg-border hidden sm:block rounded-full overflow-hidden">
              <div className="step-line-glow" />
            </div>
            <div className="space-y-12">
              {STEPS.map((item, i) => (
                <StepItem key={item.step} item={item} index={i} />
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═════════════════════════ GALLERY ════════════════════════════════ */}
      <section className="py-32 px-4 bg-background relative">
        <div className="container mx-auto max-w-7xl">
          <Reveal className="text-center mb-20">
            <span className="text-orange-500 font-bold text-sm uppercase tracking-widest bg-orange-500/10 py-1.5 px-4 rounded-full">Impact</span>
            <h2 className="text-4xl md:text-5xl font-black text-foreground mt-6 mb-4 tracking-tight">Real Issues, Real Solutions</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-xl font-medium">
              See how citizens are transforming the LDRP-ITR campus and surrounding areas.
            </p>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-8">
            {GALLERY.map((item, i) => (
              <GalleryItem key={item.title} item={item} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════ FAQ ══════════════════════════════════ */}
      <section className="py-24 px-4 bg-muted/30 relative overflow-hidden" id="faq">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-full bg-gradient-to-b from-primary/5 via-transparent to-primary/5 blur-3xl pointer-events-none" />
        <div className="container mx-auto max-w-4xl relative z-10">
          <Reveal className="text-center mb-16">
            <span className="inline-flex items-center gap-2 text-primary font-bold text-sm uppercase tracking-widest bg-primary/10 py-1.5 px-4 rounded-full">
              <HelpCircle className="w-4 h-4" />
              Got Questions?
            </span>
            <h2 className="text-4xl md:text-5xl font-black text-foreground mt-6 mb-4 tracking-tight">Frequently Asked Questions</h2>
          </Reveal>

          <Reveal delay={0.2}>
            <Accordion type="single" collapsible className="w-full space-y-4">
              <AccordionItem value="item-1" className="bg-card border border-border px-6 py-2 rounded-2xl shadow-sm data-[state=open]:shadow-md transition-all">
                <AccordionTrigger className="hover:no-underline font-bold text-lg text-left">How do I report an issue?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-base leading-relaxed pb-4">
                  Simply register or log in, tap on the "Report Issue" button on your dashboard, use your live camera to capture the problem, and submit. The app automatically tags the GPS location.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2" className="bg-card border border-border px-6 py-2 rounded-2xl shadow-sm data-[state=open]:shadow-md transition-all">
                <AccordionTrigger className="hover:no-underline font-bold text-lg text-left">How do the reward points work?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-base leading-relaxed pb-4">
                  For every genuine complaint you submit that gets resolved by the authorities, you earn Trust Points. These points can be redeemed later for discounts on various government services, bills, and public transport.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3" className="bg-card border border-border px-6 py-2 rounded-2xl shadow-sm data-[state=open]:shadow-md transition-all">
                <AccordionTrigger className="hover:no-underline font-bold text-lg text-left">Why can't I upload photos from my gallery?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-base leading-relaxed pb-4">
                  To prevent fake or old complaints and ensure complete transparency, our platform strictly uses the live camera. This guarantees the issue is real and currently existing at the tagged location.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4" className="bg-card border border-border px-6 py-2 rounded-2xl shadow-sm data-[state=open]:shadow-md transition-all">
                <AccordionTrigger className="hover:no-underline font-bold text-lg text-left">How can I contact support?</AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-base leading-relaxed pb-4">
                  If you face any issues with the platform, need help with your account, or have any other queries, you can reach out to us directly via email at <a href="mailto:11a21278parth@gmail.com" className="text-primary font-bold hover:underline">11a21278parth@gmail.com</a>.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </Reveal>
        </div>
      </section>

      {/* ═══════════════════════════ VIDEO DEMO ══════════════════════════════════ */}
      <section className="py-24 px-4 bg-background relative" id="video-demo">
        <div className="container mx-auto max-w-5xl text-center relative z-10">
          <Reveal className="mb-12">
            <span className="inline-flex items-center gap-2 text-red-500 font-bold text-sm uppercase tracking-widest bg-red-500/10 py-1.5 px-4 rounded-full">
              See it in Action
            </span>
            <h2 className="text-4xl md:text-5xl font-black text-foreground mt-6 mb-4 tracking-tight">How {t('appName')} Works</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-xl font-medium">
              Watch our full demonstration video to see the platform end-to-end.
            </p>
          </Reveal>
          
          <Reveal delay={0.2}>
            <div className="relative aspect-video w-full rounded-3xl overflow-hidden shadow-2xl border border-border group gpu-layer">
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 to-orange-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              <iframe 
                className="w-full h-full relative z-10"
                src="https://www.youtube.com/embed/vqTcp-bV1Og" 
                title="Aapno Rasto Demo" 
                frameBorder="0" 
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                referrerPolicy="strict-origin-when-cross-origin" 
                allowFullScreen>
              </iframe>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ═══════════════════════════ CTA ══════════════════════════════════ */}
      <section className="py-24 px-4 bg-background relative overflow-hidden">
        <div className="container mx-auto max-w-5xl text-center relative z-10">
          <Reveal>
            <Card className="overflow-hidden border-0 shadow-[0_20px_50px_rgba(255,153,51,0.2)] rounded-[3rem] relative bg-[#020817]">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-600/20 via-blue-600/20 to-green-600/20 pointer-events-none" />
              <div className="p-12 md:p-20 relative overflow-hidden flex flex-col items-center">
                <motion.div
                  initial={{ rotate: -180, scale: 0 }}
                  whileInView={{ rotate: 0, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ type: 'spring', stiffness: 180, delay: 0.2, damping: 14 }}
                  className="w-24 h-24 bg-gradient-to-tr from-orange-500 to-amber-400 rounded-3xl rotate-12 flex items-center justify-center shadow-2xl shadow-orange-500/40 mb-10 gpu-layer">
                  <Award className="w-12 h-12 text-white -rotate-12" />
                </motion.div>

                <h2 className={cn('text-4xl md:text-6xl font-black mb-6 text-white tracking-tight leading-tight', language === 'gu' ? 'font-gujarati' : '')}>
                  Ready to Make an Impact?
                </h2>
                <p className="text-xl md:text-2xl text-white/70 mb-12 max-w-2xl mx-auto font-medium">
                  Join the platform today, report issues effortlessly, and earn rewards for contributing to a better society.
                </p>

                <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} className="relative group">
                  <div className="absolute inset-0 bg-white rounded-2xl blur-xl opacity-20 group-hover:opacity-40 transition-opacity" />
                  <Button size="lg" onClick={() => navigate('/auth')}
                    className="relative btn-saffron text-xl px-14 py-8 rounded-2xl shadow-2xl">
                    <span className={cn('font-bold tracking-wider', language === 'gu' ? 'font-gujarati' : '')}>{t('register')} Now</span>
                    <ArrowRight className="ml-3 w-6 h-6 group-hover:translate-x-2 transition-transform" />
                  </Button>
                </motion.div>
              </div>
            </Card>
          </Reveal>
        </div>
      </section>

      {/* ═══════════════════════ FOOTER ═══════════════════════════════════ */}
      <footer className="bg-card border-t border-border py-12 px-4 relative z-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent pointer-events-none" />
        <div className="container mx-auto max-w-7xl relative z-10">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-4 group">
              <div className="bg-white p-2.5 rounded-2xl shadow-sm border border-border group-hover:shadow-md transition-all duration-300 group-hover:-translate-y-1">
                <img src="https://upload.wikimedia.org/wikipedia/commons/5/55/Emblem_of_India.svg" alt="State Emblem" className="h-12 w-auto" />
              </div>
              <div>
                <p className={cn('font-black text-xl text-foreground tracking-tight', language === 'gu' ? 'font-gujarati' : '')}>{t('appName')}</p>
                <p className={cn('text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1', language === 'gu' ? 'font-gujarati' : '')}>{t('govtOfGujarat')}</p>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-6 text-sm font-semibold text-muted-foreground">
              <Dialog>
                <DialogTrigger className="hover:text-primary hover:bg-primary/5 px-4 py-2 rounded-full transition-all duration-300">
                  Privacy Policy
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col rounded-3xl">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-black">Privacy Policy</DialogTitle>
                    <DialogDescription>
                      Last updated: May 2026. Government of Gujarat.
                    </DialogDescription>
                  </DialogHeader>
                  <ScrollArea className="flex-1 pr-4 mt-4 text-sm text-muted-foreground leading-relaxed">
                    <div className="space-y-4">
                      <p><strong>1. Information Collection:</strong> When you use the Aapno Rasto portal, we collect essential information such as your name, contact details, and GPS location only when you submit a complaint via the live camera feature.</p>
                      <p><strong>2. Usage of Data:</strong> The data collected is strictly used for the resolution of civic issues. Your location data helps our engineers accurately pinpoint the problem area. Your contact information is used to provide status updates regarding your complaint.</p>
                      <p><strong>3. Data Security:</strong> We employ state-of-the-art encryption and security protocols to ensure that your personal information is protected against unauthorized access, alteration, disclosure, or destruction.</p>
                      <p><strong>4. Sharing of Information:</strong> Your data is solely accessible by authorized government personnel and assigned engineers. We do not sell or share your personal information with third parties for commercial purposes.</p>
                      <p><strong>5. User Rights:</strong> You have the right to view the status of your complaints and update your profile information. Any misuse of the platform may result in account suspension.</p>
                    </div>
                  </ScrollArea>
                </DialogContent>
              </Dialog>

              <Dialog>
                <DialogTrigger className="hover:text-primary hover:bg-primary/5 px-4 py-2 rounded-full transition-all duration-300">
                  Terms of Service
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col rounded-3xl">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-black">Terms of Service</DialogTitle>
                    <DialogDescription>
                      Please read these terms carefully before using the Aapno Rasto platform.
                    </DialogDescription>
                  </DialogHeader>
                  <ScrollArea className="flex-1 pr-4 mt-4 text-sm text-muted-foreground leading-relaxed">
                    <div className="space-y-4">
                      <p><strong>1. Acceptance of Terms:</strong> By accessing and using this platform, you accept and agree to be bound by the terms and provision of this agreement.</p>
                      <p><strong>2. Use of Platform:</strong> The platform must be used solely for reporting genuine civic issues. Submitting false, abusive, or irrelevant complaints is strictly prohibited and will lead to immediate account termination.</p>
                      <p><strong>3. Live Camera Requirement:</strong> To maintain authenticity, all complaint images must be captured using the platform's live camera feature. Uploads from the device gallery are restricted.</p>
                      <p><strong>4. Reward System:</strong> Trust Points are awarded at the discretion of the verifying authorities upon successful resolution of a genuine complaint. Points have no cash value and can only be redeemed for specified government services or benefits.</p>
                      <p><strong>5. Limitation of Liability:</strong> The Government of Gujarat is not liable for any direct, indirect, incidental, or consequential damages resulting from the use or inability to use the platform.</p>
                    </div>
                  </ScrollArea>
                </DialogContent>
              </Dialog>

              <a href="mailto:11a21278parth@gmail.com" className="hover:text-primary hover:bg-primary/5 px-4 py-2 rounded-full transition-all duration-300">Contact Support</a>
              
              <a href="/statistics" className="flex items-center gap-2 bg-primary/10 px-5 py-2 rounded-full text-primary hover:bg-primary hover:text-white transition-all duration-300 group">
                <BarChart3 className="w-4 h-4 group-hover:scale-110 transition-transform" />
                Live Statistics
              </a>
            </div>

            <div className="flex items-center gap-2 font-bold text-muted-foreground bg-muted/50 border border-border/50 py-2.5 px-5 rounded-full hover:bg-muted transition-colors">
              <Globe className="w-4 h-4 text-primary" />
              <a href="https://gujaratindia.gov.in" target="_blank" rel="noopener noreferrer" className="text-sm tracking-wide hover:text-foreground transition-colors">
                © 2026 Government of Gujarat
              </a>
            </div>
          </div>
        </div>
      </footer>
      </div>
    </>
  );
}
