import { Text } from '@chakra-ui/react';

export function AssertionStatus({ status }: { status?: 'passed' | 'failed' }) {
  switch (status) {
    case 'passed':
      return (
        <Text as="span" role={'img'}>
          ✅
        </Text>
      );
    case 'failed':
      return (
        <Text as="span" role={'img'}>
          ❌
        </Text>
      );
    default:
      return (
        <Text as="span" role={'img'}>
          -
        </Text>
      );
  }
}
