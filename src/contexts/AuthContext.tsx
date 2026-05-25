import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { auth, db, googleProvider, storage } from '@/lib/firebaseConfig';
import { 
  signInWithPopup, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail,
  sendEmailVerification,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { supabase } from '@/lib/supabase';

export type UserRole = 'user' | 'engineer' | 'admin';

export interface EngineerRegistrationData {
  phone: string;
  department: string;
  employeeId: string;
  address?: string;
  experience?: string;
  idProofFile: File;
  certificateFile: File;
  profileImageFile?: File;
}

interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  isVerified: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  login: (email: string, password: string, role?: UserRole) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, fullName?: string, role?: UserRole, engineerData?: EngineerRegistrationData) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ success: boolean; error?: string }>;
  signInWithGoogle: (requiredRole?: UserRole, isRegistering?: boolean) => Promise<{ success: boolean; error?: string }>;
  isAdmin: boolean;
  isEngineer: boolean;
  isUser: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

async function fetchUserRole(userId: string, email?: string | null): Promise<UserRole | null> {
  const ADMIN_EMAIL = '11a21278parth@gmail.com';

  if (email) {
    const normalizedEmail = email.toLowerCase();
    if (normalizedEmail === ADMIN_EMAIL.toLowerCase()) return 'admin';
  }

  if (!db) return null;
  try {
    const docRef = doc(db, 'users', userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      const data = docSnap.data();
      const dbEmail = data.email?.toLowerCase();
      
      if (dbEmail === ADMIN_EMAIL.toLowerCase()) return 'admin';

      return data.role as UserRole;
    }
  } catch (error: any) {
    console.error("Error fetching user role:", error);
    if (error.code === 'permission-denied' || error.message?.includes('Missing or insufficient permissions')) {
      throw new Error('Firebase Permission Denied: Please update your Firestore Security Rules in the Firebase Console!');
    }
  }
  return null;
}

