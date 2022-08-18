import * as d3 from 'd3';
import { useEffect, RefObject } from 'react';

import { formatNumber } from '../utils/formatters';
import { getChartTooltip } from '../utils/chart';
import { CRHistogramDatum } from '../utils/transformers';

const GROUPED = ['base', 'target'];
const X_PADDING = 0.2;
const X_SUB_PADDING = 0.05;
const TOOLTIPS_BG_COLOR = 'var(--chakra-colors-gray-500)';
const BASE_CHART_COLOR = 'var(--chakra-colors-blue-100)';
const TARGET_CHART_COLOR = 'var(--chakra-colors-blue-300)';

type CRChartHookArgs = {
  target: RefObject<SVGSVGElement>;
  data: CRHistogramDatum[];
  dimensions: DOMRect | null;
};

export function useComparisonChart({
  target,
  data,
  dimensions,
}: CRChartHookArgs) {
  useEffect(() => {
    if (!target || !dimensions || !data) {
      return;
    }

    const svg = d3.select(target.current);
    const labels = data.map((d) => d.label || '');

    // X-Axis
    const xScale = d3
      .scaleBand()
      .domain(labels)
      .range([0, dimensions.width])
      .padding(X_PADDING);

    const xSubGroup = d3
      .scaleBand()
      .domain(GROUPED)
      .range([0, xScale.bandwidth()])
      .padding(X_SUB_PADDING);

    const xAxis = d3.axisBottom(xScale).tickFormat((value, i) => {
      const xAxisItemLength = xScale.domain().length - 1;
      const isFrontMiddleEndPos =
        i === 0 || i === xAxisItemLength / 2 || i === xAxisItemLength;

      return isFrontMiddleEndPos ? value : '';
    });

    // plox X axis
    svg
      .select('.x-axis')
      .style('transform', `translateY(${dimensions.height}px)`)
      .call(xAxis as any);

    // Y-Axis
    const yScale = d3
      .scaleLinear()
      .domain([
        0,
        d3.max(data, ({ base, target }) => Math.max(base, target)) as number,
      ])
      .range([dimensions.height, 0]);
    const yAxis = d3.axisLeft(yScale);
    // plox Y axis
    svg.select('.y-axis').call(yAxis as any);

    const color = d3
      .scaleOrdinal()
      .domain(GROUPED)
      .range([BASE_CHART_COLOR, TARGET_CHART_COLOR]);

    const grouped = svg
      .selectAll('.grouped-chart')
      .data(data)
      .join('g')
      .attr('class', 'grouped-chart')
      .attr('transform', (d: any) => `translate(${xScale(d.label)}, 0)`);

    const tooltip = getChartTooltip({ target: '.chart' });

    grouped
      .selectAll('rect')
      .data((d: any) =>
        GROUPED.map((key) => ({
          key,
          label: d.label,
          value: d[key],
        })),
      )
      .enter()
      .append('rect')
      .attr('x', (d) => xSubGroup(d.key) as number)
      .attr('y', (d) => yScale(d.value))
      .attr('width', (d) => xSubGroup.bandwidth())
      .attr('height', (d: any) => dimensions.height - yScale(d.value))
      .attr('fill', (d: any) => color(d.key) as any);

    grouped
      .selectAll('.overlay-bars')
      .data((d: any) =>
        GROUPED.map((key) => ({
          key,
          label: d.label,
          value: d[key],
        })),
      )
      .join('rect')
      .attr('class', 'overlay-bars')
      .attr('x', (d) => xSubGroup(d.key) as number)
      .attr('y', () => 0)
      .attr('width', xSubGroup.bandwidth())
      .attr('height', () => dimensions.height)
      .attr('fill', (d: any) => color(d.key) as any)
      .style('opacity', 0)
      .on('mouseover', function (event, d) {
        tooltip
          .html(
            `
        <div>
          <p>Label: ${d.label}</p>
          <p>Count: ${formatNumber(d.value)}</p>
        </div>
      `,
          )
          .transition()
          .duration(500)
          .style('visibility', 'visible');

        d3.select(this).style('fill', TOOLTIPS_BG_COLOR).style('opacity', 0.3);
      })
      .on('mousemove', function (event) {
        tooltip
          .style('top', `${event.pageY - 10}px`)
          .style('left', `${event.pageX + 10}px`);
      })
      .on('mouseout', function () {
        tooltip
          .html('')
          .transition()
          .duration(500)
          .style('visibility', 'hidden');

        d3.select(this).style('opacity', 0);
      });

    return () => {
      svg.select('svg').remove();
    };
  }, [data, dimensions, target]);
}
