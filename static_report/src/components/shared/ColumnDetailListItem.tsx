import {
  ChakraProps,
  Divider,
  Flex,
  Icon,
  Progress,
  Text,
} from '@chakra-ui/react';
import { ColumnSchema } from '../../sdlc/single-report-schema';
import { getColumnDetails } from '../../utils/transformers';
import { getIconForColumnType } from './ColumnCard/ColumnCardHeader';

interface Props {
  datum: ColumnSchema;
}
export function ColumnDetailListItem({ datum, ...props }: Props & ChakraProps) {
  const { icon, backgroundColor } = getIconForColumnType(datum);
  const { validsOfTotal } = getColumnDetails(datum);
  const progressValue = Number(validsOfTotal) * 100;

  return (
    <>
      <Flex
        justifyContent={'space-between'}
        alignItems={'center'}
        {...props}
        _hover={{ bgColor: 'blackAlpha.50' }}
        cursor={'pointer'}
      >
        <Flex alignItems={'center'}>
          <Icon
            mx={2}
            p={1}
            rounded={'md'}
            color={'white'}
            backgroundColor={backgroundColor}
            as={icon}
            boxSize={5}
          />
          <Text noOfLines={1} width={'10em'}>
            {datum.name}
          </Text>
        </Flex>
        <Progress value={progressValue} width={'100%'} />
      </Flex>
      <Divider />
    </>
  );
}
