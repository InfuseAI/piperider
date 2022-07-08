import { Code, Flex, Text } from '@chakra-ui/react';
import { ColumnSchema } from '../../sdlc/single-report-schema';
import { GeneralTableColumn } from '../shared/GeneralTableColumn';
import { MetricsInfo } from '../shared/MetrisInfo';
import { NumericTableColumn } from '../shared/NumericTableColumn';

// props made optional as they can be undefined
type CRTableColumnDetailsProps = {
  column?: ColumnSchema;
  baseColumn?: ColumnSchema;
  inputColumn?: ColumnSchema;
};
export const CRTableColumnDetails = ({
  column,
  baseColumn,
  inputColumn,
}: CRTableColumnDetailsProps) => {
  const emptyLabel = '-';

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
              Input
            </Text>
          </Flex>
        </Flex>

        <Flex direction="column" mt={3}>
          <GeneralTableColumn
            inputColumn={inputColumn}
            baseColumn={baseColumn}
          />
        </Flex>
        {column.type === 'numeric' && (
          <>
            <NumericTableColumn
              baseColumn={baseColumn}
              inputColumn={inputColumn}
            />
          </>
        )}

        {column.type === 'datetime' && (
          <Flex direction="column">
            <MetricsInfo
              name="Min"
              base={(baseColumn?.min as string | number) ?? emptyLabel}
              input={(inputColumn?.min as string | number) ?? emptyLabel}
            />
            <MetricsInfo
              name="Max"
              base={(baseColumn?.max as string | number) ?? emptyLabel}
              input={(inputColumn?.max as string | number) ?? emptyLabel}
            />
          </Flex>
        )}
      </Flex>
    </Flex>
  );
};
