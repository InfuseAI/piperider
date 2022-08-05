import { Flex, Text, Tooltip } from '@chakra-ui/react';
import { InfoIcon } from '@chakra-ui/icons';
import { schemaMetaDescriptions } from '../../sdlc/schema-meta';
import { ColumnSchema } from '../../sdlc/single-report-schema';

type Props = {
  label: string;
  value?: string | number;
  subvalue?: string | number;
  metaKey?: keyof ColumnSchema;
};
export const MetricCell: React.FC<Props> = ({
  label,
  value,
  subvalue,
  metaKey,
}) => {
  const metaDescription =
    typeof metaKey === 'string' ? schemaMetaDescriptions[metaKey] : null;

  return (
    <Flex direction={'column'} w={'100%'} mx={2} my={2}>
      <Tooltip
        label={metaDescription}
        isDisabled={!Boolean(metaDescription)}
        placement={'top'}
      >
        <Flex alignItems={'center'} w={'fit-content'}>
          <Text lineHeight={'5'} fontSize={'small'}>
            {label}
          </Text>
          <InfoIcon color="gray.400" boxSize={'12px'} ml={2} />
        </Flex>
      </Tooltip>
      <Text fontWeight={'bold'}>{value}</Text>
      {subvalue && <Text fontSize={'smaller'}>{subvalue}</Text>}
    </Flex>
  );
};
