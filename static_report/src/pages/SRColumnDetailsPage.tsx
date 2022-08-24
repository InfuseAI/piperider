import { SearchIcon } from '@chakra-ui/icons';
import {
  Box,
  Flex,
  Grid,
  GridItem,
  Input,
  InputGroup,
  InputLeftElement,
  Tag,
  TagLabel,
  Text,
} from '@chakra-ui/react';
import { useState } from 'react';
import { useLocation, useRoute } from 'wouter';
import { FlatStackedBarChart } from '../components/shared/Charts/FlatStackedBarChart';
import { ColumnCardHeader } from '../components/shared/ColumnCard/ColumnCardHeader';
import { ColumnDetailListItem } from '../components/shared/ColumnDetailListItem';
import { Main } from '../components/shared/Main';
import { ColumnSchema, SingleReportSchema } from '../sdlc/single-report-schema';
import { formatTitleCase } from '../utils/formatters';
import { transformCompositionAsFlatStackInput } from '../utils/transformers';
type ProfilerGenericTypes = ColumnSchema['type'];
interface Props {
  data: SingleReportSchema;
}
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
  const [match, params] = useRoute('/tables/:reportName/columns/:columnName');
  const [location, setLocation] = useLocation();

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
  const columnEntries = Object.entries(dataColumns);
  const quickFilters = Array.from(filterState.keys());

  const columnDatum = dataColumns[columnName];
  const { type } = columnDatum;
  const showGenericTypeComp =
    type === 'integer' || type === 'numeric' || type === 'string';
  const dataCompInput = transformCompositionAsFlatStackInput(
    columnDatum,
    'static',
  );
  const dynamicCompInput = transformCompositionAsFlatStackInput(
    columnDatum,
    'dynamic',
  );

  return (
    <Main>
      <Flex
        width={'inherit'}
        minHeight="90vh"
        p={1}
        bg={'gray.200'}
        direction={['column', 'row']}
      >
        {/* Master Area */}
        <Flex
          width={['100vw', '40vw']}
          direction={'column'}
          py={8}
          px={8}
          mr={3}
          bg={'white'}
        >
          <Text as={'h3'} fontWeight={'bold'} mb={3}>
            Columns ({columnEntries.length})
          </Text>
          {/* Search Filter FIXME: Extract to `TextFilterInput` */}
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
          {/* Tag Filters FIXME: Extract to `TagFilterBar` */}
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
              filterString
                ? key.search(new RegExp(filterString, 'gi')) > -1
                : true,
            )
            .map(([key, value]) => (
              <ColumnDetailListItem
                key={key}
                datum={value}
                onSelect={(name) => {
                  setLocation(`/tables/${reportName}/columns/${name}`);
                }}
                p={2}
              />
            ))}
        </Flex>

        {/* Detail Area */}
        <Flex width={'inherit'} direction={'column'} bg={'white'}>
          {/* Label Block */}
          <ColumnCardHeader columnDatum={columnDatum} />
          <Grid templateColumns={'1fr 1fr'} mt={5} gap={5}>
            {/* Data Composition Block */}
            <GridItem p={3}>
              {dataCompInput && (
                <Box m={6}>
                  <Text fontWeight={'bold'} fontSize={'xl'}>
                    Data Composition
                  </Text>
                  <Box height={'55px'}>
                    <FlatStackedBarChart data={dataCompInput} />
                  </Box>
                </Box>
              )}
              {showGenericTypeComp && dynamicCompInput && (
                <Box m={6}>
                  <Text fontWeight={'bold'} fontSize={'xl'}>
                    {formatTitleCase(type)} Composition
                  </Text>
                  <Box height={'55px'}>
                    <FlatStackedBarChart data={dynamicCompInput} />
                  </Box>
                </Box>
              )}
            </GridItem>
            {/* Histogram/Distinct Block */}
            <Box gridRow={'span 1'} bg={'red.300'}>
              Hist/Topk Block
            </Box>
            {/* Summary Block */}
            <Box gridRow={'span 2'} bg={'red.300'}>
              Summary Block
            </Box>
            {/* Quantiles Block */}
            <Box gridRow={'span 1'} bg={'red.300'}>
              Quantiles Block
            </Box>
          </Grid>
        </Flex>
      </Flex>
    </Main>
  );
}
