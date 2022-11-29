import {
  Heading,
  Flex,
  Icon,
  Box,
  Text,
  BoxProps,
  ColorProps,
  Tooltip,
} from '@chakra-ui/react';
import { FiGrid, FiInfo } from 'react-icons/fi';
import { IconType } from 'react-icons/lib';
import { NO_VALUE } from '../Columns';
import { NO_DESCRIPTION_MSG } from '../Layouts/constant';
interface Props {
  title?: string;
  subtitle?: string;
  infoTip?: string;
  iconColor?: ColorProps['color'];
  icon?: IconType;
}
export function TableColumnHeader({
  title = NO_VALUE,
  subtitle = NO_VALUE,
  infoTip = NO_DESCRIPTION_MSG,
  iconColor = 'piperider.500',
  icon = FiGrid,
  ...props
}: Props & BoxProps) {
  return (
    <Box {...props}>
      <Text color="gray.500">{subtitle}</Text>
      <Flex alignItems="center" my={2} gap={2}>
        <Icon rounded={'md'} color={iconColor} as={icon} boxSize={6} />
        <Heading fontSize={24}>{title || NO_VALUE}</Heading>
        <Tooltip
          shouldWrapChildren
          label={infoTip || NO_VALUE}
          placement={'right'}
        >
          <Icon as={FiInfo} boxSize={5} mt={1} color={'gray.400'} />
        </Tooltip>
      </Flex>
    </Box>
  );
}
