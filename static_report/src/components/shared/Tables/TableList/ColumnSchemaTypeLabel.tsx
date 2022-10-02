import { Badge, Flex, FlexProps, Icon, Text, Tooltip } from '@chakra-ui/react';
import { FiArrowRight } from 'react-icons/fi';
import { ColumnSchema, Comparable } from '../../../../types';
import { NO_VALUE } from '../../Columns';

interface Props extends Comparable {
  baseSchemaType?: ColumnSchema['schema_type'];
  targetSchemaType?: ColumnSchema['schema_type'];
  isAsymmetricCol?: boolean;
}
export function ColumnSchemaTypeLabel({
  baseSchemaType,
  targetSchemaType,
  isAsymmetricCol,
  singleOnly,
  ...props
}: Props & FlexProps) {
  const labelContent = (
    <Flex alignItems={'center'} {...props}>
      <Text noOfLines={1}>{baseSchemaType || NO_VALUE}</Text>
      {!singleOnly && (
        <>
          <Icon as={FiArrowRight} mx={2} />
          <Text noOfLines={1}>{targetSchemaType || NO_VALUE}</Text>
        </>
      )}
    </Flex>
  );
  return (
    <Tooltip label={labelContent} noOfLines={1}>
      <Badge
        colorScheme={isAsymmetricCol ? 'red' : 'gray'}
        px={2}
        color={isAsymmetricCol ? 'red' : 'gray.600'}
      >
        {labelContent}
      </Badge>
    </Tooltip>
  );
}
