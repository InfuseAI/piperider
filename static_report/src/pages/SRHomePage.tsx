import { useEffect } from 'react';
import { useLocation } from 'wouter';

export function SRHomePage() {
  const [location, setLocation] = useLocation();
  useEffect(() => {
    if (!location || location === '/') setLocation('/tables');
  }, [location, setLocation]);

  return <></>;
}
