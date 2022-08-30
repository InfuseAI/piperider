import { Flex, Text, Icon } from '@chakra-ui/react';
import {
  FiArrowUpCircle,
  FiArrowDownCircle,
  FiArrowRight,
} from 'react-icons/fi';

export function CRTableListColumnsSummary({
  baseCount = 0,
  targetCount = 0,
}: {
  baseCount?: number;
  targetCount?: number;
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
    <Flex gap={1} alignItems="center" color="black">
      <Text as="span">{baseCount}</Text>
      <Icon as={FiArrowRight} />
      <Icon
        as={baseCount < targetCount ? FiArrowUpCircle : FiArrowDownCircle}
        mr={1}
        boxSize={5}
      />
      <Text as="span">{targetCount}</Text>
    </Flex>
  );
}
