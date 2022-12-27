/**
 * YAML/JSON result
 *   # 1-dim. Time only (o)
  - name: 'Daily'
    params:
      dimensions: [],
      grain: 'day' 
    headers: [
      "day", "active_user"
    ],
    data: [
			["2012-12-01", 1],
			["2012-12-02", 1],
			["2012-12-03", 1],
			["2012-12-04", 1],
	  ]
  - name: 'Weekly'
    params:
      dimensions: [],
      grain: 'week' 
    headers: [
      "day", "active_user"
    ],
    data: [
			["2012-12-01", 1],
			["2012-12-08", 2],
			["2012-12-15", 3],
			["2012-12-22", 4],
	  ]
 */
type Props = {};
export function BMLineChart({}: Props) {}
