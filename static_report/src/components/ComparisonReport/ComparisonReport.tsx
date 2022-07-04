import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
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
  useDisclosure,
} from '@chakra-ui/react';
import { Link } from 'wouter';
import { nanoid } from 'nanoid';
import { useEffect, useRef, useState } from 'react';
import groupBy from 'lodash/groupBy';

import { Main } from '../shared/Main';
import {
  nestComparisonValueByKey,
  transformDistribution,
  transformDistributionWithLabels,
  getComparisonAssertions,
} from '../../utils';

import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useResizeObserver } from '../../hooks/useResizeObserver';
import { useComparisonChart } from '../../hooks/useComparisonChart';
import { CRTableColumnDetails } from './CRTableColumnDetails';
import { TestStatus } from '../shared/TestStatus';
import { CRModal } from './CRModal';
import type { ComparisonReportSchema } from '../../sdlc/comparison-report-schema';

function CompareTest({ base = [], input = [], ...props }) {
  // group by "level", "column", "name"
  const groupedTests = groupBy(
    [...base, ...input],
    (test) => `${test.level}_${test.column}_${test.name}`,
  );

  const tests = Object.values(groupedTests).map((groupedTest) => {
    let row: any = {
      level: groupedTest[0].level,
      column: groupedTest[0].column,
      name: groupedTest[0].name,
    };

    (groupedTest as any).forEach((test) => {
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
        <Text textAlign="center">No tests available</Text>
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
            <Th />
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
                <Td
                  onClick={() => {
                    props.onDetailVisible(test);
                  }}
                >
                  <Text as="span" cursor="pointer">
                    🔍
                  </Text>
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

  Object.entries<any>(base?.columns || []).forEach(([name, column]) => {
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

  Object.entries<any>(input?.columns || []).forEach(([name, column]) => {
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
      <Grid my={8} templateColumns="500px 1fr" gap={12}>
        <CRTableColumnDetails
          baseColumn={base}
          inputColumn={input}
          column={base ? base : input}
        />

        {data.length === 1 && <ComparisonBarChart data={data[0]} />}
        {data.length === 2 && (
          <Grid my={4} templateColumns="1fr 1fr" gap={12}>
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
  const transformedData = nestComparisonValueByKey(
    base?.columns,
    input?.columns,
  );

  return (
    <>
      {Object.entries(transformedData).map(([key, value]) => (
        <CompareProfileColumn
          key={key}
          name={key}
          base={value.base}
          input={value.input}
        />
      ))}
    </>
  );
}

export default function ComparisonReport({
  data,
  name: reportName,
}: {
  data: ComparisonReportSchema;
  name: string;
}) {
  const [testDetail, setTestDetail] = useState(null);
  const modal = useDisclosure();

  const { base, input } = data;
  const baseTables = base.tables[reportName];
  const inputTables = input.tables[reportName];
  const existsDbtTests = (base.tables[reportName] as any)?.dbt_test_results;

  const [baseOverview, inputOverview] = getComparisonAssertions({
    data,
    reportName,
    type: 'piperider',
  });
  const [dbtBaseOverview, dbtInputOverview] = getComparisonAssertions({
    data,
    reportName,
    type: 'dbt',
  });

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
                  <Td>{(baseTables as any)?.name ?? '-'}</Td>
                  <Td>{(inputTables as any)?.name ?? '-'}</Td>
                </Tr>
                <Tr>
                  <Td>Rows</Td>
                  <Td>{(baseTables as any)?.row_count ?? '-'}</Td>
                  <Td>{(inputTables as any)?.row_count ?? '-'}</Td>
                </Tr>
                <Tr>
                  <Td>Columns</Td>
                  <Td>{(baseTables as any)?.col_count ?? '-'}</Td>
                  <Td>{(inputTables as any)?.col_count ?? '-'}</Td>
                </Tr>
                <Tr>
                  <Td>Test status</Td>
                  <Td>
                    <Text>
                      <Text as="span" fontWeight={700}>
                        {baseOverview.passed}{' '}
                      </Text>
                      Passed
                      {', '}
                      <Text
                        as="span"
                        fontWeight={700}
                        color={baseOverview.failed > 0 ? 'red.500' : 'inherit'}
                      >
                        {baseOverview.failed}{' '}
                      </Text>
                      Failed
                    </Text>
                  </Td>
                  <Td>
                    <Text>
                      <Text as="span" fontWeight={700}>
                        {inputOverview.passed}{' '}
                      </Text>
                      Passed
                      {', '}
                      <Text
                        as="span"
                        fontWeight={700}
                        color={inputOverview.failed > 0 ? 'red.500' : 'inherit'}
                      >
                        {inputOverview.failed}{' '}
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
              {existsDbtTests && <Tab>dbt Tests</Tab>}
            </TabList>

            <TabPanels>
              <TabPanel>
                <CompareSchema base={baseTables} input={inputTables} />
              </TabPanel>

              <TabPanel>
                <CompareProfile base={baseTables} input={inputTables} />
              </TabPanel>

              <TabPanel>
                <CompareTest
                  base={baseOverview?.tests}
                  input={inputOverview?.tests}
                  onDetailVisible={(data) => {
                    setTestDetail({
                      type: 'piperider',
                      data,
                    });
                    modal.onOpen();
                  }}
                />
              </TabPanel>

              <TabPanel>
                {dbtBaseOverview?.tests.length === 0 &&
                dbtInputOverview?.tests.length === 0 ? (
                  <Flex
                    justifyContent="center"
                    alignItems="center"
                    height="100px"
                  >
                    <Text color="gray.500">No dbt tests available.</Text>
                  </Flex>
                ) : (
                  <CompareTest
                    base={dbtBaseOverview?.tests}
                    input={dbtInputOverview?.tests}
                    onDetailVisible={(data) => {
                      setTestDetail({
                        type: 'dbt',
                        data,
                      });
                      modal.onOpen();
                    }}
                  />
                )}
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Flex>
      </Flex>

      <CRModal
        {...modal}
        type={testDetail?.type}
        data={testDetail?.data}
        onClose={() => {
          modal.onClose();
          setTestDetail(null);
        }}
      />
    </Main>
  );
}

function ComparisonBarChart({ data }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dimensions = useResizeObserver(containerRef);

  useComparisonChart({ target: svgRef, data, dimensions });

  return (
    <Flex className="chart" width="100%" ref={containerRef}>
      <svg width="100%" overflow="visible" ref={svgRef}>
        <g className="x-axis" />
        <g className="y-axis" />
      </svg>
    </Flex>
  );
}
