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
  useDisclosure,
} from '@chakra-ui/react';
import groupBy from 'lodash/groupBy';
import { nanoid } from 'nanoid';
import { useState } from 'react';

import { CRAssertionTests } from '../../../types';
import { AssertionStatus } from '../Assertions/AssertionStatus';
import { CRModal, TestDetail } from '../Modals/CRModal/CRModal';

type AssertionRow = {
  name: string;
  base?: CRAssertionTests;
  target?: CRAssertionTests;
};

type AssertionRowWithSource = AssertionRow & { source: 'PipeRider' | 'dbt' };

type AssertStatusCounts = {
  passed: AssertionRowWithSource[];
  failed: AssertionRowWithSource[];
};

type Props = {
  assertions: {
    piperider: CRAssertionTests[];
    dbt: CRAssertionTests[];
  };
};

function groupedAssertions(
  groupAssertions: Record<string, CRAssertionTests[]>,
) {
  return Object.values(groupAssertions).map((assertions) => {
    const row: AssertionRow = {
      name: assertions[0].name,
    };

    assertions.forEach((assertion) => {
      if (assertion.from === 'base') {
        row.base = assertion;
      } else {
        row.target = assertion;
      }
    });

    return row;
  });
}

export function CRAssertionDetailsWidget({ assertions, ...props }: Props) {
  const { piperider, dbt } = assertions;
  const modal = useDisclosure();
  const [testDetail, setTestDetail] = useState<TestDetail | null>(null);
  // group by "level", "column", "name"
  const groupPiperiderAssertions = groupBy<CRAssertionTests>(
    piperider,
    (test) => `${test.level}_${test.column}_${test.name}`,
  );
  const groupDbtAssertions = groupBy<CRAssertionTests>(
    dbt,
    (test) => `${test.level}_${test.column}_${test.name}`,
  );

  const piperiderAssertionRows = groupedAssertions(groupPiperiderAssertions);
  const dbtAssertionRows = groupedAssertions(groupDbtAssertions);

  const { passedAssertionRows, failedAssertionRows } =
    mergeGroupedAssertionRows(piperiderAssertionRows, dbtAssertionRows);

  if (piperiderAssertionRows.length === 0 && dbtAssertionRows.length === 0) {
    return (
      <Flex direction="column" justifyContent="center" alignItems="center">
        <Text textAlign="center">No tests available</Text>
      </Flex>
    );
  }

  return (
    <>
      <TableContainer>
        <Table variant="simple">
          <Thead>
            <Tr>
              <Th>Column</Th>
              <Th>Assertion</Th>
              <Th>Base Status</Th>
              <Th>Target Status</Th>
              <Th>Source</Th>
              <Th />
            </Tr>
          </Thead>
          <Tbody>
            {failedAssertionRows.map((row) => (
              <Tr key={nanoid()}>
                <Td>{row.base?.column}</Td>
                <Td>{row.name}</Td>
                <Td>
                  <AssertionStatus status={row.base?.status} />
                </Td>
                <Td>
                  <AssertionStatus status={row.target?.status} />
                </Td>
                <Td>{row.source}</Td>
                <Td
                  onClick={() => {
                    setTestDetail({
                      type: 'piperider',
                      data: row,
                    });
                    modal.onOpen();
                  }}
                >
                  <Text as="span" cursor="pointer">
                    🔍
                  </Text>
                </Td>
              </Tr>
            ))}

            {passedAssertionRows.map((row) => (
              <Tr key={nanoid()}>
                <Td>{row.base?.column}</Td>
                <Td>{row.name}</Td>
                <Td>
                  <AssertionStatus status={row.base?.status} />
                </Td>
                <Td>
                  <AssertionStatus status={row.target?.status} />
                </Td>
                <Td>{row.source}</Td>
                <Td
                  onClick={() => {
                    setTestDetail({
                      type: 'piperider',
                      data: row,
                    });
                    modal.onOpen();
                  }}
                >
                  <Text as="span" cursor="pointer">
                    🔍
                  </Text>
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </TableContainer>
      <CRModal
        {...modal}
        type={testDetail?.type}
        data={testDetail?.data}
        onClose={() => {
          modal.onClose();
          setTestDetail(null);
        }}
      />
    </>
  );
}

function extractPassedAndFailed(
  source: 'PipeRider' | 'dbt',
  assertion: AssertionRow,
  acc: {
    source?: 'PipeRider' | 'dbt';
    passed: AssertionRowWithSource[];
    failed: AssertionRowWithSource[];
  },
) {
  if (assertion) {
    if (
      assertion.base?.status === 'failed' ||
      assertion.target?.status === 'failed'
    ) {
      acc.failed.push({ ...assertion, source });
    } else {
      acc.passed.push({ ...assertion, source });
    }
  }

  return acc;
}

function mergeGroupedAssertionRows(
  piperider: AssertionRow[],
  dbt: AssertionRow[],
) {
  const { passed: pprPassed, failed: pprFailed } =
    piperider.reduce<AssertStatusCounts>(
      (acc, assertion) => extractPassedAndFailed('PipeRider', assertion, acc),
      { passed: [], failed: [] },
    );

  const { passed: dbtPassed, failed: dbtFailed } =
    dbt.reduce<AssertStatusCounts>(
      (acc, assertion) => extractPassedAndFailed('dbt', assertion, acc),
      { passed: [], failed: [] },
    );

  return {
    passedAssertionRows: [...pprPassed, ...dbtPassed],
    failedAssertionRows: [...pprFailed, ...dbtFailed],
  };
}
