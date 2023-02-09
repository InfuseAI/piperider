import { Grid, GridItem } from '@chakra-ui/react';
import { ReactNode } from 'react';
import { useLocation } from 'wouter';
import { Comparable, ComparisonReportSchema } from '../../types';
import {
  allContentGridTempCols,
  CompTableColEntryItem,
  mainContentAreaHeight,
} from '../../utils';
import { ASSERTIONS_ROUTE_PATH, BM_ROUTE_PATH } from '../../utils/routes';
import { MasterSideNav } from '../Columns/MasterSideNav';
import { ReportContextBar } from '../Reports';

interface Props extends Comparable {
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
  columnName,
  children,
  singleOnly,
}: Props) {
  const [location, setLocation] = useLocation();
  const activeMasterItem = location.includes(BM_ROUTE_PATH)
    ? BM_ROUTE_PATH.slice(1)
    : location.includes(ASSERTIONS_ROUTE_PATH)
    ? ASSERTIONS_ROUTE_PATH.slice(1)
    : location === '/'
    ? 'root'
    : 'children';

  return (
    <>
      <ReportContextBar
        datasource={rawData.base?.datasource}
        version={rawData.base?.version}
      />
      <Grid width={'inherit'} templateColumns={allContentGridTempCols}>
        {/* Master Area */}
        <GridItem overflowY={'scroll'} maxHeight={mainContentAreaHeight}>
          <MasterSideNav
            activeMasterParent={activeMasterItem}
            tableColEntryList={tableColEntries}
            currentTable={tableName}
            currentColumn={columnName}
            onSelect={({ tableName, columnName }) => {
              const path = Boolean(!tableName && !columnName)
                ? `/`
                : `/tables/${tableName}/columns/${columnName}`;

              setLocation(path);
            }}
            onNavToAssertions={() => setLocation(ASSERTIONS_ROUTE_PATH)}
            onNavToBM={() => setLocation(BM_ROUTE_PATH)}
            singleOnly={singleOnly}
          />
        </GridItem>
        {children}
      </Grid>
    </>
  );
}
