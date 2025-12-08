import React, { createContext, useContext, useState, useEffect } from 'react';
import { getSettings } from './api';

const SettingsContext = createContext();

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState({
    exp_warning_days: 90, // Default: 3 months
    exp_danger_days: 30   // Default: 1 month
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const res = await getSettings();
      if (res.data) {
        setSettings({
          exp_warning_days: parseInt(res.data.exp_warning_days) || 90,
          exp_danger_days: parseInt(res.data.exp_danger_days) || 30
        });
      }
    } catch (err) {
      console.error('Error loading settings:', err);
      // Use defaults on error
    } finally {
      setLoading(false);
    }
  };

  const refreshSettings = () => {
    loadSettings();
  };

  return (
    <SettingsContext.Provider value={{ settings, loading, refreshSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};
