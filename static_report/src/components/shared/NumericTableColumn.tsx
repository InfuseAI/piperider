import { Flex } from '@chakra-ui/react';
import { ColumnSchema } from '../../sdlc/single-report-schema';
import { ZColSchema, zReport } from '../../types';
import { formatColumnValueWith, formatNumber } from '../../utils/formatters';
import { NO_VALUE } from './ColumnCard/ColumnTypeDetail/constants';
import { MetricsInfo } from './MetricsInfo';

type Props = {
  baseColumn: ColumnSchema;
  targetColumn?: ColumnSchema | null;
};

export function NumericTableColumn({ baseColumn, targetColumn }: Props) {
  const isTargetNull = targetColumn === null;
  const isTargetUndefined = targetColumn === undefined;
  zReport(ZColSchema.safeParse(baseColumn));
  zReport(ZColSchema.safeParse(baseColumn));
  return (
    <>
      <Flex direction="column">
        <MetricsInfo
          name="Average"
          metakey="avg"
          firstSlot={formatColumnValueWith(baseColumn?.avg, formatNumber)}
          secondSlot={
            isTargetNull
              ? NO_VALUE
              : isTargetUndefined
              ? undefined
              : formatColumnValueWith(targetColumn?.avg, formatNumber)
          }
        />
        <MetricsInfo
          name="SD"
          metakey="stddev"
          firstSlot={formatColumnValueWith(baseColumn?.stddev, formatNumber)}
          secondSlot={
            isTargetNull
              ? NO_VALUE
              : isTargetUndefined
              ? undefined
              : formatColumnValueWith(targetColumn?.stddev, formatNumber)
          }
        />
      </Flex>
      <Flex direction="column">
        <MetricsInfo
          name="Min"
          metakey="min"
          firstSlot={formatColumnValueWith(baseColumn?.min, formatNumber)}
          secondSlot={
            isTargetNull
              ? NO_VALUE
              : isTargetUndefined
              ? undefined
              : formatColumnValueWith(targetColumn?.min, formatNumber)
          }
        />
        <MetricsInfo
          name="5%"
          metakey="p5"
          firstSlot={formatColumnValueWith(baseColumn?.p5, formatNumber)}
          secondSlot={
            isTargetNull
              ? NO_VALUE
              : isTargetUndefined
              ? undefined
              : formatColumnValueWith(targetColumn?.p5, formatNumber)
          }
        />
        <MetricsInfo
          name="25%"
          metakey="p25"
          firstSlot={formatColumnValueWith(baseColumn?.p25, formatNumber)}
          secondSlot={
            isTargetNull
              ? NO_VALUE
              : isTargetUndefined
              ? undefined
              : formatColumnValueWith(targetColumn?.p25, formatNumber)
          }
        />
        <MetricsInfo
          name="50%"
          metakey="p50"
          firstSlot={formatColumnValueWith(baseColumn?.p50, formatNumber)}
          secondSlot={
            isTargetNull
              ? NO_VALUE
              : isTargetUndefined
              ? undefined
              : formatColumnValueWith(targetColumn?.p50, formatNumber)
          }
        />
        <MetricsInfo
          name="75%"
          metakey="p75"
          firstSlot={formatColumnValueWith(baseColumn?.p75, formatNumber)}
          secondSlot={
            isTargetNull
              ? NO_VALUE
              : isTargetUndefined
              ? undefined
              : formatColumnValueWith(targetColumn?.p75, formatNumber)
          }
        />
        <MetricsInfo
          name="95%"
          metakey="p95"
          firstSlot={formatColumnValueWith(baseColumn?.p95, formatNumber)}
          secondSlot={
            isTargetNull
              ? NO_VALUE
              : isTargetUndefined
              ? undefined
              : formatColumnValueWith(targetColumn?.p95, formatNumber)
          }
        />
        <MetricsInfo
          name="Max"
          metakey="max"
          firstSlot={formatColumnValueWith(baseColumn?.max, formatNumber)}
          secondSlot={
            isTargetNull
              ? NO_VALUE
              : isTargetUndefined
              ? undefined
              : formatColumnValueWith(targetColumn?.max, formatNumber)
          }
        />
      </Flex>
    </>
  );
}
