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

export function ReportList({ data }) {
  const { id, created_at, datasource, tables } = data;

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
        <Flex direction="column" mb={6} gap={3}>
          <Heading size={'lg'}>Data Source: {datasource.name}</Heading>
          <Text fontWeight={500}>ID: {id}</Text>
          <Text fontWeight={500}>
            Generated at: {format(new Date(created_at), 'yyyy/MM/dd HH:mm:ss')}
          </Text>
        </Flex>

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
                const report = tables[key];
                const overview = getReportAsserationStatusCounts(
                  report.assertion_results,
                );

                return (
                  <Link key={report.name} href={`/single-run/${key}`}>
                    <Tr
                      cursor={'pointer'}
                      _hover={{ bgColor: 'blackAlpha.50' }}
                    >
                      <Td>{report.name}</Td>
                      <Td>{overview.passed}</Td>
                      <Td>{overview.failed}</Td>
                      <Td>{report.row_count}</Td>
                      <Td>{report.col_count}</Td>
                    </Tr>
                  </Link>
                );
              })}
            </Tbody>
          </Table>
        </TableContainer>
      </Flex>
    </Flex>
  );
}
