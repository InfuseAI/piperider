import {
  Flex,
  TableContainer,
  Table,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
  Text,
  Icon,
} from '@chakra-ui/react';
import { FiChevronRight } from 'react-icons/fi';

import { Comparable, Selectable } from '../../../../types';
import { NO_VALUE } from '../../Columns/constants';
import { CompTableWithColEntryOverwrite } from '../store';

interface Props extends Selectable, Comparable {
  baseTableEntryDatum?: CompTableWithColEntryOverwrite;
  targetTableEntryDatum?: CompTableWithColEntryOverwrite;
  visibleDetail?: boolean; //for reuse in other pages
}
export function TableColumnSchemaList({
  baseTableEntryDatum,
  targetTableEntryDatum,
  singleOnly,
  visibleDetail = false,
  onSelect,
}: Props) {
  const fallbackTable = baseTableEntryDatum || targetTableEntryDatum;

  const isNotSingle = !singleOnly;

  return (
    <Flex direction="column" width={'100%'}>
      <TableContainer width="100%">
        <Table variant="simple">
          <Thead>
            <Tr>
              <Th>{`${isNotSingle ? 'Base' : ''} Column`}</Th>
              <Th borderRight={isNotSingle ? '1px solid lightgray' : ''}>{`${
                isNotSingle ? 'Base' : ''
              } Type`}</Th>
              {isNotSingle && (
                <>
                  <Th>{`${isNotSingle ? 'Target' : ''} Column`}</Th>
                  <Th>{`${isNotSingle ? 'Target' : ''} Column`}</Th>
                </>
              )}
              {visibleDetail && <Th />}
            </Tr>
          </Thead>
          <Tbody>
            {fallbackTable?.columns.map(
              ([key, { base: baseColumn, target: targetColumn }, metadata]) => {
                const fallbackColumn = baseColumn || targetColumn;
                return (
                  <Tr
                    key={key}
                    onClick={() =>
                      visibleDetail &&
                      onSelect({
                        tableName: fallbackTable?.name,
                        columnName: fallbackColumn?.name,
                      })
                    }
                    _hover={{
                      bg: 'blackAlpha.50',
                      cursor: visibleDetail ? 'pointer' : 'inherit',
                    }}
                    data-cy="table-list-schema-item"
                  >
                    <Td
                      whiteSpace="normal"
                      color={
                        metadata?.mismatched && isNotSingle
                          ? 'red.500'
                          : 'inherit'
                      }
                    >
                      <Text
                        as="span"
                        noOfLines={1}
                        maxWidth="250px"
                        title={baseColumn?.name ?? NO_VALUE}
                      >
                        {baseColumn?.name ?? NO_VALUE}
                      </Text>
                    </Td>
                    <Td
                      color={
                        metadata?.mismatched && isNotSingle
                          ? 'red.500'
                          : 'inherit'
                      }
                      borderRight={isNotSingle ? '1px solid lightgray' : ''}
                    >
                      {baseColumn?.schema_type ?? NO_VALUE}
                    </Td>
                    {isNotSingle && (
                      <>
                        <Td
                          color={metadata?.mismatched ? 'red.500' : 'inherit'}
                          whiteSpace="normal"
                        >
                          <Text
                            as="span"
                            noOfLines={1}
                            maxWidth="250px"
                            title={targetColumn?.name ?? NO_VALUE}
                          >
                            {targetColumn?.name ?? NO_VALUE}
                          </Text>
                        </Td>
                        <Td
                          color={metadata?.mismatched ? 'red.500' : 'inherit'}
                        >
                          {targetColumn?.schema_type ?? NO_VALUE}
                        </Td>
                      </>
                    )}
                    {visibleDetail && (
                      <Td>
                        <Icon
                          as={FiChevronRight}
                          color="piperider.500"
                          boxSize={6}
                        />
                      </Td>
                    )}
                  </Tr>
                );
              },
            )}
          </Tbody>
        </Table>
      </TableContainer>
    </Flex>
  );
}
