import {
  Flex,
  TableContainer,
  Table,
  Thead,
  Tr,
  Th,
  Tbody,
  Td,
  Divider,
  Text,
} from '@chakra-ui/react';
import { nanoid } from 'nanoid';
import { ColumnSchema, TableSchema } from '../../sdlc/single-report-schema';
import { ComparsionSource, zReport, ZTableSchema } from '../../types';

type EnrichedColumnData = {
  added: number;
  deleted: number;
  changed: number;
  columns:
    | (ColumnSchema & {
        key: string;
        type: string;
        changed: boolean;
      })[];
};
const getEnrichedColumnsFor = (
  columns: TableSchema['columns'] | undefined,
  type: ComparsionSource,
) =>
  columns
    ? Object.entries(columns).map(([key, column]) => ({
        ...column,
        key,
        type,
        changed: false,
      }))
    : [];

type Props = {
  base?: TableSchema | undefined;
  target?: TableSchema | undefined;
};
export function CRTabSchemaDetails({ base, target }: Props) {
  zReport(ZTableSchema.safeParse(base));
  zReport(ZTableSchema.safeParse(target));

  const baseColEntries = getEnrichedColumnsFor(base?.columns, 'base');
  const targetColEntries = getEnrichedColumnsFor(target?.columns, 'target');
  const combinedColEntries = [...baseColEntries, ...targetColEntries];

  const addedTest = targetColEntries.length - baseColEntries.length;
  const deletedTest = baseColEntries.length - targetColEntries.length;

  // Reduce
  const aggregateEnrichedColumns =
    combinedColEntries.reduce<EnrichedColumnData>(
      (acc, column, idx, arr) => {
        //index offsets when iterating both columns together
        const currBaseIndex =
          idx < baseColEntries.length ? idx : idx - baseColEntries.length;
        const currTargetIndex =
          idx >= baseColEntries.length ? idx : idx + baseColEntries.length;

        //cross-checks if schema type is changed
        const currBaseSchema = combinedColEntries[currBaseIndex]?.schema_type;
        const currTargetSchema =
          combinedColEntries[currTargetIndex]?.schema_type;
        const isSchemaChanged = currBaseSchema !== currTargetSchema;
        const changed = acc.changed + (isSchemaChanged ? 1 : 0);

        //write schema detail for UI rows
        const colSchemaDetail = {
          name: column.name,
          changed: isSchemaChanged, //per schema change
          ...column,
        };

        return {
          ...acc,
          changed, // total schema changes
          columns: [...acc.columns, colSchemaDetail],
        } as EnrichedColumnData;
      },
      { added: addedTest, deleted: deletedTest, changed: 0, columns: [] }, //totals -- initial value
    );

  // UI vars
  const { added, deleted, changed, columns } = aggregateEnrichedColumns;
  const baseColumns = columns.slice(0, baseColEntries.length);
  const targetColumns = columns.slice(baseColEntries.length);

  return (
    <Flex direction="column">
      <Text mb={4} p={2}>
        Added:
        <Text as={'span'} fontWeight={700} ml={1}>
          {added}
        </Text>
        , Deleted:
        <Text as={'span'} fontWeight={700} ml={1}>
          {deleted}
        </Text>
        , Changed:{' '}
        <Text as={'span'} fontWeight={700} ml={1}>
          {changed}
        </Text>
      </Text>

      <Flex justifyContent={'space-evenly'}>
        {/* Base Columns */}
        <TableContainer width="50%">
          <Table variant="simple">
            <Thead>
              <Tr>
                <Th>Column</Th>
                <Th>Type</Th>
              </Tr>
            </Thead>
            <Tbody>
              {baseColumns.map((column) => (
                <Tr
                  key={nanoid(10)}
                  color={column.changed ? 'red.500' : 'inherit'}
                >
                  <Td>{column?.name ?? '-'}</Td>
                  <Td>{column?.schema_type ?? '-'}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </TableContainer>

        <Flex justifyContent={'center'}>
          <Divider orientation={'vertical'} />
        </Flex>

        {/* Target Columns */}
        <TableContainer width="50%">
          <Table variant="simple">
            <Thead>
              <Tr>
                <Th>Column</Th>
                <Th>Type</Th>
              </Tr>
            </Thead>
            <Tbody>
              {targetColumns.map((column) => (
                <Tr
                  key={nanoid(10)}
                  color={column.changed ? 'red.500' : 'inherit'}
                >
                  <Td>{column?.name ?? '-'}</Td>
                  <Td>{column?.schema_type ?? '-'}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </TableContainer>
      </Flex>
    </Flex>
  );
}
