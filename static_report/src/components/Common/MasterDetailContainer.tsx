import { Divider, Grid, GridItem } from '@chakra-ui/react';
import { ReactNode } from 'react';
import { Comparable } from '../../types';
import { borderVal, mainContentAreaHeight, useReportStore } from '../../utils';
import { MasterSideNav } from '../Columns/MasterSideNav';
import { ReportContextBar } from '../Reports';

interface Props extends Comparable {
  children: ReactNode;
}
//NOTE: Only for OSS usage. Reusable for Cloud?
export function MasterDetailContainer({ children, singleOnly }: Props) {
  const initAsExpandedTables = true;

  const { tableColumnsOnly: tableColEntries = [], rawData } =
    useReportStore.getState();

  const fallback = rawData.input ?? rawData.base;

  return (
    <>
      <ReportContextBar
        datasource={fallback?.datasource.name}
        version={fallback?.version}
        px={3}
        borderBottom={borderVal}
        showProjectInfo
      ></ReportContextBar>
      <Grid
        width={'inherit'}
        h={'100%'}
        templateColumns="minmax(200px, 400px) 1px minmax(420px, 100%)"
      >
        {/* Master Area */}
        <GridItem
          overflowY={'auto'}
          maxHeight={mainContentAreaHeight}
          h={'100%'}
        >
          <MasterSideNav
            initAsExpandedTables={initAsExpandedTables}
            tableColEntryList={tableColEntries}
            singleOnly={singleOnly}
          />
        </GridItem>
        <Divider orientation="vertical" />
        <GridItem
          overflowY={'auto'}
          maxHeight={mainContentAreaHeight}
          width="100%"
          h={'100%'}
          p={9}
        >
          {children}
        </GridItem>
      </Grid>
    </>
  );
}
