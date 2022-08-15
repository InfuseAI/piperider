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
import {
  FiCornerDownRight,
  FiAlertCircle,
  FiCheck,
  FiX,
  FiChevronRight,
  FiGrid,
  FiArrowUpCircle,
  FiArrowDownCircle,
} from 'react-icons/fi';
import { nanoid } from 'nanoid';
import isString from 'lodash/isString';

import {
  ComparisonAssertions,
  getComparisonAssertions,
  getReportAggregateAssertions,
} from '../../utils/assertion';
import { transformAsNestedBaseTargetRecord } from '../../utils/transformers';
import {
  ComparisonReportSchema,
  CRAssertionTests,
  ReportAssertionStatusCounts,
  ZComparisonTableSchema,
  zReport,
  ZSingleSchema,
} from '../../types';
import type {
  SingleReportSchema,
  TableSchema,
} from '../../sdlc/single-report-schema';

export function CRAccordionOverview({
  data,
}: {
  data: ComparisonReportSchema;
}) {
  // console.log(tables);
  const { base, input: target } = data;
  const tables = transformAsNestedBaseTargetRecord<
    SingleReportSchema['tables'],
    TableSchema
  >(base.tables, target.tables);

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
          ZComparisonTableSchema(false).safeParse(table);

          return (
            <Flex key={nanoid()}>
              <AccordionItem>
                {({ isExpanded }) => (
                  <>
                    <AccordionButton bgColor="white" borderRadius="md">
                      <Flex
                        direction="column"
                        gap={4}
                        py="10px"
                        height={isExpanded ? '135px' : '90px'}
                      >
                        <Grid
                          templateColumns="1fr 2fr 1fr"
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
                                <Text as="span">{table.base.col_count}</Text>
                                <Text as="span">{'->'}</Text>
                                <Text as="span">{table.target.col_count}</Text>
                              </Flex>
                            )}
                          </GridItem>
                        </Grid>
                      </Flex>
                    </AccordionButton>
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

function CRAssertions({
  data,
  reportName,
}: {
  data: ComparisonReportSchema;
  reportName: string;
}) {
  const [baseOverview, targetOverview] = getComparisonAssertions({
    data,
    reportName,
    type: 'piperider',
  });

  const [dbtBaseOverview, dbtTargetOverview] = getComparisonAssertions({
    data,
    reportName,
    type: 'dbt',
  });

  const baseOverviewAssertions =
    baseOverview.tests.length + dbtBaseOverview.tests.length;
  const baseOverviewFailed = isString(baseOverview.failed)
    ? 0
    : baseOverview.failed;
  const dbtBaseOverviewFailed = isString(dbtBaseOverview.failed)
    ? 0
    : dbtBaseOverview.failed;
  const baseFailed = baseOverviewFailed + dbtBaseOverviewFailed;

  const targetOverviewAssertions =
    targetOverview.tests.length + dbtTargetOverview.tests.length;
  const targetOverviewFailed = isString(targetOverview.failed)
    ? 0
    : targetOverview.failed;
  const dbtTargetOverviewFailed = isString(dbtTargetOverview.failed)
    ? 0
    : dbtTargetOverview.failed;
  const targetFailed = targetOverviewFailed + dbtTargetOverviewFailed;

  // console.log({
  //   baseOverviewFailed,
  //   dbtBaseOverviewFailed,
  //   dbtTargetOverviewFailed,
  // });

  return (
    <Flex gap={2}>
      {/* base */}
      <Flex gap={1} alignItems="center">
        {baseFailed > 0 ? (
          <Text as="span" color="#F60059">
            {baseFailed} fails
          </Text>
        ) : (
          <>
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
            <Text as="span" color="gray.500">
              of {baseOverviewAssertions}
            </Text>
          </>
        )}
      </Flex>

      <Text as="span" color="gray.500">
        {' -> '}
      </Text>

      {/* target */}
      <Flex gap={1} alignItems="center">
        {targetFailed > 0 ? (
          <Flex gap={1}>
            <Center color="#F60059" gap={1}>
              <Icon as={FiArrowUpCircle} boxSize={4} />
              <Text as="span">{Math.abs(targetFailed - baseFailed)}</Text>
            </Center>
            <Text as="span" color="gray.500">
              /
            </Text>
            <Center gap={1}>
              <Icon
                as={
                  targetOverviewAssertions > baseOverviewAssertions
                    ? FiArrowUpCircle
                    : FiArrowDownCircle
                }
                boxSize={4}
              />
              <Text as="span">{targetOverviewAssertions}</Text>
            </Center>
          </Flex>
        ) : (
          <>
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
            <Text as="span" color="gray.500">
              of {targetOverviewAssertions}
            </Text>
          </>
        )}
      </Flex>
    </Flex>
  );
}

// function CRAssertionsBadge({
//   hasFailed,
//   assertions,
// }: {
//   hasFailed: boolean;
//   assertions: any;
// }) {
//   return (
//     <Flex gap={1} alignItems="center">
//       {hasFailed ? (
//         <Text as="span" color="#F60059">
//           {assertions.failed} fails
//         </Text>
//       ) : (
//         <Center
//           bgColor={hasFailed ? 'inherit' : '#DEFFEB'}
//           py={0.5}
//           px={1}
//           borderRadius="md"
//           color="#1F7600"
//         >
//           <Icon as={FiCheck} boxSize={4} />
//           All
//         </Center>
//       )}
//       /{' '}
//       <Text as="span">
//         {totalAssertions === 0 ? 'none' : `${totalAssertions} assertions`}
//       </Text>
//     </Flex>
//   );
// }

function CRRowsSummary({ base, target }: { base: number; target: number }) {
  if (base === target) {
    return (
      <Flex alignItems="center" gap={1}>
        <Text as="span">{base}</Text>
        <Text as="span">{'->'}</Text>
        <Text as="span">{target}</Text>
      </Flex>
    );
  }

  if (base < target) {
    return (
      <Flex gap={1} color="black">
        <Text as="span">{base}</Text>
        <Text as="span">{'->'}</Text>
        <Flex alignItems="center">
          <Icon as={FiArrowUpCircle} ml={2} mr={1} boxSize={5} />
          <Text as="span">{target}</Text>
        </Flex>
      </Flex>
    );
  }

  return (
    <Flex gap={1} color="black">
      <Text as="span">{base}</Text>
      <Text as="span">{'->'}</Text>
      <Flex alignItems="center">
        <Icon as={FiArrowDownCircle} ml={2} mr={1} boxSize={5} />
        <Text as="span">{target}</Text>
      </Flex>
    </Flex>
  );
}
