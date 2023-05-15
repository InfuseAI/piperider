import {
  Box,
  Icon,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
} from '@chakra-ui/react';
import { useReportStore } from '../../utils/store';
import { SideBarTree } from './SideBarTree';
import { useEffect, useState } from 'react';
import { FaDatabase, FaFolder } from 'react-icons/fa';
import { useLocation } from 'wouter';
import { Comparable } from '../../types';

export function SideBar({ singleOnly }: Comparable) {
  const { isLegacy, projectTree, databaseTree, expandTreeForPath } =
    useReportStore.getState();
  const [location] = useLocation();
  const [tabIndex, setTabIndex] = useState(-1);
  const handleTabChange = (index) => {
    expandTreeForPath(location);
    setTabIndex(index);
  };

  // make sure the tree is expanded for the current path
  useEffect(() => {
    if (location !== '/ssr' && tabIndex < 0) {
      expandTreeForPath(location);
      setTabIndex(0);
    }
  }, [location, tabIndex, expandTreeForPath]);

  if (isLegacy) {
    return (
      <Box mt={5}>
        <SideBarTree items={projectTree} singleOnly={singleOnly} />
      </Box>
    );
  }

  return (
    <Tabs isFitted index={tabIndex} onChange={handleTabChange}>
      <TabList>
        <Tab>
          <Icon as={FaFolder} mr={2} />
          Project
        </Tab>
        <Tab>
          <Icon as={FaDatabase} mr={2} />
          Database
        </Tab>
      </TabList>
      <TabPanels>
        <TabPanel>
          <SideBarTree items={projectTree} singleOnly={singleOnly} />
        </TabPanel>
        <TabPanel>
          <SideBarTree items={databaseTree} singleOnly={singleOnly} />
        </TabPanel>
      </TabPanels>
    </Tabs>
  );
}
