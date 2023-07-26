import {
  Box,
  CloseButton,
  Flex,
  Icon,
  Menu,
  MenuButton,
  MenuDivider,
  MenuItem,
  MenuList,
  Table,
  TableContainer,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  VStack,
} from '@chakra-ui/react';
import { ColumnSchema, Comparable, NO_VALUE, useReportStore } from '../../lib';
import { VscDiffAdded, VscDiffModified, VscDiffRemoved } from 'react-icons/vsc';
import { useTableRoute } from '../../utils/routes';
import {
  ChevronDownIcon,
  TriangleDownIcon,
  TriangleUpIcon,
} from '@chakra-ui/icons';
import { useState } from 'react';
import { getStatDiff } from './util';
import { compareColumn } from '../../utils/dbt';
import { COLOR_ADDED, COLOR_CHANGED, COLOR_REMOVED } from './style';
import { getIconForColumnType } from '../Icons';

interface Props extends Comparable {
  isOpen: boolean;
  onClose: () => void;
}

const statList: [string, string, 'decimal' | 'percent'][] = [
  ['nulls_p', 'Missing%', 'percent'],
  ['distinct_p', 'Distinct%', 'percent'],
  ['duplicates_p', 'Duplicates%', 'percent'],
  ['min', 'Min', 'decimal'],
  ['max', 'Max', 'decimal'],
  ['avg', 'Avg', 'decimal'],
  ['min_length', 'Min Len.', 'decimal'],
  ['max_length', 'Max Len.', 'decimal'],
  ['avg_length', 'Avg Len.', 'decimal'],
];

function ColumnStatCell({
  baseColumn,
  targetColumn,
  stat,
}: {
  baseColumn?: Partial<ColumnSchema>;
  targetColumn?: Partial<ColumnSchema>;
  stat: string;
}) {
  const fallback = targetColumn ?? baseColumn;
  if (fallback?.type === 'string') {
    if (stat === 'min' || stat === 'max' || stat === 'avg') {
      return <></>;
    }
  }
  if (fallback?.type === 'datetime') {
    if (stat === 'min' || stat === 'max') {
      return <></>;
    }
  }

  const [, , statStyle] = statList.find(([key]) => key === stat) ?? [
    undefined,
    undefined,
    'decimal',
  ];

  const { statValueF, statDiff, statDiffF } = getStatDiff(
    baseColumn,
    targetColumn,
    stat,
    statStyle,
  );

  return (
    <VStack flex="0 1 60px" alignItems="flex-end" spacing={0} fontSize={'xs'}>
      <Text textAlign="right">{statValueF}</Text>
      {statDiff !== undefined && (
        <Box textAlign="right">
          {statDiff < 0 ? <TriangleDownIcon /> : <TriangleUpIcon />}
          {statDiffF}
        </Box>
      )}
    </VStack>
  );
}

export default function TableSummary({ singleOnly, isOpen, onClose }: Props) {
  const { tableColumnsOnly = [] } = useReportStore.getState();
  let { uniqueId } = useTableRoute();
  const [stat, setStat] = useState(statList[0][0]);
  const statName = statList.find(([key]) => key === stat)?.[1];

  if (!isOpen) {
    return <></>;
  }

  const tableEntry = tableColumnsOnly.find(([key]) => key === uniqueId);
  if (!tableEntry) {
    return <>`No data found for '${uniqueId}'`</>;
  }

  const [, { base: baseTableColEntry, target: targetTableColEntry }] =
    tableEntry;
  const fallbackTable = targetTableColEntry || baseTableColEntry;
  if (!fallbackTable?.__columns) {
    return <></>;
  }

  return (
    <Flex
      direction="column"
      width="100%"
      style={{
        background: 'white',
        width: '600px',
        borderLeft: '1px solid lightgray',
      }}
    >
      <CloseButton
        onClick={() => {
          if (onClose) onClose();
        }}
      />
      <TableContainer width="100%">
        <Table variant="simple" size="sm">
          <Thead>
            <Tr>
              {!singleOnly && <Th width={0}></Th>}
              <Th>Column</Th>
              <Th>Type</Th>
              {stat !== 'all' && (
                <Th width="100px" cursor="pointer">
                  <Menu>
                    <MenuButton as={Text}>
                      {statName}
                      <ChevronDownIcon />
                    </MenuButton>
                    <MenuList>
                      {statList.map(([key, label]) => (
                        <MenuItem
                          key={key}
                          onClick={() => {
                            setStat(key);
                          }}
                        >
                          {label}
                        </MenuItem>
                      ))}
                      <MenuDivider />
                      <MenuItem
                        key={'all'}
                        onClick={() => {
                          setStat('all');
                        }}
                      >
                        All Stats
                      </MenuItem>
                    </MenuList>
                  </Menu>
                </Th>
              )}
              {stat === 'all' &&
                statList.map(([key, label]) => (
                  <Th
                    onClick={() => {
                      setStat(key);
                    }}
                    cursor="pointer"
                  >
                    {label}
                  </Th>
                ))}
            </Tr>
          </Thead>
          <Tbody>
            {fallbackTable?.__columns?.map(
              ([key, { base: baseColumn, target: targetColumn }, metadata]) => {
                const fallbackColumn = targetColumn || baseColumn;
                let { icon } = getIconForColumnType(fallbackColumn?.type);
                let iconChangeStatus: any = undefined;
                let color: any = 'inherit';

                // if (!singleOnly) {
                //   const changeStatus = compareColumn(baseColumn, targetColumn);
                //   if (changeStatus === 'added') {
                //     iconChangeStatus = VscDiffAdded;
                //     color = COLOR_ADDED;
                //   } else if (changeStatus === 'removed') {
                //     iconChangeStatus = VscDiffRemoved;
                //     color = COLOR_REMOVED;
                //   } else if (changeStatus === 'implicit') {
                //     iconChangeStatus = VscDiffModified;
                //     color = COLOR_CHANGED;
                //   } else {
                //     color = 'inherit';
                //   }
                // }

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
                    {!singleOnly && (
                      <Td>
                        {iconChangeStatus && <Icon as={iconChangeStatus} />}
                      </Td>
                    )}
                    <Td maxW={'200px'}>
                      <Text
                        as="span"
                        fontSize={'xs'}
                        noOfLines={1}
                        whiteSpace="nowrap"
                        title={baseColumn?.name ?? NO_VALUE}
                      >
                        <Icon as={icon} mr="2" />
                        {fallbackColumn?.name ?? NO_VALUE}
                      </Text>
                    </Td>
                    <Td borderRightColor="gray.200">
                      <Text as={'span'} fontSize={'xs'}>
                        {fallbackColumn?.schema_type ?? NO_VALUE}
                      </Text>
                    </Td>
                    {stat !== 'all' && (
                      <Td borderRightColor="gray.200">
                        <ColumnStatCell
                          baseColumn={baseColumn}
                          targetColumn={targetColumn}
                          stat={stat}
                        />
                      </Td>
                    )}
                    {stat === 'all' &&
                      statList.map(([key]) => (
                        <Td borderRightColor="gray.200">
                          <ColumnStatCell
                            baseColumn={baseColumn}
                            targetColumn={targetColumn}
                            stat={key}
                          />
                        </Td>
                      ))}
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
