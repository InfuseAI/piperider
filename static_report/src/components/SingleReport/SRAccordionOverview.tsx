import {
  Flex,
  Grid,
  Text,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  GridItem,
  Center,
  Stack,
  Icon,
  Tooltip,
  TableContainer,
  Table,
  Thead,
  Tbody,
  Td,
  Tr,
  Th,
} from '@chakra-ui/react';
import {
  FiCornerDownRight,
  FiAlertCircle,
  FiCheck,
  FiX,
  FiChevronRight,
  FiGrid,
} from 'react-icons/fi';
import { nanoid } from 'nanoid';
import { Link } from 'wouter';

import { SRBarChart, type BarChartDatum } from '../SingleReport/SRBarChart';
import { zReport, ZTableSchema } from '../../types';
import { getReportAggregateAssertions } from '../../utils/assertion';
import { formatColumnValueWith, formatNumber } from '../../utils/formatters';
import {
  getColumnTypeChartData,
  getIconForColumnType,
} from '../../utils/transformers';
import {
  type SingleReportSchema,
  type AssertionTest,
  TableSchema,
} from '../../sdlc/single-report-schema';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { SR_LIST_VIEW } from '../../utils/localStorageKeys';
import { type ToggleListView } from '../shared/ToggleList';

export function SRAccordionOverview({
  tables,
}: Pick<SingleReportSchema, 'tables'>) {
  const [view] = useLocalStorage<ToggleListView>(SR_LIST_VIEW, 'summary');

  return (
    <Flex direction="column" width="900px" minHeight="650px">
      <Grid templateColumns="1fr 2fr 1fr" px={4} my={6}>
        <Text width="100px">Name</Text>
        <Text width="">Summary</Text>
        <Text>Assertions</Text>
      </Grid>

      <Accordion allowToggle>
        {Object.keys(tables).map((key) => {
          const table = tables[key];
          zReport(ZTableSchema.safeParse(table));
          const assertions = getReportAggregateAssertions(
            table.piperider_assertion_result,
            table.dbt_assertion_result,
          );
          const totalAssertions = assertions.passed + assertions.failed;
          const hasFailed = assertions.failed > 0;

          const columns = Object.keys(table.columns).map((key) => key);

          return (
            <Flex key={nanoid()}>
              <AccordionItem>
                {({ isExpanded }) => (
                  <>
                    <AccordionButton bgColor="white" borderRadius="md">
                      <Flex
                        direction="column"
                        gap={4}
                        py="10px"
                        maxHeight={isExpanded ? '135px' : '90px'}
                      >
                        <Grid
                          templateColumns="1fr 2fr 1fr"
                          justifyItems="flex-start"
                          width="calc(900px - 30px)"
                        >
                          <GridItem>
                            <Center>
                              <Icon as={FiGrid} color="piperider.500" />
                              <Text mx={1}>{table.name}</Text>

                              {!isExpanded && (
                                <Tooltip
                                  label={table.description}
                                  placement="right-end"
                                  shouldWrapChildren
                                >
                                  <Icon as={FiAlertCircle} ml={1} />
                                </Tooltip>
                              )}
                            </Center>
                          </GridItem>
                          <GridItem>
                            <Flex gap={10} color="gray.500">
                              <Text>Rows</Text>
                              <Text>
                                {formatColumnValueWith(
                                  table.row_count,
                                  formatNumber,
                                )}
                              </Text>
                            </Flex>
                          </GridItem>
                          <GridItem>
                            <Flex gap={1} alignItems="center">
                              {hasFailed ? (
                                <Text as="span" color="#F60059">
                                  {assertions.failed} fails
                                </Text>
                              ) : (
                                <Center
                                  bgColor="#DEFFEB"
                                  py={0.5}
                                  px={1}
                                  borderRadius="md"
                                  color="#1F7600"
                                >
                                  <Icon as={FiCheck} boxSize={4} />
                                  All
                                </Center>
                              )}
                              <Text as="span" color="gray.500">
                                /
                              </Text>
                              <Text as="span" mr={3}>
                                {totalAssertions === 0
                                  ? 'none'
                                  : `${totalAssertions} assertions`}
                              </Text>
                              {isExpanded && (
                                <Link key={table.name} href={`/tables/${key}`}>
                                  <Flex as="a">
                                    <Icon
                                      as={FiChevronRight}
                                      color="piperider.500"
                                      boxSize={6}
                                    />
                                  </Flex>
                                </Link>
                              )}
                            </Flex>
                          </GridItem>
                        </Grid>
                        <Grid
                          templateColumns="218px 1fr"
                          justifyItems="flex-start"
                          width="calc(900px - 30px)"
                        >
                          <GridItem>
                            <Flex />
                          </GridItem>
                          <GridItem>
                            {isExpanded ? (
                              <Text
                                color="gray.500"
                                noOfLines={3}
                                textAlign="left"
                              >
                                <Text as="span">Description</Text>{' '}
                                <Text
                                  as="span"
                                  ml={4}
                                  title={table.description}
                                >
                                  {table.description}
                                </Text>
                              </Text>
                            ) : (
                              <Flex mr="30px" color="gray.500" maxWidth="650px">
                                <Text
                                  as="span"
                                  minWidth="95px"
                                  maxWidth="205px"
                                  textAlign="left"
                                >
                                  {table.col_count} Columns
                                </Text>
                                <Flex
                                  __css={{
                                    display: 'flex',
                                    gap: 3,
                                    alignItems: 'center',
                                    maxWidth: '100%',
                                    overflowX: 'scroll',
                                    scrollbarWidth: 'none',
                                    '&::-webkit-scrollbar': {
                                      display: 'none',
                                    },
                                  }}
                                >
                                  {columns.map((name) => (
                                    <ColumnLabel
                                      key={name}
                                      name={name}
                                      icon={
                                        getIconForColumnType(
                                          table.columns[name],
                                        ).icon
                                      }
                                    />
                                  ))}
                                </Flex>
                              </Flex>
                            )}
                          </GridItem>
                        </Grid>
                      </Flex>
                    </AccordionButton>

                    <AccordionPanel bgColor="white">
                      {view === 'summary' ? (
                        <Stack gap={6}>
                          {Object.keys(
                            table.piperider_assertion_result?.columns || {},
                          ).map((colName) => {
                            const mergedColAssertions = [
                              ...(table.piperider_assertion_result?.columns?.[
                                colName
                              ] || []),
                              ...(table.dbt_assertion_result?.columns?.[
                                colName
                              ] || []),
                            ];

                            const chartData = getColumnTypeChartData(
                              table.columns[colName],
                            );

                            const { icon: colIcon } = getIconForColumnType(
                              table.columns[colName],
                            );

                            return (
                              <ColumnDetail
                                key={colName}
                                name={colName}
                                colAssertions={mergedColAssertions}
                                chartData={chartData}
                                icon={colIcon}
                              />
                            );
                          })}
                        </Stack>
                      ) : (
                        <SRSchemaDetail table={table} />
                      )}
                    </AccordionPanel>
                  </>
                )}
              </AccordionItem>
            </Flex>
          );
        })}
      </Accordion>
    </Flex>
  );
}

