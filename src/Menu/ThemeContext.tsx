import React, { createContext, useState, useEffect, useCallback } from 'react';

export const ThemeContext = createContext({
  darkMode: false,
  setDarkMode: (value: boolean) => {},
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [darkMode, setDarkMode] = useState(false);

  // Load darkMode from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('app_settings');
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings);
      if (typeof parsed.darkMode === 'boolean') {
        setDarkMode(parsed.darkMode);
      }
    }
  }, []);

  // Apply and persist changes
  useEffect(() => {
    document.body.classList.toggle('dark', darkMode);

    const currentSettings = JSON.parse(localStorage.getItem('app_settings') || '{}');
    localStorage.setItem(
      'app_settings',
      JSON.stringify({ ...currentSettings, darkMode })
    );
  }, [darkMode]);

  const updateDarkMode = useCallback((value: boolean) => {
    setDarkMode(value);
  }, []);

  return (
    <ThemeContext.Provider value={{ darkMode, setDarkMode: updateDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
};