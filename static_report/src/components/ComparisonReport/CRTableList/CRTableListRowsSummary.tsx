import { Flex, Text, Icon } from '@chakra-ui/react';
import {
  FiArrowUpCircle,
  FiArrowDownCircle,
  FiArrowRight,
} from 'react-icons/fi';

export function CRTableListRowsSummary({
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
        <Icon as={FiArrowRight} />
        <Text as="span">{target}</Text>
      </Flex>
    );
  }

  return (
    <Flex gap={1} color="black">
      <Text as="span">{base}</Text>
      <Icon as={FiArrowRight} />
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
