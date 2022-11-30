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
  Tooltip,
} from '@chakra-ui/react';
import { FiChevronRight } from 'react-icons/fi';

import { Comparable, Selectable } from '../../../../types';
import { NO_VALUE } from '../../Columns/constants';
import { CompTableWithColEntryOverwrite } from '../../../../utils/store';
import { NO_DESCRIPTION_MSG } from '../../Layouts/constant';
import { tableListWidth } from '../../../../utils/layout';

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
    <Flex direction="column" width={tableListWidth}>
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
                      color={
                        metadata?.mismatched && isNotSingle
                          ? 'red.500'
                          : 'inherit'
                      }
                      maxW={'350px'}
                    >
                      <Text
                        as="span"
                        fontSize={'xs'}
                        noOfLines={1}
                        whiteSpace="normal"
                        title={baseColumn?.name ?? NO_VALUE}
                      >
                        {baseColumn?.name +
                          'aa;woeijfweofijweofijweofjweoifa;woeijfweofijweofijweofjweoif;woeijfweofijweofijweofjweoif' ??
                          NO_VALUE}
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
                            whiteSpace={'normal'}
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
                    <Td
                      borderLeft={isNotSingle ? '1px solid lightgray' : ''}
                      pr={0}
                      maxW={'300px'}
                    >
                      <Tooltip
                        label={
                          fallbackColumn?.description ?? NO_DESCRIPTION_MSG
                        }
                      >
                        <Text
                          as={'p'}
                          fontSize={'xs'}
                          noOfLines={1}
                          textOverflow={'ellipsis'}
                          whiteSpace={'normal'}
                        >
                          {fallbackColumn?.description ??
                            NO_VALUE +
                              'lorem ips sfefsf sefsef sefeloremlorem ips sfefsf sefsef sefe'}
                        </Text>
                      </Tooltip>
                    </Td>
                    {visibleDetail && (
                      <Td p={0}>
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
