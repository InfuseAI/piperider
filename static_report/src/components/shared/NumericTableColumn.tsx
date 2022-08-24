import { ChakraProps, Flex } from '@chakra-ui/react';
import { ColumnSchema } from '../../sdlc/single-report-schema';
import { ZColSchema, zReport } from '../../types';
import {
  formatAsAbbreviatedNumber,
  formatColumnValueWith,
} from '../../utils/formatters';
import { NO_VALUE } from './ColumnCard/ColumnTypeDetail/constants';
import { MetricsInfo } from './MetricsInfo';

type Props = {
  baseColumn: ColumnSchema;
  targetColumn?: ColumnSchema | null;
};

export function NumericTableColumn({
  baseColumn,
  targetColumn,
  ...props
}: Props & ChakraProps) {
  const isTargetNull = targetColumn === null;
  const isTargetUndefined = targetColumn === undefined;
  zReport(ZColSchema.safeParse(baseColumn));
  zReport(ZColSchema.safeParse(baseColumn));
  return (
    <>
      <Flex direction="column">
        <MetricsInfo
          {...props}
          name="Average"
          metakey="avg"
          firstSlot={formatColumnValueWith(
            baseColumn?.avg,
            formatAsAbbreviatedNumber,
          )}
          secondSlot={
            isTargetNull
              ? NO_VALUE
              : isTargetUndefined
              ? undefined
              : formatColumnValueWith(
                  targetColumn?.avg,
                  formatAsAbbreviatedNumber,
                )
          }
        />
        <MetricsInfo
          {...props}
          name="SD"
          metakey="stddev"
          firstSlot={formatColumnValueWith(
            baseColumn?.stddev,
            formatAsAbbreviatedNumber,
          )}
          secondSlot={
            isTargetNull
              ? NO_VALUE
              : isTargetUndefined
              ? undefined
              : formatColumnValueWith(
                  targetColumn?.stddev,
                  formatAsAbbreviatedNumber,
                )
          }
        />
      </Flex>
      <Flex direction="column">
        <MetricsInfo
          {...props}
          name="Min"
          metakey="min"
          firstSlot={formatColumnValueWith(
            baseColumn?.min,
            formatAsAbbreviatedNumber,
          )}
          secondSlot={
            isTargetNull
              ? NO_VALUE
              : isTargetUndefined
              ? undefined
              : formatColumnValueWith(
                  targetColumn?.min,
                  formatAsAbbreviatedNumber,
                )
          }
        />
        <MetricsInfo
          {...props}
          name="5%"
          metakey="p5"
          firstSlot={formatColumnValueWith(
            baseColumn?.p5,
            formatAsAbbreviatedNumber,
          )}
          secondSlot={
            isTargetNull
              ? NO_VALUE
              : isTargetUndefined
              ? undefined
              : formatColumnValueWith(
                  targetColumn?.p5,
                  formatAsAbbreviatedNumber,
                )
          }
        />
        <MetricsInfo
          {...props}
          name="25%"
          metakey="p25"
          firstSlot={formatColumnValueWith(
            baseColumn?.p25,
            formatAsAbbreviatedNumber,
          )}
          secondSlot={
            isTargetNull
              ? NO_VALUE
              : isTargetUndefined
              ? undefined
              : formatColumnValueWith(
                  targetColumn?.p25,
                  formatAsAbbreviatedNumber,
                )
          }
        />
        <MetricsInfo
          {...props}
          name="50%"
          metakey="p50"
          firstSlot={formatColumnValueWith(
            baseColumn?.p50,
            formatAsAbbreviatedNumber,
          )}
          secondSlot={
            isTargetNull
              ? NO_VALUE
              : isTargetUndefined
              ? undefined
              : formatColumnValueWith(
                  targetColumn?.p50,
                  formatAsAbbreviatedNumber,
                )
          }
        />
        <MetricsInfo
          {...props}
          name="75%"
          metakey="p75"
          firstSlot={formatColumnValueWith(
            baseColumn?.p75,
            formatAsAbbreviatedNumber,
          )}
          secondSlot={
            isTargetNull
              ? NO_VALUE
              : isTargetUndefined
              ? undefined
              : formatColumnValueWith(
                  targetColumn?.p75,
                  formatAsAbbreviatedNumber,
                )
          }
        />
        <MetricsInfo
          {...props}
          name="95%"
          metakey="p95"
          firstSlot={formatColumnValueWith(
            baseColumn?.p95,
            formatAsAbbreviatedNumber,
          )}
          secondSlot={
            isTargetNull
              ? NO_VALUE
              : isTargetUndefined
              ? undefined
              : formatColumnValueWith(
                  targetColumn?.p95,
                  formatAsAbbreviatedNumber,
                )
          }
        />
        <MetricsInfo
          {...props}
          name="Max"
          metakey="max"
          firstSlot={formatColumnValueWith(
            baseColumn?.max,
            formatAsAbbreviatedNumber,
          )}
          secondSlot={
            isTargetNull
              ? NO_VALUE
              : isTargetUndefined
              ? undefined
              : formatColumnValueWith(
                  targetColumn?.max,
                  formatAsAbbreviatedNumber,
                )
          }
        />
      </Flex>
    </>
  );
}
