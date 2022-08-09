import { ColumnSchema } from '../../sdlc/single-report-schema';
import { ZColSchema, zReport } from '../../types';
import {
  formatNumber,
  formatIntervalMinMax,
  formatColumnValueWith,
} from '../../utils/formatters';
import { getColumnDetails } from '../../utils/transformers';
import { NO_VALUE } from './ColumnCard/ColumnTypeDetail/constants';
import { MetricsInfo } from './MetricsInfo';

type Props = { baseColumn?: ColumnSchema; targetColumn?: ColumnSchema | null };
export function GeneralTableColumn({ baseColumn, targetColumn }: Props) {
  if (baseColumn) {
    zReport(ZColSchema.safeParse(baseColumn));
    var {
      nulls: baseNulls,
      total: baseTotal,
      valids: baseValids,
      invalids: baseInvalids,
    } = baseColumn;
    var {
      totalOfTotal: baseTotalOfTotal,
      distinctOfTotal: baseDistinctOfTotal,
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
      distinctOfTotal: targetDistinctOfTotal,
      validsOfTotal: targetValidsOfTotal,
      nullsOfTotal: targetNullsOfTotal,
    } = getColumnDetails(targetColumn);
  }

  //NOTE: `base` will show amount (non-%) in single-reports
  //NOTE: `target` will show ratio (%) in single-reports
  //`null` identifies provided prop of null value
  //`undefined` represents unprovided prop
  const isTargetNull = targetColumn === null;

  return (
    <>
      <MetricsInfo
        name="Total"
        firstSlot={formatColumnValueWith(baseTotal, formatNumber)}
        secondSlot={
          isTargetNull
            ? NO_VALUE
            : formatColumnValueWith(
                targetColumn ? targetTotal : baseTotalOfTotal,
                targetColumn ? formatNumber : formatIntervalMinMax,
              )
        }
      />
      <MetricsInfo
        name="Valid"
        firstSlot={formatColumnValueWith(
          targetColumn ? baseValidsOfTotal : baseValids,
          targetColumn ? formatIntervalMinMax : formatNumber,
        )}
        secondSlot={
          isTargetNull
            ? NO_VALUE
            : formatColumnValueWith(
                targetColumn ? targetValidsOfTotal : baseValidsOfTotal,
                formatIntervalMinMax,
              )
        }
      />
      <MetricsInfo
        name="Invalid"
        firstSlot={formatColumnValueWith(
          targetColumn ? baseInvalidsOfTotal : baseInvalids,
          targetColumn ? formatIntervalMinMax : formatNumber,
        )}
        secondSlot={
          isTargetNull
            ? NO_VALUE
            : formatColumnValueWith(
                targetColumn ? targetInvalidsOfTotal : baseInvalidsOfTotal,
                formatIntervalMinMax,
              )
        }
      />
      <MetricsInfo
        name="Missing"
        firstSlot={formatColumnValueWith(
          targetColumn ? baseNullsOfTotal : baseNulls,
          targetColumn ? formatIntervalMinMax : formatNumber,
        )}
        secondSlot={
          isTargetNull
            ? NO_VALUE
            : formatColumnValueWith(
                targetColumn ? targetNullsOfTotal : baseNullsOfTotal,
                formatIntervalMinMax,
              )
        }
      />
      <MetricsInfo
        name="Distinct"
        firstSlot={formatColumnValueWith(
          baseDistinctOfTotal,
          formatIntervalMinMax,
        )}
        secondSlot={
          isTargetNull
            ? NO_VALUE
            : formatColumnValueWith(
                targetColumn ? targetDistinctOfTotal : baseDistinctOfTotal,
                formatIntervalMinMax,
              )
        }
      />
    </>
  );
}
