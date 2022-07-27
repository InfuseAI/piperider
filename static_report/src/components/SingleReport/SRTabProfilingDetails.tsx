import { Flex, Text } from '@chakra-ui/react';
import { SRBarChart } from './SRBarChart';
import type {
  ColumnSchema,
  TableSchema,
} from '../../sdlc/single-report-schema';
import { histogramSchema } from '../../sdlc/single-report-schema.z';
import { ZColSchema } from '../../types';
import { ColumnCard } from '../shared/ColumnCard';
import { nanoid } from 'nanoid';

interface Props {
  data: TableSchema['columns'];
}
export function SRTabProfilingDetails({ data }: Props) {
  return (
    <Flex direction="row" flexWrap={'wrap'} gap={4} justify={'center'}>
      {Object.keys(data).map((key) => {
        const column = data[key];
        ZColSchema.parse(column);
        console.log(column.schema_type);

        const histogram = histogramSchema.parse(column.histogram);

        _getColumnUI(column.type, column.distinct);

        return (
          <ColumnCard key={nanoid()} columnDatum={column}>
            {histogram ? (
              <SRBarChart
                data={histogram.labels.map((label, i) => ({
                  label,
                  value: histogram.counts[i],
                  total: column.total,
                }))}
              />
            ) : (
              <Text>No data available</Text>
            )}
          </ColumnCard>
        );
      })}
    </Flex>
  );
}

function _getColumnUI(columnType: ColumnSchema['type'], distinctCount: number) {
  const isCategorical = distinctCount <= 100; //this is arbitrary
  if (columnType === 'boolean') return <></>;
  if (columnType === 'string' && isCategorical) return <></>;
  if (columnType === 'string' && !isCategorical) return <></>;
  if (columnType === 'integer' && isCategorical) return <></>;
  if (columnType === 'integer' && !isCategorical) return <></>;
  if (columnType === 'numeric') return <></>;

  return <Text>The column type: {columnType} cannot be displayed</Text>;
}
