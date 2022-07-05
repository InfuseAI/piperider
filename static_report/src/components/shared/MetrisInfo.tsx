import { Flex, Text } from '@chakra-ui/react';

interface Props {
  name: string;
  base: string | number;
  input?: string | number;
  baseWidth?: string;
  inputWidth?: string;
}

export function MetricsInfo({
  name,
  base,
  input = null,
  baseWidth = '100px',
  inputWidth = '100px',
}: Props) {
  return (
    <Flex justifyContent="space-between">
      <Text fontWeight={700}>{name}</Text>
      <Flex gap={{ lg: 5, md: 1 }}>
        <Text textAlign="right" width={baseWidth} noOfLines={1}>
          {base}
        </Text>

        {input && (
          <Text textAlign="right" width={inputWidth}>
            {input}
          </Text>
        )}
      </Flex>
    </Flex>
  );
}
