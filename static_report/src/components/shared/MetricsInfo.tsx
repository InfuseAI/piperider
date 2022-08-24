import { ChakraProps, Flex, Text, Tooltip } from '@chakra-ui/react';
import { schemaMetaDescriptions } from '../../sdlc/schema-meta';
import { ColumnSchema } from '../../sdlc/single-report-schema';

interface Props {
  name: string;
  firstSlot?: string | number;
  secondSlot?: string | number | null;
  firstSlotWidth?: string;
  secondSlotWidth?: string;
  metakey?: keyof ColumnSchema;
}
export function MetricsInfo({
  name,
  firstSlot,
  secondSlot,
  firstSlotWidth = '100px',
  secondSlotWidth = '100px',
  metakey,
  ...props
}: Props & ChakraProps) {
  const metaDescription = schemaMetaDescriptions[metakey || ''];
  const { width } = props;
  return (
    <Flex>
      <Tooltip
        label={metaDescription}
        isDisabled={!Boolean(metaDescription)}
        placement={'top'}
      >
        <Text width={width || '5em'} fontWeight={700}>
          {name}
        </Text>
      </Tooltip>
      <Flex gap={{ lg: 5, md: 1 }}>
        <Text textAlign="right" width={firstSlotWidth} noOfLines={1}>
          {firstSlot}
        </Text>

        {secondSlot && (
          <Text textAlign="right" width={secondSlotWidth}>
            {secondSlot}
          </Text>
        )}
      </Flex>
    </Flex>
  );
}
