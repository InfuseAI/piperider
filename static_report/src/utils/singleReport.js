import * as d3 from 'd3';
import { getChartTooltip } from './';

export function drawSingleReportChart({
  containerWidth,
  containerHeight,
  svgTarget,
  tooltipTarget,
  data,
}) {
  const margin = { top: 10, right: 30, bottom: 30, left: 50 };
  const width = containerWidth - margin.left - margin.right;
  const height = containerHeight - margin.top - margin.bottom;

  const svgEl = d3.select(svgTarget);
  svgEl.selectAll('*').remove();

  const svg = svgEl
    .attr('width', width + margin.left + margin.right)
    .attr('height', height + margin.top + margin.bottom)
    .append('g')
    .attr('transform', `translate(${margin.left},${margin.top})`);

  const tooltip = getChartTooltip({ target: tooltipTarget });

  function onShowTooltip(event, d) {
    tooltip
      .html(
        `
          <div>
            <p>Label: ${d.label}</p>
            <p>Value: ${d.value}</p>
            <p>Percentage: ${Number((d.value / d.total) * 100).toFixed(3)}%</p>
          </div>
        `,
      )
      .transition()
      .duration(500)
      .style('visibility', 'visible');

    d3.select(this).style('fill', 'var(--chakra-colors-blue-100)');
  }

  function onMoveTooltip(event) {
    tooltip
      .style('top', `${event.pageY - 10}px`)
      .style('left', `${event.pageX + 10}px`);
  }

  function onHideTooltip() {
    tooltip.html('').transition().duration(500).style('visibility', 'hidden');

    d3.select(this).style('fill', 'var(--chakra-colors-blue-300)');
  }

  const x = d3
    .scaleBand()
    .domain(data.map((d) => d.label))
    .range([0, width])
    .padding(0.5);
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

  const y = d3
    .scaleLinear()
    .domain([0, d3.max(data, ({ value }) => value)])
    .range([height, 0]);
  svg.append('g').call(
    d3
      .axisLeft(y)
      .tickFormat((d) => `${d}`)
      .ticks(8),
  );

  svg
    .selectAll()
    .data(data)
    .enter()
    .append('rect')
    .attr('x', (s) => x(s.label))
    .attr('y', (s) => y(s.value))
    .attr('height', (s) => height - y(s.value))
    .attr('width', x.bandwidth())
    .style('fill', 'var(--chakra-colors-blue-300)')
    .on('mouseover', onShowTooltip)
    .on('mousemove', onMoveTooltip)
    .on('mouseout', onHideTooltip);
}
