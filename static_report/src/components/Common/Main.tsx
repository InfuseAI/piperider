import { Flex, FlexProps, useColorMode } from '@chakra-ui/react';
import { useEffect, ReactNode } from 'react';
import * as amplitude from '@amplitude/analytics-browser';

import { Navbar } from './Navbar';
import {
  mainContentAreaHeight,
  topNavAndFooterHeightOffset,
} from '../../utils';

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
    <Flex direction="column" h={'100vh'}>
      <Navbar isSingleReport={isSingleReport} />

      <Flex
        direction="column"
        alignItems="center"
        justifyContent="flex-start"
        bg={bgColor[colorMode]}
        color={color[colorMode]}
        minHeight={mainContentAreaHeight}
        width="100%"
        height={'100%'}
        {...props}
      >
        {children}
      </Flex>
    </Flex>
  );
}
