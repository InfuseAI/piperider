import {
  ColorProps,
  Flex,
  FlexProps,
  Icon,
  Text,
  Tooltip,
} from '@chakra-ui/react';
import { FiCornerDownRight } from 'react-icons/fi';
import { NO_VALUE } from '../../Columns';

interface Props {
  name?: string;
  icon: any;
  iconColor?: ColorProps['color'];
}
export function ColumnName({
  name,
  icon,
  iconColor = 'piperider.500',
  ...props
}: Props & FlexProps) {
  return (
    <Flex alignItems="center" {...props}>
      <Icon as={FiCornerDownRight} color="gray.300" boxSize={5} />
      <Icon as={icon} color={iconColor} mx={2} boxSize={5} />
      <Tooltip label={name}>
        <Text noOfLines={1} mr={1}>
          {name || NO_VALUE}
        </Text>
      </Tooltip>
    </Flex>
  );
}
