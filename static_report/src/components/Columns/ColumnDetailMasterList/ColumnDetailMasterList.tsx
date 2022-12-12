import { Flex, Tag, TagLabel, Text, Box, Icon, Grid } from '@chakra-ui/react';
import { useState } from 'react';
import { FiGrid } from 'react-icons/fi';
import {
  IoFilterCircle,
  IoFilterCircleOutline,
  IoSearchCircle,
  IoSearchCircleOutline,
} from 'react-icons/io5';

import { ColumnSchema } from '../../../sdlc/single-report-schema';
import { Comparable, Selectable } from '../../../types';
import { MASTER_LIST_DISPLAY_MODE } from '../../../utils';
import { formatColumnValueWith, formatNumber } from '../../../utils/formatters';
import { CompTableColEntryItem } from '../../../utils/store';
import { SearchTextInput } from '../../Layouts/SearchTextInput';
import { TableRowColDeltaSummary } from '../../Tables/TableList/TableRowColDeltaSummary';
import { getIconForColumnType } from '../utils';
import { ColumnDetailListItem } from './ColumnDetailListItem';

type ProfilerGenericTypes = ColumnSchema['type'];
interface Props extends Selectable, Comparable {
  tableColEntry: CompTableColEntryItem;
  currentTable: string;
  currentColumn: string;
}
/**
 * A master list UI for showing a top-level, navigable, filterable, list of all tables and columns from datasource. Belongs in the profiling column details page to view in-depth metrics and visualizations
 * 
 *  1. Don't crop the text is the space is enough
    2. If the width is less than n (e.g. 400), shrink the bar first
    3. Should reference the MBP screen size
 */
export function ColumnDetailMasterList({
  tableColEntry,
  currentTable,
  currentColumn,
  singleOnly,
  onSelect,
}: Props) {
  const [displayMode, setDisplayMode] = useState<string | null>(
    localStorage.getItem(MASTER_LIST_DISPLAY_MODE) ?? null,
  );
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
  const quickFilters = Array.from(filterState.keys());
  const [, { base: baseTable, target: targetTable }] = tableColEntry;
  // target is placed before fallback as it represents the target of change

  const fallbackTable = targetTable || baseTable;
  const fallbackColumns = fallbackTable?.columns || [];

  const filteredTableColumnEntries = fallbackColumns
    .filter(([, { base, target }]) => {
      // Logic: base-first lookup (tag filter UI)
      return filterState.get(base?.type) || filterState.get(target?.type);
    })
    .filter(([key]) =>
      filterString ? key.search(new RegExp(filterString, 'gi')) > -1 : true,
    );

  const SEARCH_KEY = 'search';
  const SearchIcon =
    displayMode === SEARCH_KEY ? (
      <IoSearchCircle size={'1.5rem'} />
    ) : (
      <IoSearchCircleOutline size={'1.5rem'} />
    );

  const SCHEMA_FILTER_KEY = 'schema-filter';
  const FilterIcon =
    displayMode === SCHEMA_FILTER_KEY ? (
      <IoFilterCircle size={'1.5rem'} />
    ) : (
      <IoFilterCircleOutline size={'1.5rem'} />
    );

  return (
    <Flex direction={'column'} position={'relative'} bg={'piperider.25'}>
      <Box
        position={'sticky'}
        top={0}
        w={'100%'}
        p={4}
        zIndex={150}
        borderBottom={'1px solid lightgray'}
      >
        <Flex justifyContent={'space-between'} alignItems={'center'}>
          <Text fontSize={'md'} color={'gray.500'}>
            {filteredTableColumnEntries.length} Columns
          </Text>
          <Flex gap={2}>
            <Box
              onClick={() => {
                //FIXME: set localstorage
                setDisplayMode((prev) =>
                  prev === SEARCH_KEY ? null : SEARCH_KEY,
                );
              }}
            >
              {SearchIcon}
            </Box>
            <Box
              onClick={() => {
                //FIXME: set localstorage
                setDisplayMode((prev) =>
                  prev === SCHEMA_FILTER_KEY ? null : SCHEMA_FILTER_KEY,
                );
              }}
            >
              {FilterIcon}
            </Box>
          </Flex>
        </Flex>
        {/* <TableSelector /> */}
        {displayMode === 'search' && (
          <SearchTextInput
            onChange={setFilterString}
            filterString={filterString}
          />
        )}

        {/* Tag Toggle Filters */}
        {displayMode === 'schema-filter' && (
          <Box mt={3} p={3}>
            <Grid templateColumns={'1fr 1fr'} gap={3}>
              {quickFilters.map((v) => {
                const itemValue = filterState.get(v);
                return (
                  <Tag
                    borderRadius={'xl'}
                    key={v}
                    py={3}
                    size={'lg'}
                    backgroundColor={itemValue ? 'piperider.100' : ''}
                    onClick={() => {
                      const newState = new Map(filterState).set(v, !itemValue);
                      setFilterState(newState);
                    }}
                    cursor={'pointer'}
                  >
                    <TagLabel fontSize={'lg'}>{v}</TagLabel>
                  </Tag>
                );
              })}
            </Grid>
          </Box>
        )}
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
          <Flex alignItems={'center'} gap={2} fontSize={'sm'}>
            <Icon as={FiGrid} color="piperider.500" />
            <Text noOfLines={1}>{currentTable}</Text>
          </Flex>
          <Flex color="gray.500" fontSize={'sm'}>
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
                isActive={(target || base)?.name === currentColumn}
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
