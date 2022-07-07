import { Box, Code, Flex, Text, Tooltip } from '@chakra-ui/react';
import { MetricsInfo } from '../shared/MetrisInfo';
import {
  formatNumber,
  getColumnDetails,
  formatIntervalMinMax,
  getSRCommonMetrics,
} from '../../utils';
import { ColumnSchema } from '../../sdlc/single-report-schema';
import { InfoOutlineIcon } from '@chakra-ui/icons';

type SRTableColumnDetailsProps = {
  column: ColumnSchema;
};

export const SRTableColumnDetails = ({ column }: SRTableColumnDetailsProps) => {
  const {
    mismatch,
    mismatchOfTotal,
    missing,
    missingOfTotal,
    valid,
    validOfTotal,
    totalOfTotal,
  } = getColumnDetails(column);
  return (
    <Flex direction="column" gap={3}>
      <Box maxWidth="100%">
        <Flex>
          <Text
            as="span"
            fontWeight={700}
            color="gray.900"
            fontSize="lg"
            mr={1}
            title={column.name as string}
            noOfLines={1}
          >
            {column.name as string}
          </Text>
          <Tooltip
            label={(column.description as string) || ''}
            placement="right-end"
          >
            <InfoOutlineIcon m={'auto 0'} />
          </Tooltip>
        </Flex>
        {''}(<Code>{column.schema_type as string}</Code>)
      </Box>

      <Flex direction="column" mt={3}>
        <MetricsInfo
          name="Total"
          base={formatNumber(column.total)}
          input={formatIntervalMinMax(totalOfTotal)}
        />
        <MetricsInfo
          name="Valid"
          base={formatNumber(valid)}
          input={formatIntervalMinMax(validOfTotal)}
        />
        <MetricsInfo
          name="Mismatched"
          base={formatNumber(mismatch)}
          input={formatIntervalMinMax(mismatchOfTotal)}
        />
        <MetricsInfo
          name="Missing"
          base={formatNumber(missing)}
          input={formatIntervalMinMax(missingOfTotal)}
        />
        <MetricsInfo
          name="Distinct"
          base={formatNumber(column.distinct as number)}
        />
      </Flex>

      {column.type === 'string' && (
        <Flex direction="column">
          <MetricsInfo
            name="Most common"
            base={getSRCommonMetrics(column)}
            baseWidth={'200px'}
          />
        </Flex>
      )}

      {column.type === 'numeric' && (
        <Flex direction="column">
          <MetricsInfo name="Min" base={formatNumber(column.min as number)} />

          <MetricsInfo name="Max" base={formatNumber(column.max as number)} />

          <MetricsInfo name="Avg" base={formatNumber(column.avg as number)} />
        </Flex>
      )}

      {column.type === 'datetime' && (
        <Flex direction="column">
          <MetricsInfo name="Min" base={column.min as number} />

          <MetricsInfo name="Max" base={column.max as number} />
        </Flex>
      )}
    </Flex>
  );
};
