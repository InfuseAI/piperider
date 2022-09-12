import { FlexProps, Flex, Text, Tooltip } from '@chakra-ui/react';
import { schemaMetaDescriptions } from '../../../../sdlc/schema-meta';
import {
  ColumnSchema,
  TableSchema,
} from '../../../../sdlc/single-report-schema';
import { NO_VALUE } from '../constants';

export type MetricMetaKeys = keyof Pick<
  ColumnSchema,
  | 'nulls'
  | 'total'
  | 'valids'
  | 'invalids'
  | 'positives'
  | 'zeros'
  | 'negatives'
  | 'non_zero_length'
  | 'zero_length'
  | 'avg'
  | 'stddev'
  | 'min'
  | 'max'
  | 'distinct'
  | 'duplicates'
>;
export interface MetricsInfoProps {
  name: string;
  subtitle?: string;
  firstSlot?: string | number;
  secondSlot?: string | number | null;
  firstSlotWidth?: string;
  secondSlotWidth?: string;
  metakey?: keyof ColumnSchema | keyof TableSchema;
  reverse?: boolean;
  tooltipValues?: { firstSlot?: number | string; secondSlot?: number | string };
}
export function MetricsInfo({
  name,
  subtitle,
  firstSlot,
  secondSlot,
  firstSlotWidth = '100px',
  secondSlotWidth = '100px',
  metakey,
  reverse,
  tooltipValues,
  ...props
}: MetricsInfoProps & FlexProps) {
  const metaDescription = schemaMetaDescriptions[metakey || ''];
  const { width, ...restProps } = props;
  const isTargetNull = secondSlot === null;

  return (
    <Flex {...restProps}>
      <Tooltip
        label={metaDescription}
        isDisabled={!Boolean(metaDescription)}
        placement={'top'}
      >
        <Text width={width || '5em'} fontWeight={700}>
          {name}
          <Text
            ml={2}
            as={'small'}
            color={'gray.400'}
            fontSize={'sm'}
            fontWeight={'medium'}
          >
            {subtitle}
          </Text>
        </Text>
      </Tooltip>
      <Flex
        gap={{ lg: 5, md: 1 }}
        flexDirection={reverse ? 'row-reverse' : 'row'}
      >
        <Tooltip
          label={tooltipValues?.firstSlot}
          isDisabled={!Boolean(tooltipValues?.firstSlot)}
          placement={'top'}
        >
          <Text
            textAlign="right"
            fontSize={'sm'}
            width={firstSlotWidth}
            noOfLines={1}
          >
            {firstSlot || NO_VALUE}
          </Text>
        </Tooltip>

        {/* Show when target is specified as `null` */}
        {/* Hide when target is `undefined` */}
        {(secondSlot || isTargetNull) && (
          <Tooltip
            label={tooltipValues?.secondSlot}
            isDisabled={!Boolean(tooltipValues?.secondSlot)}
            placement={'top'}
          >
            <Text textAlign="right" fontSize={'sm'} width={secondSlotWidth}>
              {secondSlot || NO_VALUE}
            </Text>
          </Tooltip>
        )}
      </Flex>
    </Flex>
  );
}
