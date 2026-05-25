import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ThemeToggle } from '@/components/ThemeToggle';

interface GovtHeaderProps {
  showLanguageToggle?: boolean;
  showThemeToggle?: boolean;
  variant?: 'full' | 'compact';
}

export function GovtHeader({ 
  showLanguageToggle = true, 
  showThemeToggle = true,
  variant = 'full' 
}: GovtHeaderProps) {
  const { language, setLanguage, t } = useLanguage();

  return (
    <motion.header 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="govt-header py-3 px-4 md:px-8"
    >
      {/* Indian Flag Status Bar */}
      <div className="status-bar mb-3 max-w-xs mx-auto">
        <div className="status-saffron flex-1" />
        <div className="status-white flex-1" />
        <div className="status-green flex-1" />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 md:gap-4">
          {/* State Emblem */}
          <div className="emblem-glow">
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/5/55/Emblem_of_India.svg" 
              alt="State Emblem of India - Satyameva Jayate"
              className="h-12 md:h-16 w-auto"
            />
          </div>
          
          <div>
            <h1 className={`font-bold text-lg md:text-2xl text-white ${language === 'gu' ? 'font-gujarati' : ''}`}>
              {t('appName')}
            </h1>
            <p className={`text-xs md:text-sm text-white/90 ${language === 'gu' ? 'font-gujarati' : ''}`}>
              {t('govtOfGujarat')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 md:gap-4">
          {/* Theme Toggle */}
          {showThemeToggle && (
            <ThemeToggle variant="header" />
          )}

          {/* Language Toggle */}
          {showLanguageToggle && (
            <div className="flex items-center gap-2">
              <Label htmlFor="lang-toggle" className="text-xs md:text-sm font-medium text-white">
                EN
              </Label>
              <Switch
                id="lang-toggle"
                checked={language === 'gu'}
                onCheckedChange={(checked) => setLanguage(checked ? 'gu' : 'en')}
                className="data-[state=checked]:bg-accent"
              />
              <Label htmlFor="lang-toggle" className="text-xs md:text-sm font-medium text-white font-gujarati">
                ગુ
              </Label>
            </div>
          )}
        </div>
      </div>

      {variant === 'full' && (
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className={`text-center mt-2 text-sm text-white/80 ${language === 'gu' ? 'font-gujarati' : ''}`}
        >
          {t('tagline')}
        </motion.p>
      )}
    </motion.header>
  );
}
