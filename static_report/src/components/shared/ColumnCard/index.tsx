import { Flex } from '@chakra-ui/react';
import { ReactNode } from 'react';
import { ColumnSchema } from '../../../sdlc/single-report-schema';
import { ZColSchema } from '../../../types';
import { ColumnCardBodyContainer } from './ColumnCardBodyContainer';
import { ColumnCardDataVisualContainer } from './ColumnCardDataVisualContainer';
import { ColumnCardHeader } from './ColumnCardHeader';
import { ColumnTypeDetailBoolean } from './ColumnTypeDetail/ColumnTypeDetailBoolean';
import { ColumnTypeDetailDatetime } from './ColumnTypeDetail/ColumnTypeDetailDatetime';
import { ColumnTypeDetailNumeric } from './ColumnTypeDetail/ColumnTypeDetailNumeric';
import { ColumnTypeDetailString } from './ColumnTypeDetail/ColumnTypeDetailString';

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
      width="400px"
      h={[700]}
      rounded={'lg'}
    >
      <ColumnCardHeader title={title} description={description} />
      <ColumnCardDataVisualContainer title={title}>
        {children}
      </ColumnCardDataVisualContainer>
      <ColumnCardBodyContainer>
        {
          // DEFINED [DEV RDY!]
          // "string",
          // "boolean", <- as categorical now
          // "datetime", // "date",
          // "numeric",
          // // UNDEFINED DESIGNS/SPECS
          // "integer",
          // "time",
          // "other"
        }
        {columnDatum.type === 'boolean' && (
          <ColumnTypeDetailBoolean columnDatum={columnDatum} />
        )}
        {columnDatum.type === 'string' && (
          <ColumnTypeDetailString columnDatum={columnDatum} />
        )}
        {(columnDatum.type === 'datetime' || columnDatum.type === 'date') && (
          <ColumnTypeDetailDatetime columnDatum={columnDatum} />
        )}
        {columnDatum.type === 'numeric' && (
          <ColumnTypeDetailNumeric columnDatum={columnDatum} />
        )}
      </ColumnCardBodyContainer>
    </Flex>
  );
}
