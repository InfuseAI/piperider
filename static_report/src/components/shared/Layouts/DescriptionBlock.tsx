import { Text, TextProps } from '@chakra-ui/react';
import { NO_DESCRIPTION_MSG } from './constant';

export function DescriptionBlock({
  description,
  ...textProps
}: { description?: string } & TextProps) {
  return (
    <Text
      fontSize="sm"
      border={'1px solid lightgray'}
      p={2}
      minH={'5em'}
      overflow={'auto'}
      {...textProps}
    >
      {description || NO_DESCRIPTION_MSG}
    </Text>
  );
}
