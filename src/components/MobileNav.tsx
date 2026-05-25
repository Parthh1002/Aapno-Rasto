import React from 'react';
import { motion } from 'framer-motion';
import { Home, FileText, Gift, User, Map } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface MobileNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function MobileNav({ activeTab, onTabChange }: MobileNavProps) {
  const { t, language } = useLanguage();

  const tabs = [
    { id: 'home', label: t('home'), icon: Home },
    { id: 'complaints', label: t('myComplaints'), icon: FileText },
    { id: 'map', label: t('liveMap'), icon: Map },
    { id: 'rewards', label: t('rewards'), icon: Gift },
    { id: 'profile', label: t('profile'), icon: User },
  ];

  return (
    <nav className="mobile-nav bg-card border-t border-border shadow-lg z-50">
      <div className="flex items-center justify-around py-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <motion.button
              key={tab.id}
              whileTap={{ scale: 0.9 }}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors",
                isActive 
                  ? "text-accent" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="relative">
                <Icon className={cn("w-5 h-5", isActive && "text-accent")} />
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-accent"
                  />
                )}
              </div>
              <span className={cn(
                "text-[10px] font-medium",
                language === 'gu' ? 'font-gujarati' : '',
                isActive && "text-accent"
              )}>
                {tab.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}
