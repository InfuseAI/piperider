import { Text, Divider, Grid, VStack, Box } from '@chakra-ui/react';

import { NoData } from '../components/Common/NoData';
import {
  EVENTS,
  DupedTableRowsWidget,
  SR_TYPE_LABEL,
  TableColumnSchemaList,
  TableGeneralStats,
  useTrackOnMount,
} from '../lib';
import { TableColumnHeader } from '../components/Tables/TableColumnHeader';
import { useReportStore } from '../utils/store';
import { useTableRoute } from '../utils/routes';

export default function SRTableDetailPage() {
  let { tableName, uniqueId } = useTableRoute();
  useTrackOnMount({
    eventName: EVENTS.PAGE_VIEW,
    eventProperties: {
      type: SR_TYPE_LABEL,
      page: 'table-details-page',
    },
  });

  const { tableColumnsOnly = [] } = useReportStore.getState();

  const tableKey = tableName || uniqueId;
  if (tableKey === undefined) {
    return <NoData text={`No data found for '${tableKey}'`} />;
  }

  const nodeKey = uniqueId ? uniqueId : `table.${tableName}`;
  const currentTableEntry = tableColumnsOnly.find(([key]) => key === nodeKey);
  if (!currentTableEntry) {
    return <NoData text={`No data found for '${tableKey}'`} />;
  }

  const [, { base: data }, { columns }] = currentTableEntry;
  const name = data?.name;
  const description = data?.description || undefined;

  const dataTable = data?.__table;
  if (dataTable === undefined) {
    return (
      <>
        <TableColumnHeader
          title={name}
          subtitle={'Table'}
          infoTip={description}
          mb={5}
        />
        <NoData
          text={`No schema data found. The table or view may not be available in the data source.`}
        />
      </>
    );
  }

  return (
    <>
      <TableColumnHeader
        title={name}
        subtitle={'Table'}
        infoTip={description}
        mb={5}
      />
      <Grid
        width={'100%'}
        templateColumns={{ base: '1fr', '2xl': '1fr 1px 1fr' }}
        gap={5}
      >
        <VStack spacing={10}>
          <Box width="100%">
            <Text fontSize={'xl'}>Table Statistics</Text>
            <Divider my={1} />
            <TableGeneralStats tableDatum={dataTable} />
          </Box>
          <Box width="100%">
            <Text fontSize={'xl'}>Duplicate Rows</Text>
            <Divider my={1} />
            <DupedTableRowsWidget tableDatum={dataTable} />
          </Box>
        </VStack>

        <Divider orientation="vertical" />
        <TableColumnSchemaList columns={columns} singleOnly />
      </Grid>
    </>
  );
}
