import { Flex, Text, Link, Grid, GridItem } from '@chakra-ui/react';
import { TableWrapper, TableItemName } from './TableListItemDecorations';
import { TableRowColDeltaSummary } from './TableRowColDeltaSummary';

import { TableListAssertionSummary } from './TableListAssertions';

import { Comparable } from '../../../types';
import { formatColumnValueWith, formatNumber } from '../../../utils/formatters';
import { NoData } from '../../Common';
import { AssertionPassFailCountLabel } from '../../Assertions/AssertionPassFailCountLabel';
import { getAssertionStatusCountsFromList } from '../utils';
import { tableListGridTempCols, tableListWidth } from '../../../utils/layout';
import {
  CompTableColEntryItem,
  ReportState,
  useReportStore,
} from '../../../utils/store';
import { NO_DESCRIPTION_MSG } from '../../Common/constant';
import { getIconForColumnType } from '../../Columns';
import { ColumnBadge } from './ColumnBadge';
import { useLocation } from 'wouter';

interface Props extends Comparable {
  combinedTableEntry?: CompTableColEntryItem;
  combinedAssertions?: ReportState['assertionsOnly'];
  onInfoClick: () => void;
}

export function TableListItem({
  combinedAssertions,
  combinedTableEntry,
  singleOnly,
  onInfoClick,
}: Props) {
  const { expandTreeForPath } = useReportStore.getState();
  const [tableKey, tableValue] = combinedTableEntry || [];
  const filteredBaseTableTests = combinedAssertions?.base?.filter(
    (v) => v?.table === tableKey,
  );
  const filteredTargetTableTests = combinedAssertions?.target?.filter(
    (v) => v?.table === tableKey,
  );
  const { failed: baseFailed, total: baseTotal } =
    getAssertionStatusCountsFromList(filteredBaseTableTests || []);
  const { failed: targetFailed, total: targetTotal } =
    getAssertionStatusCountsFromList(filteredTargetTableTests || []);

  const fallbackTable = tableValue?.base || tableValue?.target;

  const description = fallbackTable?.description || NO_DESCRIPTION_MSG;

  const [, setLocation] = useLocation();

  if (!combinedTableEntry) {
    return <NoData />;
  }
  return (
    <Link
      w={'100%'}
      mb={2}
      _hover={{ textDecoration: 'none' }}
      onClick={(event) => {
        expandTreeForPath(`/tables/${fallbackTable?.name}`);
        setLocation(`/tables/${fallbackTable?.name}`);
      }}
    >
      <TableWrapper>
        <Grid templateColumns={tableListGridTempCols} rowGap={3} w={'100%'}>
          {/* 1st Row */}
          <GridItem>
            <TableItemName
              name={fallbackTable?.name || ''}
              description={description}
              onInfoClick={(event) => {
                event.stopPropagation();
                onInfoClick();
              }}
            />
          </GridItem>
          <GridItem>
            <Flex color="gray.500">
              <Text mr={4}>Rows:</Text>
              {singleOnly ? (
                <Text>
                  {formatColumnValueWith(
                    fallbackTable?.__table?.row_count,
                    formatNumber,
                  )}
                </Text>
              ) : (
                <TableRowColDeltaSummary
                  baseCount={tableValue?.base?.__table?.row_count}
                  targetCount={tableValue?.target?.__table?.row_count}
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
                      const { backgroundColor, icon } = getIconForColumnType(
                        base?.type,
                      );
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
                  baseCount={tableValue?.base?.__table?.col_count}
                  targetCount={tableValue?.target?.__table?.col_count}
                />
              )}
            </Flex>
          </GridItem>
        </Grid>
      </TableWrapper>
    </Link>
  );
}
