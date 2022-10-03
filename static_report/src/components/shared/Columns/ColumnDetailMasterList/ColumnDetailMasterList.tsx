import { SearchIcon } from '@chakra-ui/icons';
import {
  Flex,
  InputGroup,
  InputLeftElement,
  Input,
  Tag,
  TagLabel,
  Text,
  Box,
  Icon,
} from '@chakra-ui/react';
import { useState } from 'react';
import { FiGrid } from 'react-icons/fi';

import { ColumnSchema } from '../../../../sdlc/single-report-schema';
import {
  Comparable,
  SaferSRSchema,
  SaferTableSchema,
  Selectable,
} from '../../../../types';
import {
  formatColumnValueWith,
  formatNumber,
} from '../../../../utils/formatters';
import { transformAsNestedBaseTargetRecord } from '../../../../utils/transformers';
import { TableRowColDeltaSummary } from '../../Tables/TableList/TableRowColDeltaSummary';
import { ColumnDetailListItem } from './ColumnDetailListItem';

type ProfilerGenericTypes = ColumnSchema['type'];
interface Props extends Selectable, Comparable {
  baseDataTables?: SaferSRSchema['tables'];
  targetDataTables?: SaferSRSchema['tables'];
  currentTable: string;
  currentColumn: string;
}
/**
 * A master list UI for showing a top-level, navigable, filterable, list of all tables and columns from datasource. Belongs in the profiling column details page to view in-depth metrics and visualizations
 */
export function ColumnDetailMasterList({
  baseDataTables,
  targetDataTables,
  currentTable,
  currentColumn,
  singleOnly,
  onSelect,
}: Props) {
  const [filterString, setFilterString] = useState<string>('');
  const [filterState, setFilterState] = useState<
    Map<ProfilerGenericTypes | undefined, boolean>
  >(
    new Map([
      ['string', true],
      ['numeric', true],
      ['integer', true],
      ['datetime', true],
      ['boolean', true],
      ['other', true],
    ]),
  );
  const baseTable = baseDataTables?.[currentTable];
  const targetTable = targetDataTables?.[currentTable];
  const fallbackTable = baseTable || targetTable;

  const combinedColumnRecord = transformAsNestedBaseTargetRecord<
    SaferTableSchema['columns'],
    ColumnSchema
  >(baseTable?.columns, targetTable?.columns);

  const combinedTableColumnEntries = Object.entries(combinedColumnRecord);

  const quickFilters = Array.from(filterState.keys());

  const filteredTableColumnEntries = combinedTableColumnEntries
    .filter(([, { base, target }]) => {
      // Logic: base-first lookup (tag filter UI)
      return filterState.get(base?.type) || filterState.get(target?.type);
    })
    .filter(([key]) =>
      filterString ? key.search(new RegExp(filterString, 'gi')) > -1 : true,
    );

  return (
    <Flex direction={'column'} position={'relative'}>
      <Box
        position={'sticky'}
        top={0}
        w={'100%'}
        p={4}
        zIndex={150}
        bg={'blue.800'}
        color={'white'}
        borderBottom={'1px solid lightgray'}
      >
        <Flex justify={'space-between'} alignItems={'center'} mb={3}>
          <Text as={'h3'} fontWeight={'bold'} textAlign={'right'}>
            Columns ({filteredTableColumnEntries.length})
          </Text>
        </Flex>

        {/* Search Bar */}
        <InputGroup my={2}>
          <InputLeftElement
            pointerEvents={'none'}
            children={<SearchIcon color={'gray.300'} />}
          />
          <Input
            bg={'white'}
            color={'black'}
            type={'text'}
            placeholder="Find By Column Name"
            value={filterString}
            onChange={({ target }) => setFilterString(target.value)}
          />
        </InputGroup>

        {/* Tag Toggle Filters */}
        <Box>
          <Text as={'small'}>View Types:</Text>
          <Flex alignItems={'center'}>
            {quickFilters.map((v) => {
              const itemValue = filterState.get(v);
              return (
                <Tag
                  key={v}
                  m={1}
                  backgroundColor={itemValue ? 'piperider.300' : ''}
                  onClick={() => {
                    const newState = new Map(filterState).set(v, !itemValue);
                    setFilterState(newState);
                  }}
                  cursor={'pointer'}
                >
                  <TagLabel
                    color={itemValue ? 'white' : 'lightgray'}
                    fontSize={'sm'}
                  >
                    {v}
                  </TagLabel>
                </Tag>
              );
            })}
          </Flex>
        </Box>
      </Box>

      <Box minHeight={'70vh'} bg={'white'}>
        {/* QueryList */}
        {/* HEADER - Table */}
        <Flex
          top={0}
          p={5}
          cursor={'pointer'}
          justify={'space-between'}
          bg={currentColumn === '' && currentTable ? 'blue.100' : 'white'}
          _hover={{ bgColor: 'blackAlpha.50' }}
          onClick={() => {
            onSelect({ tableName: currentTable, columnName: '' });
          }}
        >
          <Flex alignItems={'center'} gap={2}>
            <Icon as={FiGrid} color="piperider.500" />
            <Text noOfLines={1}>{currentTable}</Text>
          </Flex>
          <Flex color="gray.500">
            <Text mr={4}>Rows</Text>
            {singleOnly ? (
              <Text>
                {formatColumnValueWith(fallbackTable?.row_count, formatNumber)}
              </Text>
            ) : (
              <TableRowColDeltaSummary
                baseCount={baseTable?.row_count}
                targetCount={targetTable?.row_count}
              />
            )}
          </Flex>
        </Flex>
        {filteredTableColumnEntries.map(([colKey, { base, target }]) => {
          return (
            <Box key={colKey}>
              {/* LIST - Columns */}
              <ColumnDetailListItem
                isActive={base?.name === currentColumn}
                tableName={currentTable}
                baseColumnDatum={base}
                targetColumnDatum={target}
                onSelect={(data) => {
                  onSelect(data);
                }}
                singleOnly={singleOnly}
                p={3}
              />
            </Box>
          );
        })}
      </Box>
    </Flex>
  );
}
