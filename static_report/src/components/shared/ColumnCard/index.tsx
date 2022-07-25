import { Flex } from '@chakra-ui/react';
import { ReactNode } from 'react';
import { ColumnSchema } from '../../../sdlc/single-report-schema';
import { ZColSchema } from '../../../types';
import { ColumnCardBodyContainer } from './ColumnCardBodyContainer';
import { ColumnCardDataVisualContainer } from './ColumnCardDataVisualContainer';
import { ColumnCardHeader } from './ColumnCardHeader';
import { ColumnTypeDetailDatetime } from './ColumnTypeDetail/ColumnTypeDetailDatetime';
import { ColumnTypeDetailNumeric } from './ColumnTypeDetail/ColumnTypeDetailNumeric';
import { ColumnTypeDetailString } from './ColumnTypeDetail/ColumnTypeDetailString';

/**
   *"type": {
      "enum": [
        // DEFINED [DEV RDY!]
        "string",
        "boolean",
        "datetime",
        // UNDEFINED DESIGNS/SPECS
        "numeric",
        "integer",
        "date",
        "time",
        "other"
      ]
    },
   */
interface Props {
  columnDatum: ColumnSchema;
  children: ReactNode;
}
export function ColumnCard({ columnDatum, children }: Props) {
  ZColSchema.parse(columnDatum);
  const { name: title, description } = columnDatum;

  return (
    <Flex
      direction={'column'}
      bg={'gray.300'}
      minWidth="400px"
      h={[700]}
      rounded={'lg'}
    >
      <ColumnCardHeader title={title} description={description} />
      <ColumnCardDataVisualContainer>{children}</ColumnCardDataVisualContainer>
      <ColumnCardBodyContainer>
        {/* [ Render Logic: ] Depending on type(s), determine which ColumnTypeDetail** set of metricCells to render */}
        {columnDatum.type === 'string' && (
          <ColumnTypeDetailString columnDatum={columnDatum} />
        )}
        {columnDatum.type === 'datetime' && (
          <ColumnTypeDetailDatetime columnDatum={columnDatum} />
        )}
        {columnDatum.type === 'numeric' && (
          <ColumnTypeDetailNumeric columnDatum={columnDatum} />
        )}
      </ColumnCardBodyContainer>
    </Flex>
  );
}
