import React from 'react';
import { Code, Flex, Text } from '@chakra-ui/react';
import { formatNumber, getMissingValue } from '../../utils';
import { MetricsInfo } from '../shared/MetrisInfo';
import { SingleReportSchema } from '../../sdlc/single-report-schema';

// Temp Typing
type SRTableColumnDetailsProps = {
  column: SingleReportSchema['tables']['ACTION']['columns']['DATE'];
  hasNoNull: boolean;
};
export const SRTableColumnDetails: React.FC<SRTableColumnDetailsProps> = ({
  column,
  hasNoNull,
}) => {
  const { non_nulls, total, mismatched } = column;

  const mismatch = mismatched || 0;
  const valid = non_nulls - mismatch;
  const missing = total - non_nulls;

  const validOfTotal = valid / total;
  const mismatchOfTotal = mismatch / total;
  const missingOfTotal = missing / total;

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

      <Flex mt={12} width="100%" justifyContent="center" alignItems="stretch">
        <MetricsInfo name="Total" base={formatNumber(column.total)} />

        <MetricsInfo
          name="Missing"
          base={
            <Text as="span" color={hasNoNull ? 'green.500' : 'red.500'}>
              {hasNoNull ? '0%' : getMissingValue(column)}
            </Text>
          }
        />

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
          input={formatNumber(missingOfTotal, 'en-US', { style: 'percent' })}
        />
      </Flex>
    </Flex>
  );
};
