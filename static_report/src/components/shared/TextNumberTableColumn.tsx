import { ChakraProps } from '@chakra-ui/system';
import { ColumnSchema } from '../../sdlc/single-report-schema';
import { ZColSchema, zReport } from '../../types';
import {
  formatNumber,
  formatIntervalMinMax,
  formatColumnValueWith,
} from '../../utils/formatters';
import { getColumnDetails } from '../../utils/transformers';
import { MetricsInfo } from './MetricsInfo';

type Props = { baseColumn?: ColumnSchema; targetColumn?: ColumnSchema | null };
export function TextNumberTableColumn({
  baseColumn,
  targetColumn,
  ...props
}: Props & ChakraProps) {
  if (baseColumn) {
    zReport(ZColSchema.safeParse(baseColumn));
    var {
      positives: basePositives,
      negatives: baseNegatives,
      non_zero_length: baseNonZeroLength,
      zero_length: baseZeroLength,
      zeros: baseZeros,
    } = baseColumn;
    var {
      zerosOfTotal: baseZerosOfTotal,
      zeroLengthOfTotal: baseZeroLengthOfTotal,
      nonZeroLengthOfTotal: baseNonZeroLengthOfTotal,
      negativesOfTotal: baseNegativesOfTotal,
      positivesOfTotal: basePositivesOfTotal,
    } = getColumnDetails(baseColumn);
  }

  if (targetColumn) {
    var { positives: targetPositives } = targetColumn;
    ZColSchema.parse(targetColumn);
    var {
      zeroLengthOfTotal: targetZeroLengthOfTotal,
      nonZeroLengthOfTotal: targetNonZeroLengthOfTotal,
      zerosOfTotal: targetZerosOfTotal,
      negativesOfTotal: targetNegativesOfTotal,
    } = getColumnDetails(targetColumn);
  }

  return (
    <>
      {(baseColumn?.type === 'integer' || baseColumn?.type === 'numeric') && (
        <>
          <MetricsInfo
            {...props}
            name="Positives"
            metakey="positives"
            firstSlot={formatColumnValueWith(basePositives, formatNumber)}
            secondSlot={formatColumnValueWith(
              targetColumn ? targetPositives : basePositivesOfTotal,
              targetColumn ? formatNumber : formatIntervalMinMax,
            )}
          />
          <MetricsInfo
            {...props}
            name="Zeros"
            metakey="zeros"
            firstSlot={formatColumnValueWith(
              targetColumn ? baseZerosOfTotal : baseZeros,
              targetColumn ? formatIntervalMinMax : formatNumber,
            )}
            secondSlot={formatColumnValueWith(
              targetColumn ? targetZerosOfTotal : baseZerosOfTotal,
              formatIntervalMinMax,
            )}
          />
          <MetricsInfo
            {...props}
            name="Negatives"
            metakey="negatives"
            firstSlot={formatColumnValueWith(
              targetColumn ? baseNegativesOfTotal : baseNegatives,
              targetColumn ? formatIntervalMinMax : formatNumber,
            )}
            secondSlot={formatColumnValueWith(
              targetColumn ? targetNegativesOfTotal : baseNegativesOfTotal,
              formatIntervalMinMax,
            )}
          />
        </>
      )}
      {baseColumn?.type === 'string' && (
        <>
          <MetricsInfo
            {...props}
            name="Non-zero Length"
            metakey="non_zero_length"
            firstSlot={formatColumnValueWith(
              targetColumn ? baseNonZeroLengthOfTotal : baseNonZeroLength,
              targetColumn ? formatIntervalMinMax : formatNumber,
            )}
            secondSlot={formatColumnValueWith(
              targetColumn
                ? targetNonZeroLengthOfTotal
                : baseNonZeroLengthOfTotal,
              formatIntervalMinMax,
            )}
          />
          <MetricsInfo
            {...props}
            name="Zero Length"
            metakey="zero_length"
            firstSlot={formatColumnValueWith(
              targetColumn ? baseZeroLengthOfTotal : baseZeroLength,
              targetColumn ? formatIntervalMinMax : formatNumber,
            )}
            secondSlot={formatColumnValueWith(
              targetColumn ? targetZeroLengthOfTotal : baseZeroLengthOfTotal,
              formatIntervalMinMax,
            )}
          />
        </>
      )}
    </>
  );
}
