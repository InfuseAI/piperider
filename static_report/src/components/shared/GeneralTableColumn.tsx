import { ChakraProps } from '@chakra-ui/system';
import { ColumnSchema } from '../../sdlc/single-report-schema';
import { ZColSchema, zReport } from '../../types';
import {
  formatIntervalMinMax,
  formatColumnValueWith,
  formatAsAbbreviatedNumber,
  formatNumber,
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
        reverse
        name="Total"
        metakey="total"
        firstSlot={formatColumnValueWith(baseTotal, formatAsAbbreviatedNumber)}
        secondSlot={formatColumnValueWith(
          targetColumn ? targetTotal : baseTotalOfTotal,
          targetColumn ? formatAsAbbreviatedNumber : formatIntervalMinMax,
        )}
        tooltipValues={{ firstSlot: formatNumber(baseTotal) }}
        {...props}
      />
      <MetricsInfo
        reverse
        name="Valid"
        metakey="valids"
        firstSlot={formatColumnValueWith(
          targetColumn ? baseValidsOfTotal : baseValids,
          targetColumn ? formatIntervalMinMax : formatAsAbbreviatedNumber,
        )}
        secondSlot={formatColumnValueWith(
          targetColumn ? targetValidsOfTotal : baseValidsOfTotal,
          formatIntervalMinMax,
        )}
        tooltipValues={{ firstSlot: formatNumber(baseValids) }}
        {...props}
      />
      <MetricsInfo
        reverse
        name="Invalid"
        metakey="invalids"
        firstSlot={formatColumnValueWith(
          targetColumn ? baseInvalidsOfTotal : baseInvalids,
          targetColumn ? formatIntervalMinMax : formatAsAbbreviatedNumber,
        )}
        secondSlot={formatColumnValueWith(
          targetColumn ? targetInvalidsOfTotal : baseInvalidsOfTotal,
          formatIntervalMinMax,
        )}
        tooltipValues={{ firstSlot: formatNumber(baseInvalids) }}
        {...props}
      />
      <MetricsInfo
        reverse
        name="Missing"
        metakey="nulls"
        firstSlot={formatColumnValueWith(
          targetColumn ? baseNullsOfTotal : baseNulls,
          targetColumn ? formatIntervalMinMax : formatAsAbbreviatedNumber,
        )}
        secondSlot={formatColumnValueWith(
          targetColumn ? targetNullsOfTotal : baseNullsOfTotal,
          formatIntervalMinMax,
        )}
        tooltipValues={{ firstSlot: formatNumber(baseNulls) }}
        {...props}
      />
    </>
  );
}
