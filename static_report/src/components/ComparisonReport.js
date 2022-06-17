import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Box,
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
import { format } from 'date-fns';
import { nanoid } from 'nanoid';
import { useEffect, useRef } from 'react';

import { Main } from './Main';
import { drawComparsionChart } from '../utils';
import { fill, groupBy, zip } from 'lodash';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

function formatTime(time) {
  return format(new Date(time), 'yyyy/MM/dd HH:mm:ss');
}

function transformTest(data, from) {
  let tests = [];
  let passed = 0;
  let failed = 0;

  if (!data) {
    return undefined;
  }

  data.assertion_results.tests.forEach((test) => {
    if (test.status === 'passed') {
      passed++;
    } else {
      failed++;
    }

    tests.push({
      ...test,
      level: 'Table',
      column: '-',
      from,
    });
  });

  Object.keys(data.assertion_results.columns).forEach((column) => {
    let columnTests = data.assertion_results.columns[column];
    columnTests.forEach((test) => {
      if (test.status === 'passed') {
        passed++;
      } else {
        failed++;
      }
      tests.push({
        ...test,
        level: 'Column',
        column,
        from,
      });
    });
  });

  return {
    tests: tests,
    passed,
    failed,
  };
}

function CompareTest({ base = [], input = [] }) {
  // group by "level", "column", "name"
  let tests = groupBy(
    [].concat(base, input),
    (test) => `${test.level}_${test.column}_${test.name}`,
  );
  tests = Object.values(tests).map((groupedTest) => {
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

  const TestStatus = ({ test }) => {
    let content;
    if (!test) {
      content = '-';
    } else if (test.status === 'passed') {
      content = '✅';
    } else {
      content = '❌';
    }
    return (
      <Text as="span" role={'img'}>
        {content}
      </Text>
    );
  };

  // render
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
                  <TestStatus test={test.base} />
                </Td>
                <Td>
                  <TestStatus test={test.input} />
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

function f(value) {
  return value != undefined ? value : '-';
}

function CompareProfileColumn({ name, base, input }) {
  let column = base ? base : input;
  const isAllValuesExists = false;

  const MetricRow = ({ name, base, input }) => (
    <Flex gap="2">
      <Box flex="1">{<b>{name}</b>}</Box>
      <Flex justifyContent={'flex-end'} alignItems={'center'} w="100px">
        {base}
      </Flex>
      <Flex justifyContent={'flex-end'} alignItems={'center'} w="100px">
        {input}
      </Flex>
    </Flex>
  );

  const NumberCell = ({ value }) =>
    value != undefined ? Number(value).toFixed(3) : '-';

  const GeneralCell = ({ value }) => (value != undefined ? value : '-');

  const Missing = ({ column }) =>
    column
      ? (
          Number((column.total - column.non_nulls) / column.total) * 100
        ).toFixed(1) + '%'
      : '-';

  const metrics = (
    <>
      <MetricRow
        name={
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
        }
        base="Base"
        input="Input"
      ></MetricRow>

      <MetricRow
        name="Total"
        base={base?.total || '-'}
        input={input?.total || '-'}
      ></MetricRow>
      <MetricRow
        name="Missing"
        base={<Missing column={base} />}
        input={<Missing column={input} />}
      ></MetricRow>
      <MetricRow
        name="Distinct"
        base={f(base?.distinct)}
        input={f(input?.distinct)}
      ></MetricRow>
      <Box height={2}></Box>

      {column.type === 'numeric' && (
        <>
          <MetricRow
            name="Min"
            base={<NumberCell value={base?.min}></NumberCell>}
            input={<NumberCell value={input?.min}></NumberCell>}
          ></MetricRow>
          <MetricRow
            name="Max"
            base={<NumberCell value={base?.max}></NumberCell>}
            input={<NumberCell value={input?.max}></NumberCell>}
          ></MetricRow>
          <MetricRow
            name="Average"
            base={<NumberCell value={base?.avg}></NumberCell>}
            input={<NumberCell value={input?.avg}></NumberCell>}
          ></MetricRow>
        </>
      )}

      {column.type === 'datetime' && (
        <>
          <MetricRow
            name="Min"
            base={<GeneralCell value={base?.min}></GeneralCell>}
            input={<GeneralCell value={input?.min}></GeneralCell>}
          ></MetricRow>
          <MetricRow
            name="Max"
            base={<GeneralCell value={base?.max}></GeneralCell>}
            input={<GeneralCell value={input?.max}></GeneralCell>}
          ></MetricRow>
        </>
      )}
    </>
  );

  // distribution
  let CompareDistribution;

  if (
    base?.type === input?.type &&
    (base?.type == 'string' || base?.type == 'datetime')
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
        <Flex direction={'column'} gap={1}>
          {metrics}
        </Flex>
        <CompareDistribution />
      </Grid>
    </Flex>
  );
}

function CompareProfile({ base, input }) {
  function joinBykey(left = {}, right = {}) {
    const result = {};

    Object.entries(left).map(([key, value]) => {
      if (!result[key]) {
        result[key] = {};
      }

      result[key].left = value;
    });

    Object.entries(right).map(([key, value]) => {
      if (!result[key]) {
        result[key] = {};
      }
      result[key].right = value;
    });

    return result;
  }

  let transformedData = joinBykey(base?.columns, input?.columns);

  return (
    <>
      {Object.entries(transformedData).map(([key, value]) => {
        return (
          <CompareProfileColumn
            key={key}
            name={key}
            base={value.left}
            input={value.right}
          />
        );
      })}
    </>
  );
}

export function ComparisonReport({ base, input }) {
  let tBase = transformTest(base, 'base');
  let tInput = transformTest(input, 'input');

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
                  <Td>{f(base?.name)}</Td>
                  <Td>{f(input?.name)}</Td>
                </Tr>
                <Tr>
                  <Td>Rows</Td>
                  <Td>{f(base?.row_count)}</Td>
                  <Td>{f(input?.row_count)}</Td>
                </Tr>
                <Tr>
                  <Td>Columns</Td>
                  <Td>{f(base?.col_count)}</Td>
                  <Td>{f(input?.col_count)}</Td>
                </Tr>
                <Tr>
                  <Td>Test status</Td>
                  <Td>
                    {tBase
                      ? `${f(tBase.passed)} Passed, ${f(tBase.failed)} Failed`
                      : '-'}
                  </Td>
                  <Td>
                    {tInput
                      ? `${f(tInput.passed)} Passed, ${f(tInput.failed)} Failed`
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
