import { Grid, GridItem } from '@chakra-ui/react';
import { ReactNode, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Comparable, ComparisonReportSchema } from '../../types';
import {
  allContentGridTempCols,
  borderVal,
  CompTableColEntryItem,
  mainContentAreaHeight,
} from '../../utils';
import { ASSERTIONS_ROUTE_PATH, BM_ROUTE_PATH } from '../../utils/routes';
import { MasterSideNav } from '../Columns/MasterSideNav';
import { ReportContextBar } from '../Reports';

interface Props extends Comparable {
  initAsExpandedTables?: boolean;
  rawData: Partial<ComparisonReportSchema>;
  tableColEntries: CompTableColEntryItem[];
  tableName?: string;
  columnName?: string;
  children: ReactNode;
}
//NOTE: Only for OSS usage. Reusable for Cloud?
export function MasterDetailContainer({
  rawData,
  tableColEntries,
  tableName,
  initAsExpandedTables,
  columnName,
  children,
  singleOnly,
}: Props) {
  const [location, setLocation] = useLocation();
  const fallback = rawData.input ?? rawData.base;

  useEffect(() => {
    if (!location || location === '/') setLocation('/tables');
  }, [location]);

  return (
    <>
      <ReportContextBar
        datasource={fallback?.datasource.name}
        version={fallback?.version}
        px={3}
        borderBottom={borderVal}
      />
      <Grid
        width={'inherit'}
        h={'100%'}
        templateColumns={allContentGridTempCols}
      >
        {/* Master Area */}
        <GridItem
          overflowY={'scroll'}
          maxHeight={mainContentAreaHeight}
          h={'100%'}
        >
          <MasterSideNav
            initAsExpandedTables={initAsExpandedTables}
            tableColEntryList={tableColEntries}
            singleOnly={singleOnly}
          />
        </GridItem>
        <GridItem
          overflowY={'scroll'}
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
