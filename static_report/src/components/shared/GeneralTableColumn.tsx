import { ColumnSchema } from '../../sdlc/single-report-schema';
import { ZColSchema, zReport } from '../../types';
import {
  formatNumber,
  formatIntervalMinMax,
  formatColumnValueWith,
} from '../../utils/formatters';
import { getColumnDetails } from '../../utils/transformers';
import { MetricsInfo } from './MetrisInfo';

type Props = { baseColumn?: ColumnSchema; targetColumn?: ColumnSchema | null };
export function GeneralTableColumn({ baseColumn, targetColumn }: Props) {
  if (baseColumn) {
    zReport(ZColSchema.safeParse(baseColumn));
    var {
      totalOfTotal: baseTotalOfTotal,
      valid: baseValid,
      total: baseTotal,
      mismatch: baseMismatch,
      missing: baseMissing,
      mismatchOfTotal: baseMismatchOfTotal,
      validOfTotal: baseValidOfTotal,
      missingOfTotal: baseMissingOfTotal,
    } = getColumnDetails(baseColumn);
  }

  if (targetColumn) {
    zReport(ZColSchema.safeParse(targetColumn));
    var {
      total: targetTotal,
      mismatchOfTotal: targetMismatchOfTotal,
      validOfTotal: targetValidOfTotal,
      missingOfTotal: targetMissingOfTotal,
    } = getColumnDetails(targetColumn);
  }

  //NOTE: `base` will show amount (non-%) in single-reports
  //NOTE: `target` will show ratio (%) in single-reports
  //`null` identifies provided prop of null value
  //`undefined` represents unprovided prop
  const isTargetNull = targetColumn === null;
  const emptyLabel = '-';

  return (
    <>
      <MetricsInfo
        name="Total"
        firstSlot={formatColumnValueWith(baseTotal, formatNumber)}
        secondSlot={
          isTargetNull
            ? emptyLabel
            : formatColumnValueWith(
                targetColumn ? targetTotal : baseTotalOfTotal,
                targetColumn ? formatNumber : formatIntervalMinMax,
              )
        }
      />
      <MetricsInfo
        name="Valid"
        firstSlot={formatColumnValueWith(
          targetColumn ? baseValidOfTotal : baseValid,
          targetColumn ? formatIntervalMinMax : formatNumber,
        )}
        secondSlot={
          isTargetNull
            ? emptyLabel
            : formatColumnValueWith(
                targetColumn ? targetValidOfTotal : baseValidOfTotal,
                formatIntervalMinMax,
              )
        }
      />
      <MetricsInfo
        name="Mismatched"
        firstSlot={formatColumnValueWith(
          targetColumn ? baseMismatchOfTotal : baseMismatch,
          targetColumn ? formatIntervalMinMax : formatNumber,
        )}
        secondSlot={
          isTargetNull
            ? emptyLabel
            : formatColumnValueWith(
                targetColumn ? targetMismatchOfTotal : baseMismatchOfTotal,
                formatIntervalMinMax,
              )
        }
      />
      <MetricsInfo
        name="Missing"
        firstSlot={formatColumnValueWith(
          targetColumn ? baseMissingOfTotal : baseMissing,
          targetColumn ? formatIntervalMinMax : formatNumber,
        )}
        secondSlot={
          isTargetNull
            ? emptyLabel
            : formatColumnValueWith(
                targetColumn ? targetMissingOfTotal : baseMissingOfTotal,
                formatIntervalMinMax,
              )
        }
      />
      <MetricsInfo
        name="Distinct"
        firstSlot={formatColumnValueWith(baseColumn?.distinct, formatNumber)}
        secondSlot={
          isTargetNull
            ? emptyLabel
            : formatColumnValueWith(
                targetColumn ? targetDistinctOfTotal : baseDistinctOfTotal,
                formatIntervalMinMax,
              )
        }
      />
    </>
  );
}
