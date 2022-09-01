import { FlexProps } from '@chakra-ui/react';
import { ColumnSchema } from '../../../sdlc/single-report-schema';
import { ZColSchema, zReport } from '../../../types';
import {
  containsColumnQuantile,
  transformSRMetricsInfoList,
} from '../../../utils/transformers';
import { MetricMetaKeys, MetricsInfo } from './MetricsInfo';

type Props = { columnDatum?: ColumnSchema };
export function SRTextNumberStats({
  columnDatum,
  ...props
}: Props & FlexProps) {
  zReport(ZColSchema.safeParse(columnDatum));

  const numeralMetakeyList: [MetricMetaKeys, string][] = [
    ['positives', 'Positives'],
    ['zeros', 'Zeros'],
    ['negatives', 'Negatives'],
  ];
  const numeralMetricsList = transformSRMetricsInfoList(
    numeralMetakeyList,
    columnDatum,
  );
  const textMetakeyList: [MetricMetaKeys, string][] = [
    ['non_zero_length', 'Non-zero Length'],
    ['zero_length', 'Zero Length'],
  ];
  const textMetricsList = transformSRMetricsInfoList(
    textMetakeyList,
    columnDatum,
  );

  return (
    <>
      {containsColumnQuantile(columnDatum?.type) && (
        <>
          {numeralMetricsList &&
            numeralMetricsList.map(
              (
                { name, metakey, firstSlot, secondSlot, tooltipValues },
                index,
              ) => (
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
      )}
      {columnDatum?.type === 'string' && (
        <>
          {textMetricsList &&
            textMetricsList.map(
              ({ name, metakey, firstSlot, secondSlot }, index) => (
                <MetricsInfo
                  key={index}
                  name={name}
                  metakey={metakey}
                  firstSlot={firstSlot}
                  secondSlot={secondSlot}
                  {...props}
                />
              ),
            )}
        </>
      )}
    </>
  );
}
