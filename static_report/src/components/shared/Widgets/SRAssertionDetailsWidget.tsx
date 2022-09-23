import {
  Flex,
  TableContainer,
  Table,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
  Text,
} from '@chakra-ui/react';
import { nanoid } from 'nanoid';

import { AssertionStatus } from '../Assertions/AssertionStatus';
import { formatTestExpectedOrActual } from '../../../utils/formatters';

import type { AssertionValue } from '../../../types';
import type { AssertionTest } from '../../../sdlc/single-report-schema';
import { NO_VALUE } from '../Columns';

type AssertionWithSource = AssertionTest & {
  source?: 'PipeRider' | 'dbt';
  colName?: string;
};

type AssertStatusCounts = {
  passed: AssertionWithSource[];
  failed: AssertionWithSource[];
};

type Props = {
  assertions: {
    piperider: AssertionValue;
    dbt?: AssertionValue;
  };
};

export function SRAssertionDetailsWidget({ assertions }: Props) {
  const { passedAssertions, failedAssertions } = mergeAssertions(
    assertions?.piperider,
    assertions?.dbt,
  );

  if (passedAssertions.length === 0 && failedAssertions.length === 0) {
    return (
      <Flex direction="column" alignItems="center" justifyContent="center">
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
              <Th>Column</Th>
              <Th>Assertion</Th>
              <Th>Status</Th>
              <Th>Expected</Th>
              <Th>Actual</Th>
              <Th>Source</Th>
            </Tr>
          </Thead>

          <Tbody>
            {failedAssertions.map((assertion) => (
              <Tr key={assertion.name}>
                <Td>{assertion.colName}</Td>
                <Td>{assertion.name}</Td>
                <Td>
                  <AssertionStatus status={assertion.status} />
                </Td>
                <Td>{formatTestExpectedOrActual(assertion.expected)}</Td>
                <Td color="red.500">
                  {formatTestExpectedOrActual(assertion.actual)}
                </Td>
                <Td>{assertion.source}</Td>
              </Tr>
            ))}

            {passedAssertions.map((assertion) => (
              <Tr key={nanoid()}>
                <Td>{assertion.colName || NO_VALUE}</Td>
                <Td>{assertion.name}</Td>
                <Td>
                  <AssertionStatus status={assertion.status} />
                </Td>
                <Td>{formatTestExpectedOrActual(assertion.expected)}</Td>
                <Td>{formatTestExpectedOrActual(assertion.actual)}</Td>
                <Td>{assertion.source}</Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableContainer>
    </Flex>
  );
}

function extractAssertionWithSource(
  source: 'PipeRider' | 'dbt',
  assertion: AssertionTest,
  acc: {
    source?: 'PipeRider' | 'dbt';
    passed: AssertionWithSource[];
    failed: AssertionWithSource[];
  },
) {
  if (assertion.status === 'passed') {
    acc.passed.push({ ...assertion, source });
  } else {
    acc.failed.push({ ...assertion, source });
  }

  return acc;
}

function mergeAssertions(piperider?: AssertionValue, dbt?: AssertionValue) {
  const { passed: pprTableAssertionPassed, failed: pprTableAssertionFailed } = (
    piperider?.tests || []
  ).reduce<AssertStatusCounts>(
    (acc, assertion) => extractAssertionWithSource('PipeRider', assertion, acc),
    {
      passed: [],
      failed: [],
    },
  );

  const { passed: pprColAssertionPassed, failed: pprColAssertionFailed } =
    Object.keys(piperider?.columns || {})
      .flatMap((colName) =>
        (piperider?.columns[colName] || []).map((assertion) => ({
          ...assertion,
          colName,
        })),
      )
      .reduce<AssertStatusCounts>(
        (acc, assertion) =>
          extractAssertionWithSource('PipeRider', assertion, acc),
        { passed: [], failed: [] },
      );

  const { passed: dbtTableAssertionPassed, failed: dbtTableAssertionFailed } = (
    dbt?.tests || []
  ).reduce<AssertStatusCounts>(
    (acc, assertion) => extractAssertionWithSource('dbt', assertion, acc),
    {
      passed: [],
      failed: [],
    },
  );

  const { passed: dbtColAssertionPassed, failed: dbtColAssertionFailed } =
    Object.keys(dbt?.columns || {})
      .flatMap((colName) =>
        (dbt?.columns[colName] || []).map((assertion) => ({
          ...assertion,
          colName,
        })),
      )
      .reduce<AssertStatusCounts>(
        (acc, assertion) => extractAssertionWithSource('dbt', assertion, acc),
        { passed: [], failed: [] },
      );

  return {
    passedAssertions: [
      ...pprTableAssertionPassed,
      ...pprColAssertionPassed,
      ...dbtTableAssertionPassed,
      ...dbtColAssertionPassed,
    ],
    failedAssertions: [
      ...pprTableAssertionFailed,
      ...pprColAssertionFailed,
      ...dbtTableAssertionFailed,
      ...dbtColAssertionFailed,
    ],
  };
}
