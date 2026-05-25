import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '@/contexts/AuthContext';
import { SignedImage } from '@/components/SignedImage';
import { GovtHeader } from '@/components/GovtHeader';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useAssignedComplaints, useResolveComplaint, uploadComplaintImage } from '@/hooks/useComplaints';
import { Complaint } from '@/types/models';
import { 
  usePendingVerification, 
  useEngineerWorkOrders, 
  useCreateWorkOrder,
  VerificationQueueItem,
  WorkOrder 
} from '@/hooks/useWorkOrders';
import { useWorkOrderNotifications } from '@/hooks/useWorkOrderNotifications';
import { TaskCard } from '@/components/TaskCard';
import { ResolutionCapture } from '@/components/ResolutionCapture';
import { VerificationQueueCard } from '@/components/engineer/VerificationQueueCard';
import { WorkOrderCard } from '@/components/engineer/WorkOrderCard';
import { WorkOrderForm } from '@/components/engineer/WorkOrderForm';
import { SafetyChecklistModal } from '@/components/engineer/SafetyChecklistModal';
import { FieldUpdateModal } from '@/components/engineer/FieldUpdateModal';
import { SLADashboard } from '@/components/engineer/SLADashboard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { 
  LayoutDashboard, 
  ClipboardList, 
  CheckCircle2, 
  MapPin, 
  User,
  LogOut,
  Settings,
  Menu,
  Clock,
  AlertTriangle,
  Loader2,
  FileCheck,
  Briefcase,
  Timer,
  ShieldCheck,
  Gauge
} from 'lucide-react';

type TabValue = 'dashboard' | 'verification-queue' | 'work-orders' | 'sla-dashboard' | 'tasks' | 'completed' | 'profile';

