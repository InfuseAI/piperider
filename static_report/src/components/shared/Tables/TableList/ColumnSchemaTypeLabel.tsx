import { Flex, FlexProps, Text } from '@chakra-ui/react';
import { ColumnSchema } from '../../../../types';
import { NO_VALUE } from '../../Columns';

interface Props {
  schemaType?: ColumnSchema['schema_type'];
}
export function ColumnSchemaTypeLabel({
  schemaType,
  ...props
}: Props & FlexProps) {
  return (
    <Flex {...props}>
      <Text fontSize={'sm'} color={'gray.500'} noOfLines={1}>
        {schemaType || NO_VALUE}
      </Text>
    </Flex>
  );
}
