import React from 'react';
import { motion } from 'framer-motion';
import { Check, Clock, Loader2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

type Status = 'pending' | 'in_progress' | 'completed';

interface StatusTrackerProps {
  currentStatus: Status;
  showLabels?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function StatusTracker({ currentStatus, showLabels = true, size = 'md' }: StatusTrackerProps) {
  const { t, language } = useLanguage();

  const statuses: { key: Status; label: string; icon: React.ReactNode }[] = [
    { key: 'pending', label: t('pending'), icon: <Clock className="w-4 h-4" /> },
    { key: 'in_progress', label: t('inProgress'), icon: <Loader2 className="w-4 h-4" /> },
    { key: 'completed', label: t('completed'), icon: <Check className="w-4 h-4" /> },
  ];

  const currentIndex = statuses.findIndex(s => s.key === currentStatus);

  const getStatusColor = (index: number) => {
    if (index < currentIndex) return 'bg-govt-green';
    if (index === currentIndex) {
      if (currentStatus === 'pending') return 'bg-govt-saffron';
      if (currentStatus === 'in_progress') return 'bg-yellow-400';
      return 'bg-govt-green';
    }
    return 'bg-muted';
  };

  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  };

  return (
    <div className="flex items-center justify-between w-full">
      {statuses.map((status, index) => (
        <React.Fragment key={status.key}>
          <div className="flex flex-col items-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                sizeClasses[size],
                'rounded-full flex items-center justify-center transition-all duration-300',
                getStatusColor(index),
                index <= currentIndex ? 'text-white' : 'text-muted-foreground'
              )}
            >
              {index < currentIndex ? (
                <Check className="w-4 h-4" />
              ) : index === currentIndex && currentStatus === 'in_progress' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                status.icon
              )}
            </motion.div>
            {showLabels && (
              <span className={cn(
                'text-xs mt-1 text-center',
                language === 'gu' ? 'font-gujarati' : '',
                index <= currentIndex ? 'text-foreground font-medium' : 'text-muted-foreground'
              )}>
                {status.label}
              </span>
            )}
          </div>
          
          {index < statuses.length - 1 && (
            <div className="flex-1 mx-2">
              <div className="h-1 rounded-full bg-muted overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: index < currentIndex ? '100%' : '0%' }}
                  transition={{ duration: 0.5, delay: index * 0.2 }}
                  className={cn(
                    'h-full',
                    index < currentIndex ? 'bg-govt-green' : ''
                  )}
                />
              </div>
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}
