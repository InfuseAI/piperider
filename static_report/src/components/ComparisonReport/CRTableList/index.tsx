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

import { CRTableSchemaDetails } from './CRTableSchemaDetails';
import { CRTableListAssertions } from './CRTableListAssertions';
import { CRTableListColumnsSummary } from './CRTableListColumnsSummary';
import { CRTableListRowsSummary } from './CRTableListRowsSummary';
import { CRTableListColumnList } from './CRTableListColumnList';
import { transformAsNestedBaseTargetRecord } from '../../../utils/transformers';
import {
  ComparisonReportSchema,
  zReport,
  ZSingleSchema,
  ZComparisonTableSchema,
  SaferSRSchema,
  SaferTableSchema,
} from '../../../types';
import type { TableActionBarView } from '../../shared/TableActionBar';

function getDisplayNameByBaseOrTargetField({
  baseField,
  targetField,
}: {
  baseField?: string;
  targetField?: string;
}) {
  if (!targetField) {
    return baseField;
  }

  return targetField;
}

export function CRTableList({
  data,
  view,
}: {
  data: ComparisonReportSchema;
  view: TableActionBarView;
}) {
  const { base, input: target } = data;
  const tables = transformAsNestedBaseTargetRecord<
    SaferSRSchema['tables'],
    SaferTableSchema
  >(base.tables, target.tables);

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

          const columnName = getDisplayNameByBaseOrTargetField({
            baseField: table?.base?.name,
            targetField: table?.target?.name,
          });
          const description = getDisplayNameByBaseOrTargetField({
            baseField: table?.base?.description,
            targetField: table?.target?.description,
          });

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
                              <Text mx={1}>{columnName}</Text>

                              {!isExpanded && (
                                <Tooltip
                                  shouldWrapChildren
                                  placement="right-end"
                                  label={description}
                                >
                                  <Icon as={FiAlertCircle} ml={1} />
                                </Tooltip>
                              )}
                            </Center>
                          </GridItem>
                          <GridItem>
                            <Flex gap={10} color="gray.500">
                              <Text>Rows</Text>
                              <CRTableListRowsSummary
                                baseCount={table?.base?.row_count}
                                targetCount={table?.target?.row_count}
                              />
                            </Flex>
                          </GridItem>
                          <GridItem>
                            <CRTableListAssertions
                              data={data}
                              reportName={key}
                            />
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
                                <Text as="span" ml={4} title={description}>
                                  {description}
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
                                <CRTableListColumnsSummary
                                  baseCount={table?.base?.col_count}
                                  targetCount={table?.target?.col_count}
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
                          <CRTableListColumnList
                            baseTableDatum={table?.base}
                            targetTableDatum={table?.target}
                          />
                        </Stack>
                      ) : (
                        <CRTableSchemaDetails
                          visibleDetail={false}
                          baseTableDatum={table?.base}
                          targetTableDatum={table?.target}
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
