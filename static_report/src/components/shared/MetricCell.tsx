import { Flex, Text } from '@chakra-ui/react';

type Props = {
  label: string;
  value: string | number;
  subvalue?: string | number;
};
export const MetricCell: React.FC<Props> = ({ label, value, subvalue }) => {
  return (
    <Flex direction={'column'} w={'100%'} mx={2} my={2}>
      <Text fontSize={'small'}>{label}</Text>
      <Text fontWeight={'bold'}>{value}</Text>
      {subvalue && <Text fontSize={'smaller'}>{subvalue}</Text>}
    </Flex>
  );
};