function SRSchemaDetail({ table }: { table: TableSchema }) {
  return (
    <TableContainer>
      <Table variant="simple">
        <Thead>
          <Tr>
            <Th>Column</Th>
            <Th>Type</Th>
            <Th width="5%" />
          </Tr>
        </Thead>
        <Tbody>
          {Object.keys(table.columns).map((colName) => (
            <Tr
              key={nanoid(10)}
              _hover={{ bgColor: 'gray.50', cursor: 'pointer' }}
            >
              <Td>{table.columns[colName]?.name}</Td>
              <Td>{table.columns[colName]?.schema_type}</Td>
              <Td>
                <Icon as={FiChevronRight} color="piperider.500" boxSize={6} />
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </TableContainer>
  );
}

function ColumnDetail({
  name,
  icon,
  chartData,
  colAssertions,
}: {
  name: string;
  icon: any;
  chartData: BarChartDatum[] | undefined;
  colAssertions: AssertionTest[] | undefined;
}) {
  return (
    <Grid
      key={name}
      templateColumns="207px 2.5fr 1fr 2rem"
      alignItems="center"
      p={3}
      _hover={{ bgColor: 'gray.50', cursor: 'pointer' }}
    >
      <GridItem>
        <Flex alignItems="center">
          <Icon as={FiCornerDownRight} color="gray.300" boxSize={5} />
          <Icon as={icon} color="piperider.500" mx={2} boxSize={5} />
          <Text noOfLines={1}>{name}</Text>
        </Flex>
      </GridItem>

      <GridItem>
        {chartData ? (
          <Flex width="400px" mx={4}>
            <SRBarChart data={chartData} height="60px" xTicks={3} yTicks={3} />
          </Flex>
        ) : (
          <Text color="gray.500">No data avaliable</Text>
        )}
      </GridItem>

      <GridItem>
        {!colAssertions ? (
          <Text color="gray.500">no assertions</Text>
        ) : (
          <SRAssertionsSummaryLabel assertions={colAssertions} />
        )}
      </GridItem>

      <GridItem>
        <Icon as={FiChevronRight} color="piperider.500" boxSize={6} />
      </GridItem>
    </Grid>
  );
}

function ColumnLabel({
  name,
  visibleIcon = true,
  icon = FiGrid,
}: {
  visibleIcon?: boolean;
  name: string;
  icon?: any;
}) {
  return (
    <Flex borderRadius="md" bgColor="gray.100" py={0.5} px={1}>
      <Center>
        {visibleIcon && <Icon as={icon} color="piperider.500" mr={1} />}
        <Text as="span" fontSize="sm" color="gray.600">
          {name}
        </Text>
      </Center>
    </Flex>
  );
}

function SRAssertionsSummaryLabel({
  assertions,
}: {
  assertions: AssertionTest[];
}) {
  const total = assertions.length;
  const failed = assertions.reduce((acc, test) => {
    if (test.status === 'failed') {
      acc++;
    }
    return acc;
  }, 0);
  const isPassed = failed === 0;

  return (
    <Flex gap={2} alignItems="center">
      <Flex
        alignItems="center"
        borderRadius="md"
        bgColor={isPassed ? '#DEFFEB' : '#FFE8F0'}
        color={isPassed ? '#1F7600' : '#F60059'}
        py={0.5}
        px={1.5}
      >
        <Icon as={isPassed ? FiCheck : FiX} boxSize={4} />
        <Text as="span">{isPassed ? 'All' : failed}</Text>
      </Flex>
      <Text as="span" color="gray.500">
        of
      </Text>
      <Text as="span">{total}</Text>
    </Flex>
  );
}
