import { Flex, Text } from '@chakra-ui/react';

interface Props {
  name: string;
  firstSlot?: string | number;
  secondSlot?: string | number | null;
  firstSlotWidth?: string;
  secondSlotWidth?: string;
}

export function MetricsInfo({
  name,
  firstSlot,
  secondSlot,
  firstSlotWidth = '100px',
  secondSlotWidth = '100px',
}: Props) {
  return (
    <Flex justifyContent="space-between">
      <Text fontWeight={700}>{name}</Text>
      <Flex gap={{ lg: 5, md: 1 }}>
        <Text textAlign="right" width={firstSlotWidth} noOfLines={1}>
          {firstSlot}
        </Text>

        {secondSlot && (
          <Text textAlign="right" width={secondSlotWidth}>
            {secondSlot}
          </Text>
        )}
      </Flex>
    </Flex>
  );
}
