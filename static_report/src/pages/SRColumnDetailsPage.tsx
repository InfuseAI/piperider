import { SearchIcon } from '@chakra-ui/icons';
import {
  Box,
  Flex,
  Grid,
  Input,
  InputGroup,
  InputLeftElement,
  Tag,
  TagLabel,
  Text,
} from '@chakra-ui/react';
import { useState } from 'react';
import { useRoute } from 'wouter';
import { ColumnCardHeader } from '../components/shared/ColumnCard/ColumnCardHeader';
import { DataCompositionMetrics } from '../components/shared/ColumnCard/ColumnMetrics/DataCompositionMetrics';
import { ColumnDetailListItem } from '../components/shared/ColumnDetailListItem';
import { Main } from '../components/shared/Main';
import { ColumnSchema, SingleReportSchema } from '../sdlc/single-report-schema';
type ProfilerGenericTypes = ColumnSchema['type'];
interface Props {
  data: SingleReportSchema;
}
// {
//   [key in ProfilerGenericTypes]: boolean;
// }
export function SRColumnDetailsPage({ data: { tables } }: Props) {
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
  const [filterString, setFilterString] = useState<string>('');
  const [_, params] = useRoute('/tables/:reportName/columns/:columnName');

  if (!params?.columnName) {
    return (
      <Main>
        <Flex justifyContent="center" alignItems="center" minHeight="100vh">
          No profile column data found.
        </Flex>
      </Main>
    );
  }
  const { reportName, columnName } = params;
  const dataColumns = tables[reportName].columns;
  const columnDatum = dataColumns[columnName];
  const columnEntries = Object.entries(dataColumns);
  const quickFilters = Array.from(filterState.keys());
  return (
    <Main>
      <Flex width={'inherit'} minHeight="90vh" p={1} bg={'gray.200'}>
        {/* 
          Master Area 
          FIXME: Extract as own component?
        */}
        <Flex
          width={'40vw'}
          direction={'column'}
          py={3}
          px={2}
          mr={3}
          bg={'white'}
        >
          <Text as={'h3'} fontWeight={'bold'}>
            Columns ({columnEntries.length})
          </Text>
          {/* Search Filter */}
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
          {/* Tag Filters */}
          <Box mb={2}>
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
              filterString
                ? key.search(new RegExp(filterString, 'gi')) > -1
                : true,
            )
            .map(([key, value]) => (
              <ColumnDetailListItem key={key} datum={value} p={2} />
            ))}
        </Flex>

        {/* Detail Area */}
        <Flex width={'inherit'} direction={'column'} bg={'white'}>
          {/* Label Block */}
          <ColumnCardHeader columnDatum={columnDatum} />
          <Grid templateColumns={'1fr 1fr'} mt={5} gap={5}>
            {/* Data Composition Block */}
            <DataCompositionMetrics columnDatum={columnDatum} />
            {/* Histogram/Distinct Block */}
            <Box gridRow={'span 1'} bg={'red.300'}></Box>
            {/* Summary Block */}
            <Box gridRow={'span 2'} bg={'red.300'}></Box>
            {/* Quantiles Block */}
            <Box gridRow={'span 1'} bg={'red.300'}></Box>
          </Grid>
        </Flex>
      </Flex>
    </Main>
  );
}
