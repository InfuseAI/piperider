import { FlexProps } from '@chakra-ui/react';
import { ColumnSchema } from '../../../../sdlc/single-report-schema';
import { ZColSchema, zReport } from '../../../../types';
import { transformSRMetricsInfoList } from '../../../../utils/transformers';
import { MetricMetaKeys, MetricsInfo } from './MetricsInfo';

type Props = {
  columnDatum?: ColumnSchema;
};
export function SRGeneralStats({ columnDatum, ...props }: Props & FlexProps) {
  zReport(ZColSchema.safeParse(columnDatum));
  const metakeyEntries: [MetricMetaKeys, string][] = [
    ['total', 'Total'],
    ['valids', 'Valid'],
    ['invalids', 'Invalid'],
    ['nulls', 'Missing'],
  ];
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
            {...props}
          />
        ),
      )}
    </>
  );
}
