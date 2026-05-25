import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Map, MapPin, Check, X, AlertTriangle, Link2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Complaint } from '@/components/ComplaintCard';
import { useToast } from '@/hooks/use-toast';
import { GujaratMap } from '@/components/GujaratMap';

interface AdminCoordinateSelectionProps {
  complaints: Complaint[];
  onMerge: (masterId: string, duplicateIds: string[]) => Promise<void>;
  onReject: (groupId: string) => Promise<void>;
}

export function AdminCoordinateSelection({ complaints, onMerge, onReject }: AdminCoordinateSelectionProps) {
  const { toast } = useToast();
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedMaster, setSelectedMaster] = useState<string | null>(null);

  // Group complaints that are marked as similar or exact duplicates
  const duplicateGroups = React.useMemo(() => {
    const groups: Record<string, Complaint[]> = {};
    
    // Find all complaints that are part of a duplicate group
    const masterIds = new Set(
      complaints
        .filter(c => c.masterIssueId)
        .map(c => c.masterIssueId as string)
    );
    
    // Add the "potential" master issues if they aren't duplicates themselves
    masterIds.forEach(mId => {
      const master = complaints.find(c => c.id === mId);
      if (master) {
        groups[mId] = [master];
      }
    });

    // Add the duplicates to their respective groups
    complaints.forEach(c => {
      if (c.masterIssueId && groups[c.masterIssueId]) {
        groups[c.masterIssueId].push(c);
      }
    });

    // In a real app with the Python backend, this would use the `/api/complaints/group` endpoint
    // For now we simulate finding groups from the frontend data.
    
    return groups;
  }, [complaints]);

  const groupsList = Object.entries(duplicateGroups).filter(([_, list]) => list.length > 1);

  const handleMerge = async (groupId: string) => {
    if (!selectedMaster) {
      toast({
        title: "No Master Selected",
        description: "Please select one complaint as the master to merge others into.",
        variant: "destructive"
      });
      return;
    }

    const duplicates = duplicateGroups[groupId].filter(c => c.id !== selectedMaster).map(c => c.id);
    await onMerge(selectedMaster, duplicates);
    setSelectedGroup(null);
    setSelectedMaster(null);
  };

  const handleReject = async (groupId: string) => {
    await onReject(groupId);
    setSelectedGroup(null);
    setSelectedMaster(null);
  };

  if (groupsList.length === 0) {
    return (
      <Card className="govt-card">
        <CardContent className="flex flex-col items-center justify-center h-64 text-center">
          <Check className="w-12 h-12 text-green-500 mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Duplicates Found</h3>
          <p className="text-muted-foreground max-w-sm">
            All coordinate groups have been reviewed. There are currently no pending duplicates to merge.
          </p>
        </CardContent>
      </Card>
    );
  }

  const currentGroup = selectedGroup ? duplicateGroups[selectedGroup] : null;

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Left Column: List of Groups */}
      <Card className="lg:col-span-1 govt-card h-[600px] flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-accent" />
            Duplicate Detection
          </CardTitle>
          <CardDescription>
            {groupsList.length} potential duplicate groups found
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-1 p-0">
          <ScrollArea className="h-full px-6 pb-6">
            <div className="space-y-4">
              {groupsList.map(([groupId, groupComplaints]) => (
                <div 
                  key={groupId}
                  className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                    selectedGroup === groupId 
                      ? 'border-accent bg-accent/5' 
                      : 'border-transparent bg-muted hover:border-accent/50'
                  }`}
                  onClick={() => {
                    setSelectedGroup(groupId);
                    setSelectedMaster(groupComplaints[0].id); // default to first
                  }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="bg-background">
                      {groupComplaints.length} Items
                    </Badge>
                    <Badge variant="destructive" className="bg-orange-500/10 text-orange-500 border-orange-500/20">
                      {Math.round(groupComplaints[1]?.matchConfidence || 85)}% Match
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm font-medium mb-1 capitalize">
                    {groupComplaints[0].category} Issue
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {groupComplaints[0].description || groupComplaints[0].location.address}
                  </p>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Right Column: Details & Map */}
      <Card className="lg:col-span-2 govt-card h-[600px] flex flex-col">
        {selectedGroup && currentGroup ? (
          <>
            <CardHeader className="pb-4">
              <CardTitle>Coordinate Selection Workflow</CardTitle>
              <CardDescription>
                Review the items below and select the most accurate primary coordinate. The others will be merged as duplicates.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto space-y-6">
              
              {/* Map Preview */}
              <div className="rounded-xl overflow-hidden border border-border h-[250px]">
                <GujaratMap 
                  complaints={currentGroup}
                  height="250px"
                  onMarkerClick={(c) => setSelectedMaster(c.id)}
                />
              </div>

              {/* Items List */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm">Select Primary (Master) Coordinate:</h4>
                {currentGroup.map(c => (
                  <div 
                    key={c.id} 
                    className={`flex items-start gap-4 p-4 rounded-lg border-2 transition-all cursor-pointer ${
                      selectedMaster === c.id ? 'border-green-500 bg-green-500/5' : 'border-border bg-card'
                    }`}
                    onClick={() => setSelectedMaster(c.id)}
                  >
                    <div className="mt-1">
                      {selectedMaster === c.id ? (
                        <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                      ) : (
                        <div className="w-5 h-5 rounded-full border-2 border-muted-foreground" />
                      )}
                    </div>
                    
                    {c.imageUrl && (
                      <img src={c.imageUrl} alt="Issue" className="w-16 h-16 rounded-md object-cover" />
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <p className="font-medium truncate">{c.id}</p>
                        <p className="text-xs text-muted-foreground">
                          {c.createdAt.toLocaleDateString()}
                        </p>
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-1 mb-1">{c.description}</p>
                      <div className="flex items-center gap-1 text-xs text-accent">
                        <MapPin className="w-3 h-3" />
                        <span>{c.location.lat.toFixed(6)}, {c.location.lng.toFixed(6)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="pt-4 border-t border-border flex justify-between">
              <Button variant="outline" onClick={() => handleReject(selectedGroup)}>
                <X className="w-4 h-4 mr-2" />
                Reject Grouping (Keep Separate)
              </Button>
              <Button onClick={() => handleMerge(selectedGroup)} className="btn-saffron">
                <Check className="w-4 h-4 mr-2" />
                Confirm & Merge {currentGroup.length - 1} Duplicates
              </Button>
            </CardFooter>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
            <Map className="w-16 h-16 mb-4 opacity-20" />
            <p>Select a group from the left to review</p>
          </div>
        )}
      </Card>
    </div>
  );
}
