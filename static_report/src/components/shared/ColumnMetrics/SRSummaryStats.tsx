import { ChakraProps, Flex } from '@chakra-ui/react';
import { ColumnSchema } from '../../../sdlc/single-report-schema';
import { ZColSchema, zReport } from '../../../types';
import { transformSRMetricsInfoList } from '../../../utils/transformers';
import { NO_VALUE, TEXTLENGTH } from '../ColumnCard/ColumnTypeDetail/constants';
import { MetricMetaKeys, MetricsInfo } from './MetricsInfo';

type Props = {
  columnDatum?: ColumnSchema;
};

export function SRSummaryStats({ columnDatum, ...props }: Props & ChakraProps) {
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
  return (
    <>
      <Flex direction="column">
        {columnDatum?.type !== 'datetime' && columnDatum?.type !== 'other' && (
          <>
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
          </>
        )}
      </Flex>
      <Flex direction="column">
        {(columnDatum?.type === 'numeric' ||
          columnDatum?.type === 'integer' ||
          columnDatum?.type === 'string') && (
          <>
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
          </>
        )}
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
    </>
  );
}
