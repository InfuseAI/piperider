import { Flex, FlexProps, Text } from '@chakra-ui/react';
import { ColumnSchema, Comparable } from '../../../../types';
import { NO_VALUE } from '../../Columns';

interface Props extends Comparable {
  schemaType?: ColumnSchema['schema_type'];
}
export function ColumnSchemaTypeLabel({
  schemaType,
  singleOnly,
  ...props
}: Props & FlexProps) {
  return (
    <Flex {...props}>
      <Text fontSize={'sm'} noOfLines={1}>
        {schemaType || NO_VALUE}
      </Text>
    </Flex>
  );
}
