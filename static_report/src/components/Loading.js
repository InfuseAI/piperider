import { Flex, Spinner } from '@chakra-ui/react';

export function Loading() {
  return (
    <Flex
      bgColor="gray.50"
      width="100%"
      height="100vh"
      justifyContent="center"
      alignItems="center"
    >
      <Spinner />
    </Flex>
  );
}
