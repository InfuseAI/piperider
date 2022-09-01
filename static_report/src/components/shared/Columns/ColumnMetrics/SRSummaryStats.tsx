import { FlexProps, Flex } from '@chakra-ui/react';
import { ColumnSchema } from '../../../../sdlc/single-report-schema';
import { ZColSchema, zReport } from '../../../../types';
import {
  containsAvgSDSummary,
  containsDistinctDuplicateSummary,
  containsMinMaxSummary,
  transformSRMetricsInfoList,
} from '../../../../utils/transformers';
import { NO_VALUE, TEXTLENGTH } from '../ColumnCard/ColumnTypeDetail/constants';
import { MetricMetaKeys, MetricsInfo } from './MetricsInfo';

type Props = {
  columnDatum?: ColumnSchema;
};

export function SRSummaryStats({ columnDatum, ...props }: Props & FlexProps) {
  zReport(ZColSchema.safeParse(columnDatum));
  const subtitle = columnDatum?.type === 'string' ? ` (${TEXTLENGTH})` : '';

  const avgSDMetakeyList: [MetricMetaKeys, string][] = [
    ['avg', `Average`],
    ['stddev', `SD`],
  ];
  const avgSDMetricsList = transformSRMetricsInfoList(
    avgSDMetakeyList,
    columnDatum,
  );
  const minMaxMetakeyList: [MetricMetaKeys, string][] = [
    ['min', `Min`],
    ['max', `Max`],
  ];
  const minMaxMetricsList = transformSRMetricsInfoList(
    minMaxMetakeyList,
    columnDatum,
  );
  const distinctDuplicateMetakeyList: [MetricMetaKeys, string][] = [
    ['distinct', `Distincts`],
    ['duplicates', `Duplicates`],
  ];
  const distinctDuplicateMetricsList = transformSRMetricsInfoList(
    distinctDuplicateMetakeyList,
    columnDatum,
  );
  const { type } = columnDatum || {};
  return (
    <>
      {containsAvgSDSummary(type) && (
        <Flex direction="column">
          {avgSDMetricsList &&
            avgSDMetricsList.map(
              ({ name, metakey, secondSlot, tooltipValues }, index) => (
                <MetricsInfo
                  key={index}
                  name={name}
                  subtitle={subtitle}
                  metakey={metakey}
                  firstSlot={NO_VALUE}
                  secondSlot={secondSlot}
                  tooltipValues={tooltipValues}
                  {...props}
                />
              ),
            )}
        </Flex>
      )}
      {containsMinMaxSummary(type) && (
        <Flex direction="column">
          {minMaxMetricsList &&
            minMaxMetricsList.map(
              ({ name, metakey, secondSlot, tooltipValues }, index) => (
                <MetricsInfo
                  key={index}
                  name={name}
                  subtitle={subtitle}
                  metakey={metakey}
                  firstSlot={NO_VALUE}
                  secondSlot={secondSlot}
                  tooltipValues={tooltipValues}
                  {...props}
                />
              ),
            )}
        </Flex>
      )}
      {containsDistinctDuplicateSummary(type) && (
        <Flex direction="column">
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
                  {...props}
                />
              ),
            )}
        </Flex>
      )}
    </>
  );
}
