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
} from '../../sdlc/single-report-schema';

export function SRAccordionOverview({
  tables,
}: Pick<SingleReportSchema, 'tables'>) {
  return (
    <Flex direction="column" width="900px" minHeight="650px">
      <Grid templateColumns="1fr 2fr 1fr" px={4} my={6}>
        <Text width="100px">Name</Text>
        <Text width="">Summary</Text>
        <Text>Assertions</Text>
      </Grid>

      <Accordion allowToggle>
        {Object.keys(tables).map((key) => {
          const report = tables[key];
          zReport(ZTableSchema.safeParse(report));
          const assertions = getReportAggregateAssertions(
            report.piperider_assertion_result,
            report.dbt_assertion_result,
          );
          const totalAssertions = assertions.passed + assertions.failed;
          const hasFailed = assertions.failed > 0;

          const columns = Object.keys(report.columns).map((key) => key);
          const isGreaterThanFiveCols = columns.length > 5;

          return (
            <Flex key={nanoid()}>
              <AccordionItem>
                {({ isExpanded }) => (
                  <>
                    <AccordionButton bgColor="white" borderRadius="md">
                      <Flex direction="column" gap={4} py="10px" height="90px">
                        <Grid
                          templateColumns="1fr 2fr 1fr"
                          justifyItems="flex-start"
                          width="calc(900px - 30px)"
                        >
                          <GridItem>
                            <Center>
                              <Icon as={FiGrid} color="piperider.500" />
                              <Text mx={1}>{report.name}</Text>

                              {!isExpanded && (
                                <Tooltip
                                  label={report.description}
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
                                  report.row_count,
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
                                  bgColor={hasFailed ? 'inherit' : '#DEFFEB'}
                                  py={0.5}
                                  px={1}
                                  borderRadius="md"
                                  color="#1F7600"
                                >
                                  <Icon as={FiCheck} boxSize={4} />
                                  All
                                </Center>
                              )}
                              /{' '}
                              <Text as="span">
                                {totalAssertions === 0
                                  ? 'none'
                                  : `${totalAssertions} assertions`}
                              </Text>
                            </Flex>
                          </GridItem>
                        </Grid>
                        <Grid
                          templateColumns={
                            isExpanded ? '218px 1fr' : '218px 1fr'
                          }
                          justifyItems="flex-start"
                          width="calc(900px - 30px)"
                        >
                          <GridItem>
                            <Flex />
                          </GridItem>
                          <GridItem>
                            {isExpanded ? (
                              <Text color="gray.500" noOfLines={1}>
                                <Text as="span">Description</Text>{' '}
                                <Text
                                  as="span"
                                  ml={4}
                                  title={report.description}
                                >
                                  {report.description}
                                </Text>
                              </Text>
                            ) : (
                              <Flex mr="30px" color="gray.500" maxW="550px">
                                <Text mr={4}>Columns</Text>
                                <Flex gap={3} alignItems="center">
                                  {/* Pick up the top 5 columns */}
                                  {columns.slice(0, 5).map((name) => (
                                    <ColumnLabel
                                      key={name}
                                      name={name}
                                      icon={
                                        getIconForColumnType(
                                          report.columns[name],
                                        ).icon
                                      }
                                    />
                                  ))}
                                  {isGreaterThanFiveCols && (
                                    <ColumnLabel
                                      name={'...'}
                                      visibleIcon={false}
                                    />
                                  )}
                                </Flex>
                              </Flex>
                            )}
                          </GridItem>
                        </Grid>
                      </Flex>
                    </AccordionButton>

                    <AccordionPanel bgColor="white">
                      <Stack gap={8} py={6}>
                        {Object.keys(
                          report.piperider_assertion_result?.columns || {},
                        ).map((colName) => {
                          const colAssertions =
                            report.piperider_assertion_result?.columns?.[
                              colName
                            ];

                          const chartData = getColumnTypeChartData(
                            report.columns[colName],
                          );

                          const { icon: colIcon } = getIconForColumnType(
                            report.columns[colName],
                          );

                          return (
                            <ColumnDetail
                              key={colName}
                              name={colName}
                              colAssertions={colAssertions}
                              chartData={chartData}
                              icon={colIcon}
                            />
                          );
                        })}

                        {Object.keys(
                          report.dbt_assertion_result?.columns || {},
                        ).map((colName) => {
                          const colAssertions =
                            report.dbt_assertion_result?.columns?.[colName];

                          const chartData = getColumnTypeChartData(
                            report.columns[colName],
                          );

                          const { icon: colIcon } = getIconForColumnType(
                            report.columns[colName],
                          );

                          return (
                            <ColumnDetail
                              key={colName}
                              name={colName}
                              colAssertions={colAssertions}
                              chartData={chartData}
                              icon={colIcon}
                            />
                          );
                        })}
                      </Stack>
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
    <Grid key={name} templateColumns="218px 2.2fr 1fr 2rem" alignItems="center">
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
          <Text>No data avaliable</Text>
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
  const fail = assertions.reduce((acc, test) => {
    if (test.status === 'failed') {
      acc++;
    }
    return acc;
  }, 0);
  const isPassed = fail === 0;

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
        <Text as="span">{isPassed ? 'All' : fail}</Text>
      </Flex>
      <Text as="span" color="gray.500">
        of
      </Text>
      <Text as="span">{total}</Text>
    </Flex>
  );
}
