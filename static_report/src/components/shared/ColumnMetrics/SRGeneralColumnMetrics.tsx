import { ChakraProps } from '@chakra-ui/system';
import { ColumnSchema } from '../../../sdlc/single-report-schema';
import { ZColSchema, zReport } from '../../../types';
import { formatSRMetricsInfoList } from '../../../utils/transformers';
import { MetricMetaKeys, MetricsInfo } from './MetricsInfo';

type Props = {
  columnDatum?: ColumnSchema;
};
export function SRGeneralColumnMetrics({
  columnDatum,
  ...props
}: Props & ChakraProps) {
  zReport(ZColSchema.safeParse(columnDatum));
  const metakeyEntries: [MetricMetaKeys, string][] = [
    ['total', 'Total'],
    ['valids', 'Valid'],
    ['invalids', 'Invalid'],
    ['nulls', 'Missing'],
  ];
  const metricsList = formatSRMetricsInfoList(metakeyEntries, columnDatum);
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
            {...props}
          />
        ),
      )}
    </>
  );
}
