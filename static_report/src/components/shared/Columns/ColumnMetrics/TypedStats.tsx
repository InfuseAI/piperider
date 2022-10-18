import { FlexProps } from '@chakra-ui/react';
import { ColumnSchema } from '../../../../sdlc/single-report-schema';
import { Comparable, ZColSchema, zReport } from '../../../../types';
import { colorMap } from '../../../../utils/theme';
import {
  MetricNameMetakeyList,
  transformSRMetricsInfoList,
  transformCRMetricsInfoList,
  containsColumnQuantile,
} from '../utils';
import { MetricMetaKeys, MetricsInfo } from './MetricsInfo';

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

  // Total displays differently if has base/target
  const totalMetaKeyEntry: MetricNameMetakeyList = [
    [baseColumnDatum?.samples ? 'samples' : 'total', 'Total'],
  ];

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
                  showColorSquare
                  squareColor={colorMap.get(metakey as MetricMetaKeys)}
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
                  showColorSquare
                  squareColor={colorMap.get(metakey as MetricMetaKeys)}
                  {...props}
                />
              ),
            )}
        </>
      )}
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
            mt={2}
            ml={4}
            width="100%"
            {...props}
          />
        ),
      )}
    </>
  );
}
