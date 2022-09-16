import { Flex, Grid, Text, GridItem, Icon } from '@chakra-ui/react';
import { FiChevronRight } from 'react-icons/fi';
import { ReactNode } from 'react';

import {
  TableListItem,
  TableItemName,
  TableItemDescription,
} from '../TableListItem';
import { CRTableListColumnsSummary } from './CRTableListColumnsSummary';
import { CRTableListDeltaSummary } from './CRTableListDeltaSummary';

import type {
  Comparable,
  SaferTableSchema,
  Selectable,
} from '../../../../../types';
import {
  formatColumnValueWith,
  formatNumber,
} from '../../../../../utils/formatters';
import { SRTableListColumnLabel } from '../SRTableListItem/SRTableListColumnLabel';
import { getIconForColumnType } from '../../../Columns/utils';
import { NoData } from '../../../Layouts';
import { AssertionLabel } from '../../../Assertions/AssertionLabel';

interface Props extends Selectable, Comparable {
  isExpanded: boolean;
  baseTableDatum?: SaferTableSchema;
  targetTableDatum?: SaferTableSchema;
  children: ReactNode; //e.g. CRTableListAssertions
}

export function CRTableListItem({
  isExpanded,
  baseTableDatum,
  targetTableDatum,
  onSelect,
  singleOnly,
  children,
}: Props) {
  const fallbackTable = baseTableDatum || targetTableDatum;
  const tableName = fallbackTable?.name;
  const description =
    baseTableDatum?.description || targetTableDatum?.description;
  //SR vars
  const columns = Object.keys(baseTableDatum?.columns || {}).map((key) => key);

  // const { failed, total } = getReportAggregateAssertions(
  //   table?.piperider_assertion_result,
  //   table?.dbt_assertion_result,
  // );
  if (!fallbackTable) {
    return <NoData />;
  }
  return (
    <TableListItem isExpanded={isExpanded} data-cy="cr-table-overview-btn">
      <Grid
        templateColumns="218px 2fr 1.5fr"
        justifyItems="flex-start"
        width="calc(900px - 30px)"
      >
        <GridItem>
          <TableItemName
            name={tableName || ''}
            description={description}
            descriptionIconVisible={isExpanded}
          />
        </GridItem>
        <GridItem>
          <Flex gap={10} color="gray.500" bg={'yellow.100'}>
            <Text>Rows</Text>
            {/* DIFF_1 */}
            {singleOnly ? (
              <Text>
                {formatColumnValueWith(fallbackTable?.row_count, formatNumber)}
              </Text>
            ) : (
              <CRTableListDeltaSummary
                baseCount={baseTableDatum?.row_count}
                targetCount={targetTableDatum?.row_count}
              />
            )}
          </Flex>
        </GridItem>
        <GridItem bg={'orange.100'}>
          {/* DIFF_2 */}
          {/* <AssertionLabel total={total} failed={failed} /> */}
          <Flex gap={2}>
            {children}
            {isExpanded && (
              <Flex
                as="a"
                data-cy="cr-navigate-report-detail"
                onClick={(event) => {
                  event.stopPropagation();
                  onSelect({ tableName });
                }}
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
            <TableItemDescription description={description || ''} />
          ) : (
            <Flex
              mr="30px"
              color="gray.500"
              maxWidth="650px"
              gap={1}
              bg={'cyan.100'}
            >
              <Text as="span" mr={4}>
                Columns
              </Text>
              {/* DIFF_3 */}
              {singleOnly ? (
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
                  {columns.length > 0 &&
                    columns.map((name) => (
                      <SRTableListColumnLabel
                        key={name}
                        name={name}
                        icon={
                          getIconForColumnType(baseTableDatum?.columns[name])
                            .icon
                        }
                      />
                    ))}
                </Flex>
              ) : (
                <CRTableListColumnsSummary
                  baseCount={baseTableDatum?.col_count}
                  targetCount={targetTableDatum?.col_count}
                />
              )}
            </Flex>
          )}
        </GridItem>
      </Grid>
    </TableListItem>
  );
}
