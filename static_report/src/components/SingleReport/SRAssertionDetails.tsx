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
  assertions: {
    piperider: AssertionValue;
    dbt?: AssertionValue;
  };
};

export function SRAssertionDetails({ assertions }: Props) {
  const piperiderTableAssertions = assertions.piperider?.tests;
  const piperiderColumnAssertions = assertions.piperider?.columns || {};
  const dbtTableAssertions = assertions.dbt?.tests;
  const dbtColumnAssertions = assertions.dbt?.columns || {};

  if (
    !piperiderTableAssertions ||
    !dbtTableAssertions ||
    (piperiderTableAssertions.length === 0 &&
      Object.keys(piperiderColumnAssertions).length === 0) ||
    (dbtTableAssertions.length === 0 &&
      Object.keys(dbtColumnAssertions).length === 0)
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
              <Th>Assertion</Th>
              <Th>Status</Th>
              <Th>Expected</Th>
              <Th>Actual</Th>
              <Th>Source</Th>
            </Tr>
          </Thead>

          <Tbody>
            {piperiderTableAssertions.map((tableAssertion) => {
              zReport(assertionTestSchema.safeParse(tableAssertion));
              const isFailed = tableAssertion.status === 'failed';
              return (
                <Tr key={tableAssertion.name}>
                  <Td>{tableAssertion.name}</Td>
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
                  <Td>{formatTestExpectedOrActual(tableAssertion.expected)}</Td>
                  <Td color={isFailed ? 'red.500' : 'inherit'}>
                    {formatTestExpectedOrActual(tableAssertion.actual)}
                  </Td>
                  <Td>PipeRider</Td>
                </Tr>
              );
            })}

            {dbtTableAssertions.map((tableAssertion) => {
              zReport(assertionTestSchema.safeParse(tableAssertion));
              const isFailed = tableAssertion.status === 'failed';
              return (
                <Tr key={tableAssertion.name}>
                  <Td>{tableAssertion.name}</Td>
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
                  <Td>{formatTestExpectedOrActual(tableAssertion.expected)}</Td>
                  <Td color={isFailed ? 'red.500' : 'inherit'}>
                    {formatTestExpectedOrActual(tableAssertion.actual)}
                  </Td>
                  <Td>dbt</Td>
                </Tr>
              );
            })}

            {Object.keys(piperiderColumnAssertions).map((key) => {
              const columnAssertions = piperiderColumnAssertions[key];
              zReport(z.array(assertionTestSchema).safeParse(columnAssertions));

              return columnAssertions.map((columnAssertion) => {
                const isFailed = columnAssertion.status === 'failed';

                return (
                  <Tr key={columnAssertion.name}>
                    <Td>{columnAssertion.name}</Td>
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
                    <Td>
                      {formatTestExpectedOrActual(columnAssertion.expected)}
                    </Td>
                    <Td color={isFailed ? 'red.500' : 'inherit'}>
                      {formatTestExpectedOrActual(columnAssertion.actual)}
                    </Td>
                    <Td>PipeRider</Td>
                  </Tr>
                );
              });
            })}

            {Object.keys(dbtColumnAssertions).map((key) => {
              const columnAssertions = piperiderColumnAssertions[key];
              zReport(z.array(assertionTestSchema).safeParse(columnAssertions));

              return columnAssertions.map((columnAssertion) => {
                const isFailed = columnAssertion.status === 'failed';

                return (
                  <Tr key={columnAssertion.name}>
                    <Td>{columnAssertion.name}</Td>
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
                    <Td>
                      {formatTestExpectedOrActual(columnAssertion.expected)}
                    </Td>
                    <Td color={isFailed ? 'red.500' : 'inherit'}>
                      {formatTestExpectedOrActual(columnAssertion.actual)}
                    </Td>
                    <Td>dbt</Td>
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
