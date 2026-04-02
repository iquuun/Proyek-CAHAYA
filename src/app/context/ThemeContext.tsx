import React, { createContext, useContext, useState, useEffect } from 'react';

export type Theme = 'light' | 'dark';
export type FontSize = 'kecil' | 'sedang' | 'besar';
export type FontFamily = 'inter' | 'roboto' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (t: Theme) => void;
  fontSize: FontSize;
  setFontSize: (fs: FontSize) => void;
  fontFamily: FontFamily;
  setFontFamily: (ff: FontFamily) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  // Init state from local storage so it persists per browser
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('cahaya_preferensi_theme') as Theme) || 'light');
  const [fontSize, setFontSize] = useState<FontSize>(() => (localStorage.getItem('cahaya_preferensi_font_size') as FontSize) || 'sedang');
  const [fontFamily, setFontFamily] = useState<FontFamily>(() => (localStorage.getItem('cahaya_preferensi_font_family') as FontFamily) || 'inter');

  // Application logic for Theme
  useEffect(() => {
    localStorage.setItem('cahaya_preferensi_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  // Application logic for Font Size global scale trick!
  // Tailwind default CSS scaling uses 16px as standard, we force higher/lower rem scale factor here
  useEffect(() => {
    localStorage.setItem('cahaya_preferensi_font_size', fontSize);
    if (fontSize === 'kecil') {
      document.documentElement.style.fontSize = '13px';
    } else if (fontSize === 'besar') {
      document.documentElement.style.fontSize = '18px';
    } else {
      // Sedang / Default
      document.documentElement.style.fontSize = ''; 
    }
  }, [fontSize]);

  // Application logic for Font Family integration
  useEffect(() => {
    localStorage.setItem('cahaya_preferensi_font_family', fontFamily);
    
    let targetFont = "";
    if (fontFamily === 'inter') {
      targetFont = "'Inter', ui-sans-serif, system-ui, sans-serif";
    } else if (fontFamily === 'roboto') {
      targetFont = "'Roboto', ui-sans-serif, system-ui, sans-serif";
    } else {
      targetFont = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol'";
    }
    
    document.documentElement.style.fontFamily = targetFont;
    document.body.style.fontFamily = targetFont;
  }, [fontFamily]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, fontSize, setFontSize, fontFamily, setFontFamily }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useThemeContext = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useThemeContext must be used within ThemeProvider');
  return context;
};
