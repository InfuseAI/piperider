import {
  Flex,
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

import { useReportStore } from '../utils/store';
import { useTrackOnMount } from '../hooks';
import { EVENTS, CR_TYPE_LABEL } from '../utils/trackEvents';
import _ from 'lodash';
import { ModelList } from '../components/Overview/ModelList';
import { Overview } from '../components/Overview/Overview';

export function CROverviewPage() {
  useTrackOnMount({
    eventName: EVENTS.PAGE_VIEW,
    eventProperties: {
      type: CR_TYPE_LABEL,
      page: 'overview_page',
    },
  });

  return <Overview />;
}
