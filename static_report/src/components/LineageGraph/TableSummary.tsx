import {
  Flex,
  Icon,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
} from '@chakra-ui/react';
import {
  CompTableColEntryItem,
  Comparable,
  NO_VALUE,
  useReportStore,
} from '../../lib';
import { VscDiffAdded, VscDiffModified, VscDiffRemoved } from 'react-icons/vsc';

interface Props extends Comparable {
  uniqueId: string;
}

export default function TableSummary({ uniqueId, singleOnly }: Props) {
  const { tableColumnsOnly = [] } = useReportStore.getState();

  const tableEntry = tableColumnsOnly.find(([key]) => key === uniqueId);
  if (!tableEntry) {
    return <>`No data found for '${uniqueId}'`</>;
  }

  const [, { base: baseTableColEntry, target: targetTableColEntry }] =
    tableEntry;
  const fallbackTable = targetTableColEntry || baseTableColEntry;

  return (
    <Flex direction="column" width="100%">
      <TableContainer width="100%">
        <Table variant="simple">
          <Thead>
            <Tr>
              {!singleOnly && <Th width={0}></Th>}
              <Th>Column</Th>
              <Th>Type</Th>
            </Tr>
          </Thead>
          <Tbody>
            {fallbackTable?.__columns?.map(
              ([key, { base: baseColumn, target: targetColumn }, metadata]) => {
                const fallbackColumn = targetColumn || baseColumn;
                let icon: any = undefined;
                let color: any;

                if (!singleOnly) {
                  if (!baseColumn) {
                    icon = VscDiffAdded;
                    color = 'green.500';
                  } else if (!targetColumn) {
                    icon = VscDiffRemoved;
                    color = 'red.500';
                  } else if (
                    baseColumn.schema_type !== targetColumn.schema_type
                  ) {
                    icon = VscDiffModified;
                    color = 'red.500';
                  } else {
                    color = 'inherit';
                  }
                }

                return (
                  <Tr
                    key={key}
                    _hover={{
                      bg: 'blackAlpha.50',
                      cursor: 'inherit',
                    }}
                    data-cy="table-list-schema-item"
                    color={color}
                  >
                    {!singleOnly && <Td>{icon && <Icon as={icon} />}</Td>}
                    <Td maxW={'350px'}>
                      <Text
                        as="span"
                        fontSize={'xs'}
                        noOfLines={1}
                        whiteSpace="normal"
                        title={baseColumn?.name ?? NO_VALUE}
                      >
                        {fallbackColumn?.name ?? NO_VALUE}
                      </Text>
                    </Td>
                    <Td borderRight="1px" borderRightColor="gray.200">
                      <Text as={'span'} fontSize={'xs'}>
                        {fallbackColumn?.schema_type ?? NO_VALUE}
                      </Text>
                    </Td>
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
