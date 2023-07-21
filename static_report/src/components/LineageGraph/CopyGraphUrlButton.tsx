import { Button, useClipboard } from '@chakra-ui/react';
import { useEffect } from 'react';

type Props = {
  params: URLSearchParams;
};

function getWindow(): Window | undefined {
  if (typeof window === 'undefined') {
    return undefined;
  }

  return window;
}

export function CopyGraphUrlButton({ params }: Props) {
  const _window = getWindow();

  const { onCopy, setValue, hasCopied } = useClipboard('');

  useEffect(() => {
    let url = _window?.location?.href;
    if (!url) {
      return;
    }

    if (url && url.includes('#')) {
      url = url.split('#')[0];
    }

    setValue(`${url}#/?${params.toString()}`);
  }, [_window, params, setValue]);

  return (
    <Button variant="outline" colorScheme="gray" size="sm" onClick={onCopy}>
      {hasCopied ? 'Copied' : 'Copy URL'}
    </Button>
  );
}
