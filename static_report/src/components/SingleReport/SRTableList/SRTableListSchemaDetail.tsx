import {
  Text,
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
import { Link } from 'wouter';

import { type TableSchema } from '../../../sdlc/single-report-schema';

export function SRTableListSchemaDetail({ table }: { table: TableSchema }) {
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
            <Link
              key={nanoid(10)}
              href={`/tables/${table.name}/columns/${colName}`}
            >
              <Tr
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
            </Link>
          ))}
        </Tbody>
      </Table>
    </TableContainer>
  );
}
