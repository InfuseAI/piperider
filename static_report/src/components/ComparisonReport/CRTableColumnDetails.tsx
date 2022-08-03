import { Code, Flex, Text } from '@chakra-ui/react';
import { ColumnSchema } from '../../sdlc/single-report-schema';
import { ZColSchema, zReport } from '../../types';
import { GeneralTableColumn } from '../shared/GeneralTableColumn';
import { MetricsInfo } from '../shared/MetrisInfo';
import { NumericTableColumn } from '../shared/NumericTableColumn';

// props made optional as they can be undefined
type CRTableColumnDetailsProps = {
  column?: ColumnSchema;
  baseColumn?: ColumnSchema;
  targetColumn?: ColumnSchema;
};
export const CRTableColumnDetails = ({
  column,
  baseColumn,
  targetColumn,
}: CRTableColumnDetailsProps) => {
  const emptyLabel = '-';
  zReport(ZColSchema.safeParse(column));
  zReport(ZColSchema.safeParse(baseColumn));
  zReport(ZColSchema.safeParse(targetColumn));

  return (
    <Flex direction="column" gap={2} minH="250px">
      <Flex direction="column" gap={3}>
        <Flex justifyContent="space-between">
          <Text maxWidth="calc(100% - 250px)">
            <Text
              as="span"
              fontWeight={700}
              color="gray.900"
              fontSize="lg"
              mr={1}
              noOfLines={1}
              title={column.name}
            >
              {column.name}
            </Text>
            {''}(<Code>{column.schema_type}</Code>)
          </Text>

          <Flex gap={8}>
            <Text fontWeight={700} textAlign="right" width="100px">
              Base
            </Text>
            <Text fontWeight={700} textAlign="right" width="100px">
              Target
            </Text>
          </Flex>
        </Flex>

        <Flex direction="column" mt={3}>
          {/* Case: Cast provided undefined to null */}
          <GeneralTableColumn
            targetColumn={targetColumn || null}
            baseColumn={baseColumn}
          />
        </Flex>
        {column.type === 'numeric' && (
          <>
            <NumericTableColumn
              baseColumn={baseColumn}
              targetColumn={targetColumn}
            />
          </>
        )}

        {column.type === 'datetime' && (
          <Flex direction="column">
            <MetricsInfo
              name="Min"
              firstSlot={baseColumn?.min ?? emptyLabel}
              secondSlot={targetColumn?.min ?? emptyLabel}
            />
            <MetricsInfo
              name="Max"
              firstSlot={baseColumn?.max ?? emptyLabel}
              secondSlot={targetColumn?.max ?? emptyLabel}
            />
          </Flex>
        )}
      </Flex>
    </Flex>
  );
};
