import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { SignedImage } from '@/components/SignedImage';
import { Plus, Trash2, Camera, MapPin, AlertCircle, Loader2, X, Settings, Home, FileText, Map, Award, User, Bell, Trophy, Activity, ChevronRight, TrendingUp } from 'lucide-react';
import { GovtHeader } from '@/components/GovtHeader';
import { MobileNav } from '@/components/MobileNav';
import { ComplaintCard, Complaint } from '@/components/ComplaintCard';
import { RewardsSection } from '@/components/RewardsSection';
import { GujaratMap } from '@/components/GujaratMap';
import { LiveCameraCapture } from '@/components/LiveCameraCapture';
import { ThemeToggle } from '@/components/ThemeToggle';
import { StatusTracker } from '@/components/StatusTracker';
import { WorkProgressUpdates } from '@/components/citizen/WorkProgressUpdates';
import { ComplaintSolvedAlert } from '@/components/citizen/ComplaintSolvedAlert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { useCitizenComplaints } from '@/hooks/useComplaintsData';

const categories = [
  { value: 'garbage', label: 'Garbage', icon: '🗑️' },
  { value: 'streetLight', label: 'Street Light', icon: '💡' },
  { value: 'roadMaintenance', label: 'Road Maintenance', icon: '🛣️' },
  { value: 'waterSupply', label: 'Water Supply', icon: '💧' },
  { value: 'drainage', label: 'Drainage', icon: '🚿' },
  { value: 'publicSafety', label: 'Public Safety', icon: '🛡️' },
  { value: 'strayDog', label: 'Stray Dog Issue', icon: '🐕' },
];

const strayDogSubCategories = [
  { value: 'aggressiveBehavior', label: 'Aggressive Behavior' },
  { value: 'sterilizationRequest', label: 'Sterilization Request' },
  { value: 'sickInjuredAnimal', label: 'Sick/Injured Animal' },
];

const mockAnnouncements = [
  { id: 1, title: 'Water Supply Maintenance', date: 'Today, 2:00 PM', area: 'Navrangpura' },
  { id: 2, title: 'Road Repair Drive Started', date: 'Yesterday', area: 'SG Highway' },
  { id: 3, title: 'Free Health Camp', date: 'Sunday, 10:00 AM', area: 'Civil Hospital' }
];

const mockLeaderboard = [
  { id: 1, name: 'Rahul Desai', points: 450 },
  { id: 2, name: 'Priya Shah', points: 380 },
  { id: 3, name: 'Amit Patel', points: 310 }
];

