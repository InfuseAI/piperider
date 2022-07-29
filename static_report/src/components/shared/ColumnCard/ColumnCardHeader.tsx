import { InfoIcon } from '@chakra-ui/icons';
import { Flex, Text } from '@chakra-ui/react';
import { formatTruncateString } from '../../../utils/formatters';
import { SRTooltip } from '../../SingleReport/SRTooltip';

type Props = { title: string; description: string };
export function ColumnCardHeader({ title, description }: Props) {
  return (
    <Flex
      p={2}
      bg={'white'}
      justify={'space-between'}
      alignItems={'center'}
      width={'100%'}
      borderTopRadius={'inherit'}
    >
      <Text fontWeight={'semibold'} fontSize={'3xl'}>
        {formatTruncateString(title, 15)}
      </Text>
      <SRTooltip label={description} prefix={' - via '} placement="right-end">
        <InfoIcon color="gray.400" boxSize={'20px'} mr={3} />
      </SRTooltip>
    </Flex>
  );
}
