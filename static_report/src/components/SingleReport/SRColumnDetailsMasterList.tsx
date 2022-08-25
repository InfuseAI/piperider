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

import { ColumnSchema, TableSchema } from '../../sdlc/single-report-schema';
import { ColumnDetailListItem } from '../shared/ColumnDetailListItem';

type ProfilerGenericTypes = ColumnSchema['type'];
interface Props {
  dataColumns: TableSchema['columns'];
  currentReport: string;
}
export function SRColumnDetailsMasterList({
  dataColumns,
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
  const columnEntries = Object.entries(dataColumns);
  const quickFilters = Array.from(filterState.keys());

  return (
    <Flex
      width={['100vw', '40vw']}
      overflowY={'auto'}
      direction={'column'}
      p={8}
      mr={2}
      bg={'white'}
    >
      <Text as={'h3'} fontWeight={'bold'} mb={3}>
        Columns ({columnEntries.length})
      </Text>
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
      <Box mb={6}>
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
      {/* QueryList */}
      {columnEntries
        .filter(([key, { type }]) => filterState.get(type))
        .filter(([key]) =>
          filterString ? key.search(new RegExp(filterString, 'gi')) > -1 : true,
        )
        .map(([key, value]) => (
          <ColumnDetailListItem
            key={key}
            datum={value}
            onSelect={(name) => {
              setLocation(`/tables/${currentReport}/columns/${name}`);
            }}
            p={2}
          />
        ))}
    </Flex>
  );
}
