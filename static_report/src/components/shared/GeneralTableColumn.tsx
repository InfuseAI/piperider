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
export function GeneralTableColumn({
  baseColumn,
  targetColumn,
  ...props
}: Props & ChakraProps) {
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

  return (
    <>
      <MetricsInfo
        {...props}
        name="Total"
        metakey="total"
        firstSlot={formatColumnValueWith(baseTotal, formatNumber)}
        secondSlot={formatColumnValueWith(
          targetColumn ? targetTotal : baseTotalOfTotal,
          targetColumn ? formatNumber : formatIntervalMinMax,
        )}
      />
      <MetricsInfo
        {...props}
        name="Valid"
        metakey="valids"
        firstSlot={formatColumnValueWith(
          targetColumn ? baseValidsOfTotal : baseValids,
          targetColumn ? formatIntervalMinMax : formatNumber,
        )}
        secondSlot={formatColumnValueWith(
          targetColumn ? targetValidsOfTotal : baseValidsOfTotal,
          formatIntervalMinMax,
        )}
      />
      <MetricsInfo
        {...props}
        name="Invalid"
        metakey="invalids"
        firstSlot={formatColumnValueWith(
          targetColumn ? baseInvalidsOfTotal : baseInvalids,
          targetColumn ? formatIntervalMinMax : formatNumber,
        )}
        secondSlot={formatColumnValueWith(
          targetColumn ? targetInvalidsOfTotal : baseInvalidsOfTotal,
          formatIntervalMinMax,
        )}
      />
      <MetricsInfo
        {...props}
        name="Missing"
        metakey="nulls"
        firstSlot={formatColumnValueWith(
          targetColumn ? baseNullsOfTotal : baseNulls,
          targetColumn ? formatIntervalMinMax : formatNumber,
        )}
        secondSlot={formatColumnValueWith(
          targetColumn ? targetNullsOfTotal : baseNullsOfTotal,
          formatIntervalMinMax,
        )}
      />
    </>
  );
}
