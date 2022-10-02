import { BoxProps } from '@chakra-ui/react';
import { SaferTableSchema } from '../../../../types';
import { MetricsInfo } from '../../Columns/ColumnMetrics/MetricsInfo';
import { TableMetakeyList, transformSRTableMetricsInfoList } from '../utils';

interface Props {
  tableDatum?: SaferTableSchema;
}
export function DupedTableRowStats({ tableDatum, ...props }: Props & BoxProps) {
  const metakeyEntries: TableMetakeyList = [
    [tableDatum?.samples ? 'samples' : 'row_count', 'Total'],
    ['duplicate_rows', 'Duplicates'],
  ];
  const metricsList = transformSRTableMetricsInfoList(
    metakeyEntries,
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
