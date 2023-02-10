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
import { useState } from 'react';
import { FiChevronDown, FiChevronRight } from 'react-icons/fi';
import { useLocalStorage } from 'react-use';

import { Comparable, Selectable } from '../../../types';
import { MASTER_LIST_SHOW_EXTRA } from '../../../utils';
import { CompTableColEntryItem } from '../../../utils/store';
import { ColumnListAccordionPanel } from './ColumnListAccordionPanel';
import { TableItemAccordionButton } from './TableItemAccordionButton';

interface Props extends Selectable, Comparable {
  activeMasterParent?: string;
  isTablesIndex?: boolean;
  initAsExpandedTables?: boolean;
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
/**
 * if expanded and general is selectd, nav + expand.
 * if unexpanded and general is selected, nav + keep expanded.
 * if icon is selected, no-nav + expand.
 */
export function MasterSideNav({
  activeMasterParent,
  initAsExpandedTables,
  tableColEntryList = [],
  currentTable,
  currentColumn,
  singleOnly,
  onSelect,
  onNavToAssertions = () => {},
  onNavToBM = () => {},
}: Props) {
  // eslint-disable-next-line
  const [placeholder] = useLocalStorage(MASTER_LIST_SHOW_EXTRA, '');

  //initial state depends on position of current table in tableColEntryList
  const initialIndex = tableColEntryList.findIndex(
    ([key]) => key === currentTable,
  );

  //If parent container passes a `initAsExpandedTables: boolean` flag, certain routes can decide whether to show as expanded or not when navigating
  const [rootTablesExpandedIndexList, setRootTablesExpandedIndexList] =
    useState<number[]>(initAsExpandedTables ? [0] : []);
  const [tablesExpandedIndexList, setTablesExpandedIndexList] = useState<
    number[]
  >([initialIndex]);

  return (
    <Box w={'100%'} zIndex={150} bg={'inherit'}>
      <Accordion allowToggle index={rootTablesExpandedIndexList}>
        <AccordionItem border={'none'}>
          {({ isExpanded }) => (
            <>
              <h2>
                <AccordionButton
                  py={0}
                  _hover={{
                    bg:
                      activeMasterParent === 'root'
                        ? 'piperider.400'
                        : 'inherit',
                  }}
                  color={activeMasterParent === 'root' ? 'white' : 'inherit'}
                  bg={
                    activeMasterParent === 'root' ? 'piperider.400' : 'inherit'
                  }
                  onClick={(e) => {
                    onSelect({});
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
                    />
                  </Flex>
                </AccordionButton>
              </h2>
              <AccordionPanel py={0}>
                <>
                  <Accordion allowMultiple index={tablesExpandedIndexList}>
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
                                  onToggle={({ shouldNavigate, tableName }) => {
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
                                      onSelect({ tableName, columnName: '' }); //for naviation
                                    } else {
                                      //filter the existing list
                                      //found: remove; missing: add;
                                      const updatedIndexList = hasExpandedIndex
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
                                  onSelect={onSelect}
                                  compColList={fallbackColEntries}
                                  currentColumn={currentColumn}
                                  currentTable={currentTable}
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
          )}
        </AccordionItem>
        <AccordionItem>
          <AccordionButton
            _hover={{
              bg:
                activeMasterParent === 'metrics' ? 'piperider.400' : 'inherit',
            }}
            color={activeMasterParent === 'metrics' ? 'white' : 'inherit'}
            bg={activeMasterParent === 'metrics' ? 'piperider.400' : 'inherit'}
            onClick={() => {
              onNavToBM();
            }}
          >
            <Text fontWeight={'medium'}>Metrics</Text>
          </AccordionButton>
        </AccordionItem>
        <AccordionItem>
          <AccordionButton
            _hover={{
              bg:
                activeMasterParent === 'assertions'
                  ? 'piperider.400'
                  : 'inherit',
            }}
            color={activeMasterParent === 'assertions' ? 'white' : 'inherit'}
            bg={
              activeMasterParent === 'assertions' ? 'piperider.400' : 'inherit'
            }
            onClick={() => {
              onNavToAssertions();
            }}
          >
            <Text fontWeight={'medium'}>Assertions</Text>
          </AccordionButton>
        </AccordionItem>
      </Accordion>
    </Box>
  );
}
