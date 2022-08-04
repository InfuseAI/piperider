import { Flex, Grid } from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { ColumnSchema, TableSchema } from '../../sdlc/single-report-schema';
import { zReport, ZTableSchema } from '../../types';
import {
  transformBaseDistribution,
  transformAsNestedBaseTargetRecord,
  transformCRStringDateDistributions,
  CRDistributionDatum,
} from '../../utils/transformers';
import { CRBarChart } from './CRBarChart';
import { CRTableColumnDetails } from './CRTableColumnDetails';

type CRTabProfilingDetailsProps = {
  baseTable?: TableSchema;
  targetTable?: TableSchema;
};
export function CRTabProfilingDetails({
  baseTable,
  targetTable,
}: CRTabProfilingDetailsProps) {
  zReport(ZTableSchema.safeParse(baseTable));
  zReport(ZTableSchema.safeParse(targetTable));

  const transformedData = transformAsNestedBaseTargetRecord<
    TableSchema['columns'],
    ColumnSchema
  >(baseTable?.columns, targetTable?.columns);

  return (
    <>
      {Object.entries(transformedData).map(([key, value]) => {
        return (
          <CRProfilingColumn
            key={key}
            name={key}
            base={value?.base}
            target={value?.target}
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
type CRProfilingColumnProps = {
  name: string;
  base?: ColumnSchema;
  target?: ColumnSchema;
};
function CRProfilingColumn({ name, base, target }: CRProfilingColumnProps) {
  const [data, setData] = useState<(CRDistributionDatum[] | null)[]>([]);

  useEffect(() => {
    if (
      base?.type === target?.type &&
      (base?.type === 'string' || base?.type === 'datetime')
    ) {
      const transformResult = transformCRStringDateDistributions({
        base: base?.distribution,
        target: target?.distribution,
      });

      setData([transformResult]);
    } else {
      const baseData = base?.distribution
        ? transformBaseDistribution({
            baseCounts: base.distribution.counts,
            baseLabels: base.distribution.labels,
          })
        : null;

      const targetData = target?.distribution
        ? transformBaseDistribution({
            baseCounts: target.distribution.counts,
            baseLabels: target.distribution.labels,
          })
        : null;

      setData([baseData, targetData]);
    }
  }, [base, target]);

  const isSingleChartOnly = data.length === 1;
  return (
    <Flex key={name} direction="column">
      <Grid my={8} templateColumns="500px 1fr" gap={12}>
        <CRTableColumnDetails baseColumn={base} targetColumn={target} />

        <Grid
          my={4}
          templateColumns={`1fr ${isSingleChartOnly ? '' : '1fr'}`}
          gap={isSingleChartOnly ? 0 : 12}
        >
          {data[0] ? <CRBarChart data={data[0]} /> : <NoData />}
          {data[1] ? (
            <CRBarChart data={data[1]} />
          ) : isSingleChartOnly ? null : (
            <NoData />
          )}
        </Grid>
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
