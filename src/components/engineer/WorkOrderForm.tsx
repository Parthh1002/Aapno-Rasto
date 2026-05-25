import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Plus, 
  Trash2, 
  Wrench, 
  Package, 
  Users, 
  Clock, 
  Calendar,
  MapPin,
  AlertTriangle
} from 'lucide-react';
import { VerificationQueueItem, TaskBreakdownItem, MaterialItem, ToolItem, CrewMember } from '@/hooks/useWorkOrders';

const workOrderSchema = z.object({
  estimated_duration_hours: z.number().min(0.5).max(1000),
  start_date: z.string().min(1, 'Start date is required'),
  expected_completion_date: z.string().min(1, 'Expected completion date is required'),
  sla_deadline: z.string().optional(),
});

type WorkOrderFormData = z.infer<typeof workOrderSchema>;

interface WorkOrderFormProps {
  complaint: VerificationQueueItem;
  onSubmit: (data: {
    complaint_id: string;
    task_breakdown: TaskBreakdownItem[];
    materials_required: MaterialItem[];
    tools_required: ToolItem[];
    assigned_crew: CrewMember[];
    estimated_duration_hours: number;
    start_date: string;
    expected_completion_date: string;
    sla_deadline?: string;
  }) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

// Simple UUID generator
function generateId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export function WorkOrderForm({ complaint, onSubmit, onCancel, isLoading }: WorkOrderFormProps) {
  const [tasks, setTasks] = useState<TaskBreakdownItem[]>([
    { id: generateId(), task: '', estimated_hours: 1, completed: false }
  ]);
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [tools, setTools] = useState<ToolItem[]>([]);
  const [crew, setCrew] = useState<CrewMember[]>([]);

  const { register, handleSubmit, formState: { errors } } = useForm<WorkOrderFormData>({
    resolver: zodResolver(workOrderSchema),
    defaultValues: {
      estimated_duration_hours: 4,
      start_date: new Date().toISOString().split('T')[0],
      expected_completion_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    }
  });

  const addTask = () => {
    setTasks([...tasks, { id: generateId(), task: '', estimated_hours: 1, completed: false }]);
  };

  const removeTask = (id: string) => {
    if (tasks.length > 1) {
      setTasks(tasks.filter(t => t.id !== id));
    }
  };

  const updateTask = (id: string, field: keyof TaskBreakdownItem, value: string | number) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const addMaterial = () => {
    setMaterials([...materials, { id: generateId(), name: '', quantity: 1, unit: 'pcs', available: true }]);
  };

  const removeMaterial = (id: string) => {
    setMaterials(materials.filter(m => m.id !== id));
  };

  const updateMaterial = (id: string, field: keyof MaterialItem, value: string | number | boolean) => {
    setMaterials(materials.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const addTool = () => {
    setTools([...tools, { id: generateId(), name: '', quantity: 1, available: true }]);
  };

  const removeTool = (id: string) => {
    setTools(tools.filter(t => t.id !== id));
  };

  const updateTool = (id: string, field: keyof ToolItem, value: string | number | boolean) => {
    setTools(tools.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const addCrewMember = () => {
    setCrew([...crew, { id: generateId(), name: '', role: '', available: true }]);
  };

  const removeCrewMember = (id: string) => {
    setCrew(crew.filter(c => c.id !== id));
  };

  const updateCrewMember = (id: string, field: keyof CrewMember, value: string | boolean) => {
    setCrew(crew.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const handleFormSubmit = (data: WorkOrderFormData) => {
    onSubmit({
      complaint_id: complaint.id,
      task_breakdown: tasks.filter(t => t.task.trim()),
      materials_required: materials.filter(m => m.name.trim()),
      tools_required: tools.filter(t => t.name.trim()),
      assigned_crew: crew.filter(c => c.name.trim()),
      estimated_duration_hours: data.estimated_duration_hours,
      start_date: data.start_date,
      expected_completion_date: data.expected_completion_date,
      sla_deadline: data.sla_deadline || undefined,
    });
  };

  return (
    <ScrollArea className="h-[70vh]">
      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6 pr-4">
        {/* Complaint Summary */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              Issue Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge>{complaint.category}</Badge>
              {complaint.sub_category && <Badge variant="outline">{complaint.sub_category}</Badge>}
            </div>
            <p className="text-sm">{complaint.description}</p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              {complaint.address || `${complaint.lat}, ${complaint.lng}`}
            </div>
          </CardContent>
        </Card>

        <Separator />

        {/* Task Breakdown */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Task Breakdown
            </Label>
            <Button type="button" variant="outline" size="sm" onClick={addTask}>
              <Plus className="w-4 h-4 mr-1" /> Add Task
            </Button>
          </div>
          {tasks.map((task, index) => (
            <div key={task.id} className="flex gap-2 items-start">
              <div className="flex-1 space-y-1">
                <Input
                  placeholder={`Task ${index + 1} description`}
                  value={task.task}
                  onChange={(e) => updateTask(task.id, 'task', e.target.value)}
                />
              </div>
              <div className="w-24">
                <Input
                  type="number"
                  placeholder="Hours"
                  min={0.5}
                  step={0.5}
                  value={task.estimated_hours}
                  onChange={(e) => updateTask(task.id, 'estimated_hours', parseFloat(e.target.value))}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeTask(task.id)}
                disabled={tasks.length === 1}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>

        <Separator />

        {/* Materials Required */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold flex items-center gap-2">
              <Package className="w-4 h-4" />
              Materials Required
            </Label>
            <Button type="button" variant="outline" size="sm" onClick={addMaterial}>
              <Plus className="w-4 h-4 mr-1" /> Add Material
            </Button>
          </div>
          {materials.length === 0 && (
            <p className="text-sm text-muted-foreground">No materials added yet</p>
          )}
          {materials.map((material) => (
            <div key={material.id} className="flex gap-2 items-start">
              <Input
                className="flex-1"
                placeholder="Material name"
                value={material.name}
                onChange={(e) => updateMaterial(material.id, 'name', e.target.value)}
              />
              <Input
                className="w-20"
                type="number"
                placeholder="Qty"
                min={1}
                value={material.quantity}
                onChange={(e) => updateMaterial(material.id, 'quantity', parseInt(e.target.value))}
              />
              <Input
                className="w-20"
                placeholder="Unit"
                value={material.unit}
                onChange={(e) => updateMaterial(material.id, 'unit', e.target.value)}
              />
              <Button type="button" variant="ghost" size="icon" onClick={() => removeMaterial(material.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>

        <Separator />

        {/* Tools Required */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold flex items-center gap-2">
              <Wrench className="w-4 h-4" />
              Tools/Machinery Required
            </Label>
            <Button type="button" variant="outline" size="sm" onClick={addTool}>
              <Plus className="w-4 h-4 mr-1" /> Add Tool
            </Button>
          </div>
          {tools.length === 0 && (
            <p className="text-sm text-muted-foreground">No tools added yet</p>
          )}
          {tools.map((tool) => (
            <div key={tool.id} className="flex gap-2 items-start">
              <Input
                className="flex-1"
                placeholder="Tool/machinery name"
                value={tool.name}
                onChange={(e) => updateTool(tool.id, 'name', e.target.value)}
              />
              <Input
                className="w-20"
                type="number"
                placeholder="Qty"
                min={1}
                value={tool.quantity}
                onChange={(e) => updateTool(tool.id, 'quantity', parseInt(e.target.value))}
              />
              <Button type="button" variant="ghost" size="icon" onClick={() => removeTool(tool.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>

        <Separator />

        {/* Assigned Crew */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-base font-semibold flex items-center gap-2">
              <Users className="w-4 h-4" />
              Assigned Crew
            </Label>
            <Button type="button" variant="outline" size="sm" onClick={addCrewMember}>
              <Plus className="w-4 h-4 mr-1" /> Add Member
            </Button>
          </div>
          {crew.length === 0 && (
            <p className="text-sm text-muted-foreground">No crew members assigned yet</p>
          )}
          {crew.map((member) => (
            <div key={member.id} className="flex gap-2 items-start">
              <Input
                className="flex-1"
                placeholder="Name"
                value={member.name}
                onChange={(e) => updateCrewMember(member.id, 'name', e.target.value)}
              />
              <Input
                className="flex-1"
                placeholder="Role"
                value={member.role}
                onChange={(e) => updateCrewMember(member.id, 'role', e.target.value)}
              />
              <Button type="button" variant="ghost" size="icon" onClick={() => removeCrewMember(member.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>

        <Separator />

        {/* Timeline */}
        <div className="space-y-3">
          <Label className="text-base font-semibold flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Timeline & SLA
          </Label>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="estimated_duration_hours">Estimated Duration (hours)</Label>
              <Input
                id="estimated_duration_hours"
                type="number"
                step={0.5}
                min={0.5}
                {...register('estimated_duration_hours', { valueAsNumber: true })}
              />
              {errors.estimated_duration_hours && (
                <p className="text-sm text-destructive">{errors.estimated_duration_hours.message}</p>
              )}
            </div>
            
            <div className="space-y-1">
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                id="start_date"
                type="date"
                {...register('start_date')}
              />
              {errors.start_date && (
                <p className="text-sm text-destructive">{errors.start_date.message}</p>
              )}
            </div>
            
            <div className="space-y-1">
              <Label htmlFor="expected_completion_date">Expected Completion</Label>
              <Input
                id="expected_completion_date"
                type="date"
                {...register('expected_completion_date')}
              />
              {errors.expected_completion_date && (
                <p className="text-sm text-destructive">{errors.expected_completion_date.message}</p>
              )}
            </div>
            
            <div className="space-y-1">
              <Label htmlFor="sla_deadline">SLA Deadline (optional)</Label>
              <Input
                id="sla_deadline"
                type="date"
                {...register('sla_deadline')}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4">
          <Button type="button" variant="outline" className="flex-1" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" className="flex-1" disabled={isLoading}>
            {isLoading ? 'Creating...' : 'Create Work Order'}
          </Button>
        </div>
      </form>
    </ScrollArea>
  );
}
