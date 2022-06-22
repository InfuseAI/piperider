import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  Code,
  Divider,
  Flex,
  Grid,
  Heading,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
} from '@chakra-ui/react';
import { Link } from 'wouter';
import { nanoid } from 'nanoid';
import { useEffect, useRef, useState } from 'react';
import groupBy from 'lodash/groupBy';

import { Main } from './Main';
import { MetricsInfo } from './shared/MetrisInfo';
import { getMissingValue, formatNumber } from '../utils';
import {
  drawComparsionChart,
  joinBykey,
  getComparisonTests,
  transformDistribution,
  transformDistributionWithLabels,
} from '../utils/comparisonReport';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

function TestStatus({ status }) {
  switch (status) {
    case 'passed':
      return (
        <Text as="span" role={'img'}>
          ✅
        </Text>
      );
    case 'failed':
      return (
        <Text as="span" role={'img'}>
          ❌
        </Text>
      );
    default:
      return (
        <Text as="span" role={'img'}>
          -
        </Text>
      );
  }
}

function CompareTest({ base = [], input = [] }) {
  // group by "level", "column", "name"
  const groupedTests = groupBy(
    [...base, ...input],
    (test) => `${test.level}_${test.column}_${test.name}`,
  );

  const tests = Object.values(groupedTests).map((groupedTest) => {
    let row = {
      level: groupedTest[0].level,
      column: groupedTest[0].column,
      name: groupedTest[0].name,
    };

    groupedTest.forEach((test) => {
      if (test.from === 'base') {
        row.base = test;
      } else {
        row.input = test;
      }
    });

    return row;
  });

  if (tests.length === 0) {
    return (
      <Flex direction="column">
        <Text textAlign="center">No more tests!</Text>
      </Flex>
    );
  }

  return (
    <TableContainer>
      <Table variant="simple">
        <Thead>
          <Tr>
            <Th>Level</Th>
            <Th>Column</Th>
            <Th>Assertion</Th>
            <Th>Base Status</Th>
            <Th>Input Status</Th>
          </Tr>
        </Thead>
        <Tbody>
          {Object.values(tests).map((test) => {
            return (
              <Tr key={nanoid()}>
                <Td>{test.level}</Td>
                <Td>{test.column}</Td>
                <Td>{test.name}</Td>
                <Td>
                  <TestStatus status={test.base?.status} />
                </Td>
                <Td>
                  <TestStatus status={test.input?.status} />
                </Td>
              </Tr>
            );
          })}
        </Tbody>
      </Table>
    </TableContainer>
  );
}

