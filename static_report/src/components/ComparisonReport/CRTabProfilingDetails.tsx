import { Flex, Grid } from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import {
  nestComparisonValueByKey,
  transformDistribution,
  transformDistributionWithLabels,
} from '../../utils';
import { CRBarChart } from './CRBarChart';
import { CRTableColumnDetails } from './CRTableColumnDetails';

export function CRTabProfilingDetails({ base, input }) {
  const transformedData = nestComparisonValueByKey(
    base?.columns,
    input?.columns,
  );

  return (
    <>
      {Object.entries(transformedData).map(([key, value]) => (
        <CRProfilingColumn
          key={key}
          name={key}
          base={value.base}
          input={value.input}
        />
      ))}
    </>
  );
}

function CRProfilingColumn({ name, base, input }) {
  const [data, setData] = useState([]);

  useEffect(() => {
    if (
      base?.type === input?.type &&
      (base?.type === 'string' || base?.type === 'datetime')
    ) {
      const transformResult = transformDistribution({
        base: base.distribution,
        input: input.distribution,
      });

      setData([transformResult]);
    } else {
      const baseData = base
        ? transformDistributionWithLabels({
            base: base.distribution.counts,
            input: null,
            labels: base.distribution.labels,
          })
        : null;

      const inputData = input
        ? transformDistributionWithLabels({
            base: input.distribution.counts,
            input: null,
            labels: input.distribution.labels,
          })
        : null;

      setData([baseData, inputData]);
    }
  }, [base, input]);

  return (
    <Flex key={name} direction="column">
      <Grid my={8} templateColumns="500px 1fr" gap={12}>
        <CRTableColumnDetails
          baseColumn={base}
          inputColumn={input}
          column={base ? base : input}
        />

        {data.length === 1 && <CRBarChart data={data[0]} />}
        {data.length === 2 && (
          <Grid my={4} templateColumns="1fr 1fr" gap={12}>
            {data[0] ? (
              <CRBarChart data={data[0]} />
            ) : (
              <Flex
                alignItems="center"
                justifyContent="center"
                color="gray.500"
              >
                No data available
              </Flex>
            )}
            {data[1] ? (
              <CRBarChart data={data[1]} />
            ) : (
              <Flex
                alignItems="center"
                justifyContent="center"
                color="gray.500"
              >
                No data available
              </Flex>
            )}
          </Grid>
        )}
      </Grid>
    </Flex>
  );
}
