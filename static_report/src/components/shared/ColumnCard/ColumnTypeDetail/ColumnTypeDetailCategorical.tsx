import { Divider, Flex } from '@chakra-ui/react';
import { ColumnSchema } from '../../../../sdlc/single-report-schema';
import {
  formatColumnValueWith,
  formatIntervalMinMax,
  formatModeMetrics,
} from '../../../../utils/formatters';
import { getColumnDetails } from '../../../../utils/transformers';
import { MetricCell } from '../../MetricCell';
import { QuantilesChart } from '../../QuantilesChart';
import { DataCompositionMetrics } from '../ColumnMetrics/DataCompositionMetrics';
import { UniquenessMetrics } from '../ColumnMetrics/UniquenessMetrics';
import { MODE, VALIDS } from './constants';

type Props = { columnDatum: ColumnSchema };
export const ColumnTypeDetailCategorical: React.FC<Props> = ({
  columnDatum,
}) => {
  const { validsOfTotal } = getColumnDetails(columnDatum);
  const { valids, type } = columnDatum;

  return (
    <Flex direction={'column'}>
      <DataCompositionMetrics columnDatum={columnDatum}>
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
      <Flex justify={'space-evenly'}>
        <MetricCell
          metaKey="topk"
          label={MODE}
          value={formatModeMetrics(columnDatum)}
        />
      </Flex>
      {type === 'integer' && (
        <>
          <Divider />
          <Flex mt={2}>
            <QuantilesChart columnDatum={columnDatum} />
          </Flex>
        </>
      )}
    </Flex>
  );
};
