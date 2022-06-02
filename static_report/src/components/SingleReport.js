import {
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
import * as d3 from 'd3';
import { useEffect, useRef } from 'react';
import formatDistanceToNow from 'date-fns/formatDistanceToNow';

import { Main } from './Main';
import { getReportAsserationStatusCounts, getChartTooltip } from '../utils';

export function SingleReport() {
  const profileData = window.PIPERIDER_REPORT_DATA;

  if (profileData === '') {
    return (
      <Main>
        <Flex justifyContent="center" alignItems="center" minHeight={'100vh'}>
          No profile data found.
        </Flex>
      </Main>
    );
  }

  const assertion = profileData.assertion_results;
  const overviewStatus = getReportAsserationStatusCounts(assertion);

  return (
    <Main alignItems={'flex-start'}>
      <Flex direction={'column'} minH={'100vh'} width={'100%'}>
        <Flex
          border={'1px solid'}
          borderColor={'gray.300'}
          bg={'white'}
          borderRadius={'md'}
          p={6}
          my={10}
          mx={'10%'}
          direction={'column'}
        >
          {/* TODO: freshness values */}
          <Flex direction={'column'} gap={4}>
            <Heading size={'lg'}>Overview</Heading>
            <Text>
              Table:{' '}
              <Text as={'span'} fontWeight={700}>
                {profileData?.name}
              </Text>
            </Text>
            <Text>
              Rows:{' '}
              <Text as={'span'} fontWeight={700}>
                {profileData?.row_count}
              </Text>
            </Text>
            <Text>
              Columns:{' '}
              <Text as={'span'} fontWeight={700}>
                {profileData?.col_count}
              </Text>
            </Text>
            <Text>
              Status: {/* Passed */}
              {overviewStatus.passed > 0 && overviewStatus.failed === 0 && (
                <Text as="span" role={'img'}>
                  ✅
                </Text>
              )}
              {/* Failed */}
              {overviewStatus.failed > 0 && overviewStatus.passed === 0 && (
                <Text as="span" role={'img'}>
                  ❌
                </Text>
              )}
              {/* Warning */}
              {overviewStatus.failed > 0 && overviewStatus.passed > 0 && (
                <Text as="span" role={'img'}>
                  ⚠️
                </Text>
              )}
            </Text>

            <Text>
              Passed:{' '}
              <Text as={'span'} fontWeight={700} color={'green.500'}>
                {overviewStatus.passed}
              </Text>
            </Text>
            <Text>
              Failed:{' '}
              <Text as={'span'} fontWeight={700} color={'red.500'}>
                {overviewStatus.failed}
              </Text>
            </Text>
            <Text>
              Data Source Type:{' '}
              <Text as={'span'} fontWeight={700}>
                {profileData?.datasource.type}
              </Text>
            </Text>
            <Text>
              Created Date:{' '}
              <Text as={'span'} fontWeight={700}>
                {profileData?.created_at &&
                  formatDistanceToNow(new Date(profileData.created_at), {
                    addSuffix: true,
                  })}
              </Text>
            </Text>
            <Text>
              Freshness:{' '}
              <Text as={'span'} fontWeight={700}>
                {formatDistanceToNow(new Date('2022-05-10'), {
                  addSuffix: true,
                })}
              </Text>
            </Text>
          </Flex>

          <Divider my={6} />

          <Flex direction={'column'}>
            <ProfilingInformation data={profileData.columns} />

            <TestsInformation
                data={{
                  tableName: profileData.name,
                  ...profileData.assertion_results,
                }}
              />
          </Flex>
        </Flex>
      </Flex>
    </Main>
  );
}

function ProfilingInformation({ data }) {
  return (
    <Flex direction={'column'} gap={4}>
      <Heading size={'lg'}>Profiling</Heading>

      {Object.keys(data).map((key) => {
        const column = data[key];
        const { labels, counts } = column.distribution;

        const chartData = labels.map((label, i) => ({
          label,
          value: counts[i],
          total: column.total,
        }));
        const isAllValuesExists = column.non_nulls === column.total;

        return (
          <Flex key={key} direction={'column'}>
            <Grid my={4} templateColumns={'repeat(4, 1fr)'} gap={3}>
              <Flex direction={'column'} gap={2}>
                <Text>
                  <Text
                    as={'span'}
                    fontWeight={700}
                    color={'gray.900'}
                    fontSize={'xl'}
                  >
                    {column.name}
                  </Text>
                  {''}(<Code>{column.type}</Code>)
                </Text>
              </Flex>

              <BarChart data={chartData} />

              <Flex direction={'column'} gap={2}>
                <Text fontWeight={700}>Missing Values</Text>
                <Text color={isAllValuesExists ? 'green.500' : 'red.500'}>
                  {isAllValuesExists
                    ? '0'
                    : (
                        Number(
                          (column.total - column.non_nulls) / column.total
                        ) * 100
                      ).toFixed(3)}
                  %
                </Text>
              </Flex>

              <Flex direction={'column'} gap={2}>
                <Text fontWeight={700}>Range</Text>

                {column.type === 'numeric' ? (
                  <>
                    <Text>
                      Min: <Code>{Number(column.min).toFixed(3)}</Code>
                    </Text>
                    <Text>
                      Max: <Code>{Number(column.max).toFixed(3)}</Code>
                    </Text>
                    <Text>
                      Avg: <Code>{Number(column.avg).toFixed(3)}</Code>
                    </Text>
                  </>
                ) : (
                  <Text>#</Text>
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
                      {data.tableName}
                    </Text>{' '}
                    ({tabelTest.name.replace('assert_', '')})
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
                      ({columnTest.name.replace('assert_', '')})
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

  useEffect(() => {
    const margin = { top: 10, right: 30, bottom: 30, left: 50 };
    const width = 450 - margin.left - margin.right;
    const height = 200 - margin.top - margin.bottom;

    const svgEl = d3.select(svgRef.current);
    svgEl.selectAll('*').remove();

    const svg = svgEl
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const tooltip = getChartTooltip({ target: '.chart' });

    function onShowTooltip(event, d) {
      tooltip
        .html(
          `
          <div>
            <p>Label: ${d.label}</p>
            <p>Value: ${d.value}</p>
            <p>Percentage: ${Number((d.value / d.total) % 100).toFixed(3)}%</p>
          </div>
        `
        )
        .transition()
        .duration(500)
        .style('visibility', 'visible');

      d3.select(this).style('fill', 'var(--chakra-colors-piperider-300)');
    }

    function onMoveTooltip(event) {
      tooltip
        .style('top', `${event.pageY - 10}px`)
        .style('left', `${event.pageX + 10}px`);
    }

    function onHideTooltip() {
      tooltip.html('').transition().duration(500).style('visibility', 'hidden');

      d3.select(this).style('fill', 'var(--chakra-colors-piperider-500)');
    }

    if (data.length > 0) {
      const x = d3
        .scaleBand()
        .domain(data.map((d) => d.label))
        .range([0, width])
        .padding(0.5);
      svg
        .append('g')
        .attr('transform', `translate(0, ${height})`)
        .call(d3.axisBottom(x).tickFormat(() => ''));

      const y = d3
        .scaleLinear()
        .domain([0, d3.max(data, ({ value }) => value)])
        .range([height, 0]);
      svg.append('g').call(
        d3
          .axisLeft(y)
          .tickFormat((d) => `${d}`)
          .ticks(8)
      );

      svg
        .selectAll()
        .data(data)
        .enter()
        .append('rect')
        .attr('x', (s) => x(s.label))
        .attr('y', (s) => y(s.value))
        .attr('height', (s) => height - y(s.value))
        .attr('width', x.bandwidth())
        .style('fill', 'var(--chakra-colors-piperider-500)')
        .on('mouseover', onShowTooltip)
        .on('mousemove', onMoveTooltip)
        .on('mouseout', onHideTooltip);
    }
  }, [data]);

  return (
    <Flex className={'chart'}>
      <svg ref={svgRef} />
    </Flex>
  );
}
