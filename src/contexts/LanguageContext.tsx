import React, { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'en' | 'gu';

interface Translations {
  [key: string]: {
    en: string;
    gu: string;
  };
}

const translations: Translations = {
  // App Name & Branding
  appName: { en: 'Aapno Rasto', gu: 'આપણો રસ્તો' },
  tagline: { en: 'Your Path to Better Governance', gu: 'સારા શાસન માટે તમારો માર્ગ' },
  govtOfGujarat: { en: 'Government of Gujarat', gu: 'ગુજરાત સરકાર' },
  
  // Navigation
  home: { en: 'Home', gu: 'હોમ' },
  dashboard: { en: 'Dashboard', gu: 'ડેશબોર્ડ' },
  fileComplaint: { en: 'File Complaint', gu: 'ફરિયાદ નોંધો' },
  myComplaints: { en: 'My Complaints', gu: 'મારી ફરિયાદો' },
  rewards: { en: 'Rewards', gu: 'પુરસ્કાર' },
  profile: { en: 'Profile', gu: 'પ્રોફાઇલ' },
  logout: { en: 'Logout', gu: 'લૉગઆઉટ' },
  
  // Auth
  login: { en: 'Login', gu: 'લૉગિન' },
  register: { en: 'Register', gu: 'નોંધણી' },
  email: { en: 'Email', gu: 'ઈમેલ' },
  password: { en: 'Password', gu: 'પાસવર્ડ' },
  confirmPassword: { en: 'Confirm Password', gu: 'પાસવર્ડ ચકાસો' },
  enterOtp: { en: 'Enter OTP', gu: 'OTP દાખલ કરો' },
  verifyOtp: { en: 'Verify OTP', gu: 'OTP ચકાસો' },
  resendOtp: { en: 'Resend OTP', gu: 'OTP ફરી મોકલો' },
  
  
  selectRole: { en: 'Select your role', gu: 'તમારી ભૂમિકા પસંદ કરો' },
  continueWithGoogle: { en: 'Continue with Google', gu: 'Google સાથે ચાલુ રાખો' },
  emailAddress: { en: 'Email Address', gu: 'ઇમેઇલ સરનામું' },
  forgotPassword: { en: 'Forgot password?', gu: 'પાસવર્ડ ભૂલી ગયા છો?' },
  registerAs: { en: 'Register as', gu: 'તરીકે નોંધણી કરો' },
  registerWithGoogle: { en: 'Register with Google', gu: 'Google સાથે નોંધણી કરો' },
  fillDetailsManually: { en: 'Or fill details manually', gu: 'અથવા મેન્યુઅલી વિગતો ભરો' },
  fullName: { en: 'Full Name', gu: 'પૂરું નામ' },
  engineerVerification: { en: 'Engineer Verification Details', gu: 'ઇજનેર ચકાસણી વિગતો' },
  phoneNumber: { en: 'Phone Number *', gu: 'ફોન નંબર *' },
  department: { en: 'Department *', gu: 'વિભાગ *' },
  employeeId: { en: 'Employee ID *', gu: 'કર્મચારી ID *' },
  experience: { en: 'Experience (Years)', gu: 'અનુભવ (વર્ષ)' },
  address: { en: 'Address *', gu: 'સરનામું *' },
  passwordResetTitle: { en: 'Password Reset', gu: 'પાસવર્ડ રીસેટ' },
  passwordResetDesc: { en: "Enter your email address and we'll send you a link to reset your password.", gu: "તમારું ઇમેઇલ સરનામું દાખલ કરો અને અમે પાસવર્ડ રીસેટ કરવા માટે એક લિંક મોકલીશું." },
  backToLogin: { en: 'Back to Login', gu: 'લોગિન પર પાછા ફરો' },
  citizen: { en: 'Citizen', gu: 'નાગરિક' },
  engineer: { en: 'Engineer', gu: 'એન્જિનિયર' },
  admin: { en: 'Admin', gu: 'એડમિન' },
  
  // Complaint Categories
  garbage: { en: 'Garbage', gu: 'કચરો' },
  streetLight: { en: 'Street Light', gu: 'સ્ટ્રીટ લાઇટ' },
  roadMaintenance: { en: 'Road Maintenance', gu: 'રસ્તો સમારકામ' },
  waterSupply: { en: 'Water Supply', gu: 'પાણી પુરવઠો' },
  drainage: { en: 'Drainage', gu: 'ગટર' },
  publicSafety: { en: 'Public Safety', gu: 'જાહેર સુરક્ષા' },
  strayDog: { en: 'Stray Dog Issue', gu: 'રખડતા કૂતરાની સમસ્યા' },
  
  // Stray Dog Sub-options
  aggressiveBehavior: { en: 'Aggressive Behavior', gu: 'આક્રમક વર્તન' },
  sterilizationRequest: { en: 'Sterilization Request', gu: 'વંધ્યીકરણ વિનંતી' },
  sickInjuredAnimal: { en: 'Sick/Injured Animal', gu: 'બીમાર/ઘાયલ પ્રાણી' },
  
  // Status
  pending: { en: 'Pending', gu: 'બાકી' },
  inProgress: { en: 'In Progress', gu: 'પ્રગતિમાં' },
  completed: { en: 'Completed', gu: 'પૂર્ણ' },
  
  // Urgency
  high: { en: 'High', gu: 'ઉચ્ચ' },
  medium: { en: 'Medium', gu: 'મધ્યમ' },
  low: { en: 'Low', gu: 'નીચું' },
  
  // Actions
  submit: { en: 'Submit', gu: 'સબમિટ' },
  cancel: { en: 'Cancel', gu: 'રદ કરો' },
  save: { en: 'Save', gu: 'સાચવો' },
  delete: { en: 'Delete', gu: 'કાઢી નાખો' },
  edit: { en: 'Edit', gu: 'સંપાદિત કરો' },
  view: { en: 'View', gu: 'જુઓ' },
  assign: { en: 'Assign', gu: 'સોંપો' },
  complete: { en: 'Mark Complete', gu: 'પૂર્ણ કરો' },
  takePhoto: { en: 'Take Photo', gu: 'ફોટો લો' },
  uploadProof: { en: 'Upload Proof', gu: 'પુરાવો અપલોડ કરો' },
  
  // Rewards
  currentBalance: { en: 'Current Balance', gu: 'વર્તમાન બેલેન્સ' },
  points: { en: 'Points', gu: 'પોઈન્ટ્સ' },
  redeemPoints: { en: 'Redeem Points', gu: 'પોઈન્ટ્સ વટાવો' },
  generateVoucher: { en: 'Generate Voucher', gu: 'વાઉચર બનાવો' },
  discount: { en: 'Discount', gu: 'છૂટ' },
  propertyTax: { en: 'Property Tax', gu: 'પ્રોપર્ટી ટેક્સ' },
  waterBill: { en: 'Water Bill', gu: 'પાણી બિલ' },
  rtoFines: { en: 'RTO Fines', gu: 'RTO દંડ' },
  
  // Messages
  complaintSubmitted: { en: 'Complaint submitted successfully!', gu: 'ફરિયાદ સફળતાપૂર્વક સબમિટ થઈ!' },
  otpSent: { en: 'OTP sent to your email', gu: 'OTP તમારા ઈમેલ પર મોકલ્યો' },
  locationRequired: { en: 'Location access required', gu: 'સ્થાન ઍક્સેસ જરૂરી છે' },
  cameraRequired: { en: 'Camera access required', gu: 'કેમેરા ઍક્સેસ જરૂરી છે' },
  
  // Dashboard
  totalComplaints: { en: 'Total Complaints', gu: 'કુલ ફરિયાદો' },
  resolvedToday: { en: 'Resolved Today', gu: 'આજે ઉકેલાયેલ' },
  pendingTasks: { en: 'Pending Tasks', gu: 'બાકી કાર્યો' },
  assignedToYou: { en: 'Assigned to You', gu: 'તમને સોંપાયેલ' },
  riskScore: { en: 'Risk Score', gu: 'જોખમ સ્કોર' },
  locationMismatch: { en: 'Location Mismatch', gu: 'સ્થાન મેળ ખાતું નથી' },
  
  // Map
  liveMap: { en: 'Live Complaint Map', gu: 'લાઇવ ફરિયાદ નકશો' },
  heatmapView: { en: 'Heatmap View', gu: 'હીટમેપ વ્યૂ' },
  
  // Welcome
  welcomeMessage: { en: 'Welcome to Aapno Rasto', gu: 'આપણો રસ્તો પર સ્વાગત છે' },
  citizenPortal: { en: 'Citizen Portal for Gujarat', gu: 'ગુજરાત માટે નાગરિક પોર્ટલ' },
  description: { 
    en: 'Report civic issues, track progress, and earn rewards for your contribution to a better Gujarat.', 
    gu: 'નાગરિક સમસ્યાઓની જાણ કરો, પ્રગતિ ટ્રેક કરો અને વધુ સારા ગુજરાત માટે તમારા યોગદાન માટે પુરસ્કાર મેળવો.' 
  },
  getStarted: { en: 'Get Started', gu: 'શરૂ કરો' },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');

  const t = (key: string): string => {
    const translation = Reflect.get(translations, key);
    if (!translation) return key;
    return translation[language] || translation.en || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
