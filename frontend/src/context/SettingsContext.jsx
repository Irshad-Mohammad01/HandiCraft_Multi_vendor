import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import axios from 'axios';
import { API_BASE_URL } from './AuthContext';

const DEFAULT_SETTINGS = {
  platform_name: 'CraftNest Indian Handicrafts',
  support_phone: '+91 141 256 7890',
  support_email: 'care@craftnest.in',
  whatsapp_number: '+91 98765 43210',
  business_address: 'CraftNest Artisan Hub, Bapu Bazaar, Jaipur, Rajasthan 302001',
  contact_page_info: 'Whether you have questions about custom handicraft orders, artisan guild partnerships, or delivery status, our craft care team is here to assist.',
  working_hours: 'Mon - Sat: 10:00 AM - 7:00 PM IST',
  social_instagram: 'https://instagram.com/craftnest.in',
  social_facebook: 'https://facebook.com/craftnest.in',
  social_youtube: 'https://youtube.com/@craftnest',
  social_twitter: 'https://x.com/craftnest_in',
  homepage_promo_title: 'Festive Heritage Celebrations',
  homepage_promo_subtitle: 'Exclusive Master Artisan Curations & Handwoven Heirlooms',
  homepage_promo_button_text: 'Explore Heritage',
  homepage_promo_button_link: '/products',
  homepage_promo_bg_color: '#2B2523',
  homepage_promo_text_color: '#FFF9F3',
  homepage_promo_visible: 'true',
};

export const SettingsContext = createContext({
  settings: DEFAULT_SETTINGS,
  loading: false,
  refreshSettings: async () => {},
  updateSettings: async () => {},
});

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/admin/settings`);
      if (response.data && typeof response.data === 'object') {
        setSettings((prev) => ({
          ...DEFAULT_SETTINGS,
          ...prev,
          ...response.data,
        }));
      }
    } catch (err) {
      console.error('[SETTINGS] Error fetching settings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateSettings = async (newSettings) => {
    const token = localStorage.getItem('bb_token') || localStorage.getItem('token');
    const response = await axios.post(
      `${API_BASE_URL}/admin/settings`,
      newSettings,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    if (response.data?.success) {
      setSettings((prev) => ({ ...prev, ...newSettings }));
    }
    return response.data;
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        loading,
        refreshSettings: fetchSettings,
        updateSettings,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => useContext(SettingsContext);
export default SettingsContext;
