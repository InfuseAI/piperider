import { useResizeObserver } from '../../hooks/useResizeObserver';
import { useComparisonChart } from '../../hooks/useComparisonChart';
import { useRef } from 'react';
import { Flex } from '@chakra-ui/react';
import { CRHistogramDatum } from '../../utils/transformers';

type Prop = {
  data: CRHistogramDatum[];
  height?: number | string;
  xTicks?: number;
  yTicks?: number;
};
export function CRBarChart({ data, ...props }: Prop) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dimensions = useResizeObserver(containerRef);

  useComparisonChart({
    target: svgRef,
    data,
    dimensions,
    xTicks: props?.xTicks,
    yTicks: props?.yTicks,
  });

  return (
    <Flex width="100%" height={props?.height ?? 'auto'} ref={containerRef}>
      <svg width="100%" overflow="visible" ref={svgRef}>
        <g className="x-axis" />
        <g className="y-axis" />
      </svg>
    </Flex>
  );
}
