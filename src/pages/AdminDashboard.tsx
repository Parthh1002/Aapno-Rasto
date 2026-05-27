import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { SignedImage } from '@/components/SignedImage';
import { useQueryClient } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';
import { 
  LayoutDashboard, 
  FileText, 
  Users, 
  Map, 
  Settings, 
  LogOut,
  Bell,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Search,
  Eye,
  UserCog,
  Shield,
  Loader2,
  ClipboardCheck,
  Trash2,
  ImageOff,
  Link2,
  Check,
  X,
  Menu
} from 'lucide-react';
import { db } from '@/lib/firebaseConfig';
import { collection, getDocs, doc, setDoc, updateDoc, deleteDoc, query, where } from 'firebase/firestore';
import { GovtHeader } from '@/components/GovtHeader';
import { GujaratMap } from '@/components/GujaratMap';
import { StatusTracker } from '@/components/StatusTracker';
import { ComplaintResolutionPhotos } from '@/components/ComplaintResolutionPhotos';
import { CompleteComplaintModal } from '@/components/admin/CompleteComplaintModal';
import { EngineerUpdateReview } from '@/components/admin/EngineerUpdateReview';
import { DashboardAnalytics } from '@/components/admin/DashboardAnalytics';
import { RecentHighPriority } from '@/components/admin/RecentHighPriority';
import { DuplicatesManager } from '@/components/admin/DuplicatesManager';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { formatDistanceToNow } from 'date-fns';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useAllComplaintsRealtime, useUpdateStatus } from '@/hooks/useComplaintsData';
import { useAssignComplaint } from '@/hooks/useComplaints';
import { Complaint as DBComplaint } from '@/types/models';
import { usePendingReviews } from '@/hooks/useEngineerUpdates';
import { Complaint } from '@/components/ComplaintCard';

type SidebarTab = 'dashboard' | 'complaints' | 'duplicates' | 'reviews' | 'map' | 'engineers' | 'settings';

