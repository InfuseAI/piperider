import { ChakraProps, Flex } from '@chakra-ui/react';
import { ColumnSchema } from '../../../sdlc/single-report-schema';
import { ZColSchema, zReport } from '../../../types';
import { transformCRMetricsInfoList } from '../../../utils/transformers';
import { NO_VALUE, TEXTLENGTH } from '../ColumnCard/ColumnTypeDetail/constants';
import { MetricMetaKeys, MetricsInfo } from './MetricsInfo';

type Props = {
  baseColumnDatum?: ColumnSchema;
  targetColumnDatum?: ColumnSchema;
};

export function CRSummaryStats({
  baseColumnDatum,
  targetColumnDatum,
  ...props
}: Props & ChakraProps) {
  zReport(ZColSchema.safeParse(baseColumnDatum));
  const subtitle = baseColumnDatum?.type === 'string' ? ` (${TEXTLENGTH})` : '';

  const avgSDMetakeyList: [MetricMetaKeys, string][] = [
    ['avg', `Average`],
    ['stddev', `SD`],
  ];
  const avgSDMetricsList = transformCRMetricsInfoList(
    avgSDMetakeyList,
    baseColumnDatum,
    targetColumnDatum,
    'count',
  );
  const minMaxMetakeyList: [MetricMetaKeys, string][] = [
    ['min', `Min`],
    ['max', `Max`],
  ];
  const minMaxMetricsList = transformCRMetricsInfoList(
    minMaxMetakeyList,
    baseColumnDatum,
    targetColumnDatum,
    'count',
  );
  const distinctDuplicateMetakeyList: [MetricMetaKeys, string][] = [
    ['distinct', `Distincts`],
    ['duplicates', `Duplicates`],
  ];
  const distinctDuplicateMetricsList = transformCRMetricsInfoList(
    distinctDuplicateMetakeyList,
    baseColumnDatum,
    targetColumnDatum,
  );

  return (
    <>
      <Flex direction="column">
        {baseColumnDatum?.type !== 'datetime' &&
          baseColumnDatum?.type !== 'other' && (
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
                      subtitle={subtitle}
                      metakey={metakey}
                      firstSlot={firstSlot}
                      secondSlot={secondSlot}
                      tooltipValues={tooltipValues}
                      width={'100%'}
                      {...props}
                    />
                  ),
                )}
            </>
          )}
      </Flex>
      <Flex direction="column">
        {(baseColumnDatum?.type === 'numeric' ||
          baseColumnDatum?.type === 'integer' ||
          baseColumnDatum?.type === 'string') && (
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
                    subtitle={subtitle}
                    metakey={metakey}
                    firstSlot={firstSlot}
                    secondSlot={secondSlot}
                    tooltipValues={tooltipValues}
                    width={'100%'}
                    {...props}
                  />
                ),
              )}
          </>
        )}
      </Flex>
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
    </>
  );
}
