import { Flex, Divider } from '@chakra-ui/react';
import { ColumnSchema } from '../../../../sdlc/single-report-schema';
import {
  formatColumnValueWith,
  formatIntervalMinMax,
} from '../../../../utils/formatters';
import { getColumnDetails } from '../../../../utils/transformers';
import { MetricCell } from '../../MetricCell';
import { DataCompositionMetrics } from '../ColumnMetrics/DataCompositionMetrics';
import { UniquenessMetrics } from '../ColumnMetrics/UniquenessMetrics';
import { VALIDS } from './constants';

type Props = { columnDatum: ColumnSchema };
export const ColumnTypeDetailOther: React.FC<Props> = ({ columnDatum }) => {
  const { valids } = columnDatum;
  const { validsOfTotal } = getColumnDetails(columnDatum);

  return (
    <Flex direction={'column'}>
      <DataCompositionMetrics columnDatum={columnDatum}>
        <Divider orientation="vertical" />
        <Divider orientation="vertical" />
        <MetricCell
          metaKey="valids"
          label={VALIDS}
          value={formatColumnValueWith(validsOfTotal, formatIntervalMinMax)}
          subvalue={valids}
        />
      </DataCompositionMetrics>
      <Divider />
      <UniquenessMetrics columnDatum={columnDatum} />
      <Divider />
    </Flex>
  );
};