export default function AdminDashboard() {
  const { t, language } = useLanguage();
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  
  // Use real-time complaints with automatic sync
  const { complaints, isLoading: isLoadingComplaints } = useAllComplaintsRealtime();
  const { data: pendingReviews = [] } = usePendingReviews();
  const assignComplaintMutation = useAssignComplaint();
  const { updateStatus } = useUpdateStatus();

  // Fetch real engineers from Firestore users collection
  const { data: engineers = [] } = useQuery({
    queryKey: ['admin-engineers'],
    queryFn: async () => {
      if (!db) return [];
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('role', '==', 'engineer'));
      const snapshot = await getDocs(q);
      
      const engineersList = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.full_name || data.email?.split('@')[0] || `Engineer (${doc.id.slice(0, 8)})`,
          email: data.email || '',
          phone: data.phone || '',
          department: data.department || '',
          employee_id: data.employee_id || '',
          experience: data.experience || '',
          id_proof_url: data.id_proof_url || '',
          certificate_url: data.certificate_url || '',
          profile_image_url: data.profile_image_url || '',
          assignedCount: 0 // Mocked for now, can be updated with actual tasks if needed
        };
      });
      return engineersList;
    },
    enabled: !!user?.id,
  });

  // Fetch pending engineer requests from Firestore
  const { data: pendingEngineerRequests = [], refetch: refetchRequests } = useQuery({
    queryKey: ['admin-engineer-requests'],
    queryFn: async () => {
      if (!db) return [];
      const requestsCol = collection(db, 'engineerRequests');
      const snapshot = await getDocs(requestsCol);
      const requests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      return requests.filter((r: any) => !r.approved && !r.rejected);
    },
    enabled: !!user?.id,
  });
  
  const [activeTab, setActiveTab] = useState<SidebarTab>('dashboard');
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [selectedDbComplaint, setSelectedDbComplaint] = useState<DBComplaint | null>(null);
  const [showComplaintDetail, setShowComplaintDetail] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterUrgency, setFilterUrgency] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [roleView, setRoleView] = useState<'admin' | 'engineer'>('admin');
  const [pendingAssignEngineerId, setPendingAssignEngineerId] = useState<string>('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const pendingReviewsCount = pendingReviews.length;

  const stats = {
    total: complaints.length,
    pending: complaints.filter(c => c.status === 'pending').length,
    inProgress: complaints.filter(c => c.status === 'in_progress').length,
    completed: complaints.filter(c => c.status === 'completed').length,
    highUrgency: complaints.filter(c => c.urgency === 'high' && c.status !== 'completed').length,
  };

  const filteredComplaints = complaints.filter(c => {
    if (filterStatus !== 'all' && c.status !== filterStatus) return false;
    if (filterUrgency !== 'all' && c.urgency !== filterUrgency) return false;
    if (searchQuery && !c.id.toLowerCase().includes(searchQuery.toLowerCase()) && 
        !c.description.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const handleAssignEngineer = async (complaintId: string, engineerId: string) => {
    try {
      await assignComplaintMutation.mutateAsync({ complaintId, engineerId });
      toast({
        title: "Engineer Assigned",
        description: `Complaint assigned successfully`,
      });
      setSelectedComplaint(prev => prev ? { ...prev, assignedTo: engineerId, status: 'in_progress' } : null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to assign engineer",
        variant: "destructive",
      });
    }
  };

  const handleSetUrgency = async (complaintId: string, urgency: 'high' | 'medium' | 'low') => {
    if (!db) return;
    try {
      await updateStatus(complaintId, 'pending', urgency);
      setSelectedComplaint(prev => prev ? { ...prev, urgency } : null);
      toast({
        title: "Urgency Updated",
        description: `Complaint set to ${urgency} priority`,
      });
    } catch (e) {
      toast({ title: "Error", description: "Failed to set urgency", variant: "destructive" });
    }
  };

  const handleDeleteComplaint = async (complaintId: string) => {
    if (!window.confirm('Are you sure you want to delete this complaint? This action cannot be undone.')) return;
    if (!db) return;
    try {
      await deleteDoc(doc(db, 'complaints', complaintId));
      toast({ title: "Complaint Deleted", description: "Complaint removed successfully" });
      setShowComplaintDetail(false);
      setSelectedComplaint(null);
      queryClient.invalidateQueries({ queryKey: ['all-complaints'] });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete complaint", variant: "destructive" });
    }
  };

  const handleDeleteImage = async (complaintId: string) => {
    if (!window.confirm('Delete the complaint image? This cannot be undone.')) return;
    if (!db) return;
    try {
      await setDoc(doc(db, 'complaints', complaintId), { image_url: '' }, { merge: true });
      toast({ title: "Image Removed", description: "Complaint image has been deleted" });
      queryClient.invalidateQueries({ queryKey: ['all-complaints'] });
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete image", variant: "destructive" });
    }
  };

  const handleApproveEngineer = async (request: any) => {
    if (!db) return;
    try {
      await setDoc(doc(db, 'engineerRequests', request.id), { approved: true }, { merge: true });
      
      await setDoc(doc(db, 'users', request.id), {
        email: request.email,
        full_name: request.full_name,
        role: 'engineer',
        phone: request.phone,
        department: request.department,
        employee_id: request.employee_id,
        address: request.address || '',
        experience: request.experience || '',
        profile_image_url: request.profile_image_url || '',
        id_proof_url: request.id_proof_url || '',
        certificate_url: request.certificate_url || '',
        created_at: new Date().toISOString()
      }, { merge: true });

      toast({ title: "Approved", description: "Engineer has been approved and can now log in." });
      refetchRequests();
      queryClient.invalidateQueries({ queryKey: ['admin-engineers'] });
    } catch (error) {
      toast({ title: "Error", description: "Failed to approve engineer.", variant: "destructive" });
    }
  };

  const handleRejectEngineer = async (requestId: string) => {
    if (!window.confirm('Are you sure you want to reject this engineer request?')) return;
    if (!db) return;
    try {
      await deleteDoc(doc(db, 'engineerRequests', requestId));
      toast({ title: "Rejected", description: "Engineer request has been rejected." });
      refetchRequests();
    } catch (error) {
      toast({ title: "Error", description: "Failed to reject engineer.", variant: "destructive" });
    }
  };

  const handleRemoveActiveEngineer = async (engineerId: string) => {
    if (!window.confirm('Are you sure you want to completely remove this engineer? They will no longer be able to log in as an engineer, and their assigned tasks will be reverted to pending.')) return;
    if (!db) return;
    try {
      // 1. Delete engineer from users collection
      await deleteDoc(doc(db, 'users', engineerId));
      
      // 2. Also delete from engineerRequests if they exist there
      await deleteDoc(doc(db, 'engineerRequests', engineerId));

      // 3. Revert assigned complaints to pending
      const assignedComplaints = complaints.filter(c => c.status === 'in_progress' && c.assignedTo === engineerId);
      for (const c of assignedComplaints) {
        await updateDoc(doc(db, 'complaints', c.id), { status: 'pending', assigned_to: null });
      }

      toast({ title: "Removed", description: "Engineer has been removed and tasks reverted." });
      queryClient.invalidateQueries({ queryKey: ['admin-engineers'] });
    } catch (error) {
      toast({ title: "Error", description: "Failed to remove engineer.", variant: "destructive" });
    }
  };

  const handleMarkComplete = (complaintId: string, category: string) => {
    // Find the complaint to pass to the modal
    const complaint = complaints.find(c => c.id === complaintId);
    if (complaint) {
      // Create a DB-like object for the modal
      const dbComplaint = {
        id: complaint.id,
        category: complaint.category,
        description: complaint.description,
        lat: complaint.location.lat,
        lng: complaint.location.lng,
        address: complaint.location.address,
        image_url: complaint.imageUrl || '',
        status: complaint.status,
        user_id: complaint.userId,
        created_at: complaint.createdAt.toISOString(),
        sub_category: complaint.subCategory || null,
        urgency: complaint.urgency || null,
        assigned_to: complaint.assignedTo || null,
        resolution_image_url: null,
        resolution_notes: null,
        resolution_photos: null,
        location_mismatch: null,
        points_awarded: complaint.pointsAwarded || null,
        updated_at: null,
        resolved_at: null,
      } as DBComplaint;
      setSelectedDbComplaint(dbComplaint);
      setShowCompleteModal(true);
    }
  };

  const getUrgencyBadge = (urgency?: string) => {
    switch (urgency) {
      case 'high': return <Badge className="bg-destructive text-destructive-foreground">High</Badge>;
      case 'medium': return <Badge className="bg-yellow-500 text-white">Medium</Badge>;
      case 'low': return <Badge className="bg-govt-green text-white">Low</Badge>;
      default: return <Badge variant="outline">-</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending': return <Badge className="status-pending">Pending</Badge>;
      case 'in_progress': return <Badge className="status-in-progress">In Progress</Badge>;
      case 'completed': return <Badge className="status-completed">Completed</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const renderSidebarContent = () => (
    <>
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <img 
            src="https://upload.wikimedia.org/wikipedia/commons/5/55/Emblem_of_India.svg" 
            alt="Emblem"
            className="h-10 w-auto"
          />
          <div>
            <h1 className="font-bold">{t('appName')}</h1>
            <p className="text-xs opacity-70">{roleView === 'admin' ? 'Admin' : 'Engineer'} Panel</p>
          </div>
        </div>
      </div>

      {/* Role Toggle */}
      <div className="p-4 border-b border-sidebar-border">
        <Tabs value={roleView} onValueChange={(v) => setRoleView(v as 'admin' | 'engineer')}>
          <TabsList className="grid w-full grid-cols-2 bg-sidebar-accent">
            <TabsTrigger value="admin" className="text-xs data-[state=active]:bg-sidebar-primary data-[state=active]:text-sidebar-primary-foreground">
              <Shield className="w-3 h-3 mr-1" />
              Admin
            </TabsTrigger>
            <TabsTrigger value="engineer" className="text-xs data-[state=active]:bg-sidebar-primary data-[state=active]:text-sidebar-primary-foreground">
              <UserCog className="w-3 h-3 mr-1" />
              Engineer
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {[
          { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
          { id: 'complaints', icon: FileText, label: 'Complaints' },
          ...(roleView === 'admin' ? [{ id: 'duplicates', icon: Link2, label: 'Duplicates' }] : []),
          ...(roleView === 'admin' ? [{ id: 'reviews', icon: ClipboardCheck, label: 'Reviews', badge: pendingReviewsCount }] : []),
          { id: 'map', icon: Map, label: 'Live Map' },
          ...(roleView === 'admin' ? [{ id: 'engineers', icon: Users, label: 'Engineers' }] : []),
          { id: 'settings', icon: Settings, label: 'Settings' },
        ].map((item) => {
          const Icon = item.icon;
          const badge = 'badge' in item ? item.badge : undefined;
          return (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === 'settings') navigate('/settings');
                else {
                  setActiveTab(item.id as SidebarTab);
                  setIsMobileMenuOpen(false);
                }
              }}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                activeTab === item.id
                  ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                  : "hover:bg-sidebar-accent text-sidebar-foreground"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="flex-1 text-left">{item.label}</span>
              {badge !== undefined && badge > 0 && (
                <Badge variant="destructive" className="ml-auto">
                  {badge}
                </Badge>
              )}
            </button>
          );
        })}
      </nav>

      {/* User Info */}
      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-sidebar-primary flex items-center justify-center">
            <span className="text-sidebar-primary-foreground font-bold">
              {roleView === 'admin' ? 'A' : 'E'}
            </span>
          </div>
          <div>
            <p className="text-sm font-medium truncate max-w-[140px]">
              {user?.email}
            </p>
            <p className="text-xs opacity-70 capitalize">{roleView}</p>
          </div>
        </div>
        <Button
          onClick={logout}
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout
        </Button>
      </div>
    </>
  );

  const renderSidebar = () => (
    <div className="hidden lg:flex flex-col w-64 bg-sidebar text-sidebar-foreground min-h-screen fixed top-0 left-0 bottom-0 z-50">
      {renderSidebarContent()}
    </div>
  );

  const renderDashboard = () => {
    if (isLoadingComplaints) {
      return (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-accent" />
        </div>
      );
    }

    return (
    <div className="space-y-6 lg:pl-64">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total', value: stats.total, icon: FileText, color: 'text-foreground' },
          { label: 'Pending', value: stats.pending, icon: Clock, color: 'text-govt-saffron' },
          { label: 'In Progress', value: stats.inProgress, icon: TrendingUp, color: 'text-yellow-500' },
          { label: 'Completed', value: stats.completed, icon: CheckCircle, color: 'text-govt-green' },
          { label: 'High Priority', value: stats.highUrgency, icon: AlertTriangle, color: 'text-destructive' },
        ].map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="stat-card">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                      <p className={cn("text-2xl font-bold", stat.color)}>{stat.value}</p>
                    </div>
                    <Icon className={cn("w-8 h-8 opacity-50", stat.color)} />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Analytics Charts */}
      <DashboardAnalytics complaints={complaints} />

      {/* Map and Recent */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="govt-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center justify-between">
              <span>{t('liveMap')}</span>
              <Button 
                size="sm" 
                variant={showHeatmap ? "default" : "outline"}
                onClick={() => setShowHeatmap(!showHeatmap)}
              >
                Heatmap
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <GujaratMap 
              complaints={complaints} 
              showHeatmap={showHeatmap}
              height="300px"
              onMarkerClick={(c) => {
                setSelectedComplaint(c);
                setShowComplaintDetail(true);
              }}
            />
          </CardContent>
        </Card>

        <div className="h-[400px]">
          <RecentHighPriority 
            complaints={complaints} 
            onComplaintClick={(c) => {
              setSelectedComplaint(c);
              setShowComplaintDetail(true);
            }} 
          />
        </div>
      </div>
    </div>
    );
  };

  const renderComplaints = () => (
    <div className="space-y-4 lg:pl-64">
      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by ID or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterUrgency} onValueChange={setFilterUrgency}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Urgency" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Urgency</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="govt-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Urgency</TableHead>
              <TableHead>Assigned</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredComplaints.map((complaint) => (
              <TableRow 
                key={complaint.id} 
                className="cursor-pointer hover:bg-muted/80 transition-colors"
                onClick={() => {
                  setSelectedComplaint(complaint);
                  setShowComplaintDetail(true);
                }}
              >
                <TableCell className="font-mono font-medium">{complaint.id}</TableCell>
                <TableCell>{t(complaint.category)}</TableCell>
                <TableCell className="max-w-[150px] truncate">{complaint.location.address}</TableCell>
                <TableCell>{getStatusBadge(complaint.status)}</TableCell>
                <TableCell>{getUrgencyBadge(complaint.urgency)}</TableCell>
                <TableCell>
                  {complaint.assignedTo 
                    ? engineers.find(e => e.id === complaint.assignedTo)?.name || 'Unknown Engineer'
                    : '-'}
                </TableCell>
                <TableCell>{complaint.createdAt.toLocaleDateString()}</TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedComplaint(complaint);
                      setShowComplaintDetail(true);
                    }}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );

  const renderMap = () => (
    <div className="lg:pl-64 h-[calc(100vh-100px)]">
      <Card className="govt-card h-full">
        <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle>{t('liveMap')}</CardTitle>
          <Button 
            variant={showHeatmap ? "default" : "outline"}
            onClick={() => setShowHeatmap(!showHeatmap)}
          >
            {t('heatmapView')}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="h-[calc(100%-80px)]">
        <GujaratMap 
          complaints={complaints} 
          showHeatmap={showHeatmap}
          height="100%"
          onMarkerClick={(c) => {
            setSelectedComplaint(c);
            setShowComplaintDetail(true);
          }}
        />
      </CardContent>
    </Card>
    </div>
  );

  const renderDuplicates = () => {
    return (
      <div className="lg:pl-64">
        <DuplicatesManager 
          complaints={complaints}
        onMerge={async (masterId, duplicateIds) => {
          // Placeholder for real backend logic
          toast({
            title: "Merged Successfully",
            description: `${duplicateIds.length} complaints merged into master ${masterId}.`
          });
        }}
        onReject={async (groupId) => {
           toast({
            title: "Group Dismissed",
            description: `Group ${groupId} has been dismissed from duplicate detection.`
          });
        }}
        onViewComplaint={(c) => {
          setSelectedComplaint(c);
          setShowComplaintDetail(true);
        }}
      />
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return renderDashboard();
      case 'complaints': return renderComplaints();
      case 'duplicates': return renderDuplicates();
      case 'reviews': return <div className="lg:pl-64"><EngineerUpdateReview /></div>;
      case 'map': return renderMap();
      case 'engineers': return (
        <div className="space-y-6 lg:pl-64">
          <Card className="govt-card">
            <CardHeader>
              <CardTitle>Pending Engineer Requests</CardTitle>
            </CardHeader>
            <CardContent>
              {pendingEngineerRequests.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No pending requests.</p>
              ) : (
                <div className="space-y-4">
                  {pendingEngineerRequests.map((req: any) => (
                    <div key={req.id} className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 rounded-lg bg-muted/50 gap-4 border border-border">
                      <div className="flex items-start gap-3 w-full">
                        <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center shrink-0 overflow-hidden border-2 border-accent/30">
                          {req.profile_image_url ? (
                            <img src={req.profile_image_url} alt="Profile" className="w-full h-full object-cover" />
                          ) : (
                            <UserCog className="w-6 h-6 text-accent" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-lg">{req.full_name}</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
                            <p><span className="font-semibold text-foreground/80">Email:</span> {req.email}</p>
                            <p><span className="font-semibold text-foreground/80">Phone:</span> {req.phone}</p>
                            <p><span className="font-semibold text-foreground/80">Department:</span> {req.department}</p>
                            <p><span className="font-semibold text-foreground/80">Employee ID:</span> {req.employee_id}</p>
                            <p><span className="font-semibold text-foreground/80">Address:</span> {req.address}</p>
                            <p><span className="font-semibold text-foreground/80">Experience:</span> {req.experience ? `${req.experience} Years` : 'N/A'}</p>
                          </div>
                          
                          {(req.id_proof_url || req.certificate_url || req.profile_image_url) && (
                            <div className="flex flex-wrap gap-3 mt-3">
                              {req.profile_image_url && (
                                <a href={req.profile_image_url} target="_blank" rel="noopener noreferrer" className="text-xs flex items-center gap-1 text-primary hover:underline">
                                  <ImageOff className="w-3 h-3" /> View Profile Photo
                                </a>
                              )}
                              {req.id_proof_url && (
                                <a href={req.id_proof_url} target="_blank" rel="noopener noreferrer" className="text-xs flex items-center gap-1 text-primary hover:underline">
                                  <FileText className="w-3 h-3" /> View ID Proof
                                </a>
                              )}
                              {req.certificate_url && (
                                <a href={req.certificate_url} target="_blank" rel="noopener noreferrer" className="text-xs flex items-center gap-1 text-primary hover:underline">
                                  <FileText className="w-3 h-3" /> View Certificate
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex gap-2 shrink-0 self-end md:self-auto w-full md:w-auto">
                        <Button variant="default" size="sm" className="flex-1 md:flex-none bg-govt-green hover:bg-govt-green/90" onClick={() => handleApproveEngineer(req)}>
                          <Check className="w-4 h-4 mr-1" /> Approve
                        </Button>
                        <Button variant="destructive" size="sm" className="flex-1 md:flex-none" onClick={() => handleRejectEngineer(req.id)}>
                          <X className="w-4 h-4 mr-1" /> Reject
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="govt-card">
            <CardHeader>
              <CardTitle>Active Engineers</CardTitle>
            </CardHeader>
            <CardContent>
              {engineers.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No engineers registered yet.</p>
              ) : (
                <div className="space-y-4">
                  {engineers.map((eng) => (
                    <div key={eng.id} className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 rounded-lg bg-muted/50 gap-4 border border-border">
                      <div className="flex items-start gap-3 w-full">
                        <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center shrink-0 overflow-hidden border-2 border-accent/30">
                          {eng.profile_image_url ? (
                            <img src={eng.profile_image_url} alt="Profile" className="w-full h-full object-cover" />
                          ) : (
                            <UserCog className="w-6 h-6 text-accent" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-lg">{eng.name}</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1 mt-2 text-sm text-muted-foreground">
                            <p><span className="font-semibold text-foreground/80">Email:</span> {eng.email || 'N/A'}</p>
                            <p><span className="font-semibold text-foreground/80">Phone:</span> {eng.phone || 'N/A'}</p>
                            <p><span className="font-semibold text-foreground/80">Department:</span> {eng.department || 'N/A'}</p>
                            <p><span className="font-semibold text-foreground/80">Employee ID:</span> {eng.employee_id || 'N/A'}</p>
                            <p><span className="font-semibold text-foreground/80">Experience:</span> {eng.experience ? `${eng.experience} Years` : 'N/A'}</p>
                          </div>
                          
                          {(eng.id_proof_url || eng.certificate_url || eng.profile_image_url) && (
                            <div className="flex flex-wrap gap-3 mt-3">
                              {eng.profile_image_url && (
                                <a href={eng.profile_image_url} target="_blank" rel="noopener noreferrer" className="text-xs flex items-center gap-1 text-primary hover:underline">
                                  <ImageOff className="w-3 h-3" /> View Profile Photo
                                </a>
                              )}
                              {eng.id_proof_url && (
                                <a href={eng.id_proof_url} target="_blank" rel="noopener noreferrer" className="text-xs flex items-center gap-1 text-primary hover:underline">
                                  <FileText className="w-3 h-3" /> View ID Proof
                                </a>
                              )}
                              {eng.certificate_url && (
                                <a href={eng.certificate_url} target="_blank" rel="noopener noreferrer" className="text-xs flex items-center gap-1 text-primary hover:underline">
                                  <FileText className="w-3 h-3" /> View Certificate
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex gap-2 shrink-0 self-end md:self-auto w-full md:w-auto">
                        <Button variant="destructive" size="sm" className="flex-1 md:flex-none" onClick={() => handleRemoveActiveEngineer(eng.id)}>
                          <Trash2 className="w-4 h-4 mr-1" /> Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      );
      case 'settings': return (
        <div className="lg:pl-64">
          <Card className="govt-card">
            <CardHeader>
            <CardTitle>Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Settings panel coming soon...</p>
          </CardContent>
        </Card>
        </div>
      );
      default: return null;
    }
  };

  return (
    <div className="flex min-h-screen bg-background">
      {renderSidebar()}

      <div className="flex-1 flex flex-col min-h-screen">
        {/* Mobile Header */}
        <div className="lg:hidden sticky top-0 z-40 bg-background border-b border-border shadow-sm">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="shrink-0">
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-72 bg-sidebar border-r-0">
                  <SheetHeader className="sr-only">
                    <SheetTitle>Navigation Menu</SheetTitle>
                  </SheetHeader>
                  <div className="flex flex-col h-full overflow-y-auto">
                    {renderSidebarContent()}
                  </div>
                </SheetContent>
              </Sheet>
              <h1 className="text-xl font-bold capitalize truncate max-w-[150px] md:max-w-[300px]">
                {activeTab === 'dashboard' ? t('appName') : activeTab}
              </h1>
            </div>
            
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative hover:bg-muted">
                    <Bell className="w-5 h-5 text-foreground" />
                    {pendingReviews.length > 0 && (
                      <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-destructive border-2 border-background animate-pulse" />
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0 mr-2 mt-2" align="end">
                  <div className="p-4 border-b border-border/50">
                    <h3 className="font-semibold flex items-center justify-between">
                      Notifications
                      {pendingReviews.length > 0 && (
                        <Badge variant="destructive" className="ml-2">{pendingReviews.length} New</Badge>
                      )}
                    </h3>
                  </div>
                  <ScrollArea className="h-[300px]">
                    {pendingReviews.length > 0 ? (
                      <div className="flex flex-col">
                        {pendingReviews.map((update: any) => (
                          <div 
                            key={update.id} 
                            className="p-4 border-b border-border/50 hover:bg-muted/50 cursor-pointer transition-colors"
                            onClick={() => {
                              setActiveTab('reviews');
                              setIsMobileMenuOpen(false);
                            }}
                          >
                            <div className="flex justify-between items-start mb-1">
                              <span className="font-medium text-sm text-foreground">
                                Update from Engineer
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {formatDistanceToNow(new Date(update.created_at), { addSuffix: true })}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {update.message || `Photo uploaded for complaint ${update.work_order?.complaint?.category}`}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-8 text-center flex flex-col items-center justify-center text-muted-foreground">
                        <CheckCircle className="w-8 h-8 mb-2 text-govt-green opacity-50" />
                        <p className="text-sm">You're all caught up!</p>
                      </div>
                    )}
                  </ScrollArea>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        {/* Desktop Header */}
        <header className="hidden lg:flex items-center justify-between p-6 border-b border-border pl-72">
          <div>
            <h1 className="text-2xl font-bold capitalize">{activeTab}</h1>
            <p className="text-sm text-muted-foreground">
              {roleView === 'admin' ? 'Manage all complaints and assignments' : 'View and complete your assigned tasks'}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative hover:bg-muted">
                  <Bell className="w-5 h-5 text-foreground" />
                  {pendingReviews.length > 0 && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-destructive border-2 border-background animate-pulse" />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-0" align="end">
                <div className="p-4 border-b border-border/50">
                  <h3 className="font-semibold flex items-center justify-between">
                    Notifications
                    {pendingReviews.length > 0 && (
                      <Badge variant="destructive" className="ml-2">{pendingReviews.length} New</Badge>
                    )}
                  </h3>
                </div>
                <ScrollArea className="h-[300px]">
                  {pendingReviews.length > 0 ? (
                    <div className="flex flex-col">
                      {pendingReviews.map((update: any) => (
                        <div 
                          key={update.id} 
                          className="p-4 border-b border-border/50 hover:bg-muted/50 cursor-pointer transition-colors"
                          onClick={() => setActiveTab('reviews')}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-medium text-sm text-foreground">
                              Update from Engineer
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {formatDistanceToNow(new Date(update.created_at), { addSuffix: true })}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {update.message || `Photo uploaded for complaint ${update.work_order?.complaint?.category}`}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-8 text-center flex flex-col items-center justify-center text-muted-foreground">
                      <CheckCircle className="w-8 h-8 mb-2 text-govt-green opacity-50" />
                      <p className="text-sm">You're all caught up!</p>
                    </div>
                  )}
                </ScrollArea>
              </PopoverContent>
            </Popover>
          </div>
        </header>

        {/* Main Content */}
        <main className="p-4 md:p-6 flex-1 overflow-x-hidden">
          {renderContent()}
        </main>
      </div>

      {/* Complaint Detail Modal */}
      <Dialog open={showComplaintDetail} onOpenChange={(open) => {
        setShowComplaintDetail(open);
        if (!open) setPendingAssignEngineerId('');
      }}>
        <DialogContent className="w-full md:max-w-3xl lg:max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedComplaint && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  Complaint {selectedComplaint.id}
                  {getUrgencyBadge(selectedComplaint.urgency)}
                </DialogTitle>
              </DialogHeader>

              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column: Image and Details */}
                <div className="space-y-6">
                  {/* Image */}
                  {selectedComplaint.imageUrl && (
                    <div className="relative">
                      <SignedImage 
                        url={selectedComplaint.imageUrl} 
                        alt="Complaint" 
                        className="w-full h-48 md:h-64 object-cover rounded-lg"
                      />
                      {roleView === 'admin' && (
                        <Button
                          size="sm"
                          variant="destructive"
                          className="absolute top-2 right-2"
                          onClick={() => handleDeleteImage(selectedComplaint.id)}
                        >
                          <ImageOff className="w-4 h-4 mr-1" />
                          Delete Image
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Details */}
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Category</p>
                      <p className="font-medium">{t(selectedComplaint.category)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Description</p>
                      <p>{selectedComplaint.description}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Location</p>
                      <p>{selectedComplaint.location.address}</p>
                      <p className="text-xs text-muted-foreground">
                        {selectedComplaint.location.lat.toFixed(4)}, {selectedComplaint.location.lng.toFixed(4)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">User ID</p>
                      <p className="font-mono">{selectedComplaint.userId}</p>
                    </div>
                  </div>
                </div>

                {/* Right Column: Status and Actions */}
                <div className="space-y-6 md:border-l md:border-border/50 md:pl-6">
                  {/* Status */}
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Status</p>
                    <StatusTracker currentStatus={selectedComplaint.status} />
                  </div>

                  {/* Admin Actions */}
                  {roleView === 'admin' && selectedComplaint.status === 'pending' && (
                    <div className="space-y-4 pt-4 border-t border-border/50">
                      <div>
                        <p className="text-sm font-medium mb-2">Set Urgency</p>
                        <div className="flex gap-2">
                          {(['high', 'medium', 'low'] as const).map((level) => (
                            <Button
                              key={level}
                              size="sm"
                              variant={selectedComplaint.urgency === level ? "default" : "outline"}
                              onClick={() => handleSetUrgency(selectedComplaint.id, level)}
                            >
                              {level}
                            </Button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="text-sm font-medium mb-2">Assign Engineer</p>
                        <Select value={pendingAssignEngineerId} onValueChange={setPendingAssignEngineerId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select engineer" />
                          </SelectTrigger>
                          <SelectContent>
                            {engineers && engineers.length > 0 ? (
                              engineers.map((eng) => (
                                <SelectItem key={eng.id} value={eng.id}>
                                  {eng.name} ({eng.assignedCount} tasks)
                                </SelectItem>
                              ))
                            ) : (
                              <div className="p-2 text-sm text-muted-foreground text-center">
                                No engineers available
                              </div>
                            )}
                          </SelectContent>
                        </Select>
                        
                        {/* Confirm Assign Button */}
                        {pendingAssignEngineerId && (
                          <div className="mt-4">
                            <Button
                              className="w-full bg-govt-green hover:bg-govt-green/90 text-white"
                              onClick={() => {
                                handleAssignEngineer(selectedComplaint.id, pendingAssignEngineerId);
                                setPendingAssignEngineerId('');
                              }}
                            >
                              <Check className="w-4 h-4 mr-2" />
                              Confirm Assign
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Delete Complaint */}
                      <div className="mt-12 pt-4 border-t border-border/50">
                        <Button
                          variant="destructive"
                          size="sm"
                          className="w-full"
                          onClick={() => handleDeleteComplaint(selectedComplaint.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete Complaint
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Admin delete for non-pending too */}
                  {roleView === 'admin' && selectedComplaint.status !== 'pending' && (
                    <div className="pt-4 border-t border-border/50">
                      <Button
                        variant="destructive"
                        size="sm"
                        className="w-full"
                        onClick={() => handleDeleteComplaint(selectedComplaint.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Complaint
                      </Button>
                    </div>
                  )}

                  {/* Engineer Actions */}
                  {roleView === 'engineer' && selectedComplaint.status === 'in_progress' && (
                    <div className="pt-4 border-t border-border/50">
                      <Button
                        className="w-full btn-saffron"
                        onClick={() => handleMarkComplete(selectedComplaint.id, selectedComplaint.category)}
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Mark as Completed
                      </Button>
                      <p className="text-xs text-center text-muted-foreground mt-2">
                        Upload proof photos required
                      </p>
                    </div>
                  )}

                  {/* Resolution Photos (if completed) */}
                  {selectedComplaint.status === 'completed' && selectedDbComplaint?.resolution_photos?.length && (
                    <div className="pt-4 border-t border-border/50">
                      <ComplaintResolutionPhotos
                        photos={selectedDbComplaint.resolution_photos}
                        resolvedAt={selectedDbComplaint.resolved_at}
                        resolutionNotes={selectedDbComplaint.resolution_notes}
                        pointsAwarded={selectedDbComplaint.points_awarded}
                      />
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Complete Complaint Modal */}
      {selectedDbComplaint && (
        <CompleteComplaintModal
          open={showCompleteModal}
          onOpenChange={(open) => {
            setShowCompleteModal(open);
            if (!open) setSelectedDbComplaint(null);
          }}
          complaintId={selectedDbComplaint.id}
          complaintCategory={selectedDbComplaint.category}
        />
      )}
    </div>
  );
}
