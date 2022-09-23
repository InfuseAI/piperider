import { Text, Grid, GridItem } from '@chakra-ui/react';
import { formatDuration, intervalToDuration, subSeconds } from 'date-fns';

import {
  Comparable,
  SaferTableSchema,
  zReport,
  ZTableSchema,
} from '../../../types';
import {
  formatBytes,
  formatIntervalMinMax,
  formatNumber,
  formatReportTime,
} from '../../../utils/formatters';
import { MetricsInfo } from '../Columns/ColumnMetrics/MetricsInfo';
import { DupedTableRowsWidget } from '../Widgets/DupedTableRowsWidget';
import { NO_DESCRIPTION_MSG } from './constant';

interface Props extends Comparable {
  baseTable?: SaferTableSchema;
  targetTable?: SaferTableSchema;
}

export function TableOverview({ baseTable, targetTable, singleOnly }: Props) {
  zReport(ZTableSchema.safeParse(baseTable));
  zReport(ZTableSchema.safeParse(targetTable));

  const fallback = baseTable || targetTable;

  return (
    <Grid mb={8} gap={6} templateColumns={singleOnly ? '1fr 1fr' : '1fr 1fr'}>
      {/* Overview Metrics Section */}
      <GridItem gap={2} colSpan={1} my={singleOnly ? 0 : 3}>
        {!singleOnly && (
          // FIXME: use MetricMetaKeyList!
          <MetricsInfo
            name=""
            firstSlot={'Base'}
            firstSlotWidth={'16em'}
            secondSlot={'Target'}
            secondSlotWidth={'16em'}
            fontWeight={'bold'}
            mb={3}
          />
        )}
        <MetricsInfo
          name="Rows"
          metakey="row_count"
          firstSlot={formatNumber(baseTable?.row_count)}
          firstSlotWidth={'16em'}
          secondSlot={formatNumber(targetTable?.row_count)}
          secondSlotWidth={'16em'}
        />
        <MetricsInfo
          name="Columns"
          metakey="col_count"
          firstSlot={formatNumber(baseTable?.col_count)}
          firstSlotWidth={'16em'}
          secondSlot={formatNumber(targetTable?.col_count)}
          secondSlotWidth={'16em'}
        />
        {/* {baseTable?.duplicate_rows && (
          // FIXME: Comparison ? (single-view)
          <MetricsInfo
            name="Samples"
            firstSlot={formatIntervalMinMax(
              Number(baseTable?.total) / Number(baseTable?.row_count),
            )}
            firstSlotWidth={'16em'}
            secondSlot={formatNumber(baseTable?.total)}
            secondSlotWidth={'16em'}
          />
        )} */}

        {/* CDW metadata */}

        {fallback?.bytes && (
          <MetricsInfo
            name="Volume Size"
            metakey="bytes"
            firstSlot={formatBytes(baseTable?.bytes)}
            firstSlotWidth={'16em'}
            secondSlot={formatBytes(targetTable?.bytes)}
            secondSlotWidth={'16em'}
            tooltipValues={{
              firstSlot: `${formatNumber(baseTable?.bytes)} bytes`,
              secondSlot: `${formatNumber(targetTable?.bytes)} bytes`,
            }}
          />
        )}

        {fallback?.created && (
          <MetricsInfo
            name="Created At"
            metakey="created"
            firstSlot={formatReportTime(baseTable?.created)}
            firstSlotWidth={'16em'}
            secondSlot={formatReportTime(targetTable?.created)}
            secondSlotWidth={'16em'}
          />
        )}
        {fallback?.last_altered && (
          <MetricsInfo
            name="Last Altered"
            metakey="last_altered"
            firstSlot={formatReportTime(baseTable?.last_altered)}
            firstSlotWidth={'16em'}
            secondSlot={formatReportTime(targetTable?.last_altered)}
            secondSlotWidth={'16em'}
          />
        )}
        {fallback?.freshness && (
          <MetricsInfo
            name="Freshness"
            metakey="freshness"
            firstSlot={formatDuration(
              intervalToDuration({
                start: subSeconds(new Date(), baseTable?.freshness || 0),
                end: new Date(),
              }),
            )}
            firstSlotWidth={'16em'}
            secondSlot={formatDuration(
              intervalToDuration({
                start: subSeconds(new Date(), targetTable?.freshness || 0),
                end: new Date(),
              }),
            )}
            secondSlotWidth={'16em'}
          />
        )}
      </GridItem>
      {/* Description Section */}
      <GridItem colSpan={1}>
        <Text
          fontSize="sm"
          border={'1px solid lightgray'}
          p={2}
          h={'12em'}
          overflow={'auto'}
        >
          {fallback?.description ?? NO_DESCRIPTION_MSG}
        </Text>
      </GridItem>

      <GridItem colSpan={1} height={300}>
        <DupedTableRowsWidget tableDatum={fallback} />
      </GridItem>
    </Grid>
  );
}
