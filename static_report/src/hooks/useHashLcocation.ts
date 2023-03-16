import { useState, useEffect } from 'react';

function getWindow(): Window | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  return window;
}

export function useHashLocation() {
  const _window = getWindow();
  const [_hashLocation, setHashLocation] = useState('#/ssr');

  useEffect(() => {
    if (!_window) {
      return;
    }

    setHashLocation(_window!.location.hash);
    const handler = () => setHashLocation(_window!.location.hash);
    _window.addEventListener('hashchange', handler);

    return () => window.removeEventListener('hashchange', handler);
  }, [_window]);

  const navigate = (to) => {
    window!.location.hash = to;
  };

  const hashLocation =
    _hashLocation !== '#/ssr' ? _window!.location.hash : _hashLocation;

  const location = hashLocation.replace(/^#/, '') || '/';
  return [location, navigate];
}
