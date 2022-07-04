import { Code, Flex, Text } from '@chakra-ui/react';
import { MetricsInfo } from '../shared/MetrisInfo';
import { SingleReportSchema } from '../../sdlc/single-report-schema';
import { formatNumber, getColumnDetails, getMissingValue } from '../../utils';
import { zip } from 'lodash';

// FIXME: Temp Typing
type SRTableColumnDetailsProps = {
  column: SingleReportSchema['tables']['ACTION']['columns'];
};

export const SRTableColumnDetails = ({ column }: SRTableColumnDetailsProps) => {
  const { mismatch, mismatchOfTotal, missing, valid, validOfTotal } =
    getColumnDetails(column);

  const toMostCommon = (
    column: SingleReportSchema['tables']['ACTION']['columns']['symbol'],
  ) => {
    // show the most common values
    // * give null if type mismatch
    // * skip null value
    // * show top 2 if the values share the same counting, examples:
    //    (more than 2) a:100, b:100, c:100 => a, b, ...
    //    (2) a:100, b:100 => a
    //    (2) null:100, a:100, b:100 => a, b
    //    (2) null:101, a:100, b:100 => a, b
    //    (2) a:100, b:100 => a, b
    //    (1) a:100 => a
    //    (1) a:100, b:99, c:99 => a

    if (column.type !== 'string') {
      return null;
    }

    const data = zip(column.distribution.labels, column.distribution.counts)
      .filter((x) => x[0] !== null)
      .slice(0, 3);
    const topCount = data[0][1];
    const tops = data.filter((x) => x[1] == topCount).map((x) => x[0]);

    if (tops.length > 2) {
      return tops.slice(0, 2).join(', ') + ', ...';
    }
    return tops.join(', ');
  };

  const mostCommon = toMostCommon(column);

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

      {column.type === 'string' && mostCommon && (
        <Flex direction="column">
          <MetricsInfo name="Most common" base={mostCommon} />
        </Flex>
      )}

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
