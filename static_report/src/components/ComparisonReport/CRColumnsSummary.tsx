import { Text, Icon } from '@chakra-ui/react';
import { FiArrowUpCircle, FiArrowDownCircle } from 'react-icons/fi';

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
        <Text as="span">{'->'}</Text>
        <Text as="span">{target}</Text>
      </>
    );
  }

  return (
    <>
      <Text as="span">{base}</Text>
      <Text as="span">{'->'}</Text>
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
