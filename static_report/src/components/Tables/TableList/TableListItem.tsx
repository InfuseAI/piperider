import { Flex, Text, Icon, Link, Grid, GridItem } from '@chakra-ui/react';
import { BsChevronRight } from 'react-icons/bs';
import { TableWrapper, TableItemName } from './TableListItemDecorations';
import { TableRowColDeltaSummary } from './TableRowColDeltaSummary';

import { TableListAssertionSummary } from './TableListAssertions';

import { Comparable, Selectable } from '../../../types';
import { formatColumnValueWith, formatNumber } from '../../../utils/formatters';
import { NoData } from '../../Layouts';
import { AssertionPassFailCountLabel } from '../../Assertions/AssertionPassFailCountLabel';
import { getAssertionStatusCountsFromList } from '../utils';
import {
  tableListGridTempCols,
  tableListMaxWidth,
  tableListWidth,
} from '../../../utils/layout';
import { CompTableColEntryItem, ReportState } from '../../../utils/store';
import { NO_DESCRIPTION_MSG } from '../../Common/constant';
import { getIconForColumnType } from '../../Columns';
import { ColumnBadge } from './ColumnBadge';

interface Props extends Selectable, Comparable {
  combinedTableEntry?: CompTableColEntryItem;
  combinedAssertions?: ReportState['assertionsOnly'];
  onInfoClick: () => void;
}

export function TableListItem({
  combinedAssertions,
  combinedTableEntry,
  onSelect,
  singleOnly,
  ...props
}: Props) {
  const [tableName, tableValue] = combinedTableEntry || [];
  const filteredBaseTableTests = combinedAssertions?.base?.filter(
    (v) => v?.table === tableName,
  );
  const filteredTargetTableTests = combinedAssertions?.target?.filter(
    (v) => v?.table === tableName,
  );
  const { failed: baseFailed, total: baseTotal } =
    getAssertionStatusCountsFromList(filteredBaseTableTests || []);
  const { failed: targetFailed, total: targetTotal } =
    getAssertionStatusCountsFromList(filteredTargetTableTests || []);

  const fallbackTable = tableValue?.base || tableValue?.target;

  const description = fallbackTable?.description || NO_DESCRIPTION_MSG;

  if (!combinedTableEntry) {
    return <NoData />;
  }
  return (
    <TableWrapper>
      <Grid
        templateColumns={tableListGridTempCols}
        width={tableListMaxWidth}
        justifyItems="flex-start"
        position={'relative'}
        rowGap={3}
      >
        {/* 1st Row */}
        <GridItem>
          <TableItemName
            name={tableName || ''}
            description={description}
            onInfoClick={() => {
              props.onInfoClick();
            }}
          />
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
            {singleOnly && (
              <AssertionPassFailCountLabel
                total={baseTotal}
                failed={baseFailed}
              />
            )}
            {!singleOnly && (
              <TableListAssertionSummary
                baseAssertionFailed={baseFailed}
                baseAssertionTotal={baseTotal}
                targetAssertionFailed={targetFailed}
                targetAssertionTotal={targetTotal}
              />
            )}
            <Link
              onClick={(event) => {
                event.stopPropagation();
                onSelect({ tableName });
              }}
            >
              <Icon
                data-cy="navigate-report-detail"
                position={'absolute'}
                right={0}
                ml={5}
                as={BsChevronRight}
                color="piperider.500"
              />
            </Link>
          </Flex>
        </GridItem>
        {/* 2nd Row */}
        <GridItem />
        <GridItem colSpan={2}>
          <Flex color="gray.500" maxWidth={tableListWidth * 0.5}>
            <Text as="span" mr={4}>
              Columns:
            </Text>
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
            )}
          </Flex>
        </GridItem>
      </Grid>
    </TableWrapper>
  );
}
