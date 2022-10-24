import { FlexProps, Flex } from '@chakra-ui/react';
import { ColumnSchema } from '../../../../sdlc/single-report-schema';
import { ZColSchema, zReport } from '../../../../types';
import { NO_VALUE } from '../constants';
import {
  containsAvgSDSummary,
  containsDistinctDuplicateSummary,
  containsMinMaxSummary,
  MetricNameMetakeyList,
  transformSRMetricsInfoList,
} from '../utils';
import { MetricsInfo } from './MetricsInfo';

interface Props {
  columnDatum?: ColumnSchema;
}
/**
 * Shows metric stats for Avg, Stddev, Min/Max, Distinct, Duplicates
 */
export function SummaryStats({ columnDatum, ...props }: Props & FlexProps) {
  zReport(ZColSchema.safeParse(columnDatum));
  const isColTypeString = columnDatum?.type === 'string';
  const isColTypeDatetime = columnDatum?.type === 'datetime';
  const affix = isColTypeString ? ` Length` : '';

  // Each list below are separated to render differently
  const avgSDMetakeyList: MetricNameMetakeyList = [
    [isColTypeString ? 'avg_length' : 'avg', `Average ${affix}`],
    [isColTypeString ? 'stddev_length' : 'stddev', `SD ${affix}`],
  ];
  const avgSDMetricsList = transformSRMetricsInfoList(
    avgSDMetakeyList,
    columnDatum,
  );

  const minMaxMetakeyList: MetricNameMetakeyList = [
    [isColTypeString ? 'min_length' : 'min', `Min ${affix}`],
    [isColTypeString ? 'max_length' : 'max', `Max ${affix}`],
  ];
  !isColTypeString &&
    !isColTypeDatetime &&
    minMaxMetakeyList.push(['sum', `Sum`]); //text-length has no sum

  const minMaxMetricsList = transformSRMetricsInfoList(
    minMaxMetakeyList,
    columnDatum,
  );

  const distinctDuplicateMetakeyList: MetricNameMetakeyList = [
    ['distinct', `Distincts`],
    ['duplicates', `Duplicates`],
  ];
  const distinctDuplicateMetricsList = transformSRMetricsInfoList(
    distinctDuplicateMetakeyList,
    columnDatum,
  );

  return (
    <>
      {containsAvgSDSummary(columnDatum?.type) && (
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
                  metakey={metakey}
                  firstSlot={NO_VALUE}
                  secondSlot={secondSlot}
                  tooltipValues={tooltipValues}
                  width={'100%'}
                  {...props}
                />
              ),
            )}
        </Flex>
      )}
      {containsMinMaxSummary(columnDatum?.type) && (
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
                  metakey={metakey}
                  firstSlot={NO_VALUE}
                  secondSlot={secondSlot}
                  tooltipValues={tooltipValues}
                  width={'100%'}
                  {...props}
                />
              ),
            )}
        </Flex>
      )}
      {containsDistinctDuplicateSummary(columnDatum?.type) && (
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
