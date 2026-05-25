import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PartyPopper, CheckCircle2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ComplaintSolvedAlertProps {
  complaintId: string;
  category: string;
  pointsAwarded?: number;
  onClose: () => void;
}

export function ComplaintSolvedAlert({ complaintId, category, pointsAwarded, onClose }: ComplaintSolvedAlertProps) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    // Auto-close after 8 seconds
    const timer = setTimeout(() => {
      setShow(false);
      setTimeout(onClose, 500); // Wait for exit animation
    }, 8000);
    return () => clearTimeout(timer);
  }, [onClose]);

  const handleClose = () => {
    setShow(false);
    setTimeout(onClose, 500);
  };

  return (
    <AnimatePresence>
      {show && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 50 }}
            transition={{ type: "spring", bounce: 0.5, duration: 0.8 }}
            className="bg-card w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border-2 border-govt-green relative"
          >
            {/* Background pattern */}
            <div className="absolute inset-0 bg-gradient-to-br from-govt-green/20 via-transparent to-govt-saffron/20 opacity-50"></div>
            
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 rounded-full hover:bg-black/5 z-10"
              onClick={handleClose}
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </Button>

            <div className="p-8 flex flex-col items-center text-center relative z-10">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1, rotate: [0, -10, 10, -10, 10, 0] }}
                transition={{ delay: 0.3, duration: 0.8 }}
                className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-6"
              >
                <PartyPopper className="w-10 h-10 text-govt-green" />
              </motion.div>

              <h2 className="text-2xl font-bold text-foreground mb-2">
                Great News! 🎉
              </h2>
              <p className="text-muted-foreground mb-6">
                Your complaint regarding <span className="font-semibold text-foreground">{category}</span> (ID: {complaintId.slice(0, 8)}) has been successfully resolved by the municipal authorities.
              </p>

              {pointsAwarded && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="bg-accent/10 border border-accent/20 rounded-2xl p-4 w-full mb-6"
                >
                  <p className="text-accent font-semibold flex items-center justify-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    You earned {pointsAwarded} impact points!
                  </p>
                </motion.div>
              )}

              <Button onClick={handleClose} className="w-full bg-govt-green hover:bg-govt-green/90 text-white rounded-xl h-12 text-lg font-semibold shadow-lg shadow-govt-green/30">
                Awesome!
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
