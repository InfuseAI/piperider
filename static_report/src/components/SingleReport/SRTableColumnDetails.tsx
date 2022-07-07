import { Box, Code, Flex, Text, Tooltip } from '@chakra-ui/react';
import { InfoOutlineIcon } from '@chakra-ui/icons';
import { MetricsInfo } from '../shared/MetrisInfo';
import { SingleReportSchema } from '../../sdlc/single-report-schema';
import {
  formatNumber,
  getColumnDetails,
  getMissingValue,
  getSRCommonMetrics,
} from '../../utils';

// FIXME: Temp Typing
type SRTableColumnDetailsProps = {
  column: SingleReportSchema['tables']['ACTION']['columns'];
};

export const SRTableColumnDetails = ({ column }: SRTableColumnDetailsProps) => {
  const { mismatch, mismatchOfTotal, missing, valid, validOfTotal } =
    getColumnDetails(column);

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

      <Flex direction="column">
        <MetricsInfo name="Total" base={formatNumber(column.total as number)} />
      </Flex>

      <Flex direction="column" mt={3}>
        <MetricsInfo
          name="Valid"
          base={valid}
          input={formatNumber(validOfTotal, 'en-US', { style: 'percent' })}
        />
        <MetricsInfo
          name="Mismatched"
          base={mismatch}
          input={formatNumber(mismatchOfTotal, 'en-US', { style: 'percent' })}
        />
        <MetricsInfo
          name="Missing"
          base={missing}
          input={getMissingValue(column as any)}
        />
      </Flex>

      <Flex direction="column" mt={3}>
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
