import { Flex } from '@chakra-ui/react';
import { useRef } from 'react';
import { useResizeObserver } from '../../hooks/useResizeObserver';
import { useSingleChart } from '../../hooks/useSingleChart';

type Datum = {
  label: string | number;
  value: any;
  total: number;
};
interface Props {
  data: Array<Datum>;
}

export function SRBarChart({ data }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dimensions = useResizeObserver(containerRef);

  useSingleChart<Datum>({ target: svgRef, data, dimensions });

  return (
    <Flex className="chart" width="100%" minHeight={250} ref={containerRef}>
      <svg width="100%" overflow="visible" ref={svgRef}>
        <g className="x-axis" />
        <g className="y-axis" />
      </svg>
    </Flex>
  );
}
