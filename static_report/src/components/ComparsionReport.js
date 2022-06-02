import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Box,
  Divider,
  Flex,
  Heading,
  List,
  ListItem,
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
import { format } from 'date-fns';
import { nanoid } from 'nanoid';
import { useEffect, useRef } from 'react';

import { Main } from './Main';
import { getChartTooltip } from '../utils';

export function ComparisonReport() {
  const data = window.PIPERIDER_REPORT_DATA;

  if (data === '') {
    return (
      <Main>
        <Flex justifyContent="center" alignItems="center" minHeight={'100vh'}>
          No profile data found.
        </Flex>
      </Main>
    );
  }

  return (
    <Main>
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
          gap={8}
        >
          <Heading>Comparison Summary</Heading>

          {data && (
            <>
              <TableContainer>
                <Table variant={'simple'}>
                  <Thead>
                    <Tr>
                      <Th width={'10%'} />
                      <Th width={'45%'}>{data.table.base.name}</Th>
                      <Th width={'45%'}>{data.table.input.name}</Th>
                    </Tr>
                  </Thead>

                  <Tbody>
                    <Tr>
                      <Td>Generated Time</Td>
                      <Td>
                        {format(
                          new Date(data.table.base.created_at),
                          'yyyy-MM-dd',
                        )}
                      </Td>
                      <Td>
                        {format(
                          new Date(data.table.input.created_at),
                          'yyyy-MM-dd',
                        )}
                      </Td>
                    </Tr>

                    <Tr>
                      <Td>Schema</Td>
                      <Td colSpan={2}>
                        <List display={'flex'} gap={3}>
                          <ListItem>
                            Added:{' '}
                            <Text as={'span'} fontWeight={700}>
                              {data.summary.schema.added}
                            </Text>
                          </ListItem>
                          <ListItem>
                            Deleted:{' '}
                            <Text as={'span'} fontWeight={700}>
                              {data.summary.schema.deleted}
                            </Text>
                          </ListItem>
                          <ListItem>
                            Type Changed:{' '}
                            <Text as={'span'} fontWeight={700}>
                              {data.summary.schema.type_changed}
                            </Text>
                          </ListItem>
                        </List>
                      </Td>
                    </Tr>

                    <Tr>
                      <Td>Distribution</Td>
                      <Td colSpan={2}>
                        <List display={'flex'} gap={3}>
                          <ListItem>
                            Changed:{' '}
                            <Text as={'span'} fontWeight={700}>
                              {data.summary.distribution.changed}
                            </Text>
                          </ListItem>
                        </List>
                      </Td>
                    </Tr>

                    <Tr>
                      <Td>Missing Values</Td>
                      <Td colSpan={2}>
                        <List display={'flex'} gap={3}>
                          <ListItem>
                            Changed:{' '}
                            <Text as={'span'} fontWeight={700}>
                              {data.summary.missing_values.changed}
                            </Text>
                          </ListItem>
                        </List>
                      </Td>
                    </Tr>

                    <Tr>
                      <Td>Range</Td>
                      <Td colSpan={2}>
                        <List display={'flex'} gap={3}>
                          <ListItem>
                            Changed:{' '}
                            <Text as={'span'} fontWeight={700}>
                              {data.summary.range.changed}
                            </Text>
                          </ListItem>
                          {data.summary.range.first_index && (
                            <ListItem>
                              First Index:{' '}
                              <Text as={'span'} fontWeight={700}>
                                {data.summary.range.first_index}
                              </Text>
                            </ListItem>
                          )}
                        </List>
                      </Td>
                    </Tr>
                  </Tbody>
                </Table>
              </TableContainer>

              <Flex gap={4} width={'100%'} justifyContent={'center'}>
                <Text as={'span'}>🔶</Text>
                <Text as={'span'}>🔶</Text>
                <Text as={'span'}>🔶</Text>
              </Flex>

              <TableContainer>
                <Table variant={'simple'}>
                  <Thead>
                    <Tr>
                      <Th width={'10%'} />
                      <Th width={'45%'}>Table A</Th>
                      <Th width={'45%'}>Table B</Th>
                    </Tr>
                  </Thead>

                  <Tbody>
                    <Tr>
                      <Td>
                        Rows <Text as={'span'}>#️⃣</Text>
                      </Td>
                      <Td>{data.detail.row_count.base}</Td>
                      <Td>{data.detail.row_count.input}</Td>
                    </Tr>

                    <Tr>
                      <Td>
                        Distribution <Text as={'span'}>📈</Text>
                      </Td>
                      <Td colSpan={2}>
                        <ComparisonBarChart />
                      </Td>
                    </Tr>

                    <Tr>
                      <Td>Schema</Td>
                      <Td colSpan={2} whiteSpace={'normal'}>
                        <Accordion allowToggle>
                          <AccordionItem borderColor={'transparent'}>
                            <AccordionButton
                              px={0}
                              _focus={{ boxShadow: 'transparent' }}
                            >
                              <Flex
                                width={'100%'}
                                justifyContent={'space-around'}
                              >
                                <Text>
                                  {data.detail.column_count.base} Columns
                                </Text>
                                <Text>
                                  {data.detail.column_count.input} Columns
                                </Text>
                              </Flex>
                              <AccordionIcon />
                            </AccordionButton>

                            <AccordionPanel px={0}>
                              <Flex
                                width={'100%'}
                                justifyContent={'space-evenly'}
                              >
                                <TableContainer>
                                  <Table variant="simple" width={'350px'}>
                                    <Thead>
                                      <Tr>
                                        <Th>Column</Th>
                                        <Th>Type</Th>
                                      </Tr>
                                    </Thead>
                                    <Tbody>
                                      {data.detail.schema.base.map((column) => (
                                        <Tr
                                          key={nanoid(10)}
                                          color={
                                            column.changed
                                              ? 'red.500'
                                              : 'inherit'
                                          }
                                        >
                                          <Td>{column.key ?? '-'}</Td>
                                          <Td>{column.value ?? '-'}</Td>
                                        </Tr>
                                      ))}
                                    </Tbody>
                                  </Table>
                                </TableContainer>

                                <Flex justifyContent={'center'}>
                                  <Divider orientation={'vertical'} />
                                </Flex>

                                <TableContainer>
                                  <Table variant="simple" width={'350px'}>
                                    <Thead>
                                      <Tr>
                                        <Th>Column</Th>
                                        <Th>Type</Th>
                                      </Tr>
                                    </Thead>
                                    <Tbody>
                                      {data.detail.schema.input.map(
                                        (column) => (
                                          <Tr
                                            key={nanoid(10)}
                                            color={
                                              column.changed
                                                ? 'red.500'
                                                : 'inherit'
                                            }
                                          >
                                            <Td>{column.key ?? '-'}</Td>
                                            <Td>{column.value ?? '-'}</Td>
                                          </Tr>
                                        ),
                                      )}
                                    </Tbody>
                                  </Table>
                                </TableContainer>
                              </Flex>
                            </AccordionPanel>
                          </AccordionItem>
                        </Accordion>
                      </Td>
                    </Tr>

                    <Tr>
                      <Td>Missing Values</Td>
                      <Td colSpan={2} whiteSpace={'normal'}>
                        <Accordion allowToggle>
                          <AccordionItem borderColor={'transparent'}>
                            <AccordionButton
                              px={0}
                              _focus={{ boxShadow: 'transparent' }}
                            >
                              <Box flex="1" textAlign="left" />
                              <AccordionIcon />
                            </AccordionButton>

                            <AccordionPanel px={0}>
                              <Flex
                                width={'100%'}
                                justifyContent={'space-evenly'}
                              >
                                <TableContainer>
                                  <Table variant="simple" width={'350px'}>
                                    <Thead>
                                      <Tr>
                                        <Th>Column</Th>
                                        <Th>Value</Th>
                                      </Tr>
                                    </Thead>
                                    <Tbody>
                                      {data.detail.missing_values.base.map(
                                        (column) => (
                                          <Tr
                                            key={nanoid(10)}
                                            color={
                                              column.changed
                                                ? 'red.500'
                                                : 'inherit'
                                            }
                                          >
                                            <Td>{column.key ?? '-'}</Td>
                                            <Td>{column.value ?? '-'}</Td>
                                          </Tr>
                                        ),
                                      )}
                                    </Tbody>
                                  </Table>
                                </TableContainer>

                                <Flex justifyContent={'center'}>
                                  <Divider orientation={'vertical'} />
                                </Flex>

                                <TableContainer>
                                  <Table variant="simple" width={'350px'}>
                                    <Thead>
                                      <Tr>
                                        <Th>Column</Th>
                                        <Th>Value</Th>
                                      </Tr>
                                    </Thead>
                                    <Tbody>
                                      {data.detail.missing_values.input.map(
                                        (column) => (
                                          <Tr
                                            key={nanoid(10)}
                                            color={
                                              column.changed
                                                ? 'red.500'
                                                : 'inherit'
                                            }
                                          >
                                            <Td>{column.key ?? '-'}</Td>
                                            <Td>{column.value ?? '-'}</Td>
                                          </Tr>
                                        ),
                                      )}
                                    </Tbody>
                                  </Table>
                                </TableContainer>
                              </Flex>
                            </AccordionPanel>
                          </AccordionItem>
                        </Accordion>
                      </Td>
                    </Tr>

                    <Tr>
                      <Td>Range</Td>
                      <Td colSpan={2} whiteSpace={'normal'}>
                        <Accordion allowToggle>
                          <AccordionItem borderColor={'transparent'}>
                            <AccordionButton
                              px={0}
                              _focus={{ boxShadow: 'transparent' }}
                            >
                              <Box flex="1" textAlign="left" />
                              <AccordionIcon />
                            </AccordionButton>

                            <AccordionPanel px={0}>
                              <Flex
                                width={'100%'}
                                justifyContent={'space-evenly'}
                              >
                                <TableContainer>
                                  <Table variant="simple" width={'350px'}>
                                    <Thead>
                                      <Tr>
                                        <Th>Column</Th>
                                        <Th>Range</Th>
                                      </Tr>
                                    </Thead>
                                    <Tbody>
                                      {data.detail.range.base.map((column) => (
                                        <Tr
                                          key={nanoid(10)}
                                          color={
                                            column.changed
                                              ? 'red.500'
                                              : 'inherit'
                                          }
                                        >
                                          <Td>{column.key ?? '-'}</Td>
                                          <Td>
                                            {JSON.stringify(column.value) ??
                                              '-'}
                                          </Td>
                                        </Tr>
                                      ))}
                                    </Tbody>
                                  </Table>
                                </TableContainer>

                                <Flex justifyContent={'center'}>
                                  <Divider orientation={'vertical'} />
                                </Flex>

                                <TableContainer>
                                  <Table variant="simple" width={'350px'}>
                                    <Thead>
                                      <Tr>
                                        <Th>Column</Th>
                                        <Th>Range</Th>
                                      </Tr>
                                    </Thead>
                                    <Tbody>
                                      {data.detail.range.input.map((column) => (
                                        <Tr
                                          key={nanoid(10)}
                                          color={
                                            column.changed
                                              ? 'red.500'
                                              : 'inherit'
                                          }
                                        >
                                          <Td>{column.key ?? '-'}</Td>
                                          <Td>
                                            {JSON.stringify(column.value) ??
                                              '-'}
                                          </Td>
                                        </Tr>
                                      ))}
                                    </Tbody>
                                  </Table>
                                </TableContainer>
                              </Flex>
                            </AccordionPanel>
                          </AccordionItem>
                        </Accordion>
                      </Td>
                    </Tr>
                  </Tbody>
                </Table>
              </TableContainer>
            </>
          )}
        </Flex>
      </Flex>
    </Main>
  );
}

