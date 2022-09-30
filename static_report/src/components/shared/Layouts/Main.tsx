import { Flex, FlexProps, useColorMode } from '@chakra-ui/react';
import { useEffect, ReactNode } from 'react';
import * as amplitude from '@amplitude/analytics-browser';

import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';

interface Props extends FlexProps {
  children: ReactNode;
  isSingleReport: boolean;
}

export function Main({ children, isSingleReport, ...props }: Props) {
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
    <Flex direction="column">
      <Navbar isSingleReport={isSingleReport} />

      <Flex>
        <Sidebar />

        <Flex
          direction="column"
          alignItems="center"
          justifyContent="flex-start"
          bg={bgColor[colorMode]}
          color={color[colorMode]}
          width="100%"
          minHeight="calc(100vh - 64px)"
          {...props}
        >
          {children}
        </Flex>
      </Flex>
    </Flex>
  );
}