async function completeRegistration(userId: string, email: string, fullName?: string, role?: UserRole): Promise<UserRole | null> {
  if (!db) return null;
  try {
    const userRole = role || 'user';
    await setDoc(doc(db, 'users', userId), {
      email,
      full_name: fullName || email.split('@')[0],
      role: userRole,
      created_at: new Date().toISOString(),
    }, { merge: true });
    return userRole;
  } catch (error: any) {
    console.error("Error completing registration:", error);
    if (error.code === 'permission-denied' || error.message?.includes('Missing or insufficient permissions')) {
      throw new Error('Firebase Permission Denied: Please update your Firestore Security Rules in the Firebase Console!');
    }
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Re-verify role periodically
  const refreshRole = async () => {
    if (firebaseUser) {
      const role = await fetchUserRole(firebaseUser.uid, firebaseUser.email);
      if (role) {
        setUser(prev => prev ? { ...prev, role } : prev);
      }
    }
  };

  useEffect(() => {
    if (!auth) {
      // Check for mock user in localStorage
      const mockUserStr = localStorage.getItem('mock_user');
      if (mockUserStr) {
        try {
          setUser(JSON.parse(mockUserStr));
        } catch (e) {
          console.error('Failed to parse mock user', e);
        }
      }
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setFirebaseUser(currentUser);
      if (currentUser) {
        let role = await fetchUserRole(currentUser.uid, currentUser.email) || 'user'; // Default role
        
        // Force admin role for the specific email
        if (currentUser.email?.toLowerCase() === '11a21278parth@gmail.com'.toLowerCase()) {
          role = 'admin';
        }

        setUser({
          id: currentUser.uid,
          email: currentUser.email || '',
          role,
          isVerified: currentUser.emailVerified,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        refreshRole();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const intervalId = setInterval(refreshRole, 5 * 60 * 1000);

    return () => {
      unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibility);
      clearInterval(intervalId);
    };
  }, []);

  const login = async (email: string, password: string, role?: UserRole): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!auth) {
        // MOCK AUTH: When Firebase isn't configured, mock the login
        console.warn('Firebase not configured. Using Mock Auth for Login.');
        const mockRole = role || 'user';
        const mockUser: AuthUser = { id: 'mock-id-' + Date.now(), email, role: mockRole, isVerified: true };
        setUser(mockUser);
        localStorage.setItem('mock_user', JSON.stringify(mockUser));
        return { success: true };
      }
      
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const currentUser = userCredential.user;
      
      const ADMIN_EMAIL = '11a21278parth@gmail.com';
      const isAuthorizedAdmin = currentUser.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

      // Check for email verification (skip for hardcoded admin users)
      if (!currentUser.emailVerified && !isAuthorizedAdmin) {
        // Automatically resend the verification email
        await sendEmailVerification(currentUser);
        await firebaseSignOut(auth);
        setUser(null);
        setFirebaseUser(null);
        return { success: false, error: 'Email not verified! A new verification link has been sent to your inbox. Please check your Spam/Junk folder if you cannot find it.' };
      }
      
      let actualRole = await fetchUserRole(currentUser.uid, currentUser.email) || 'user';

      // If they requested Admin, enforce that only the authorized email is allowed
      if (role === 'admin' && !isAuthorizedAdmin) {
        await firebaseSignOut(auth);
        setUser(null);
        setFirebaseUser(null);
        return { success: false, error: 'Access Denied: Only authorized administrators can log in as Admin.' };
      }

      // If they are the authorized admin and requested admin, force their actual role to admin
      if (role === 'admin' && isAuthorizedAdmin) {
        actualRole = 'admin';
      }

      // Check if pending engineer FIRST
      if (db && role === 'engineer') {
        const reqRef = doc(db, 'engineerRequests', currentUser.uid);
        const reqSnap = await getDoc(reqRef);
        if (reqSnap.exists()) {
          if (!reqSnap.data().approved) {
            await firebaseSignOut(auth);
            setUser(null);
            setFirebaseUser(null);
            return { success: false, error: 'Your engineer account is pending admin approval.' };
          } else {
            // If they are approved but somehow actualRole is not updated, force it
            actualRole = 'engineer';
          }
        }
      }

      // Ensure standard actualRole is respected if no exceptions apply
      if (role && role !== 'user' && role !== 'admin' && actualRole !== role) {
        await firebaseSignOut(auth);
        setUser(null);
        setFirebaseUser(null);
        return { success: false, error: `You don't have ${role} access. Contact admin.` };
      }
      
      setUser({
        id: currentUser.uid,
        email: currentUser.email || '',
        role: actualRole,
        isVerified: currentUser.emailVerified,
      });
      
      return { success: true };
    } catch (error: any) {
      console.error("Login error:", error);
      let errorMessage = 'Login failed';
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
        errorMessage = 'Invalid email or password. Please check your credentials and try again.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed login attempts. Please try again later or reset your password.';
      } else if (error.message?.includes('Permission Denied')) {
        errorMessage = error.message;
      } else {
        errorMessage = error.message || errorMessage;
      }
      return { success: false, error: errorMessage };
    }
  };

  const register = async (email: string, password: string, fullName?: string, role?: UserRole, engineerData?: EngineerRegistrationData): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!auth) {
        // MOCK AUTH: When Firebase isn't configured, mock the register
        console.warn('Firebase not configured. Using Mock Auth for Register.');
        if (role === 'engineer') {
          return { success: false, error: 'Your request has been submitted. Wait for admin approval.' };
        }
        const mockRole = role || 'user';
        const mockUser: AuthUser = { id: 'mock-id-' + Date.now(), email, role: mockRole, isVerified: true };
        setUser(mockUser);
        localStorage.setItem('mock_user', JSON.stringify(mockUser));
        return { success: true };
      }
      
      const normalizedEmail = email.trim().toLowerCase();
      
      let currentUser;
      let isExistingUser = false;

      try {
        const userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
        currentUser = userCredential.user;
      } catch (error: any) {
        if (error.code === 'auth/email-already-in-use' && role === 'engineer') {
          // If they already have an account (e.g. Citizen), they can apply as an Engineer using their existing account password
          try {
            const userCredential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
            currentUser = userCredential.user;
            isExistingUser = true;
          } catch (signInErr: any) {
            if (signInErr.code === 'auth/wrong-password' || signInErr.code === 'auth/invalid-credential') {
              throw new Error("This email is already registered. If it is yours, please enter your correct existing password to apply as an Engineer.");
            }
            throw signInErr;
          }
        } else {
          throw error;
        }
      }
      
      if (role === 'engineer' && engineerData) {
        // Upload ID Proof using Supabase
        const idProofExt = engineerData.idProofFile.name.split('.').pop() || 'jpg';
        const idProofPath = `engineer_proofs/${currentUser.uid}/id_proof_${Date.now()}.${idProofExt}`;
        const { error: idError } = await supabase.storage.from('complaints').upload(idProofPath, engineerData.idProofFile, { contentType: engineerData.idProofFile.type });
        if (idError) throw new Error("Failed to upload ID proof to Supabase");
        const idProofUrl = supabase.storage.from('complaints').getPublicUrl(idProofPath).data.publicUrl;

        // Upload Certificate using Supabase
        const certExt = engineerData.certificateFile.name.split('.').pop() || 'jpg';
        const certPath = `engineer_proofs/${currentUser.uid}/certificate_${Date.now()}.${certExt}`;
        const { error: certError } = await supabase.storage.from('complaints').upload(certPath, engineerData.certificateFile, { contentType: engineerData.certificateFile.type });
        if (certError) throw new Error("Failed to upload Certificate to Supabase");
        const certificateUrl = supabase.storage.from('complaints').getPublicUrl(certPath).data.publicUrl;

        let profileUrl = '';
        if (engineerData.profileImageFile) {
          const profileExt = engineerData.profileImageFile.name.split('.').pop() || 'jpg';
          const profilePath = `engineer_proofs/${currentUser.uid}/profile_${Date.now()}.${profileExt}`;
          const { error: profileError } = await supabase.storage.from('complaints').upload(profilePath, engineerData.profileImageFile, { contentType: engineerData.profileImageFile.type });
          if (profileError) throw new Error("Failed to upload profile image to Supabase");
          profileUrl = supabase.storage.from('complaints').getPublicUrl(profilePath).data.publicUrl;
        }

        // Save to engineerRequests
        const requestData: any = {
          role: 'engineer',
          approved: false,
          rejected: false,
          status: 'pending',
          full_name: fullName || email.split('@')[0],
          email: normalizedEmail,
          phone: engineerData.phone,
          department: engineerData.department,
          employee_id: engineerData.employeeId,
          address: engineerData.address || '',
          experience: engineerData.experience || '',
          id_proof_url: idProofUrl,
          certificate_url: certificateUrl,
          created_at: new Date().toISOString()
        };
        
        if (profileUrl) {
          requestData.profile_image_url = profileUrl;
        }

        await setDoc(doc(db, 'engineerRequests', currentUser.uid), requestData);

        // Send Email Verification only if it's a new user
        if (!isExistingUser) {
          await sendEmailVerification(currentUser);
        }

        // Do not log them in
        await firebaseSignOut(auth);
        setUser(null);
        setFirebaseUser(null);
        
        // Return a special success value that AuthPage can handle
        return { success: true, error: isExistingUser ? 'Your engineer account application has been submitted and is pending admin approval.' : 'Your engineer account is pending admin approval. We have also sent a verification email.' };
      }

      // Send Email Verification for all users
      await sendEmailVerification(currentUser);

      // Create standard user profile in Firestore
      const userRole = await completeRegistration(currentUser.uid, normalizedEmail, fullName, role);
      
      // Sign out immediately so they have to verify email before logging in
      await firebaseSignOut(auth);
      setUser(null);
      setFirebaseUser(null);
      
      return { success: true, error: 'Registration successful! A verification email has been sent. Please verify your email before logging in.' };
    } catch (error: any) {
      console.error("Registration error:", error);
      let errorMessage = 'Registration failed';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'This email is already registered! Please go to the Login tab and sign in instead.';
      } else if (error.message?.includes('Permission Denied')) {
        errorMessage = error.message;
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please use at least 6 characters.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Please enter a valid email address.';
      } else {
        errorMessage = error.message || errorMessage;
      }
      return { success: false, error: errorMessage };
    }
  };

  const signInWithGoogle = async (requiredRole?: UserRole, isRegistering?: boolean): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!auth || !googleProvider) {
        // MOCK AUTH: When Firebase isn't configured, mock Google sign in
        console.warn('Firebase not configured. Using Mock Auth for Google Login.');
        const mockRole = requiredRole || 'user';
        const mockUser: AuthUser = { id: 'mock-google-' + Date.now(), email: 'google.user@example.com', role: mockRole, isVerified: true };
        setUser(mockUser);
        localStorage.setItem('mock_user', JSON.stringify(mockUser));
        return { success: true };
      }
      
      const result = await signInWithPopup(auth, googleProvider);
      const currentUser = result.user;
      const email = currentUser.email;
      if (!email) return { success: false, error: 'Google account has no email.' };
      
      let actualRole = await fetchUserRole(currentUser.uid);
      
      const ADMIN_EMAIL = '11a21278parth@gmail.com';
      const isAuthorizedAdmin = email.toLowerCase() === ADMIN_EMAIL.toLowerCase();

      // Enforce admin restriction
      if (requiredRole === 'admin' && !isAuthorizedAdmin) {
        await firebaseSignOut(auth);
        setUser(null);
        setFirebaseUser(null);
        return { success: false, error: 'Access Denied: Only authorized administrators can log in as Admin.' };
      }

      if (!actualRole) {
        // Automatically create account for them using Google credentials
        // If requiredRole is engineer, this shouldn't be used directly without the extra data, 
        // but since we will only pass 'user' for Google Auth from now on, it's safe.
        const targetRole = isAuthorizedAdmin ? 'admin' : (requiredRole || 'user');
        actualRole = await completeRegistration(
          currentUser.uid, 
          email, 
          currentUser.displayName || undefined, 
          targetRole
        );
      } else {
        if (isAuthorizedAdmin) {
          actualRole = 'admin'; // Always force admin if they are the authorized user
        }
        
        if (isRegistering) {
          // They tried to register but already have an account. We can just let them log in, but maybe show a toast.
          // For now, we just proceed and log them in smoothly.
        }
      }
      
      if (requiredRole && requiredRole !== 'user' && actualRole !== requiredRole) {
        await firebaseSignOut(auth);
        setUser(null);
        setFirebaseUser(null);
        return { success: false, error: `You don't have ${requiredRole} access.` };
      }
      
      setUser({
        id: currentUser.uid,
        email: currentUser.email || '',
        role: actualRole,
        isVerified: currentUser.emailVerified,
      });
      
      return { success: true };
    } catch (error: any) {
      console.error("Google auth error:", error);
      return { success: false, error: error.message || 'Google Sign-In failed' };
    }
  };

  const logout = async () => {
    try {
      if (auth) await firebaseSignOut(auth);
      setUser(null);
      setFirebaseUser(null);
      localStorage.removeItem('mock_user');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      if (!auth) {
        // MOCK AUTH
        console.warn('Firebase not configured. Mocking password reset.');
        return { success: true };
      }
      await sendPasswordResetEmail(auth, email);
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message || 'Password reset failed' };
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      firebaseUser,
      loading, 
      login, 
      register, 
      logout,
      resetPassword,
      signInWithGoogle,
      isAdmin: user?.role === 'admin',
      isEngineer: user?.role === 'engineer',
      isUser: user?.role === 'user'
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
