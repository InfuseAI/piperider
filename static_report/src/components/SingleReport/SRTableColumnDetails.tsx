import { Code, Flex, Text } from '@chakra-ui/react';
import { MetricsInfo } from '../shared/MetrisInfo';
import { SingleReportSchema } from '../../sdlc/single-report-schema';
import { formatNumber, getColumnDetails, getMissingValue } from '../../utils';

// FIXME: Temp Typing
type SRTableColumnDetailsProps = {
  column: SingleReportSchema['tables']['ACTION']['columns'];
};

export const SRTableColumnDetails = ({ column }: SRTableColumnDetailsProps) => {
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
          title={column.name as string}
          noOfLines={1}
        >
          {column.name as string}
        </Text>
        {''}(<Code>{column.schema_type as string}</Code>)
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
          input={getMissingValue(column as any)}
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
