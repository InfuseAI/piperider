import {
  Box,
  Button,
  Center,
  Checkbox,
  Flex,
  HStack,
  Heading,
  LinkBox,
  LinkOverlay,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Table,
  TableContainer,
  Tabs,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  VStack,
} from '@chakra-ui/react';

import { useState } from 'react';
import { Main } from '../shared/Main';
import { formatReportTime } from '../../utils/formatters';

function StickyFooter({
  checkState,
  onCompareClick,
  error,
}: {
  checkState: string[];
  onCompareClick: () => void;
  error?: string;
}) {
  return (
    <Center>
      <Box
        bgColor="gray.100"
        borderRadius="15px"
        bottom="10px"
        opacity="0.95"
        p={4}
        pos="fixed"
        w="40%"
        zIndex={3}
      >
        <Center>
          <VStack>
            <HStack spacing="20px">
              <Box w="56px" textAlign={['left']}>
                <Text fontWeight="semibold">Base: </Text>
                <Text fontWeight="semibold">Target: </Text>
              </Box>
              <Box>
                <Text>{checkState[0]}</Text>
                <Text>{checkState[1]}</Text>
              </Box>
              <Box m={'auto 0'}>
                <Button colorScheme="blue" onClick={onCompareClick}>
                  Compare
                </Button>
              </Box>
            </HStack>
            {error && (
              <Text color="red.500" fontWeight="semibold">
                {error}
              </Text>
            )}
          </VStack>
        </Center>
      </Box>
    </Center>
  );
}

export function IndexReport({ data }) {
  const [checkState, setCheckState] = useState<string[]>([]);
  const [errorState, setErrorState] = useState();

  const onSelectChanged = (name: string, checked: boolean) => {
    const index = checkState.indexOf(name);
    if (checked && index === -1) {
      checkState.push(name);
      if (checkState.length > 2) {
        checkState.shift();
      }
    } else if (!checked && index >= 0) {
      checkState.splice(index, 1);
    }
    const newState = checkState.map((s) => s);
    setCheckState(newState);
  };

  const onCompareClick = (base: string, target: string) => {
    fetch(`/compare?base=${base}&target=${target}`)
      .then((res) => {
        if (res.ok) {
          return res.json();
        }
        throw Error(
          `Network response was not ok (status: ${res.status}). Please try again later.`,
        );
      })
      .then(() => {
        alert("Compare report generated. Please check 'Comparisons' tab.");
        window.location.reload();
      })
      .catch((error) => setErrorState(error.message));
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
                      data.single.map((item) => {
                        const created_at = formatReportTime(item.created_at);

                        return (
                          <LinkBox as={Tr} _hover={{ bg: 'blackAlpha.50' }}>
                            <Td w={0} pt={1} pb={1}>
                              <Checkbox
                                py={3}
                                pl={5}
                                pr={5}
                                size="lg"
                                value={item.name}
                                zIndex={2}
                                isChecked={checkState.includes(item.name)}
                                isDisabled={
                                  checkState.length === 2 &&
                                  !checkState.includes(item.name)
                                }
                                onChange={(event) => {
                                  onSelectChanged(
                                    item.name,
                                    event.target.checked,
                                  );
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
                            <Td>{created_at}</Td>
                          </LinkBox>
                        );
                      })}
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
                      data.comparison.map((item) => {
                        const base_created_at =
                          (item.base.created_at &&
                            formatReportTime(item.base.created_at)) ||
                          '-';
                        const target_created_at =
                          (item.target.created_at &&
                            formatReportTime(item.target.created_at)) ||
                          '-';

                        return (
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
                            <Td>{base_created_at}</Td>
                            <Td>
                              {item.target.datasource.name}:{' '}
                              {item.target.datasource.type}
                            </Td>
                            <Td>{target_created_at}</Td>
                          </LinkBox>
                        );
                      })}
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
            error={errorState}
          />
        )}
      </Flex>
    </Main>
  );
}
