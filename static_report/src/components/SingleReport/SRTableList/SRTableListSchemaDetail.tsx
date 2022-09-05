import {
  TableContainer,
  Table,
  Thead,
  Tbody,
  Td,
  Tr,
  Th,
  Icon,
} from '@chakra-ui/react';
import { nanoid } from 'nanoid';
import { FiChevronRight } from 'react-icons/fi';
import { Selectable } from '../../../types';
import { type TableSchema } from '../../../sdlc/single-report-schema';

interface Props extends Selectable {
  table: TableSchema;
}
export function SRTableListSchemaDetail({ table, onSelect }: Props) {
  return (
    <TableContainer>
      <Table variant="simple">
        <Thead>
          <Tr>
            <Th>Column</Th>
            <Th>Type</Th>
            <Th width="5%" />
          </Tr>
        </Thead>
        <Tbody>
          {Object.keys(table.columns).map((colName) => (
            <Tr
              key={nanoid(10)}
              onClick={() =>
                onSelect({ tableName: table.name, columnName: colName })
              }
              _hover={{ bgColor: 'gray.50', cursor: 'pointer' }}
              data-cy="sr-table-list-schema-item"
            >
              <Td>{table.columns[colName]?.name}</Td>
              <Td>{table.columns[colName]?.schema_type}</Td>
              <Td>
                <Icon as={FiChevronRight} color="piperider.500" boxSize={6} />
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </TableContainer>
  );
}
