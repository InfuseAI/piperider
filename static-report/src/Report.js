import { ExternalLinkIcon } from '@chakra-ui/icons';
import {
  Accordion,
  AccordionButton,
  AccordionIcon,
  AccordionItem,
  AccordionPanel,
  Box,
  Code,
  Center,
  Flex,
  Heading,
  Icon,
  Link,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
} from '@chakra-ui/react';
import { Main } from './Main';
import formatDistanceToNow from 'date-fns/formatDistanceToNow';
import {
  IoCheckmark,
  IoCheckmarkCircleSharp,
  IoCloseCircle,
  IoCloudOutline,
  IoFolderOutline,
  IoShieldHalfOutline,
  IoTimeOutline,
} from 'react-icons/io5';

export function ReportMain() {
  return (
    <Main>
      <Flex minH={'100vh'} alignItems={'center'} m={4}>
        <Report data={window.PIPERIDER_REPORT_DATA} />
      </Flex>
    </Main>
  );
}

function Report({ data }) {
  if (Object.keys(data).length === 0) {
    return null;
  }

  return (
    <Flex direction={'column'} alignItems={'center'}>
      <Flex alignItems={'center'}>
        <Heading mr={1}>PipeRider Report</Heading>
        {data?.metadata.external_url && (
          <Link href={data.metadata.external_url} isExternal>
            <Icon as={ExternalLinkIcon} boxSize={8} color={'gray.400'} />
          </Link>
        )}
      </Flex>
      <Flex
        border={'1px solid'}
        borderColor={'gray.300'}
        bg={'white'}
        borderRadius={'md'}
        p={6}
        mt={4}
        direction={'column'}
      >
        {data?.stages?.map((stage, i) => {
          return (
            <Box key={i}>
              <Flex direction={'column'} mt={i !== 0 && 8} mb={4} gap={1}>
                <Flex justify={'space-between'} mb={2}>
                  <Heading size={'lg'}>{stage.name}</Heading>
                  <Center color={'gray.600'}>
                    <Icon as={IoTimeOutline} boxSize={6} />
                    <Text ml={1}>
                      {formatDistanceToNow(
                        new Date(stage.metadata.validation_time)
                      )}{' '}
                      ago
                    </Text>
                  </Center>
                </Flex>

                <Flex alignItems={'center'} gap={1}>
                  <Icon as={IoFolderOutline} color={'gray.500'} boxSize={5} />
                  <Text>
                    Asset Name:{' '}
                    {stage.metadata.active_batch_definition.data_asset_name}
                  </Text>
                </Flex>

                <Flex alignItems={'center'} gap={1}>
                  <Icon as={IoCloudOutline} color={'gray.500'} boxSize={5} />
                  <Text>
                    Source Name:{' '}
                    {stage.metadata.active_batch_definition.datasource_name}
                  </Text>
                </Flex>
              </Flex>

              <Flex direction={'column'} gap={4} mt={2}>
                <Flex direction={'column'} gap={2}>
                  <Flex justify={'space-between'}>
                    <Heading size={'md'}>Summary</Heading>
                  </Flex>

                  <Flex alignItems={'center'} gap={1}>
                    <Icon
                      as={IoCheckmarkCircleSharp}
                      color={'green.500'}
                      boxSize={5}
                    />
                    <Text>Success: {stage.summary.success}</Text>
                  </Flex>

                  <Flex alignItems={'center'} gap={1}>
                    <Icon as={IoCloseCircle} color={'red.500'} boxSize={5} />
                    <Text>Failure: {stage.summary.failure}</Text>
                  </Flex>

                  <Flex alignItems={'center'} gap={1}>
                    <Icon
                      as={IoShieldHalfOutline}
                      color={'gray.500'}
                      boxSize={5}
                    />
                    <Text>
                      Coverage:{' '}
                      {Number.parseFloat(stage.summary.coverage).toFixed(2)}
                    </Text>
                  </Flex>

                  <Flex alignItems={'center'} gap={1}>
                    <Icon as={IoCheckmark} color={'green.500'} boxSize={5} />
                    <Text>
                      Success Percentage:{' '}
                      {Number.parseFloat(stage.summary.success_percent).toFixed(
                        2
                      )}
                      %
                    </Text>
                  </Flex>
                </Flex>

                {stage.cases.map((c, j) => {
                  return (
                    <Flex key={`${i}-${j}`} direction={'column'} gap={2}>
                      <Table>
                        <Thead bgColor={'#F7FAFC'}>
                          <Tr>
                            <Th width={'10%'}>Status</Th>
                            <Th width={'20%'}>Name</Th>
                            <Th width={'40%'}>Expectation</Th>
                            <Th width={'30%'}>Result</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          <Tr>
                            <Td>
                              {c.success ? (
                                <Icon
                                  as={IoCheckmarkCircleSharp}
                                  color={'green.500'}
                                  boxSize={5}
                                />
                              ) : (
                                <Icon
                                  as={IoCloseCircle}
                                  color={'red.500'}
                                  boxSize={5}
                                />
                              )}
                            </Td>
                            <Td>{c.expectation_config.kwargs.column}</Td>
                            <Td>
                              {c.expectation_config.expectation_type}

                              {c.expectation_config?.kwargs?.min_value &&
                                c.expectation_config?.kwargs?.max_value && (
                                  <Text>
                                    Min:{c.expectation_config.kwargs.min_value},
                                    Max: {c.expectation_config.kwargs.max_value}
                                  </Text>
                                )}
                            </Td>
                            <Td>
                              {c?.result && <AssertionResult data={c.result} />}
                            </Td>
                          </Tr>
                        </Tbody>
                      </Table>
                    </Flex>
                  );
                })}
              </Flex>
            </Box>
          );
        })}
      </Flex>
    </Flex>
  );
}

function AssertionResult({ data }) {
  const hasError = data.unexpected_count > 0;

  return (
    <>
      <Box textAlign={'left'} pl={0}>
        element count: {data.element_count}
      </Box>
      <Accordion allowMultiple>
        <AccordionItem border={0}>
          <AccordionButton pl={0} pr={0} minWidth={'200px'}>
            <Box textAlign={'left'} pl={0}>
              unexpected:
              <Text as={'span'} px={'5px'} color={hasError ? 'red' : 'green'}>
                {data.unexpected_count}
              </Text>
              (
              <Text as={'span'} px={'5px'} color={hasError ? 'red' : 'green'}>
                {data.unexpected_percent}%
              </Text>
              )
            </Box>
            {hasError && <AccordionIcon />}
          </AccordionButton>
          {hasError && (
            <AccordionPanel px={'5px'} py={'3px'}>
              {data.partial_unexpected_counts.map((item, i) => (
                <Text fontSize={'.9em'} key={i}>
                  value:
                  <Code>{item.value}</Code>
                  count:
                  <Text as={'span'} fontSize={'1em'}>
                    {item.count}
                  </Text>
                </Text>
              ))}
            </AccordionPanel>
          )}
        </AccordionItem>
      </Accordion>
    </>
  );
}