function CompareSchema({ base, input }) {
  let columns = [];
  let mapIndex = {};
  let i = 0;
  let added = 0;
  let deleted = 0;
  let changed = 0;

  Object.entries(base?.columns || []).forEach(([name, column]) => {
    mapIndex[column.name] = i;
    columns.push({
      name,
      changed: true,
      base: column,
      input: undefined,
    });
    i++;
    deleted++;
  });

  Object.entries(input?.columns || []).forEach(([name, column]) => {
    if (mapIndex.hasOwnProperty(column.name)) {
      const index = mapIndex[column.name];
      const isChanged = columns[index].base.schema_type !== column.schema_type;
      columns[index] = {
        ...columns[index],
        input: column,
        changed: isChanged,
      };
      deleted--;
      if (isChanged) {
        changed++;
      }
    } else {
      columns.push({
        name,
        changed: true,
        base: undefined,
        input: column,
      });
      added++;
    }
  });

  return (
    <Flex direction="column">
      <Text mb={4} p={2}>
        Added:
        <Text as={'span'} fontWeight={700} ml={1}>
          {added}
        </Text>
        , Deleted:
        <Text as={'span'} fontWeight={700} ml={1}>
          {deleted}
        </Text>
        , Changed:{' '}
        <Text as={'span'} fontWeight={700} ml={1}>
          {changed}
        </Text>
      </Text>

      <Flex justifyContent={'space-evenly'}>
        <TableContainer width="50%">
          <Table variant="simple">
            <Thead>
              <Tr>
                <Th>Column</Th>
                <Th>Type</Th>
              </Tr>
            </Thead>
            <Tbody>
              {columns.map((column) => (
                <Tr
                  key={nanoid(10)}
                  color={column.changed ? 'red.500' : 'inherit'}
                >
                  <Td>{column.base?.name ?? '-'}</Td>
                  <Td>{column.base?.schema_type ?? '-'}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </TableContainer>

        <Flex justifyContent={'center'}>
          <Divider orientation={'vertical'} />
        </Flex>

        <TableContainer width="50%">
          <Table variant="simple">
            <Thead>
              <Tr>
                <Th>Column</Th>
                <Th>Value</Th>
              </Tr>
            </Thead>
            <Tbody>
              {columns.map((column) => (
                <Tr
                  key={nanoid(10)}
                  color={column.changed ? 'red.500' : 'inherit'}
                >
                  <Td>{column.input?.name ?? '-'}</Td>
                  <Td>{column.input?.schema_type ?? '-'}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </TableContainer>
      </Flex>
    </Flex>
  );
}

function CompareProfileColumn({ name, base, input }) {
  const column = base ? base : input;
  const [data, setData] = useState([]);

  useEffect(() => {
    if (
      base?.type === input?.type &&
      (base?.type === 'string' || base?.type === 'datetime')
    ) {
      const transformResult = transformDistribution({
        base: base.distribution,
        input: input.distribution,
      });

      setData([transformResult]);
    } else {
      const baseData = base
        ? transformDistributionWithLabels({
            base: base.distribution.counts,
            input: null,
            labels: base.distribution.labels,
          })
        : null;

      const inputData = input
        ? transformDistributionWithLabels({
            base: input.distribution.counts,
            input: null,
            labels: input.distribution.labels,
          })
        : null;

      setData([baseData, inputData]);
    }
  }, [base, input]);

  return (
    <Flex key={name} direction="column">
      <Grid my={4} templateColumns="500px 1fr" gap={3}>
        <Flex direction="column" gap={2} minH="250px">
          <Flex direction="column" gap={3}>
            <Flex justifyContent="space-between">
              <Text>
                <Text
                  as="span"
                  fontWeight={700}
                  color="gray.900"
                  fontSize="lg"
                  mr={1}
                >
                  {column.name}
                </Text>
                {''}(<Code>{column.schema_type}</Code>)
              </Text>

              <Flex gap={8}>
                <Text fontWeight={700} textAlign="right" width="100px">
                  Base
                </Text>
                <Text fontWeight={700} textAlign="right" width="100px">
                  Input
                </Text>
              </Flex>
            </Flex>

            <Flex direction="column">
              <MetricsInfo
                name="Total"
                base={base?.total ? formatNumber(base?.total) : '-'}
                input={input?.total ? formatNumber(input?.total) : '-'}
              />

              <MetricsInfo
                name="Missing"
                base={getMissingValue(base)}
                input={getMissingValue(input)}
              />

              <MetricsInfo
                name="Distinct"
                base={base?.distinct ? formatNumber(base.distinct) : '-'}
                input={input?.distinct ? formatNumber(input.distinct) : '-'}
              />
            </Flex>

            {column.type === 'numeric' && (
              <Flex direction="column">
                <MetricsInfo
                  name="Min"
                  base={base?.min ? formatNumber(base.min) : '-'}
                  input={input?.min ? formatNumber(input.min) : '-'}
                />
                <MetricsInfo
                  name="Max"
                  base={base?.max ? formatNumber(base.max) : '-'}
                  input={input?.max ? formatNumber(input.max) : '-'}
                />
                <MetricsInfo
                  name="Average"
                  base={base?.avg ? formatNumber(base.avg) : '-'}
                  input={input?.avg ? formatNumber(input.avg) : '-'}
                />
              </Flex>
            )}

            {column.type === 'datetime' && (
              <Flex direction="column">
                <MetricsInfo
                  name="Min"
                  base={base?.min ?? '-'}
                  input={input?.min ?? '-'}
                />
                <MetricsInfo
                  name="Max"
                  base={base?.max ?? '-'}
                  input={input?.max ?? '-'}
                />
              </Flex>
            )}
          </Flex>
        </Flex>

        {data.length === 1 && <ComparisonBarChart data={data[0]} />}
        {data.length === 2 && (
          <Grid my={4} templateColumns="1fr 1fr" gap={3}>
            {data[0] ? (
              <ComparisonBarChart data={data[0]} />
            ) : (
              <Flex
                alignItems="center"
                justifyContent="center"
                color="gray.500"
              >
                No data available
              </Flex>
            )}
            {data[1] ? (
              <ComparisonBarChart data={data[1]} />
            ) : (
              <Flex
                alignItems="center"
                justifyContent="center"
                color="gray.500"
              >
                No data available
              </Flex>
            )}
          </Grid>
        )}
      </Grid>
    </Flex>
  );
}

function CompareProfile({ base, input }) {
  const transformedData = joinBykey(base?.columns, input?.columns);

  return Object.entries(transformedData).map(([key, value]) => (
    <CompareProfileColumn
      key={key}
      name={key}
      base={value.base}
      input={value.input}
    />
  ));
}

export default function ComparisonReport({ base, input, reportName }) {
  const tBase = getComparisonTests(base?.assertion_results, 'base');
  const tInput = getComparisonTests(input?.assertion_results, 'input');

  useDocumentTitle(reportName);

  return (
    <Main>
      <Flex direction="column" minH="calc(100vh + 1px)" width="100%">
        <Flex mx="10%" mt={4}>
          <Breadcrumb fontSize="lg">
            <BreadcrumbItem>
              <Link href="/">
                <BreadcrumbLink href="/">Tables</BreadcrumbLink>
              </Link>
            </BreadcrumbItem>

            <BreadcrumbItem isCurrentPage>
              <BreadcrumbLink href="#">{reportName}</BreadcrumbLink>
            </BreadcrumbItem>
          </Breadcrumb>
        </Flex>

        <Flex
          border="1px solid"
          borderColor="gray.300"
          bg="white"
          borderRadius="md"
          p={6}
          mt={3}
          mx="10%"
          direction="column"
          gap={8}
        >
          {/* overview */}
          <Heading fontSize={24}>Overview</Heading>
          <TableContainer>
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th width="10%" />
                  <Th width="45%">Base</Th>
                  <Th width="45%">Input</Th>
                </Tr>
              </Thead>

              <Tbody>
                <Tr>
                  <Td>Table</Td>
                  <Td>{base?.name ?? '-'}</Td>
                  <Td>{input?.name ?? '-'}</Td>
                </Tr>
                <Tr>
                  <Td>Rows</Td>
                  <Td>{base?.row_count ?? '-'}</Td>
                  <Td>{input?.row_count ?? '-'}</Td>
                </Tr>
                <Tr>
                  <Td>Columns</Td>
                  <Td>{base?.col_count ?? '-'}</Td>
                  <Td>{input?.col_count ?? '-'}</Td>
                </Tr>
                <Tr>
                  <Td>Test status</Td>
                  <Td>
                    <Text>
                      <Text as="span" fontWeight={700}>
                        {tBase.passed}{' '}
                      </Text>
                      Passed
                      {', '}
                      <Text
                        as="span"
                        fontWeight={700}
                        color={tBase.failed > 0 ? 'red.500' : 'inherit'}
                      >
                        {tBase.failed}{' '}
                      </Text>
                      Failed
                    </Text>
                  </Td>
                  <Td>
                    <Text>
                      <Text as="span" fontWeight={700}>
                        {tInput.passed}{' '}
                      </Text>
                      Passed
                      {', '}
                      <Text
                        as="span"
                        fontWeight={700}
                        color={tInput.failed > 0 ? 'red.500' : 'inherit'}
                      >
                        {tInput.failed}{' '}
                      </Text>
                      Failed
                    </Text>
                  </Td>
                </Tr>
              </Tbody>
            </Table>
          </TableContainer>

          <Tabs isLazy>
            <TabList>
              <Tab>Schema</Tab>
              <Tab>Profiling</Tab>
              <Tab>Tests</Tab>
            </TabList>

            <TabPanels>
              <TabPanel>
                <CompareSchema base={base} input={input} />
              </TabPanel>

              <TabPanel>
                <CompareProfile base={base} input={input} />
              </TabPanel>

              <TabPanel>
                <CompareTest base={tBase?.tests} input={tInput?.tests} />
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Flex>
      </Flex>
    </Main>
  );
}

function ComparisonBarChart({ data }) {
  const svgRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (data.length > 0) {
      drawComparsionChart({
        containerWidth: containerRef.current.getBoundingClientRect().width,
        svgTarget: svgRef.current,
        tooltipTarget: '.chart',
        data,
      });
    }
  }, [data]);

  return (
    <Flex className="chart" ref={containerRef} width="100%">
      <svg ref={svgRef} />
    </Flex>
  );
}
