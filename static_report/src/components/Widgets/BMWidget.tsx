import { Box, Flex, Select, Text } from '@chakra-ui/react';
import { useState } from 'react';
import { DBTBusinessMetricGroupItem } from '../../lib';
import { BMLineChart } from '../Charts/BMLineChart';

type Props = {
  data: DBTBusinessMetricGroupItem;
};
export function BMWidget({ data }: Props) {
  // use first element grain to as initial load (or last for largest grain?)
  const [timeGrain, setTimeGrain] = useState<string>(
    data.results[0].params.grain,
  );

  const timeGrainOptions = data.results.map(({ params: { grain } }) => grain);
  return (
    <Box>
      <Flex className="widget-header" py={5} justifyContent={'space-between'}>
        <Text fontWeight={'medium'}>{data.name}</Text>
        <Select
          w={'initial'}
          onChange={(e) => {
            const grainIndex = Number(e.currentTarget.value);
            const selectedDataResultGrain =
              data.results[grainIndex].params.grain;
            setTimeGrain(selectedDataResultGrain);
          }}
        >
          {timeGrainOptions.map((v, i) => (
            <option key={i} value={i}>
              {v}
            </option>
          ))}
        </Select>
      </Flex>
      <Flex maxH={'300px'} justifyContent={'center'}>
        {/* TODO: Handle Comparable CR data */}
        <BMLineChart data={data} timeGrain={timeGrain} />
      </Flex>
    </Box>
  );
}
