import {
  TableContainer,
  Table,
  Thead,
  Tbody,
  Td,
  Tr,
  Th,
} from '@chakra-ui/react';
import { nanoid } from 'nanoid';

import { type TableSchema } from '../../sdlc/single-report-schema';

export function SRSchemaDetail({ table }: { table: TableSchema }) {
  return (
    <TableContainer>
      <Table variant="simple">
        <Thead>
          <Tr>
            <Th>Column</Th>
            <Th>Type</Th>
            {/* <Th width="5%" /> */}
          </Tr>
        </Thead>
        <Tbody>
          {Object.keys(table.columns).map((colName) => (
            <Tr
              key={nanoid(10)}
              _hover={{ bgColor: 'gray.50', cursor: 'pointer' }}
            >
              <Td>{table.columns[colName]?.name}</Td>
              <Td>{table.columns[colName]?.schema_type}</Td>
              {/* <Td>
                <Icon as={FiChevronRight} color="piperider.500" boxSize={6} />
              </Td> */}
            </Tr>
          ))}
        </Tbody>
      </Table>
    </TableContainer>
  );
}
