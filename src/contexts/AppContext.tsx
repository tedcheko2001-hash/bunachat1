import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type Language = 'en' | 'am';

interface AppContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  darkMode: boolean;
  language: Language;
  setDarkMode: (value: boolean) => void;
  setLanguage: (lang: Language) => void;
  signOut: () => Promise<void>;
}

const translations = {
  en: {
    home: 'Home',
    chat: 'Chat',
    bunaRooms: 'Buna Rooms',
    news: 'News',
    opportunities: 'Opportunities',
    profile: 'Profile',
    nuBunaTetu: 'Nu Buna Tetu!',
    comeDrinkCoffee: 'Come drink coffee!',
    goodMorning: 'Good morning',
    generateInvite: 'Generate Invite Link',
    latestNews: 'Latest News',
    studyBuna: 'Study Buna',
    settings: 'Settings',
    darkMode: 'Dark Mode',
    language: 'Language',
    signOut: 'Sign Out',
    login: 'Login',
    signup: 'Sign Up',
    email: 'Email',
    password: 'Password',
    name: 'Name',
    post: 'Post',
    like: 'Like',
    comment: 'Comment',
    openGroup: 'Open Group',
    createRoom: 'Create Room',
    roomName: 'Room Name',
    typeMessage: 'Type a message...',
    send: 'Send',
  },
  am: {
    home: 'መነሻ',
    chat: 'ውይይት',
    bunaRooms: 'ቡና ክፍሎች',
    news: 'ዜና',
    opportunities: 'እድሎች',
    profile: 'መገለጫ',
    nuBunaTetu: 'ኑ ቡና ጠጡ!',
    comeDrinkCoffee: 'ቡና ይጠጡ!',
    goodMorning: 'እንደምን አደርክ',
    generateInvite: 'ግብዣ ይፍጠሩ',
    latestNews: 'የቅርብ ዜናዎች',
    studyBuna: 'ቡና ይማሩ',
    settings: 'ቅንብሮች',
    darkMode: 'ጨለማ ሁነታ',
    language: 'ቋንቋ',
    signOut: 'ውጣ',
    login: 'ግባ',
    signup: 'ተመዝገብ',
    email: 'ኢሜይል',
    password: 'የይለፍ ቃል',
    name: 'ስም',
    post: 'ልጥፍ',
    like: 'ውደድ',
    comment: 'አስተያየት',
    openGroup: 'ቡድን ክፈት',
    createRoom: 'ክፍል ፍጠር',
    roomName: 'የክፍል ስም',
    typeMessage: 'መልዕክት ጻፍ...',
    send: 'ላክ',
  },
};

export const t = (key: keyof typeof translations.en, language: Language): string => {
  return translations[language][key] || translations.en[key];
};

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkModeState] = useState(false);
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Load settings from localStorage
    const savedDarkMode = localStorage.getItem('bunachat-darkmode');
    const savedLanguage = localStorage.getItem('bunachat-language') as Language;
    
    if (savedDarkMode === 'true') {
      setDarkModeState(true);
      document.documentElement.classList.add('dark');
    }
    
    if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'am')) {
      setLanguageState(savedLanguage);
    }

    return () => subscription.unsubscribe();
  }, []);

  const setDarkMode = (value: boolean) => {
    setDarkModeState(value);
    localStorage.setItem('bunachat-darkmode', String(value));
    if (value) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('bunachat-language', lang);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  return (
    <AppContext.Provider value={{
      user,
      session,
      loading,
      darkMode,
      language,
      setDarkMode,
      setLanguage,
      signOut,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
