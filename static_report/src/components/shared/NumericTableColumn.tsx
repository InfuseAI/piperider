import { ChakraProps, Flex } from '@chakra-ui/react';
import { ColumnSchema } from '../../sdlc/single-report-schema';
import { ZColSchema, zReport } from '../../types';
import {
  formatAsAbbreviatedNumber,
  formatColumnValueWith,
  formatIntervalMinMax,
  formatNumber,
} from '../../utils/formatters';
import { getColumnDetails } from '../../utils/transformers';
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
  if (baseColumn) {
    zReport(ZColSchema.safeParse(baseColumn));
    var { distinct: baseDistinct, duplicates: baseDuplicates } = baseColumn;
    var {
      distinctOfTotal: baseDistinctOfTotal,
      duplicatesOfTotal: baseDuplicatesOfTotal,
    } = getColumnDetails(baseColumn);
  }

  if (targetColumn) {
    ZColSchema.parse(targetColumn);
    var {
      distinctOfTotal: targetDistinctOfTotal,
      duplicatesOfTotal: targetDuplicatesOfTotal,
    } = getColumnDetails(targetColumn);
  }
  return (
    <>
      <Flex direction="column">
        {baseColumn?.type !== 'datetime' && baseColumn?.type !== 'other' && (
          <>
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
          </>
        )}
      </Flex>
      <Flex direction="column">
        {(baseColumn?.type === 'numeric' || baseColumn?.type === 'integer') && (
          <>
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
          </>
        )}
        <MetricsInfo
          {...props}
          name="Distinct"
          metakey="distinct"
          firstSlot={formatColumnValueWith(baseDistinct, formatNumber)}
          secondSlot={
            isTargetNull
              ? NO_VALUE
              : formatColumnValueWith(
                  targetColumn ? targetDistinctOfTotal : baseDistinctOfTotal,
                  formatIntervalMinMax,
                )
          }
        />
        <MetricsInfo
          {...props}
          name="Duplicates"
          metakey="duplicates"
          firstSlot={formatColumnValueWith(baseDuplicates, formatNumber)}
          secondSlot={
            isTargetNull
              ? NO_VALUE
              : formatColumnValueWith(
                  targetColumn
                    ? targetDuplicatesOfTotal
                    : baseDuplicatesOfTotal,
                  formatIntervalMinMax,
                )
          }
        />
      </Flex>
    </>
  );
}
