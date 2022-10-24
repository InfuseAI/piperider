import { FlexProps } from '@chakra-ui/react';
import { ColumnSchema } from '../../../../sdlc/single-report-schema';
import { colorMap } from '../../../../utils/theme';
import { MetricNameMetakeyList, transformSRMetricsInfoList } from '../utils';
import { MetricMetaKeys, MetricsInfo } from './MetricsInfo';

interface Props {
  columnDatum?: ColumnSchema;
}
/**
 * Shows metric stats for Invalids, Missing(nulls)
 */
export function GeneralStats({ columnDatum, ...props }: Props & FlexProps) {
  const metakeyEntries: MetricNameMetakeyList = [
    ['invalids', 'Invalid'],
    ['nulls', 'Missing'],
  ];
  // metric info list defaults to display as percentage
  const metricsList = transformSRMetricsInfoList(metakeyEntries, columnDatum);

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
            showColorSquare
            squareColor={colorMap.get(metakey as MetricMetaKeys)}
            width="100%"
            {...props}
          />
        ),
      )}
    </>
  );
}
