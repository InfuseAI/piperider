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
} from '@chakra-ui/react';
import { useState } from 'react';
import { useLocation } from 'wouter';

import { ColumnSchema, TableSchema } from '../../../sdlc/single-report-schema';
import { transformAsNestedBaseTargetRecord } from '../../../utils/transformers';
import { ColumnDetailListItem } from './ColumnDetailListItem';

type ProfilerGenericTypes = ColumnSchema['type'];
interface Props {
  baseDataColumns?: TableSchema['columns'];
  targetDataColumns?: TableSchema['columns'];
  currentReport: string;
}
/**
 * A master list UI for showing a top-level, navigable, filterable, list of columns. Belongs in the profiling column details page to view in-depth metrics and visualizations
 */
export function ColumnDetailsMasterList({
  baseDataColumns,
  targetDataColumns,
  currentReport,
}: Props) {
  const [filterString, setFilterString] = useState<string>('');
  const [location, setLocation] = useLocation();
  const [filterState, setFilterState] = useState<
    Map<ProfilerGenericTypes, boolean>
  >(
    new Map([
      ['boolean', true],
      ['datetime', true],
      ['integer', true],
      ['numeric', true],
      ['other', true],
      ['string', true],
    ]),
  );

  const combinedColumnRecord = transformAsNestedBaseTargetRecord<
    TableSchema['columns'],
    ColumnSchema
  >(baseDataColumns, targetDataColumns);
  const combinedColumnEntries = Object.entries(combinedColumnRecord);

  const quickFilters = Array.from(filterState.keys());

  return (
    <Flex direction={'column'} mr={2} bg={'white'}>
      <Box p={4} borderBottom={'1px solid lightgray'}>
        <Text as={'h3'} fontWeight={'bold'} mb={3}>
          Columns ({combinedColumnEntries.length})
        </Text>

        {/* Search Bar */}
        <InputGroup my={2}>
          <InputLeftElement
            pointerEvents={'none'}
            children={<SearchIcon color={'gray.300'} />}
          />
          <Input
            type={'text'}
            placeholder="Find By Column Name"
            value={filterString}
            onChange={({ target }) => setFilterString(target.value)}
          />
        </InputGroup>

        {/* Tag Toggle Filters */}
        <Box>
          <Text as={'small'}>Applied Filters:</Text>
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
                  <TagLabel color={itemValue ? 'white' : ''} fontSize={'sm'}>
                    {v}
                  </TagLabel>
                </Tag>
              );
            })}
          </Flex>
        </Box>
      </Box>

      <Box overflowY={'auto'} minHeight={'70vh'}>
        {/* QueryList */}
        {combinedColumnEntries
          .filter(([key, { base, target }]) => {
            // Logic: base-first lookup (tag filter UI)
            return filterState.get(base?.type) || filterState.get(target?.type);
          })
          .filter(([key]) =>
            filterString
              ? key.search(new RegExp(filterString, 'gi')) > -1
              : true,
          )
          .map(([key, { base, target }]) => (
            <ColumnDetailListItem
              key={key}
              baseColumnDatum={base}
              targetColumnDatum={target}
              onSelect={(name) => {
                setLocation(`/tables/${currentReport}/columns/${name}`);
              }}
              p={3}
            />
          ))}
      </Box>
    </Flex>
  );
}
