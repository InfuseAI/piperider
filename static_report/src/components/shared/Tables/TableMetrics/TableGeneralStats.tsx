import { BoxProps } from '@chakra-ui/react';
import { SaferTableSchema } from '../../../../types';
import {
  MetricsInfo,
  TableMetaKeys,
} from '../../Columns/ColumnMetrics/MetricsInfo';
import { TableMetakeyList, transformSRTableMetricsInfoList } from '../utils';
//FIXME: formatting
import { formatDuration, intervalToDuration, subSeconds } from 'date-fns';
import { formatBytes, formatNumber, formatReportTime } from '../../../../utils';
// import {
//   formatBytes,
//   formatColumnValueWith,
//   formatIntervalMinMax,
//   formatNumber,
//   formatReportTime,
// } from '../../../utils/formatters';

interface Props {
  tableDatum?: SaferTableSchema;
}
export function TableGeneralStats({ tableDatum, ...props }: Props & BoxProps) {
  const metakeyEntries: TableMetakeyList = [
    ['row_count', 'Rows'],
    ['col_count', 'Columns'],
    ['samples', 'Samples'],
    ['bytes', 'Volume Size'],
    ['created', 'Created At'],
    ['last_altered', 'Last Altered'],
    ['freshness', 'Freshness'],
  ];
  const filteredMetakeyEntries = metakeyEntries.filter(([metakey]) =>
    tableDatum?.hasOwnProperty(metakey as TableMetaKeys),
  );

  const metricsList = transformSRTableMetricsInfoList(
    filteredMetakeyEntries,
    tableDatum,
  ).map((v) => {
    if (v.metakey === 'bytes') {
      v.firstSlot = '';
      v.secondSlot = formatBytes(tableDatum?.bytes);
      v.tooltipValues = {
        secondSlot: formatNumber(tableDatum?.bytes) + ' bytes',
      };
    } else if (v.metakey === 'created' || v.metakey === 'last_altered') {
      v.firstSlot = '';
      v.secondSlot = formatReportTime(
        v.metakey === 'created'
          ? tableDatum?.created
          : tableDatum?.last_altered,
      );
    } else if (v.metakey === 'freshness') {
      v.firstSlot = '';
      v.secondSlot = formatDuration(
        intervalToDuration({
          start: subSeconds(new Date(), tableDatum?.freshness || 0),
          end: new Date(),
        }),
      );
      v.tooltipValues = {
        secondSlot: tableDatum?.freshness,
      };
    }
    return v;
  });

  /* Others - (1): % + n (2): % + % */
  return (
    <>
      {metricsList.map(
        ({ firstSlot, secondSlot, metakey, name, tooltipValues }, index) => (
          <MetricsInfo
            key={index}
            name={name}
            metakey={metakey}
            firstSlot={firstSlot}
            firstSlotWidth={'10em'}
            secondSlot={secondSlot}
            secondSlotWidth={'16em'}
            tooltipValues={tooltipValues}
            width="100%"
            {...props}
          />
        ),
      )}
    </>
  );
}
