import {
  Flex,
  Grid,
  Text,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  GridItem,
  Center,
  Stack,
  Icon,
  Tooltip,
} from '@chakra-ui/react';
import { FiAlertCircle, FiCheck, FiChevronRight, FiGrid } from 'react-icons/fi';
import { nanoid } from 'nanoid';
import { Link } from 'wouter';
import { useLocalStorage } from 'usehooks-ts';

import { SRSchemaDetail } from './SRSchemaDetail';
import { SRColumnLabel } from './SRColumnLabel';
import { SRColumnDetail } from './SRColumnDetail';
import { zReport, ZTableSchema } from '../../types';
import { getReportAggregateAssertions } from '../../utils/assertion';
import { formatColumnValueWith, formatNumber } from '../../utils/formatters';
import { getIconForColumnType } from '../../utils/transformers';
import { type SingleReportSchema } from '../../sdlc/single-report-schema';
import { SR_LIST_VIEW } from '../../utils/localStorageKeys';
import { singleReportSchemaSchema } from '../../sdlc/single-report-schema.z';
import { type TableActionBarView } from '../shared/TableActionBar';

export function SRTableList({ data }: { data: SingleReportSchema }) {
  const { id, created_at, datasource, tables } = data;
  const [view] = useLocalStorage<TableActionBarView>(SR_LIST_VIEW, 'summary');

  zReport(
    singleReportSchemaSchema
      .pick({ id: true, created_at: true, datasource: true })
      .safeParse({ id, created_at, datasource }),
  );

  return (
    <Flex direction="column" width="900px" minHeight="650px">
      <Grid templateColumns="1fr 2fr 1fr" px={4} my={6}>
        <Text width="100px">Name</Text>
        <Text width="">Summary</Text>
        <Text>Assertions</Text>
      </Grid>

      <Accordion allowToggle>
        {Object.keys(tables).map((key) => {
          const table = tables[key];

          zReport(ZTableSchema.safeParse(table));

          const assertions = getReportAggregateAssertions(
            table.piperider_assertion_result,
            table.dbt_assertion_result,
          );
          const totalAssertions = assertions.passed + assertions.failed;
          const hasFailed = assertions.failed > 0;

          const columns = Object.keys(table.columns).map((key) => key);

          return (
            <Flex key={nanoid()}>
              <AccordionItem>
                {({ isExpanded }) => (
                  <>
                    <AccordionButton
                      bgColor="white"
                      borderRadius="md"
                      data-cy="sr-table-overview-btn"
                    >
                      <Flex
                        direction="column"
                        gap={4}
                        py="10px"
                        maxHeight={isExpanded ? '135px' : '90px'}
                      >
                        <Grid
                          templateColumns="1fr 2fr 1fr"
                          justifyItems="flex-start"
                          width="calc(900px - 30px)"
                        >
                          <GridItem>
                            <Center>
                              <Icon as={FiGrid} color="piperider.500" />
                              <Text mx={1}>{table.name}</Text>

                              {!isExpanded && (
                                <Tooltip
                                  label={table.description}
                                  placement="right-end"
                                  shouldWrapChildren
                                >
                                  <Icon as={FiAlertCircle} ml={1} />
                                </Tooltip>
                              )}
                            </Center>
                          </GridItem>
                          <GridItem>
                            <Flex gap={10} color="gray.500">
                              <Text>Rows</Text>
                              <Text>
                                {formatColumnValueWith(
                                  table.row_count,
                                  formatNumber,
                                )}
                              </Text>
                            </Flex>
                          </GridItem>
                          <GridItem>
                            <Flex gap={1} alignItems="center">
                              {hasFailed ? (
                                <Text as="span" color="#F60059">
                                  {assertions.failed} fails
                                </Text>
                              ) : (
                                <Center
                                  bgColor="#DEFFEB"
                                  py={0.5}
                                  px={1}
                                  borderRadius="md"
                                  color="#1F7600"
                                >
                                  <Icon as={FiCheck} boxSize={4} />
                                  All
                                </Center>
                              )}
                              <Text as="span" color="gray.500">
                                /
                              </Text>
                              <Text as="span" mr={3}>
                                {totalAssertions === 0
                                  ? 'none'
                                  : `${totalAssertions} assertions`}
                              </Text>
                              {isExpanded && (
                                <Link key={table.name} href={`/tables/${key}`}>
                                  <Flex
                                    as="a"
                                    data-cy="sr-navigate-report-detail"
                                  >
                                    <Icon
                                      as={FiChevronRight}
                                      color="piperider.500"
                                      boxSize={6}
                                    />
                                  </Flex>
                                </Link>
                              )}
                            </Flex>
                          </GridItem>
                        </Grid>
                        <Grid
                          templateColumns="218px 1fr"
                          justifyItems="flex-start"
                          width="calc(900px - 30px)"
                        >
                          <GridItem>
                            <Flex />
                          </GridItem>
                          <GridItem>
                            {isExpanded ? (
                              <Text
                                color="gray.500"
                                noOfLines={3}
                                textAlign="left"
                              >
                                <Text as="span">Description</Text>{' '}
                                <Text
                                  as="span"
                                  ml={4}
                                  title={table.description}
                                >
                                  {table.description}
                                </Text>
                              </Text>
                            ) : (
                              <Flex mr="30px" color="gray.500" maxWidth="650px">
                                <Text
                                  as="span"
                                  minWidth="95px"
                                  maxWidth="205px"
                                  textAlign="left"
                                >
                                  {table.col_count} Columns
                                </Text>
                                <Flex
                                  __css={{
                                    display: 'flex',
                                    gap: 3,
                                    alignItems: 'center',
                                    maxWidth: '100%',
                                    overflowX: 'scroll',
                                    scrollbarWidth: 'none',
                                    '&::-webkit-scrollbar': {
                                      display: 'none',
                                    },
                                  }}
                                >
                                  {columns.map((name) => (
                                    <SRColumnLabel
                                      key={name}
                                      name={name}
                                      icon={
                                        getIconForColumnType(
                                          table.columns[name],
                                        ).icon
                                      }
                                    />
                                  ))}
                                </Flex>
                              </Flex>
                            )}
                          </GridItem>
                        </Grid>
                      </Flex>
                    </AccordionButton>

                    <AccordionPanel bgColor="white">
                      {view === 'summary' ? (
                        <Stack gap={6}>
                          {Object.keys(
                            table.piperider_assertion_result?.columns || {},
                          ).map((colName) => {
                            const mergedColAssertions = [
                              ...(table.piperider_assertion_result?.columns?.[
                                colName
                              ] || []),
                              ...(table.dbt_assertion_result?.columns?.[
                                colName
                              ] || []),
                            ];

                            const { icon: colIcon } = getIconForColumnType(
                              table.columns[colName],
                            );

                            return (
                              <SRColumnDetail
                                key={colName}
                                name={colName}
                                data={table.columns[colName]}
                                colAssertions={mergedColAssertions}
                                icon={colIcon}
                              />
                            );
                          })}
                        </Stack>
                      ) : (
                        <SRSchemaDetail table={table} />
                      )}
                    </AccordionPanel>
                  </>
                )}
              </AccordionItem>
            </Flex>
          );
        })}
      </Accordion>
    </Flex>
  );
}
