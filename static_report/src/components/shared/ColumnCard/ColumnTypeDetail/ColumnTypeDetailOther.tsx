import { Flex, Divider } from '@chakra-ui/react';
import { ColumnSchema } from '../../../../sdlc/single-report-schema';
import {
  formatColumnValueWith,
  formatIntervalMinMax,
} from '../../../../utils/formatters';
import { getColumnDetails } from '../../../../utils/transformers';
import { MetricCell } from '../../ColumnMetrics/MetricCell';
import { DataCompositionMatrix } from '../ColumnMatrices/DataCompositionMatrix';
import { VALIDS } from './constants';

type Props = { columnDatum: ColumnSchema };
export const ColumnTypeDetailOther: React.FC<Props> = ({ columnDatum }) => {
  const { valids } = columnDatum;
  const { validsOfTotal } = getColumnDetails(columnDatum);

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
    </Flex>
  );
};
