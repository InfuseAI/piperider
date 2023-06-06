import {
  Box,
  Button,
  Icon,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalOverlay,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  useDisclosure,
} from '@chakra-ui/react';
import { useReportStore } from '../../utils/store';
import { SideBarTree } from './SideBarTree';
import { useEffect, useState } from 'react';
import { FaDatabase, FaFolder } from 'react-icons/fa';
import { useLocation } from 'wouter';
import { Comparable } from '../../types';
import { ReactFlowGraphProvider } from '../LineageGraph/ReactFlowGraph';

export function SideBar({ singleOnly }: Comparable) {
  const { isLegacy, projectTree, databaseTree, expandTreeForPath } =
    useReportStore.getState();
  const [location] = useLocation();
  const [tabIndex, setTabIndex] = useState(-1);
  const { isOpen, onOpen, onClose } = useDisclosure();
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
    <>
      <Tabs index={tabIndex} onChange={handleTabChange}>
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
      <Button
        style={{ position: 'fixed', bottom: 0, right: 0 }}
        onClick={onOpen}
      >
        Show Graph
      </Button>
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay />
        <ModalContent maxW="calc(100vw - 200px)" backgroundColor="#f6f6f6">
          <ModalCloseButton />
          <ModalBody>
            <ReactFlowGraphProvider singleOnly={singleOnly} />
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
}
