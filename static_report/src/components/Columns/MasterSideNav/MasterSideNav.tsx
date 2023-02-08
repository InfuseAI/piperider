import {
  Flex,
  Text,
  Box,
  Icon,
  Accordion,
  AccordionButton,
  AccordionItem,
  AccordionPanel,
  Link as ChakraLink,
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

  //initial state should depend on position of current table in tableColEntryList
  const initialIndex = tableColEntryList.findIndex(
    ([key]) => key === currentTable,
  );

  const [tablesExpandedIndexList, setTablesExpandedIndexList] = useState<
    number[]
  >([initialIndex]);

  return (
    <Box w={'100%'} zIndex={150} bg={'inherit'}>
      <Accordion allowMultiple defaultIndex={[0]}>
        <AccordionItem border={'none'}>
          {({ isExpanded }) => (
            <>
              <h2>
                <AccordionButton py={0}>
                  <Flex
                    mt={3}
                    mb={2}
                    gap={2}
                    w={'100%'}
                    justifyContent={'space-between'}
                    alignItems={'center'}
                  >
                    <Text>Tables</Text>
                    <Icon as={isExpanded ? FiChevronDown : FiChevronRight} />
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
      </Accordion>

      <Flex px={5} mt={5}>
        <ChakraLink
          onClick={() => {
            onNavToBM();
          }}
        >
          Metrics
        </ChakraLink>
      </Flex>
      <Flex px={5} mt={5}>
        <ChakraLink
          onClick={() => {
            onNavToAssertions();
          }}
        >
          Assertions
        </ChakraLink>
      </Flex>
    </Box>
  );
}
