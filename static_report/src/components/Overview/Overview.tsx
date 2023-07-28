import {
  Tab,
  Tabs,
  TabList,
  Tag,
  Text,
  Spacer,
  Heading,
  Box,
  Button,
  Popover,
  PopoverTrigger,
  IconButton,
  Image,
  PopoverContent,
  PopoverArrow,
  PopoverHeader,
  PopoverBody,
  Code,
  OrderedList,
  ListItem,
  Link,
} from '@chakra-ui/react';

import { ExternalLinkIcon } from '@chakra-ui/icons';
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
import { CloudPlusIcon } from '../../lib';

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
          <Heading fontSize={24}>Overview</Heading>
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
            <Popover placement="bottom-end">
              <PopoverTrigger>
                {/* <Tooltip
                  aria-label="tooltip"
                  label="Show the additional features in Piperider Cloud"
                > */}
                <IconButton
                  isRound={true}
                  aria-label="hint of PipeRider Cloud"
                  variant="ghost"
                  size="sm"
                  icon={<CloudPlusIcon />}
                />
                {/* </Tooltip> */}
              </PopoverTrigger>
              <PopoverContent>
                <PopoverArrow />
                <PopoverHeader fontWeight="semibold" fontSize="md">
                  Try Lineage Diff on PipeRider Cloud
                </PopoverHeader>
                <PopoverBody>
                  <Heading fontSize="md" as="h1">
                    What's Lineage Diff?
                  </Heading>
                  <Text fontSize="sm">
                    Visualize and compare the impact of your dbt code changes.
                  </Text>
                  <Image src="https://miro.medium.com/v2/resize:fit:3106/format:webp/1*YMiRnwJ7x2xaApEva5C_7Q.png" />
                  <br />
                  <Heading fontSize="md" as="h1">
                    How to access Lineage Diff?
                  </Heading>
                  <Text fontSize="sm">
                    The Lineage Diff feature is available on PipeRider Cloud.
                  </Text>
                  <Text fontSize="sm">
                    Please follow the steps below to view the Lineage Diff.
                  </Text>
                  <OrderedList fontSize="sm">
                    <ListItem>
                      Sign up PipeRider Cloud:{' '}
                      <Code>piperider cloud signup</Code>
                    </ListItem>
                    <ListItem>
                      Upload the latest piperider report:{' '}
                      <Code>piperider cloud upload-report</Code>
                    </ListItem>
                    <ListItem>
                      Login your PipeRider Cloud to view report:{' '}
                      <Link href="https://cloud.piperider.io" isExternal>
                        https://cloud.piperider.io <ExternalLinkIcon mx="2px" />
                      </Link>
                    </ListItem>
                  </OrderedList>
                </PopoverBody>
              </PopoverContent>
            </Popover>
          )}
        </Flex>

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
