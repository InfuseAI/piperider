import { Grid, GridItem } from '@chakra-ui/react';
import { ReactNode, useState } from 'react';
import { useLocalStorage } from 'react-use';
import { useLocation } from 'wouter';
import { ColumnDetailMasterList } from '..';
import { Comparable, ComparisonReportSchema } from '../../types';
import {
  allContentGridTempCols,
  CompTableColEntryItem,
  extraSpaceAllContentGridTempCols,
  mainContentAreaHeight,
  MASTER_LIST_SHOW_EXTRA,
} from '../../utils';
import { ASSERTIONS_ROUTE_PATH, BM_ROUTE_PATH } from '../../utils/routes';
import { ReportContextBar } from '../Reports';

interface Props extends Comparable {
  rawData: Partial<ComparisonReportSchema>;
  tableColEntries: CompTableColEntryItem[];
  tableColEntry: CompTableColEntryItem;
  tableName: string;
  columnName: string;
  children: ReactNode;
}
//NOTE: Only for OSS usage.
export function MasterDetailContainer({
  rawData,
  tableColEntries,
  tableColEntry,
  tableName,
  columnName,
  children,
  singleOnly,
}: Props) {
  const [, setLocation] = useLocation();
  const [showExtra] = useLocalStorage(MASTER_LIST_SHOW_EXTRA, '');
  const [extraSpace, setExtraSpace] = useState<boolean>(Boolean(showExtra));

  return (
    <>
      <ReportContextBar
        datasource={rawData.base?.datasource}
        version={rawData.base?.version}
        tableColumns={tableColEntries}
      />
      <Grid
        width={'inherit'}
        templateColumns={
          extraSpace ? extraSpaceAllContentGridTempCols : allContentGridTempCols
        }
      >
        {/* Master Area */}
        <GridItem overflowY={'scroll'} maxHeight={mainContentAreaHeight}>
          <ColumnDetailMasterList
            tableColEntryList={tableColEntries}
            tableColEntry={tableColEntry}
            currentTable={tableName}
            currentColumn={columnName}
            onSelect={({ tableName, columnName }) => {
              setLocation(`/tables/${tableName}/columns/${columnName}`);
            }}
            onNavToAssertions={() => setLocation(ASSERTIONS_ROUTE_PATH)}
            onNavToBM={() => setLocation(BM_ROUTE_PATH)}
            onToggleShowExtra={() => setExtraSpace((v) => !v)}
            singleOnly={singleOnly}
          />
        </GridItem>
        {children}
      </Grid>
    </>
  );
}
