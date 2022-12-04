import { FlexProps, Flex, Text, Tooltip, Square } from '@chakra-ui/react';
import { schemaMetaDescriptions } from '../../../../sdlc/schema-meta';
import {
  ColumnSchema,
  TableSchema,
} from '../../../../sdlc/single-report-schema';
import { NO_VALUE } from '../constants';

export type MetricMetaKeys =
  | keyof Pick<
      ColumnSchema,
      | 'nulls'
      | 'samples'
      | 'total'
      | 'valids'
      | 'invalids'
      | 'positives'
      | 'zeros'
      | 'negatives'
      | 'non_zero_length'
      | 'zero_length'
      | 'avg'
      | 'avg_length'
      | 'stddev'
      | 'stddev_length'
      | 'min'
      | 'min_length'
      | 'max'
      | 'max_length'
      | 'distinct'
      | 'duplicates'
      | 'sum'
    >;
export type TableMetaKeys =
  | keyof Pick<
      TableSchema,
      | 'duplicate_rows'
      | 'col_count'
      | 'freshness'
      | 'last_altered'
      | 'bytes'
      | 'created'
      | 'row_count'
      | 'samples'
      | 'row_count'
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
  showColorSquare?: boolean;
  squareColor?: string;
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
  showColorSquare,
  squareColor = 'red',
  tooltipValues,
  ...props
}: MetricsInfoProps & FlexProps) {
  const metaDescription = schemaMetaDescriptions[metakey || ''];
  const { width, ...restProps } = props;
  const isTargetNull = secondSlot === null;
  const isDateInfo =
    metakey === 'created' ||
    metakey === 'freshness' ||
    metakey === 'last_altered';

  return (
    <Flex {...restProps} alignItems={'center'}>
      {showColorSquare && <Square size={'10px'} bg={squareColor} mr={2} />}
      <Tooltip
        label={metaDescription}
        isDisabled={!Boolean(metaDescription)}
        placement={'top'}
      >
        <Text width={width || '8em'} fontWeight={700} fontSize={'sm'}>
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
          placement={'top-end'}
        >
          <Text
            textAlign="right"
            fontSize={'sm'}
            width={firstSlotWidth}
            noOfLines={isDateInfo ? 2 : 1}
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
