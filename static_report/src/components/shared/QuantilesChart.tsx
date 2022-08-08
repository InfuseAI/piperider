import {
  Table,
  TableContainer,
  Tbody,
  Td,
  Th,
  Thead,
  Tooltip,
  Tr,
} from '@chakra-ui/react';
import { nanoid } from 'nanoid';
import { schemaMetaDescriptions } from '../../sdlc/schema-meta';
import { ColumnSchema } from '../../sdlc/single-report-schema';
import { ZColSchema } from '../../types';
import {
  formatAsAbbreviatedNumber,
  formatColumnValueWith,
} from '../../utils/formatters';

type Props = {
  columnDatum: ColumnSchema;
};
export function QuantilesChart({ columnDatum }: Props) {
  ZColSchema.parse(columnDatum);
  const { min, p5, p25, p50, p75, p95, max } = columnDatum;
  const quantileData: {
    label: string;
    value?: number | string;
    metaKey: keyof ColumnSchema;
  }[] = [
    { label: 'Min', value: min, metaKey: 'min' },
    { label: '5%', value: p5, metaKey: 'p5' },
    { label: '25%', value: p25, metaKey: 'p25' },
    { label: '50%', value: p50, metaKey: 'p50' },
    { label: '75%', value: p75, metaKey: 'p75' },
    { label: '95%', value: p95, metaKey: 'p95' },
    { label: 'Max', value: max, metaKey: 'max' },
  ];
  return (
    <TableContainer w={'100%'}>
      <Table size={'sm'} variant={'simple'}>
        <Thead>
          <Tr>
            {quantileData.map((d) => (
              <Th pr={0} pl={2} key={nanoid()} textAlign={'center'}>
                <Tooltip label={schemaMetaDescriptions[d.metaKey]}>
                  {d.label}
                </Tooltip>
              </Th>
            ))}
          </Tr>
        </Thead>
        <Tbody>
          <Tr>
            {quantileData.map((d) => {
              return (
                <Td pr={0} pl={2} key={nanoid()} textAlign={'center'}>
                  {formatColumnValueWith(d.value, formatAsAbbreviatedNumber)}
                </Td>
              );
            })}
          </Tr>
        </Tbody>
      </Table>
    </TableContainer>
  );
}
