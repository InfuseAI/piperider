import { ColumnSchema } from '../../sdlc/single-report-schema';
import { ZColSchema } from '../../types';
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
    ZColSchema.parse(baseColumn);
    var {
      nulls: baseNulls,
      total: baseTotal,
      invalids: baseInvalids,
    } = baseColumn;
    var {
      totalOfTotal: baseTotalOfTotal,
      invalidsOfTotal: baseInvalidsOfTotal,
      validsOfTotal: baseValidsOfTotal,
      nullsOfTotal: baseNullsOfTotal,
    } = getColumnDetails(baseColumn);
  }

  if (targetColumn) {
    var { total: targetTotal } = targetColumn;
    ZColSchema.parse(targetColumn);
    var {
      invalidsOfTotal: targetInvalidsOfTotal,
      validsOfTotal: targetValidsOfTotal,
      nullsOfTotal: targetNullsOfTotal,
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
          targetColumn ? baseValidsOfTotal : baseTotal,
          targetColumn ? formatIntervalMinMax : formatNumber,
        )}
        target={formatColumnValueWith(
          targetColumn ? targetValidsOfTotal : baseValidsOfTotal,
          formatIntervalMinMax,
        )}
      />
      <MetricsInfo
        name="Invalid"
        base={formatColumnValueWith(
          targetColumn ? baseInvalidsOfTotal : baseInvalids,
          targetColumn ? formatIntervalMinMax : formatNumber,
        )}
        target={formatColumnValueWith(
          targetColumn ? targetInvalidsOfTotal : baseInvalidsOfTotal,
          formatIntervalMinMax,
        )}
      />
      <MetricsInfo
        name="Nulls"
        base={formatColumnValueWith(
          targetColumn ? baseNullsOfTotal : baseNulls,
          targetColumn ? formatIntervalMinMax : formatNumber,
        )}
        target={formatColumnValueWith(
          targetColumn ? targetNullsOfTotal : baseNullsOfTotal,
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
