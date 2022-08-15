import {
  Flex,
  Heading,
  Table,
  TableContainer,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
  Tab,
  Tabs,
  TabList,
  TabPanels,
  TabPanel,
  LinkBox,
  LinkOverlay,
  Checkbox,
  Box,
  Text,
  Button,
  Center,
} from '@chakra-ui/react';

import { useState } from 'react';
import { Main } from '../shared/Main';
import { formatReportTime } from '../../utils/formatters';

function useForceUpdate() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [value, setValue] = useState(0);
  return () => setValue((value) => value + 1);
}

const style = {
  opacity: 0.96,
  backgroundColor: '#F8F8F8',
  border: '1px solid #E7E7E7',
  borderRadius: '15px',
  padding: '15px',
  position: 'fixed',
  bottom: '10px',
  height: '80px',
  width: '35%',
  zIndex: 3,
};

function StickyFooter({ checkState, onCompareClick }) {
  return (
    <Center>
      <Box sx={style}>
        <Center>
          <Box w={70} textAlign={['left']}>
            <Text>Base: </Text>
            <Text>Target: </Text>
          </Box>
          <Box mr={30}>
            <Text>{checkState[0]}</Text>
            <Text>{checkState[1]}</Text>
          </Box>
          <Box m={'auto 0'}>
            <Button onClick={onCompareClick}>Compare</Button>
          </Box>
        </Center>
      </Box>
    </Center>
  );
}

export function ServeIndex({ data }) {
  const [checkState, setCheckState] = useState<string[]>([]);
  const forceUpdate = useForceUpdate();

  const onSelectChanged = (name: string, checked: boolean) => {
    setCheckState((prev) => {
      const index = prev.indexOf(name);
      if (checked && index === -1) {
        prev.push(name);
        if (prev.length > 2) {
          prev.shift();
        }
      } else if (!checked && index >= 0) {
        prev.splice(index, 1);
      }
      return prev;
    });
  };

  const onCompareClick = (base: string, target: string) => {
    fetch(`/compare?base=${base}&target=${target}`)
      .then((res) => res.json())
      .then(() => {
        alert("Compare report generated. Please check 'Comparisons' tab.");
        window.location.reload();
      });
  };

  return (
    <Main>
      <Flex
        direction="column"
        border="1px solid"
        borderColor="gray.300"
        bg="white"
        borderRadius="md"
        p={6}
        width="calc(100% - 64px)"
        maxWidth="1200px"
        my={10}
      >
        <Heading mb={4}>PipeRider Reports</Heading>

        <Tabs isLazy>
          <TabList>
            <Tab>Single runs</Tab>
            <Tab>Comparisons</Tab>
          </TabList>

          <TabPanels>
            <TabPanel>
              <TableContainer>
                <Table variant="simple">
                  <Thead>
                    <Tr>
                      <Th />
                      <Th>Name</Th>
                      <Th>Data Source</Th>
                      <Th>Generated At</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {data &&
                      data.single.map((item) => (
                        <LinkBox as={Tr} _hover={{ bg: 'blackAlpha.50' }}>
                          <Td w={0}>
                            <Checkbox
                              value={item.name}
                              size="lg"
                              zIndex={2}
                              isChecked={checkState.includes(item.name)}
                              onChange={(event) => {
                                onSelectChanged(
                                  item.name,
                                  event.target.checked,
                                );
                                forceUpdate();
                              }}
                            />
                          </Td>
                          <Td>
                            <LinkOverlay
                              href={`/single-run/${item.name}/`}
                              isExternal={true}
                            >
                              {item.name}
                            </LinkOverlay>
                          </Td>
                          <Td>
                            {item.datasource.name}: {item.datasource.type}
                          </Td>
                          <Td>{formatReportTime(item.created_at)}</Td>
                        </LinkBox>
                      ))}
                  </Tbody>
                </Table>
              </TableContainer>
            </TabPanel>

            <TabPanel>
              <TableContainer>
                <Table variant="simple">
                  <Thead>
                    <Tr>
                      <Th>Name</Th>
                      <Th colSpan={2}>Base</Th>
                      <Th colSpan={2}>Target</Th>
                    </Tr>
                    <Tr>
                      <Th />
                      <Th>Data Source</Th>
                      <Th>Generated At</Th>
                      <Th>Data Source</Th>
                      <Th>Generated At</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {data &&
                      data.comparison.map((item) => (
                        <LinkBox as={Tr} _hover={{ bg: 'blackAlpha.50' }}>
                          <Td>
                            <LinkOverlay
                              href={`/comparison/${item.name}/`}
                              isExternal={true}
                            >
                              {item.name}
                            </LinkOverlay>
                          </Td>
                          <Td>
                            {item.base.datasource.name}:{' '}
                            {item.base.datasource.type}
                          </Td>
                          <Td>
                            {item.base.created_at &&
                              formatReportTime(item.base.created_at)}
                          </Td>
                          <Td>
                            {item.target.datasource.name}:{' '}
                            {item.target.datasource.type}
                          </Td>
                          <Td>
                            {item.target.created_at &&
                              formatReportTime(item.target.created_at)}
                          </Td>
                        </LinkBox>
                      ))}
                  </Tbody>
                </Table>
              </TableContainer>
            </TabPanel>
          </TabPanels>
        </Tabs>

        {checkState.length === 2 && (
          <StickyFooter
            checkState={checkState}
            onCompareClick={() => {
              onCompareClick(checkState[0], checkState[1]);
            }}
          />
        )}
      </Flex>
    </Main>
  );
}
