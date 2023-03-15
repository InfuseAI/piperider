import {
  Box,
  Divider,
  Flex,
  Grid,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  VStack,
} from '@chakra-ui/react';

import type { ComparisonReportSchema } from '../types';
import { NoData } from '../components/Common/NoData';
import { TableColumnHeader } from '../components/Tables/TableColumnHeader';
import { useReportStore } from '../utils/store';
import { useTrackOnMount } from '../hooks';
import { EVENTS, CR_TYPE_LABEL } from '../utils';
import { useRoute } from 'wouter';
import { TABLE_DETAILS_ROUTE_PATH } from '../utils/routes';
import { NO_VALUE } from '../components/Columns/constants';
import { TableGeneralStats } from '../components/Tables/TableMetrics/TableGeneralStats';
import { DupedTableRowsWidget } from '../components/Widgets/DupedTableRowsWidget';

export default function CRTableDetailPage() {
  const [, params] = useRoute(TABLE_DETAILS_ROUTE_PATH);
  const tableName = decodeURIComponent(params?.tableName || '');

  useTrackOnMount({
    eventName: EVENTS.PAGE_VIEW,
    eventProperties: {
      type: CR_TYPE_LABEL,
      page: 'table-details-page',
    },
  });

  const { tableColumnsOnly = [], rawData } = useReportStore.getState();
  const {
    base: { tables: baseTables },
    input: { tables: targetTables },
  } = rawData as ComparisonReportSchema;
  const currentTableEntry = tableColumnsOnly.find(
    ([tableKey]) => tableKey === tableName,
  );

  if (!tableName || !baseTables || !targetTables || !currentTableEntry) {
    return <NoData text={`No profile data found for table '${tableName}'`} />;
  }

  const baseDataTable = baseTables[tableName];
  const targetDataTable = targetTables[tableName];

  return (
    <Box>
      <TableColumnHeader
        title={tableName}
        subtitle={'Table'}
        mb={5}
        infoTip={(targetDataTable || baseDataTable)?.description}
      />

      <ComparableGridHeader />

      <VStack spacing={10}>
        <Box width="100%">
          <Text fontSize={'xl'}>Table Statistics</Text>
          <Divider my={1} />
          <Grid templateColumns={'1fr 1px 1fr'} gap={3}>
            <TableGeneralStats tableDatum={baseDataTable} />
            <Divider orientation="vertical" />
            <TableGeneralStats tableDatum={targetDataTable} />
          </Grid>
        </Box>
        <Box width="100%">
          <TableColumnSchemaCompList tableEntry={currentTableEntry} />
        </Box>
        <Box width="100%">
          <Text fontSize={'xl'}>Duplicate Rows</Text>
          <Divider my={1} />
          <Grid templateColumns={'1fr 1px 1fr'} gap={3}>
            <DupedTableRowsWidget tableDatum={baseDataTable} />
            <Divider orientation="vertical" />
            <DupedTableRowsWidget tableDatum={targetDataTable} />
          </Grid>
        </Box>
      </VStack>
    </Box>
  );
}

function ComparableGridHeader() {
  return (
    <Grid templateColumns={'1fr 1px 1fr'} gap={3} mb={10}>
      <Flex alignItems={'center'} w={'100%'}>
        <Text
          fontWeight={'semibold'}
          fontSize={'2xl'}
          color={'gray.400'}
          w={'100%'}
        >
          Base
        </Text>
      </Flex>
      <Divider />
      <Flex alignItems={'center'} w={'100%'}>
        <Text
          fontWeight={'semibold'}
          fontSize={'2xl'}
          color={'gray.400'}
          w={'100%'}
        >
          Target
        </Text>
      </Flex>
    </Grid>
  );
}

function TableColumnSchemaCompList({ tableEntry }) {
  const [, { base: baseTableColEntry, target: targetTableColEntry }] =
    tableEntry;
  const fallbackTable = targetTableColEntry || baseTableColEntry;

  return (
    <Box>
      <Text fontSize={'xl'}>Schema</Text>
      <Divider my={1} />

      <Flex direction="column" width="100%">
        <TableContainer width="100%">
          <Table variant="simple">
            <Thead>
              <Tr>
                <Th width="25%">Base Column</Th>
                <Th width="25%" borderRight="1px" borderRightColor="gray.200">
                  Base Type
                </Th>
                <Th width="25%">Traget Column</Th>
                <Th width="25%">Target Type</Th>
              </Tr>
            </Thead>
            <Tbody>
              {fallbackTable?.columns.map(
                ([
                  key,
                  { base: baseColumn, target: targetColumn },
                  metadata,
                ]) => {
                  return (
                    <Tr
                      key={key}
                      _hover={{
                        bg: 'blackAlpha.50',
                        cursor: 'inherit',
                      }}
                      data-cy="table-list-schema-item"
                    >
                      <Td
                        color={metadata?.mismatched ? 'red.500' : 'inherit'}
                        maxW={'350px'}
                      >
                        <Text
                          as="span"
                          fontSize={'xs'}
                          noOfLines={1}
                          whiteSpace="normal"
                          title={baseColumn?.name ?? NO_VALUE}
                        >
                          {baseColumn?.name ?? NO_VALUE}
                        </Text>
                      </Td>
                      <Td
                        color={metadata?.mismatched ? 'red.500' : 'inherit'}
                        borderRight="1px"
                        borderRightColor="gray.200"
                      >
                        <Text as={'span'} fontSize={'xs'}>
                          {baseColumn?.schema_type ?? NO_VALUE}
                        </Text>
                      </Td>

                      <Td
                        color={metadata?.mismatched ? 'red.500' : 'inherit'}
                        whiteSpace="normal"
                      >
                        <Text
                          fontSize={'xs'}
                          as="span"
                          noOfLines={1}
                          whiteSpace={'normal'}
                          title={targetColumn?.name ?? NO_VALUE}
                        >
                          {targetColumn?.name ?? NO_VALUE}
                        </Text>
                      </Td>
                      <Td color={metadata?.mismatched ? 'red.500' : 'inherit'}>
                        <Text as={'span'} fontSize={'xs'}>
                          {targetColumn?.schema_type ?? NO_VALUE}
                        </Text>
                      </Td>
                    </Tr>
                  );
                },
              )}
            </Tbody>
          </Table>
        </TableContainer>
      </Flex>
    </Box>
  );
}
