import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, User, Palette, Bell, LogOut, ChevronLeft, Moon, Sun, Smartphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { GovtHeader } from '@/components/GovtHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useTheme } from 'next-themes';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/auth');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const getDashboardRoute = () => {
    if (!user) return '/';
    return `/${user.role === 'admin' ? 'admin' : user.role === 'engineer' ? 'engineer' : 'user'}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <GovtHeader />
      
      <main className="container mx-auto max-w-5xl py-8 px-4">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate(getDashboardRoute())}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            <p className="text-muted-foreground">Manage your account preferences and application settings.</p>
          </div>
        </div>

        <Tabs defaultValue="profile" className="flex flex-col md:flex-row gap-8">
          <TabsList className="flex flex-row md:flex-col justify-start h-auto bg-transparent space-x-2 md:space-x-0 md:space-y-2 w-full md:w-64 overflow-x-auto p-0">
            <TabsTrigger 
              value="profile" 
              className="justify-start gap-2 px-4 py-3 data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-xl border border-transparent data-[state=active]:border-border w-full"
            >
              <User className="w-4 h-4" /> Profile
            </TabsTrigger>
            <TabsTrigger 
              value="security" 
              className="justify-start gap-2 px-4 py-3 data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-xl border border-transparent data-[state=active]:border-border w-full"
            >
              <Shield className="w-4 h-4" /> Security
            </TabsTrigger>
            <TabsTrigger 
              value="appearance" 
              className="justify-start gap-2 px-4 py-3 data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-xl border border-transparent data-[state=active]:border-border w-full"
            >
              <Palette className="w-4 h-4" /> Appearance
            </TabsTrigger>
            <TabsTrigger 
              value="notifications" 
              className="justify-start gap-2 px-4 py-3 data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-xl border border-transparent data-[state=active]:border-border w-full"
            >
              <Bell className="w-4 h-4" /> Notifications
            </TabsTrigger>
          </TabsList>

          <div className="flex-1">
            {/* PROFILE TAB */}
            <TabsContent value="profile" className="mt-0 space-y-6">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card>
                  <CardHeader>
                    <CardTitle>Profile Information</CardTitle>
                    <CardDescription>Update your basic profile details.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center gap-6">
                      <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center text-primary text-3xl font-bold uppercase border-2 border-primary/20">
                        {user?.email?.charAt(0) || 'U'}
                      </div>
                      <Button variant="outline">Change Avatar</Button>
                    </div>
                    
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>Full Name</Label>
                        <Input defaultValue={user?.name || ''} placeholder="John Doe" />
                      </div>
                      <div className="space-y-2">
                        <Label>Email Address</Label>
                        <Input defaultValue={user?.email || ''} disabled />
                        <p className="text-xs text-muted-foreground">Email address cannot be changed.</p>
                      </div>
                      <div className="space-y-2">
                        <Label>Phone Number</Label>
                        <Input defaultValue={user?.phone || ''} placeholder="+91 9876543210" />
                      </div>
                      <div className="space-y-2">
                        <Label>Role</Label>
                        <Input defaultValue={user?.role?.toUpperCase() || ''} disabled className="font-semibold" />
                      </div>
                    </div>
                    <Button className="btn-saffron">Save Changes</Button>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* SECURITY TAB */}
            <TabsContent value="security" className="mt-0 space-y-6">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card>
                  <CardHeader>
                    <CardTitle>Security Settings</CardTitle>
                    <CardDescription>Manage your password and security preferences.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4 max-w-md">
                      <div className="space-y-2">
                        <Label>Current Password</Label>
                        <Input type="password" />
                      </div>
                      <div className="space-y-2">
                        <Label>New Password</Label>
                        <Input type="password" />
                      </div>
                      <div className="space-y-2">
                        <Label>Confirm New Password</Label>
                        <Input type="password" />
                      </div>
                      <Button className="btn-saffron">Update Password</Button>
                    </div>

                    <div className="pt-6 border-t border-border mt-6">
                      <h3 className="font-medium text-destructive mb-2">Danger Zone</h3>
                      <p className="text-sm text-muted-foreground mb-4">Once you delete your account, there is no going back. Please be certain.</p>
                      <Button variant="destructive">Delete Account</Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* APPEARANCE TAB */}
            <TabsContent value="appearance" className="mt-0 space-y-6">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card>
                  <CardHeader>
                    <CardTitle>Appearance & Locale</CardTitle>
                    <CardDescription>Customize how the app looks and feels to you.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-8">
                    
                    <div className="space-y-4">
                      <Label className="text-base">Theme Preference</Label>
                      <div className="grid grid-cols-3 gap-4 max-w-2xl">
                        <button
                          onClick={() => setTheme('light')}
                          className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${theme === 'light' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                        >
                          <Sun className="w-8 h-8 mb-2 text-orange-500" />
                          <span className="font-medium">Light</span>
                        </button>
                        <button
                          onClick={() => setTheme('dark')}
                          className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${theme === 'dark' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                        >
                          <Moon className="w-8 h-8 mb-2 text-indigo-400" />
                          <span className="font-medium">Dark</span>
                        </button>
                        <button
                          onClick={() => setTheme('system')}
                          className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 transition-all ${theme === 'system' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                        >
                          <Smartphone className="w-8 h-8 mb-2 text-slate-500" />
                          <span className="font-medium">System</span>
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4 max-w-sm">
                      <Label className="text-base">Language</Label>
                      <Select value={language} onValueChange={(val: any) => setLanguage(val)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Language" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="gu">ગુજરાતી (Gujarati)</SelectItem>
                          <SelectItem value="hi">हिंदी (Hindi)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-muted-foreground">Changes the default language of the application interface.</p>
                    </div>

                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>

            {/* NOTIFICATIONS TAB */}
            <TabsContent value="notifications" className="mt-0 space-y-6">
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card>
                  <CardHeader>
                    <CardTitle>Notification Preferences</CardTitle>
                    <CardDescription>Choose what updates you want to receive.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-base">Complaint Status Updates</Label>
                          <p className="text-sm text-muted-foreground">Receive alerts when your complaint status changes.</p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-base">Reward Points Notifications</Label>
                          <p className="text-sm text-muted-foreground">Get notified when you earn reward points.</p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-base">System Announcements</Label>
                          <p className="text-sm text-muted-foreground">Receive important updates from the government.</p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label className="text-base">Email Notifications</Label>
                          <p className="text-sm text-muted-foreground">Send updates to your registered email address.</p>
                        </div>
                        <Switch />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </TabsContent>
          </div>
        </Tabs>
        
        {/* Logout Button */}
        <div className="mt-12 flex justify-end">
          <Button variant="outline" className="text-destructive hover:bg-destructive/10" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </main>
    </div>
  );
}
