import { TableListItem } from '../components/Tables/TableList/TableListItem';
import {
  Flex,
  Text,
  Grid,
  useDisclosure,
  Tab,
  Tabs,
  TabList,
  TabPanels,
  TabPanel,
  Tag,
  Spacer,
  Button,
  Heading,
} from '@chakra-ui/react';
import { useState } from 'react';

import { tableListGridTempCols, tableListMaxWidth } from '../utils/layout';
import { useReportStore } from '../utils/store';
import { TableColumnSchemaList } from '../components/Tables/TableList/TableColumnSchemaList';
import { useTrackOnMount } from '../hooks';
import { EVENTS, CR_TYPE_LABEL } from '../utils/trackEvents';
import { CommonModal } from '../components/Common/CommonModal';
import _ from 'lodash';
import { ModelList } from '../components/Overview/ModelList';

export function CROverviewPage() {
  useTrackOnMount({
    eventName: EVENTS.PAGE_VIEW,
    eventProperties: {
      type: CR_TYPE_LABEL,
      page: 'overview_page',
    },
  });
  const modal = useDisclosure();
  const [tableColsEntryId, setTableColsEntryId] = useState(-1);
  const {
    tableColumnsOnly = [],
    assertionsOnly,
    isLegacy,
  } = useReportStore.getState();

  const tableColumnsSorted = _.sortBy(
    tableColumnsOnly,
    ([, { base, target }]) => {
      const fallback = target ?? base;
      return fallback?.__table?.name;
    },
  );

  let selected;
  if (tableColsEntryId !== -1) {
    const [, { base, target }] = tableColumnsSorted[tableColsEntryId];
    selected = target ?? base;
  }

  return (
    <>
      <Flex direction="column" w={'100%'} minHeight="650px">
        <Flex w={'100%'}>
          <Heading fontSize={24}>Overview</Heading>
          <Spacer />
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
          >
            Lineage Diff
          </Button>
        </Flex>
        <Tabs>
          <TabList>
            <Tab>
              Models{' '}
              <Tag size="sm" bg="red.400" color="white" ml={2}>
                2
              </Tag>
            </Tab>
            <Tab>
              Seeds
              <Tag size="sm" bg="red.400" color="white" ml={2}>
                1
              </Tag>
            </Tab>
            <Tab>Sources</Tab>
            <Tab>
              Metrics
              <Tag size="sm" bg="red.400" color="white" ml={2}>
                1
              </Tag>
            </Tab>
          </TabList>

          <TabPanels>
            <TabPanel>
              <ModelList />
            </TabPanel>
            <TabPanel>
              <p>two!</p>
            </TabPanel>
            <TabPanel>
              <p>three!</p>
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Flex>
    </>
  );
}
