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

import {
  ColumnSchema,
  SingleReportSchema,
} from '../../../../sdlc/single-report-schema';
import { Comparable, SaferTableSchema, Selectable } from '../../../../types';
import { transformAsNestedBaseTargetRecord } from '../../../../utils/transformers';
import { ColumnDetailListItem } from './ColumnDetailListItem';

type ProfilerGenericTypes = ColumnSchema['type'];
interface Props extends Selectable, Comparable {
  baseDataTables?: SingleReportSchema['tables'];
  targetDataTables?: SingleReportSchema['tables'];
  baseDataColumns?: SaferTableSchema['columns'];
  targetDataColumns?: SaferTableSchema['columns'];
  currentReport: string;
  currentColumn: string;
}
/**
 * A master list UI for showing a top-level, navigable, filterable, list of all tables and columns from datasource. Belongs in the profiling column details page to view in-depth metrics and visualizations
 */
export function ColumnDetailMasterList({
  baseDataTables,
  targetDataTables,
  baseDataColumns,
  targetDataColumns,
  currentReport,
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

  const combinedTableRecord = transformAsNestedBaseTargetRecord<
    SingleReportSchema['tables'],
    SaferTableSchema
  >(baseDataTables, targetDataTables);
  const combinedTableEntries = Object.entries(combinedTableRecord);

  //To avoid re-iterating records later
  let totalColumnCount = 0;
  let totalColumnEntries = [] as any[]; //hack: inferred never

  const masterTableColumnRecord = combinedTableEntries.map((tableEntryItem) => {
    const [tableKey, { base, target }] = tableEntryItem;
    const columnRecords = transformAsNestedBaseTargetRecord<
      SaferTableSchema['columns'],
      ColumnSchema
    >(base?.columns, target?.columns);
    const columnEntries = Object.entries(columnRecords);

    totalColumnCount += columnEntries.length;
    totalColumnEntries.push(columnEntries);

    return [tableKey, columnEntries];
  });
  console.log(masterTableColumnRecord);

  const quickFilters = Array.from(filterState.keys());

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
            Columns ({totalColumnCount})
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
        {masterTableColumnRecord
          // .filter(([, colEntryList]) => {
          //   // Logic: base-first lookup (tag filter UI)
          //   return filterState.get(base?.type) || filterState.get(target?.type);
          // })
          // .filter(([key]) =>
          //   filterString
          //     ? key.search(new RegExp(filterString, 'gi')) > -1
          //     : true,
          // )
          .map(([tableKey, colEntryList], tableIndex) => {
            if (Array.isArray(colEntryList)) {
              return colEntryList.map(
                ([colKey, { base, target }], colEntryListIndex) => (
                  <Box key={colKey}>
                    {/* HEADER - Table */}
                    {colEntryListIndex === 0 && (
                      <Flex alignItems={'center'} p={3} gap={2}>
                        <Icon as={FiGrid} color="gray.700" />
                        <Text fontWeight={'semibold'}>
                          {tableKey as string}
                        </Text>
                      </Flex>
                    )}
                    {/* LIST - Columns */}
                    <ColumnDetailListItem
                      isActive={base?.name === currentColumn}
                      baseColumnDatum={base}
                      targetColumnDatum={target}
                      onSelect={(columnName) => {
                        onSelect({ tableName: currentReport, columnName });
                      }}
                      singleOnly={singleOnly}
                      p={3}
                    />
                  </Box>
                ),
              );
            }
            return null;
          })}
      </Box>
    </Flex>
  );
}
