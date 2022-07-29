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
import { InfoOutlineIcon } from '@chakra-ui/icons';
import { Link } from 'wouter';

import { Main } from '../shared/Main';
import { SRTooltip } from './SRTooltip';
import {
  formatReportTime,
  formatNumber,
  formatColumnValueWith,
} from '../../utils/formatters';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { SingleReportSchema } from '../../sdlc/single-report-schema';
import { singleReportSchemaSchema } from '../../sdlc/single-report-schema.z';
import { zReport, ZTableSchema } from '../../types';
import { getSingleAssertionStatusCounts } from '../../utils/assertion';

type Props = { data: SingleReportSchema };
export function SingleReportList({ data }: Props) {
  const { id, created_at, datasource, tables } = data;
  zReport(
    singleReportSchemaSchema
      .pick({ id: true, created_at: true, datasource: true })
      .safeParse({ id, created_at, datasource }),
  );

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
            <Tbody data-cy="sr-report-list">
              {Object.keys(tables).map((key) => {
                const report = tables[key];
                zReport(ZTableSchema.safeParse(report));

                const pipeRideroverview = getSingleAssertionStatusCounts(
                  report.piperider_assertion_result,
                );

                // If running by `piperider run --dbt-test`, it will have this field, vice versa.
                const dbtOverview = getSingleAssertionStatusCounts(
                  report.dbt_assertion_result,
                );

                return (
                  <Link key={report.name} href={`/tables/${key}`}>
                    <Tr
                      cursor="pointer"
                      _hover={{ bgColor: 'blackAlpha.50' }}
                      data-cy="sr-report-list-item"
                    >
                      <Td>
                        {report.name}
                        <SRTooltip
                          label={report.description}
                          prefix={' - via '}
                          placement="right-end"
                        >
                          <InfoOutlineIcon ml={2} mb={1} />
                        </SRTooltip>
                      </Td>
                      <Td>
                        {formatColumnValueWith(
                          pipeRideroverview.passed,
                          formatNumber,
                        )}
                      </Td>
                      <Td>
                        {formatColumnValueWith(
                          pipeRideroverview.failed,
                          formatNumber,
                        )}
                      </Td>
                      <Td>
                        {formatColumnValueWith(
                          dbtOverview.passed,
                          formatNumber,
                        )}
                      </Td>
                      <Td>
                        {formatColumnValueWith(
                          dbtOverview.failed,
                          formatNumber,
                        )}
                      </Td>
                      <Td>
                        {formatColumnValueWith(report.row_count, formatNumber)}
                      </Td>
                      <Td>
                        {formatColumnValueWith(report.col_count, formatNumber)}
                      </Td>
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
