import {
  Tab,
  Tabs,
  TabList,
  Tag,
  Spacer,
  Heading,
  Box,
  Button,
  Divider,
} from '@chakra-ui/react';

import {
  Flex,
  Menu,
  MenuButton,
  MenuList,
  MenuDivider,
  MenuItemOption,
  MenuOptionGroup,
  Icon,
} from '@chakra-ui/react';
import { useMemo, useState } from 'react';
import { BsFilter } from 'react-icons/bs';
import { CgListTree } from 'react-icons/cg';
import { LineageGraphData } from '../../utils/dbt';
import { topologySort } from '../../utils/graph';
import {
  ChangeStatus,
  CompTableColEntryItem,
  NODE_CHANGE_STATUS_MSGS,
  useReportStore,
} from '../../utils/store';
import { SearchTextInput } from '../Common/SearchTextInput';
import { ModelList } from './ModelList';
import { MetricList } from './MetricList';
import { Comparable } from '../../types';
import { getIconForChangeStatus, getIconForResourceType } from '../Icons';
import { useLocation } from 'wouter';
import { useCloudReport } from '../../utils/cloud';
import { ChangeSummary } from './ChangeSummary';

const setCodeChange = new Set<string>(['added', 'removed', 'modified']);
const setDownstream = new Set<string>([
  'ds_impacted',
  'ds_potential',
  'ds_not_changed',
]);
const setAll = new Set<string>([
  ...Array.from(setCodeChange),
  ...Array.from(setDownstream),
  'other',
]);

function isSubset(subset: Set<any>, superset: Set<any>) {
  for (const item of Array.from(subset)) {
    if (!superset.has(item)) {
      return false;
    }
  }

  return true;
}

function mergeSet(set1: Set<any>, set2: Set<any>) {
  return new Set<any>([...Array.from(set1), ...Array.from(set2)]);
}

function differenceSet(set1: Set<any>, set2: Set<any>) {
  const result = new Set<any>();
  for (const item of Array.from(set1)) {
    if (!set2.has(item)) {
      result.add(item);
    }
  }
  return result;
}

function toggleSet(set1: Set<any>, set2: Set<any>) {
  if (isSubset(set2, set1)) {
    return differenceSet(set1, set2);
  } else {
    return mergeSet(set1, set2);
  }
}

function getMenuItemOption(changeStatus: ChangeStatus) {
  const { icon, color } = getIconForChangeStatus(changeStatus);
  const value = changeStatus ? changeStatus : 'other';
  const name =
    changeStatus !== null ? NODE_CHANGE_STATUS_MSGS[changeStatus][0] : 'Other';

  return (
    <MenuItemOption value={value}>
      <Flex alignItems="center" gap={1}>
        {icon && <Icon as={icon} color={color} />}
        <Box>{name}</Box>
      </Flex>
    </MenuItemOption>
  );
}

function SelectMenu({
  filterOptions,
  setFilterOptions,
}: {
  filterOptions: FilterOptions;
  setFilterOptions: (filterOptions: FilterOptions) => void;
}) {
  const { changeStatus } = filterOptions;
  let defaultValue: string[] = [];

  if (isSubset(setCodeChange, changeStatus)) {
    defaultValue.push('code_changes');
  }
  if (isSubset(setDownstream, changeStatus)) {
    defaultValue.push('downstreams');
  }
  if (isSubset(setAll, changeStatus)) {
    defaultValue.push('all');
  }

  return (
    <Menu closeOnSelect={false} autoSelect={false}>
      <MenuButton as={Button} fontSize="14px">
        <Flex alignItems="center">
          Filter <Icon as={BsFilter} fontSize="16px" ml="5px" />
        </Flex>
      </MenuButton>
      <MenuList minWidth="240px">
        <MenuOptionGroup type="checkbox" value={defaultValue}>
          <MenuItemOption
            value="code_changes"
            onClick={() => {
              setFilterOptions({
                ...filterOptions,
                changeStatus: toggleSet(changeStatus, setCodeChange),
              });
            }}
          >
            Code Changes
          </MenuItemOption>
          <MenuItemOption
            value="downstreams"
            onClick={() => {
              setFilterOptions({
                ...filterOptions,
                changeStatus: toggleSet(changeStatus, setDownstream),
              });
            }}
          >
            Downstreams
          </MenuItemOption>
          <MenuItemOption
            value="all"
            onClick={() => {
              setFilterOptions({
                ...filterOptions,
                changeStatus: toggleSet(changeStatus, setAll),
              });
            }}
          >
            All nodes
          </MenuItemOption>
        </MenuOptionGroup>
        <MenuDivider />
        <MenuOptionGroup
          type="checkbox"
          value={[...Array.from(changeStatus)]}
          onChange={(value) => {
            setFilterOptions({
              ...filterOptions,
              changeStatus: new Set<any>(value),
            });
          }}
        >
          {getMenuItemOption('added')}
          {getMenuItemOption('removed')}
          {getMenuItemOption('modified')}
          {getMenuItemOption('ds_impacted')}
          {getMenuItemOption('ds_potential')}
          {getMenuItemOption('ds_not_changed')}
          {getMenuItemOption(null)}
        </MenuOptionGroup>
      </MenuList>
    </Menu>
  );
}

function sortByAlphabet(tableColumnsOnly: CompTableColEntryItem[]) {
  function getName([key, { base, target }]: CompTableColEntryItem) {
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
  tableColumnsOnly: CompTableColEntryItem[],
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

function getTabItems(tableColumnsOnly: CompTableColEntryItem[]) {
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

type FilterOptions = {
  search?: string;
  changeStatus: Set<string>;
};

const defaultFilterOptions: FilterOptions = {
  changeStatus: new Set<any>([
    ...Array.from(setCodeChange),
    ...Array.from(setDownstream),
  ]),
};

type Props = {} & Comparable;

export function Overview({ singleOnly }: Props) {
  const { tableColumnsOnly = [], lineageGraph } = useReportStore.getState();
  const [sortMethod, setSortMethod] = useState('topology');
  const [resourceIndex, setResourceIndex] = useState(0);
  const [filterOptions, setFilterOptions] =
    useState<FilterOptions>(defaultFilterOptions);
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
      return fallback?.resource_type === resourceType;
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
      if (metadata.changeStatus === null) {
        if (!filterOptions.changeStatus.has('other')) {
          return false;
        }
      } else {
        if (!filterOptions.changeStatus.has(metadata.changeStatus ?? '')) {
          return false;
        }
      }
    }

    return true;
  });

  return (
    <>
      <Flex direction="column" w={'100%'} minHeight="650px">
        <Flex
          w={'100%'}
          borderBottom="1px solid"
          borderColor="lightgray"
          paddingBottom="10px"
          marginBottom="20px"
        >
          <Heading fontSize={24}>Overview</Heading>
          <Spacer />
          {isCloud && (
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
          )}
        </Flex>

        {!singleOnly && <ChangeSummary tableColumnsOnly={allResources} />}

        <Tabs onChange={setResourceIndex} mb={4}>
          <TabList>
            {tabItems.map((tabItem) => {
              return (
                <Tab>
                  <Icon as={tabItem.icon} mr={1} />
                  {tabItem.name}
                  {!singleOnly && tabItem.changed > 0 && (
                    <Tag size="sm" bg="red.400" color="white" ml={2}>
                      {tabItem.changed}
                    </Tag>
                  )}
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
            placeholder={`Search ${resourceType}s`}
          />

          {!singleOnly && (
            <SelectMenu
              filterOptions={filterOptions}
              setFilterOptions={setFilterOptions}
            />
          )}
        </Flex>

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
