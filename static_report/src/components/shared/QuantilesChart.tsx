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
import { formatAsAbbreviatedNumber } from '../../utils/formatters';

type Props = {
  columnDatum: ColumnSchema;
};
export const QuantilesChart: React.FC<Props> = ({ columnDatum }) => {
  ZColSchema.parse(columnDatum);
  const { min, p5, p25, p50, p75, p95, max } = columnDatum;
  const quantileData = [
    { label: 'Min', value: min },
    { label: '5%', value: p5 },
    { label: '25%', value: p25 },
    { label: '50%', value: p50 },
    { label: '75%', value: p75 },
    { label: '95%', value: p95 },
    { label: 'Max', value: max },
  ];
  return (
    <TableContainer w={'100%'}>
      <Table size={'sm'} variant={'simple'}>
        <Thead>
          <Tr>
            {quantileData.map((d) => (
              <Th pr={0} pl={2} key={nanoid()} textAlign={'center'}>
                {d.label}
              </Th>
            ))}
          </Tr>
        </Thead>
        <Tbody>
          <Tr>
            {quantileData.map((d) => {
              return (
                <Td pr={0} pl={2} key={nanoid()} textAlign={'center'}>
                  {formatAsAbbreviatedNumber(d.value)}
                </Td>
              );
            })}
          </Tr>
        </Tbody>
      </Table>
    </TableContainer>
  );
};
