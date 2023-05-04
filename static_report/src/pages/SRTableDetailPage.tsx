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
import { useRoute } from 'wouter';
import {
  MODEL_DETAILS_ROUTE_PATH,
  SEED_DETAILS_ROUTE_PATH,
  SOURCE_DETAILS_ROUTE_PATH,
  TABLE_DETAILS_ROUTE_PATH,
} from '../utils/routes';
import { DbtManifestSchema, ModelNode } from '../sdlc/dbt-manifest-schema';
import { findNodeByUniqueID } from '../utils/dbt';

function useTableRoute(): {
  readonly tableName?: string;
  readonly uniqueId?: string;
  readonly columnName?: string;
} {
  const [matchTable, paramsTable] = useRoute(TABLE_DETAILS_ROUTE_PATH);
  const [matchModel, paramsModel] = useRoute(MODEL_DETAILS_ROUTE_PATH);
  const [matchSource, paramsSource] = useRoute(SOURCE_DETAILS_ROUTE_PATH);
  const [matchSeed, paramsSeed] = useRoute(SEED_DETAILS_ROUTE_PATH);

  if (matchTable) {
    return paramsTable;
  } else if (matchModel) {
    return paramsModel;
  } else if (matchSource) {
    return paramsSource;
  } else if (matchSeed) {
    return paramsSeed;
  } else {
    return {};
  }
}

export default function SRTableDetailPage() {
  let { tableName, uniqueId } = useTableRoute();
  useTrackOnMount({
    eventName: EVENTS.PAGE_VIEW,
    eventProperties: {
      type: SR_TYPE_LABEL,
      page: 'table-details-page',
    },
  });

  const {
    tableColumnsOnly = [],
    rawData: { base: data },
  } = useReportStore.getState();

  // Find the node in the manifest
  let tableKey;
  if (uniqueId) {
    const manifest = data?.dbt?.manifest as DbtManifestSchema;
    const node = findNodeByUniqueID(manifest, uniqueId) as ModelNode;
    if (node) {
      tableKey = node.name;
    }
  } else if (tableName) {
    tableKey = tableName;
  }

  if (!tableKey) {
    return <NoData text={`No data found for '${tableKey}'`} />;
  }

  const dataTable = data?.tables[tableKey];
  const currentTableEntry = tableColumnsOnly.find(([key]) => key === tableKey);

  if (!dataTable || !currentTableEntry) {
    return <NoData text={`No data found for '${tableKey}'`} />;
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
        <TableColumnSchemaList
          baseTableEntryDatum={currentTableEntry?.[1].base}
          singleOnly
        />
      </Grid>
    </>
  );
}
