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
import { CRModalData } from './CRModal';

type Props = { data?: CRModalData };
export function PipeRiderTable({ data }: Props) {
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
              <TestStatus status={data?.base?.status} />
            </Td>
            <Td>{formatTestExpectedOrActual(data?.base?.expected)}</Td>
            <Td>{formatTestExpectedOrActual(data?.base?.actual)}</Td>
          </Tr>

          <Tr>
            <Td fontWeight={700}>Target</Td>
            <Td>
              <TestStatus status={data?.target?.status} />
            </Td>
            <Td>{formatTestExpectedOrActual(data?.target?.expected)}</Td>
            <Td>{formatTestExpectedOrActual(data?.target?.actual)}</Td>
          </Tr>
        </Tbody>
      </Table>
    </TableContainer>
  );
}
