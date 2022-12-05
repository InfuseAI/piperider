import { Flex, Spinner, FlexProps } from '@chakra-ui/react';

export function Loading(props: FlexProps) {
  return (
    <Flex
      bgColor="gray.50"
      width="100%"
      height="100vh"
      justifyContent="center"
      alignItems="center"
      {...props}
    >
      <Spinner />
    </Flex>
  );
}
