import { Box, Flex, Select, Text } from '@chakra-ui/react';
import { useState } from 'react';
import {
  Comparable,
  ComparableData,
  DBTBusinessMetricGroupItem,
} from '../../lib';
import { BMLineChart } from '../Charts/BMLineChart';

interface Props extends Comparable {
  data: ComparableData<DBTBusinessMetricGroupItem>;
}
export function BMWidget({ data: { base, target }, singleOnly }: Props) {
  // Determines the datasets shown by BM*Chart
  const bmGroupList = singleOnly ? [base] : [base, target];

  //shared timeGrain selection + options (SR+CR+Dimensions)
  const fallbackBMData = target || base;
  // const fallbackBMResults = fallbackBMData?.results ?? [];
  // const timeGrainOptions = fallbackBMResults.map(
  //   (result) => result.params.grain,
  // );

  // use first element grain to as initial load (or last for largest grain?)
  const [timeGrain, setTimeGrain] = useState<string>(
    fallbackBMData?.grain ?? '',
  );

  return (
    <Box>
      <Flex className="widget-header" py={5} justifyContent={'space-between'}>
        <Text fontWeight={'medium'}>{fallbackBMData?.name}</Text>
        {/* <Select
          w={'initial'}
          onChange={(e) => {
            const grainIndex = Number(e.currentTarget.value);
            const selectedDataResultGrain =
              fallbackBMData?.results[grainIndex].params.grain;
            selectedDataResultGrain && setTimeGrain(selectedDataResultGrain);
          }}
        >
          {timeGrainOptions.map((v, i) => (
            <option key={i} value={i}>
              {v}
            </option>
          ))}
        </Select> */}
      </Flex>
      <Flex maxH={'300px'} justifyContent={'center'}>
        <BMLineChart data={bmGroupList} timeGrain={timeGrain} />
      </Flex>
    </Box>
  );
}
