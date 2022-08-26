import { Flex, Text, Icon } from '@chakra-ui/react';
import {
  FiArrowUpCircle,
  FiArrowDownCircle,
  FiArrowRight,
} from 'react-icons/fi';

export function CRTableListRowsSummary({
  baseCount,
  targetCount,
}: {
  baseCount: number;
  targetCount: number;
}) {
  if (baseCount === targetCount) {
    return (
      <Flex alignItems="center" gap={1}>
        <Text as="span">{baseCount}</Text>
        <Icon as={FiArrowRight} />
        <Text as="span">{targetCount}</Text>
      </Flex>
    );
  }

  return (
    <Flex gap={1} color="black">
      <Text as="span">{baseCount}</Text>
      <Icon as={FiArrowRight} />
      <Flex alignItems="center">
        <Icon
          as={baseCount < targetCount ? FiArrowUpCircle : FiArrowDownCircle}
          mr={1}
          boxSize={5}
        />
        <Text as="span">{targetCount}</Text>
      </Flex>
    </Flex>
  );
}
