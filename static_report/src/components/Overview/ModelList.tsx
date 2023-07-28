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
import { CompDbtNodeEntryItem } from '../../lib';
import { Comparable } from '../../types';

import { getIconForChangeStatus } from '../Icons';
import { ChangeStatusWidget } from '../Widgets/ChangeStatusWidget';
import { StatDiff } from '../Widgets/StatDiff';

type Props = {
  tableColumnsOnly: CompDbtNodeEntryItem[];
  sortMethod: string;
  handleSortChange: () => void;
} & Comparable;

export function ModelList({
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
            <Th>Columns</Th>
            <Th isNumeric>Rows</Th>
            <Th isNumeric>Execution Time</Th>
            {/* <Th isNumeric>Failed Tests</Th>
              <Th isNumeric>Total Tests</Th> */}
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
                <Td>
                  {(metadata?.columns || []).length}
                  {!singleOnly &&
                    metadata.changeStatus !== 'added' &&
                    metadata.changeStatus !== 'removed' && (
                      <ChangeStatusWidget
                        added={metadata.added}
                        removed={metadata.deleted}
                        modified={metadata.changed}
                      />
                    )}
                </Td>
                <Td textAlign="right" fontSize="sm">
                  <StatDiff base={base} target={target} stat="row_count" />
                </Td>
                <Td textAlign="right" fontSize="sm">
                  <StatDiff
                    base={base}
                    target={target}
                    stat="execution_time"
                    negativeChange
                  />
                </Td>
                {/* <Td>
                    <StatDiff
                      base={base}
                      target={target}
                      stat="failed_test"
                      reverseColor
                    />
                  </Td>
                  <Td>
                    <StatDiff base={base} target={target} stat="all_test" />
                  </Td>
                  <Td></Td> */}
              </Tr>
            );
          })}
        </Tbody>
      </Table>
    </TableContainer>
  );
}
