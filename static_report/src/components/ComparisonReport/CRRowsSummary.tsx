import { Flex, Text, Icon } from '@chakra-ui/react';
import { FiArrowUpCircle, FiArrowDownCircle } from 'react-icons/fi';

export function CRRowsSummary({
  base,
  target,
}: {
  base: number;
  target: number;
}) {
  if (base === target) {
    return (
      <Flex alignItems="center" gap={1}>
        <Text as="span">{base}</Text>
        <Text as="span">{'->'}</Text>
        <Text as="span">{target}</Text>
      </Flex>
    );
  }

  return (
    <Flex gap={1} color="black">
      <Text as="span">{base}</Text>
      <Text as="span">{'->'}</Text>
      <Flex alignItems="center">
        <Icon
          as={base < target ? FiArrowUpCircle : FiArrowDownCircle}
          mr={1}
          boxSize={5}
        />
        <Text as="span">{target}</Text>
      </Flex>
    </Flex>
  );
}
