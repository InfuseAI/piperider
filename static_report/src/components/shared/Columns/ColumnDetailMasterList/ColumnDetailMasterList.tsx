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

import { ColumnSchema } from '../../../../sdlc/single-report-schema';
import { Comparable, SaferTableSchema, Selectable } from '../../../../types';
import { transformAsNestedBaseTargetRecord } from '../../../../utils/transformers';
import { ColumnDetailListItem } from './ColumnDetailListItem';

type ProfilerGenericTypes = ColumnSchema['type'];
interface Props extends Selectable, Comparable {
  baseDataColumns?: SaferTableSchema['columns'];
  targetDataColumns?: SaferTableSchema['columns'];
  currentReport: string;
  currentColumn: string;
}
// FUTURE TODO: show Table list as well ?? (Accordion)
/**
 * A master list UI for showing a top-level, navigable, filterable, list of columns. Belongs in the profiling column details page to view in-depth metrics and visualizations
 */
export function ColumnDetailMasterList({
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

  const combinedColumnRecord = transformAsNestedBaseTargetRecord<
    SaferTableSchema['columns'],
    ColumnSchema
  >(baseDataColumns, targetDataColumns);
  const combinedColumnEntries = Object.entries(combinedColumnRecord);

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
            Columns ({combinedColumnEntries.length})
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
              isActive={base?.name === currentColumn}
              baseColumnDatum={base}
              targetColumnDatum={target}
              onSelect={(columnName) => {
                onSelect({ tableName: currentReport, columnName });
              }}
              singleOnly={singleOnly}
              p={3}
            />
          ))}
      </Box>
    </Flex>
  );
}
