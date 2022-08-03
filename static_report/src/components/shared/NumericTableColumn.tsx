import { Flex } from '@chakra-ui/react';
import { ColumnSchema } from '../../sdlc/single-report-schema';
import { ZColSchema, zReport } from '../../types';
import { formatColumnValueWith, formatNumber } from '../../utils/formatters';
import { MetricsInfo } from './MetricsInfo';

type Props = {
  baseColumn: ColumnSchema;
  targetColumn?: ColumnSchema;
};

export function NumericTableColumn({ baseColumn, targetColumn }: Props) {
  zReport(ZColSchema.safeParse(baseColumn));
  zReport(ZColSchema.safeParse(baseColumn));
  return (
    <>
      <Flex direction="column">
        <MetricsInfo
          name="Average"
          firstSlot={formatColumnValueWith(baseColumn?.avg, formatNumber)}
          secondSlot={formatColumnValueWith(targetColumn?.avg, formatNumber)}
        />
        <MetricsInfo
          name="Std. Deviation"
          firstSlot={formatColumnValueWith(baseColumn?.stddev, formatNumber)}
          secondSlot={formatColumnValueWith(targetColumn?.stddev, formatNumber)}
        />
      </Flex>
      <Flex direction="column">
        <MetricsInfo
          name="Min"
          firstSlot={formatColumnValueWith(baseColumn?.min, formatNumber)}
          secondSlot={formatColumnValueWith(targetColumn?.min, formatNumber)}
        />
        <MetricsInfo
          name="5%"
          firstSlot={formatColumnValueWith(baseColumn?.p5, formatNumber)}
          secondSlot={formatColumnValueWith(targetColumn?.p5, formatNumber)}
        />
        <MetricsInfo
          name="25%"
          firstSlot={formatColumnValueWith(baseColumn?.p25, formatNumber)}
          secondSlot={formatColumnValueWith(targetColumn?.p25, formatNumber)}
        />
        <MetricsInfo
          name="50%"
          firstSlot={formatColumnValueWith(baseColumn?.p50, formatNumber)}
          secondSlot={formatColumnValueWith(targetColumn?.p50, formatNumber)}
        />
        <MetricsInfo
          name="75%"
          firstSlot={formatColumnValueWith(baseColumn?.p75, formatNumber)}
          secondSlot={formatColumnValueWith(targetColumn?.p75, formatNumber)}
        />
        <MetricsInfo
          name="95%"
          firstSlot={formatColumnValueWith(baseColumn?.p95, formatNumber)}
          secondSlot={formatColumnValueWith(targetColumn?.p95, formatNumber)}
        />
        <MetricsInfo
          name="Max"
          firstSlot={formatColumnValueWith(baseColumn?.max, formatNumber)}
          secondSlot={formatColumnValueWith(targetColumn?.max, formatNumber)}
        />
      </Flex>
    </>
  );
}
