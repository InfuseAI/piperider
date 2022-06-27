import { Flex, Text } from '@chakra-ui/react';

export function MetricsInfo({ name, base, input = null }) {
  return (
    <Flex justifyContent="space-between">
      <Text fontWeight={700}>{name}</Text>
      <Flex gap={8}>
        <Text textAlign="right" width="100px">
          {base}
        </Text>

        {input && (
          <Text textAlign="right" width="100px">
            {input}
          </Text>
        )}
      </Flex>
    </Flex>
  );
}
