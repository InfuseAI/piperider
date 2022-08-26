import { Flex, Text, Icon } from '@chakra-ui/react';
import {
  FiArrowUpCircle,
  FiArrowDownCircle,
  FiArrowRight,
} from 'react-icons/fi';

export function CRTableListColumnsSummary({
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
    <Flex alignItems="center">
      <Text as="span">{baseCount}</Text>
      <Icon as={FiArrowRight} />
      <Icon
        as={baseCount < targetCount ? FiArrowUpCircle : FiArrowDownCircle}
        ml={2}
        mr={1}
        boxSize={5}
      />
      <Text as="span">{targetCount}</Text>
    </Flex>
  );
}
