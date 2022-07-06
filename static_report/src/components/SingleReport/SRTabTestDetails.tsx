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
import { extractExpectedOrActual } from '../../utils';

type Props = {
  data: any;
  type?: 'piperider' | 'dbt';
};
export function SRTabTestDetails({ data, type = 'piperider' }: Props) {
  const tabelTests = data?.tests;
  const columnsTests = data?.columns;

  if (tabelTests.length === 0 && Object.keys(columnsTests).length === 0) {
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
              {type === 'dbt' && <Th>Messagae</Th>}
            </Tr>
          </Thead>

          <Tbody>
            {tabelTests.map((tabelTest) => {
              const isFailed = tabelTest.status === 'failed';
              return (
                <Tr key={tabelTest.name}>
                  <Td>Table</Td>
                  <Td>-</Td>
                  <Td>{tabelTest.name}</Td>
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
                    <Td>{extractExpectedOrActual(tabelTest.expected)}</Td>
                  )}
                  {type === 'piperider' && (
                    <Td color={isFailed ? 'red.500' : 'inherit'}>
                      {extractExpectedOrActual(tabelTest.actual)}
                    </Td>
                  )}
                  {type === 'dbt' && <Td>{tabelTest.message ?? '-'}</Td>}
                </Tr>
              );
            })}

            {Object.keys(columnsTests).map((key) => {
              const columnTests = columnsTests[key];

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
                      <Td>{extractExpectedOrActual(columnTest.expected)}</Td>
                    )}
                    {type === 'piperider' && (
                      <Td color={isFailed ? 'red.500' : 'inherit'}>
                        {extractExpectedOrActual(columnTest.actual)}
                      </Td>
                    )}
                    {type === 'dbt' && <Td>{columnTest.message ?? '-'}</Td>}
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
