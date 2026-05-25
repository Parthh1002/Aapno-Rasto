import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, ArrowRight, Users, Wrench, Shield, Check, Loader2, User, KeyRound, MapPin, Briefcase, FileText, Image as ImageIcon } from 'lucide-react';
import { GovtHeader } from '@/components/GovtHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth, type UserRole } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export default function AuthPage() {
  const { t, language } = useLanguage();
  const { login, register, signInWithGoogle, resetPassword } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'forgot'>('login');
  
  // Verification popup
  const [showVerifyPopup, setShowVerifyPopup] = useState(false);
  const [verifyPopupMessage, setVerifyPopupMessage] = useState('');

  // Login state
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [loginData, setLoginData] = useState({ email: '', password: '' });

  // Register state
  const [registerRole, setRegisterRole] = useState<'user' | 'engineer'>('user');
  const [registerData, setRegisterData] = useState({ 
    fullName: '', 
    email: '', 
    password: '', 
    confirmPassword: '',
    phone: '',
    department: '',
    employeeId: '',
    address: '',
    experience: ''
  });
  const [idProofFile, setIdProofFile] = useState<File | null>(null);
  const [certificateFile, setCertificateFile] = useState<File | null>(null);
  const [profileImageFile, setProfileImageFile] = useState<File | null>(null);

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState('');

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const result = await signInWithGoogle('user', false);
      if (result.success) {
        toast({ title: "Welcome! 🎉", description: "Logged in successfully." });
        // The role will be set in AuthContext and App.tsx handles redirect
        // But we can force navigate based on role if we know it
        navigate('/user'); 
      } else {
        toast({ title: "Login Failed", description: result.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Login Failed", description: "Network error. Please try again.", variant: "destructive" });
    }
    setIsLoading(false);
  };

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setLoginData({ email: '', password: '' });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRole) {
      toast({ title: "Select Role", description: "Please select your role before logging in.", variant: "destructive" });
      return;
    }
    if (!loginData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      toast({ title: "Invalid Email", description: "Please enter a valid email address.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const result = await login(loginData.email, loginData.password, selectedRole);
      if (result.success) {
        toast({ title: "Welcome! 🎉", description: `Logged in successfully as ${selectedRole}` });
        navigate(selectedRole === 'admin' ? '/admin' : selectedRole === 'engineer' ? '/engineer' : '/dashboard');
      } else {
        toast({ title: "Login Failed", description: result.error || "Please check your email and password.", variant: "destructive" });
      }
    } catch {
      toast({ title: "Login Failed", description: "Network error. Please try again.", variant: "destructive" });
    }
    setIsLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!registerData.fullName.trim() || registerData.fullName.trim().length < 2) {
      toast({ title: "Invalid Name", description: "Please enter your full name.", variant: "destructive" });
      return;
    }
    if (!registerData.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      toast({ title: "Invalid Email", description: "Please enter a valid email address.", variant: "destructive" });
      return;
    }
    if (registerData.password.length < 8) {
      toast({ title: "Weak Password", description: "Password must be at least 8 characters.", variant: "destructive" });
      return;
    }
    if (registerData.password !== registerData.confirmPassword) {
      toast({ title: "Password Mismatch", description: "Passwords do not match.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      let engineerData;
      if (registerRole === 'engineer') {
        if (!registerData.phone || !registerData.department || !registerData.employeeId || !registerData.address || !idProofFile || !certificateFile) {
          toast({ title: "Missing Fields", description: "Please fill all required engineer details and upload required files.", variant: "destructive" });
          setIsLoading(false);
          return;
        }
        engineerData = {
          phone: registerData.phone,
          department: registerData.department,
          employeeId: registerData.employeeId,
          address: registerData.address,
          experience: registerData.experience,
          idProofFile,
          certificateFile,
          profileImageFile: profileImageFile || undefined
        };
      }

      const result = await register(registerData.email, registerData.password, registerData.fullName.trim(), registerRole, engineerData);
      if (result.success) {
        setVerifyPopupMessage(result.error || "Registration Successful! Please check your spam folder to verify your email before logging in.");
        setShowVerifyPopup(true);
        
        setRegisterData({ fullName: '', email: '', password: '', confirmPassword: '', phone: '', department: '', employeeId: '', address: '', experience: '' });
        setIdProofFile(null);
        setCertificateFile(null);
        setProfileImageFile(null);
        setActiveTab('login');
        setSelectedRole(registerRole === 'engineer' ? 'engineer' : 'user');
      } else {
        toast({ title: "Registration Failed", description: result.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Network error. Please try again.", variant: "destructive" });
    }
    setIsLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      toast({ title: "Invalid Email", description: "Please enter a valid email address.", variant: "destructive" });
      return;
    }

    setIsLoading(true);
    try {
      const result = await resetPassword(forgotEmail);
      if (result.success) {
        toast({ title: "Email Sent", description: "Check your inbox for password reset instructions." });
        setActiveTab('login');
        setForgotEmail('');
      } else {
        toast({ title: "Error", description: result.error, variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Network error. Please try again.", variant: "destructive" });
    }
    setIsLoading(false);
  };

  const loginRoleCards = [
    { role: 'user' as UserRole, icon: Users, title: 'User', description: 'File & track complaints', color: 'border-blue-500/30 hover:border-blue-500', activeColor: 'border-blue-500 ring-2 ring-blue-500/30 bg-blue-500/10', iconColor: 'text-blue-500', iconBg: 'bg-blue-500/10' },
    { role: 'engineer' as UserRole, icon: Wrench, title: 'Engineer', description: 'Resolve assigned issues', color: 'border-amber-500/30 hover:border-amber-500', activeColor: 'border-amber-500 ring-2 ring-amber-500/30 bg-amber-500/10', iconColor: 'text-amber-500', iconBg: 'bg-amber-500/10' },
    { role: 'admin' as UserRole, icon: Shield, title: 'Admin', description: 'Manage & monitor', color: 'border-purple-500/30 hover:border-purple-500', activeColor: 'border-purple-500 ring-2 ring-purple-500/30 bg-purple-500/10', iconColor: 'text-purple-500', iconBg: 'bg-purple-500/10' },
  ];

  const registerRoleOptions = [
    { role: 'user' as const, icon: Users, title: 'User', description: 'Report road issues', color: 'border-blue-500/30 hover:border-blue-500', activeColor: 'border-blue-500 ring-2 ring-blue-500/30 bg-blue-500/10', iconColor: 'text-blue-500', iconBg: 'bg-blue-500/10' },
    { role: 'engineer' as const, icon: Wrench, title: 'Engineer', description: 'Resolve issues', color: 'border-amber-500/30 hover:border-amber-500', activeColor: 'border-amber-500 ring-2 ring-amber-500/30 bg-amber-500/10', iconColor: 'text-amber-500', iconBg: 'bg-amber-500/10' },
  ];

  const tabVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, x: 20, transition: { duration: 0.2 } }
  };

  return (
    <div className="min-h-screen relative overflow-x-hidden overflow-y-auto flex flex-col"
      style={{ background: 'radial-gradient(ellipse at 20% 0%, hsl(30 80% 96%) 0%, hsl(220 30% 96%) 50%, hsl(30 60% 95%) 100%)' }}>
      {/* Background orbs */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-400/15 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-orange-400/20 blur-[120px] rounded-full" />
        <div className="absolute top-[40%] left-[50%] w-[30%] h-[30%] bg-amber-300/10 blur-[80px] rounded-full" />
      </div>

      <GovtHeader variant="compact" showThemeToggle={true} />

      <main className="flex-1 flex flex-col lg:flex-row items-center justify-center container mx-auto px-4 py-6 md:py-10 gap-12 z-10 relative max-w-6xl">
        
        {/* Beautiful Branding Section - Now responsive */}
        <motion.div 
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="flex flex-col w-full lg:w-1/2 space-y-6 lg:space-y-8 text-center lg:text-left items-center lg:items-start pt-4 lg:pt-0"
        >
          <div className="inline-flex items-center gap-3 bg-white/50 backdrop-blur-sm border border-white/40 text-primary px-4 py-2 lg:px-5 lg:py-2.5 rounded-full font-bold text-xs lg:text-sm uppercase tracking-widest shadow-sm w-fit">
            <Shield className="w-4 h-4 lg:w-5 lg:h-5 text-primary" />
            Official Portal
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-foreground tracking-tight leading-[1.1]">
            Empowering Citizens, <br className="hidden sm:block"/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-600">Building Better Roads.</span>
          </h1>
          <p className="text-lg lg:text-xl text-muted-foreground font-medium leading-relaxed max-w-lg mx-auto lg:mx-0">
            Join the Aapno Rasto initiative. Report issues, track resolutions, and earn trust points for contributing to a better Gujarat.
          </p>
          <div className="hidden sm:grid grid-cols-2 gap-4 lg:gap-6 mt-2 lg:mt-4 w-full max-w-md mx-auto lg:mx-0">
            <div className="bg-white/40 backdrop-blur-md border border-white/50 p-4 lg:p-6 rounded-2xl shadow-sm text-center lg:text-left">
              <h3 className="text-2xl lg:text-3xl font-black text-primary mb-1">50k+</h3>
              <p className="text-xs lg:text-sm font-bold text-muted-foreground uppercase tracking-wider">Active Users</p>
            </div>
            <div className="bg-white/40 backdrop-blur-md border border-white/50 p-4 lg:p-6 rounded-2xl shadow-sm text-center lg:text-left">
              <h3 className="text-2xl lg:text-3xl font-black text-green-600 mb-1">98%</h3>
              <p className="text-xs lg:text-sm font-bold text-muted-foreground uppercase tracking-wider">Resolution Rate</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
          className="w-full max-w-md lg:max-w-[440px] shrink-0"
        >
          <Card className="govt-card overflow-hidden shadow-2xl backdrop-blur-xl bg-card/95 border-white/40 border-2">
            <div className="h-1.5 bg-gradient-to-r from-blue-600 via-orange-500 to-green-600" />

            <CardHeader className="text-center pb-2 pt-6">
              <div className="flex items-center justify-center gap-2 mb-4">
                <img
                  src="https://upload.wikimedia.org/wikipedia/commons/5/55/Emblem_of_India.svg"
                  alt="State Emblem"
                  className="h-10 w-auto"
                />
              </div>
              <CardTitle className={cn("text-2xl md:text-3xl font-bold tracking-tight text-foreground", language === 'gu' ? 'font-gujarati' : '')}>
                {t('welcomeMessage')}
              </CardTitle>
              <CardDescription className={cn("text-sm mt-2 text-muted-foreground", language === 'gu' ? 'font-gujarati' : '')}>
                {activeTab === 'login' && 'Sign in to access your portal'}
                {activeTab === 'register' && 'Create your account to get started'}
                {activeTab === 'forgot' && 'Reset your password'}
              </CardDescription>
            </CardHeader>

            <CardContent className="pb-8 pt-4">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'login' | 'register' | 'forgot')} className="w-full">
                {activeTab !== 'forgot' && (
                  <TabsList className="grid w-full grid-cols-2 mb-6 h-12 rounded-xl p-1 bg-muted/50 backdrop-blur-md">
                    <TabsTrigger value="login" className={cn("text-sm font-semibold rounded-lg transition-all", language === 'gu' ? 'font-gujarati' : '')}>
                      {t('login')}
                    </TabsTrigger>
                    <TabsTrigger value="register" className={cn("text-sm font-semibold rounded-lg transition-all", language === 'gu' ? 'font-gujarati' : '')}>
                      {t('register')}
                    </TabsTrigger>
                  </TabsList>
                )}

                <AnimatePresence mode="wait">
                  {activeTab === 'login' && (
                    <motion.div key="login" variants={tabVariants} initial="hidden" animate="visible" exit="exit">
                      <div className="mb-6">
                        <p className="text-xs text-center text-muted-foreground mb-4 font-bold uppercase tracking-widest">
                          {t('selectRole')}
                        </p>
                        <div className="grid grid-cols-3 gap-3">
                          {loginRoleCards.map((card) => {
                            const Icon = card.icon;
                            const isSelected = selectedRole === card.role;
                            return (
                              <motion.button
                                key={card.role}
                                type="button"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleRoleSelect(card.role)}
                                className={cn(
                                  "relative text-center p-4 rounded-2xl border-2 transition-all duration-300 cursor-pointer shadow-sm bg-card hover:shadow-md",
                                  isSelected ? card.activeColor : card.color
                                )}
                              >
                                <AnimatePresence>
                                  {isSelected && (
                                    <motion.div
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                      exit={{ scale: 0 }}
                                      className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-md"
                                    >
                                      <Check className="w-3 h-3 text-primary-foreground" />
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2", card.iconBg)}>
                                  <Icon className={cn("w-5 h-5", card.iconColor)} />
                                </div>
                                <p className="text-xs font-bold tracking-wide">{card.title}</p>
                              </motion.button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="relative my-4">
                        <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                        <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground font-medium">Or</span></div>
                      </div>

                      <div className="w-full mb-5">
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full flex items-center justify-center gap-3 h-12 rounded-2xl border-2 transition-all duration-300 border-border bg-white hover:border-[#4285F4] hover:bg-gray-50 hover:shadow-[0_8px_16px_-6px_rgba(66,133,244,0.3)] hover:-translate-y-0.5"
                          onClick={handleGoogleLogin}
                          disabled={isLoading}
                        >
                          <svg width="24" height="24" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
                            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                            <path fill="none" d="M0 0h48v48H0z"/>
                          </svg>
                          <span className="font-bold text-gray-800 text-base">
                            {t('continueWithGoogle')}
                          </span>
                        </Button>
                      </div>

                      <form onSubmit={handleLogin} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="login-email" className="text-sm font-semibold text-foreground/80">{t('emailAddress')}</Label>
                          <div className="relative group">
                            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <Input
                              id="login-email"
                              type="email"
                              placeholder="your@email.com"
                              className="govt-input pl-10 h-12 rounded-xl bg-muted/30 focus:bg-background transition-all"
                              value={loginData.email}
                              onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <Label htmlFor="login-password" className="text-sm font-semibold text-foreground/80">{t('password')}</Label>
                            <button
                              type="button"
                              onClick={() => setActiveTab('forgot')}
                              className="text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                            >
                              {t('forgotPassword')}
                            </button>
                          </div>
                          <div className="relative group">
                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <Input
                              id="login-password"
                              type={showPassword ? 'text' : 'password'}
                              placeholder="••••••••"
                              className="govt-input pl-10 pr-10 h-12 rounded-xl bg-muted/30 focus:bg-background transition-all"
                              value={loginData.password}
                              onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                              required
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                            >
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        <Button
                          type="submit"
                          disabled={isLoading || !selectedRole}
                          className="w-full btn-saffron h-12 text-base font-bold shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 rounded-xl group relative overflow-hidden"
                        >
                          <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                          {isLoading ? (
                            <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Logging in...</>
                          ) : (
                            <>
                              {t('login')}
                              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1.5 transition-transform" />
                            </>
                          )}
                        </Button>
                      </form>
                    </motion.div>
                  )}

                  {activeTab === 'register' && (
                    <motion.div key="register" variants={tabVariants} initial="hidden" animate="visible" exit="exit">
                      <div className="mb-6">
                        <p className="text-xs text-center text-muted-foreground mb-4 font-bold uppercase tracking-widest">
                          {t('registerAs')}
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          {registerRoleOptions.map((card) => {
                            const Icon = card.icon;
                            const isSelected = registerRole === card.role;
                            return (
                              <motion.button
                                key={card.role}
                                type="button"
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.97 }}
                                onClick={() => setRegisterRole(card.role)}
                                className={cn(
                                  "relative text-center p-4 rounded-2xl border-2 transition-all duration-300 cursor-pointer shadow-sm bg-card hover:shadow-md",
                                  isSelected ? card.activeColor : card.color
                                )}
                              >
                                <AnimatePresence>
                                  {isSelected && (
                                    <motion.div
                                      initial={{ scale: 0 }}
                                      animate={{ scale: 1 }}
                                      exit={{ scale: 0 }}
                                      className="absolute -top-2 -right-2 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-md"
                                    >
                                      <Check className="w-3 h-3 text-primary-foreground" />
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                                <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2", card.iconBg)}>
                                  <Icon className={cn("w-5 h-5", card.iconColor)} />
                                </div>
                                <p className="text-xs font-bold tracking-wide">{card.title}</p>
                              </motion.button>
                            );
                          })}
                        </div>
                      </div>

                      {registerRole === 'user' && (
                        <div className="w-full mb-6 mt-4">
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full flex items-center justify-center gap-3 h-14 rounded-2xl border-2 transition-all duration-300 border-border bg-white hover:border-[#4285F4] hover:bg-gray-50 hover:shadow-[0_8px_16px_-6px_rgba(66,133,244,0.3)] hover:-translate-y-0.5"
                            onClick={handleGoogleLogin}
                            disabled={isLoading}
                          >
                            <svg width="24" height="24" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
                              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                              <path fill="none" d="M0 0h48v48H0z"/>
                            </svg>
                            <span className="font-bold text-gray-800 text-base">
                              {t('registerWithGoogle')}
                            </span>
                          </Button>
                        </div>
                      )}

                      <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                        <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground font-medium">{t('fillDetailsManually')}</span></div>
                      </div>

                      <form onSubmit={handleRegister} className="space-y-5">

                        <div className="space-y-2">
                          <Label htmlFor="register-name" className="text-sm font-semibold text-foreground/80">{t('fullName')}</Label>
                          <div className="relative group">
                            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <Input
                              id="register-name"
                              type="text"
                              placeholder="Enter your full name"
                              className="govt-input pl-10 h-12 rounded-xl bg-muted/30 focus:bg-background transition-all"
                              value={registerData.fullName}
                              onChange={(e) => setRegisterData({ ...registerData, fullName: e.target.value })}
                              required
                              minLength={2}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="register-email" className="text-sm font-semibold text-foreground/80">{t('emailAddress')}</Label>
                          <div className="relative group">
                            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <Input
                              id="register-email"
                              type="email"
                              placeholder="your@email.com"
                              className="govt-input pl-10 h-12 rounded-xl bg-muted/30 focus:bg-background transition-all"
                              value={registerData.email}
                              onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                              required
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="register-password" className="text-sm font-semibold text-foreground/80">{t('password')}</Label>
                          <div className="relative group">
                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <Input
                              id="register-password"
                              type={showPassword ? 'text' : 'password'}
                              placeholder="Min. 8 characters"
                              className="govt-input pl-10 pr-10 h-12 rounded-xl bg-muted/30 focus:bg-background transition-all"
                              value={registerData.password}
                              onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                              required
                              minLength={8}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                            >
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="register-confirm-password" className="text-sm font-semibold text-foreground/80">{t('confirmPassword')}</Label>
                          <div className="relative group">
                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <Input
                              id="register-confirm-password"
                              type={showPassword ? 'text' : 'password'}
                              placeholder="Re-enter your password"
                              className="govt-input pl-10 pr-10 h-12 rounded-xl bg-muted/30 focus:bg-background transition-all"
                              value={registerData.confirmPassword}
                              onChange={(e) => setRegisterData({ ...registerData, confirmPassword: e.target.value })}
                              required
                              minLength={8}
                            />
                          </div>
                        </div>

                        {registerRole === 'engineer' && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-5 border-t border-border pt-4 mt-2"
                          >
                            <h4 className="text-sm font-semibold text-primary">{t('engineerVerification')}</h4>
                            
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="register-phone" className="text-xs font-semibold text-foreground/80">{t('phoneNumber')}</Label>
                                <Input
                                  id="register-phone"
                                  type="tel"
                                  placeholder="+91"
                                  className="govt-input h-10 rounded-xl bg-muted/30 focus:bg-background"
                                  value={registerData.phone}
                                  onChange={(e) => setRegisterData({ ...registerData, phone: e.target.value })}
                                  required
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="register-dept" className="text-xs font-semibold text-foreground/80">{t('department')}</Label>
                                <Input
                                  id="register-dept"
                                  type="text"
                                  placeholder="e.g. PWD, AMC"
                                  className="govt-input h-10 rounded-xl bg-muted/30 focus:bg-background"
                                  value={registerData.department}
                                  onChange={(e) => setRegisterData({ ...registerData, department: e.target.value })}
                                  required
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="register-emp-id" className="text-xs font-semibold text-foreground/80">{t('employeeId')}</Label>
                                <Input
                                  id="register-emp-id"
                                  type="text"
                                  placeholder="Enter ID"
                                  className="govt-input h-10 rounded-xl bg-muted/30 focus:bg-background"
                                  value={registerData.employeeId}
                                  onChange={(e) => setRegisterData({ ...registerData, employeeId: e.target.value })}
                                  required
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="register-exp" className="text-xs font-semibold text-foreground/80">{t('experience')}</Label>
                                <Input
                                  id="register-exp"
                                  type="number"
                                  placeholder="e.g. 5"
                                  className="govt-input h-10 rounded-xl bg-muted/30 focus:bg-background"
                                  value={registerData.experience}
                                  onChange={(e) => setRegisterData({ ...registerData, experience: e.target.value })}
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="register-address" className="text-xs font-semibold text-foreground/80">{t('address')}</Label>
                              <div className="relative group">
                                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                  id="register-address"
                                  type="text"
                                  placeholder="Enter your complete address"
                                  className="govt-input pl-9 h-10 rounded-xl bg-muted/30 focus:bg-background"
                                  value={registerData.address}
                                  onChange={(e) => setRegisterData({ ...registerData, address: e.target.value })}
                                  required
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t pt-4">
                              <div className="space-y-2">
                                <Label htmlFor="id-proof" className="text-xs font-semibold text-foreground/80 flex items-center gap-1">
                                  <FileText className="w-3 h-3" /> Gov ID Proof *
                                </Label>
                                <Input
                                  id="id-proof"
                                  type="file"
                                  accept="image/*,.pdf"
                                  className="text-xs file:bg-muted file:text-foreground file:border-0 file:rounded file:px-2 file:py-1 file:mr-2 file:font-semibold"
                                  onChange={(e) => setIdProofFile(e.target.files?.[0] || null)}
                                  required
                                />
                              </div>
                              <div className="space-y-2">
                                <Label htmlFor="certificate" className="text-xs font-semibold text-foreground/80 flex items-center gap-1">
                                  <Briefcase className="w-3 h-3" /> Certificate *
                                </Label>
                                <Input
                                  id="certificate"
                                  type="file"
                                  accept="image/*,.pdf"
                                  className="text-xs file:bg-muted file:text-foreground file:border-0 file:rounded file:px-2 file:py-1 file:mr-2 file:font-semibold"
                                  onChange={(e) => setCertificateFile(e.target.files?.[0] || null)}
                                  required
                                />
                              </div>
                              <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="profile-image" className="text-xs font-semibold text-foreground/80 flex items-center gap-1">
                                  <ImageIcon className="w-3 h-3" /> Profile Image (Optional)
                                </Label>
                                <Input
                                  id="profile-image"
                                  type="file"
                                  accept="image/*"
                                  className="text-xs file:bg-muted file:text-foreground file:border-0 file:rounded file:px-2 file:py-1 file:mr-2 file:font-semibold"
                                  onChange={(e) => setProfileImageFile(e.target.files?.[0] || null)}
                                />
                              </div>
                            </div>
                          </motion.div>
                        )}

                        <Button
                          type="submit"
                          disabled={isLoading}
                          className="w-full btn-saffron h-12 text-base font-bold shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 rounded-xl group relative overflow-hidden mt-6"
                        >
                          <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                          {isLoading ? (
                            <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Creating account...</>
                          ) : (
                            <>
                              Register as {registerRole === 'engineer' ? 'Engineer' : 'User'}
                              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1.5 transition-transform" />
                            </>
                          )}
                        </Button>
                      </form>
                    </motion.div>
                  )}

                  {activeTab === 'forgot' && (
                    <motion.div key="forgot" variants={tabVariants} initial="hidden" animate="visible" exit="exit">
                      <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                          <KeyRound className="w-8 h-8 text-primary" />
                        </div>
                        <h3 className="text-xl font-bold text-foreground">{t('passwordResetTitle')}</h3>
                        <p className="text-sm text-muted-foreground mt-2">{t('passwordResetDesc')}</p>
                      </div>

                      <form onSubmit={handleForgotPassword} className="space-y-6">
                        <div className="space-y-2">
                          <Label htmlFor="forgot-email" className="text-sm font-semibold text-foreground/80">{t('emailAddress')}</Label>
                          <div className="relative group">
                            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <Input
                              id="forgot-email"
                              type="email"
                              placeholder="your@email.com"
                              className="govt-input pl-10 h-12 rounded-xl bg-muted/30 focus:bg-background transition-all"
                              value={forgotEmail}
                              onChange={(e) => setForgotEmail(e.target.value)}
                              required
                            />
                          </div>
                        </div>

                        <div className="flex flex-col gap-3">
                          <Button
                            type="submit"
                            disabled={isLoading}
                            className="w-full btn-saffron h-12 text-base font-bold shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 rounded-xl"
                          >
                            {isLoading ? (
                              <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Sending link...</>
                            ) : (
                              'Send Reset Link'
                            )}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            className="h-12 font-semibold hover:bg-muted/50 rounded-xl"
                            onClick={() => setActiveTab('login')}
                          >
                            {t('backToLogin')}
                          </Button>
                        </div>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>
      </main>

      {/* Email Verification Alert Dialog */}
      <AlertDialog open={showVerifyPopup} onOpenChange={setShowVerifyPopup}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="mx-auto w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-4">
              <Mail className="w-6 h-6" />
            </div>
            <AlertDialogTitle className="text-center text-xl">Action Required: Verify Email</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-base mt-2">
              <span className="block font-medium text-foreground mb-2">{verifyPopupMessage}</span>
              Please check your <strong className="text-destructive">Spam or Junk</strong> folder for the verification link.
              You <strong className="text-foreground">must touch the link and verify</strong> before you can log in with Google or Email/Password.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="sm:justify-center mt-6">
            <AlertDialogAction 
              onClick={() => {
                setShowVerifyPopup(false);
                setActiveTab('login');
              }}
              className="w-full sm:w-auto"
            >
              I Understand, Go to Login
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <footer className="relative z-10 py-4 text-center border-t border-border bg-background/50 backdrop-blur-md">
        <p className="text-xs text-muted-foreground font-medium">
          © {new Date().getFullYear()} Government of Gujarat • Aapno Rasto — Road Infrastructure Management
        </p>
      </footer>
    </div>
  );
}
