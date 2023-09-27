import { Alert, AlertIcon, AlertDescription } from '@chakra-ui/react';

export function SkipDataSource() {
  return (
    <Alert status="error" mb={3} rounded={10}>
      <AlertIcon />
      <AlertDescription>
        Schemas and reports generated from manifest files are limited to
        information in those manifests. For a more detailed report, follow these{' '}
        <a
          href={'https://docs.piperider.io/get-started/run'}
          style={{ cursor: 'pointer', textDecoration: 'underline' }}
          target="_blank"
          rel="noreferrer"
        >
          instructions
        </a>
      </AlertDescription>
    </Alert>
  );
}
