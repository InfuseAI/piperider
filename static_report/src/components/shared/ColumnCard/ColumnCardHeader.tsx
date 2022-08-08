import { ColorProps, Flex, Icon, Text, Tooltip } from '@chakra-ui/react';
import { InfoIcon } from '@chakra-ui/icons';
import { AiOutlineFileText } from 'react-icons/ai';
import { BiText, BiQuestionMark } from 'react-icons/bi';
import { BsCalendarDate } from 'react-icons/bs';
import { VscSymbolOperator } from 'react-icons/vsc';
import { TbCircleHalf, TbCircles } from 'react-icons/tb';
import { TiSortNumerically } from 'react-icons/ti';
import { ColumnSchema } from '../../../sdlc/single-report-schema';
import { formatTruncateString } from '../../../utils/formatters';
import { checkColumnCategorical } from '../../../utils/transformers';
import { SRTooltip } from '../../SingleReport/SRTooltip';

type Props = { columnDatum: ColumnSchema };
export function ColumnCardHeader({ columnDatum }: Props) {
  const { description, name, schema_type } = columnDatum;
  const { backgroundColor, icon } = getIconForColumnType(columnDatum);
  return (
    <Flex
      p={2}
      bg={'white'}
      justify={'space-between'}
      alignItems={'center'}
      width={'100%'}
      borderTopRadius={'inherit'}
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
        <Text fontWeight={'semibold'} fontSize={'3xl'}>
          {formatTruncateString(name, 10)}
        </Text>
      </Flex>
      <SRTooltip label={description} prefix={' - via '}>
        <InfoIcon color="gray.400" boxSize={'20px'} mr={3} />
      </SRTooltip>
    </Flex>
  );
}

function getIconForColumnType(columnDatum: ColumnSchema): {
  backgroundColor: ColorProps['color'];
  icon: any; //IconType not provided
} {
  const { type } = columnDatum;
  const isCategorical = checkColumnCategorical(columnDatum);

  if (isCategorical && type === 'string') {
    return {
      backgroundColor: 'purple.500',
      icon: TbCircles,
    };
  }
  if (isCategorical && type === 'integer') {
    return { backgroundColor: 'orange.500', icon: TiSortNumerically };
  }
  if (type === 'string') {
    return { backgroundColor: 'blue.500', icon: BiText };
  }
  if (type === 'numeric' || type === 'integer') {
    return { backgroundColor: 'red.500', icon: VscSymbolOperator };
  }
  if (type === 'datetime') {
    return { backgroundColor: 'teal.500', icon: BsCalendarDate };
  }
  if (type === 'boolean') {
    return { backgroundColor: 'pink.500', icon: TbCircleHalf };
  }
  if (type === 'other') {
    return { backgroundColor: 'limegreen', icon: AiOutlineFileText };
  }
  return { backgroundColor: 'gray.500', icon: BiQuestionMark };
}
