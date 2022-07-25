import {
  Table,
  TableContainer,
  Tbody,
  Td,
  Th,
  Thead,
  Tr,
} from '@chakra-ui/react';
import { nanoid } from 'nanoid';
import { ColumnSchema } from '../../sdlc/single-report-schema';
import { ZColSchema } from '../../types';

type Props = {
  columnDatum: ColumnSchema;
};
export const QuantilesChart: React.FC<Props> = ({ columnDatum }) => {
  ZColSchema.parse(columnDatum);
  const { min, p5, p25, p50, p75, p95, max } = columnDatum;
  const quantileData = [
    { min },
    { p5 },
    { p25 },
    { p50 },
    { p75 },
    { p95 },
    { max },
  ];
  return (
    <TableContainer>
      <Table size={'sm'} variant={'unstyled'}>
        <Thead>
          <Tr>
            {quantileData.map((d) => {
              const heading = Object.keys(d)[0];
              return <Th key={nanoid()}>{heading}</Th>;
            })}
          </Tr>
        </Thead>
        <Tbody>
          <Tr>
            {quantileData.map((d) => {
              const heading = Object.keys(d)[0];
              return <Td key={nanoid()}>{d[heading]}</Td>;
            })}
          </Tr>
        </Tbody>
      </Table>
    </TableContainer>
  );
};
