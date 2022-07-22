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
import { CRAssertionTests, CRTargetData } from '../../types';
import { TestStatus } from '../shared/TestStatus';

type TestGroupRow = {
  level: string;
  column: string;
  name: string;
  base?: CRAssertionTests;
  target?: CRAssertionTests;
};
type Props = CRTargetData<CRAssertionTests[]> & { onDetailVisible: Function };
export function CRTabTestDetails({ base = [], target = [], ...props }: Props) {
  // group by "level", "column", "name"
  const groupedTests = groupBy(
    [...base, ...target],
    (test) => `${test.level}_${test.column}_${test.name}`,
  );

  const tests = Object.values(groupedTests).map((groupedTest) => {
    const row: TestGroupRow = {
      level: groupedTest[0].level,
      column: groupedTest[0].column,
      name: groupedTest[0].name,
    };

    groupedTest.forEach((test) => {
      if (test.from === 'base') {
        row.base = test;
      } else {
        row.target = test;
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
            <Th>Target Status</Th>
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
                  <TestStatus status={test.target?.status} />
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
