import { FlexProps } from '@chakra-ui/react';
import { ColumnSchema } from '../../../../sdlc/single-report-schema';
import { Comparable, ZColSchema, zReport } from '../../../../types';
import { colorMap } from '../../../../utils/theme';
import {
  MetricNameMetakeyList,
  transformSRMetricsInfoList,
  transformCRMetricsInfoList,
} from '../utils';
import { MetricMetaKeys, MetricsInfo } from './MetricsInfo';

interface Props extends Comparable {
  baseColumnDatum?: ColumnSchema;
  targetColumnDatum?: ColumnSchema;
}
/**
 * Shows metric stats for Invalids, Missing(nulls)
 */
export function GeneralStats({
  baseColumnDatum,
  targetColumnDatum,
  singleOnly,
  ...props
}: Props & FlexProps) {
  zReport(ZColSchema.safeParse(baseColumnDatum));
  zReport(ZColSchema.safeParse(targetColumnDatum));

  const metakeyEntries: MetricNameMetakeyList = [
    // ['valids', 'Valid'],
    ['invalids', 'Invalid'],
    ['nulls', 'Missing'],
  ];
  // metric info list defaults to display as percentage
  const metricsList = singleOnly
    ? transformSRMetricsInfoList(metakeyEntries, baseColumnDatum)
    : transformCRMetricsInfoList(
        metakeyEntries,
        baseColumnDatum,
        targetColumnDatum,
      );

  return (
    <>
      {/* Others - (1): % + n (2): % + % */}
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
