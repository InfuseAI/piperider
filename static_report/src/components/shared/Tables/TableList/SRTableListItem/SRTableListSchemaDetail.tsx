import {
  TableContainer,
  Table,
  Thead,
  Tbody,
  Td,
  Tr,
  Th,
  Icon,
  Text,
} from '@chakra-ui/react';
import { nanoid } from 'nanoid';
import { FiChevronRight } from 'react-icons/fi';

import type { TableSchema } from '../../../../../sdlc/single-report-schema';
import type { Selectable } from '../../../../../types';

interface Props extends Selectable {
  table: TableSchema;
}

export function SRTableListSchemaDetail({ table, onSelect }: Props) {
  return (
    <TableContainer width="100%" maxWidth="calc(900px - 30px)">
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
              <Td whiteSpace="normal">
                <Text
                  as="span"
                  noOfLines={1}
                  maxWidth="250px"
                  title={table.columns[colName]?.name}
                >
                  {table.columns[colName]?.name}
                </Text>
              </Td>
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
