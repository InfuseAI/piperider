import {
  Flex,
  Text,
  Box,
  Icon,
  Accordion,
  AccordionButton,
  AccordionItem,
  AccordionPanel,
  Grid,
  Link as ChakraLink,
  Tag,
  TagLabel,
  Link,
} from '@chakra-ui/react';
import { useCallback, useState } from 'react';
import { FiChevronDown, FiChevronRight } from 'react-icons/fi';
import {
  IoEye,
  IoEyeOutline,
  IoFilterCircle,
  IoFilterCircleOutline,
  IoSearchCircle,
  IoSearchCircleOutline,
} from 'react-icons/io5';
import { useLocalStorage } from 'react-use';

import { ColumnSchema } from '../../../sdlc/single-report-schema';
import { Comparable, ComparableData, Selectable } from '../../../types';
import {
  MASTER_LIST_DISPLAY_MODE,
  MASTER_LIST_SHOW_EXTRA,
} from '../../../utils';
import { formatColumnValueWith, formatNumber } from '../../../utils/formatters';
import {
  CompColEntryItem,
  CompTableColEntryItem,
  CompTableWithColEntryOverwrite,
} from '../../../utils/store';
import { SearchTextInput } from '../../Layouts/SearchTextInput';
import { TableRowColDeltaSummary } from '../../Tables/TableList/TableRowColDeltaSummary';
import { getIconForColumnType } from '../utils';
import { ColumnDetailListItem } from './ColumnDetailListItem';

type ProfilerGenericTypes = ColumnSchema['type'];
interface Props extends Selectable, Comparable {
  currentTable?: string;
  currentColumn?: string;
  tableColEntryList?: CompTableColEntryItem[];
  onNavToAssertions?: () => void;
  onNavToBM?: () => void;
  onToggleShowExtra?: () => void;
}
/**
 * A master list UI for showing a top-level, navigable, filterable, list of all tables and columns from datasource. Belongs in the profiling column details page to view in-depth metrics and visualizations
 */
