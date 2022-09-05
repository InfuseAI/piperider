import {
  Flex,
  Grid,
  Text,
  AccordionButton,
  GridItem,
  Center,
  Icon,
  Tooltip,
} from '@chakra-ui/react';
import { FiAlertCircle, FiCheck, FiChevronRight, FiGrid } from 'react-icons/fi';

import { SaferTableSchema, Selectable } from '../../../types';
import { getReportAggregateAssertions } from '../../../utils/assertion';
import { NoData } from '../../shared/NoData';
import { formatColumnValueWith, formatNumber } from '../../../utils/formatters';
import { SRTableListColumnLabel } from './SRTableListColumnLabel';
import { getIconForColumnType } from '../../../utils/transformers';

interface Props extends Selectable {
  isExpanded: boolean;
  tableDatum?: SaferTableSchema;
}
export function SRTableListItem({
  isExpanded,
  tableDatum: table,
  onSelect,
}: Props) {
  const assertions = getReportAggregateAssertions(
    table?.piperider_assertion_result,
    table?.dbt_assertion_result,
  );
  const totalAssertions = assertions.passed + assertions.failed;
  const hasFailed = assertions.failed > 0;

  const columns = Object.keys(table?.columns || {}).map((key) => key);

  if (!table) return <NoData />;
  return (
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
                {formatColumnValueWith(table.row_count, formatNumber)}
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
                <Flex
                  as="a"
                  data-cy="sr-navigate-report-detail"
                  onClick={() => onSelect({ tableName: table?.name })}
                >
                  <Icon as={FiChevronRight} color="piperider.500" boxSize={6} />
                </Flex>
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
              <Text color="gray.500" noOfLines={3} textAlign="left">
                <Text as="span">Description</Text>{' '}
                <Text as="span" ml={4} title={table.description}>
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
                  {columns &&
                    columns.map((name) => (
                      <SRTableListColumnLabel
                        key={name}
                        name={name}
                        icon={getIconForColumnType(table.columns[name]).icon}
                      />
                    ))}
                </Flex>
              </Flex>
            )}
          </GridItem>
        </Grid>
      </Flex>
    </AccordionButton>
  );
}
