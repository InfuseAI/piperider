import {
  TableContainer,
  Table,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
} from '@chakra-ui/react';
import { formatTestExpectedOrActual } from '../../../utils/formatters';
import { TestStatus } from '../../shared/TestStatus';

//FIXME: Props
export function PipeRiderTable({ data }: any) {
  return (
    <TableContainer>
      <Table variant="simple">
        <Thead>
          <Tr>
            <Th />
            <Th>Status</Th>
            <Th>Expected</Th>
            <Th>Actual</Th>
          </Tr>
        </Thead>

        <Tbody>
          <Tr>
            <Td fontWeight={700}>Base</Td>
            <Td>
              <TestStatus status={data?.base?.status as any} />
            </Td>
            <Td>{formatTestExpectedOrActual(data?.base?.expected)}</Td>
            <Td>{formatTestExpectedOrActual(data?.base?.actual)}</Td>
          </Tr>

          <Tr>
            <Td fontWeight={700}>Input</Td>
            <Td>
              <TestStatus status={data?.input?.status as any} />
            </Td>
            <Td>{formatTestExpectedOrActual(data?.input?.expected)}</Td>
            <Td>{formatTestExpectedOrActual(data?.input?.actual)}</Td>
          </Tr>
        </Tbody>
      </Table>
    </TableContainer>
  );
}