export function MasterSideNav({
  tableColEntryList = [],
  currentTable,
  currentColumn,
  singleOnly,
  onSelect,
  onNavToAssertions = () => {},
  onNavToBM = () => {},
  onToggleShowExtra = () => {},
}: Props) {
  const [showExtra, setShowExtra] = useLocalStorage(MASTER_LIST_SHOW_EXTRA, '');
  const [displayMode, setDisplayMode] = useLocalStorage(
    MASTER_LIST_DISPLAY_MODE,
    '',
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

  const filterHandler = useCallback(
    (compColEntryItem?: CompTableWithColEntryOverwrite) => {
      return (
        compColEntryItem?.columns
          ?.filter(([, { base, target }]) => {
            // Logic: base-first lookup (tag filter UI)
            return filterState.get(base?.type) || filterState.get(target?.type);
          })
          .filter(([key]) =>
            filterString
              ? key.search(new RegExp(filterString, 'gi')) > -1
              : true,
          ) || []
      );
    },
    [filterState, filterString],
  );

  const filteredTableColumnEntryList = tableColEntryList.map(
    ([tableName, { base, target }, meta]) => {
      const filteredBaseColumns = filterHandler(base);
      const filteredTargetColumns = filterHandler(target);
      const filteredTableColumnEntry = [
        tableName,
        {
          base: base ? { ...base, columns: filteredBaseColumns } : undefined,
          target: target
            ? { ...target, columns: filteredTargetColumns }
            : undefined,
        },
        meta,
      ];
      return filteredTableColumnEntry as CompTableColEntryItem;
    },
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

  const SHOW_EXTRA_KEY = 'show-extra';
  const ShowExtraIcon = showExtra ? (
    <IoEye size={'1.5rem'} />
  ) : (
    <IoEyeOutline size={'1.5rem'} />
  );
  const hasShowExtra = showExtra === SHOW_EXTRA_KEY;

  return (
    <Box w={'100%'} zIndex={150} bg={'inherit'}>
      <Accordion reduceMotion allowMultiple>
        <AccordionItem border={'none'}>
          {({ isExpanded }) => (
            <>
              <h2>
                <AccordionButton py={0}>
                  {/* FILTER HEADER */}
                  <Flex
                    mt={3}
                    justifyContent={'space-between'}
                    mb={2}
                    w={'100%'}
                  >
                    <Flex alignItems={'center'} gap={2}>
                      <Icon as={isExpanded ? FiChevronDown : FiChevronRight} />
                      <Text>All Tables</Text>
                    </Flex>
                    {isExpanded && (
                      <Flex gap={2}>
                        {/* Show More info Header */}
                        <Box
                          _hover={{ cursor: 'pointer' }}
                          onClick={() => {
                            const result =
                              displayMode === SEARCH_KEY ? '' : SEARCH_KEY;
                            setDisplayMode(result);
                          }}
                        >
                          {SearchIcon}
                        </Box>
                        <Box
                          _hover={{ cursor: 'pointer' }}
                          onClick={() => {
                            const result =
                              displayMode === SCHEMA_FILTER_KEY
                                ? ''
                                : SCHEMA_FILTER_KEY;
                            setDisplayMode(result);
                          }}
                        >
                          {FilterIcon}
                        </Box>
                        <Box
                          _hover={{ cursor: 'pointer' }}
                          onClick={() => {
                            const result =
                              showExtra === SHOW_EXTRA_KEY
                                ? ''
                                : SHOW_EXTRA_KEY;
                            setShowExtra(result);
                            onToggleShowExtra && onToggleShowExtra(); // to inform parent about layout changes e.g. change grid-templates
                          }}
                        >
                          {ShowExtraIcon}
                        </Box>
                      </Flex>
                    )}
                  </Flex>
                </AccordionButton>
              </h2>
              <AccordionPanel py={0} position={'relative'} top={'-0.5em'}>
                <>
                  {/* FILTER BODY */}
                  <Box p={2}>
                    {/* Search Text Filter */}
                    {displayMode === 'search' && (
                      <SearchTextInput
                        onChange={setFilterString}
                        filterString={filterString}
                      />
                    )}
                    {/* Tag Toggle Filters */}
                    {displayMode === 'schema-filter' && (
                      <Grid templateColumns={'1fr 1fr'} gap={3}>
                        {quickFilters.map((v) => {
                          const { icon } = getIconForColumnType({ type: v });
                          const itemValue = filterState.get(v);

                          return (
                            <Tag
                              borderRadius={'xl'}
                              key={v}
                              py={3}
                              size={'lg'}
                              bg={itemValue ? 'piperider.100' : 'gray.200'}
                              onClick={() => {
                                const newState = new Map(filterState).set(
                                  v,
                                  !itemValue,
                                );
                                setFilterState(newState);
                              }}
                              cursor={'pointer'}
                            >
                              <TagLabel fontSize={'lg'}>
                                <Flex alignItems={'center'} gap={2}>
                                  <Icon as={icon} />
                                  {v}
                                </Flex>
                              </TagLabel>
                            </Tag>
                          );
                        })}
                      </Grid>
                    )}
                  </Box>
                  <Accordion reduceMotion allowMultiple>
                    {filteredTableColumnEntryList.map(
                      ([tableName, compTableColItem, meta]) => {
                        const fallbackTableEntries =
                          compTableColItem?.target || compTableColItem?.base;
                        const fallbackColEntries =
                          fallbackTableEntries?.columns;

                        const isSameTableName = currentTable === tableName;
                        const isTableActive = Boolean(
                          currentColumn === '' && isSameTableName,
                        );

                        return (
                          <AccordionItem key={tableName}>
                            {({ isExpanded }) => (
                              <>
                                <TableItemAccordionButton
                                  onSelect={onSelect}
                                  isActive={isTableActive}
                                  isExpanded={isExpanded}
                                  compTableColItem={compTableColItem}
                                  hasShowExtra={hasShowExtra}
                                  singleOnly={singleOnly}
                                />
                                <ColumnListAccordionPanel
                                  onSelect={onSelect}
                                  compColList={fallbackColEntries}
                                  currentColumn={currentColumn}
                                  currentTable={currentTable}
                                  indexedTableName={tableName}
                                  hasShowExtra={hasShowExtra}
                                  singleOnly={singleOnly}
                                />
                              </>
                            )}
                          </AccordionItem>
                        );
                      },
                    )}
                  </Accordion>
                </>
              </AccordionPanel>
            </>
          )}
        </AccordionItem>
      </Accordion>

      <Flex px={5} mt={5}>
        <ChakraLink
          onClick={() => {
            onNavToBM();
          }}
        >
          All Metrics
        </ChakraLink>
      </Flex>
      <Flex px={5} mt={5}>
        <ChakraLink
          onClick={() => {
            onNavToAssertions();
          }}
        >
          All Assertions
        </ChakraLink>
      </Flex>
    </Box>
  );
}

/**
 * TableItem: Accordion UI parent
 */
interface TableItemAccordionButtonProps extends Comparable, Selectable {
  compTableColItem: ComparableData<CompTableWithColEntryOverwrite>;
  hasShowExtra: boolean;
  isActive: boolean;
  isExpanded: boolean;
}
// * Selecting larger area will expand/collapse w/o navigating
// * Selecting text area will navigate and NOT expand/collapse
function TableItemAccordionButton({
  compTableColItem: { base: baseTable, target: targetTable },
  isActive,
  isExpanded,
  singleOnly,
  hasShowExtra,
  onSelect,
}: TableItemAccordionButtonProps) {
  const fallbackTable = targetTable || baseTable;

  return (
    <h2>
      <AccordionButton
        bg={isActive ? 'piperider.400' : 'inherit'}
        _hover={{ bg: isActive ? 'piperider.500' : 'blackAlpha.50' }}
      >
        <Flex w={'100%'} justify={'space-between'}>
          <Flex alignItems={'center'} gap={2} fontSize={'sm'}>
            <Icon
              as={isExpanded ? FiChevronDown : FiChevronRight}
              color={isActive ? 'white' : 'inherit'}
            />
            <Link
              onClick={(e) => {
                e.preventDefault();
                onSelect({ tableName: fallbackTable?.name, columnName: '' });
              }}
              noOfLines={1}
              fontWeight={isActive ? 'bold' : 'normal'}
              color={isActive ? 'white' : 'inherit'}
            >
              {fallbackTable?.name}
            </Link>
          </Flex>
          {hasShowExtra && (
            <Flex color={'gray.500'} fontSize={'sm'}>
              <Text mr={4}>Rows</Text>
              {singleOnly ? (
                <Text>
                  {formatColumnValueWith(
                    fallbackTable?.row_count,
                    formatNumber,
                  )}
                </Text>
              ) : (
                <TableRowColDeltaSummary
                  baseCount={baseTable?.row_count}
                  targetCount={targetTable?.row_count}
                />
              )}
            </Flex>
          )}
        </Flex>
      </AccordionButton>
    </h2>
  );
}

/**
 * ColumnItemList: Accordion UI Child Body
 */
interface ColumnListAccordionPanelProps extends Comparable, Selectable {
  compColList?: CompColEntryItem[];
  hasShowExtra: boolean;
  currentColumn?: string;
  currentTable?: string;
  indexedTableName: string;
}
function ColumnListAccordionPanel({
  compColList = [],
  onSelect,
  singleOnly,
  hasShowExtra,
  currentColumn,
  currentTable,
  indexedTableName,
}: ColumnListAccordionPanelProps) {
  return (
    <AccordionPanel>
      <Box>
        {compColList.map(([colKey, { base, target }]) => {
          const isActiveColumn =
            (target || base)?.name === currentColumn &&
            indexedTableName === currentTable;
          return (
            <Box key={colKey}>
              {/* LIST - Columns */}
              <ColumnDetailListItem
                isActive={isActiveColumn}
                tableName={currentTable}
                baseColumnDatum={base}
                targetColumnDatum={target}
                onSelect={(data) => {
                  onSelect({ ...data, tableName: indexedTableName });
                }}
                singleOnly={singleOnly}
                showExtra={hasShowExtra}
                p={3}
              />
            </Box>
          );
        })}
      </Box>
    </AccordionPanel>
  );
}
