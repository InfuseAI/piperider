import React from 'react';
import { Code, Flex, Text } from '@chakra-ui/react';
import { MetricsInfo } from '../shared/MetrisInfo';
import { SingleReportSchema } from '../../sdlc/single-report-schema';
import { formatNumber, getColumnDetails, getMissingValue } from '../../utils';

// Temp Typing
type SRTableColumnDetailsProps = {
  column: SingleReportSchema['tables']['ACTION']['columns']['DATE'];
};
export const SRTableColumnDetails: React.FC<SRTableColumnDetailsProps> = ({
  column,
}) => {
  const { mismatch, mismatchOfTotal, missing, valid, validOfTotal } =
    getColumnDetails(column);

  return (
    <Flex direction="column" gap={3}>
      <Text maxWidth="100%">
        <Text
          as="span"
          fontWeight={700}
          color="gray.900"
          fontSize="lg"
          mr={1}
          title={column.name}
          noOfLines={1}
        >
          {column.name}
        </Text>
        {''}(<Code>{column.schema_type}</Code>)
      </Text>

      <Flex direction="column">
        <MetricsInfo name="Total" base={formatNumber(column.total)} />
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
          input={getMissingValue(column)}
        />
      </Flex>

      <Flex direction="column" mt={3}>
        <MetricsInfo name="Distinct" base={formatNumber(column.distinct)} />
      </Flex>

      {column.type === 'numeric' && (
        <Flex direction="column">
          <MetricsInfo name="Min" base={formatNumber(column.min)} />

          <MetricsInfo name="Max" base={formatNumber(column.max)} />

          <MetricsInfo name="Avg" base={formatNumber(column.avg)} />
        </Flex>
      )}

      {column.type === 'datetime' && (
        <Flex direction="column">
          <MetricsInfo name="Min" base={column.min} />

          <MetricsInfo name="Max" base={column.max} />
        </Flex>
      )}
    </Flex>
  );
};
