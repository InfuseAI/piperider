import { Flex, Text } from '@chakra-ui/react';

interface Props {
  name: string;
  base: string | number;
  target?: string | number;
  baseWidth?: string;
  targetWidth?: string;
}

export function MetricsInfo({
  name,
  base,
  target = null,
  baseWidth = '100px',
  targetWidth = '100px',
}: Props) {
  console.log(name, base, target);

  return (
    <Flex justifyContent="space-between">
      <Text fontWeight={700}>{name}</Text>
      <Flex gap={{ lg: 5, md: 1 }}>
        <Text textAlign="right" width={baseWidth} noOfLines={1}>
          {base}
        </Text>

        {target && (
          <Text textAlign="right" width={targetWidth}>
            {target}
          </Text>
        )}
      </Flex>
    </Flex>
  );
}
