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
import { assertionTestSchema } from '../../sdlc/single-report-schema.z';
import { z } from 'zod';
import { AssertionValue, zReport } from '../../types';
import { formatTestExpectedOrActual } from '../../utils/formatters';

type Props = {
  assertionData: AssertionValue;
  type?: 'piperider' | 'dbt';
};
export function SRTabTestDetails({ assertionData, type = 'piperider' }: Props) {
  const tableTests = assertionData?.tests;
  const columnsTests = assertionData?.columns || {};

  if (
    !tableTests ||
    (tableTests.length === 0 && Object.keys(columnsTests).length === 0)
  ) {
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
              <Th>Assertion</Th>
              <Th>Status</Th>
              {type === 'piperider' && <Th>Expected</Th>}
              {type === 'piperider' && <Th>Actual</Th>}
            </Tr>
          </Thead>

          <Tbody>
            {tableTests.map((tableTest) => {
              zReport(assertionTestSchema.safeParse(tableTest));
              const isFailed = tableTest.status === 'failed';
              return (
                <Tr key={tableTest.name}>
                  <Td>Table</Td>
                  <Td>-</Td>
                  <Td>{tableTest.name}</Td>
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
                  {type === 'piperider' && (
                    <Td>{formatTestExpectedOrActual(tableTest.expected)}</Td>
                  )}
                  {type === 'piperider' && (
                    <Td color={isFailed ? 'red.500' : 'inherit'}>
                      {formatTestExpectedOrActual(tableTest.actual)}
                    </Td>
                  )}
                </Tr>
              );
            })}

            {Object.keys(columnsTests).map((key) => {
              const columnTests = columnsTests[key];
              zReport(z.array(assertionTestSchema).safeParse(columnTests));

              return columnTests.map((columnTest) => {
                const isFailed = columnTest.status === 'failed';

                return (
                  <Tr key={columnTest.name}>
                    <Td>Column</Td>
                    <Td>{key}</Td>
                    <Td>{columnTest.name}</Td>
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
                    {type === 'piperider' && (
                      <Td>{formatTestExpectedOrActual(columnTest.expected)}</Td>
                    )}
                    {type === 'piperider' && (
                      <Td color={isFailed ? 'red.500' : 'inherit'}>
                        {formatTestExpectedOrActual(columnTest.actual)}
                      </Td>
                    )}
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
