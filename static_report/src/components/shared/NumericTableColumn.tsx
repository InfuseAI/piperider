import { Box, ChakraProps, Flex } from '@chakra-ui/react';
import { ColumnSchema } from '../../sdlc/single-report-schema';
import { ZColSchema, zReport } from '../../types';
import {
  formatAsAbbreviatedNumber,
  formatColumnValueWith,
  formatIntervalMinMax,
  formatNumber,
} from '../../utils/formatters';
import { getColumnDetails } from '../../utils/transformers';
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
              name="Average"
              metakey="avg"
              firstSlot={formatColumnValueWith(
                baseColumn?.avg,
                formatAsAbbreviatedNumber,
              )}
              secondSlot={
                targetColumn?.avg
                  ? formatAsAbbreviatedNumber(targetColumn?.avg)
                  : undefined
              }
              tooltipValues={{ firstSlot: formatNumber(baseColumn?.avg) }}
              {...props}
            />
            <MetricsInfo
              name="SD"
              metakey="stddev"
              firstSlot={formatColumnValueWith(
                baseColumn?.stddev,
                formatAsAbbreviatedNumber,
              )}
              secondSlot={
                targetColumn?.stddev
                  ? formatColumnValueWith(
                      targetColumn?.stddev,
                      formatAsAbbreviatedNumber,
                    )
                  : undefined
              }
              tooltipValues={{ firstSlot: formatNumber(baseColumn?.stddev) }}
              {...props}
            />
          </>
        )}
      </Flex>
      <Flex direction="column">
        {(baseColumn?.type === 'numeric' || baseColumn?.type === 'integer') && (
          <Box>
            <MetricsInfo
              name="Min"
              metakey="min"
              firstSlot={formatColumnValueWith(
                baseColumn?.min,
                formatAsAbbreviatedNumber,
              )}
              secondSlot={
                targetColumn?.min
                  ? formatColumnValueWith(
                      targetColumn?.min,
                      formatAsAbbreviatedNumber,
                    )
                  : undefined
              }
              tooltipValues={{ firstSlot: formatNumber(baseColumn?.min) }}
              {...props}
            />
            <MetricsInfo
              name="Max"
              metakey="max"
              firstSlot={formatColumnValueWith(
                baseColumn?.max,
                formatAsAbbreviatedNumber,
              )}
              secondSlot={
                targetColumn?.max
                  ? formatColumnValueWith(
                      targetColumn?.max,
                      formatAsAbbreviatedNumber,
                    )
                  : undefined
              }
              tooltipValues={{ firstSlot: formatNumber(baseColumn?.max) }}
              {...props}
            />
          </Box>
        )}
        <MetricsInfo
          reverse
          name="Distinct"
          metakey="distinct"
          firstSlot={formatColumnValueWith(
            baseDistinct,
            formatAsAbbreviatedNumber,
          )}
          secondSlot={formatColumnValueWith(
            targetColumn ? targetDistinctOfTotal : baseDistinctOfTotal,
            formatIntervalMinMax,
          )}
          tooltipValues={{ firstSlot: formatNumber(baseDistinct) }}
          {...props}
        />
        <MetricsInfo
          reverse
          name="Duplicates"
          metakey="duplicates"
          firstSlot={formatColumnValueWith(
            baseDuplicates,
            formatAsAbbreviatedNumber,
          )}
          secondSlot={formatColumnValueWith(
            targetColumn ? targetDuplicatesOfTotal : baseDuplicatesOfTotal,
            formatIntervalMinMax,
          )}
          tooltipValues={{ firstSlot: formatNumber(baseDuplicates) }}
          {...props}
        />
      </Flex>
    </>
  );
}
