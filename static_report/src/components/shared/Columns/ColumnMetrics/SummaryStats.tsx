import { FlexProps, Flex } from '@chakra-ui/react';
import { ColumnSchema } from '../../../../sdlc/single-report-schema';
import { Comparable, ZColSchema, zReport } from '../../../../types';
import { NO_VALUE, TEXTLENGTH } from '../constants';
import {
  containsAvgSDSummary,
  containsDistinctDuplicateSummary,
  containsMinMaxSummary,
  MetricNameMetakeyList,
  transformCRMetricsInfoList,
  transformSRMetricsInfoList,
} from '../utils';
import { MetricsInfo } from './MetricsInfo';

interface Props extends Comparable {
  baseColumnDatum?: ColumnSchema;
  targetColumnDatum?: ColumnSchema;
}
/**
 * Shows metric stats for Avg, Stddev, Min/Max, Distinct, Duplicates
 */
export function SummaryStats({
  baseColumnDatum,
  targetColumnDatum,
  singleOnly,
  ...props
}: Props & FlexProps) {
  zReport(ZColSchema.safeParse(baseColumnDatum));
  const isColTypeString = baseColumnDatum?.type === 'string';
  const subtitle = isColTypeString ? ` (${TEXTLENGTH})` : '';

  // Each list below are separated to render differently
  const avgSDMetakeyList: MetricNameMetakeyList = [
    [isColTypeString ? 'avg_length' : 'avg', `Average`],
    [isColTypeString ? 'stddev_length' : 'stddev', `SD`],
  ];
  const avgSDMetricsList = singleOnly
    ? transformSRMetricsInfoList(avgSDMetakeyList, baseColumnDatum)
    : transformCRMetricsInfoList(
        avgSDMetakeyList,
        baseColumnDatum,
        targetColumnDatum,
        'count',
      );

  const minMaxMetakeyList: MetricNameMetakeyList = [
    [isColTypeString ? 'min_length' : 'min', `Min`],
    [isColTypeString ? 'max_length' : 'max', `Max`],
  ];
  !isColTypeString && minMaxMetakeyList.push(['sum', `Sum`]); //text-length has no sum

  const minMaxMetricsList = singleOnly
    ? transformSRMetricsInfoList(minMaxMetakeyList, baseColumnDatum)
    : transformCRMetricsInfoList(
        minMaxMetakeyList,
        baseColumnDatum,
        targetColumnDatum,
        'count',
      );

  const distinctDuplicateMetakeyList: MetricNameMetakeyList = [
    ['distinct', `Distincts`],
    ['duplicates', `Duplicates`],
  ];
  const distinctDuplicateMetricsList = singleOnly
    ? transformSRMetricsInfoList(distinctDuplicateMetakeyList, baseColumnDatum)
    : transformCRMetricsInfoList(
        distinctDuplicateMetakeyList,
        baseColumnDatum,
        targetColumnDatum,
      );

  return (
    <>
      {(containsAvgSDSummary(baseColumnDatum?.type) ||
        containsAvgSDSummary(targetColumnDatum?.type)) && (
        <Flex direction="column">
          {avgSDMetricsList &&
            avgSDMetricsList.map(
              (
                { name, metakey, firstSlot, secondSlot, tooltipValues },
                index,
              ) => (
                <MetricsInfo
                  key={index}
                  name={name}
                  subtitle={subtitle}
                  metakey={metakey}
                  firstSlot={singleOnly ? NO_VALUE : firstSlot}
                  secondSlot={secondSlot}
                  tooltipValues={tooltipValues}
                  width={'100%'}
                  {...props}
                />
              ),
            )}
        </Flex>
      )}
      {(containsMinMaxSummary(baseColumnDatum?.type) ||
        containsMinMaxSummary(targetColumnDatum?.type)) && (
        <Flex direction="column">
          {minMaxMetricsList &&
            minMaxMetricsList.map(
              (
                { name, metakey, firstSlot, secondSlot, tooltipValues },
                index,
              ) => (
                <MetricsInfo
                  key={index}
                  name={name}
                  subtitle={subtitle}
                  metakey={metakey}
                  firstSlot={singleOnly ? NO_VALUE : firstSlot}
                  secondSlot={secondSlot}
                  tooltipValues={tooltipValues}
                  width={'100%'}
                  {...props}
                />
              ),
            )}
        </Flex>
      )}
      {(containsDistinctDuplicateSummary(baseColumnDatum?.type) ||
        containsDistinctDuplicateSummary(targetColumnDatum?.type)) && (
        <Flex direction={'column'} mt={3}>
          {distinctDuplicateMetricsList &&
            distinctDuplicateMetricsList.map(
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
                  width={'100%'}
                  {...props}
                />
              ),
            )}
        </Flex>
      )}
    </>
  );
}
