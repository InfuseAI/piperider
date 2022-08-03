import { RefObject, useEffect, useState } from 'react';

export function useResizeObserver<T extends HTMLElement>(elem: RefObject<T>) {
  const [dimensions, setDimensions] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!elem || !elem.current) {
      return;
    }

    const target = elem.current;
    const resizeObserver = new ResizeObserver((entries) => {
      entries.forEach((entry) => {
        setDimensions(entry.contentRect);
      });
    });

    resizeObserver.observe(target);

    return () => {
      resizeObserver.unobserve(target);
    };
  }, [elem]);

  return dimensions;
}
