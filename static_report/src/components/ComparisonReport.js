import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Box,
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
import { Link } from 'wouter';
import { nanoid } from 'nanoid';
import { useEffect, useRef } from 'react';
import fill from 'lodash/fill';
import groupBy from 'lodash/groupBy';
import zip from 'lodash/zip';

import { Main } from './Main';
import { getFixedValue, getMissingValue } from '../utils';
import {
  drawComparsionChart,
  joinBykey,
  getComparisonTests,
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

  return (
    <TableContainer>
      <Table variant={'simple'}>
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
    <Accordion allowToggle>
      <AccordionItem borderColor={'transparent'}>
        <AccordionButton px={0} _focus={{ boxShadow: 'transparent' }}>
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
          <Box flex="1" textAlign="left" />
          <AccordionIcon />
        </AccordionButton>

        <AccordionPanel px={0}>
          <Flex width={'100%'} justifyContent={'space-evenly'}>
            <TableContainer>
              <Table variant="simple" width={'350px'}>
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

            <TableContainer>
              <Table variant="simple" width={'350px'}>
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
        </AccordionPanel>
      </AccordionItem>
    </Accordion>
  );
}

function MetricsInfo({ name, base, input }) {
  return (
    <Flex justifyContent="space-between">
      <Text fontWeight={700}>{name}</Text>
      <Flex gap={8}>
        <Text textAlign="right" width="100px">
          {base}
        </Text>
        <Text textAlign="right" width="100px">
          {input}
        </Text>
      </Flex>
    </Flex>
  );
}

function CompareProfileColumn({ name, base, input }) {
  let column = base ? base : input;

  // FIXME:
  // distribution
  let CompareDistribution;

  if (
    base?.type === input?.type &&
    (base?.type === 'string' || base?.type === 'datetime')
  ) {
    const transformDist = (base, input) => {
      let i = 0;
      let mapIndex = {};
      let result = [];

      for (i = 0; i < base.labels.length; i++) {
        let label = base.labels[i];
        let count = base.counts[i];
        mapIndex[label] = i;
        result.push({
          label: label,
          base: count,
          input: 0,
        });
      }

      for (i = 0; i < input.labels.length; i++) {
        let label = input.labels[i];
        let count = input.counts[i];

        if (mapIndex.hasOwnProperty(label)) {
          result[mapIndex[label]].input = count;
        } else {
          result.push({
            label: label,
            base: 0,
            input: count,
          });
        }
      }

      return result;
    };

    let data = transformDist(base.distribution, input.distribution);

    CompareDistribution = () => <ComparisonBarChart data={data} />;
  } else {
    const transformDist = (labels, base, input) => {
      if (!base) {
        base = fill(Array(labels.length), 0);
      }

      if (!input) {
        input = fill(Array(labels.length), 0);
      }

      let z = zip(labels, base, input);
      let m = z.map(([label, base, input]) => ({
        label,
        base,
        input,
      }));

      return m;
    };

    let dataBase =
      base &&
      transformDist(base.distribution.labels, base.distribution.counts, null);
    let dataInput =
      input &&
      transformDist(input.distribution.labels, null, input.distribution.counts);

    CompareDistribution = () => (
      <Grid my={4} templateColumns="1fr 1fr" gap={3}>
        {dataBase ? <ComparisonBarChart data={dataBase} /> : <Box />}
        {dataInput ? <ComparisonBarChart data={dataInput} /> : <Box />}
      </Grid>
    );
  }
  return (
    <Flex key={name} direction={'column'}>
      <Grid my={4} templateColumns="1fr 600px" gap={3}>
        <Flex direction={'column'} gap={2}>
          <Flex direction="column">
            <MetricsInfo
              name={
                <>
                  <Text as="span" color="gray.900" fontSize={'xl'} mr={1}>
                    {column.name}
                  </Text>{' '}
                  (<Code>{column.type}</Code>)
                </>
              }
              base="Base"
              input="Input"
            />

            <MetricsInfo
              name="Total"
              base={base?.total || '-'}
              input={input?.total || '-'}
            />

            <MetricsInfo
              name="Missing"
              base={getMissingValue(base)}
              input={getMissingValue(input)}
            />

            <MetricsInfo
              name="Distinct"
              base={base?.distinct ?? '-'}
              input={input?.distinct ?? '-'}
            />
          </Flex>

          {column.type === 'numeric' && (
            <Flex direction="column">
              <MetricsInfo
                name="Min"
                base={getFixedValue(base?.min)}
                input={getFixedValue(input?.min)}
              />
              <MetricsInfo
                name="Max"
                base={getFixedValue(base?.max)}
                input={getFixedValue(input?.max)}
              />
              <MetricsInfo
                name="Average"
                base={getFixedValue(base?.avg)}
                input={getFixedValue(input?.avg)}
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
        <CompareDistribution />
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
      <Flex direction={'column'} minH={'100vh'} width={'100%'}>
        <Flex mx={'10%'} mt={4}>
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
          border={'1px solid'}
          borderColor={'gray.300'}
          bg={'white'}
          borderRadius={'md'}
          p={6}
          mt={3}
          mx={'10%'}
          direction={'column'}
          gap={8}
        >
          {/* overview */}
          <Heading fontSize={24}>Overview</Heading>
          <TableContainer>
            <Table variant={'simple'}>
              <Thead>
                <Tr>
                  <Th width={'10%'} />
                  <Th width={'45%'}>Base</Th>
                  <Th width={'45%'}>Input</Th>
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
                    {tBase
                      ? `${tBase.passed ?? '-'} Passed, ${
                          tBase.failed ?? '-'
                        } Failed`
                      : '-'}
                  </Td>
                  <Td>
                    {tInput
                      ? `${tInput.passed ?? '-'} Passed, ${
                          tInput.failed ?? '-'
                        } Failed`
                      : '-'}
                  </Td>
                </Tr>
              </Tbody>
            </Table>
          </TableContainer>

          <Heading fontSize={24}>Tests</Heading>
          <CompareTest base={tBase?.tests} input={tInput?.tests} />

          <Heading fontSize={24}>Schema</Heading>
          <CompareSchema base={base} input={input} />

          <Heading fontSize={24}>Profiling</Heading>
          <CompareProfile base={base} input={input} />
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
    <Flex className={'chart'} ref={containerRef} width={'100%'}>
      <svg ref={svgRef} />
    </Flex>
  );
}
