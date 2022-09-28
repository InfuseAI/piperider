import { Flex, Text, Icon } from '@chakra-ui/react';
import { FiArrowRight } from 'react-icons/fi';
import { NO_VALUE } from '../../Columns';

interface Props {
  baseCount?: number;
  targetCount?: number;
}
export function TableRowColDeltaSummary({ baseCount, targetCount }: Props) {
  if (baseCount === targetCount) {
    return (
      <Flex alignItems="center" gap={1}>
        <Text as="span">{baseCount ?? NO_VALUE}</Text>
        <Icon as={FiArrowRight} />
        <Text as="span">{targetCount ?? NO_VALUE}</Text>
      </Flex>
    );
  }

  return (
    <Flex gap={1} alignItems="center" color="black">
      <Text as="span">{baseCount ?? NO_VALUE}</Text>
      <Icon as={FiArrowRight} />
      <Flex alignItems="center">
        <Text as="span">{targetCount ?? NO_VALUE}</Text>
      </Flex>
    </Flex>
  );
}
