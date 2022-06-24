import { useState, useEffect, useCallback } from 'react';

function currentLocation() {
  return window.location.hash.replace(/^#/, '') || '/';
}

export function useHashLocation() {
  const [location, setLocation] = useState(currentLocation());

  useEffect(() => {
    const handler = () => setLocation(currentLocation());

    window.addEventListener('hashchange', handler);

    return () => window.removeEventListener('hashchange', handler);
  }, []);

  const navigate = useCallback((to) => (window.location.hash = to), []);

  return [location, navigate];
}
