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
import { CompTableWithColEntryOverwrite } from '../../../../utils/store';
import { NO_DESCRIPTION_MSG } from '../../Layouts/constant';

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
  const fallbackTable = targetTableEntryDatum || baseTableEntryDatum;

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
              <Th>Description</Th>
              {visibleDetail && <Th />}
            </Tr>
          </Thead>
          <Tbody>
            {fallbackTable?.columns.map(
              ([key, { base: baseColumn, target: targetColumn }, metadata]) => {
                const fallbackColumn = targetColumn || baseColumn;
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
                        fontSize={'xs'}
                        noOfLines={1}
                        maxWidth="500px"
                        title={baseColumn?.name ?? NO_VALUE}
                      >
                        {baseColumn?.name + '' ?? NO_VALUE}
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
                      <Text as={'span'} fontSize={'xs'}>
                        {baseColumn?.schema_type ?? NO_VALUE}
                      </Text>
                    </Td>
                    {isNotSingle && (
                      <>
                        <Td
                          color={metadata?.mismatched ? 'red.500' : 'inherit'}
                          whiteSpace="normal"
                        >
                          <Text
                            fontSize={'xs'}
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
                          <Text as={'span'} fontSize={'xs'}>
                            {targetColumn?.schema_type ?? NO_VALUE}
                          </Text>
                        </Td>
                      </>
                    )}
                    <Td borderLeft={isNotSingle ? '1px solid lightgray' : ''}>
                      <Text
                        as={'p'}
                        fontSize={'xs'}
                        noOfLines={1}
                        w={'200px'}
                        textOverflow={'ellipsis'}
                      >
                        {fallbackColumn?.description ?? NO_DESCRIPTION_MSG}
                      </Text>
                    </Td>
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
