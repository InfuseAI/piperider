import { Grid, GridItem } from '@chakra-ui/react';
import { ReactNode, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Comparable } from '../../types';
import {
  allContentGridTempCols,
  borderVal,
  mainContentAreaHeight,
  useReportStore,
} from '../../utils';
import { MasterSideNav } from '../Columns/MasterSideNav';
import { ReportContextBar } from '../Reports';

interface Props extends Comparable {
  children: ReactNode;
}
//NOTE: Only for OSS usage. Reusable for Cloud?
export function MasterDetailContainer({ children, singleOnly }: Props) {
  const initAsExpandedTables = true;
  const [location, setLocation] = useLocation();

  const { tableColumnsOnly: tableColEntries = [], rawData } =
    useReportStore.getState();

  const fallback = rawData.input ?? rawData.base;
  console.log('fallback', fallback);

  useEffect(() => {
    if (!location || location === '/') setLocation('/tables');
  }, [location, setLocation]);

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
        templateColumns={allContentGridTempCols}
      >
        {/* Master Area */}
        <GridItem
          overflowY={'auto'}
          maxHeight={mainContentAreaHeight}
          h={'100%'}
          borderRight="1px"
          borderRightColor="lightgray"
        >
          <MasterSideNav
            initAsExpandedTables={initAsExpandedTables}
            tableColEntryList={tableColEntries}
            singleOnly={singleOnly}
          />
        </GridItem>
        <GridItem
          overflowY={'auto'}
          maxHeight={mainContentAreaHeight}
          h={'100%'}
          p={9}
        >
          {children}
        </GridItem>
      </Grid>
    </>
  );
}
