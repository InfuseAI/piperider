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
  FiArrowUpCircle,
  FiArrowDownCircle,
} from 'react-icons/fi';
import { Link } from 'wouter';
import { nanoid } from 'nanoid';
import isString from 'lodash/isString';
import partial from 'lodash/partial';
import { useEffect, useState } from 'react';

import { CRBarChart } from './CRBarChart';
import { SRBarChart, type BarChartDatum } from '../SingleReport/SRBarChart';
import { CRTabSchemaDetails } from './CRTabSchemaDetails';
import { getComparisonAssertions } from '../../utils/assertion';
import {
  getIconForColumnType,
  getColumnTypeChartData,
  transformAsNestedBaseTargetRecord,
  transformCRStringDateHistograms,
  CRHistogramDatum,
} from '../../utils/transformers';
import {
  ComparisonReportSchema,
  zReport,
  ZSingleSchema,
  ZComparisonTableSchema,
} from '../../types';
import type {
  AssertionTest,
  SingleReportSchema,
  TableSchema,
  ColumnSchema,
} from '../../sdlc/single-report-schema';
import type { ToggleListView } from '../shared/ToggleList';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { CR_LIST_VIEW } from '../../utils/localStorageKeys';

export function CRListOverview({ data }: { data: ComparisonReportSchema }) {
  const { base, input: target } = data;
  const tables = transformAsNestedBaseTargetRecord<
    SingleReportSchema['tables'],
    TableSchema
  >(base.tables, target.tables);

  const [view] = useLocalStorage<ToggleListView>(CR_LIST_VIEW, 'summary');

  zReport(ZSingleSchema.safeParse(base));
  zReport(ZSingleSchema.safeParse(target));

  return (
    <Flex direction="column" width="900px" minHeight="650px">
      <Grid templateColumns="218px 2fr 1.5fr" px={4} my={6}>
        <Text width="100px">Name</Text>
        <Text width="">Summary</Text>
        <Text>Assertions</Text>
      </Grid>

      <Accordion allowToggle>
        {Object.keys(tables).map((key) => {
          const table = tables[key];
          ZComparisonTableSchema(false).safeParse(table);

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
                        maxH={isExpanded ? '135px' : '90px'}
                      >
                        <Grid
                          templateColumns="218px 2fr 1.5fr 2.8rem"
                          justifyItems="flex-start"
                          width="calc(900px - 30px)"
                        >
                          <GridItem>
                            <Center>
                              <Icon as={FiGrid} color="piperider.500" />
                              <Text mx={1}>{table.target.name}</Text>

                              {!isExpanded && (
                                <Tooltip
                                  label={table.target.description}
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
                              <CRRowsSummary
                                base={table.base.row_count || 0}
                                target={table.target.row_count || 0}
                              />
                            </Flex>
                          </GridItem>
                          <GridItem>
                            <CRAssertions data={data} reportName={key} />
                          </GridItem>
                          <GridItem>
                            {isExpanded && (
                              <Link key={nanoid()} href={`/tables/${key}`}>
                                <Flex as="a">
                                  <Icon
                                    as={FiChevronRight}
                                    color="piperider.500"
                                    boxSize={6}
                                  />
                                </Flex>
                              </Link>
                            )}
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
                                  title={table.target.description}
                                >
                                  {table.target.description}
                                </Text>
                              </Text>
                            ) : (
                              <Flex
                                mr="30px"
                                color="gray.500"
                                maxWidth="650px"
                                gap={1}
                              >
                                <Text as="span" mr={4}>
                                  Columns
                                </Text>
                                <CRColumnsSummary
                                  base={table.base.col_count || 0}
                                  target={table.target.col_count || 0}
                                />
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
                            table.base.piperider_assertion_result?.columns ||
                              {},
                          ).map((colName) => {
                            const mergedBaseColAssertions = [
                              ...(table.base.piperider_assertion_result
                                ?.columns?.[colName] || []),
                              ...(table.base.dbt_assertion_result?.columns?.[
                                colName
                              ] || []),
                            ];

                            const mergedTargetColAssertions = [
                              ...(table.target.piperider_assertion_result
                                ?.columns?.[colName] || []),
                              ...(table.target.dbt_assertion_result?.columns?.[
                                colName
                              ] || []),
                            ];

                            const { icon: colIcon } = getIconForColumnType(
                              table.target.columns[colName],
                            );

                            const transformedData =
                              transformAsNestedBaseTargetRecord<
                                TableSchema['columns'],
                                ColumnSchema
                              >(table.base?.columns, table.target?.columns);

                            return (
                              <ColumnDetail
                                key={colName}
                                name={colName}
                                icon={colIcon}
                                data={transformedData[colName]}
                                baseColAssertions={mergedBaseColAssertions}
                                targetColAssertions={mergedTargetColAssertions}
                              />
                            );
                          })}
                        </Stack>
                      ) : (
                        <CRTabSchemaDetails
                          visibleDetail
                          base={table.base}
                          target={table.target}
                        />
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

const getAssertionValue = partial((value: string | number) =>
  isString(value) ? 0 : value,
);

function CRAssertions({
  data,
  reportName,
}: {
  data: ComparisonReportSchema;
  reportName: string;
}) {
  const [baseOverview, targetOverview] = getComparisonAssertions({
    data,
    reportName,
    type: 'piperider',
  });
  const [dbtBaseOverview, dbtTargetOverview] = getComparisonAssertions({
    data,
    reportName,
    type: 'dbt',
  });

  const baseOverviewAssertions =
    baseOverview.tests.length + dbtBaseOverview.tests.length;
  const baseOverviewFailed = getAssertionValue(baseOverview.failed);
  const dbtBaseOverviewFailed = getAssertionValue(dbtBaseOverview.failed);
  const baseFailed = baseOverviewFailed + dbtBaseOverviewFailed;

  const targetOverviewAssertions =
    targetOverview.tests.length + dbtTargetOverview.tests.length;
  const targetOverviewFailed = getAssertionValue(targetOverview.failed);
  const dbtTargetOverviewFailed = getAssertionValue(dbtTargetOverview.failed);
  const targetFailed = targetOverviewFailed + dbtTargetOverviewFailed;

  return (
    <Flex gap={2} color="gray.500">
      {/* base assertions */}
      <Flex gap={1} alignItems="center">
        <CRBaseAssertion total={baseOverviewAssertions} failed={baseFailed} />
        <Text as="span">/</Text>
        <Text as="span">{baseOverviewAssertions} total</Text>
      </Flex>

      <Text as="span">{' -> '}</Text>

      {/* target assertions */}
      <Flex gap={1} alignItems="center">
        <CRTargetAssertion
          total={targetOverviewAssertions}
          failed={targetFailed}
          failedDifference={targetFailed - baseFailed}
        />
        <Text as="span">/</Text>
        <CRTargetAssertionsDifference
          base={baseOverviewAssertions}
          target={targetOverviewAssertions}
        />
      </Flex>
    </Flex>
  );
}

function CRBaseAssertion({ total, failed }: { total: number; failed: number }) {
  if (total === 0) {
    return (
      <Text as="span" color="gray.500">
        none
      </Text>
    );
  }

  if (total > 0 && failed === 0) {
    return (
      <Text as="span" color="#2CAA00">
        All Passed
      </Text>
    );
  }

  return (
    <Text as="span" color="#F60059">
      {failed} failures
    </Text>
  );
}

function CRTargetAssertion({
  total,
  failed,
  failedDifference,
}: {
  total: number;
  failed: number;
  failedDifference: number;
}) {
  if (total === 0) {
    return (
      <Text as="span" color="gray.500">
        none
      </Text>
    );
  }

  if (failedDifference < 0) {
    return (
      <Center gap={1} color="#F60059">
        <Icon as={FiArrowDownCircle} boxSize={4} />
        <Text as="span">{Math.abs(failedDifference)}</Text>
      </Center>
    );
  } else if (failedDifference > 0) {
    return (
      <Center gap={1} color="#F60059">
        <Icon as={FiArrowUpCircle} boxSize={4} />
        <Text as="span">{failedDifference}</Text>
      </Center>
    );
  }

  // When `failedDifference = 0`, check `failed` number if is `0` then rendering `total`
  return <Text as="span">{failed === 0 ? total : failed}</Text>;
}

function CRTargetAssertionsDifference({
  base,
  target,
}: {
  base: number;
  target: number;
}) {
  const difference = target - base;
  const isGreaterThanZero = difference > 0;

  if (target === 0) {
    return <Text as="span">none</Text>;
  }

  return (
    <Center gap={1}>
      {difference !== 0 ? (
        <Icon
          as={isGreaterThanZero ? FiArrowUpCircle : FiArrowDownCircle}
          color="black"
          boxSize={4}
        />
      ) : null}
      <Text as="span" color={isGreaterThanZero ? 'black' : 'inherit'}>
        {difference === 0 && target}
        {difference < 0 && target}
        {difference > 0 && target}
      </Text>
    </Center>
  );
}

function CRRowsSummary({ base, target }: { base: number; target: number }) {
  if (base === target) {
    return (
      <Flex alignItems="center" gap={1}>
        <Text as="span">{base}</Text>
        <Text as="span">{'->'}</Text>
        <Text as="span">{target}</Text>
      </Flex>
    );
  }

  return (
    <Flex gap={1} color="black">
      <Text as="span">{base}</Text>
      <Text as="span">{'->'}</Text>
      <Flex alignItems="center">
        <Icon
          as={base < target ? FiArrowUpCircle : FiArrowDownCircle}
          mr={1}
          boxSize={5}
        />
        <Text as="span">{target}</Text>
      </Flex>
    </Flex>
  );
}

function CRColumnsSummary({ base, target }: { base: number; target: number }) {
  if (base === target) {
    return (
      <>
        <Text as="span">{base}</Text>
        <Text as="span">{'->'}</Text>
        <Text as="span">{target}</Text>
      </>
    );
  }

  return (
    <>
      <Text as="span">{base}</Text>
      <Text as="span">{'->'}</Text>
      <Icon
        as={base < target ? FiArrowUpCircle : FiArrowDownCircle}
        ml={2}
        mr={1}
        boxSize={5}
      />
      <Text as="span">{target}</Text>
    </>
  );
}

function ColumnDetail({
  name,
  icon,
  baseColAssertions,
  targetColAssertions,
  data,
}: {
  name: string;
  icon: any;
  baseColAssertions: AssertionTest[];
  targetColAssertions: AssertionTest[];
  data: {
    base: ColumnSchema;
    target: ColumnSchema;
  };
}) {
  const baseAssertions = getAssertions(baseColAssertions);
  const targetAssertions = getAssertions(targetColAssertions);

  return (
    <Grid
      key={name}
      templateColumns="205px 2.3fr 1.5fr 2rem"
      alignItems="center"
      p={3}
      _hover={{ bgColor: 'gray.50', cursor: 'pointer' }}
    >
      <GridItem>
        <Flex alignItems="center">
          <Icon as={FiCornerDownRight} color="gray.300" boxSize={5} />
          <Icon as={icon} color="piperider.500" mx={2} boxSize={5} />
          <Text noOfLines={1} mr={1}>
            {name}
          </Text>
        </Flex>
      </GridItem>

      <GridItem>
        <CRColumChart base={data.base} target={data.target} />
      </GridItem>

      <GridItem>
        {baseAssertions.total > 0 && targetAssertions.total > 0 ? (
          <Flex gap={2} color="gray.500" alignItems="center">
            <CRAssertionsBaseSummary {...baseAssertions} />
            <Text as="span">{' -> '}</Text>
            <CRAssertionsTargetSummary
              {...targetAssertions}
              baseAssertionsFailed={baseAssertions.failed}
              assertionsDiff={targetAssertions.total - baseAssertions.total}
            />
          </Flex>
        ) : (
          <Text color="gray.500">no assertions</Text>
        )}
      </GridItem>

      <GridItem>
        <Flex alignItems="center">
          <Icon as={FiChevronRight} color="piperider.500" boxSize={6} />
        </Flex>
      </GridItem>
    </Grid>
  );
}

type AssertionsReturn = {
  total: number;
  passed: number;
  failed: number;
};

function getAssertions(assertions: AssertionTest[]): AssertionsReturn {
  const total = assertions.length;
  const failed = assertions.reduce((acc, test) => {
    if (test.status === 'failed') {
      acc++;
    }
    return acc;
  }, 0);
  const passed = total - failed;

  return {
    total,
    passed,
    failed,
  };
}

function CRAssertionsBaseSummary({ total, failed }: AssertionsReturn) {
  const isPassed = failed === 0;

  return (
    <Flex gap={1} alignItems="center">
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

function CRAssertionsTargetSummary({
  total,
  failed,
  baseAssertionsFailed,
  assertionsDiff,
}: AssertionsReturn & {
  baseAssertionsFailed: number;
  assertionsDiff: number;
}) {
  const isFailedEqual = failed === baseAssertionsFailed;
  const isMoreFailed = failed - baseAssertionsFailed > 0;
  const isPassed = failed === 0;

  if (total === 0) {
    return (
      <Center>
        {assertionsDiff !== 0 && (
          <Icon as={FiArrowDownCircle} color="black" boxSize={5} />
        )}
        <Text as="span" color="black">
          none
        </Text>
      </Center>
    );
  }

  return (
    <Flex gap={1} alignItems="center">
      <Flex
        alignItems="center"
        borderRadius="md"
        bgColor={isPassed ? '#DEFFEB' : '#FFE8F0'}
        color={isPassed ? '#1F7600' : '#F60059'}
        py={0.5}
        px={1.5}
        gap={1}
      >
        <Icon
          boxSize={5}
          as={
            isPassed
              ? FiCheck
              : isFailedEqual
              ? FiX
              : isMoreFailed
              ? FiArrowUpCircle
              : FiArrowDownCircle
          }
        />
        <Text as="span">{isPassed ? 'All' : failed}</Text>
      </Flex>
      <Text as="span" color="gray.500">
        of
      </Text>
      <Center gap={1}>
        {assertionsDiff !== 0 && (
          <Icon
            as={assertionsDiff > 0 ? FiArrowUpCircle : FiArrowDownCircle}
            color="black"
            boxSize={5}
          />
        )}
        <Text as="span" color={assertionsDiff > 0 ? 'black' : 'inherit'}>
          {total}
        </Text>
      </Center>
    </Flex>
  );
}

function CRColumChart({
  base,
  target,
}: {
  base: ColumnSchema;
  target: ColumnSchema;
}) {
  const [combinedData, setCombinedData] = useState<CRHistogramDatum[] | null>(
    null,
  );
  const [splitData, setSplitData] = useState<
    (BarChartDatum[] | null | undefined)[]
  >([]);

  useEffect(() => {
    const isSameGenericType = base?.type === target?.type;
    const isStringOrDatetime =
      base?.type === 'string' || base?.type === 'datetime';

    // Determine combined data histograms
    if (isSameGenericType && isStringOrDatetime) {
      const transformResult = transformCRStringDateHistograms({
        base: base?.histogram,
        target: target?.histogram,
      });

      setCombinedData(transformResult);
    } else {
      // Determine split data histograms
      const transformBaseResult = getColumnTypeChartData(base);
      const transformTargetResult = getColumnTypeChartData(target);

      // Needs to show mismatched columns (null | undefined)
      setSplitData([transformBaseResult, transformTargetResult]);
    }
  }, [base, target]);

  return (
    <Grid
      my={2}
      templateColumns={`1fr ${combinedData ? '' : '1fr'}`}
      gap={combinedData ? 0 : 12}
    >
      {combinedData ? (
        <CRBarChart data={combinedData} height="80px" xTicks={3} yTicks={3} />
      ) : combinedData ? (
        <NoData />
      ) : null}
      {splitData[0] ? (
        <SRBarChart data={splitData[0]} xTicks={3} yTicks={3} height="80px" />
      ) : combinedData ? null : (
        <NoData />
      )}
      {splitData[1] ? (
        <SRBarChart data={splitData[1]} xTicks={3} yTicks={3} height="80px" />
      ) : combinedData ? null : (
        <NoData />
      )}
    </Grid>
  );
}

function NoData() {
  return (
    <Flex alignItems="center" justifyContent="center" color="gray.500">
      No data available
    </Flex>
  );
}
