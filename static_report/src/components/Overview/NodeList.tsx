import {
  TableContainer,
  Table,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
  Icon,
  Tooltip,
  Flex,
  IconButton,
} from '@chakra-ui/react';

import { FaSortAlphaDown, FaSortNumericDown } from 'react-icons/fa';

import { Link } from 'wouter';
import { CompDbtNodeEntryItem, NODE_IMPACT_STATUS_MSGS } from '../../lib';
import { Comparable } from '../../types';

import { getIconForChangeStatus } from '../Icons';

type Props = {
  tableColumnsOnly: CompDbtNodeEntryItem[];
  sortMethod: string;
  handleSortChange: () => void;
} & Comparable;

export function NodeList({
  tableColumnsOnly,
  sortMethod,
  handleSortChange,
  singleOnly,
}: Props) {
  return (
    <TableContainer>
      <Table variant="simple">
        <Thead>
          <Tr>
            {!singleOnly && <Th p={0} width="30px"></Th>}
            <Th pl={0}>
              Name{' '}
              <Tooltip label={`sort by ${sortMethod} order`}>
                <IconButton
                  aria-label="Sort"
                  icon={
                    sortMethod === 'alphabet' ? (
                      <FaSortAlphaDown />
                    ) : (
                      <FaSortNumericDown />
                    )
                  }
                  onClick={handleSortChange}
                  size="sm"
                  ml="1"
                />
              </Tooltip>
            </Th>
            <Th>Type</Th>
            {!singleOnly && (
              <Th p={0} width="30px">
                Impact
              </Th>
            )}
          </Tr>
        </Thead>
        <Tbody fontSize="sm">
          {tableColumnsOnly.map((tableColsEntry, i) => {
            const [, { base, target }, metadata] = tableColsEntry;
            const fallback = target ?? base;
            if (!fallback) {
              return <></>;
            }

            const { icon, color } = getIconForChangeStatus(
              metadata.changeStatus,
            );

            let impact = '-';
            if (metadata.impactStatus) {
              impact = NODE_IMPACT_STATUS_MSGS[metadata.impactStatus][0];
            }

            return (
              <Tr>
                {!singleOnly && (
                  <Td p={0}>
                    <Flex alignContent="center">
                      {icon && <Icon color={color} as={icon} />}
                    </Flex>
                  </Td>
                )}
                <Td pl={0}>
                  <Link
                    href={`/${fallback.resource_type}s/${fallback.unique_id}`}
                  >
                    {fallback.name}
                  </Link>
                </Td>
                <Td pl={0}>{fallback.resource_type}</Td>
                {!singleOnly && <Td pl={0}>{impact}</Td>}
              </Tr>
            );
          })}
        </Tbody>
      </Table>
    </TableContainer>
  );
}
