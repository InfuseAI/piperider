import {
  Flex,
  Text,
  Box,
  Icon,
  Accordion,
  AccordionButton,
  AccordionItem,
  AccordionPanel,
} from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { FiChevronDown, FiChevronRight } from 'react-icons/fi';
import { useLocation, useRoute } from 'wouter';

import { Comparable } from '../../types';
import { borderVal } from '../../utils';

import {
  ASSERTIONS_ROUTE_PATH,
  METRICS_ROUTE_PATH,
  COLUMN_DETAILS_ROUTE_PATH,
  TABLE_DETAILS_ROUTE_PATH,
} from '../../utils/routes';
import { CompDbtNodeEntryItem, useReportStore } from '../../utils/store';
import { ColumnListAccordionPanel } from './ColumnListAccordionPanel';
import { RoutableAccordionButton } from './RoutableAccordionButton';
import { TableItemAccordionButton } from './TableItemAccordionButton';

interface Props extends Comparable {
  isTablesIndex?: boolean;
  initAsExpandedTables?: boolean;
  tableColEntryList?: CompDbtNodeEntryItem[];
  onToggleShowExtra?: () => void;
}
/**
 * A master list UI for showing a top-level, navigable, filterable, list of all tables and columns from datasource. Belongs in the profiling column details page to view in-depth metrics and visualizations
 */
/**
 * if expanded and general is selectd, nav + expand.
 * if unexpanded and general is selected, nav + keep expanded.
 * if icon is selected, no-nav + expand.
 */
export function MasterSideNav({
  initAsExpandedTables,
  tableColEntryList = [],
  singleOnly,
}: Props) {
  let currentTable = '';
  let currentColumn = '';

  const [matchTable, paramsTable] = useRoute(TABLE_DETAILS_ROUTE_PATH);
  const [matchColumn, paramsColumn] = useRoute(COLUMN_DETAILS_ROUTE_PATH);

  const { assertionsOnly } = useReportStore.getState();
  const { metadata } = assertionsOnly || {};

  if (matchTable) {
    currentTable = paramsTable.tableName as string;
  }
  if (matchColumn) {
    currentTable = paramsColumn.tableName as string;
    currentColumn = paramsColumn.columnName as string;
  }

  //initial state depends on position of current table in tableColEntryList
  const expandedIndex = tableColEntryList.findIndex(([key]) => {
    return key === currentTable;
  });

  //If parent container passes a `initAsExpandedTables: boolean` flag, certain routes to decide whether to show as expanded or not
  const [rootTablesExpandedIndexList, setRootTablesExpandedIndexList] =
    useState<number[]>(initAsExpandedTables ? [0] : []);
  const [tablesExpandedIndexList, setTablesExpandedIndexList] = useState<
    number[]
  >([expandedIndex]);

  useEffect(() => {
    if (expandedIndex > -1) {
      setTablesExpandedIndexList([expandedIndex]);
    }
  }, [expandedIndex]);

  const [location, setLocation] = useLocation();

  return (
    <Box w={'100%'} zIndex={150} bg={'inherit'}>
      <Accordion allowToggle index={rootTablesExpandedIndexList}>
        <AccordionItem border={'none'}>
          {({ isExpanded }) => {
            const activeRoot = location === '/tables';
            return (
              <>
                <h2>
                  <AccordionButton
                    py={0}
                    _hover={{
                      bg: activeRoot ? 'piperider.400' : 'inherit',
                    }}
                    color={activeRoot ? 'white' : 'inherit'}
                    bg={activeRoot ? 'piperider.400' : 'inherit'}
                    onClick={(e) => {
                      setLocation('/');
                      setRootTablesExpandedIndexList([0]);
                    }}
                  >
                    <Flex
                      mt={3}
                      mb={2}
                      gap={2}
                      w={'100%'}
                      justifyContent={'space-between'}
                      alignItems={'center'}
                    >
                      <Text fontWeight={'medium'}>Tables</Text>
                      <Icon
                        onClick={(e) => {
                          e.stopPropagation();
                          setRootTablesExpandedIndexList(([itemIndex]) =>
                            itemIndex > -1 ? [] : [0],
                          );
                        }}
                        as={isExpanded ? FiChevronDown : FiChevronRight}
                        boxSize={5}
                        border={borderVal}
                        borderRadius={'lg'}
                        color={isExpanded && activeRoot ? 'white' : 'inherit'}
                        _hover={{ color: 'gray', bg: 'white' }}
                      />
                    </Flex>
                  </AccordionButton>
                </h2>
                <AccordionPanel py={0}>
                  <>
                    <Accordion allowToggle index={tablesExpandedIndexList}>
                      {tableColEntryList.map(
                        ([tableName, compTableColItem, meta], index) => {
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
                                    onToggle={({
                                      shouldNavigate,
                                      tableName,
                                    }) => {
                                      //conditional dual-behavior (nav + expand)
                                      const foundExpandedIndex =
                                        tablesExpandedIndexList.findIndex(
                                          (i) => i === index,
                                        );
                                      const hasExpandedIndex =
                                        foundExpandedIndex > -1;

                                      // if not in the list, add to the indexList.
                                      if (hasExpandedIndex) {
                                        setTablesExpandedIndexList([
                                          ...tablesExpandedIndexList,
                                          index,
                                        ]);
                                      }

                                      // if navigating, never close (leave that for the icon, which will always toggle accordion-item)
                                      if (shouldNavigate) {
                                        const updatedIndexList = Array.from(
                                          new Set([
                                            index,
                                            ...tablesExpandedIndexList,
                                          ]),
                                        );
                                        setTablesExpandedIndexList(
                                          updatedIndexList,
                                        ); // for updating toggled table-items
                                        setLocation(`/tables/${tableName}`);
                                      } else {
                                        //filter the existing list
                                        //found: remove; missing: add;
                                        const updatedIndexList =
                                          hasExpandedIndex
                                            ? tablesExpandedIndexList.filter(
                                                (i) => i !== index,
                                              )
                                            : Array.from(
                                                new Set([
                                                  ...tablesExpandedIndexList,
                                                  index,
                                                ]),
                                              );
                                        setTablesExpandedIndexList(
                                          updatedIndexList,
                                        );
                                      }
                                    }}
                                    isActive={isTableActive}
                                    isExpanded={isExpanded}
                                    compTableColItem={compTableColItem}
                                    singleOnly={singleOnly}
                                  />
                                  <ColumnListAccordionPanel
                                    tableName={tableName}
                                    compColList={fallbackColEntries}
                                    indexedTableName={tableName}
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
            );
          }}
        </AccordionItem>
        <AccordionItem>
          <RoutableAccordionButton title="Metrics" path={METRICS_ROUTE_PATH} />
        </AccordionItem>

        {/* Only show the Assertions Button when the report contain assertions result */}
        {(Number(metadata?.base?.total) > 0 ||
          Number(metadata?.target?.total) > 0) && (
          <AccordionItem>
            <RoutableAccordionButton
              title="Assertions"
              path={ASSERTIONS_ROUTE_PATH}
            />
          </AccordionItem>
        )}
      </Accordion>
    </Box>
  );
}
