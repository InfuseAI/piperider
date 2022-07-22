import { Flex, Grid } from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { ColumnSchema } from '../../sdlc/single-report-schema';
import { ZTableSchema } from '../../types';
import {
  transformBaseDistribution,
  nestComparisonValueByKey,
  transformCRStringDateDistributions,
  CRDistributionDatum,
} from '../../utils/transformers';
import { CRBarChart } from './CRBarChart';
import { CRTableColumnDetails } from './CRTableColumnDetails';

export function CRTabProfilingDetails({ base, input }) {
  ZTableSchema.parse(base);
  ZTableSchema.parse(input);

  const transformedData = nestComparisonValueByKey<ColumnSchema>(
    base.columns,
    input.columns,
  );

  return (
    <>
      {Object.entries(transformedData).map(([key, value]) => {
        return (
          <CRProfilingColumn
            key={key}
            name={key}
            base={value.base}
            input={value.input}
          />
        );
      })}
    </>
  );
}

/**
 * Optional values due to column-drift across runs
 * Renders combined single chart when type is string or datetime
 * Otherwise, renders two charts per distribution
 */
type CRProfilingColumnProp = {
  name: string;
  base?: ColumnSchema;
  input?: ColumnSchema;
};
function CRProfilingColumn({ name, base, input }: CRProfilingColumnProp) {
  const [data, setData] = useState<CRDistributionDatum[][]>([]);

  useEffect(() => {
    if (
      base?.type === input?.type &&
      (base?.type === 'string' || base?.type === 'datetime')
    ) {
      const transformResult = transformCRStringDateDistributions({
        base: base.distribution,
        input: input.distribution,
      });

      setData([transformResult]);
    } else {
      const baseData = base
        ? transformBaseDistribution({
            baseCounts: base.distribution.counts,
            baseLabels: base.distribution.labels,
          })
        : null;

      const inputData = input
        ? transformBaseDistribution({
            baseCounts: input.distribution.counts,
            baseLabels: input.distribution.labels,
          })
        : null;

      setData([baseData, inputData]);
    }
  }, [base, input]);

  return (
    <Flex key={name} direction="column">
      <Grid my={8} templateColumns="500px 1fr" gap={12}>
        {/* case: base and input not always avail due to column shifts, but base will always exist */}
        <CRTableColumnDetails
          baseColumn={base}
          inputColumn={input}
          column={base ? base : input}
        />

        {/* Diff between string datetime vs. others */}
        {data.length === 1 && <CRBarChart data={data[0]} />}
        {data.length === 2 && (
          <Grid my={4} templateColumns="1fr 1fr" gap={12}>
            {data[0] ? <CRBarChart data={data[0]} /> : <NoData />}
            {data[1] ? <CRBarChart data={data[1]} /> : <NoData />}
          </Grid>
        )}
      </Grid>
    </Flex>
  );
}

function NoData() {
  return (
    <Flex alignItems="center" justifyContent="center" color="gray.500">
      No data available
    </Flex>
  );
}
