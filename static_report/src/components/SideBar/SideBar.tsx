import {
  Box,
  Flex,
  Icon,
  IconButton,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalHeader,
  ModalOverlay,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
} from '@chakra-ui/react';
import { useReportStore } from '../../utils/store';
import { SideBarTree } from './SideBarTree';
import { useEffect, useState } from 'react';
import { FaDatabase, FaFolder } from 'react-icons/fa';
import { useLocation } from 'wouter';
import { Comparable } from '../../types';
import { LineageGraph } from '../LineageGraph/LineageGraph';
import { useCloudReport } from '../../utils/cloud';
import { useHashParams } from '../../hooks';
import { CgListTree } from 'react-icons/cg';

export function SideBar({ singleOnly }: Comparable) {
  const { isLegacy, projectTree, databaseTree, expandTreeForPath } =
    useReportStore.getState();
  const [location, setLocation] = useLocation();
  const [tabIndex, setTabIndex] = useState(-1);
  const isCloud = useCloudReport();
  const hashParams = useHashParams();

  const handleTabChange = (index) => {
    expandTreeForPath(location);
    setTabIndex(index);
  };

  // make sure the tree is expanded for the current path
  useEffect(() => {
    if (location !== '/ssr') {
      expandTreeForPath(location);

      if (tabIndex < 0) {
        setTabIndex(0);
      }
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
    <>
      <Tabs index={tabIndex} onChange={handleTabChange}>
        <Flex>
          <TabList flex="1 1 auto" flexWrap="wrap">
            <Tab>
              <Icon as={FaFolder} mr={2} />
              Project
            </Tab>
            <Tab>
              <Icon as={FaDatabase} mr={2} />
              Database
            </Tab>
          </TabList>
          {isCloud && (
            <Box borderBottom="2px" borderColor="gray.200">
              <IconButton
                aria-label="Show Lineage Graph"
                icon={<CgListTree />}
                isRound={false}
                backgroundColor="transparent"
                onClick={() => setLocation(location + '?g_v=1')}
              />
            </Box>
          )}
        </Flex>
        <TabPanels>
          <TabPanel>
            <SideBarTree items={projectTree} singleOnly={singleOnly} />
          </TabPanel>
          <TabPanel>
            <SideBarTree items={databaseTree} singleOnly={singleOnly} />
          </TabPanel>
        </TabPanels>
      </Tabs>
      {/* {isCloud && (
        <Button
          style={{ position: 'fixed', bottom: 0, right: 0 }}
          onClick={() => setLocation(location + '?g_v=1')}
        >
          Show Graph
        </Button>
      )} */}
      <Modal
        isOpen={isCloud && hashParams.get('g_v') === '1'}
        onClose={() => setLocation(location)}
        size="xl"
      >
        <ModalOverlay />
        <ModalContent maxW="calc(100vw - 200px)" backgroundColor="#f6f6f6">
          <ModalHeader
            borderBottom={2}
            backgroundColor={'gray.100'}
            border="0 solid lightgray"
            borderBottomWidth={1}
          >
            <Text fontSize="sm">
              {singleOnly ? 'Lineage Graph' : 'Lineage Diff'}
            </Text>
            <ModalCloseButton />
          </ModalHeader>
          <ModalBody p={0}>
            <LineageGraph singleOnly={singleOnly} />
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}
