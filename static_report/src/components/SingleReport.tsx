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
} from '@chakra-ui/react';
import { useRef } from 'react';
import { Link } from 'wouter';

import { Main } from './Main';
import {
  getReportAsserationStatusCounts,
  formatNumber,
  extractExpectedOrActual,
} from '../utils';

import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useResizeObserver } from '../hooks/useResizeObserver';
import { useSingleChart } from '../hooks/useSingleChart';
import { SRTableColumnDetails } from './SRTableColumnDetails';

export default function SingleReport({ source, data, reportName }) {
  useDocumentTitle(reportName);

  if (!data) {
    return (
      <Main>
        <Flex justifyContent="center" alignItems="center" minHeight="100vh">
          No profile data found.
        </Flex>
      </Main>
    );
  }

  const overview = getReportAsserationStatusCounts(data?.assertion_results);

  return (
    <Main alignItems="flex-start">
      <Flex direction="column" minH="calc(100vh + 1px)" width="100%">
        <Flex mx="10%" mt={4}>
          <Breadcrumb fontSize="lg">
            <BreadcrumbItem>
              <Link href="/">
                <BreadcrumbLink href="/">{source.name}</BreadcrumbLink>
              </Link>
            </BreadcrumbItem>

            <BreadcrumbItem isCurrentPage>
              <BreadcrumbLink href="#">{data.name}</BreadcrumbLink>
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
        >
          <Flex direction="column" gap={4} mb={8}>
            <Heading size="lg">Overview</Heading>
            <Text>
              Table:{' '}
              <Text as="span" fontWeight={700}>
                {data.name}
              </Text>
            </Text>
            <Text>
              Rows:{' '}
              <Text as="span" fontWeight={700}>
                {formatNumber(data.row_count)}
              </Text>
            </Text>
            <Text>
              Columns:{' '}
              <Text as="span" fontWeight={700}>
                {formatNumber(data.col_count)}
              </Text>
            </Text>
            <Text>
              Test Status:{' '}
              <Text as={'span'} fontWeight={700}>
                {overview.passed}
              </Text>{' '}
              Passed,{' '}
              <Text
                as="span"
                fontWeight={700}
                color={overview.failed > 0 ? 'red.500' : 'inherit'}
              >
                {overview.failed}
              </Text>{' '}
              Failed
            </Text>
          </Flex>

          <Tabs isLazy>
            <TabList>
              <Tab>Profiling</Tab>
              <Tab>Tests</Tab>
            </TabList>

            <TabPanels>
              <TabPanel>
                <ProfilingInformation data={data.columns} />
              </TabPanel>

              <TabPanel>
                <TestsInformation data={data.assertion_results} />
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Flex>
      </Flex>
    </Main>
  );
}

function ProfilingInformation({ data }) {
  return (
    <Flex direction="column" gap={4}>
      {Object.keys(data).map((key) => {
        const column = data[key];
        const distribution = column.distribution;
        const isAllValuesExists = column.non_nulls === column.total;

        return (
          <Flex key={key} direction="column" px={4}>
            <Grid my={4} templateColumns="minmax(270px, 1fr) 1fr" gap={12}>
              <SRTableColumnDetails
                column={column}
                hasValuesExist={isAllValuesExists}
              />
              <Flex mt={8} justifyContent="center" alignItems="center">
                {distribution ? (
                  <BarChart
                    data={distribution.labels.map((label, i) => ({
                      label,
                      value: distribution.counts[i],
                      total: column.total,
                    }))}
                  />
                ) : (
                  <Text>No data available</Text>
                )}
              </Flex>
            </Grid>

            <Divider my={4} />
          </Flex>
        );
      })}
    </Flex>
  );
}

function TestsInformation({ data }) {
  const tabelTests = data?.tests;
  const columnsTests = data?.columns;

  if (tabelTests.length === 0 && Object.keys(columnsTests).length === 0) {
    return (
      <Flex direction="column">
        <Text textAlign="center">No tests available</Text>
      </Flex>
    );
  }

  return (
    <Flex direction="column" gap={4}>
      <TableContainer>
        <Table variant="simple">
          <Thead>
            <Tr>
              <Th>Level</Th>
              <Th>Column</Th>
              <Th>Status</Th>
              <Th>Assertion</Th>
              <Th>Expected</Th>
              <Th>Actual</Th>
            </Tr>
          </Thead>

          <Tbody>
            {tabelTests.map((tabelTest) => {
              const isFailed = tabelTest.status === 'failed';

              return (
                <Tr key={tabelTest.name}>
                  <Td>Table</Td>
                  <Td>-</Td>
                  <Td>
                    {isFailed ? (
                      <Text as="span" role="img">
                        ❌
                      </Text>
                    ) : (
                      <Text as="span" role="img">
                        ✅
                      </Text>
                    )}
                  </Td>
                  <Td>{tabelTest.name}</Td>
                  <Td>{extractExpectedOrActual(tabelTest.expected)}</Td>
                  <Td color={isFailed ? 'red.500' : 'inherit'}>
                    {extractExpectedOrActual(tabelTest.actual)}
                  </Td>
                </Tr>
              );
            })}

            {Object.keys(columnsTests).map((key) => {
              const columnTests = columnsTests[key];

              return columnTests.map((columnTest) => {
                const isFailed = columnTest.status === 'failed';

                return (
                  <Tr key={columnTest.name}>
                    <Td>Column</Td>
                    <Td>{key}</Td>
                    <Td>
                      {isFailed ? (
                        <Text as="span" role="img">
                          ❌
                        </Text>
                      ) : (
                        <Text as="span" role="img">
                          ✅
                        </Text>
                      )}
                    </Td>
                    <Td>{columnTest.name}</Td>
                    <Td>{extractExpectedOrActual(columnTest.expected)}</Td>
                    <Td color={isFailed ? 'red.500' : 'inherit'}>
                      {extractExpectedOrActual(columnTest.actual)}
                    </Td>
                  </Tr>
                );
              });
            })}
          </Tbody>
        </Table>
      </TableContainer>
    </Flex>
  );
}

function BarChart({ data }) {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const dimensions = useResizeObserver(containerRef);

  useSingleChart({ target: svgRef, data, dimensions });

  return (
    <Flex className="chart" width="100%" ref={containerRef}>
      <svg width="100%" overflow="visible" ref={svgRef}>
        <g className="x-axis" />
        <g className="y-axis" />
      </svg>
    </Flex>
  );
}
