import { Code, Flex, Text } from '@chakra-ui/react';
import { formatNumber, getColumnDetails, getMissingValue } from '../../utils';
import { MetricsInfo } from '../shared/MetrisInfo';
import { ComparisonReportSchema } from '../../sdlc/comparison-report-schema';

// FIXME: Temp Typing
type CRTableColumnDetailsProps = {
  column: any;
  baseColumn: ComparisonReportSchema['base']['tables']['ACTION']['columns'];
  inputColumn: ComparisonReportSchema['input']['tables']['ACTION']['columns'];
};

export const CRTableColumnDetails = ({
  column,
  baseColumn,
  inputColumn,
}: CRTableColumnDetailsProps) => {
  const {
    mismatchOfTotal: baseMismatchOfTotal,
    validOfTotal: baseValidOfTotal,
  } = getColumnDetails(baseColumn);

  const {
    mismatchOfTotal: inputMismatchOfTotal,
    validOfTotal: inputValidOfTotal,
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

        <Flex direction="column">
          <MetricsInfo
            name="Total"
            base={baseColumn?.total ? formatNumber(baseColumn?.total) : '-'}
            input={inputColumn?.total ? formatNumber(inputColumn?.total) : '-'}
          />
        </Flex>

        <Flex direction="column" mt={3}>
          <MetricsInfo
            name="Valid"
            base={formatNumber(baseValidOfTotal, 'en-US', { style: 'percent' })}
            input={formatNumber(inputValidOfTotal, 'en-US', {
              style: 'percent',
            })}
          />
          <MetricsInfo
            name="Mismatched"
            base={formatNumber(baseMismatchOfTotal, 'en-US', {
              style: 'percent',
            })}
            input={formatNumber(inputMismatchOfTotal, 'en-US', {
              style: 'percent',
            })}
          />

          <MetricsInfo
            name="Missing"
            base={getMissingValue(baseColumn as any)}
            input={getMissingValue(inputColumn as any)}
          />

          <Flex direction="column" mt={3}>
            <MetricsInfo
              name="Distinct"
              base={
                baseColumn?.distinct ? formatNumber(baseColumn.distinct) : '-'
              }
              input={
                inputColumn?.distinct ? formatNumber(inputColumn.distinct) : '-'
              }
            />
          </Flex>
        </Flex>
        {(column.type === 'numeric' || column.type === 'integer') && (
          <>
            <Flex direction="column">
              <MetricsInfo
                name="Average"
                base={baseColumn?.avg ? formatNumber(baseColumn.avg) : '-'}
                input={inputColumn?.avg ? formatNumber(inputColumn.avg) : '-'}
              />
              <MetricsInfo
                name="Std. Deviation"
                base={
                  baseColumn?.stddev ? formatNumber(baseColumn.stddev) : '-'
                }
                input={
                  inputColumn?.stddev ? formatNumber(inputColumn.stddev) : '-'
                }
              />
            </Flex>
            <Flex direction="column">
              <MetricsInfo
                name="Min"
                base={baseColumn?.min ? formatNumber(baseColumn.min) : '-'}
                input={inputColumn?.min ? formatNumber(inputColumn.min) : '-'}
              />
              <MetricsInfo
                name="5%"
                base={baseColumn?.p5 ? formatNumber(baseColumn.p5) : '-'}
                input={inputColumn?.p5 ? formatNumber(inputColumn.p5) : '-'}
              />
              <MetricsInfo
                name="25%"
                base={baseColumn?.p25 ? formatNumber(baseColumn.p25) : '-'}
                input={inputColumn?.p25 ? formatNumber(inputColumn.p25) : '-'}
              />
              <MetricsInfo
                name="50%"
                base={baseColumn?.p50 ? formatNumber(baseColumn.p50) : '-'}
                input={inputColumn?.p50 ? formatNumber(inputColumn.p50) : '-'}
              />
              <MetricsInfo
                name="75%"
                base={baseColumn?.p75 ? formatNumber(baseColumn.p75) : '-'}
                input={inputColumn?.p75 ? formatNumber(inputColumn.p75) : '-'}
              />
              <MetricsInfo
                name="95%"
                base={baseColumn?.p95 ? formatNumber(baseColumn.p95) : '-'}
                input={inputColumn?.p95 ? formatNumber(inputColumn.p95) : '-'}
              />
              <MetricsInfo
                name="Max"
                base={baseColumn?.max ? formatNumber(baseColumn.max) : '-'}
                input={inputColumn?.max ? formatNumber(inputColumn.max) : '-'}
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
