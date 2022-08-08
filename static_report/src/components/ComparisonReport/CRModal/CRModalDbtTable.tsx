import {
  TableContainer,
  Table,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
} from '@chakra-ui/react';
import { NO_VALUE } from '../../shared/ColumnCard/ColumnTypeDetail/constants';
import { TestStatus } from '../../shared/TestStatus';
import { CRModalData } from './CRModal';

type Props = { data?: CRModalData };
export function DbtTable({ data }: Props) {
  return (
    <TableContainer>
      <Table variant="simple">
        <Thead>
          <Tr>
            <Th />
            <Th>Status</Th>
            <Th>Message</Th>
          </Tr>
        </Thead>

        <Tbody>
          <Tr>
            <Td fontWeight={700}>Base</Td>
            <Td>
              <TestStatus status={data?.base?.status} />
            </Td>
            <Td>{data?.base?.message ?? NO_VALUE}</Td>
          </Tr>

          <Tr>
            <Td fontWeight={700}>Target</Td>
            <Td>
              <TestStatus status={data?.target?.status} />
            </Td>
            <Td>{data?.base?.message ?? NO_VALUE}</Td>
          </Tr>
        </Tbody>
      </Table>
    </TableContainer>
  );
}
