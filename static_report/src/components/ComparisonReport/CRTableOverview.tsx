import {
  TableContainer,
  Table,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
  Text,
} from '@chakra-ui/react';
import { TableSchema } from '../../sdlc/single-report-schema';
import { ZTableSchema } from '../../types';
import { getReportAggregateAssertions } from '../../utils/assertion';

type Props = {
  baseTable: TableSchema;
  inputTable: TableSchema;
};

export function CRTableOverview({ baseTable, inputTable }: Props) {
  ZTableSchema.parse(baseTable);
  ZTableSchema.parse(inputTable);

  const baseAssertions = getReportAggregateAssertions(
    baseTable.piperider_assertion_result,
    baseTable?.dbt_assertion_result,
  );
  const inputAssertions = getReportAggregateAssertions(
    inputTable.piperider_assertion_result,
    inputTable?.dbt_assertion_result,
  );

  return (
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
            <Td>Table</Td>
            <Td>{baseTable?.name ?? '-'}</Td>
            <Td>{inputTable?.name ?? '-'}</Td>
          </Tr>
          <Tr>
            <Td>Rows</Td>
            <Td>{baseTable?.row_count ?? '-'}</Td>
            <Td>{inputTable?.row_count ?? '-'}</Td>
          </Tr>
          <Tr>
            <Td>Columns</Td>
            <Td>{baseTable?.col_count ?? '-'}</Td>
            <Td>{inputTable?.col_count ?? '-'}</Td>
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
                  {inputAssertions.passed}{' '}
                </Text>
                Passed
                {', '}
                <Text
                  as="span"
                  fontWeight={700}
                  color={inputAssertions.failed > 0 ? 'red.500' : 'inherit'}
                >
                  {inputAssertions.failed}{' '}
                </Text>
                Failed
              </Text>
            </Td>
          </Tr>
        </Tbody>
      </Table>
    </TableContainer>
  );
}
