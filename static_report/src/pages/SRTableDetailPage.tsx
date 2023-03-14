import { Box, Grid, GridItem } from '@chakra-ui/react';

import { Main } from '../components/Common/Main';

import type { SingleReportSchema } from '../sdlc/single-report-schema';
import { NoData } from '../components/Common/NoData';
import {
  AMPLITUDE_EVENTS,
  DupedTableRowsWidget,
  SR_TYPE_LABEL,
  TableColumnSchemaList,
  TableGeneralStats,
  useAmplitudeOnMount,
  useDocumentTitle,
} from '../lib';
import { TableColumnHeader } from '../components/Tables/TableColumnHeader';
import { useReportStore } from '../utils/store';
import { useRoute } from 'wouter';
import { TABLE_DETAILS_ROUTE_PATH } from '../utils/routes';
interface Props {
  data: SingleReportSchema;
}
export default function SRProfileRunPage({ data }: Props) {
  const [, params] = useRoute(TABLE_DETAILS_ROUTE_PATH);
  const tableName = decodeURIComponent(params?.tableName || '');

  useDocumentTitle('Single Report: Table Column Details');
  useAmplitudeOnMount({
    eventName: AMPLITUDE_EVENTS.PAGE_VIEW,
    eventProperties: {
      type: SR_TYPE_LABEL,
      page: 'column-details-page',
    },
  });

  const setReportData = useReportStore((s) => s.setReportRawData);
  setReportData({ base: data });
  const { tableColumnsOnly = [] } = useReportStore.getState();
  const currentTableEntry = tableColumnsOnly.find(
    ([tableKey]) => tableKey === tableName,
  );

  const dataTable = data.tables[tableName];

  if (!tableName || !dataTable || !currentTableEntry) {
    return (
      <Main isSingleReport>
        <NoData text={`No profile data found for table name: ${tableName}`} />
      </Main>
    );
  }
  return (
    <>
      <TableColumnHeader
        title={dataTable.name}
        subtitle={'Table'}
        infoTip={dataTable.description}
        mb={5}
      />
      <Grid
        width={'100%'}
        templateColumns={{ base: '1fr', xl: '1fr 1px 1fr' }}
        gap={5}
      >
        <Grid mb={8} gap={8}>
          <GridItem colSpan={1}>
            <TableGeneralStats tableDatum={dataTable} />
          </GridItem>
          <GridItem>
            <DupedTableRowsWidget tableDatum={dataTable} />
          </GridItem>
        </Grid>

        <Box width="1px" bg="lightgray"></Box>
        <TableColumnSchemaList
          baseTableEntryDatum={currentTableEntry?.[1].base}
          singleOnly
        />
      </Grid>
    </>
  );
}
