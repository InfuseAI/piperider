import {
  useDisclosure,
  Tab,
  Tabs,
  TabList,
  Tag,
  Spacer,
  Heading,
} from '@chakra-ui/react';

import _ from 'lodash';
import {
  Flex,
  Menu,
  MenuButton,
  MenuList,
  IconButton,
  MenuDivider,
  MenuItemOption,
  MenuOptionGroup,
} from '@chakra-ui/react';
import { useMemo, useState } from 'react';
import { BsFilter } from 'react-icons/bs';
import { LineageGraphData } from '../../utils/dbt';
import { topologySort } from '../../utils/graph';
import { CompTableColEntryItem, useReportStore } from '../../utils/store';
import { SearchTextInput } from '../Common/SearchTextInput';
import { ModelList } from './ModelList';
import { ChangeSummary } from './ChangeSummary';
import { MetricList } from './MetricList';

const SelectMenu = ({
  filterOptions,
  setFilterOptions,
}: {
  filterOptions: FilterOptions;
  setFilterOptions: (filterOptions: FilterOptions) => void;
}) => {
  const { changeStatus } = filterOptions;
  let defaultValue: string[] = [];

  if (
    changeStatus.has('added') &&
    changeStatus.has('removed') &&
    changeStatus.has('modified') &&
    changeStatus.has('implicit')
  ) {
    if (changeStatus.has('noChange')) {
      defaultValue = ['all'];
    } else {
      defaultValue = ['changed'];
    }
  }

  return (
    <Menu closeOnSelect={false}>
      <MenuButton
        as={IconButton}
        icon={<BsFilter />}
        size="md"
        variant="outline"
      />
      <MenuList minWidth="240px">
        <MenuOptionGroup type="checkbox" value={defaultValue}>
          <MenuItemOption
            value="changed"
            onClick={() => {
              setFilterOptions({
                ...filterOptions,
                changeStatus: new Set([
                  'added',
                  'removed',
                  'modified',
                  'implicit',
                ]),
              });
            }}
          >
            Change only
          </MenuItemOption>
          <MenuItemOption
            value="all"
            onClick={() => {
              setFilterOptions({
                ...filterOptions,
                changeStatus: new Set([
                  'added',
                  'removed',
                  'modified',
                  'implicit',
                  'noChange',
                ]),
              });
            }}
          >
            All nodes
          </MenuItemOption>
        </MenuOptionGroup>
        <MenuDivider />
        <MenuOptionGroup
          type="checkbox"
          value={[...changeStatus]}
          onChange={(value) => {
            setFilterOptions({
              ...filterOptions,
              changeStatus: new Set<any>(value),
            });
          }}
        >
          <MenuItemOption value="added">Added</MenuItemOption>
          <MenuItemOption value="removed">Removed</MenuItemOption>
          <MenuItemOption value="modified">Modified</MenuItemOption>
          <MenuItemOption value="implicit">Implicit</MenuItemOption>
          <MenuItemOption value="noChange">No change</MenuItemOption>
        </MenuOptionGroup>
      </MenuList>
    </Menu>
  );
};

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

type FilterOptions = {
  search?: string;
  changeStatus: Set<'added' | 'removed' | 'modified' | 'implicit' | 'noChange'>;
};

const defaultFilterOptions: FilterOptions = {
  changeStatus: new Set(['added', 'removed', 'modified', 'implicit']),
};

