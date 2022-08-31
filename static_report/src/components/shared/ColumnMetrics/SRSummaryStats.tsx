import { ChakraProps, Flex } from '@chakra-ui/react';
import { ColumnSchema } from '../../../sdlc/single-report-schema';
import { ZColSchema, zReport } from '../../../types';
import { formatSRMetricsInfoList } from '../../../utils/transformers';
import { TEXTLENGTH } from '../ColumnCard/ColumnTypeDetail/constants';
import { MetricMetaKeys, MetricsInfo } from './MetricsInfo';

type Props = {
  columnDatum?: ColumnSchema;
};

export function SRSummaryStats({ columnDatum, ...props }: Props & ChakraProps) {
  zReport(ZColSchema.safeParse(columnDatum));
  const subtitle = columnDatum?.type === 'string' ? ` (${TEXTLENGTH})` : '';

  const avgSDMetakeyList: [MetricMetaKeys, string][] = [
    ['avg', `Average${subtitle}`],
    ['stddev', `SD${subtitle}`],
  ];
  const avgSDMetricsList = formatSRMetricsInfoList(
    avgSDMetakeyList,
    columnDatum,
  );
  const minMaxMetakeyList: [MetricMetaKeys, string][] = [
    ['min', `Min${subtitle}`],
    ['max', `Max${subtitle}`],
  ];
  const minMaxMetricsList = formatSRMetricsInfoList(
    minMaxMetakeyList,
    columnDatum,
  );
  const distinctDuplicateMetakeyList: [MetricMetaKeys, string][] = [
    ['distinct', `Distincts${subtitle}`],
    ['duplicates', `Duplicates${subtitle}`],
  ];
  const distinctDuplicateMetricsList = formatSRMetricsInfoList(
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
      </Flex>
      <Flex direction="column">
        {(columnDatum?.type === 'numeric' ||
          columnDatum?.type === 'integer') && (
          <>
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
                    firstSlot={firstSlot}
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
