import { Box, ChakraProps, Flex } from '@chakra-ui/react';
import { ColumnSchema } from '../../../sdlc/single-report-schema';
import { ZColSchema, zReport } from '../../../types';
import {
  formatAsAbbreviatedNumber,
  formatColumnValueWith,
  formatIntervalMinMax,
  formatNumber,
} from '../../../utils/formatters';
import { getColumnDetails } from '../../../utils/transformers';
import { TEXTLENGTH } from '../ColumnCard/ColumnTypeDetail/constants';
import { MetricsInfo } from './MetricsInfo';

type Props = {
  baseColumn?: ColumnSchema;
  targetColumn?: ColumnSchema | null;
};

export function SummaryStats({
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

  const subtitle = baseColumn?.type === 'string' ? ` (${TEXTLENGTH})` : '';

  return (
    <>
      <Flex direction="column">
        {baseColumn?.type !== 'datetime' && baseColumn?.type !== 'other' && (
          <>
            <MetricsInfo
              name={`Average`}
              subtitle={subtitle}
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
              name={`SD`}
              metakey="stddev"
              subtitle={subtitle}
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
              subtitle={subtitle}
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
              subtitle={subtitle}
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
          name={`Distinct`}
          metakey="distinct"
          subtitle={subtitle}
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
          name={`Duplicates`}
          metakey="duplicates"
          subtitle={subtitle}
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
