import {
  TableContainer,
  Table,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
} from '@chakra-ui/react';
import { TestStatus } from '../../shared/TestStatus';

type Props = {
  data: {};
};
export function DbtTable({ data }) {
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
              <TestStatus status={data?.base?.status as any} />
            </Td>
            <Td>{(data?.base?.message as any) ?? '-'}</Td>
          </Tr>

          <Tr>
            <Td fontWeight={700}>Input</Td>
            <Td>
              <TestStatus status={data?.input?.status as any} />
            </Td>
            <Td>{(data?.base?.message as any) ?? '-'}</Td>
          </Tr>
        </Tbody>
      </Table>
    </TableContainer>
  );
}
