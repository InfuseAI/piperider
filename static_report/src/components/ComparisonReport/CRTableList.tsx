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
import { FiAlertCircle, FiChevronRight, FiGrid } from 'react-icons/fi';
import { Link } from 'wouter';
import { nanoid } from 'nanoid';
import { useLocalStorage } from 'usehooks-ts';

import { CRTabSchemaDetails } from './CRTabSchemaDetails';
import { CRAssertions } from './CRAssertions';
import { CRColumnsSummary } from './CRColumnsSummary';
import { CRRowsSummary } from './CRRowsSummary';
import { CRColumnDetail } from './CRColumnDetail';
import {
  getIconForColumnType,
  transformAsNestedBaseTargetRecord,
} from '../../utils/transformers';
import {
  ComparisonReportSchema,
  zReport,
  ZSingleSchema,
  ZComparisonTableSchema,
} from '../../types';
import type {
  SingleReportSchema,
  TableSchema,
  ColumnSchema,
} from '../../sdlc/single-report-schema';
import type { TableActionBarView } from '../shared/TableActionBar';
import { CR_LIST_VIEW } from '../../utils/localStorageKeys';

export function CRTableList({ data }: { data: ComparisonReportSchema }) {
  const { base, input: target } = data;
  const tables = transformAsNestedBaseTargetRecord<
    SingleReportSchema['tables'],
    TableSchema
  >(base.tables, target.tables);

  const [view] = useLocalStorage<TableActionBarView>(CR_LIST_VIEW, 'summary');

  zReport(ZSingleSchema.safeParse(base));
  zReport(ZSingleSchema.safeParse(target));

  return (
    <Flex direction="column" width="900px" minHeight="650px">
      <Grid templateColumns="218px 2fr 1.5fr" px={4} my={6}>
        <Text width="100px">Name</Text>
        <Text width="">Summary</Text>
        <Text>Assertions</Text>
      </Grid>

      <Accordion allowToggle>
        {Object.keys(tables).map((key) => {
          const table = tables[key];
          ZComparisonTableSchema(false).safeParse(table);

          return (
            <Flex key={nanoid()}>
              <AccordionItem>
                {({ isExpanded }) => (
                  <>
                    <AccordionButton
                      bgColor="white"
                      borderRadius="md"
                      data-cy="cr-table-overview-btn"
                    >
                      <Flex
                        direction="column"
                        gap={4}
                        py="10px"
                        maxH={isExpanded ? '135px' : '90px'}
                      >
                        <Grid
                          templateColumns="218px 2fr 1.5fr 2.8rem"
                          justifyItems="flex-start"
                          width="calc(900px - 30px)"
                        >
                          <GridItem>
                            <Center>
                              <Icon as={FiGrid} color="piperider.500" />
                              <Text mx={1}>{table.target.name}</Text>

                              {!isExpanded && (
                                <Tooltip
                                  label={table.target.description}
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
                              <CRRowsSummary
                                base={table.base.row_count || 0}
                                target={table.target.row_count || 0}
                              />
                            </Flex>
                          </GridItem>
                          <GridItem>
                            <CRAssertions data={data} reportName={key} />
                          </GridItem>
                          <GridItem>
                            {isExpanded && (
                              <Link key={nanoid()} href={`/tables/${key}`}>
                                <Flex
                                  as="a"
                                  data-cy="cr-navigate-report-detail"
                                >
                                  <Icon
                                    as={FiChevronRight}
                                    color="piperider.500"
                                    boxSize={6}
                                  />
                                </Flex>
                              </Link>
                            )}
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
                                  title={table.target.description}
                                >
                                  {table.target.description}
                                </Text>
                              </Text>
                            ) : (
                              <Flex
                                mr="30px"
                                color="gray.500"
                                maxWidth="650px"
                                gap={1}
                              >
                                <Text as="span" mr={4}>
                                  Columns
                                </Text>
                                <CRColumnsSummary
                                  base={table.base.col_count || 0}
                                  target={table.target.col_count || 0}
                                />
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
                            table.base.piperider_assertion_result?.columns ||
                              {},
                          ).map((colName) => {
                            const mergedBaseColAssertions = [
                              ...(table.base.piperider_assertion_result
                                ?.columns?.[colName] || []),
                              ...(table.base.dbt_assertion_result?.columns?.[
                                colName
                              ] || []),
                            ];

                            const mergedTargetColAssertions = [
                              ...(table.target.piperider_assertion_result
                                ?.columns?.[colName] || []),
                              ...(table.target.dbt_assertion_result?.columns?.[
                                colName
                              ] || []),
                            ];

                            const { icon: colIcon } = getIconForColumnType(
                              table.target.columns[colName],
                            );

                            const transformedData =
                              transformAsNestedBaseTargetRecord<
                                TableSchema['columns'],
                                ColumnSchema
                              >(table.base.columns, table.target.columns);

                            return (
                              <CRColumnDetail
                                key={colName}
                                name={colName}
                                data={transformedData[colName]}
                                icon={colIcon}
                                baseColAssertions={mergedBaseColAssertions}
                                targetColAssertions={mergedTargetColAssertions}
                              />
                            );
                          })}
                        </Stack>
                      ) : (
                        <CRTabSchemaDetails
                          visibleDetail={false}
                          base={table.base}
                          target={table.target}
                        />
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
