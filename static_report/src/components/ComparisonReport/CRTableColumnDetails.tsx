import { Code, Flex, Text } from '@chakra-ui/react';
import { ColumnSchema } from '../../sdlc/single-report-schema';
import {
  formatNumber,
  getColumnDetails,
  formatIntervalMinMax,
} from '../../utils';
import { MetricsInfo } from '../shared/MetrisInfo';

type CRTableColumnDetailsProps = {
  column: ColumnSchema;
  baseColumn: ColumnSchema;
  inputColumn: ColumnSchema;
};

export const CRTableColumnDetails = ({
  column,
  baseColumn,
  inputColumn,
}: CRTableColumnDetailsProps) => {
  const {
    mismatchOfTotal: baseMismatchOfTotal,
    validOfTotal: baseValidOfTotal,
    missingOfTotal: baseMissingOfTotal,
  } = getColumnDetails(baseColumn);

  const {
    mismatchOfTotal: inputMismatchOfTotal,
    validOfTotal: inputValidOfTotal,
    missingOfTotal: inputMissingOfTotal,
  } = getColumnDetails(inputColumn);

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
            base={formatNumber(baseColumn?.total)}
            input={formatNumber(inputColumn?.total)}
          />
          <MetricsInfo
            name="Valid"
            base={formatIntervalMinMax(baseValidOfTotal)}
            input={formatIntervalMinMax(inputValidOfTotal)}
          />
          <MetricsInfo
            name="Mismatched"
            base={formatIntervalMinMax(baseMismatchOfTotal)}
            input={formatIntervalMinMax(inputMismatchOfTotal)}
          />

          <MetricsInfo
            name="Missing"
            base={formatIntervalMinMax(baseMissingOfTotal)}
            input={formatIntervalMinMax(inputMissingOfTotal)}
          />

          <Flex direction="column" mt={3}>
            <MetricsInfo
              name="Distinct"
              base={
                baseColumn?.distinct
                  ? formatNumber(baseColumn.distinct as number)
                  : '-'
              }
              input={
                inputColumn?.distinct
                  ? formatNumber(inputColumn.distinct as number)
                  : '-'
              }
            />
          </Flex>
        </Flex>
        {column.type === 'numeric' && (
          <>
            <Flex direction="column">
              <MetricsInfo
                name="Average"
                base={
                  baseColumn?.avg ? formatNumber(baseColumn.avg as number) : '-'
                }
                input={
                  inputColumn?.avg
                    ? formatNumber(inputColumn.avg as number)
                    : '-'
                }
              />
              <MetricsInfo
                name="Std. Deviation"
                base={
                  baseColumn?.stddev
                    ? formatNumber(baseColumn.stddev as number)
                    : '-'
                }
                input={
                  inputColumn?.stddev
                    ? formatNumber(inputColumn.stddev as number)
                    : '-'
                }
              />
            </Flex>
            <Flex direction="column">
              <MetricsInfo
                name="Min"
                base={
                  baseColumn?.min ? formatNumber(baseColumn.min as number) : '-'
                }
                input={
                  inputColumn?.min
                    ? formatNumber(inputColumn.min as number)
                    : '-'
                }
              />
              <MetricsInfo
                name="5%"
                base={
                  baseColumn?.p5 ? formatNumber(baseColumn.p5 as number) : '-'
                }
                input={
                  inputColumn?.p5 ? formatNumber(inputColumn.p5 as number) : '-'
                }
              />
              <MetricsInfo
                name="25%"
                base={
                  baseColumn?.p25 ? formatNumber(baseColumn.p25 as number) : '-'
                }
                input={
                  inputColumn?.p25
                    ? formatNumber(inputColumn.p25 as number)
                    : '-'
                }
              />
              <MetricsInfo
                name="50%"
                base={
                  baseColumn?.p50 ? formatNumber(baseColumn.p50 as number) : '-'
                }
                input={
                  inputColumn?.p50
                    ? formatNumber(inputColumn.p50 as number)
                    : '-'
                }
              />
              <MetricsInfo
                name="75%"
                base={
                  baseColumn?.p75 ? formatNumber(baseColumn.p75 as number) : '-'
                }
                input={
                  inputColumn?.p75
                    ? formatNumber(inputColumn.p75 as number)
                    : '-'
                }
              />
              <MetricsInfo
                name="95%"
                base={
                  baseColumn?.p95 ? formatNumber(baseColumn.p95 as number) : '-'
                }
                input={
                  inputColumn?.p95
                    ? formatNumber(inputColumn.p95 as number)
                    : '-'
                }
              />
              <MetricsInfo
                name="Max"
                base={
                  baseColumn?.max ? formatNumber(baseColumn.max as number) : '-'
                }
                input={
                  inputColumn?.max
                    ? formatNumber(inputColumn.max as number)
                    : '-'
                }
              />
            </Flex>
          </>
        )}

        {column.type === 'datetime' && (
          <Flex direction="column">
            <MetricsInfo
              name="Min"
              base={(baseColumn?.min as string | number) ?? '-'}
              input={(inputColumn?.min as string | number) ?? '-'}
            />
            <MetricsInfo
              name="Max"
              base={(baseColumn?.max as string | number) ?? '-'}
              input={(inputColumn?.max as string | number) ?? '-'}
            />
          </Flex>
        )}
      </Flex>
    </Flex>
  );
};
