import {
  Box,
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
import {
  ColumnSchema,
  Comparable,
  NO_VALUE,
  getIconForColumnType,
  useReportStore,
} from '../../lib';
import { VscDiffAdded, VscDiffModified, VscDiffRemoved } from 'react-icons/vsc';
import { useTableRoute } from '../../utils/routes';
import {
  ChevronDownIcon,
  TriangleDownIcon,
  TriangleUpIcon,
} from '@chakra-ui/icons';
import { useState } from 'react';
import { getStatDiff } from './util';

interface Props extends Comparable {
  uniqueId: string;
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

  const { statValueF, statChange, statChangeP } = getStatDiff(
    baseColumn,
    targetColumn,
    stat,
    statStyle,
  );

  return (
    <VStack flex="0 1 60px" alignItems="flex-end" spacing={0} fontSize={'xs'}>
      <Text textAlign="right">{statValueF}</Text>
      {statChange !== undefined && (
        <Box textAlign="right" color={statChange < 0 ? 'red' : 'green'}>
          {statChange < 0 ? <TriangleDownIcon /> : <TriangleUpIcon />}
          {statChangeP}
        </Box>
      )}
    </VStack>
  );
}

export default function TableSummary({ singleOnly }: Props) {
  const { tableColumnsOnly = [] } = useReportStore.getState();
  let { uniqueId } = useTableRoute();
  const [stat, setStat] = useState(statList[0][0]);
  const statName = statList.find(([key]) => key === stat)?.[1];

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
        position: 'absolute',
        background: 'white',
        top: 0,
        right: 0,
        bottom: 0,
        width: '600px',
        borderLeft: '1px solid lightgray',
        overflow: 'scroll',
      }}
    >
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
                let color: any;

                if (!singleOnly) {
                  if (!baseColumn) {
                    iconChangeStatus = VscDiffAdded;
                    color = 'green.500';
                  } else if (!targetColumn) {
                    iconChangeStatus = VscDiffRemoved;
                    color = 'red.500';
                  } else if (
                    baseColumn.schema_type !== targetColumn.schema_type
                  ) {
                    iconChangeStatus = VscDiffModified;
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
