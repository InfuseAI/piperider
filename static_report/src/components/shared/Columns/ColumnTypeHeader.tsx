import { InfoIcon } from '@chakra-ui/icons';

import { Flex, FlexProps, Icon, Text, Tooltip } from '@chakra-ui/react';
import type { ColumnSchema } from '../../../sdlc/single-report-schema';
import { getIconForColumnType } from './utils';

interface Props extends FlexProps {
  columnDatum?: ColumnSchema;
}

export function ColumnTypeHeader({ columnDatum, ...props }: Props) {
  const { description, name, schema_type } = columnDatum || {};
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
      <SourceTooltip label={description} prefix={' - via '}>
        <InfoIcon color="gray.400" boxSize={'20px'} mr={3} />
      </SourceTooltip>
    </Flex>
  );
}

function SourceTooltip({
  label = '',
  prefix,
  children,
  ...props
}: { label?: string; prefix: string } & {
  children: React.ReactNode;
  [k: string]: any;
}) {
  const match = label.match(`${prefix}(?<src>\\w+)$`);
  const richLabel = match?.groups?.src ? (
    <Text>
      {label.slice(0, match.index)}
      <Text as="i" color="gray.400">
        {`${prefix}${match.groups.src}`}
      </Text>
    </Text>
  ) : (
    label
  );

  return (
    <Tooltip label={richLabel} {...props} closeOnEsc={true}>
      {children}
    </Tooltip>
  );
}
