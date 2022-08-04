import { Flex, useColorMode } from '@chakra-ui/react';

import { Footer } from './Footer';
import { Sidebar } from './Sidebar';

export function Main({ children, ...props }) {
  const { colorMode } = useColorMode();
  const bgColor = { light: 'gray.50', dark: 'gray.900' };
  const color = { light: 'black', dark: 'white' };

  return (
    <Flex>
      <Sidebar />

      <Flex
        direction="column"
        alignItems="center"
        justifyContent="flex-start"
        bg={bgColor[colorMode]}
        color={color[colorMode]}
        width="100%"
        minHeight="100vh"
        {...props}
      >
        {children}

        <Footer />
      </Flex>
    </Flex>
  );
}
