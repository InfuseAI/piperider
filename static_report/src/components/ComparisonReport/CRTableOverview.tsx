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
import { ComparisonAssertionTests } from '../../utils';

type Props = {
  baseTables: TableSchema;
  baseOverview: ComparisonAssertionTests;
  inputTables: TableSchema;
  inputOverview: ComparisonAssertionTests;
};
export function CRTableOverview({
  baseTables,
  baseOverview,
  inputTables,
  inputOverview,
}: Props) {
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
                  {baseOverview.passed}{' '}
                </Text>
                Passed
                {', '}
                <Text
                  as="span"
                  fontWeight={700}
                  color={baseOverview.failed > 0 ? 'red.500' : 'inherit'}
                >
                  {baseOverview.failed}{' '}
                </Text>
                Failed
              </Text>
            </Td>
            <Td>
              <Text>
                <Text as="span" fontWeight={700}>
                  {inputOverview.passed}{' '}
                </Text>
                Passed
                {', '}
                <Text
                  as="span"
                  fontWeight={700}
                  color={inputOverview.failed > 0 ? 'red.500' : 'inherit'}
                >
                  {inputOverview.failed}{' '}
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
