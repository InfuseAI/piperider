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
  formatReportTime,
  formatNumber,
  formatColumnValueWith,
} from '../../utils/formatters';

import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import {
  ComparisonReportSchema,
  ZComparisonTableSchema,
  zReport,
  ZSingleSchema,
} from '../../types';
import {
  SingleReportSchema,
  TableSchema,
} from '../../sdlc/single-report-schema';
import { getComparisonAssertions } from '../../utils/assertion';
import { transformAsNestedBaseTargetRecord } from '../../utils/transformers';

export function ComparisonReportList({
  data,
}: {
  data: ComparisonReportSchema;
}) {
  const { base, input: target } = data;

  zReport(ZSingleSchema.safeParse(base));
  zReport(ZSingleSchema.safeParse(target));

  const tables = transformAsNestedBaseTargetRecord<
    SingleReportSchema['tables'],
    TableSchema
  >(base.tables, target.tables);

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
                  <Th width="45%">Target</Th>
                </Tr>
              </Thead>
              <Tbody>
                <Tr>
                  <Td>ID</Td>
                  <Td>{base.id}</Td>
                  <Td>{target.id}</Td>
                </Tr>
                <Tr>
                  <Td>Data Source</Td>
                  <Td>
                    {base.datasource.name}: {base.datasource.type}
                  </Td>
                  <Td>
                    {target.datasource.name}: {target.datasource.type}
                  </Td>
                </Tr>
                <Tr>
                  <Td>Generated At</Td>
                  <Td>{formatReportTime(base.created_at)}</Td>
                  <Td>{formatReportTime(target.created_at)}</Td>
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
                'The numbers of passed tests, failed tests, rows, and columns are displayed in a side-by-side comparison (left: BASE; right: TARGET). When the table does not exist in the BASE or TARGET source, it will display "-".'
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
              <Tbody data-cy="cr-report-list">
                {Object.keys(tables).map((key) => {
                  const table = tables[key];

                  ZComparisonTableSchema(false).safeParse(table);

                  const [baseOverview, targetOverview] =
                    getComparisonAssertions({
                      data,
                      reportName: key,
                      type: 'piperider',
                    });

                  const [dbtBaseOverview, dbtTargetOverview] =
                    getComparisonAssertions({
                      data,
                      reportName: key,
                      type: 'dbt',
                    });

                  return (
                    <Link
                      key={nanoid()}
                      style={{ cursor: 'not-allowed' }}
                      href={`/tables/${key}`}
                    >
                      <Tr
                        data-cy="cr-report-list-item"
                        _hover={{ bgColor: 'blackAlpha.50' }}
                        cursor={'pointer'}
                      >
                        <Td>
                          <Flex>
                            <Text ml={2}>{key}</Text>
                          </Flex>
                        </Td>
                        <Td>
                          <Text as="span">{baseOverview.passed}</Text>
                          {' / '}
                          <Text as="span" mr={10}>
                            {targetOverview.passed}
                          </Text>

                          <Text as="span">{baseOverview.failed}</Text>
                          {' / '}
                          <Text as="span">{targetOverview.failed}</Text>
                        </Td>

                        <Td>
                          <Text as="span">{dbtBaseOverview.passed}</Text>
                          {' / '}
                          <Text as="span" mr={10}>
                            {dbtTargetOverview.passed}
                          </Text>

                          <Text as="span">{dbtBaseOverview.failed}</Text>
                          {' / '}
                          <Text as="span">{dbtTargetOverview.failed}</Text>
                        </Td>
                        {/* base | target can have mismatched columns */}
                        <Td>
                          {formatColumnValueWith(
                            table.base?.row_count,
                            formatNumber,
                          )}
                          {' / '}
                          {formatColumnValueWith(
                            table.target?.row_count,
                            formatNumber,
                          )}
                        </Td>
                        <Td>
                          {formatColumnValueWith(
                            table.base?.col_count,
                            formatNumber,
                          )}
                          {' / '}
                          {formatColumnValueWith(
                            table.target?.col_count,
                            formatNumber,
                          )}
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
