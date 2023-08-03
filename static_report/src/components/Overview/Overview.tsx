import {
  Tab,
  Tabs,
  TabList,
  Spacer,
  Heading,
  Button,
  Alert,
  AlertIcon,
  Box,
  AlertTitle,
  AlertDescription,
  Code,
} from '@chakra-ui/react';

import {
  Flex,
  Menu,
  MenuButton,
  MenuList,
  MenuItemOption,
  MenuOptionGroup,
  Icon,
} from '@chakra-ui/react';
import { useMemo, useState } from 'react';
import { BsFilter } from 'react-icons/bs';
import { CgListTree } from 'react-icons/cg';
import { LineageGraphData } from '../../utils/dbt';
import { topologySort } from '../../utils/graph';
import { CompDbtNodeEntryItem, useReportStore } from '../../utils/store';
import { SearchTextInput } from '../Common/SearchTextInput';
import { ModelList } from './ModelList';
import { MetricList } from './MetricList';
import { NodeList } from './NodeList';
import { Comparable } from '../../types';
import { getIconForResourceType } from '../Icons';
import { useLocation } from 'wouter';
import { useCloudReport } from '../../utils/cloud';
import { ChangeSummary } from './ChangeSummary';
import { LineageDiffPopover } from './LineageDiffPopover';

function SelectMenu({
  filterOptions,
  setFilterOptions,
}: {
  filterOptions: FilterOptions;
  setFilterOptions: (filterOptions: FilterOptions) => void;
}) {
  return (
    <Menu closeOnSelect={false} autoSelect={false}>
      <MenuButton as={Button} fontSize="14px">
        <Flex alignItems="center">
          Filter <Icon as={BsFilter} fontSize="16px" ml="5px" />
        </Flex>
      </MenuButton>
      <MenuList minWidth="240px">
        <MenuOptionGroup
          type="radio"
          defaultValue="potentially_impacted"
          onChange={(filterBy) => {
            setFilterOptions({
              ...filterOptions,
              filterBy: filterBy as any,
            });
          }}
        >
          <MenuItemOption value="potentially_impacted">
            Potentially Impacted
          </MenuItemOption>
          <MenuItemOption value="code_changed">Code Changed</MenuItemOption>
          <MenuItemOption value="all">All</MenuItemOption>
        </MenuOptionGroup>
      </MenuList>
    </Menu>
  );
}

function sortByAlphabet(tableColumnsOnly: CompDbtNodeEntryItem[]) {
  function getName([key, { base, target }]: CompDbtNodeEntryItem) {
    const fallback = target ?? base;
    return fallback?.name ?? '';
  }

  const sorted = [...tableColumnsOnly];

  sorted.sort((a, b) => {
    const nameA = getName(a).toLowerCase();
    const nameB = getName(b).toLowerCase();
    return nameA.localeCompare(nameB);
  });

  return sorted;
}

function sortByTopology(
  tableColumnsOnly: CompDbtNodeEntryItem[],
  lineageGraph: LineageGraphData,
) {
  const sortedKeys = topologySort(Object.keys(lineageGraph), (uniqueId) => {
    const children = lineageGraph[uniqueId].children;
    return Object.keys(children);
  });

  const filteredMap = {};
  tableColumnsOnly.forEach((entry) => {
    filteredMap[entry[0]] = entry;
  });
  const sorted: typeof tableColumnsOnly = [];
  sortedKeys.forEach((key) => {
    if (filteredMap[key]) {
      sorted.push(filteredMap[key]);
    }
  });
  return sorted;
}

function getTabItems(tableColumnsOnly: CompDbtNodeEntryItem[]) {
  const groupByResourceType: {
    [key: string]: { total: number; changed: number };
  } = {};

  tableColumnsOnly.forEach(([key, { base, target }, metadata]) => {
    const fallback = target ?? base;
    const resourceType = fallback?.resource_type ?? '';

    if (!groupByResourceType[resourceType]) {
      groupByResourceType[resourceType] = { total: 0, changed: 0 };
    }

    groupByResourceType[resourceType].total += 1;
    if (metadata.changeStatus) {
      groupByResourceType[resourceType].changed += 1;
    }
  });

  const tabItems: {
    resourceType: string;
    name: string;
    icon: any;
    total: number;
    changed: number;
  }[] = [];

  tabItems.push({
    resourceType: '',
    name: 'All',
    icon: null,
    total: 0,
    changed: 0,
  });

  if (groupByResourceType['model']) {
    tabItems.push({
      resourceType: 'model',
      name: 'Models',
      icon: getIconForResourceType('model').icon,
      ...groupByResourceType['model'],
    });
  }

  if (groupByResourceType['seed']) {
    tabItems.push({
      resourceType: 'seed',
      name: 'Seeds',
      icon: getIconForResourceType('seed').icon,
      ...groupByResourceType['seed'],
    });
  }

  if (groupByResourceType['source']) {
    tabItems.push({
      resourceType: 'source',
      name: 'Sources',
      icon: getIconForResourceType('source').icon,
      ...groupByResourceType['source'],
    });
  }

  if (groupByResourceType['metric']) {
    tabItems.push({
      resourceType: 'metric',
      name: 'Metrics',
      icon: getIconForResourceType('metric').icon,
      ...groupByResourceType['metric'],
    });
  }

  return tabItems;
}

function checkIsProfiled(tableColumnsOnly: CompDbtNodeEntryItem[]): boolean {
  for (const [, { base }] of tableColumnsOnly) {
    if (base?.resource_type === 'model' || base?.resource_type === 'seed') {
      if (base?.__table?.row_count) {
        return true;
      }
    }
  }
  return false;
}