export default function UserDashboard() {
  const { t, language } = useLanguage();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  // Use real-time complaints from Supabase
  const { complaints, isLoading, submitComplaint } = useCitizenComplaints();
  
  const [activeTab, setActiveTab] = useState('home');
  const [showCamera, setShowCamera] = useState(false);
  const [showFileComplaint, setShowFileComplaint] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  
  const [newComplaint, setNewComplaint] = useState({
    category: '',
    subCategory: '',
    description: '',
    imageData: '',
    location: null as { lat: number; lng: number } | null,
  });

  const [solvedAlert, setSolvedAlert] = useState<{ id: string, category: string, points?: number } | null>(null);
  const prevComplaintsRef = useRef<Complaint[]>([]);

  useEffect(() => {
    // Only check if we have previous complaints loaded to avoid triggering on initial load
    if (prevComplaintsRef.current.length > 0 && complaints.length > 0) {
      const newlyCompleted = complaints.find(c => 
        c.status === 'completed' && 
        prevComplaintsRef.current.find(pc => pc.id === c.id && pc.status !== 'completed')
      );
      
      if (newlyCompleted) {
        setSolvedAlert({
          id: newlyCompleted.id,
          category: newlyCompleted.category,
          points: newlyCompleted.pointsAwarded
        });
      }
    }
    prevComplaintsRef.current = complaints;
  }, [complaints]);

  const userPoints = complaints
    .filter(c => c.status === 'completed' && c.pointsAwarded)
    .reduce((sum, c) => sum + (c.pointsAwarded || 0), 0);

  const handleCameraCapture = (imageData: string, metadata: any) => {
    setNewComplaint({
      ...newComplaint,
      imageData,
      location: metadata.location ? { lat: metadata.location.lat, lng: metadata.location.lng } : null,
    });
    setShowCamera(false);
    
    if (!metadata.location) {
      toast({
        title: "Location Required",
        description: t('locationRequired'),
        variant: "destructive",
      });
    }
  };

  const handleSubmitComplaint = async () => {
    if (!newComplaint.category || !newComplaint.description || !newComplaint.imageData) {
      toast({
        title: "Incomplete Form",
        description: "Please fill all required fields and capture a photo",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      
      await submitComplaint({
        category: newComplaint.category,
        subCategory: newComplaint.subCategory || undefined,
        description: newComplaint.description,
        imageData: newComplaint.imageData,
        lat: newComplaint.location?.lat || 23.0225,
        lng: newComplaint.location?.lng || 72.5714,
        address: newComplaint.location ? 'Current Location' : 'Ahmedabad, Gujarat',
      });

      setShowFileComplaint(false);
      setNewComplaint({ category: '', subCategory: '', description: '', imageData: '', location: null });
      
      toast({
        title: t('complaintSubmitted'),
        description: "Your complaint has been registered successfully!",
      });
    } catch (error) {
      console.error('Error submitting complaint:', error);
      toast({
        title: "Error",
        description: "Failed to submit complaint. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <div className="space-y-8">
            {/* Welcome Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="govt-card overflow-hidden border-0 shadow-lg">
                <div className="bg-gradient-to-r from-primary to-primary/80 p-8 text-primary-foreground relative">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
                  <h2 className={cn(
                    "text-2xl md:text-3xl font-bold relative z-10",
                    language === 'gu' ? 'font-gujarati' : ''
                  )}>
                    {t('welcomeMessage')} 👋
                  </h2>
                  <p className={cn(
                    "text-primary-foreground/80 mt-2 max-w-lg relative z-10",
                    language === 'gu' ? 'font-gujarati' : ''
                  )}>
                    {t('description')}
                  </p>
                </div>
              </Card>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left Column - Main Dashboard Actions (8 columns) */}
              <div className="lg:col-span-8 space-y-8">
                
                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-4">
                  <Card className="bg-background border-border shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                      <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center mb-2">
                        <Activity className="w-5 h-5" />
                      </div>
                      <p className="text-2xl font-bold text-foreground">
                        {complaints.filter(c => c.status === 'pending').length}
                      </p>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                        {t('pending')}
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-background border-border shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                      <div className="w-10 h-10 rounded-full bg-yellow-500/10 text-yellow-500 flex items-center justify-center mb-2">
                        <Loader2 className="w-5 h-5" />
                      </div>
                      <p className="text-2xl font-bold text-foreground">
                        {complaints.filter(c => c.status === 'in_progress').length}
                      </p>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                        {t('inProgress')}
                      </p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-background border-border shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                      <div className="w-10 h-10 rounded-full bg-accent/10 text-accent flex items-center justify-center mb-2">
                        <Trophy className="w-5 h-5" />
                      </div>
                      <p className="text-2xl font-bold text-foreground">
                        {userPoints}
                      </p>
                      <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                        {t('points')}
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    onClick={() => setShowFileComplaint(true)}
                    className="w-full h-28 btn-saffron flex flex-col gap-3 rounded-xl shadow-md hover:shadow-lg transition-all hover:-translate-y-1"
                  >
                    <Plus className="w-8 h-8" />
                    <span className={cn("text-base font-semibold", language === 'gu' ? 'font-gujarati' : '')}>
                      {t('fileComplaint')}
                    </span>
                  </Button>

                  <Button
                    onClick={() => setActiveTab('map')}
                    variant="outline"
                    className="w-full h-28 flex flex-col gap-3 border-2 border-accent/20 hover:border-accent hover:bg-accent/5 rounded-xl transition-all hover:-translate-y-1"
                  >
                    <MapPin className="w-8 h-8 text-accent" />
                    <span className={cn("text-base font-semibold text-foreground", language === 'gu' ? 'font-gujarati' : '')}>
                      {t('liveMap')}
                    </span>
                  </Button>
                </div>

                {/* Impact Analytics (Feature 3) */}
                <Card className="govt-card shadow-sm border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-accent" />
                      Your Impact Analytics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-muted-foreground">Resolution Rate</span>
                          <span className="font-semibold">{complaints.length > 0 ? Math.round((complaints.filter(c => c.status === 'completed').length / complaints.length) * 100) : 0}%</span>
                        </div>
                        <Progress value={complaints.length > 0 ? (complaints.filter(c => c.status === 'completed').length / complaints.length) * 100 : 0} className="h-2" />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        You have submitted <strong className="text-foreground">{complaints.length}</strong> complaints. <strong className="text-green-500">{complaints.filter(c => c.status === 'completed').length}</strong> have been successfully resolved by the government.
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Recent Complaints */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className={cn("text-lg font-bold", language === 'gu' ? 'font-gujarati' : '')}>
                      {t('myComplaints')}
                    </h3>
                    <Button variant="ghost" size="sm" onClick={() => setActiveTab('complaints')} className="text-accent">
                      View All <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                  <div className="space-y-4">
                    {complaints.length > 0 ? complaints.slice(0, 3).map((complaint, index) => (
                      <motion.div
                        key={complaint.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                      >
                        <ComplaintCard 
                          complaint={complaint} 
                          onClick={() => setSelectedComplaint(complaint)}
                        />
                      </motion.div>
                    )) : (
                      <div className="text-center py-8 bg-muted/30 rounded-xl border border-dashed border-border">
                        <p className="text-muted-foreground">No complaints filed yet.</p>
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Right Column - New Features (4 columns) */}
              <div className="lg:col-span-4 space-y-6">
                
                {/* Civic Announcements (Feature 1) */}
                <Card className="govt-card bg-gradient-to-b from-blue-50/50 to-transparent dark:from-blue-900/10">
                  <CardHeader className="pb-3 border-b border-border/50">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Bell className="w-5 h-5 text-blue-500" />
                      Civic Announcements
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-4">
                    {mockAnnouncements.map((announcement) => (
                      <div key={announcement.id} className="group cursor-pointer">
                        <h4 className="text-sm font-semibold group-hover:text-blue-500 transition-colors">{announcement.title}</h4>
                        <div className="flex items-center justify-between mt-1 text-xs text-muted-foreground">
                          <span>{announcement.area}</span>
                          <span>{announcement.date}</span>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Community Leaderboard (Feature 2) */}
                <Card className="govt-card bg-gradient-to-b from-orange-50/50 to-transparent dark:from-orange-900/10">
                  <CardHeader className="pb-3 border-b border-border/50">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Award className="w-5 h-5 text-accent" />
                      Community Leaderboard
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-3">
                    {mockLeaderboard.map((user, idx) => (
                      <div key={user.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-accent/5 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                            idx === 0 ? "bg-yellow-100 text-yellow-700" :
                            idx === 1 ? "bg-gray-200 text-gray-700" :
                            "bg-orange-100 text-orange-700"
                          )}>
                            {idx + 1}
                          </div>
                          <span className="text-sm font-medium">{user.name}</span>
                        </div>
                        <Badge variant="secondary" className="bg-accent/10 text-accent font-bold">
                          {user.points} pts
                        </Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>

              </div>
            </div>
          </div>
        );

      case 'complaints':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className={cn(
                "text-lg font-semibold",
                language === 'gu' ? 'font-gujarati' : ''
              )}>
                {t('myComplaints')} ({complaints.length})
              </h3>
              <Button
                onClick={() => setShowFileComplaint(true)}
                size="sm"
                className="btn-saffron"
              >
                <Plus className="w-4 h-4 mr-1" />
                {t('fileComplaint')}
              </Button>
            </div>
            
            <div className="space-y-3">
                {complaints.map((complaint, index) => (
                <motion.div
                  key={complaint.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <ComplaintCard 
                    complaint={complaint}
                    onClick={() => setSelectedComplaint(complaint)}
                  />
                </motion.div>
              ))}
            </div>
          </div>
        );

      case 'map':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className={cn(
                "text-lg font-semibold",
                language === 'gu' ? 'font-gujarati' : ''
              )}>
                {t('liveMap')}
              </h3>
              <Button
                variant={showHeatmap ? "default" : "outline"}
                size="sm"
                onClick={() => setShowHeatmap(!showHeatmap)}
              >
                {t('heatmapView')}
              </Button>
            </div>
            
            <div className="relative h-[calc(100vh-180px)]">
              <GujaratMap 
                complaints={complaints} 
                showHeatmap={showHeatmap}
                height="100%"
              />
            </div>
          </div>
        );

      case 'rewards':
        return <RewardsSection points={userPoints} />;

      case 'profile':
        return (
          <div className="space-y-6">
            <Card className="govt-card">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center">
                    <span className="text-2xl">👤</span>
                  </div>
                  <div>
                    <p className="font-semibold">{user?.email}</p>
                    <p className={cn(
                      "text-sm text-muted-foreground",
                      language === 'gu' ? 'font-gujarati' : ''
                    )}>
                      {t('citizen')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button
              onClick={() => navigate('/settings')}
              variant="outline"
              className="w-full mb-3 border-border hover:bg-accent/10"
            >
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
            <Button
              onClick={logout}
              variant="outline"
              className="w-full text-destructive border-destructive hover:bg-destructive/10"
            >
              {t('logout')}
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <GovtHeader variant="compact" />
      

      
      <div className="container mx-auto px-4 md:px-8 py-6 max-w-7xl flex flex-col md:flex-row gap-8">
        
        {/* Desktop Sidebar Nav */}
        <aside className="hidden md:flex flex-col w-64 shrink-0 space-y-2 sticky top-6 h-[calc(100vh-100px)]">
          <div className="mb-8 pl-4">
            <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
            <p className="text-muted-foreground">Citizen Portal</p>
          </div>
          
          <Button variant={activeTab === 'home' ? 'secondary' : 'ghost'} className="justify-start text-base font-semibold" onClick={() => setActiveTab('home')}>
            <Home className="w-5 h-5 mr-3" /> Home
          </Button>
          <Button variant={activeTab === 'complaints' ? 'secondary' : 'ghost'} className="justify-start text-base font-semibold" onClick={() => setActiveTab('complaints')}>
            <FileText className="w-5 h-5 mr-3" /> My Complaints
          </Button>
          <Button variant={activeTab === 'map' ? 'secondary' : 'ghost'} className="justify-start text-base font-semibold" onClick={() => setActiveTab('map')}>
            <Map className="w-5 h-5 mr-3" /> Live Map
          </Button>
          <Button variant={activeTab === 'rewards' ? 'secondary' : 'ghost'} className="justify-start text-base font-semibold" onClick={() => setActiveTab('rewards')}>
            <Award className="w-5 h-5 mr-3" /> Rewards
          </Button>
          <Button variant={activeTab === 'profile' ? 'secondary' : 'ghost'} className="justify-start text-base font-semibold mt-auto" onClick={() => setActiveTab('profile')}>
            <User className="w-5 h-5 mr-3" /> Profile
          </Button>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            {renderContent()}
          </AnimatePresence>
        </main>
      </div>

      <div className="md:hidden">
        <MobileNav activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* File Complaint Dialog */}
      <Dialog open={showFileComplaint} onOpenChange={setShowFileComplaint}>
        <DialogContent className="sm:max-w-[600px] h-[90vh] md:h-[85vh] p-0 flex flex-col overflow-hidden bg-background/95 backdrop-blur-xl">
          <DialogHeader className="p-6 pb-2 border-b">
            <DialogTitle className={cn(
              "text-xl",
              language === 'gu' ? 'font-gujarati' : ''
            )}>
              {t('fileComplaint')}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Photo Capture */}
            <div>
              <Label className={language === 'gu' ? 'font-gujarati' : ''}>
                {t('takePhoto')} *
              </Label>
              <div className="mt-2">
                {newComplaint.imageData ? (
                  <div className="relative">
                    <img 
                      src={newComplaint.imageData} 
                      alt="Captured" 
                      className="w-full h-48 object-cover rounded-lg"
                    />
                    <Button
                      size="sm"
                      variant="destructive"
                      className="absolute top-2 right-2"
                      onClick={() => setNewComplaint({ ...newComplaint, imageData: '', location: null })}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <LiveCameraCapture 
                    inline
                    onCapture={handleCameraCapture}
                    onCancel={() => {}}
                  />
                )}
              </div>
            </div>

            {/* Category */}
            <div>
              <Label className={language === 'gu' ? 'font-gujarati' : ''}>
                Category *
              </Label>
              <Select
                value={newComplaint.category}
                onValueChange={(value) => setNewComplaint({ ...newComplaint, category: value, subCategory: '' })}
              >
                <SelectTrigger className="govt-input mt-2">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      <span className="flex items-center gap-2">
                        {cat.icon} {t(cat.value)}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sub-category for Stray Dog */}
            {newComplaint.category === 'strayDog' && (
              <div>
                <Label className={language === 'gu' ? 'font-gujarati' : ''}>
                  Sub-category
                </Label>
                <Select
                  value={newComplaint.subCategory}
                  onValueChange={(value) => setNewComplaint({ ...newComplaint, subCategory: value })}
                >
                  <SelectTrigger className="govt-input mt-2">
                    <SelectValue placeholder="Select type of issue" />
                  </SelectTrigger>
                  <SelectContent>
                    {strayDogSubCategories.map((sub) => (
                      <SelectItem key={sub.value} value={sub.value}>
                        {t(sub.value)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Description */}
            <div>
              <Label className={language === 'gu' ? 'font-gujarati' : ''}>
                Description *
              </Label>
              <Textarea
                className="govt-input mt-2 min-h-[100px]"
                placeholder="Describe the issue in detail..."
                value={newComplaint.description}
                onChange={(e) => setNewComplaint({ ...newComplaint, description: e.target.value })}
              />
            </div>

            {/* Location Status */}
            {newComplaint.location && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-status-completed/10 text-status-completed">
                <MapPin className="w-4 h-4" />
                <span className="text-sm">
                  Location captured: {newComplaint.location.lat.toFixed(4)}, {newComplaint.location.lng.toFixed(4)}
                </span>
              </div>
            )}

            {/* Submit Button */}
            <Button
              onClick={handleSubmitComplaint}
              className="w-full btn-saffron"
              disabled={!newComplaint.category || !newComplaint.description || !newComplaint.imageData || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                t('submit')
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Complaint Detail Dialog */}
      <Dialog open={!!selectedComplaint} onOpenChange={(open) => !open && setSelectedComplaint(null)}>
        <DialogContent className="sm:max-w-[500px] h-[85vh] p-0 flex flex-col overflow-hidden bg-background/95 backdrop-blur-xl">
          {selectedComplaint && (
            <>
              <DialogHeader className="p-6 pb-2 border-b">
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <span className="text-2xl">{getCategoryIcon(selectedComplaint.category)}</span>
                  {t(selectedComplaint.category)}
                  {selectedComplaint.urgency && (
                    <Badge className={getUrgencyColor(selectedComplaint.urgency)}>
                      {t(selectedComplaint.urgency)}
                    </Badge>
                  )}
                </DialogTitle>
                <DialogDescription>
                  Submitted on {selectedComplaint.createdAt.toLocaleDateString()}
                </DialogDescription>
              </DialogHeader>
              
              <ScrollArea className="flex-1 p-6">
                <div className="space-y-6 pb-6">
                  {/* Complaint Image */}
                  {selectedComplaint.imageUrl && (
                    <SignedImage 
                      url={selectedComplaint.imageUrl} 
                      alt="Complaint" 
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  )}
                  
                  {/* Status */}
                  <div>
                    <Label className="text-muted-foreground text-xs">Status</Label>
                    <div className="mt-2">
                      <StatusTracker currentStatus={selectedComplaint.status} />
                    </div>
                  </div>
                  
                  {/* Description */}
                  <div>
                    <Label className="text-muted-foreground text-xs">Description</Label>
                    <p className="mt-1">{selectedComplaint.description}</p>
                  </div>
                  
                  {/* Location */}
                  <div>
                    <Label className="text-muted-foreground text-xs">Location</Label>
                    <div className="mt-1 flex items-center gap-2 text-sm">
                      <MapPin className="w-4 h-4" />
                      <span>{selectedComplaint.location.address}</span>
                    </div>
                  </div>
                  
                  {/* Work Progress Updates */}
                  {(selectedComplaint.status === 'in_progress' || selectedComplaint.status === 'completed') && (
                    <div className="border-t pt-4">
                      <WorkProgressUpdates complaintId={selectedComplaint.id} />
                    </div>
                  )}
                  
                  {/* Points Awarded */}
                  {selectedComplaint.status === 'completed' && selectedComplaint.pointsAwarded && (
                    <div className="bg-accent/10 rounded-lg p-4 text-center">
                      <p className="text-accent font-bold text-2xl">+{selectedComplaint.pointsAwarded}</p>
                      <p className="text-sm text-muted-foreground">{t('points')} earned</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Camera Modal */}
      <AnimatePresence>
        {showCamera && (
          <LiveCameraCapture
            onCapture={handleCameraCapture}
            onCancel={() => setShowCamera(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Helper functions for category icons and urgency colors
function getCategoryIcon(category: string) {
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
}

function getUrgencyColor(urgency?: string) {
  switch (urgency) {
    case 'high': return 'bg-destructive text-destructive-foreground';
    case 'medium': return 'bg-yellow-500 text-white';
    case 'low': return 'bg-green-600 text-white';
    default: return 'bg-muted text-muted-foreground';
  }
}
