import { Text, Divider, Grid, GridItem } from '@chakra-ui/react';

import { NoData } from '../components/Common/NoData';
import {
  AMPLITUDE_EVENTS,
  DupedTableRowsWidget,
  SR_TYPE_LABEL,
  TableColumnSchemaList,
  TableGeneralStats,
  useAmplitudeOnMount,
} from '../lib';
import { TableColumnHeader } from '../components/Tables/TableColumnHeader';
import { useReportStore } from '../utils/store';
import { useRoute } from 'wouter';
import { TABLE_DETAILS_ROUTE_PATH } from '../utils/routes';

export default function SRProfileRunPage() {
  const [, params] = useRoute(TABLE_DETAILS_ROUTE_PATH);
  const tableName = decodeURIComponent(params?.tableName || '');

  useAmplitudeOnMount({
    eventName: AMPLITUDE_EVENTS.PAGE_VIEW,
    eventProperties: {
      type: SR_TYPE_LABEL,
      page: 'column-details-page',
    },
  });

  const {
    tableColumnsOnly = [],
    rawData: { base: data },
  } = useReportStore.getState();
  const currentTableEntry = tableColumnsOnly.find(
    ([tableKey]) => tableKey === tableName,
  );

  const dataTable = data?.tables[tableName];

  if (!tableName || !dataTable || !currentTableEntry) {
    return <NoData text={`No profile data found for '${tableName}'`} />;
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
            <Text fontSize={'xl'}>Table Statistics</Text>
            <Divider my={1} />
            <TableGeneralStats tableDatum={dataTable} />
          </GridItem>
          <GridItem>
            <Text fontSize={'xl'}>Duplicate Rows</Text>
            <Divider my={1} />
            <DupedTableRowsWidget tableDatum={dataTable} />
          </GridItem>
        </Grid>

        <Divider orientation="vertical" />
        <TableColumnSchemaList
          baseTableEntryDatum={currentTableEntry?.[1].base}
          singleOnly
        />
      </Grid>
    </>
  );
}
