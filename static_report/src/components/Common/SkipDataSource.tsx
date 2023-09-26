import { Alert, AlertIcon, AlertDescription } from '@chakra-ui/react';

export function SkipDataSource() {
  return (
    <Alert status="error" mb={3} rounded={10}>
      <AlertIcon />
      <AlertDescription>
        Schemas and reports generated from manifest files are limited to
        information in those manifests. For a more detailed report, follow these
        instructions
      </AlertDescription>
    </Alert>
  );
}