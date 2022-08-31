import { ChakraProps } from '@chakra-ui/system';
import { ColumnSchema } from '../../../sdlc/single-report-schema';
import { ZColSchema, zReport } from '../../../types';
import { formatSRMetricsInfoList } from '../../../utils/transformers';
import { MetricMetaKeys, MetricsInfo } from './MetricsInfo';

type Props = { columnDatum?: ColumnSchema };
export function SRTextNumberStats({
  columnDatum,
  ...props
}: Props & ChakraProps) {
  zReport(ZColSchema.safeParse(columnDatum));
  // if (columnDatum) {
  //   var {
  //     positives: basePositives,
  //     negatives: baseNegatives,
  //     non_zero_length: baseNonZeroLength,
  //     zero_length: baseZeroLength,
  //     zeros: baseZeros,
  //   } = columnDatum;
  //   var {
  //     zerosOfTotal: baseZerosOfTotal,
  //     zeroLengthOfTotal: baseZeroLengthOfTotal,
  //     nonZeroLengthOfTotal: baseNonZeroLengthOfTotal,
  //     negativesOfTotal: baseNegativesOfTotal,
  //     positivesOfTotal: basePositivesOfTotal,
  //   } = getColumnDetails(columnDatum);
  // }

  // if (targetColumn) {
  //   var { positives: targetPositives } = targetColumn;
  //   var {
  //     zeroLengthOfTotal: targetZeroLengthOfTotal,
  //     nonZeroLengthOfTotal: targetNonZeroLengthOfTotal,
  //     zerosOfTotal: targetZerosOfTotal,
  //     negativesOfTotal: targetNegativesOfTotal,
  //   } = getColumnDetails(targetColumn);
  // }
  //FIXME: Finish the job!

  const numeralMetakeyList: [MetricMetaKeys, string][] = [
    ['positives', 'Positives'],
    ['zeros', 'Zeros'],
    ['negatives', 'Negatives'],
  ];
  const numeralMetricsList = formatSRMetricsInfoList(
    numeralMetakeyList,
    columnDatum,
  );
  const textMetakeyList: [MetricMetaKeys, string][] = [
    ['non_zero_length', 'Non-zero Length'],
    ['zero_length', 'Zero Length'],
  ];
  const textMetricsList = formatSRMetricsInfoList(
    numeralMetakeyList,
    columnDatum,
  );

  return (
    <>
      {(columnDatum?.type === 'integer' || columnDatum?.type === 'numeric') && (
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
          {/* <MetricsInfo
            reverse
            name="Zeros"
            metakey="zeros"
            firstSlot={formatColumnValueWith(
              targetColumn ? baseZerosOfTotal : baseZeros,
              targetColumn ? formatIntervalMinMax : formatAsAbbreviatedNumber,
            )}
            secondSlot={formatColumnValueWith(
              targetColumn ? targetZerosOfTotal : baseZerosOfTotal,
              formatIntervalMinMax,
            )}
            tooltipValues={{ firstSlot: formatNumber(baseZeros) }}
            {...props}
          />
          <MetricsInfo
            reverse
            name="Negatives"
            metakey="negatives"
            firstSlot={formatColumnValueWith(
              targetColumn ? baseNegativesOfTotal : baseNegatives,
              targetColumn ? formatIntervalMinMax : formatAsAbbreviatedNumber,
            )}
            secondSlot={formatColumnValueWith(
              targetColumn ? targetNegativesOfTotal : baseNegativesOfTotal,
              formatIntervalMinMax,
            )}
            tooltipValues={{ firstSlot: formatNumber(baseNegatives) }}
            {...props}
          /> */}
        </>
      )}
      {columnDatum?.type === 'string' && (
        <>
          {textMetricsList &&
            textMetricsList.map(({ name, metakey, firstSlot, secondSlot }) => (
              <MetricsInfo
                {...props}
                name={name}
                metakey={metakey}
                firstSlot={firstSlot}
                secondSlot={secondSlot}
              />
            ))}
        </>
      )}
    </>
  );
}
