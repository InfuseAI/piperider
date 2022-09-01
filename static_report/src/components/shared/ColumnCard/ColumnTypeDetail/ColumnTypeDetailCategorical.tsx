import { Divider, Flex } from '@chakra-ui/react';
import { ColumnSchema } from '../../../../sdlc/single-report-schema';
import {
  formatColumnValueWith,
  formatIntervalMinMax,
  formatTopKMetrics,
} from '../../../../utils/formatters';
import { getColumnMetricRatio } from '../../../../utils/transformers';
import { MetricCell } from '../../ColumnMetrics/MetricCell';
import { DataCompositionMatrix } from '../ColumnMatrices/DataCompositionMatrix';
import { UniquenessMetrics } from '../ColumnMatrices/UniquenessMatrix';
import { MODE, VALIDS } from './constants';

type Props = { columnDatum: ColumnSchema };
export const ColumnTypeDetailCategorical: React.FC<Props> = ({
  columnDatum,
}) => {
  const { valids } = columnDatum;
  const { topValues, topCounts } = formatTopKMetrics(columnDatum);
  const validsOfTotal = getColumnMetricRatio('valids', columnDatum);

  return (
    <Flex direction={'column'}>
      <DataCompositionMatrix columnDatum={columnDatum}>
        <Divider orientation="vertical" />
        <MetricCell
          metaKey="valids"
          label={VALIDS}
          value={formatColumnValueWith(validsOfTotal, formatIntervalMinMax)}
          subvalue={valids}
        />
      </DataCompositionMatrix>
      <Divider />
      <UniquenessMetrics columnDatum={columnDatum} />
      <Divider />
      {topValues && topCounts && (
        <>
          <MetricCell
            metaKey="topk"
            label={MODE}
            value={topValues}
            subvalue={topCounts}
          />
          <Divider />
        </>
      )}
    </Flex>
  );
};
