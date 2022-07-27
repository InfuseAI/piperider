import { useResizeObserver } from '../../hooks/useResizeObserver';
import { useComparisonChart } from '../../hooks/useComparisonChart';
import { useRef } from 'react';
import { Flex } from '@chakra-ui/react';
import { CRHistogramDatum } from '../../utils/transformers';

type Prop = {
  data: CRHistogramDatum[];
};
export function CRBarChart({ data }: Prop) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dimensions = useResizeObserver(containerRef);

  useComparisonChart({ target: svgRef, data, dimensions });

  return (
    <Flex className="chart" width="100%" ref={containerRef}>
      <svg width="100%" overflow="visible" ref={svgRef}>
        <g className="x-axis" />
        <g className="y-axis" />
      </svg>
    </Flex>
  );
}
