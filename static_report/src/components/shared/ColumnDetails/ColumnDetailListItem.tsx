import {
  Box,
  ChakraProps,
  Divider,
  Flex,
  Icon,
  Progress,
  Text,
} from '@chakra-ui/react';
import { ColumnSchema } from '../../../sdlc/single-report-schema';
import {
  formatColumnValueWith,
  formatIntervalMinMax,
} from '../../../utils/formatters';
import { getColumnDetails } from '../../../utils/transformers';
import { getIconForColumnType } from '../ColumnCard/ColumnCardHeader';

/**
 * Cases Affected: validsOfTotal_bar
 * 1. Both Avail
 * 2. No Base
 * 3. No Target
 * 4. Diff types
 */
interface Props {
  baseColumnDatum: ColumnSchema;
  targetColumnDatum?: ColumnSchema;
  onSelect: (arg: string) => void;
}
export function ColumnDetailListItem({
  baseColumnDatum,
  onSelect,
  ...props
}: Props & ChakraProps) {
  const { icon, backgroundColor } = getIconForColumnType(baseColumnDatum);
  const { validsOfTotal } = getColumnDetails(baseColumnDatum);
  const validsPercentValue = Number(validsOfTotal) * 100;

  return (
    <>
      <Flex
        justifyContent={'space-between'}
        alignItems={'center'}
        cursor={'pointer'}
        onClick={() => onSelect(baseColumnDatum.name)}
        _hover={{ bgColor: 'blackAlpha.50' }}
        {...props}
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
          <Text noOfLines={1} width={'14em'} fontSize={'sm'}>
            {baseColumnDatum.name}
          </Text>
        </Flex>
        <Box width={'100%'}>
          <Progress value={validsPercentValue} />
          <Flex justifyContent={'space-between'}>
            <Text fontSize={'xs'} mr={2}>
              {formatColumnValueWith(validsOfTotal, formatIntervalMinMax)}
            </Text>
            <Text fontSize={'xs'} color={'gray.600'}>
              Valid
            </Text>
          </Flex>
        </Box>
      </Flex>
      <Divider />
    </>
  );
}
