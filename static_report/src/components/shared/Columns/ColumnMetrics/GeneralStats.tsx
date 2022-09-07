import { FlexProps } from '@chakra-ui/react';
import { ColumnSchema } from '../../../../sdlc/single-report-schema';
import { Comparable, ZColSchema, zReport } from '../../../../types';
import {
  MetricNameMetakeyList,
  transformCRMetricsInfoList,
  transformSRMetricsInfoList,
} from '../../../../utils/transformers';
import { MetricsInfo } from './MetricsInfo';

interface Props extends Comparable {
  baseColumnDatum?: ColumnSchema;
  targetColumnDatum?: ColumnSchema;
}
export function GeneralStats({
  baseColumnDatum,
  targetColumnDatum,
  singleOnly,
  ...props
}: Props & FlexProps) {
  zReport(ZColSchema.safeParse(baseColumnDatum));
  zReport(ZColSchema.safeParse(targetColumnDatum));

  const metakeyEntries: MetricNameMetakeyList = [
    ['valids', 'Valid'],
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

  // Total displays differently if has base/target
  const totalMetaKeyEntry: MetricNameMetakeyList = [['total', 'Total']];

  const totalMetricsList = singleOnly
    ? transformSRMetricsInfoList(totalMetaKeyEntry, baseColumnDatum)
    : transformCRMetricsInfoList(
        totalMetaKeyEntry,
        baseColumnDatum,
        targetColumnDatum,
        'count',
      );

  return (
    <>
      {/* Total - (1): % + n (2): n + n */}
      {totalMetricsList.map(
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
            width="100%"
            {...props}
          />
        ),
      )}
    </>
  );
}
