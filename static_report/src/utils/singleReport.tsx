import { useEffect } from 'react';
import * as d3 from 'd3';
import { getChartTooltip, formatNumber } from '.';
import { SingleChartDataItem, DrawChartArgs } from './types';

const barColor = 'var(--chakra-colors-blue-300)';

//TODO: Refactor file name (currently confusing with component file)
// -- shouldn't this be part of component folder?
//see: https://www.robinwieruch.de/react-folder-structure/
export function drawSingleReportChart({
  containerWidth,
  containerHeight,
  svgTarget,
  tooltipTarget,
  data,
}: DrawChartArgs<SingleChartDataItem>) {
  const margin = { top: 10, right: 30, bottom: 30, left: 50 };
  const width = containerWidth - margin.left - margin.right;
  const height = containerHeight - margin.top - margin.bottom;
  const xPadding = 0.5;
  const overlayOffset = 10;

    const svg = d3.select(target.current);
    const xScale = d3
      .scaleBand()
      .domain(data.map((d) => d.label))
      .range([0, dimensions.width])
      .padding(0.5);

    const yScale = d3
      .scaleLinear()
      .domain([0, d3.max(data, ({ value }) => value)])
      .range([dimensions.height, 0]);

    const xAxis = d3.axisBottom(xScale).tickFormat((value: any, i) => {
      const xAxisItemLength = xScale.domain().length - 1;

  // TODO: Refactor these as utils
  function onShowTooltip(event, d) {
    tooltip
      .html(
        `
          <div>
            <p>Label: ${label}</p>
            <p>Count: ${formatNumber(value)}</p>
            <p>Percentage: ${Number((value / total) * 100).toFixed(3)}%</p>
          </div>
        `,
          )
          .transition()
          .duration(500)
          .style('visibility', 'visible');

    //@ts-ignore
    d3.select(this).style('fill', barColor).style('opacity', 0.3);
  }

        d3.select(this).style('fill', 'var(--chakra-colors-blue-300)');
      });

  function onHideTooltip() {
    tooltip.html('').transition().duration(500).style('visibility', 'hidden');

    //@ts-ignore
    d3.select(this).style('opacity', 0);
    //TODO: apply on the actual data-bar itself?
  }

  const x = d3
    .scaleBand()
    .domain(data.map((d) => d.label))
    .range([0, width])
    .padding(xPadding);
  const y = d3
    .scaleLinear()
    .domain([0, d3.max(data, ({ value }) => value)])
    .range([height, 0]);

  // plot X axis
  svg
    .append('g')
    .attr('transform', `translate(0, ${height})`)
    .call(
      d3.axisBottom(x).tickFormat((value, i) => {
        const xAxisItemLength = x.domain().length - 1;

        if (i === 0 || i === xAxisItemLength / 2 || i === xAxisItemLength) {
          return value;
        }
        return null;
      }),
    );

  // plot Y axis
  svg.append('g').call(
    d3
      .axisLeft(y)
      .tickFormat((d) => `${d}`)
      .ticks(8),
  );

  // plot backdrop hover area
  svg
    .selectAll()
    .data(data)
    .enter()
    .append('rect')
    .style('opacity', 0)
    .attr('class', 'overlay-bars')
    .attr('x', (s: any) => x(s.label) - overlayOffset / 2)
    .attr('y', (s: any) => 0)
    .attr('width', x.bandwidth() + overlayOffset)
    .attr('height', (s: any) => height)
    .on('mouseover', onShowTooltip)
    .on('mousemove', onMoveTooltip)
    .on('mouseout', onHideTooltip);

  // plot data bars
  svg
    .selectAll()
    .data(data)
    .enter()
    .append('rect')
    .attr('x', (s: any) => x(s.label))
    .attr('y', (s: any) => y(s.value))
    .attr('height', (s: any) => height - y(s.value))
    .attr('width', x.bandwidth())
    .style('fill', barColor);
}
