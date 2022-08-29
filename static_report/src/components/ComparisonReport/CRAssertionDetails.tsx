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
import groupBy from 'lodash/groupBy';
import { nanoid } from 'nanoid';

import { CRAssertionTests } from '../../types';
import { AssertionStatus } from '../shared/AssertionStatus';
import type { CRModalData } from './CRModal/CRModal';

type AssertionRow = {
  name: string;
  base?: CRAssertionTests;
  target?: CRAssertionTests;
};

type Props = {
  assertions: {
    piperider: CRAssertionTests[];
    dbt: CRAssertionTests[];
  };
  onDetailVisible: ({
    type,
    data,
  }: {
    type: 'piperider' | 'dbt';
    data: CRModalData;
  }) => void;
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

export function CRAssertionDetails({ assertions, ...props }: Props) {
  const { piperider, dbt } = assertions;

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

  if (piperiderAssertionRows.length === 0 && dbtAssertionRows.length === 0) {
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
            <Th>Assertion</Th>
            <Th>Base Status</Th>
            <Th>Target Status</Th>
            <Th />
          </Tr>
        </Thead>
        <Tbody>
          {/* piperider */}
          {Object.values(piperiderAssertionRows).map((row) => (
            <Tr key={nanoid()}>
              <Td>{row.name}</Td>
              <Td>
                <AssertionStatus status={row.base?.status} />
              </Td>
              <Td>
                <AssertionStatus status={row.target?.status} />
              </Td>
              <Td
                onClick={() => {
                  props.onDetailVisible({
                    type: 'piperider',
                    data: row,
                  });
                }}
              >
                <Text as="span" cursor="pointer">
                  🔍
                </Text>
              </Td>
            </Tr>
          ))}

          {/* Dbt */}
          {Object.values(dbtAssertionRows).map((row) => (
            <Tr key={nanoid()}>
              <Td>{row.name}</Td>
              <Td>
                <AssertionStatus status={row.base?.status} />
              </Td>
              <Td>
                <AssertionStatus status={row.target?.status} />
              </Td>
              <Td
                onClick={() => {
                  props.onDetailVisible({
                    type: 'dbt',
                    data: row,
                  });
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
  );
}
