import { Flex, useColorMode } from '@chakra-ui/react';
import { useEffect } from 'react';
import * as amplitude from '@amplitude/analytics-browser';

import { Footer } from './Footer';
import { Sidebar } from './Sidebar';

export function Main({ children, ...props }) {
  const { colorMode } = useColorMode();
  const bgColor = { light: 'gray.50', dark: 'gray.900' };
  const color = { light: 'black', dark: 'white' };

  useEffect(() => {
    const API_KEY = window.PIPERIDER_METADATA.amplitude_api_key;
    const USER_ID = window.PIPERIDER_METADATA.amplitude_user_id;

    if (API_KEY) {
      amplitude.init(API_KEY, USER_ID);
    }
  }, []);

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
