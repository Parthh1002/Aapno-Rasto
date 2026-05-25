import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, Clock, MapPin } from 'lucide-react';
import { Complaint } from '@/components/ComplaintCard';
import { formatDistanceToNow } from 'date-fns';

interface RecentHighPriorityProps {
  complaints: Complaint[];
  onComplaintClick?: (complaint: Complaint) => void;
}

export function RecentHighPriority({ complaints, onComplaintClick }: RecentHighPriorityProps) {
  // Filter and sort high priority complaints
  const highPriority = complaints
    .filter(c => c.urgency === 'high' && c.status !== 'completed')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10); // Show top 10

  return (
    <Card className="govt-card h-full flex flex-col border-l-4 border-l-destructive">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2 text-destructive">
          <AlertTriangle className="w-5 h-5" />
          Recent High Priority
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-[300px] w-full px-6">
          {highPriority.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
              <span className="text-4xl mb-2">🎉</span>
              <p>No high priority complaints pending.</p>
            </div>
          ) : (
            <div className="space-y-4 pb-4">
              {highPriority.map((complaint) => (
                <div 
                  key={complaint.id}
                  className="group relative flex flex-col gap-2 p-3 rounded-lg bg-secondary/50 border border-border/50 hover:bg-secondary/80 hover:border-destructive/50 transition-all cursor-pointer overflow-hidden"
                  onClick={() => onComplaintClick?.(complaint)}
                >
                  {/* Subtle red glow effect on hover */}
                  <div className="absolute inset-0 bg-gradient-to-r from-destructive/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                  
                  <div className="flex items-center justify-between z-10">
                    <span className="font-semibold text-sm capitalize">{complaint.category.replace('_', ' ')}</span>
                    <Badge variant="destructive" className="text-[10px] uppercase px-1.5 py-0.5">Urgent</Badge>
                  </div>
                  
                  <p className="text-xs text-muted-foreground line-clamp-2 z-10">
                    {complaint.description}
                  </p>
                  
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground/70 mt-1 z-10">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate max-w-[120px]">{complaint.location?.address || 'View on map'}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{formatDistanceToNow(new Date(complaint.createdAt), { addSuffix: true })}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
