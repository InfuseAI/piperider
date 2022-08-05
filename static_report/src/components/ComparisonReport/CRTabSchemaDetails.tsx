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
import { NO_VALUE } from '../shared/ColumnCard/ColumnTypeDetail/constants';

type EnrichedColumnData = {
  added: number;
  deleted: number;
  changed: number;
  columns:
    | (
        | (ColumnSchema & {
            key: string;
            type: string;
            changed: boolean;
          })
        | null
      )[];
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

  //Should tally based on the change
  const deltaAdded = targetColEntries.length - baseColEntries.length;
  const addedTest = deltaAdded < 0 ? 0 : deltaAdded; // round negatives to 0
  const deltaDeleted = baseColEntries.length - targetColEntries.length;
  const deletedTest = deltaDeleted < 0 ? 0 : deltaDeleted;

  // Reduce
  const aggregateEnrichedColumns =
    combinedColEntries.reduce<EnrichedColumnData>(
      (acc, column, idx) => {
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
          ...column,
          name: column.name,
          changed: isSchemaChanged, //per schema change
        };

        return {
          ...acc,
          changed, // total schema changes
          columns: [...acc.columns, colSchemaDetail],
        } as EnrichedColumnData;
      },
      { added: addedTest, deleted: deletedTest, changed: 0, columns: [] }, //accumulator -- initial value
    );

  // UI vars
  const { added, deleted, changed, columns } = aggregateEnrichedColumns;
  const baseColumns = columns.slice(0, baseColEntries.length);
  const targetColumns = columns.slice(baseColEntries.length);

  // Equalize target columns view (fill with null comparisons)
  const equalizedBaseColumns = equalizeColumns(
    baseColumns,
    targetColumns,
    deltaAdded,
  );
  const equalizedTargetColumns = equalizeColumns(
    targetColumns,
    baseColumns,
    deltaDeleted,
  );

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
              {equalizedBaseColumns.map((column) => (
                <Tr
                  key={nanoid(10)}
                  color={column?.changed ? 'red.500' : 'inherit'}
                >
                  <Td>{column?.name ?? NO_VALUE}</Td>
                  <Td>{column?.schema_type ?? NO_VALUE}</Td>
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
              {equalizedTargetColumns.map((column) => (
                <Tr
                  key={nanoid(10)}
                  color={column?.changed ? 'red.500' : 'inherit'}
                >
                  <Td>{column?.name ?? NO_VALUE}</Td>
                  <Td>{column?.schema_type ?? NO_VALUE}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </TableContainer>
      </Flex>
    </Flex>
  );
}

function equalizeColumns(source, target, delta: number) {
  if (source.length < target.length) {
    return [...source, ...Array(delta).fill(null)];
  }
  return source;
}
