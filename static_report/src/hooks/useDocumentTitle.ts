import { useEffect, useState } from 'react';

export function useDocumentTitle(value = null) {
  const [title, setTitle] = useState(value);

  useEffect(() => {
    document.title = title ? `${title} | PipeRider` : 'PipeRider';
  }, [title]);

  return [title, setTitle];
}
