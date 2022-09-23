import { BoxProps } from '@chakra-ui/react';
import { SaferTableSchema } from '../../../../types';
import { MetricsInfo } from '../../Columns/ColumnMetrics/MetricsInfo';
import { TableMetakeyList, transformSRTableMetricsInfoList } from '../utils';

interface Props {
  tableDatum?: SaferTableSchema;
}
export function DupedTableRowStats({ tableDatum, ...props }: Props & BoxProps) {
  const metakeyEntries: TableMetakeyList = [
    ['total', 'Sample Total'],
    ['duplicate_rows', 'Duplicates'],
  ];
  const metricsList = transformSRTableMetricsInfoList(
    metakeyEntries,
    tableDatum,
  );
  console.log(metricsList);

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
            secondSlot={secondSlot}
            tooltipValues={tooltipValues}
            width="100%"
            {...props}
          />
        ),
      )}
    </>
  );
}
