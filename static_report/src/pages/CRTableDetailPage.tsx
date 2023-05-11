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

import { NoData } from '../components/Common/NoData';
import { TableColumnHeader } from '../components/Tables/TableColumnHeader';
import { useReportStore } from '../utils/store';
import { useTrackOnMount } from '../hooks';
import { EVENTS, CR_TYPE_LABEL } from '../utils';
import { useTableRoute } from '../utils/routes';
import { NO_VALUE } from '../components/Columns/constants';
import { TableGeneralStats } from '../components/Tables/TableMetrics/TableGeneralStats';
import { DupedTableRowsWidget } from '../components/Widgets/DupedTableRowsWidget';

export default function CRTableDetailPage() {
  let { tableName, uniqueId } = useTableRoute();
  tableName = decodeURIComponent(tableName || '');

  useTrackOnMount({
    eventName: EVENTS.PAGE_VIEW,
    eventProperties: {
      type: CR_TYPE_LABEL,
      page: 'table-details-page',
    },
  });

  const { tableColumnsOnly = [] } = useReportStore.getState();
  const nodeKey = uniqueId ? uniqueId : `table.${tableName}`;

  const currentTableEntry = tableColumnsOnly.find(([key]) => key === nodeKey);
  if (!currentTableEntry) {
    return <NoData text={`No data found for table '${nodeKey}'`} />;
  }

  const [, { base, target }] = currentTableEntry;

  const baseDataTable = base?.__table;
  const targetDataTable = target?.__table;

  function SeparateView({
    title,
    Comp,
  }: {
    title: string;
    Comp: React.FC<{ tableDatum: any }>;
  }) {
    if (baseDataTable === undefined) {
      return (
        <Box width="100%">
          <Text fontSize={'xl'}>{title}</Text>
          <Divider my={1} />
          <Comp tableDatum={targetDataTable} />
        </Box>
      );
    } else if (targetDataTable === undefined) {
      return (
        <Box width="100%">
          <Text fontSize={'xl'}>{title}</Text>
          <Divider my={1} />
          <Comp tableDatum={baseDataTable} />
        </Box>
      );
    } else {
      return (
        <Box width="100%">
          <Grid templateColumns={'1fr 1px 1fr'} gap={3}>
            <Text fontSize={'xl'}>{title}</Text>
            <Divider orientation="vertical" />
            <Text fontSize={'xl'}>{title}</Text>
          </Grid>
          <Divider my={1} />
          <Grid templateColumns={'1fr 1px 1fr'} gap={3}>
            <Comp tableDatum={baseDataTable} />
            <Divider orientation="vertical" />
            <Comp tableDatum={targetDataTable} />
          </Grid>
        </Box>
      );
    }
  }

  function MergedView({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) {
    function Title() {
      if (baseDataTable === undefined || targetDataTable === undefined) {
        return <Text fontSize={'xl'}>{title}</Text>;
      } else {
        return (
          <Grid templateColumns={'1fr 1px 1fr'} gap={3}>
            <Text fontSize={'xl'}>{title}</Text>
            <Divider orientation="vertical" />
            <Text fontSize={'xl'}>{title}</Text>
          </Grid>
        );
      }
    }

    return (
      <Box width="100%">
        <Title />
        <Divider my={1} />
        {children}
      </Box>
    );
  }

  function ComparisonContent({ children }: { children: React.ReactNode }) {
    function EmptyBox() {
      return (
        <Box
          bg="gray.100"
          width="100%"
          height="100%"
          borderWidth="2px"
          borderColor="lightgray"
        />
      );
    }
    if (baseDataTable === undefined) {
      return (
        <Grid templateColumns={'1fr 1px 1fr'} gap={3}>
          <EmptyBox />
          <Divider orientation="vertical" />
          {children}
        </Grid>
      );
    } else if (targetDataTable === undefined) {
      return (
        <Grid templateColumns={'1fr 1px 1fr'} gap={3}>
          {children}
          <Divider orientation="vertical" />
          <EmptyBox />
        </Grid>
      );
    } else {
      return <>{children}</>;
    }
  }

  return (
    <Box>
      <TableColumnHeader
        title={(targetDataTable || baseDataTable)?.name}
        subtitle={'Table'}
        mb={5}
        infoTip={(targetDataTable || baseDataTable)?.description}
      />

      <ComparableGridHeader />
      <ComparisonContent>
        <VStack spacing={10}>
          <SeparateView title="Table Statistics" Comp={TableGeneralStats} />
          <MergedView title="Schema">
            <TableColumnSchemaCompList tableEntry={currentTableEntry} />
          </MergedView>
          <SeparateView title="Duplicate Rows" Comp={DupedTableRowsWidget} />
        </VStack>
      </ComparisonContent>
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

  const MergedSchema = () => (
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
            {fallbackTable?.__columns.map(
              ([key, { base: baseColumn, target: targetColumn }, metadata]) => {
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
  );

  const OneSideSchema = () => (
    <Flex direction="column" width="100%">
      <TableContainer width="100%">
        <Table variant="simple">
          <Thead>
            <Tr>
              <Th width="50%">Column</Th>
              <Th width="50%">Type</Th>
            </Tr>
          </Thead>
          <Tbody>
            {fallbackTable?.__columns.map(
              ([key, { base: baseColumn, target: targetColumn }, metadata]) => {
                const column = baseColumn || targetColumn;
                return (
                  <Tr
                    key={key}
                    _hover={{
                      bg: 'blackAlpha.50',
                      cursor: 'inherit',
                    }}
                    data-cy="table-list-schema-item"
                  >
                    <Td maxW={'350px'}>
                      <Text
                        as="span"
                        fontSize={'xs'}
                        noOfLines={1}
                        whiteSpace="normal"
                        title={column?.name ?? NO_VALUE}
                      >
                        {column?.name ?? NO_VALUE}
                      </Text>
                    </Td>
                    <Td>
                      <Text as={'span'} fontSize={'xs'}>
                        {column?.schema_type ?? NO_VALUE}
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
  );

  if (
    baseTableColEntry?.name === undefined ||
    targetTableColEntry?.name === undefined
  ) {
    return <OneSideSchema />;
  } else {
    return <MergedSchema />;
  }
}
