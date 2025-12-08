import { useState, useEffect } from 'react';

/**
 * Custom hook to get current user from localStorage
 */
export const useCurrentUser = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error('Error parsing user from localStorage:', e);
      }
    }
  }, []);

  return user;
};
