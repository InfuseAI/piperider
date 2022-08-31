import { ChakraProps } from '@chakra-ui/system';
import { ColumnSchema } from '../../../sdlc/single-report-schema';
import { ZColSchema, zReport } from '../../../types';
import { transformCRMetricsInfoList } from '../../../utils/transformers';
import { MetricMetaKeys, MetricsInfo } from './MetricsInfo';

type Props = {
  baseColumnDatum?: ColumnSchema;
  targetColumnDatum?: ColumnSchema;
};
export function CRGeneralColumnMetrics({
  baseColumnDatum,
  targetColumnDatum,
  ...props
}: Props & ChakraProps) {
  zReport(ZColSchema.safeParse(baseColumnDatum));
  zReport(ZColSchema.safeParse(targetColumnDatum));
  const metakeyEntries: [MetricMetaKeys, string][] = [
    ['total', 'Total'],
    ['valids', 'Valid'],
    ['invalids', 'Invalid'],
    ['nulls', 'Missing'],
  ];
  const metricsList = transformCRMetricsInfoList(
    metakeyEntries,
    baseColumnDatum,
    targetColumnDatum,
  );

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
