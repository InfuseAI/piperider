import { Flex } from '@chakra-ui/react';
import { ColumnSchema } from '../../sdlc/single-report-schema';
import { ZColSchema } from '../../types';
import { formatColumnValueWith, formatNumber } from '../../utils/formatters';
import { MetricsInfo } from './MetrisInfo';

type Props = {
  baseColumn: ColumnSchema;
  targetColumn?: ColumnSchema;
};

export function NumericTableColumn({ baseColumn, targetColumn }: Props) {
  ZColSchema.parse(baseColumn);
  ZColSchema.parse(baseColumn);
  return (
    <>
      <Flex direction="column">
        <MetricsInfo
          name="Average"
          base={formatColumnValueWith(baseColumn?.avg, formatNumber)}
          target={
            targetColumn &&
            formatColumnValueWith(targetColumn?.avg, formatNumber)
          }
        />
        <MetricsInfo
          name="Std. Deviation"
          base={formatColumnValueWith(baseColumn?.stddev, formatNumber)}
          target={
            targetColumn &&
            formatColumnValueWith(targetColumn?.stddev, formatNumber)
          }
        />
      </Flex>
      <Flex direction="column">
        <MetricsInfo
          name="Min"
          base={formatColumnValueWith(baseColumn?.min, formatNumber)}
          target={
            targetColumn &&
            formatColumnValueWith(targetColumn?.min, formatNumber)
          }
        />
        <MetricsInfo
          name="5%"
          base={formatColumnValueWith(baseColumn?.p5, formatNumber)}
          target={
            targetColumn &&
            formatColumnValueWith(targetColumn?.p5, formatNumber)
          }
        />
        <MetricsInfo
          name="25%"
          base={formatColumnValueWith(baseColumn?.p25, formatNumber)}
          target={
            targetColumn &&
            formatColumnValueWith(targetColumn?.p25, formatNumber)
          }
        />
        <MetricsInfo
          name="50%"
          base={formatColumnValueWith(baseColumn?.p50, formatNumber)}
          target={
            targetColumn &&
            formatColumnValueWith(targetColumn?.p50, formatNumber)
          }
        />
        <MetricsInfo
          name="75%"
          base={formatColumnValueWith(baseColumn?.p75, formatNumber)}
          target={
            targetColumn &&
            formatColumnValueWith(targetColumn?.p75, formatNumber)
          }
        />
        <MetricsInfo
          name="95%"
          base={formatColumnValueWith(baseColumn?.p95, formatNumber)}
          target={
            targetColumn &&
            formatColumnValueWith(targetColumn?.p95, formatNumber)
          }
        />
        <MetricsInfo
          name="Max"
          base={formatColumnValueWith(baseColumn?.max, formatNumber)}
          target={
            targetColumn &&
            formatColumnValueWith(targetColumn?.max, formatNumber)
          }
        />
      </Flex>
    </>
  );
}
