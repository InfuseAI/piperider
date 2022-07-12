import { Flex } from '@chakra-ui/react';
import { useRef } from 'react';
import { useResizeObserver } from '../../hooks/useResizeObserver';
import { useSingleChart } from '../../hooks/useSingleChart';

interface Props {
  data: Array<{
    label: string;
    value: any;
    total: number;
  }>;
}

export function SRBarChart({ data }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dimensions = useResizeObserver(containerRef);

  useSingleChart({ target: svgRef, data, dimensions });

  return (
    <Flex className="chart" width="100%" ref={containerRef}>
      <svg width="100%" overflow="visible" ref={svgRef}>
        <g className="x-axis" />
        <g className="y-axis" />
      </svg>
    </Flex>
  );
}
