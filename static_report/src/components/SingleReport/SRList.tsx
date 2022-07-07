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
  Tooltip,
} from '@chakra-ui/react';
import { InfoOutlineIcon } from '@chakra-ui/icons';
import { Link } from 'wouter';

import { Main } from '../shared/Main';
import {
  getReportAsserationStatusCounts,
  formatReportTime,
  formatNumber,
} from '../../utils';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

export function SingleReportList({ data }) {
  const { id, created_at, datasource, tables } = data;

  useDocumentTitle('Report List');

  return (
    <Main>
      <Flex
        direction="column"
        border="1px solid"
        borderColor="gray.300"
        bg="white"
        borderRadius="md"
        p={6}
        width="calc(100% - 64px)"
        maxWidth="1200px"
        my={10}
      >
        <Flex direction="column" mb={6} gap={3}>
          <Heading size="lg">Data Source: {datasource.name}</Heading>
          <Text fontWeight={500}>ID: {id}</Text>
          <Text fontWeight={500}>
            Generated at: {formatReportTime(created_at)}
          </Text>
        </Flex>

        <Heading size="lg" mb={1}>
          Runs
        </Heading>

        <TableContainer>
          <Table variant="simple">
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th colSpan={2}>PipeRider</Th>
                <Th colSpan={2}>dbt</Th>
                <Th>Rows</Th>
                <Th>Columns</Th>
              </Tr>
              <Tr>
                <Th />
                <Th>Passed</Th>
                <Th>Failed</Th>
                <Th>Passed</Th>
                <Th>Failed</Th>
                <Th />
                <Th />
              </Tr>
            </Thead>
            <Tbody>
              {Object.keys(tables).map((key) => {
                const report = tables[key];

                const overview = getReportAsserationStatusCounts(
                  report.piperider_assertion_result,
                );

                // If running by `piperider run --dbt-test`, it will have this field, vice versa.
                const dbtOverview = getReportAsserationStatusCounts(
                  report?.dbt_test_result,
                );

                return (
                  <Link key={report.name} href={`/tables/${key}`}>
                    <Tr cursor="pointer" _hover={{ bgColor: 'blackAlpha.50' }}>
                      <Td>
                        {report.name}
                        <Tooltip
                          label={report.description || ''}
                          placement="right-end"
                        >
                          <InfoOutlineIcon ml={2} mb={1} />
                        </Tooltip>
                      </Td>
                      <Td>{formatNumber(overview.passed as number)}</Td>
                      <Td>{formatNumber(overview.failed as number)}</Td>
                      <Td>{formatNumber(dbtOverview.passed as number)}</Td>
                      <Td>{formatNumber(dbtOverview.failed as number)}</Td>
                      <Td>{formatNumber(report.row_count)}</Td>
                      <Td>{formatNumber(report.col_count)}</Td>
                    </Tr>
                  </Link>
                );
              })}
            </Tbody>
          </Table>
        </TableContainer>
      </Flex>
    </Main>
  );
}
