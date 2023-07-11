import {
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
  Flex,
  Box,
  VStack,
  HStack,
  Menu,
  MenuButton,
  MenuList,
  IconButton,
  MenuDivider,
  MenuItemOption,
  MenuOptionGroup,
} from '@chakra-ui/react';
import { ReactNode, useMemo, useState } from 'react';
import { BsFilter } from 'react-icons/bs';
import { FaSortAlphaDown, FaSortNumericDown } from 'react-icons/fa';
import { FiInfo } from 'react-icons/fi';
import { Link } from 'wouter';
import { LineageGraphData } from '../../utils/dbt';
import { topologySort } from '../../utils/graph';
import {
  ChangeStatus,
  CompTableColEntryItem,
  useReportStore,
} from '../../utils/store';
import { SearchTextInput } from '../Common/SearchTextInput';
import { getIconForChangeStatus } from '../Icons';
import { ChangeStatusWidget } from '../Widgets/ChangeStatusWidget';
import StatDiff from '../Widgets/StatDiff';

type Props = {
  tableColumnsOnly: CompTableColEntryItem[];
  sortMethod: string;
  handleSortChange: () => void;
};

export function ModelList({
  tableColumnsOnly,
  sortMethod,
  handleSortChange,
}: Props) {
  return (
    <TableContainer>
      <Table variant="simple">
        <Thead>
          <Tr>
            <Th p={0} width="30px"></Th>
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
            const [key, { base, target }, metadata] = tableColsEntry;
            const fallback = base ?? target;
            if (!fallback) {
              return <></>;
            }

            const { icon, color } = getIconForChangeStatus(
              metadata.changeStatus,
            );

            return (
              <Tr>
                <Td p={0}>
                  <Flex alignContent="center">
                    {icon && <Icon color={color} as={icon} />}
                  </Flex>
                </Td>
                <Td pl={0}>
                  <Link
                    href={`/${fallback.resource_type}s/${fallback.unique_id}`}
                  >
                    {fallback.name}
                  </Link>
                </Td>
                <Td>
                  {`${Object.keys(fallback?.columns || {}).length}`}
                  <ChangeStatusWidget
                    added={metadata.added}
                    removed={metadata.deleted}
                    modified={metadata.changed}
                  />
                </Td>
                <Td textAlign="right" fontSize="sm">
                  <StatDiff base={base} target={target} stat="row_count" />
                </Td>
                <Td textAlign="right" fontSize="sm">
                  <StatDiff
                    base={base}
                    target={target}
                    stat="execution_time"
                    reverseColor
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
