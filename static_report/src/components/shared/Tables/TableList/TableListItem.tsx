import { Flex, Grid, Text, GridItem, Icon, Link } from '@chakra-ui/react';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi';

import {
  TableAccordionWrapper,
  TableItemName,
} from './TableListItemDecorations';
import { TableRowColDeltaSummary } from './TableRowColDeltaSummary';

import { TableListAssertionSummary } from './TableListAssertions';

import { Comparable, Selectable } from '../../../../types';
import {
  formatColumnValueWith,
  formatNumber,
} from '../../../../utils/formatters';
import { ColumnBadge } from './ColumnBadge';
import { getIconForColumnType } from '../../Columns/utils';
import { NoData } from '../../Layouts';
import { AssertionLabel } from '../../Assertions/AssertionLabel';
import { getAssertionStatusCountsFromList } from '../utils';
import {
  tableListGridTempCols,
  tableListMaxWidth,
} from '../../../../utils/layout';
import { ColumnSchemaDeltaSummary } from './ColumnSchemaDeltaSummary';
import { CompTableColEntryItem } from '../store';
import { NO_DESCRIPTION_MSG } from '../constant';
import { base_parse } from 'node-html-parser/dist/nodes/html';

interface Props extends Selectable, Comparable {
  isExpanded: boolean;
  combinedTableEntry?: CompTableColEntryItem;
}

export function TableListItem({
  isExpanded,
  combinedTableEntry,
  onSelect,
  singleOnly,
}: Props) {
  const [tableName, tableValue] = combinedTableEntry || [];

  const fallbackTable = tableValue?.base || tableValue?.target;
  const description = fallbackTable?.description || NO_DESCRIPTION_MSG;

  // const { failed: baseFailed, total: baseTotal } =
  //   getAssertionStatusCountsFromList([
  //     baseTableDatum?.piperider_assertion_result,
  //     baseTableDatum?.dbt_assertion_result,
  //   ]);
  // const { failed: targetFailed, total: targetTotal } =
  //   getAssertionStatusCountsFromList([
  //     targetTableDatum?.piperider_assertion_result,
  //     targetTableDatum?.dbt_assertion_result,
  //   ]);

  // const comparedColumns = transformAsNestedBaseTargetRecord<
  //   SaferTableSchema['columns'],
  //   ColumnSchema
  // >(baseTableDatum?.columns, targetTableDatum?.columns, { metadata: true });

  //FIXME: Map as part of stored entry value
  // const {
  //   __meta__: { added, deleted, changed },
  // } = comparedColumns;
  if (!combinedTableEntry) {
    return <NoData />;
  }
  return (
    <TableAccordionWrapper
      isExpanded={isExpanded}
      data-cy="table-list-accordion-btn"
    >
      <Grid
        templateColumns={tableListGridTempCols}
        width={tableListMaxWidth}
        justifyItems="flex-start"
        position={'relative'}
        rowGap={3}
      >
        {/* 1st Row */}
        <GridItem>
          <TableItemName name={tableName || ''} description={description} />
        </GridItem>
        <GridItem>
          <Flex color="gray.500">
            <Text mr={4}>Rows:</Text>
            {singleOnly ? (
              <Text>
                {formatColumnValueWith(fallbackTable?.row_count, formatNumber)}
              </Text>
            ) : (
              <TableRowColDeltaSummary
                baseCount={tableValue?.base?.row_count}
                targetCount={tableValue?.target?.row_count}
              />
            )}
          </Flex>
        </GridItem>
        <GridItem>
          <Flex gap={2}>
            {/* {singleOnly && (
              <AssertionLabel total={baseTotal} failed={baseFailed} />
            )}
            {!singleOnly && (
              <TableListAssertionSummary
                baseAssertionFailed={baseFailed}
                baseAssertionTotal={baseTotal}
                targetAssertionFailed={targetFailed}
                targetAssertionTotal={targetTotal}
              />
            )} */}
            <Icon
              position={'absolute'}
              right={0}
              ml={5}
              as={isExpanded ? FiChevronUp : FiChevronDown}
              color="piperider.500"
              boxSize={6}
            />
          </Flex>
        </GridItem>
        {/* 2nd Row */}
        <GridItem>
          <Link
            data-cy="navigate-report-detail"
            onClick={(event) => {
              event.stopPropagation();
              onSelect({ tableName });
            }}
          >
            <Text
              py={1}
              px={2}
              borderRadius={'md'}
              bg={'blue.700'}
              color={'white'}
            >
              Table Details
            </Text>
          </Link>
        </GridItem>
        <GridItem colSpan={2}>
          <Flex color="gray.500" maxWidth="650px">
            <Text as="span" mr={4}>
              Columns:
            </Text>
            {isExpanded &&
              (singleOnly ? (
                <Text>
                  {formatColumnValueWith(
                    fallbackTable?.col_count,
                    formatNumber,
                  )}
                </Text>
              ) : (
                <></>
                //FIXME:
                // <ColumnSchemaDeltaSummary
                //   added={fallbackTable?.columns.added}
                //   deleted={fallbackTable?.columns.deleted}
                //   changed={fallbackTable?.columns.changed}
                // />
              ))}
            {!isExpanded &&
              (singleOnly ? (
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
                  {fallbackTable &&
                    fallbackTable.columns?.length > 0 &&
                    fallbackTable.columns.map(([colName, { base }]) => {
                      const { backgroundColor, icon } =
                        getIconForColumnType(base);
                      return (
                        <ColumnBadge
                          key={colName}
                          name={colName}
                          icon={icon}
                          iconColor={backgroundColor}
                        />
                      );
                    })}
                </Flex>
              ) : (
                <TableRowColDeltaSummary
                  baseCount={tableValue?.base?.col_count}
                  targetCount={tableValue?.target?.col_count}
                />
              ))}
          </Flex>
        </GridItem>
      </Grid>
    </TableAccordionWrapper>
  );
}
