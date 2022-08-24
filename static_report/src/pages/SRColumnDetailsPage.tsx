import { SearchIcon } from '@chakra-ui/icons';
import {
  Box,
  Divider,
  Flex,
  Grid,
  GridItem,
  Input,
  InputGroup,
  InputLeftElement,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Tag,
  TagLabel,
  Text,
} from '@chakra-ui/react';
import { useState } from 'react';
import { useLocation, useRoute } from 'wouter';
import { CategoricalBarChart } from '../components/shared/Charts/CategoricalBarChart';
import { FlatStackedBarChart } from '../components/shared/Charts/FlatStackedBarChart';
import { HistogramChart } from '../components/shared/Charts/HistogramChart';
import { getDataChart } from '../components/shared/ColumnCard';
import { ColumnCardDataVisualContainer } from '../components/shared/ColumnCard/ColumnCardDataVisualContainer';
import { ColumnCardHeader } from '../components/shared/ColumnCard/ColumnCardHeader';
import { ColumnDetailListItem } from '../components/shared/ColumnDetailListItem';
import { GeneralTableColumn } from '../components/shared/GeneralTableColumn';
import { Main } from '../components/shared/Main';
import { NumericTableColumn } from '../components/shared/NumericTableColumn';
import { TextNumberTableColumn } from '../components/shared/TextNumberTableColumn';
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
  const { type, topk, histogram, trues, falses, total, min, max } = columnDatum;
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
          mr={2}
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
        <Grid
          templateColumns={'500px 1fr'}
          templateRows={'3em 1fr 1fr'}
          gap={2}
          bg={'gray.200'}
          width={'100%'}
        >
          {/* Label Block */}
          <GridItem colSpan={2} rowSpan={1}>
            <ColumnCardHeader columnDatum={columnDatum} />
          </GridItem>
          {/* Data Composition Block */}
          <GridItem p={9} bg={'white'}>
            {dataCompInput && (
              <Box mb={6}>
                <Text fontWeight={'bold'} fontSize={'xl'}>
                  Data Composition
                </Text>
                <Box height={'55px'}>
                  <FlatStackedBarChart data={dataCompInput} />
                </Box>
                <Box mt={6}>
                  <GeneralTableColumn baseColumn={columnDatum} width={'100%'} />
                </Box>
              </Box>
            )}
            {showGenericTypeComp && dynamicCompInput && (
              <Box>
                <Text fontWeight={'bold'} fontSize={'xl'}>
                  {formatTitleCase(type)} Composition
                </Text>
                <Box height={'55px'}>
                  <FlatStackedBarChart data={dynamicCompInput} />
                </Box>
                <Box mt={6}>
                  <TextNumberTableColumn
                    baseColumn={columnDatum}
                    width={'100%'}
                  />
                </Box>
              </Box>
            )}
          </GridItem>
          {/* Chart Block - toggleable tabs */}
          <GridItem gridRow={'span 1'} minWidth={0} p={9} bg={'white'}>
            <Box ml={3}>
              <Text fontWeight={'bold'} fontSize={'xl'}>
                Visualizations
              </Text>
              {/* FIXME: Weird bug when switching from 1+n tab */}
              <Tabs>
                <TabList>
                  {topk && <Tab>Categorical</Tab>}
                  {histogram && <Tab>Histogram</Tab>}
                  {trues && falses && <Tab>Boolean</Tab>}
                  {type === 'other' && <Tab>Other</Tab>}
                </TabList>

                <TabPanels>
                  {topk && (
                    <TabPanel>
                      <ColumnCardDataVisualContainer
                        p={0}
                        title={columnName}
                        allowModalPopup
                      >
                        <CategoricalBarChart data={topk} total={total || 0} />
                      </ColumnCardDataVisualContainer>
                    </TabPanel>
                  )}
                  {histogram && (
                    <TabPanel>
                      <ColumnCardDataVisualContainer
                        p={0}
                        title={columnName}
                        allowModalPopup
                      >
                        <HistogramChart
                          data={{ histogram, min, max, type, total }}
                        />
                      </ColumnCardDataVisualContainer>
                    </TabPanel>
                  )}
                  {trues && falses && (
                    <TabPanel>
                      <ColumnCardDataVisualContainer
                        p={0}
                        title={columnName}
                        allowModalPopup
                      >
                        {getDataChart(columnDatum)}
                      </ColumnCardDataVisualContainer>
                    </TabPanel>
                  )}
                  {type === 'other' && (
                    <TabPanel>
                      <ColumnCardDataVisualContainer p={0} title={columnName}>
                        {getDataChart(columnDatum)}
                      </ColumnCardDataVisualContainer>
                    </TabPanel>
                  )}
                </TabPanels>
              </Tabs>
            </Box>
          </GridItem>
          {/* Summary Block FIXME: TBD UI layout */}
          <GridItem gridRow={'span 1'} p={9} bg={'white'}>
            <Box>
              <Text fontWeight={'bold'} fontSize={'xl'}>
                {formatTitleCase(type)} Statistics
              </Text>
              <Divider my={3} />
              <NumericTableColumn baseColumn={columnDatum} width={'100%'} />
            </Box>
          </GridItem>
          {/* Quantiles Block */}
          <GridItem gridRow={'span 1'} p={9} bg={'red.300'}>
            Quantiles Block
          </GridItem>
        </Grid>
      </Flex>
    </Main>
  );
}
