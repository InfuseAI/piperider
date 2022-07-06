import { Code, Flex, Text } from '@chakra-ui/react';
import { ColumnSchema } from '../../sdlc/single-report-schema';
import {
  formatNumber,
  getColumnDetails,
  formatIntervalMinMax,
  formatColumnValueWith,
} from '../../utils';
import { MetricsInfo } from '../shared/MetrisInfo';

// props made optional as they can be undefined
type CRTableColumnDetailsProps = {
  column?: ColumnSchema;
  baseColumn?: ColumnSchema;
  inputColumn?: ColumnSchema;
};
export const CRTableColumnDetails = ({
  column,
  baseColumn,
  inputColumn,
}: CRTableColumnDetailsProps) => {
  const emptyLabel = '-';
  if (baseColumn) {
    var {
      total: baseTotal,
      mismatchOfTotal: baseMismatchOfTotal,
      validOfTotal: baseValidOfTotal,
      missingOfTotal: baseMissingOfTotal,
    } = getColumnDetails(baseColumn);
  }

  if (inputColumn) {
    var {
      total: inputTotal,
      mismatchOfTotal: inputMismatchOfTotal,
      validOfTotal: inputValidOfTotal,
      missingOfTotal: inputMissingOfTotal,
    } = getColumnDetails(inputColumn);
  }

  return (
    <Flex direction="column" gap={2} minH="250px">
      <Flex direction="column" gap={3}>
        <Flex justifyContent="space-between">
          <Text maxWidth="calc(100% - 250px)">
            <Text
              as="span"
              fontWeight={700}
              color="gray.900"
              fontSize="lg"
              mr={1}
              noOfLines={1}
              title={column.name}
            >
              {column.name}
            </Text>
            {''}(<Code>{column.schema_type}</Code>)
          </Text>

          <Flex gap={8}>
            <Text fontWeight={700} textAlign="right" width="100px">
              Base
            </Text>
            <Text fontWeight={700} textAlign="right" width="100px">
              Input
            </Text>
          </Flex>
        </Flex>

        <Flex direction="column" mt={3}>
          <MetricsInfo
            name="Total"
            base={formatColumnValueWith(baseTotal, formatNumber)}
            input={formatColumnValueWith(inputTotal, formatNumber)}
          />
          <MetricsInfo
            name="Valid"
            base={formatColumnValueWith(baseValidOfTotal, formatIntervalMinMax)}
            input={formatColumnValueWith(
              inputValidOfTotal,
              formatIntervalMinMax,
            )}
          />
          <MetricsInfo
            name="Mismatched"
            base={formatColumnValueWith(
              baseMismatchOfTotal,
              formatIntervalMinMax,
            )}
            input={formatColumnValueWith(
              inputMismatchOfTotal,
              formatIntervalMinMax,
            )}
          />

          <MetricsInfo
            name="Missing"
            base={formatColumnValueWith(
              baseMissingOfTotal,
              formatIntervalMinMax,
            )}
            input={formatColumnValueWith(
              inputMissingOfTotal,
              formatIntervalMinMax,
            )}
          />

          <Flex direction="column" mt={3}>
            <MetricsInfo
              name="Distinct"
              base={formatColumnValueWith(baseColumn?.distinct, formatNumber)}
              input={formatColumnValueWith(inputColumn?.distinct, formatNumber)}
            />
          </Flex>
        </Flex>
        {column.type === 'numeric' && (
          <>
            <Flex direction="column">
              <MetricsInfo
                name="Average"
                base={formatColumnValueWith(baseColumn?.avg, formatNumber)}
                input={formatColumnValueWith(inputColumn?.avg, formatNumber)}
              />
              <MetricsInfo
                name="Std. Deviation"
                base={formatColumnValueWith(baseColumn?.stddev, formatNumber)}
                input={formatColumnValueWith(inputColumn?.stddev, formatNumber)}
              />
            </Flex>
            <Flex direction="column">
              <MetricsInfo
                name="Min"
                base={formatColumnValueWith(baseColumn?.min, formatNumber)}
                input={formatColumnValueWith(inputColumn?.min, formatNumber)}
              />
              <MetricsInfo
                name="5%"
                base={formatColumnValueWith(baseColumn?.p5, formatNumber)}
                input={formatColumnValueWith(inputColumn?.p5, formatNumber)}
              />
              <MetricsInfo
                name="25%"
                base={formatColumnValueWith(baseColumn?.p25, formatNumber)}
                input={formatColumnValueWith(inputColumn?.p25, formatNumber)}
              />
              <MetricsInfo
                name="50%"
                base={formatColumnValueWith(baseColumn?.p50, formatNumber)}
                input={formatColumnValueWith(inputColumn?.p50, formatNumber)}
              />
              <MetricsInfo
                name="75%"
                base={formatColumnValueWith(baseColumn?.p75, formatNumber)}
                input={formatColumnValueWith(inputColumn?.p75, formatNumber)}
              />
              <MetricsInfo
                name="95%"
                base={formatColumnValueWith(baseColumn?.p95, formatNumber)}
                input={formatColumnValueWith(inputColumn?.p95, formatNumber)}
              />
              <MetricsInfo
                name="Max"
                base={formatColumnValueWith(baseColumn?.max, formatNumber)}
                input={formatColumnValueWith(inputColumn?.max, formatNumber)}
              />
            </Flex>
          </>
        )}

        {column.type === 'datetime' && (
          <Flex direction="column">
            <MetricsInfo
              name="Min"
              base={(baseColumn?.min as string | number) ?? emptyLabel}
              input={(inputColumn?.min as string | number) ?? emptyLabel}
            />
            <MetricsInfo
              name="Max"
              base={(baseColumn?.max as string | number) ?? emptyLabel}
              input={(inputColumn?.max as string | number) ?? emptyLabel}
            />
          </Flex>
        )}
      </Flex>
    </Flex>
  );
};
