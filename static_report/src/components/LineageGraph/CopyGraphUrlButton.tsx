import { Button, useClipboard } from '@chakra-ui/react';
import { useEffect } from 'react';
import { useHashParams } from '../../hooks';

function getWindow(): Window | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  return window;
}

function patchUrl(url) {
  const urlObj = new URL(url);
  const utmParams = [
    'utm_source',
    'utm_medium',
    'utm_campaign',
    'utm_term',
    'utm_content',
  ];

  for (const param of utmParams) {
    urlObj.searchParams.delete(param);
  }

  urlObj.searchParams.append('utm_source', 'lineage');
  return urlObj.toString();
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
    url = patchUrl(url);
    setValue(url);
  }, [_window, hashParams, setValue]);

  return (
    <Button variant="outline" colorScheme="gray" size="sm" onClick={onCopy}>
      {hasCopied ? 'Copied' : 'Copy URL'}
    </Button>
  );
}
