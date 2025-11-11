import { useEffect, useState } from 'react';

export function useMediaQuery(query: string): boolean {
  const getInitial = () => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false;
    }
    return window.matchMedia(query).matches;
  };

  const [matches, setMatches] = useState<boolean>(getInitial);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return () => undefined;
    }

    const media = window.matchMedia(query);
    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    // Match initial state in case query changed
    setMatches(media.matches);

    media.addEventListener('change', listener);
    return () => {
      media.removeEventListener('change', listener);
    };
  }, [query]);

  return matches;
}