function ComparisonBarChart() {
  const svgRef = useRef(null);

  useEffect(() => {
    const data = [
      {
        label: 'NYSE',
        base: 353,
        input: 400,
      },
      {
        label: 'NASDAQ',
        base: 151,
        input: 140,
      },
    ];
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
        .html(`<p>Value: ${d.value}</p>`)
        .transition()
        .duration(500)
        .style('visibility', 'visible');
    }

    function onMoveTooltip(event) {
      tooltip
        .style('top', `${event.pageY - 10}px`)
        .style('left', `${event.pageX + 10}px`);
    }

    function onHideTooltip() {
      tooltip.html('').transition().duration(500).style('visibility', 'hidden');
    }

    if (data.length > 0) {
      const groups = d3.map(data, (d) => d.label);

      const x = d3.scaleBand().domain(groups).range([0, width]).padding(0.2);
      svg
        .append('g')
        .attr('transform', `translate(0, ${height})`)
        .call(d3.axisBottom(x).tickSize(0));

      const y = d3
        .scaleLinear()
        .domain([0, d3.max(data, ({ base, input }) => Math.max(base, input))])
        .range([height, 0]);
      svg.append('g').call(d3.axisLeft(y));

      const xSubGroup = d3
        .scaleBand()
        .domain(['base', 'input'])
        .range([0, x.bandwidth()])
        .padding(0.05);
      const color = d3
        .scaleOrdinal()
        .domain(['base', 'input'])
        .range([
          'var(--chakra-colors-piperider-100)',
          'var(--chakra-colors-piperider-500)',
        ]);

      svg
        .append('g')
        .selectAll('g')
        .data(data)
        .join('g')
        .attr('transform', (d) => `translate(${x(d.label)}, 0)`)
        .selectAll('rect')
        .data(function (d) {
          return ['base', 'input'].map(function (key) {
            return { key: key, value: d[key] };
          });
        })
        .join('rect')
        .attr('x', (d) => xSubGroup(d.key))
        .attr('y', (d) => y(d.value))
        .attr('width', xSubGroup.bandwidth())
        .attr('height', (d) => height - y(d.value))
        .attr('fill', (d) => color(d.key))
        .on('mouseover', onShowTooltip)
        .on('mousemove', onMoveTooltip)
        .on('mouseout', onHideTooltip);
    }
  }, []);

  return (
    <Flex className={'chart'}>
      <svg ref={svgRef} />
    </Flex>
  );
}
