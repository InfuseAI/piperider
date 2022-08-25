import { Text, Icon } from '@chakra-ui/react';
import {
  FiArrowUpCircle,
  FiArrowDownCircle,
  FiArrowRight,
} from 'react-icons/fi';

export function CRColumnsSummary({
  base,
  target,
}: {
  base: number;
  target: number;
}) {
  if (base === target) {
    return (
      <>
        <Text as="span">{base}</Text>
        <Icon as={FiArrowRight} />
        <Text as="span">{target}</Text>
      </>
    );
  }

  return (
    <>
      <Text as="span">{base}</Text>
      <Icon as={FiArrowRight} />
      <Icon
        as={base < target ? FiArrowUpCircle : FiArrowDownCircle}
        ml={2}
        mr={1}
        boxSize={5}
      />
      <Text as="span">{target}</Text>
    </>
  );
}
