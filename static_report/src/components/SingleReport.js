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
} from '@chakra-ui/react';
import { useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { Link } from 'wouter';

import { Main } from './Main';
import {
  getReportAsserationStatusCounts,
  drawSingleReportChart,
} from '../utils';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function SingleReport({ source, data, reportName }) {
  useDocumentTitle(reportName);

  if (!data) {
    return (
      <Main>
        <Flex justifyContent="center" alignItems="center" minHeight={'100vh'}>
          No profile data found.
        </Flex>
      </Main>
    );
  }

  const assertion = data.assertion_results;
  const overviewStatus = getReportAsserationStatusCounts(assertion);

  return (
    <Main alignItems={'flex-start'}>
      <Flex direction={'column'} minH={'100vh'} width={'100%'}>
        <Flex mx={'10%'} mt={4}>
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
          border={'1px solid'}
          borderColor={'gray.300'}
          bg={'white'}
          borderRadius={'md'}
          p={6}
          mt={3}
          mx={'10%'}
          direction={'column'}
        >
          <Flex direction={'column'} gap={4}>
            <Heading size={'lg'}>Overview</Heading>
            <Text>
              Table:{' '}
              <Text as={'span'} fontWeight={700}>
                {data.name}
              </Text>
            </Text>
            <Text>
              Rows:{' '}
              <Text as={'span'} fontWeight={700}>
                {data.row_count}
              </Text>
            </Text>
            <Text>
              Columns:{' '}
              <Text as={'span'} fontWeight={700}>
                {data.col_count}
              </Text>
            </Text>
            <Text>
              Test Status:{' '}
              <Text as={'span'} fontWeight={700}>
                {overviewStatus.passed}
              </Text>{' '}
              Passed,{' '}
              <Text
                as={'span'}
                fontWeight={700}
                color={overviewStatus.failed > 0 ? 'red.500' : 'inherit'}
              >
                {overviewStatus.failed}
              </Text>{' '}
              Failed
            </Text>

            <Text>
              Data Source Type:{' '}
              <Text as={'span'} fontWeight={700}>
                {source.type}
              </Text>
            </Text>
            <Text>
              Created Date:{' '}
              <Text as={'span'} fontWeight={700}>
                {data?.created_at &&
                  format(new Date(data.created_at), 'yyyy/MM/dd HH:mm:ss')}
              </Text>
            </Text>
            <Text>
              Freshness:{' '}
              <Text as={'span'} fontWeight={700}>
                Not applicable
              </Text>
            </Text>
          </Flex>

          <Divider my={6} />

          <Flex direction={'column'}>
            <TestsInformation
              tableName={data.name}
              data={data.assertion_results}
            />

            <ProfilingInformation data={data.columns} />
          </Flex>
        </Flex>
      </Flex>
    </Main>
  );
}

function ProfilingInformation({ data }) {
  return (
    <Flex direction={'column'} gap={4} mt={4}>
      <Heading size={'lg'}>Profiling</Heading>

      {Object.keys(data).map((key) => {
        const column = data[key];
        const distribution = column.distribution;
        const isAllValuesExists = column.non_nulls === column.total;

        return (
          <Flex key={key} direction={'column'} px={4}>
            <Grid my={4} templateColumns="300px 1fr" gap={4}>
              <Flex direction={'column'} gap={2}>
                <Text>
                  <Text
                    as={'span'}
                    fontWeight={700}
                    color={'gray.900'}
                    fontSize={'xl'}
                    mr={1}
                  >
                    {column.name}
                  </Text>
                  {''}(<Code>{column.type}</Code>)
                </Text>
                <Flex direction="column">
                  <Flex justifyContent="space-between">
                    <Text fontWeight={700}>Total:</Text>
                    <Text>{column.total}</Text>
                  </Flex>

                  <Flex justifyContent="space-between">
                    <Text fontWeight={700}>Missing:</Text>
                    <Text color={isAllValuesExists ? 'green.500' : 'red.500'}>
                      {isAllValuesExists
                        ? '0'
                        : (
                            Number(
                              (column.total - column.non_nulls) / column.total,
                            ) * 100
                          ).toFixed(3)}
                      %
                    </Text>
                  </Flex>

                  <Flex justifyContent="space-between">
                    <Text fontWeight={700}>Distinct:</Text>
                    <Text>{column.distinct}</Text>
                  </Flex>
                </Flex>

                {column.type === 'numeric' && (
                  <Flex direction="column">
                    <Flex justifyContent="space-between">
                      <Text fontWeight={700}>Min:</Text>
                      <Text>{Number(column.min).toFixed(3)}</Text>
                    </Flex>

                    <Flex justifyContent="space-between">
                      <Text fontWeight={700}>Max:</Text>
                      <Text>{Number(column.max).toFixed(3)}</Text>
                    </Flex>

                    <Flex justifyContent="space-between">
                      <Text fontWeight={700}>Avg:</Text>
                      <Text>{Number(column.avg).toFixed(3)}</Text>
                    </Flex>
                  </Flex>
                )}

                {column.type === 'datetime' && (
                  <Flex direction="column">
                    <Flex justifyContent="space-between">
                      <Text fontWeight={700}>Min:</Text>
                      <Text>{column.min}</Text>
                    </Flex>

                    <Flex justifyContent="space-between">
                      <Text fontWeight={700}>Max:</Text>
                      <Text>{column.max}</Text>
                    </Flex>
                  </Flex>
                )}
              </Flex>

              {distribution ? (
                <BarChart
                  data={distribution.labels.map((label, i) => ({
                    label,
                    value: distribution.counts[i],
                    total: column.total,
                  }))}
                />
              ) : (
                <BarChart data={[]} />
              )}
            </Grid>

            <Divider my={4} />
          </Flex>
        );
      })}
    </Flex>
  );
}

function TestsInformation({ tableName, data }) {
  const tabelTests = data?.tests || [];
  const columnsTests = data?.columns || {};

  return (
    <Flex direction={'column'} gap={4}>
      <Heading size={'lg'}>Tests</Heading>

      <TableContainer>
        <Table variant={'simple'}>
          <Thead>
            <Tr>
              <Th>Name</Th>
              <Th>Status</Th>
              <Th>Level</Th>
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
                  <Td>
                    <Text as={'span'} fontWeight={700}>
                      {tableName}
                    </Text>{' '}
                  </Td>
                  <Td>
                    {isFailed ? (
                      <Text as="span" role={'img'}>
                        ❌
                      </Text>
                    ) : (
                      <Text as="span" role={'img'}>
                        ✅
                      </Text>
                    )}
                  </Td>
                  <Td>Table</Td>
                  <Td>{tabelTest.name.replace('assert_', '')}</Td>
                  <Td>
                    {typeof tabelTest.expected === 'object'
                      ? Object.keys(tabelTest.expected).map((key) => (
                          <Text key={key}>
                            {typeof tabelTest.expected[key] === 'string'
                              ? tabelTest.expected[key]
                              : JSON.stringify(tabelTest.expected[key])}
                          </Text>
                        ))
                      : tabelTest.expected}
                  </Td>
                  <Td color={isFailed && 'red.500'}>
                    {typeof tabelTest.actual === 'object'
                      ? Object.keys(tabelTest.actual).map((key) => (
                          <Text key={key}>
                            {typeof tabelTest.actual[key] === 'string'
                              ? tabelTest.actual[key]
                              : JSON.stringify(tabelTest.actual[key])}
                          </Text>
                        ))
                      : tabelTest.actual}
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
                    <Td>
                      <Text as={'span'} fontWeight={700}>
                        {key}
                      </Text>{' '}
                    </Td>
                    <Td>
                      {isFailed ? (
                        <Text as="span" role={'img'}>
                          ❌
                        </Text>
                      ) : (
                        <Text as="span" role={'img'}>
                          ✅
                        </Text>
                      )}
                    </Td>
                    <Td>Column</Td>
                    <Td>{columnTest.name.replace('assert_', '')}</Td>
                    <Td>
                      {typeof columnTest.expected === 'object'
                        ? Object.keys(columnTest.expected).map((key) => (
                            <Text key={key}>
                              {typeof columnTest.expected[key] === 'string'
                                ? columnTest.expected[key]
                                : JSON.stringify(columnTest.expected[key])}
                            </Text>
                          ))
                        : columnTest.expected}
                    </Td>
                    <Td color={isFailed && 'red.500'}>
                      {typeof columnTest.actual === 'object'
                        ? Object.keys(columnTest.actual).map((key) => (
                            <Text key={key}>
                              {typeof columnTest.actual[key] === 'string'
                                ? columnTest.actual[key]
                                : JSON.stringify(columnTest.actual[key])}
                            </Text>
                          ))
                        : columnTest.actual}
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

  useEffect(() => {
    if (data.length > 0) {
      drawSingleReportChart({
        containerWidth: containerRef.current.getBoundingClientRect().width,
        containerHeight: containerRef.current.getBoundingClientRect().height,
        svgTarget: svgRef.current,
        tooltipTarget: '.chart',
        data,
      });
    }
  }, [data]);

  return (
    <Flex className="chart" width="100%" ref={containerRef}>
      <svg ref={svgRef} />
    </Flex>
  );
}
