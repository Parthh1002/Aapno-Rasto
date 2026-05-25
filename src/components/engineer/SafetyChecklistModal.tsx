import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ShieldCheck, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { SafetyChecklistItem, WorkOrder, VerificationQueueItem } from '@/hooks/useWorkOrders';
import { useSafetyChecklistTemplate, useSafetyChecklist, useUpsertSafetyChecklist } from '@/hooks/useWorkOrders';
import { useToast } from '@/hooks/use-toast';

interface SafetyChecklistModalProps {
  workOrder: WorkOrder & { complaint: VerificationQueueItem };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

export function SafetyChecklistModal({ workOrder, open, onOpenChange, onComplete }: SafetyChecklistModalProps) {
  const { toast } = useToast();
  const [items, setItems] = useState<SafetyChecklistItem[]>([]);
  
  const { data: template, isLoading: templateLoading } = useSafetyChecklistTemplate(
    workOrder.complaint.category,
    workOrder.complaint.sub_category
  );
  
  const { data: existingChecklist, isLoading: checklistLoading } = useSafetyChecklist(workOrder.id);
  const upsertChecklist = useUpsertSafetyChecklist();

  useEffect(() => {
    if (existingChecklist?.checklist_items) {
      setItems(existingChecklist.checklist_items as SafetyChecklistItem[]);
    } else if (template?.items) {
      const templateItems = template.items as { item: string; required: boolean }[];
      setItems(templateItems.map(item => ({
        ...item,
        checked: false,
      })));
    }
  }, [template, existingChecklist]);

  const toggleItem = (index: number) => {
    setItems(items.map((item, i) => 
      i === index 
        ? { ...item, checked: !item.checked, checked_at: !item.checked ? new Date().toISOString() : undefined }
        : item
    ));
  };

  const requiredItems = items.filter(item => item.required);
  const allRequiredCompleted = requiredItems.every(item => item.checked);
  const completedCount = items.filter(item => item.checked).length;

  const handleSave = async () => {
    try {
      await upsertChecklist.mutateAsync({
        work_order_id: workOrder.id,
        checklist_items: items,
      });
      
      toast({
        title: 'Checklist Saved',
        description: allRequiredCompleted 
          ? 'All required safety checks completed!'
          : 'Checklist progress saved.',
      });

      if (allRequiredCompleted) {
        onComplete();
        onOpenChange(false);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save checklist.',
        variant: 'destructive',
      });
    }
  };

  const isLoading = templateLoading || checklistLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary" />
            Safety Checklist
          </DialogTitle>
          <DialogDescription>
            Complete all required safety checks before starting work.
            This checklist is mandatory and cannot be bypassed.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : items.length === 0 ? (
          <Alert>
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              No safety checklist template found for {workOrder.complaint.category}
              {workOrder.complaint.sub_category && ` - ${workOrder.complaint.sub_category}`}.
              You may proceed without a checklist.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {/* Progress */}
            <div className="flex items-center justify-between text-sm">
              <span>Progress: {completedCount}/{items.length} items checked</span>
              {allRequiredCompleted ? (
                <Badge variant="default" className="bg-green-600">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  All Required Complete
                </Badge>
              ) : (
                <Badge variant="secondary">
                  {requiredItems.filter(i => i.checked).length}/{requiredItems.length} required
                </Badge>
              )}
            </div>

            <ScrollArea className="max-h-[50vh]">
              <div className="space-y-3 pr-4">
                {items.map((item, index) => (
                  <div
                    key={index}
                    className={`flex items-start gap-3 p-3 rounded-lg border ${
                      item.checked 
                        ? 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800' 
                        : item.required 
                          ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800'
                          : 'bg-muted/50'
                    }`}
                  >
                    <Checkbox
                      id={`item-${index}`}
                      checked={item.checked}
                      onCheckedChange={() => toggleItem(index)}
                    />
                    <div className="flex-1">
                      <Label 
                        htmlFor={`item-${index}`} 
                        className={`cursor-pointer ${item.checked ? 'line-through text-muted-foreground' : ''}`}
                      >
                        {item.item}
                      </Label>
                      {item.required && !item.checked && (
                        <Badge variant="destructive" className="ml-2 text-xs">
                          Required
                        </Badge>
                      )}
                    </div>
                    {item.checked && (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>

            {!allRequiredCompleted && (
              <Alert variant="destructive">
                <AlertTriangle className="w-4 h-4" />
                <AlertDescription>
                  You must complete all required safety checks before proceeding with work.
                </AlertDescription>
              </Alert>
            )}
          </>
        )}

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            className="flex-1" 
            onClick={handleSave}
            disabled={upsertChecklist.isPending || (items.length > 0 && !allRequiredCompleted)}
          >
            {upsertChecklist.isPending ? 'Saving...' : allRequiredCompleted ? 'Complete & Start Work' : 'Save Progress'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
