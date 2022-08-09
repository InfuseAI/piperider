import {
  TableContainer,
  Table,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
  Text,
  Heading,
  Flex,
} from '@chakra-ui/react';
import { TableSchema } from '../../sdlc/single-report-schema';
import { zReport, ZTableSchema } from '../../types';
import { getReportAggregateAssertions } from '../../utils/assertion';
import { NO_VALUE } from '../shared/ColumnCard/ColumnTypeDetail/constants';

type Props = {
  baseTable: TableSchema;
  targetTable: TableSchema;
};

export function CRTableOverview({ baseTable, targetTable }: Props) {
  zReport(ZTableSchema.safeParse(baseTable));
  zReport(ZTableSchema.safeParse(targetTable));

  const baseAssertions = getReportAggregateAssertions(
    baseTable?.piperider_assertion_result,
    baseTable?.dbt_assertion_result,
  );
  const targetAssertions = getReportAggregateAssertions(
    targetTable?.piperider_assertion_result,
    targetTable?.dbt_assertion_result,
  );

  return (
    <Flex gap={4} direction={'column'}>
      <Heading fontSize={24}>Overview</Heading>
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
              <Td>Table</Td>
              <Td>{baseTable?.name ?? NO_VALUE}</Td>
              <Td>{targetTable?.name ?? NO_VALUE}</Td>
            </Tr>
            <Tr>
              <Td>Rows</Td>
              <Td>{baseTable?.row_count ?? NO_VALUE}</Td>
              <Td>{targetTable?.row_count ?? NO_VALUE}</Td>
            </Tr>
            <Tr>
              <Td>Columns</Td>
              <Td>{baseTable?.col_count ?? NO_VALUE}</Td>
              <Td>{targetTable?.col_count ?? NO_VALUE}</Td>
            </Tr>
            <Tr>
              <Td>Test status</Td>
              <Td>
                <Text>
                  <Text as="span" fontWeight={700}>
                    {baseAssertions.passed}{' '}
                  </Text>
                  Passed
                  {', '}
                  <Text
                    as="span"
                    fontWeight={700}
                    color={baseAssertions.failed > 0 ? 'red.500' : 'inherit'}
                  >
                    {baseAssertions.failed}{' '}
                  </Text>
                  Failed
                </Text>
              </Td>
              <Td>
                <Text>
                  <Text as="span" fontWeight={700}>
                    {targetAssertions.passed}{' '}
                  </Text>
                  Passed
                  {', '}
                  <Text
                    as="span"
                    fontWeight={700}
                    color={targetAssertions.failed > 0 ? 'red.500' : 'inherit'}
                  >
                    {targetAssertions.failed}{' '}
                  </Text>
                  Failed
                </Text>
              </Td>
            </Tr>
          </Tbody>
        </Table>
      </TableContainer>
    </Flex>
  );
}
