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
import { getReportAggregateAssertions } from '../../utils';

type Props = {
  baseTables: TableSchema;
  inputTables: TableSchema;
};

export function CRTableOverview({ baseTables, inputTables }: Props) {
  const baseAssertions = getReportAggregateAssertions(
    baseTables.piperider_assertion_result,
    baseTables?.dbt_assertion_result,
  );
  const inputAssertions = getReportAggregateAssertions(
    inputTables.piperider_assertion_result,
    inputTables?.dbt_assertion_result,
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
            <Td>{(baseTables as any)?.name ?? '-'}</Td>
            <Td>{(inputTables as any)?.name ?? '-'}</Td>
          </Tr>
          <Tr>
            <Td>Rows</Td>
            <Td>{(baseTables as any)?.row_count ?? '-'}</Td>
            <Td>{(inputTables as any)?.row_count ?? '-'}</Td>
          </Tr>
          <Tr>
            <Td>Columns</Td>
            <Td>{(baseTables as any)?.col_count ?? '-'}</Td>
            <Td>{(inputTables as any)?.col_count ?? '-'}</Td>
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
