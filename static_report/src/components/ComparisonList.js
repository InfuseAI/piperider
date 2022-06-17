import {
  Flex,
  Heading,
  Table,
  TableContainer,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Text,
} from '@chakra-ui/react';
import { Link } from 'wouter';
import { format } from 'date-fns';

import { getReportAsserationStatusCounts } from '../utils';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

function formatTime(time) {
  return format(new Date(time), 'yyyy/MM/dd HH:mm:ss');
}

export function ComparisonReportList({ data }) {
  const { id, created_at, datasource, base, input } = data;

  function joinBykey(base, input) {
    const result = {};

    Object.entries(base).map(([key, value]) => {
      if (!result[key]) {
        result[key] = {};
      }

      result[key].base = value;
    });

    Object.entries(input).map(([key, value]) => {
      if (!result[key]) {
        result[key] = {};
      }
      result[key].input = value;
    });

    return result;
  }

  const tables = joinBykey(base.tables, input.tables);

  useDocumentTitle('Report List');

  return (
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
      >
        {/* <Flex direction="column" mb={6} gap={3}>
          <Heading size={'lg'}>Data Source: {datasource.name}</Heading>
          <Text fontWeight={500}>ID: {id}</Text>
          <Text fontWeight={500}>
            Generated at: {format(new Date(created_at), 'yyyy/MM/dd HH:mm:ss')}
          </Text>
        </Flex> */}
        <Flex direction="column" gap={4}>
          <Heading>Comparison Summary</Heading>
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
                  <Td>ID</Td>
                  <Td>{base.id}</Td>
                  <Td>{input.id}</Td>
                </Tr>
                <Tr>
                  <Td>Created At</Td>
                  <Td>{formatTime(base.created_at)}</Td>
                  <Td>{formatTime(input.created_at)}</Td>
                </Tr>
              </Tbody>
            </Table>
          </TableContainer>

          <Heading size={'lg'}>Tables</Heading>
          <TableContainer>
            <Table variant={'simple'}>
              <Thead>
                <Tr>
                  <Th>Name</Th>
                  <Th>Passed</Th>
                  <Th>Failed</Th>
                  <Th>Rows</Th>
                  <Th>Columns</Th>
                </Tr>
              </Thead>
              <Tbody>
                {Object.keys(tables).map((key) => {
                  const table = tables[key];
                  const baseOverview = getReportAsserationStatusCounts(
                    table.base.assertion_results,
                  );
                  const inputOverview = getReportAsserationStatusCounts(
                    table.input.assertion_results,
                  );

                  return (
                    <Link key={table.name} href={`/tables/${key}`}>
                      <Tr
                        cursor={'pointer'}
                        _hover={{ bgColor: 'blackAlpha.50' }}
                      >
                        <Td>{key}</Td>
                        <Td>
                          {baseOverview.passed} / {inputOverview.passed}
                        </Td>
                        <Td>
                          {baseOverview.failed} / {inputOverview.failed}
                        </Td>
                        <Td>
                          {table.base.row_count} / {table.input.row_count}
                        </Td>
                        <Td>
                          {table.base.col_count} / {table.input.col_count}
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
    </Flex>
  );
}
