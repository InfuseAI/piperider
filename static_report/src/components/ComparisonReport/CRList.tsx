import {
  Flex,
  Heading,
  Table,
  TableContainer,
  Tbody,
  Text,
  Td,
  Th,
  Thead,
  Tr,
  Tooltip,
} from '@chakra-ui/react';
import { InfoIcon } from '@chakra-ui/icons';
import { Link } from 'wouter';
import { nanoid } from 'nanoid';

import { Main } from '../shared/Main';

import {
  getComparisonAssertions,
  formatReportTime,
  formatNumber,
  nestComparisonValueByKey,
} from '../../utils';

import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import type { ComparisonReportSchema } from '../../sdlc/comparison-report-schema';

export function ComparisonReportList({
  data,
}: {
  data: ComparisonReportSchema;
}) {
  const { base, input } = data;

  const tables = nestComparisonValueByKey(base.tables, input.tables);

  useDocumentTitle('Report List');

  return (
    <Main>
      <Flex
        direction="column"
        border="1px solid"
        borderColor="gray.300"
        bg="white"
        borderRadius="md"
        width="calc(100% - 64px)"
        maxWidth="1200px"
        p={6}
        my={10}
      >
        <Flex direction="column" gap={4}>
          <Heading>Comparison Summary</Heading>
          <TableContainer>
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th width="10%" />
                  <Th width="45%">Base</Th>
                  <Th width="45%">Input</Th>
                </Tr>
              </Thead>
              <Tbody>
                <Tr>
                  <Td>ID</Td>
                  <Td>{base.id}</Td>
                  <Td>{input.id}</Td>
                </Tr>
                <Tr>
                  <Td>Data Source</Td>
                  <Td>
                    {base.datasource.name}: {base.datasource.type}
                  </Td>
                  <Td>
                    {input.datasource.name}: {input.datasource.type}
                  </Td>
                </Tr>
                <Tr>
                  <Td>Generated At</Td>
                  <Td>{formatReportTime(base.created_at)}</Td>
                  <Td>{formatReportTime(input.created_at)}</Td>
                </Tr>
              </Tbody>
            </Table>
          </TableContainer>

          <Flex gap={2}>
            <Heading size="lg" mb={1}>
              Tables
            </Heading>
            <Tooltip
              label={
                'The numbers of passed tests, failed tests, rows, and columns are displayed in a side-by-side comparison (left: BASE; right: INPUT). When the table does not exist in the BASE or INPUT source, it will display "-".'
              }
            >
              <InfoIcon mt={1} color="gray.400" boxSize={'14px'} />
            </Tooltip>
          </Flex>

          <TableContainer>
            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Name</Th>
                  <Th>PipeRider</Th>
                  <Th>dbt</Th>
                  <Th>Rows</Th>
                  <Th>Columns</Th>
                </Tr>
                <Tr>
                  <Th />
                  <Th>
                    <Text as="span" mr={8}>
                      Passed
                    </Text>
                    <Text as="span">Failed</Text>
                  </Th>
                  <Th>
                    <Text as="span" mr={8}>
                      Passed
                    </Text>
                    <Text as="span">Failed</Text>
                  </Th>
                  <Th />
                  <Th />
                </Tr>
              </Thead>
              <Tbody>
                {Object.keys(tables).map((key) => {
                  const table = tables[key];

                  const [baseOverview, inputOverview] = getComparisonAssertions(
                    {
                      data,
                      reportName: key,
                      type: 'piperider',
                    },
                  );

                  const [dbtBaseOverview, dbtInputOverview] =
                    getComparisonAssertions({
                      data,
                      reportName: key,
                      type: 'dbt',
                    });

                  return (
                    <Link key={nanoid()} href={`/tables/${key}`}>
                      <Tr
                        cursor="pointer"
                        _hover={{ bgColor: 'blackAlpha.50' }}
                      >
                        <Td>{key}</Td>
                        <Td>
                          <Text as="span">{baseOverview.passed}</Text>
                          {' / '}
                          <Text as="span" mr={10}>
                            {inputOverview.passed}
                          </Text>

                          <Text as="span">{baseOverview.failed}</Text>
                          {' / '}
                          <Text as="span">{inputOverview.failed}</Text>
                        </Td>

                        <Td>
                          <Text as="span">{dbtBaseOverview.passed}</Text>
                          {' / '}
                          <Text as="span" mr={10}>
                            {dbtInputOverview.passed}
                          </Text>

                          <Text as="span">{dbtBaseOverview.failed}</Text>
                          {' / '}
                          <Text as="span">{dbtInputOverview.failed}</Text>
                        </Td>

                        <Td>
                          {table.base?.row_count
                            ? formatNumber(table.base.row_count as number)
                            : '-'}
                          {' / '}
                          {table.input?.row_count
                            ? formatNumber(table.input.row_count as number)
                            : '-'}
                        </Td>
                        <Td>
                          {table.base?.col_count
                            ? formatNumber(table.base.col_count as number)
                            : '-'}
                          {' / '}
                          {table.input?.col_count
                            ? formatNumber(table.input?.col_count as number)
                            : '-'}
                        </Td>
                      </Tr>
                    </Link>
                  );
                })}
              </Tbody>
            </Table>
          </TableContainer>
        </Flex>
      </Flex>
    </Main>
  );
}
