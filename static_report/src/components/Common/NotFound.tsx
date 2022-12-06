import { Flex, Heading, Button } from '@chakra-ui/react';
import { Link } from 'wouter';

import { useDocumentTitle } from '../../hooks/useDocumentTitle';

export function NotFound() {
  useDocumentTitle('404 Not Found!');

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
