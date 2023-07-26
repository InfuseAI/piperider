import { Box, Divider, Flex, Grid, GridItem } from '@chakra-ui/react';
import { ReactNode } from 'react';
import { Comparable } from '../../types';
import { mainContentAreaHeight } from '../../utils';
import { CloudReportProvider } from '../../utils/cloud';
import { SideBar } from '../SideBar/SideBar';

interface Props extends Comparable {
  children: ReactNode;
  singleOnly?: boolean;
  cloud?: boolean;
  sideNavTop?: string;
}

//NOTE: Only for OSS usage. Reusable for Cloud?
export function MasterDetailContainer({
  children,
  sideNavTop = '0px',
  cloud,
  singleOnly,
}: Props) {
  return (
    <CloudReportProvider cloud={cloud === true}>
      <Flex width={'100%'} h={'100%'} alignItems="stretch">
        {/* Master Area */}
        <Box
          overflowY={'auto'}
          // maxHeight={mainContentAreaHeight}
          position={'sticky'}
          top={sideNavTop}
          flex="0 1 400px"
          maxWidth="400px"
          minWidth="280px"
          maxHeight={`calc(100vh - ${sideNavTop})`}
        >
          <SideBar singleOnly={singleOnly} />
        </Box>

        <Box
          maxHeight={mainContentAreaHeight}
          h={'100%'}
          p={9}
          flex="1 0 800px"
          width="800px"
        >
          {children}
        </Box>
      </Flex>
    </CloudReportProvider>
  );
}
