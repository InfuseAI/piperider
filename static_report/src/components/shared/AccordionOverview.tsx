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
} from '@chakra-ui/react';
import { InfoOutlineIcon } from '@chakra-ui/icons';
import {
  FiCornerDownRight,
  FiAlertCircle,
  FiCheck,
  FiX,
  FiChevronRight,
} from 'react-icons/fi';
import { nanoid } from 'nanoid';

import { SRBarChart } from '../SingleReport/SRBarChart';
import { zReport, ZTableSchema } from '../../types';
import { getReportAggregateAssertions } from '../../utils/assertion';
import { formatColumnValueWith, formatNumber } from '../../utils/formatters';
import { getColumnTypeChartData } from '../../utils/transformers';
import {
  type SingleReportSchema,
  type AssertionTest,
} from '../../sdlc/single-report-schema';

export function AccordionOverview({
  tables,
}: Pick<SingleReportSchema, 'tables'>) {
  return (
    <Flex direction="column" width="900px">
      <Grid templateColumns="1fr 2fr 1fr" px={4} my={6}>
        <Text width="100px">Name</Text>
        <Text width="">Summary</Text>
        <Text>Assertions</Text>
      </Grid>

      <Flex direction="column" gap={8}>
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
            <Accordion key={nanoid()} allowToggle>
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
                              <InfoOutlineIcon color="piperider.500" />
                              <Text mx={1}>{report.name}</Text>
                              <InfoOutlineIcon ml={1} />
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
                                    <ColumnLabel key={name} name={name} />
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

                          return (
                            <Grid
                              key={colName}
                              templateColumns="218px 1.1fr 1fr 20px"
                              alignItems="center"
                            >
                              <GridItem>
                                <Flex alignItems="center">
                                  <Icon
                                    as={FiCornerDownRight}
                                    color="gray.300"
                                    boxSize={5}
                                  />
                                  <Icon
                                    as={FiAlertCircle}
                                    color="piperider.500"
                                    mx={2}
                                    boxSize={5}
                                  />
                                  <Text noOfLines={1}>{colName}</Text>
                                </Flex>
                              </GridItem>

                              {/* TODO: profiling chart */}
                              <GridItem>
                                {chartData ? (
                                  <Flex width="400px" mx={4}>
                                    <SRBarChart
                                      data={chartData}
                                      height="60px"
                                    />
                                  </Flex>
                                ) : (
                                  'No data avaliable'
                                )}
                              </GridItem>

                              <GridItem>
                                {!colAssertions ? (
                                  <Text color="gray.500">no assertions</Text>
                                ) : (
                                  <SRAssertionsSummaryLabel
                                    assertions={colAssertions}
                                  />
                                )}
                              </GridItem>

                              <GridItem>
                                <Icon
                                  as={FiChevronRight}
                                  color="piperider.500"
                                  boxSize={6}
                                />
                              </GridItem>
                            </Grid>
                          );
                        })}
                      </Stack>
                    </AccordionPanel>
                  </>
                )}
              </AccordionItem>
            </Accordion>
          );
        })}
      </Flex>
    </Flex>
  );
}

function ColumnLabel({
  name,
  visibleIcon = true,
}: {
  visibleIcon?: boolean;
  name: string;
}) {
  return (
    <Flex borderRadius="md" bgColor="gray.100" py={0.5} px={1}>
      <Center>
        {visibleIcon && <InfoOutlineIcon color="piperider.500" mr={1} />}
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
