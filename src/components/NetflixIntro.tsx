import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface NetflixIntroProps {
  onComplete: () => void;
}

export function NetflixIntro({ onComplete }: NetflixIntroProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Play the animation for 4 seconds, then trigger onComplete
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onComplete, 800); // Wait for fade out animation
    }, 3500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#020817] overflow-hidden pointer-events-none"
        >
          {/* Subtle background glow */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.4, 0] }}
            transition={{ duration: 3.5, times: [0, 0.5, 1] }}
            className="absolute inset-0 bg-gradient-to-tr from-[#FF9933]/10 via-transparent to-[#138808]/10"
          />

          {/* Epic Text Animation */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0, letterSpacing: '0em' }}
            animate={{ 
              scale: [0.8, 1.1, 4], 
              opacity: [0, 1, 0],
              letterSpacing: ['0em', '0.1em', '0.3em']
            }}
            transition={{ 
              duration: 3.5, 
              times: [0, 0.5, 1], // Fade in fast, hold a bit, then scale up massively
              ease: [0.4, 0, 0.2, 1] // Custom ease for dramatic effect
            }}
            className="flex flex-col items-center justify-center w-full h-full relative z-10"
          >
            <h1 
              className="text-7xl md:text-9xl font-black uppercase whitespace-nowrap"
              style={{
                background: 'linear-gradient(to bottom, #FF9933 0%, #FFFFFF 50%, #138808 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                filter: 'drop-shadow(0 0 30px rgba(255, 153, 51, 0.3)) drop-shadow(0 0 60px rgba(19, 136, 8, 0.2))',
              }}
            >
              OUR ROAD
            </h1>
            
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: [0, 1, 0], y: [20, 0, -20] }}
              transition={{ duration: 3.5, times: [0, 0.5, 1] }}
              className="mt-6 text-white/80 font-bold tracking-[0.4em] uppercase text-xs md:text-sm lg:text-base drop-shadow-lg"
            >
              Government of Gujarat
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
