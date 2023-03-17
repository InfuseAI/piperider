import { useEffect } from 'react';
import { useLocation } from 'wouter';

export function CRHomePage() {
  const [location, setLocation] = useLocation();
  useEffect(() => {
    if (!location || location === '/') setLocation('/tables');
  }, [location, setLocation]);

  return <></>;
}
