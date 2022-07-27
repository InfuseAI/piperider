import { Flex, Grid } from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import { ColumnSchema, TableSchema } from '../../sdlc/single-report-schema';
import { ZTableSchema } from '../../types';
import {
  transformBaseHistogram,
  nestComparisonValueByKey,
  transformCRStringDateHistograms,
  CRHistogramDatum,
} from '../../utils/transformers';
import { CRBarChart } from './CRBarChart';
import { CRTableColumnDetails } from './CRTableColumnDetails';

type Props = {
  baseTable: TableSchema;
  targetTable: TableSchema;
};
export function CRTabProfilingDetails({ baseTable, targetTable }: Props) {
  ZTableSchema.parse(baseTable);
  ZTableSchema.parse(targetTable);

  const transformedData = nestComparisonValueByKey<ColumnSchema>(
    baseTable.columns,
    targetTable.columns,
  );

  return (
    <>
      {Object.entries(transformedData).map(([key, value]) => {
        return (
          <CRProfilingColumn
            key={key}
            name={key}
            base={value.base}
            target={value.target}
          />
        );
      })}
    </>
  );
}

/**
 * Optional values due to column-drift across runs
 * Renders combined single chart when type is string or datetime
 * Otherwise, renders two charts per histogram
 */
type CRProfilingColumnProp = {
  name: string;
  base?: ColumnSchema;
  target?: ColumnSchema;
};
function CRProfilingColumn({ name, base, target }: CRProfilingColumnProp) {
  const [data, setData] = useState<CRHistogramDatum[][]>([]);

  useEffect(() => {
    if (
      base?.type === target?.type &&
      (base?.type === 'string' || base?.type === 'datetime')
    ) {
      const transformResult = transformCRStringDateHistograms({
        base: base.histogram,
        target: target.histogram,
      });

      setData([transformResult]);
    } else {
      const baseData = base
        ? transformBaseHistogram({
            baseCounts: base.histogram.counts,
            baseLabels: base.histogram.labels,
          })
        : null;

      const targetData = target
        ? transformBaseHistogram({
            baseCounts: target.histogram.counts,
            baseLabels: target.histogram.labels,
          })
        : null;

      setData([baseData, targetData]);
    }
  }, [base, target]);

  return (
    <Flex key={name} direction="column">
      <Grid my={8} templateColumns="500px 1fr" gap={12}>
        {/* case: base and target not always avail due to column shifts, but base will always exist */}
        <CRTableColumnDetails
          baseColumn={base}
          targetColumn={target}
          column={base ? base : target}
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
