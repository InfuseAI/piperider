import { FlexProps } from '@chakra-ui/react';
import { ColumnSchema } from '../../../../sdlc/single-report-schema';
import { Comparable, ZColSchema, zReport } from '../../../../types';
import {
  containsColumnQuantile,
  MetricNameMetakeyList,
  transformCRMetricsInfoList,
  transformSRMetricsInfoList,
} from '../../../../utils/transformers';
import { MetricsInfo } from './MetricsInfo';

interface Props extends Comparable {
  baseColumnDatum?: ColumnSchema;
  targetColumnDatum?: ColumnSchema;
}
/**
 * Shows metric stats for column.type: positives/zero/negatives, (non)zero-lengths
 */
export function TypedStats({
  baseColumnDatum,
  targetColumnDatum,
  singleOnly,
  ...props
}: Props & FlexProps) {
  zReport(ZColSchema.safeParse(baseColumnDatum));
  zReport(ZColSchema.safeParse(targetColumnDatum));

  const numeralMetakeyList: MetricNameMetakeyList = [
    ['positives', 'Positives'],
    ['zeros', 'Zeros'],
    ['negatives', 'Negatives'],
  ];
  const numeralMetricsList = singleOnly
    ? transformSRMetricsInfoList(numeralMetakeyList, baseColumnDatum)
    : transformCRMetricsInfoList(
        numeralMetakeyList,
        baseColumnDatum,
        targetColumnDatum,
      );
  const textMetakeyList: MetricNameMetakeyList = [
    ['non_zero_length', 'Non-zero Length'],
    ['zero_length', 'Zero Length'],
  ];
  const textMetricsList = singleOnly
    ? transformSRMetricsInfoList(textMetakeyList, baseColumnDatum)
    : transformCRMetricsInfoList(
        textMetakeyList,
        baseColumnDatum,
        targetColumnDatum,
      );

  return (
    <>
      {containsColumnQuantile(baseColumnDatum?.type) && (
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
      {baseColumnDatum?.type === 'string' && (
        <>
          {textMetricsList &&
            textMetricsList.map(
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
    </>
  );
}
