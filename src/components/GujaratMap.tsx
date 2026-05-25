import React, { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { Complaint } from './ComplaintCard';
import MapInner from './MapInner';

interface GujaratMapProps {
  complaints: Complaint[];
  onMarkerClick?: (complaint: Complaint) => void;
  showHeatmap?: boolean;
  height?: string;
}

function MapLoading({ height }: { height: string }) {
  return (
    <div className="map-container relative flex items-center justify-center bg-muted" style={{ height }}>
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}

export function GujaratMap({ 
  complaints, 
  onMarkerClick, 
  showHeatmap = false,
  height = '500px' 
}: GujaratMapProps) {
  const { t, language } = useLanguage();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return <MapLoading height={height} />;
  }

  return (
    <div className="map-container relative" style={{ height }}>
      <MapInner
        complaints={complaints}
        onMarkerClick={onMarkerClick}
        showHeatmap={showHeatmap}
        height={height}
      />

      {/* Legend */}
      <div className="absolute bottom-4 right-4 bg-card/95 backdrop-blur-sm rounded-lg p-3 shadow-lg z-[1000]">
        <p className={cn(
          "text-xs font-semibold mb-2",
          language === 'gu' ? 'font-gujarati' : ''
        )}>
          {t('liveMap')}
        </p>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#FF9933]" />
            <span className={cn("text-xs", language === 'gu' ? 'font-gujarati' : '')}>
              {t('pending')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#FFC107]" />
            <span className={cn("text-xs", language === 'gu' ? 'font-gujarati' : '')}>
              {t('inProgress')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#2E7D32]" />
            <span className={cn("text-xs", language === 'gu' ? 'font-gujarati' : '')}>
              {t('completed')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
