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
  Link,
} from '@chakra-ui/react';
import { FiChevronDown, FiChevronRight } from 'react-icons/fi';
import { useLocalStorage } from 'react-use';

import { Comparable, ComparableData, Selectable } from '../../../types';
import { MASTER_LIST_SHOW_EXTRA } from '../../../utils';
import {
  CompColEntryItem,
  CompTableColEntryItem,
  CompTableWithColEntryOverwrite,
} from '../../../utils/store';
import { ColumnDetailListItem } from './ColumnDetailListItem';

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
//FIXME: Doc Site Behaviors
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
  //FIXME: removing causes store error???
  const [showExtra, setShowExtra] = useLocalStorage(MASTER_LIST_SHOW_EXTRA, '');

  //Accordions should use controlled state to toggle
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
                      <Text>Tables</Text>
                    </Flex>
                  </Flex>
                </AccordionButton>
              </h2>
              <AccordionPanel py={0}>
                <>
                  <Accordion reduceMotion allowMultiple>
                    {tableColEntryList.map(
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

/**
 * TableItem: Accordion UI parent
 */
interface TableItemAccordionButtonProps extends Comparable, Selectable {
  compTableColItem: ComparableData<CompTableWithColEntryOverwrite>;
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
  currentColumn?: string;
  currentTable?: string;
  indexedTableName: string;
}
function ColumnListAccordionPanel({
  compColList = [],
  onSelect,
  singleOnly,
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
                p={3}
              />
            </Box>
          );
        })}
      </Box>
    </AccordionPanel>
  );
}
