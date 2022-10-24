import { FlexProps } from '@chakra-ui/react';
import { ColumnSchema } from '../../../../sdlc/single-report-schema';
import { ZColSchema, zReport } from '../../../../types';
import { colorMap } from '../../../../utils/theme';
import {
  MetricNameMetakeyList,
  transformSRMetricsInfoList,
  containsColumnQuantile,
} from '../utils';
import { MetricMetaKeys, MetricsInfo } from './MetricsInfo';

interface Props {
  columnDatum?: ColumnSchema;
}
/**
 * Shows metric stats for column.type: positives/zero/negatives, (non)zero-lengths
 */
export function TypedStats({ columnDatum, ...props }: Props & FlexProps) {
  zReport(ZColSchema.safeParse(columnDatum));

  const numeralMetakeyList: MetricNameMetakeyList = [
    ['positives', 'Positives'],
    ['zeros', 'Zeros'],
    ['negatives', 'Negatives'],
  ];
  const numeralMetricsList = transformSRMetricsInfoList(
    numeralMetakeyList,
    columnDatum,
  );
  const textMetakeyList: MetricNameMetakeyList = [
    ['non_zero_length', 'Non-zero Length'],
    ['zero_length', 'Zero Length'],
  ];
  const textMetricsList = transformSRMetricsInfoList(
    textMetakeyList,
    columnDatum,
  );

  // Total displays differently if has base/target
  const totalMetaKeyEntry: MetricNameMetakeyList = [
    [columnDatum?.samples ? 'samples' : 'total', 'Total'],
  ];

  const totalMetricsList = transformSRMetricsInfoList(
    totalMetaKeyEntry,
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
                  showColorSquare
                  squareColor={colorMap.get(metakey as MetricMetaKeys)}
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
