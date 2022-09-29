import { BoxProps } from '@chakra-ui/react';
import { SaferTableSchema } from '../../../../types';
import {
  MetricsInfo,
  TableMetaKeys,
} from '../../Columns/ColumnMetrics/MetricsInfo';
import { TableMetakeyList, transformSRTableMetricsInfoList } from '../utils';
//FIXME: formatting
import { formatDuration, intervalToDuration, subSeconds } from 'date-fns';
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
    ['col_count', 'Last Altered'],
    ['freshness', 'Freshness'],
  ];
  const filteredMetakeyEntries = metakeyEntries.filter(([metakey]) =>
    tableDatum?.hasOwnProperty(metakey as TableMetaKeys),
  );

  const metricsList = transformSRTableMetricsInfoList(
    filteredMetakeyEntries,
    tableDatum,
  );

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
            firstSlotWidth={'16em'}
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
