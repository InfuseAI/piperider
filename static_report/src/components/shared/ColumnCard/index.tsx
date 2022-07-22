import { Flex } from '@chakra-ui/react';
import { ReactNode } from 'react';
import { ColumnSchema } from '../../../sdlc/single-report-schema';
import { ZColSchema } from '../../../types';
import { ColumnCardDataVisualContainer } from './ColumnCardDataVisual';
import { ColumnCardHeader } from './ColumnCardHeader';

// Chart goes as transcluded children of New Column Card
// -- ColumnCard
// ------ ColumnCardHeader
// -------- <{ children_col_name }>
// -------- <{ children_col_description }>
// ------ ColumnCardDataVisual
// -------- <{ children_graph }>
// ------ ColumnCardBody
// -------- <{ children_contents }>
// ---------- <type_base>ColumnDetails
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
    <Flex direction={'column'} bg={'gray.500'} width="400px" h={[700]}>
      <ColumnCardHeader title={title} description={description} />
      <ColumnCardDataVisualContainer>{children}</ColumnCardDataVisualContainer>
      {/* <ColumnCardBody></ColumnCardBody> */}
    </Flex>
  );
}
