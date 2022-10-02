import {
  Heading,
  Flex,
  Icon,
  Box,
  Text,
  BoxProps,
  ColorProps,
} from '@chakra-ui/react';
import { FiGrid } from 'react-icons/fi';
import { IconType } from 'react-icons/lib';
import { NO_VALUE } from '../Columns';
interface Props {
  title?: string;
  subtitle?: string;
  iconColor?: ColorProps['color'];
  icon?: IconType;
}
export function TableColumnHeader({
  title = NO_VALUE,
  subtitle = NO_VALUE,
  iconColor = 'piperider.500',
  icon = FiGrid,
  ...props
}: Props & BoxProps) {
  return (
    <Box {...props}>
      <Text color="gray.500">{subtitle}</Text>
      <Flex alignItems="center">
        <Icon
          mt={1}
          mr={2}
          rounded={'md'}
          color={iconColor}
          as={icon}
          boxSize={6}
        />
        <Heading fontSize={24}>{title || NO_VALUE}</Heading>
      </Flex>
    </Box>
  );
}
