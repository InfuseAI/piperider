import { Flex, Heading, Button } from '@chakra-ui/react';
import { Link } from 'wouter';

export function NotFound() {
  return (
    <Flex
      direction="column"
      width="100%"
      minH="100vh"
      justifyContent="center"
      alignItems="center"
    >
      <Heading fontSize="3xl">404, Not Found!</Heading>
      <Button mt={4}>
        <Link href="/">Back to Home</Link>
      </Button>
    </Flex>
  );
}
