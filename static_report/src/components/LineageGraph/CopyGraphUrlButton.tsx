import { Button, useClipboard } from '@chakra-ui/react';
import { useEffect } from 'react';
import { useHashParams } from '../../hooks';

function getWindow(): Window | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  return window;
}

export function CopyGraphUrlButton() {
  const _window = getWindow();

  const { onCopy, setValue, hasCopied } = useClipboard('');
  const hashParams = useHashParams();

  useEffect(() => {
    let url = _window?.location?.href;
    if (!url) {
      return;
    }

    setValue(url);
  }, [_window, hashParams, setValue]);

  return (
    <Button variant="outline" colorScheme="gray" size="sm" onClick={onCopy}>
      {hasCopied ? 'Copied' : 'Copy URL'}
    </Button>
  );
}
