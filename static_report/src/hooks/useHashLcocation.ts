import { useState, useEffect, useCallback } from 'react';

function getWindow(): Window | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  return window;
}

function useHash(defaultValue?: string): [string, (string) => void] {
  const _window = getWindow();
  const [hash, setHash] = useState(defaultValue ?? '');

  useEffect(() => {
    if (!_window) {
      return;
    }

    setHash(_window!.location.hash);
    const handler = () => setHash(_window!.location.hash);
    _window.addEventListener('hashchange', handler);

    return () => window.removeEventListener('hashchange', handler);
  }, [_window]);

  const navigate = useCallback(
    (to) => {
      _window!.location.hash = to;
    },
    [_window],
  );

  return [hash, navigate];
}

// This is used by wouter Router
// <Router hook={useHashLocation}>
export function useHashLocation() {
  const [hash, setHash] = useHash('#/ssr');

  // replace '#/path/to/resource?foo=bar' with '/path/to/resource'
  let location = hash.replace(/^#/, '') || '/';
  if (location.includes('?')) {
    location = location.split('?')[0];
  }

  return [location, setHash];
}

export function useHashParams() {
  const [hash] = useHash();

  if (hash.includes('?')) {
    const [, search] = hash.split('?');
    return new URLSearchParams(search);
  } else {
    return new URLSearchParams('');
  }
}
