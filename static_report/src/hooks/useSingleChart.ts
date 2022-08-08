import * as d3 from 'd3';
import { useEffect, RefObject } from 'react';

import { formatNumber } from '../utils/formatters';
import { getChartTooltip, getLabelTitle } from '../utils/chart';
import { BarChartDatum } from '../components/SingleReport/SRBarChart';

const X_PADDING = 0.05;
const TOOLTIPS_BG_COLOR = 'var(--chakra-colors-gray-500)';
const CHART_COLOR = 'var(--chakra-colors-blue-300)';

interface HookArgs {
  target: RefObject<SVGSVGElement>;
  data: BarChartDatum[];
  dimensions: DOMRect | null;
}
export function useSingleChart({ target, data, dimensions }: HookArgs) {
  useEffect(() => {
    if (!target || !dimensions || !data) {
      return;
    }

    const svg = d3.select(target.current);

    const xScale = d3
      .scaleBand()
      .domain(data.map((d) => String(d.label)))
      .range([0, dimensions.width])
      .padding(X_PADDING);

    const xAxis = d3.axisBottom(xScale).tickFormat((value: any, i) => {
      const xAxisItemLength = xScale.domain().length - 1;

      if (i === 0 || i === xAxisItemLength / 2 || i === xAxisItemLength) {
        return value;
      }
      return null;
    });

    // plot X axis
    svg
      .select('.x-axis')
      .style('transform', `translateY(${dimensions.height}px)`)
      .call(xAxis as any);

    // Y-Axis
    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(data, ({ value }) => value)])
      .range([dimensions.height, 0]);
    const yAxis = d3.axisLeft(yScale);

    // plot Y axis
    svg.select('.y-axis').call(yAxis as any);

    svg
      .selectAll('.bar')
      .data(data)
      .join('rect')
      .attr('class', 'bar')
      .attr('x', (s: any) => xScale(s.label) as any)
      .attr('y', (s: any) => yScale(s.value) as any)
      .attr('width', xScale.bandwidth())
      .attr('height', (s) => dimensions.height - yScale((s as any).value))
      .style('fill', CHART_COLOR);

    // plot backdrop hover area
    const tooltip = getChartTooltip({ target: '.chart' });
    svg
      .selectAll('.overlay-bars')
      .data(data)
      .join('rect')
      .attr('class', 'overlay-bars')
      .attr('x', (s) => xScale(String(s.label)) as number)
      .attr('y', () => 0)
      .attr('width', xScale.bandwidth())
      .attr('height', () => dimensions.height)
      .style('opacity', 0)
      .on('mouseover', function (event, data) {
        const { label, value, total } = data;
        const labelTitle = getLabelTitle(data);

        tooltip
          .html(
            `
          <div>
            <p>${labelTitle}: ${label}</p>
            <p>Count: ${formatNumber(value)}</p>
            <p>Percentage: ${Number((value / total) * 100).toFixed(3)}%</p>
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
      //FIXME: still not removed when `esc` on modals
      svg.selectAll('.chart_tooltip').remove();
    };
  }, [target, dimensions, data]);
}
