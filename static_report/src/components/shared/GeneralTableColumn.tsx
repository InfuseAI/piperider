import { ColumnSchema } from '../../sdlc/single-report-schema';
import { ZColSchema, zReport } from '../../types';
import {
  formatNumber,
  formatIntervalMinMax,
  formatColumnValueWith,
} from '../../utils/formatters';
import { getColumnDetails } from '../../utils/transformers';
import { MetricsInfo } from './MetrisInfo';

type Props = { baseColumn: ColumnSchema; targetColumn?: ColumnSchema };
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
  return (
    <>
      <MetricsInfo
        name="Total"
        base={formatColumnValueWith(baseTotal, formatNumber)}
        target={formatColumnValueWith(
          targetColumn ? targetTotal : baseTotalOfTotal,
          targetColumn ? formatNumber : formatIntervalMinMax,
        )}
      />
      <MetricsInfo
        name="Valid"
        base={formatColumnValueWith(
          targetColumn ? baseValidOfTotal : baseValid,
          targetColumn ? formatIntervalMinMax : formatNumber,
        )}
        target={formatColumnValueWith(
          targetColumn ? targetValidOfTotal : baseValidOfTotal,
          formatIntervalMinMax,
        )}
      />
      <MetricsInfo
        name="Mismatched"
        base={formatColumnValueWith(
          targetColumn ? baseMismatchOfTotal : baseMismatch,
          targetColumn ? formatIntervalMinMax : formatNumber,
        )}
        target={formatColumnValueWith(
          targetColumn ? targetMismatchOfTotal : baseMismatchOfTotal,
          formatIntervalMinMax,
        )}
      />
      <MetricsInfo
        name="Missing"
        base={formatColumnValueWith(
          targetColumn ? baseMissingOfTotal : baseMissing,
          targetColumn ? formatIntervalMinMax : formatNumber,
        )}
        target={formatColumnValueWith(
          targetColumn ? targetMissingOfTotal : baseMissingOfTotal,
          formatIntervalMinMax,
        )}
      />
      <MetricsInfo
        name="Distinct"
        base={formatColumnValueWith(baseColumn?.distinct, formatNumber)}
        target={
          targetColumn &&
          formatColumnValueWith(targetColumn?.distinct, formatNumber)
        }
      />
    </>
  );
}
