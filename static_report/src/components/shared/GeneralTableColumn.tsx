import { ColumnSchema } from '../../sdlc/single-report-schema';
import { ZColSchema } from '../../types';
import {
  formatNumber,
  formatIntervalMinMax,
  getColumnDetails,
  formatColumnValueWith,
} from '../../utils';
import { MetricsInfo } from './MetrisInfo';

type Props = { baseColumn: ColumnSchema; inputColumn?: ColumnSchema };
export function GeneralTableColumn({ baseColumn, inputColumn }: Props) {
  if (baseColumn) {
    ZColSchema.parse(baseColumn);
    var {
      totalOfTotal: baseTotalOfTotal,
      total: baseTotal,
      mismatch: baseMismatch,
      missing: baseMissing,
      mismatchOfTotal: baseMismatchOfTotal,
      validOfTotal: baseValidOfTotal,
      missingOfTotal: baseMissingOfTotal,
    } = getColumnDetails(baseColumn);
  }

  if (inputColumn) {
    ZColSchema.parse(inputColumn);
    var {
      total: inputTotal,
      mismatchOfTotal: inputMismatchOfTotal,
      validOfTotal: inputValidOfTotal,
      missingOfTotal: inputMissingOfTotal,
    } = getColumnDetails(inputColumn);
  }

  //NOTE: `base` will show amount (non-%) in single-reports
  //NOTE: `input` will show ratio (%) in single-reports
  return (
    <>
      <MetricsInfo
        name="Total"
        base={formatColumnValueWith(baseTotal, formatNumber)}
        input={formatColumnValueWith(
          inputColumn ? inputTotal : baseTotalOfTotal,
          inputColumn ? formatNumber : formatIntervalMinMax,
        )}
      />
      <MetricsInfo
        name="Valid"
        base={formatColumnValueWith(
          inputColumn ? baseValidOfTotal : baseTotal,
          inputColumn ? formatIntervalMinMax : formatNumber,
        )}
        input={formatColumnValueWith(
          inputColumn ? inputValidOfTotal : baseValidOfTotal,
          formatIntervalMinMax,
        )}
      />
      <MetricsInfo
        name="Mismatched"
        base={formatColumnValueWith(
          inputColumn ? baseMismatchOfTotal : baseMismatch,
          inputColumn ? formatIntervalMinMax : formatNumber,
        )}
        input={formatColumnValueWith(
          inputColumn ? inputMismatchOfTotal : baseMismatchOfTotal,
          formatIntervalMinMax,
        )}
      />
      <MetricsInfo
        name="Missing"
        base={formatColumnValueWith(
          inputColumn ? baseMissingOfTotal : baseMissing,
          inputColumn ? formatIntervalMinMax : formatNumber,
        )}
        input={formatColumnValueWith(
          inputColumn ? inputMissingOfTotal : baseMissingOfTotal,
          formatIntervalMinMax,
        )}
      />
      <MetricsInfo
        name="Distinct"
        base={formatColumnValueWith(baseColumn?.distinct, formatNumber)}
        input={
          inputColumn &&
          formatColumnValueWith(inputColumn?.distinct, formatNumber)
        }
      />
    </>
  );
}