export default function EngineerDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Enable real-time toast notifications for work order changes
  useWorkOrderNotifications();
  
  const [activeTab, setActiveTab] = useState<TabValue>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [resolvingComplaint, setResolvingComplaint] = useState<Complaint | null>(null);
  
  // New states for work order flow
  const [verifyingComplaint, setVerifyingComplaint] = useState<VerificationQueueItem | null>(null);
  const [selectedWorkOrder, setSelectedWorkOrder] = useState<(WorkOrder & { complaint: VerificationQueueItem }) | null>(null);
  const [showSafetyChecklist, setShowSafetyChecklist] = useState(false);
  const [showFieldUpdate, setShowFieldUpdate] = useState(false);
  
  const { data: complaints = [], isLoading, refetch } = useAssignedComplaints();
  const { data: pendingComplaints = [], isLoading: pendingLoading } = usePendingVerification();
  const { data: workOrders = [], isLoading: workOrdersLoading, refetch: refetchWorkOrders } = useEngineerWorkOrders();
  const resolveComplaint = useResolveComplaint();
  const createWorkOrder = useCreateWorkOrder();

  const handleLogout = async () => {
    await logout();
    navigate('/auth');
  };

  const pendingTasks = complaints.filter(c => c.status === 'pending');
  const inProgressTasks = complaints.filter(c => c.status === 'in_progress');
  const completedTasks = complaints.filter(c => c.status === 'completed');
  const todayCompleted = completedTasks.filter(c => {
    if (!c.resolved_at) return false;
    const today = new Date();
    const resolved = new Date(c.resolved_at);
    return resolved.toDateString() === today.toDateString();
  });

  // Work order stats
  const draftWorkOrders = workOrders.filter(wo => wo.status === 'draft');
  const inProgressWorkOrders = workOrders.filter(wo => wo.status === 'in_progress');
  const completedWorkOrders = workOrders.filter(wo => wo.status === 'completed');
  const blockedWorkOrders = workOrders.filter(wo => wo.status === 'blocked');

  const handleResolve = (complaint: Complaint) => {
    setResolvingComplaint(complaint);
    setSelectedComplaint(null);
  };

  const handleViewDetails = (complaint: Complaint) => {
    setSelectedComplaint(complaint);
  };

  const handleVerifyComplaint = (complaint: VerificationQueueItem) => {
    setVerifyingComplaint(complaint);
  };

  const handleViewComplaintDetails = (complaint: VerificationQueueItem) => {
    // Convert to Complaint for the existing dialog
    setSelectedComplaint({
      ...complaint,
      status: complaint.status as any,
      urgency: complaint.urgency as any,
      location_mismatch: false,
      points_awarded: 0,
      updated_at: complaint.created_at,
      resolved_at: null,
      resolution_image_url: null,
      resolution_notes: null,
      resolution_lat: null,
      resolution_lng: null,
      resolution_photos: null,
    });
  };

  const handleCreateWorkOrder = async (data: Parameters<typeof createWorkOrder.mutateAsync>[0]) => {
    try {
      await createWorkOrder.mutateAsync(data);
      toast({
        title: 'Work Order Created',
        description: 'The complaint has been assigned to you and a work order has been created.',
      });
      setVerifyingComplaint(null);
      refetchWorkOrders();
    } catch (error) {
      console.error('Work order creation error:', error);
      toast({
        title: 'Error',
        description: 'Failed to create work order. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const handleStartWork = (workOrder: WorkOrder & { complaint: VerificationQueueItem }) => {
    setSelectedWorkOrder(workOrder);
    setShowSafetyChecklist(true);
  };

  const handleViewWorkOrderDetails = (workOrder: WorkOrder & { complaint: VerificationQueueItem }) => {
    setSelectedWorkOrder(workOrder);
  };

  const handleUpdateWorkOrderStatus = (workOrder: WorkOrder & { complaint: VerificationQueueItem }) => {
    setSelectedWorkOrder(workOrder);
    setShowFieldUpdate(true);
  };

  const handleResolutionSubmit = async (data: {
    resolution_image: string;
    resolution_notes: string;
    resolution_lat: number;
    resolution_lng: number;
    location_mismatch: boolean;
  }) => {
    if (!resolvingComplaint || !user?.id) return;

    try {
      const response = await fetch(data.resolution_image);
      const blob = await response.blob();
      const imageUrl = await uploadComplaintImage(blob, user.id, 'resolution');

      await resolveComplaint.mutateAsync({
        id: resolvingComplaint.id,
        resolution_image_url: imageUrl,
        resolution_notes: data.resolution_notes,
        resolution_lat: data.resolution_lat,
        resolution_lng: data.resolution_lng,
        location_mismatch: data.location_mismatch,
      });

      toast({
        title: 'Resolution Submitted',
        description: data.location_mismatch 
          ? 'Resolution submitted with location mismatch warning.'
          : 'The complaint has been successfully resolved.',
      });

      setResolvingComplaint(null);
      refetch();
    } catch (error) {
      console.error('Resolution error:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit resolution. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Calculate SLA stats for badge
  const slaBreachedCount = workOrders.filter(wo => 
    wo.sla_breached || (wo.sla_deadline && new Date(wo.sla_deadline) < new Date() && wo.status !== 'completed')
  ).length;

  const navItems: Array<{ id: TabValue; label: string; icon: typeof LayoutDashboard; badge?: number; badgeVariant?: 'default' | 'destructive' }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'verification-queue', label: 'Intake Queue', icon: FileCheck, badge: pendingComplaints.length },
    { id: 'work-orders', label: 'Work Orders', icon: Briefcase, badge: inProgressWorkOrders.length },
    { id: 'sla-dashboard', label: 'SLA Tracker', icon: Gauge, badge: slaBreachedCount, badgeVariant: slaBreachedCount > 0 ? 'destructive' : 'default' },
    { id: 'tasks', label: 'My Tasks', icon: ClipboardList, badge: inProgressTasks.length },
    { id: 'completed', label: 'Completed', icon: CheckCircle2, badge: completedTasks.length },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full space-y-2">
      <div className="mb-8 pl-4">
        <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">Engineer Portal</p>
      </div>
      
      <nav className="flex-1 space-y-2">
        {navItems.map((item) => (
          <Button
            key={item.id}
            variant={activeTab === item.id ? 'secondary' : 'ghost'}
            className="w-full justify-start text-base font-semibold"
            onClick={() => {
              setActiveTab(item.id);
              setSidebarOpen(false);
            }}
          >
            <item.icon className="w-5 h-5 mr-3" />
            {item.label}
            {item.badge !== undefined && item.badge > 0 && (
              <Badge variant={item.badgeVariant || "secondary"} className="ml-auto">
                {item.badge}
              </Badge>
            )}
          </Button>
        ))}
      </nav>
      
      <div className="pt-4 space-y-2 mt-auto">
        <Button variant="outline" className="w-full justify-start border-transparent hover:bg-sidebar-accent font-semibold" onClick={() => navigate('/settings')}>
          <Settings className="w-5 h-5 mr-3" />
          Settings
        </Button>
        <Button variant="outline" className="w-full justify-start text-destructive border-destructive hover:bg-destructive/10 font-semibold" onClick={handleLogout}>
          <LogOut className="w-5 h-5 mr-3" />
          Logout
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <GovtHeader variant="compact" />
      
      {/* Theme Toggle */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      <div className="container mx-auto px-4 md:px-8 py-6 max-w-7xl flex flex-col md:flex-row gap-8">
        
        {/* Mobile Header (Only visible on small screens) */}
        <header className="md:hidden flex items-center justify-between p-4 border-b bg-card rounded-lg mb-4">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </Button>
          <h1 className="font-bold">Engineer Portal</h1>
          <div className="w-10" />
        </header>

        {/* Mobile Sidebar Sheet */}
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetContent side="left" className="p-6 w-72">
            <SidebarContent />
          </SheetContent>
        </Sheet>

        {/* Desktop Sidebar Nav */}
        <aside className="hidden md:flex flex-col w-64 shrink-0 space-y-2 sticky top-6 h-[calc(100vh-100px)]">
          <SidebarContent />
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0">
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              
              <Card className="govt-card overflow-hidden border-0 shadow-lg">
                <div className="bg-gradient-to-r from-primary to-primary/80 p-8 text-primary-foreground relative">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
                  <h2 className="text-2xl md:text-3xl font-bold relative z-10">
                    Welcome back, Engineer 👋
                  </h2>
                  <p className="text-primary-foreground/80 mt-2 max-w-lg relative z-10">
                    Manage your assigned work orders and resolve citizen complaints efficiently to keep Gujarat moving forward.
                  </p>
                </div>
              </Card>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Intake Queue</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-orange-600">{pendingComplaints.length}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Active Work Orders</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">{inProgressWorkOrders.length}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Blocked</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-destructive">{blockedWorkOrders.length}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">{completedWorkOrders.length}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Priority Tasks */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                  Priority Work Orders
                </h2>
                {workOrdersLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {inProgressWorkOrders
                      .filter(wo => wo.complaint?.urgency === 'high' || wo.sla_breached)
                      .slice(0, 3)
                      .map((workOrder) => (
                        <WorkOrderCard
                          key={workOrder.id}
                          workOrder={workOrder as WorkOrder & { complaint: VerificationQueueItem }}
                          onStartWork={handleStartWork}
                          onViewDetails={handleViewWorkOrderDetails}
                          onUpdateStatus={handleUpdateWorkOrderStatus}
                        />
                      ))}
                    {inProgressWorkOrders.filter(wo => wo.complaint?.urgency === 'high' || wo.sla_breached).length === 0 && (
                      <p className="text-muted-foreground col-span-full">No high priority work orders</p>
                    )}
                  </div>
                )}
              </div>

              {/* Recent Intake */}
              <div className="space-y-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Recent Intake Queue
                </h2>
                {pendingLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {pendingComplaints.slice(0, 3).map((complaint) => (
                      <VerificationQueueCard
                        key={complaint.id}
                        complaint={complaint}
                        onVerify={handleVerifyComplaint}
                        onViewDetails={handleViewComplaintDetails}
                      />
                    ))}
                    {pendingComplaints.length === 0 && (
                      <p className="text-muted-foreground col-span-full">No complaints in queue</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'verification-queue' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Intake Queue</h1>
                <Badge variant="secondary" className="text-lg px-3 py-1">
                  {pendingComplaints.length} pending
                </Badge>
              </div>
              
              {pendingLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : pendingComplaints.length === 0 ? (
                <Card className="py-16">
                  <CardContent className="flex flex-col items-center justify-center text-center">
                    <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
                    <h3 className="text-lg font-semibold">All Clear!</h3>
                    <p className="text-muted-foreground">No complaints pending verification</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pendingComplaints.map((complaint) => (
                    <VerificationQueueCard
                      key={complaint.id}
                      complaint={complaint}
                      onVerify={handleVerifyComplaint}
                      onViewDetails={handleViewComplaintDetails}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'work-orders' && (
            <div className="space-y-6">
              <h1 className="text-2xl font-bold">Work Orders</h1>
              
              <Tabs defaultValue="active">
                <TabsList>
                  <TabsTrigger value="active">
                    Active ({inProgressWorkOrders.length})
                  </TabsTrigger>
                  <TabsTrigger value="blocked">
                    Blocked ({blockedWorkOrders.length})
                  </TabsTrigger>
                  <TabsTrigger value="draft">
                    Draft ({draftWorkOrders.length})
                  </TabsTrigger>
                  <TabsTrigger value="completed">
                    Completed ({completedWorkOrders.length})
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="active" className="mt-4">
                  {workOrdersLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                  ) : (
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {inProgressWorkOrders.map((workOrder) => (
                        <WorkOrderCard
                          key={workOrder.id}
                          workOrder={workOrder as WorkOrder & { complaint: VerificationQueueItem }}
                          onStartWork={handleStartWork}
                          onViewDetails={handleViewWorkOrderDetails}
                          onUpdateStatus={handleUpdateWorkOrderStatus}
                        />
                      ))}
                      {inProgressWorkOrders.length === 0 && (
                        <p className="text-muted-foreground col-span-full">No active work orders</p>
                      )}
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="blocked" className="mt-4">
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {blockedWorkOrders.map((workOrder) => (
                      <WorkOrderCard
                        key={workOrder.id}
                        workOrder={workOrder as WorkOrder & { complaint: VerificationQueueItem }}
                        onStartWork={handleStartWork}
                        onViewDetails={handleViewWorkOrderDetails}
                        onUpdateStatus={handleUpdateWorkOrderStatus}
                      />
                    ))}
                    {blockedWorkOrders.length === 0 && (
                      <p className="text-muted-foreground col-span-full">No blocked work orders</p>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="draft" className="mt-4">
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {draftWorkOrders.map((workOrder) => (
                      <WorkOrderCard
                        key={workOrder.id}
                        workOrder={workOrder as WorkOrder & { complaint: VerificationQueueItem }}
                        onStartWork={handleStartWork}
                        onViewDetails={handleViewWorkOrderDetails}
                        onUpdateStatus={handleUpdateWorkOrderStatus}
                      />
                    ))}
                    {draftWorkOrders.length === 0 && (
                      <p className="text-muted-foreground col-span-full">No draft work orders</p>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="completed" className="mt-4">
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {completedWorkOrders.map((workOrder) => (
                      <WorkOrderCard
                        key={workOrder.id}
                        workOrder={workOrder as WorkOrder & { complaint: VerificationQueueItem }}
                        onStartWork={handleStartWork}
                        onViewDetails={handleViewWorkOrderDetails}
                        onUpdateStatus={handleUpdateWorkOrderStatus}
                      />
                    ))}
                    {completedWorkOrders.length === 0 && (
                      <p className="text-muted-foreground col-span-full">No completed work orders</p>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}

          {activeTab === 'sla-dashboard' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Gauge className="w-6 h-6" />
                  SLA Tracker
                </h1>
                <Badge variant={slaBreachedCount > 0 ? "destructive" : "secondary"}>
                  {slaBreachedCount > 0 ? `${slaBreachedCount} breached` : 'All on track'}
                </Badge>
              </div>
              
              <SLADashboard 
                workOrders={workOrders as (WorkOrder & { complaint: VerificationQueueItem })[]}
                isLoading={workOrdersLoading}
              />
            </div>
          )}

          {activeTab === 'tasks' && (
            <div className="space-y-6">
              <h1 className="text-2xl font-bold">My Tasks</h1>
              
              <Tabs defaultValue="in_progress">
                <TabsList>
                  <TabsTrigger value="in_progress">
                    In Progress ({inProgressTasks.length})
                  </TabsTrigger>
                  <TabsTrigger value="pending">
                    Pending ({pendingTasks.length})
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="in_progress" className="mt-4">
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {inProgressTasks.map((complaint) => (
                      <TaskCard
                        key={complaint.id}
                        complaint={complaint}
                        onResolve={handleResolve}
                        onViewDetails={handleViewDetails}
                      />
                    ))}
                    {inProgressTasks.length === 0 && (
                      <p className="text-muted-foreground col-span-full">No tasks in progress</p>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="pending" className="mt-4">
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {pendingTasks.map((complaint) => (
                      <TaskCard
                        key={complaint.id}
                        complaint={complaint}
                        onResolve={handleResolve}
                        onViewDetails={handleViewDetails}
                      />
                    ))}
                    {pendingTasks.length === 0 && (
                      <p className="text-muted-foreground col-span-full">No pending tasks</p>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}

          {activeTab === 'completed' && (
            <div className="space-y-6">
              <h1 className="text-2xl font-bold">Completed Tasks</h1>
              
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {completedTasks.map((complaint) => (
                  <TaskCard
                    key={complaint.id}
                    complaint={complaint}
                    onResolve={handleResolve}
                    onViewDetails={handleViewDetails}
                  />
                ))}
                {completedTasks.length === 0 && (
                  <p className="text-muted-foreground col-span-full">No completed tasks yet</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'profile' && (
            <div className="space-y-6">
              <h1 className="text-2xl font-bold">Profile</h1>
              
              <Card className="max-w-md">
                <CardHeader>
                  <CardTitle>Engineer Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium">{user?.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Role</p>
                    <Badge>Engineer</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Work Orders Created</p>
                      <p className="font-medium">{workOrders.length}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Tasks Completed</p>
                      <p className="font-medium">{completedTasks.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </main>
      </div>

      {/* Task Details Dialog */}
      <Dialog open={!!selectedComplaint} onOpenChange={() => setSelectedComplaint(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Task Details</DialogTitle>
          </DialogHeader>
          {selectedComplaint && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4 pr-4">
                <div>
                  <p className="text-sm text-muted-foreground">Category</p>
                  <p className="font-medium">{selectedComplaint.category}</p>
                  {selectedComplaint.sub_category && (
                    <p className="text-sm text-muted-foreground">{selectedComplaint.sub_category}</p>
                  )}
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground">Description</p>
                  <p>{selectedComplaint.description}</p>
                </div>
                
                <div>
                  <p className="text-sm text-muted-foreground">Location</p>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span>{selectedComplaint.address || `${selectedComplaint.lat}, ${selectedComplaint.lng}`}</span>
                  </div>
                </div>
                
                {selectedComplaint.image_url && (
                  <SignedImage url={selectedComplaint.image_url} alt="Complaint" label="Complaint Photo" />
                )}

                {selectedComplaint.status === 'completed' && selectedComplaint.resolution_image_url && (
                  <SignedImage url={selectedComplaint.resolution_image_url} alt="Resolution" label="Resolution Photo" />
                )}
                {selectedComplaint.status === 'completed' && selectedComplaint.resolution_notes && (
                  <p className="mt-2 text-sm">{selectedComplaint.resolution_notes}</p>
                )}

                {selectedComplaint.status === 'in_progress' && (
                  <Button 
                    className="w-full" 
                    onClick={() => handleResolve(selectedComplaint)}
                  >
                    Start Resolution
                  </Button>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Work Order Creation Dialog */}
      <Dialog open={!!verifyingComplaint} onOpenChange={() => setVerifyingComplaint(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Briefcase className="w-5 h-5" />
              Create Work Order
            </DialogTitle>
          </DialogHeader>
          {verifyingComplaint && (
            <WorkOrderForm
              complaint={verifyingComplaint}
              onSubmit={handleCreateWorkOrder}
              onCancel={() => setVerifyingComplaint(null)}
              isLoading={createWorkOrder.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Safety Checklist Modal */}
      {selectedWorkOrder && (
        <SafetyChecklistModal
          workOrder={selectedWorkOrder}
          open={showSafetyChecklist}
          onOpenChange={setShowSafetyChecklist}
          onComplete={() => {
            refetchWorkOrders();
            setShowSafetyChecklist(false);
          }}
        />
      )}

      {/* Field Update Modal */}
      {selectedWorkOrder && (
        <FieldUpdateModal
          workOrder={selectedWorkOrder}
          open={showFieldUpdate}
          onOpenChange={setShowFieldUpdate}
          onComplete={() => {
            refetchWorkOrders();
            setShowFieldUpdate(false);
          }}
        />
      )}

      {/* Resolution Modal */}
      <Dialog open={!!resolvingComplaint} onOpenChange={() => setResolvingComplaint(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Submit Resolution</DialogTitle>
          </DialogHeader>
          {resolvingComplaint && (
            <ResolutionCapture
              complaint={resolvingComplaint}
              onSubmit={handleResolutionSubmit}
              onCancel={() => setResolvingComplaint(null)}
              isSubmitting={resolveComplaint.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
