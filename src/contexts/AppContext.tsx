import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type Language = 'en' | 'am';
type ThemeMode = 'light' | 'dark' | 'system';

interface AppContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  darkMode: boolean;              // effective dark state (derived)
  themeMode: ThemeMode;           // user preference
  language: Language;
  setDarkMode: (value: boolean) => void;
  setThemeMode: (mode: ThemeMode) => void;
  setLanguage: (lang: Language) => void;
  signOut: () => Promise<void>;
}

const translations = {
  en: {
    home: 'Home', chat: 'Chat', bunaRooms: 'Buna Rooms', news: 'News',
    opportunities: 'Opportunities', profile: 'Profile',
    nuBunaTetu: 'Nu Buna Tetu!', comeDrinkCoffee: 'Come drink coffee!',
    goodMorning: 'Good morning',
    latestNews: 'Latest News', studyBuna: 'Study Buna',
    settings: 'Settings', darkMode: 'Dark Mode', language: 'Language',
    signOut: 'Sign Out', login: 'Login', signup: 'Sign Up',
    email: 'Email', password: 'Password', name: 'Name',
    post: 'Post', like: 'Like', comment: 'Comment',
    openGroup: 'Open Group', createRoom: 'Create Room', roomName: 'Room Name',
    typeMessage: 'Type a message...', send: 'Send',
  },
  am: {
    home: 'መነሻ', chat: 'ውይይት', bunaRooms: 'ቡና ክፍሎች', news: 'ዜና',
    opportunities: 'እድሎች', profile: 'መገለጫ',
    nuBunaTetu: 'ኑ ቡና ጠጡ!', comeDrinkCoffee: 'ቡና ይጠጡ!',
    goodMorning: 'እንደምን አደርክ',
    latestNews: 'የቅርብ ዜናዎች', studyBuna: 'ቡና ይማሩ',
    settings: 'ቅንብሮች', darkMode: 'ጨለማ ሁነታ', language: 'ቋንቋ',
    signOut: 'ውጣ', login: 'ግባ', signup: 'ተመዝገብ',
    email: 'ኢሜይል', password: 'የይለፍ ቃል', name: 'ስም',
    post: 'ልጥፍ', like: 'ውደድ', comment: 'አስተያየት',
    openGroup: 'ቡድን ክፈት', createRoom: 'ክፍል ፍጠር', roomName: 'የክፍል ስም',
    typeMessage: 'መልዕክት ጻፍ...', send: 'ላክ',
  },
};

export const t = (key: keyof typeof translations.en, language: Language): string => {
  return translations[language][key] || translations.en[key];
};

const AppContext = createContext<AppContextType | undefined>(undefined);

const applyThemeToDocument = (mode: ThemeMode): boolean => {
  const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const effectiveDark = mode === 'dark' || (mode === 'system' && systemDark);
  document.documentElement.classList.toggle('dark', effectiveDark);
  return effectiveDark;
};

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [themeMode, setThemeModeState] = useState<ThemeMode>('light');
  const [darkMode, setDarkModeInternal] = useState(false);
  const [language, setLanguageState] = useState<Language>('en');

  useEffect(() => {
    // Auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Load stored theme + migrate legacy 'bunachat-darkmode'
    const savedTheme = localStorage.getItem('bunachat-thememode') as ThemeMode | null;
    const legacyDark = localStorage.getItem('bunachat-darkmode');
    const initialMode: ThemeMode =
      savedTheme && ['light', 'dark', 'system'].includes(savedTheme)
        ? savedTheme
        : legacyDark === 'true' ? 'dark' : 'light';
    setThemeModeState(initialMode);
    setDarkModeInternal(applyThemeToDocument(initialMode));

    // Load language
    const savedLanguage = localStorage.getItem('bunachat-language') as Language;
    if (savedLanguage === 'en' || savedLanguage === 'am') setLanguageState(savedLanguage);

    // Listen for OS theme changes when in system mode
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onSystemChange = () => {
      const currentMode = (localStorage.getItem('bunachat-thememode') as ThemeMode | null) ?? 'light';
      if (currentMode === 'system') {
        setDarkModeInternal(applyThemeToDocument('system'));
      }
    };
    mq.addEventListener('change', onSystemChange);

    return () => {
      subscription.unsubscribe();
      mq.removeEventListener('change', onSystemChange);
    };
  }, []);

  const setThemeMode = (mode: ThemeMode) => {
    setThemeModeState(mode);
    localStorage.setItem('bunachat-thememode', mode);
    setDarkModeInternal(applyThemeToDocument(mode));
  };

  // Backward-compatible toggle
  const setDarkMode = (value: boolean) => {
    setThemeMode(value ? 'dark' : 'light');
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
      user, session, loading,
      darkMode, themeMode, language,
      setDarkMode, setThemeMode, setLanguage, signOut,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) throw new Error('useApp must be used within an AppProvider');
  return context;
};