export function Overview() {
  const modal = useDisclosure();
  const [tableColsEntryId, setTableColsEntryId] = useState(-1);
  const { tableColumnsOnly = [], lineageGraph } = useReportStore.getState();
  const [sortMethod, setSortMethod] = useState('topology');
  const [resourceIndex, setResourceIndex] = useState(0);
  const [filterOptions, setFilterOptions] =
    useState<FilterOptions>(defaultFilterOptions);

  const handleSortChange = () => {
    if (sortMethod === 'alphabet') {
      setSortMethod('topology');
    } else {
      setSortMethod('alphabet');
    }
  };

  const resources: {
    resourceType: string;
    name: string;
    changed: number;
  }[] = [
    {
      resourceType: 'model',
      name: 'Models',
      changed: 2,
    },
    {
      resourceType: 'seed',
      name: 'Seeds',
      changed: 1,
    },
    {
      resourceType: 'source',
      name: 'Sources',
      changed: 0,
    },
    {
      resourceType: 'metric',
      name: 'Metrics',
      changed: 1,
    },
  ];
  const resourceType = resources[resourceIndex].resourceType;

  const sorted = useMemo(() => {
    const filtered = tableColumnsOnly.filter(([key, { base, target }]) => {
      const fallback = target ?? base;
      return fallback?.resource_type == resourceType;
    });

    if (sortMethod === 'topology' && lineageGraph) {
      return sortByTopology(filtered, lineageGraph);
    } else {
      return sortByAlphabet(filtered);
    }
  }, [resourceType, sortMethod, tableColumnsOnly, lineageGraph]);

  const listed = sorted.filter((tableColsEntry) => {
    const [key, { base, target }, metadata] = tableColsEntry;
    const fallback = base ?? target;
    if (!fallback) {
      return false;
    }
    if (filterOptions.search) {
      if (!(fallback?.name ?? '').includes(filterOptions.search)) {
        return false;
      }
    }

    if (
      !filterOptions.changeStatus.has('noChange') &&
      metadata.changeStatus === null
    ) {
      return false;
    }

    if (
      !filterOptions.changeStatus.has('added') &&
      metadata.changeStatus === 'added'
    ) {
      return false;
    }
    if (
      !filterOptions.changeStatus.has('removed') &&
      metadata.changeStatus === 'removed'
    ) {
      return false;
    }
    if (
      !filterOptions.changeStatus.has('modified') &&
      metadata.changeStatus === 'modified'
    ) {
      return false;
    }
    if (
      !filterOptions.changeStatus.has('implicit') &&
      metadata.changeStatus === 'implicit'
    ) {
      return false;
    }
    return true;
  });

  return (
    <>
      <Flex direction="column" w={'100%'} minHeight="650px">
        <Flex w={'100%'}>
          <Heading fontSize={24}>Overview</Heading>
          <Spacer />
          {/* <Button
            size="sm"
            bg="piperider.500"
            color="white"
            _hover={{
              bg: 'piperider.600',
            }}
            _active={{
              bg: 'piperider.800',
            }}
          >
            Lineage Diff
          </Button> */}
        </Flex>
        <Tabs onChange={setResourceIndex} mb={4}>
          <TabList>
            {resources.map((resource) => {
              return (
                <Tab>
                  {resource.name}
                  {resource.changed > 0 && (
                    <Tag size="sm" bg="red.400" color="white" ml={2}>
                      {resource.changed}
                    </Tag>
                  )}
                </Tab>
              );
            })}
          </TabList>
        </Tabs>

        <ChangeSummary
          tableColumnsOnly={sorted}
          noImpacted={resourceType === 'source' || resourceType === 'seed'}
        />

        <Flex alignContent="stretch" gap={3} my={2}>
          <SearchTextInput
            onChange={(search) => {
              setFilterOptions({ ...filterOptions, search });
            }}
            placeholder={`Search ${resourceType}s`}
          />
          <SelectMenu
            filterOptions={filterOptions}
            setFilterOptions={setFilterOptions}
          />
        </Flex>

        {resourceType === 'metric' && (
          <MetricList
            tableColumnsOnly={listed}
            sortMethod={sortMethod}
            handleSortChange={handleSortChange}
          />
        )}
        {(resourceType === 'model' ||
          resourceType === 'seed' ||
          resourceType === 'source') && (
          <ModelList
            tableColumnsOnly={listed}
            sortMethod={sortMethod}
            handleSortChange={handleSortChange}
          />
        )}
      </Flex>
    </>
  );
}
