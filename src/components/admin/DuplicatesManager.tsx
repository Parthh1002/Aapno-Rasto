import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Complaint } from '@/components/ComplaintCard';
import { AlertTriangle, Merge, Eye, Trash2 } from 'lucide-react';

interface DuplicatesManagerProps {
  complaints: Complaint[];
  onMerge: (masterId: string, duplicateIds: string[]) => void;
  onReject: (groupId: string) => void;
  onViewComplaint: (complaint: Complaint) => void;
}

// Haversine formula to calculate distance between two coordinates in meters
function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c;
}

export function DuplicatesManager({ complaints, onMerge, onReject, onViewComplaint }: DuplicatesManagerProps) {
  // Mock AI grouping: group complaints of same category within 50 meters
  const duplicateGroups = useMemo(() => {
    const groups: Complaint[][] = [];
    const processedIds = new Set<string>();

    const activeComplaints = complaints.filter(c => c.status !== 'completed' && c.status !== 'rejected');

    activeComplaints.forEach((c1) => {
      if (processedIds.has(c1.id)) return;

      const group = [c1];
      processedIds.add(c1.id);

      activeComplaints.forEach((c2) => {
        if (c1.id !== c2.id && !processedIds.has(c2.id) && c1.category === c2.category) {
          const distance = getDistanceInMeters(c1.location.lat, c1.location.lng, c2.location.lat, c2.location.lng);
          if (distance <= 50) { // 50 meters threshold
            group.push(c2);
            processedIds.add(c2.id);
          }
        }
      });

      if (group.length > 1) {
        groups.push(group);
      }
    });

    return groups;
  }, [complaints]);

  return (
    <div className="space-y-6">
      <Card className="govt-card bg-destructive/5 border-destructive/20">
        <CardHeader className="pb-4 border-b border-border">
          <CardTitle className="text-xl flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-destructive" />
            AI Duplicate Detection
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            The AI has detected multiple reports from the exact same location and category. Please review and merge them to avoid redundant engineer dispatches.
          </p>
        </CardHeader>
        <CardContent className="pt-6">
          {duplicateGroups.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <span className="text-4xl block mb-4">✨</span>
              <p>No duplicates detected by AI.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {duplicateGroups.map((group, index) => {
                const master = group[0];
                const duplicates = group.slice(1);
                
                return (
                  <div key={`group-${index}`} className="border border-border rounded-xl overflow-hidden bg-background">
                    <div className="bg-muted p-4 border-b border-border flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="bg-background">Group {index + 1}</Badge>
                          <span className="text-sm font-medium capitalize">{master.category.replace('_', ' ')}</span>
                          <span className="text-xs text-muted-foreground">• {group.length} Reports</span>
                        </div>
                        <p className="text-sm text-muted-foreground max-w-lg truncate">{master.location.address}</p>
                      </div>
                      <div className="flex gap-2 w-full md:w-auto">
                        <Button 
                          variant="default" 
                          size="sm" 
                          className="flex-1 md:flex-none"
                          onClick={() => onMerge(master.id, duplicates.map(d => d.id))}
                        >
                          <Merge className="w-4 h-4 mr-2" /> Merge All into Master
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="flex-1 md:flex-none"
                          onClick={() => onReject(`group-${index}`)}
                        >
                          Dismiss Group
                        </Button>
                      </div>
                    </div>
                    
                    <div className="p-4 grid md:grid-cols-2 gap-4">
                      <div className="border-2 border-primary/20 rounded-lg p-3 bg-primary/5">
                        <div className="flex justify-between items-start mb-2">
                          <Badge className="bg-primary hover:bg-primary">Master Record</Badge>
                          <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onViewComplaint(master)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                        <p className="text-xs font-mono text-muted-foreground mb-1">ID: {master.id}</p>
                        <p className="text-sm">{master.description}</p>
                        {master.imageUrl && (
                          <img src={master.imageUrl} alt="Master" className="w-full h-24 object-cover rounded mt-2 border border-border" />
                        )}
                      </div>
                      
                      <div className="space-y-3">
                        {duplicates.map(dup => (
                          <div key={dup.id} className="border border-border rounded-lg p-3 flex gap-3 bg-muted/30">
                            {dup.imageUrl && (
                              <img src={dup.imageUrl} alt="Dup" className="w-16 h-16 object-cover rounded border border-border" />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start">
                                <p className="text-xs font-mono text-muted-foreground truncate">ID: {dup.id}</p>
                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => onViewComplaint(dup)}>
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </div>
                              <p className="text-sm truncate mt-1">{dup.description}</p>
                              <Badge variant="secondary" className="text-[10px] mt-1">Duplicate</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