type FilterOptions = {
  search?: string;
  filterBy?: 'code_changed' | 'potentially_impacted' | 'all';
};

type Props = {} & Comparable;

export function Overview({ singleOnly }: Props) {
  const { tableColumnsOnly = [], lineageGraph } = useReportStore.getState();
  const [sortMethod, setSortMethod] = useState('topology');
  const [resourceIndex, setResourceIndex] = useState(0);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    filterBy: 'potentially_impacted',
  });
  const [location, setLocation] = useLocation();
  const isCloud = useCloudReport();

  const handleSortChange = () => {
    if (sortMethod === 'alphabet') {
      setSortMethod('topology');
    } else {
      setSortMethod('alphabet');
    }
  };

  const tabItems = getTabItems(tableColumnsOnly);
  const resourceType = tabItems[resourceIndex].resourceType;
  const isNoProfiled = singleOnly
    ? checkIsProfiled(tableColumnsOnly) === false
    : false;

  const allResources = useMemo(() => {
    return tableColumnsOnly.filter(([key, { base, target }]) => {
      const fallback = target ?? base;
      const listedResourceType = new Set(['model', 'seed', 'source', 'metric']);
      return listedResourceType.has(fallback?.resource_type ?? '');
    });
  }, [tableColumnsOnly]);

  const sorted = useMemo(() => {
    const filtered = tableColumnsOnly.filter(([key, { base, target }]) => {
      const fallback = target ?? base;
      if (resourceType === '') {
        return fallback?.resource_type !== 'test';
      } else {
        return fallback?.resource_type === resourceType;
      }
    });

    if (sortMethod === 'topology' && lineageGraph) {
      return sortByTopology(filtered, lineageGraph);
    } else {
      return sortByAlphabet(filtered);
    }
  }, [resourceType, sortMethod, tableColumnsOnly, lineageGraph]);

  const listed = sorted.filter((tableColsEntry) => {
    const [, { base, target }, metadata] = tableColsEntry;
    const fallback = base ?? target;

    if (!fallback) {
      return false;
    }
    if (filterOptions.search) {
      if (!(fallback?.name ?? '').includes(filterOptions.search)) {
        return false;
      }
    }

    if (!singleOnly) {
      if (filterOptions?.filterBy === 'code_changed') {
        return !!metadata.changeStatus;
      } else if (filterOptions.filterBy === 'potentially_impacted') {
        return !!metadata.impactStatus;
      } else {
        return true;
      }
    }

    return true;
  });

  return (
    <>
      <Flex direction="column" w={'100%'} minHeight="650px">
        <Flex w={'100%'} paddingBottom="10px" marginBottom="20px">
          <Heading fontSize={24}>
            {singleOnly ? 'Overview' : 'Impact Summary'}
          </Heading>
          <Spacer />
          {isCloud ? (
            // For Cloud overview layout
            <Button
              size="sm"
              bg="piperider.500"
              color="white"
              _hover={{
                bg: 'piperider.600',
              }}
              _active={{
                bg: 'piperider.800',
              }}
              onClick={() => {
                setLocation(`${location}?g_v=1`);
              }}
            >
              {singleOnly ? 'Lineage Graph' : 'Lineage Diff'}
              <Icon as={CgListTree} ml={1} />
            </Button>
          ) : (
            // For Open Source overview layout
            <LineageDiffPopover singleOnly={singleOnly} />
          )}
        </Flex>
        {isNoProfiled && (
          <>
            <Alert status="warning" mb={5}>
              <AlertIcon />
              <Box>
                <AlertTitle>None of models or seeds are profiled</AlertTitle>
                <AlertDescription fontSize="sm">
                  Please execute <Code colorScheme="orange">piperider run</Code>{' '}
                  with option <Code colorScheme="orange">--select</Code> to
                  specific select the models and seeds to profile.
                </AlertDescription>
              </Box>
            </Alert>
          </>
        )}

        {!singleOnly && <ChangeSummary tableColumnsOnly={allResources} />}

        <Tabs onChange={setResourceIndex} mb={4}>
          <TabList>
            {tabItems.map((tabItem) => {
              return (
                <Tab>
                  {/* <Icon as={tabItem.icon} mr={1} */}
                  {tabItem.name}
                  {/* {!singleOnly && tabItem.changed > 0 && (
                    <Tag size="sm" bg="red.400" color="white" ml={2}>
                      {tabItem.changed}
                    </Tag>
                  )} */}
                </Tab>
              );
            })}
          </TabList>
        </Tabs>

        <Flex alignContent="stretch" gap={3} my={2}>
          <SearchTextInput
            onChange={(search) => {
              setFilterOptions({ ...filterOptions, search });
            }}
            placeholder={resourceType ? `Search ${resourceType}s` : 'Search'}
          />

          {!singleOnly && (
            <SelectMenu
              filterOptions={filterOptions}
              setFilterOptions={setFilterOptions}
            />
          )}
        </Flex>

        {resourceType === '' && (
          <NodeList
            tableColumnsOnly={listed}
            sortMethod={sortMethod}
            handleSortChange={handleSortChange}
            singleOnly={singleOnly}
          />
        )}

        {resourceType === 'metric' && (
          <MetricList
            tableColumnsOnly={listed}
            sortMethod={sortMethod}
            handleSortChange={handleSortChange}
            singleOnly={singleOnly}
          />
        )}
        {(resourceType === 'model' ||
          resourceType === 'seed' ||
          resourceType === 'source') && (
          <ModelList
            tableColumnsOnly={listed}
            sortMethod={sortMethod}
            handleSortChange={handleSortChange}
            singleOnly={singleOnly}
          />
        )}
      </Flex>
    </>
  );
}
