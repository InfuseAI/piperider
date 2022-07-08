import { Flex } from '@chakra-ui/react';
import { ColumnSchema } from '../../sdlc/single-report-schema';
import { formatColumnValueWith, formatNumber } from '../../utils';
import { MetricsInfo } from './MetrisInfo';

type Props = {
  baseColumn: ColumnSchema;
  inputColumn?: ColumnSchema;
};

export function NumericTableColumn({ baseColumn, inputColumn }: Props) {
  return (
    <>
      <Flex direction="column">
        <MetricsInfo
          name="Average"
          base={formatColumnValueWith(baseColumn?.avg, formatNumber)}
          input={
            inputColumn && formatColumnValueWith(inputColumn?.avg, formatNumber)
          }
        />
        <MetricsInfo
          name="Std. Deviation"
          base={formatColumnValueWith(baseColumn?.stddev, formatNumber)}
          input={
            inputColumn &&
            formatColumnValueWith(inputColumn?.stddev, formatNumber)
          }
        />
      </Flex>
      <Flex direction="column">
        <MetricsInfo
          name="Min"
          base={formatColumnValueWith(baseColumn?.min, formatNumber)}
          input={
            inputColumn && formatColumnValueWith(inputColumn?.min, formatNumber)
          }
        />
        <MetricsInfo
          name="5%"
          base={formatColumnValueWith(baseColumn?.p5, formatNumber)}
          input={
            inputColumn && formatColumnValueWith(inputColumn?.p5, formatNumber)
          }
        />
        <MetricsInfo
          name="25%"
          base={formatColumnValueWith(baseColumn?.p25, formatNumber)}
          input={
            inputColumn && formatColumnValueWith(inputColumn?.p25, formatNumber)
          }
        />
        <MetricsInfo
          name="50%"
          base={formatColumnValueWith(baseColumn?.p50, formatNumber)}
          input={
            inputColumn && formatColumnValueWith(inputColumn?.p50, formatNumber)
          }
        />
        <MetricsInfo
          name="75%"
          base={formatColumnValueWith(baseColumn?.p75, formatNumber)}
          input={
            inputColumn && formatColumnValueWith(inputColumn?.p75, formatNumber)
          }
        />
        <MetricsInfo
          name="95%"
          base={formatColumnValueWith(baseColumn?.p95, formatNumber)}
          input={
            inputColumn && formatColumnValueWith(inputColumn?.p95, formatNumber)
          }
        />
        <MetricsInfo
          name="Max"
          base={formatColumnValueWith(baseColumn?.max, formatNumber)}
          input={
            inputColumn && formatColumnValueWith(inputColumn?.max, formatNumber)
          }
        />
      </Flex>
    </>
  );
}
