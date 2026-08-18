 
import {
	catAxis,
	colorBar,
	MAGMA,
	SCORE_MIN,
	SCORE_MAX,
} from "../../../scripts/theme.js";

export function buildScoreHeatmapOption(
	{ data, judges, titles },
	theme,
	{ left, right, top, bottom },
) {
	return {
		grid: {
			left,
			right,
			top,
			bottom,
			containLabel: false,
		},
		xAxis: catAxis(judges, theme, {
			name: "评委",
			axisLabel: { show: false },
			axisTick: { show: false },
			axisLine: { show: false },
			splitArea: { show: false },
		}),
		yAxis: catAxis(titles, theme, {
			name: "作品",
			inverse: true, 
			nameRotate: 90,
			axisLabel: { show: false },
			axisTick: { show: false },
			axisLine: { show: false },
			splitArea: { show: false },
		}),
		visualMap: colorBar(theme, {
			min: SCORE_MIN,
			max: SCORE_MAX,
			
			color: MAGMA,
			text: "分数",
			right: 6,
		}),
		series: [
			{
				type: "heatmap",
				data: data,
				itemStyle: { borderWidth: 0 },
				emphasis: { disabled: true },
				label: { show: false },
			},
		],
	};
}
