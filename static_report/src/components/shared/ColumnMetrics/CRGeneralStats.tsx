import { ChakraProps } from '@chakra-ui/system';
import { ColumnSchema } from '../../../sdlc/single-report-schema';
import { ZColSchema, zReport } from '../../../types';
import {
  MetricNameMetakeyList,
  transformCRMetricsInfoList,
} from '../../../utils/transformers';
import { MetricsInfo } from './MetricsInfo';

type Props = {
  baseColumnDatum?: ColumnSchema;
  targetColumnDatum?: ColumnSchema;
};
export function CRGeneralStats({
  baseColumnDatum,
  targetColumnDatum,
  ...props
}: Props & ChakraProps) {
  zReport(ZColSchema.safeParse(baseColumnDatum));
  zReport(ZColSchema.safeParse(targetColumnDatum));
  const metakeyEntries: MetricNameMetakeyList = [
    ['valids', 'Valid'],
    ['invalids', 'Invalid'],
    ['nulls', 'Missing'],
  ];
  const totalMetricsList = transformCRMetricsInfoList(
    [['total', 'Total']],
    baseColumnDatum,
    targetColumnDatum,
    'count',
  );
  const metricsList = transformCRMetricsInfoList(
    metakeyEntries,
    baseColumnDatum,
    targetColumnDatum,
  );

  return (
    <>
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
