import { InfoIcon } from '@chakra-ui/icons';
import { ChakraProps, Flex, Icon, Text, Tooltip } from '@chakra-ui/react';
import { ColumnSchema } from '../../../sdlc/single-report-schema';
import { getIconForColumnType } from '../../../utils/transformers';
import { SRTooltip } from '../../SingleReport/SRTooltip';

type Props = { columnDatum: ColumnSchema };
export function ColumnCardHeader({
  columnDatum,
  ...props
}: Props & ChakraProps) {
  const { description, name, schema_type } = columnDatum;
  const { backgroundColor, icon } = getIconForColumnType(columnDatum);
  return (
    <Flex
      py={2}
      px={2}
      bg={'white'}
      justify={'space-between'}
      alignItems={'center'}
      width={'100%'}
      maxHeight={'3em'}
      borderTopRadius={'inherit'}
      {...props}
    >
      <Flex alignItems={'center'}>
        <Tooltip label={schema_type} shouldWrapChildren={true}>
          <Icon
            mt={1}
            mx={2}
            p={1}
            rounded={'md'}
            color={'white'}
            backgroundColor={backgroundColor}
            as={icon}
            boxSize={7}
          />
        </Tooltip>
        <Text
          as={'span'}
          fontSize={'xl'}
          fontWeight={'semibold'}
          noOfLines={1}
          width={280}
        >
          {name}
        </Text>
      </Flex>
      <SRTooltip label={description} prefix={' - via '}>
        <InfoIcon color="gray.400" boxSize={'20px'} mr={3} />
      </SRTooltip>
    </Flex>
  );
}
