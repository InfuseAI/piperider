import { Text, TextProps } from '@chakra-ui/react';

interface Props extends TextProps {
  text?: string;
}

const DEFAULT_TEXT = 'No data available';

export function NoData({ text = DEFAULT_TEXT, ...props }: Props) {
  return (
    <Text mt={7} color="gray.500" {...props}>
      {text}
    </Text>
  );
}
