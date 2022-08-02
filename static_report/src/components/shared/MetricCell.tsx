import { Flex, Text, Tooltip } from '@chakra-ui/react';
import { InfoIcon } from '@chakra-ui/icons';
import { schemaMetaDescriptions } from '../../sdlc/schema-meta';
import { ColumnSchema } from '../../sdlc/single-report-schema';

type Props = {
  label: string;
  value: string | number;
  subvalue?: string | number;
  metaKey?: keyof ColumnSchema;
};
export const MetricCell: React.FC<Props> = ({
  label,
  value,
  subvalue,
  metaKey,
}) => {
  const metaDescription = schemaMetaDescriptions[metaKey];

  return (
    <Flex direction={'column'} w={'100%'} mx={2} my={2}>
      <Tooltip
        label={metaDescription}
        isDisabled={!Boolean(metaDescription)}
        placement={'top'}
      >
        <Flex alignItems={'center'}>
          <InfoIcon color="gray.400" boxSize={'12px'} mr={3} />
          <Text fontSize={'small'}>{label}</Text>
        </Flex>
      </Tooltip>
      <Text fontWeight={'bold'}>{value}</Text>
      {subvalue && <Text fontSize={'smaller'}>{subvalue}</Text>}
    </Flex>
  );
};

//TODO: add tooltip, if ref metadata exists
