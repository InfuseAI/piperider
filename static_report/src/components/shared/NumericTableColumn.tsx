import { Box, ChakraProps, Divider, Flex } from '@chakra-ui/react';
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
              {...props}
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
                targetColumn?.stddev
                  ? formatColumnValueWith(
                      targetColumn?.stddev,
                      formatAsAbbreviatedNumber,
                    )
                  : undefined
              }
            />
          </>
        )}
      </Flex>
      <Flex direction="column">
        {(baseColumn?.type === 'numeric' || baseColumn?.type === 'integer') && (
          <Box>
            <MetricsInfo
              {...props}
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
                targetColumn?.max
                  ? formatColumnValueWith(
                      targetColumn?.max,
                      formatAsAbbreviatedNumber,
                    )
                  : undefined
              }
            />
          </Box>
        )}
        <MetricsInfo
          {...props}
          name="Distinct"
          metakey="distinct"
          firstSlot={formatColumnValueWith(baseDistinct, formatNumber)}
          secondSlot={formatColumnValueWith(
            targetColumn ? targetDistinctOfTotal : baseDistinctOfTotal,
            formatIntervalMinMax,
          )}
        />
        <MetricsInfo
          {...props}
          name="Duplicates"
          metakey="duplicates"
          firstSlot={formatColumnValueWith(baseDuplicates, formatNumber)}
          secondSlot={formatColumnValueWith(
            targetColumn ? targetDuplicatesOfTotal : baseDuplicatesOfTotal,
            formatIntervalMinMax,
          )}
        />
      </Flex>
    </>
  );
}
