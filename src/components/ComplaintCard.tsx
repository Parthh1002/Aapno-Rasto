import React from 'react';
import { motion } from 'framer-motion';
import { MapPin, Calendar, Tag, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusTracker } from './StatusTracker';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { useSignedUrl } from '@/hooks/useSignedUrl';

export interface Complaint {
  id: string;
  category: string;
  subCategory?: string;
  description: string;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  status: 'pending' | 'in_progress' | 'completed';
  urgency?: 'high' | 'medium' | 'low';
  createdAt: Date;
  imageUrl?: string;
  userId: string;
  assignedTo?: string;
  pointsAwarded?: number;
  // Duplicate detection fields
  isDuplicate?: boolean;
  duplicateType?: 'exact' | 'similar' | null;
  masterIssueId?: string | null;
  matchConfidence?: number | null;
  matchReason?: string[] | null;
  linkedCount?: number;
}

interface ComplaintCardProps {
  complaint: Complaint;
  onClick?: () => void;
  showAssignment?: boolean;
}

export function ComplaintCard({ complaint, onClick, showAssignment }: ComplaintCardProps) {
  const { t, language } = useLanguage();
  const signedImageUrl = useSignedUrl(complaint.imageUrl);
  const getCategoryIcon = (category: string) => {
    const icons: { [key: string]: string } = {
      garbage: '🗑️',
      streetLight: '💡',
      roadMaintenance: '🛣️',
      waterSupply: '💧',
      drainage: '🚿',
      publicSafety: '🛡️',
      strayDog: '🐕',
    };
    return icons[category] || '📋';
  };

  const getUrgencyColor = (urgency?: string) => {
    switch (urgency) {
      case 'high': return 'bg-destructive text-destructive-foreground';
      case 'medium': return 'bg-yellow-500 text-white';
      case 'low': return 'bg-govt-green text-white';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <Card 
        className={cn(
          "govt-card cursor-pointer overflow-hidden",
          "hover:border-accent/50"
        )}
        onClick={onClick}
      >
        {signedImageUrl && (
          <div className="relative h-32 overflow-hidden">
            <img 
              src={signedImageUrl} 
              alt="Complaint" 
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
          </div>
        )}
        
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{getCategoryIcon(complaint.category)}</span>
              <div>
                <h3 className={cn(
                  "font-semibold text-foreground",
                  language === 'gu' ? 'font-gujarati' : ''
                )}>
                  {t(complaint.category)}
                </h3>
                {complaint.subCategory && (
                  <p className={cn(
                    "text-xs text-muted-foreground",
                    language === 'gu' ? 'font-gujarati' : ''
                  )}>
                    {t(complaint.subCategory)}
                  </p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {complaint.urgency && (
                <Badge className={getUrgencyColor(complaint.urgency)}>
                  {t(complaint.urgency)}
                </Badge>
              )}
              <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground line-clamp-2">
            {complaint.description}
          </p>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              <span className="truncate max-w-[150px]">{complaint.location.address}</span>
            </div>
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{complaint.createdAt.toLocaleDateString()}</span>
            </div>
          </div>

          <StatusTracker currentStatus={complaint.status} size="sm" />

          {complaint.pointsAwarded !== undefined && complaint.status === 'completed' && (
            <div className="flex items-center justify-end">
              <Badge variant="outline" className="bg-accent/10 text-accent border-accent">
                +{complaint.pointsAwarded} {t('points')}
              </Badge>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
