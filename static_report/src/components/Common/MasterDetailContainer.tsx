import { Divider, Grid, GridItem } from '@chakra-ui/react';
import { ReactNode } from 'react';
import { Comparable } from '../../types';
import { mainContentAreaHeight, useReportStore } from '../../utils';
import { MasterSideNav } from '../Columns/MasterSideNav';

interface Props extends Comparable {
  children: ReactNode;
}
//NOTE: Only for OSS usage. Reusable for Cloud?
export function MasterDetailContainer({ children, singleOnly }: Props) {
  const initAsExpandedTables = true;

  const { tableColumnsOnly: tableColEntries = [] } = useReportStore.getState();

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
        top={65}
        maxHeight="calc(100vh - 65px)"
      >
        <MasterSideNav
          initAsExpandedTables={initAsExpandedTables}
          tableColEntryList={tableColEntries}
          singleOnly={singleOnly}
        />
      </GridItem>
      <Divider orientation="vertical" />
      <GridItem maxHeight={mainContentAreaHeight} width="100%" h={'100%'} p={9}>
        {children}
      </GridItem>
    </Grid>
  );
}
