import { Text } from '@chakra-ui/react';
import { AssertionTest } from '../../sdlc';

export function AssertionStatusIcon({
  status,
}: {
  status?: AssertionTest['status'];
}) {
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
