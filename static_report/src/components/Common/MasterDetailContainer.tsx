import { Divider, Grid, GridItem } from '@chakra-ui/react';
import { ReactNode } from 'react';
import { Comparable } from '../../types';
import { mainContentAreaHeight } from '../../utils';
import { SideBar } from '../SideBar/SideBar';

interface Props extends Comparable {
  children: ReactNode;
  singleOnly?: boolean;
  sideNavTop?: string;
}

//NOTE: Only for OSS usage. Reusable for Cloud?
export function MasterDetailContainer({ children, sideNavTop = '0px' }: Props) {
  return (
    <Grid
      width={'100%'}
      h={'100%'}
      templateColumns="minmax(200px, 400px) 1px minmax(420px, 100%)"
    >
      {/* Master Area */}
      <GridItem
        overflowY={'auto'}
        // maxHeight={mainContentAreaHeight}
        position={'sticky'}
        top={sideNavTop}
        maxHeight={`calc(100vh - ${sideNavTop})`}
      >
        <SideBar />
      </GridItem>
      <Divider orientation="vertical" />
      <GridItem maxHeight={mainContentAreaHeight} width="100%" h={'100%'} p={9}>
        {children}
      </GridItem>
    </Grid>
  );
}
