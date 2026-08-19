 
import { tooltip, colorBar, catAxis } from "../../../scripts/theme.js";

export function buildWeekdayHourOption(
	{ xLabels, yLabels, cells, max },
	theme,
) {
	
	const ramp = theme.dark
		? ["#232530", "#30365a", "#47579c", "#6479e0", "#8396fd"]
		: ["#f0f2f8", "#d5dcfb", "#aab9fa", "#7d93f8", "#4b6cf7"];
	return {
		tooltip: tooltip({
			trigger: "item",
			formatter: (p) =>
				`${yLabels[p.value[1]]} ${xLabels[p.value[0]]}<br/>投稿数：${p.value[2]}`,
		}),
		grid: { left: 40, right: 64, top: 12, bottom: 50, containLabel: false },
		xAxis: catAxis(xLabels, theme, {
			nameLocation: "middle",
			nameGap: 28,
			axisLabel: { color: theme.sub, fontSize: 10 },
			splitLine: { show: false },
		}),
		yAxis: catAxis(yLabels, theme, {
			inverse: true,
			axisLabel: { color: theme.sub, fontSize: 11 },
			splitLine: { show: false },
		}),
		visualMap: colorBar(theme, {
			min: 0,
			max: max || 1,
			color: ramp,
			text: "投稿数量",
			right: 2,
			itemHeight: 150,
			fontSize: 10,
		}),
		series: [
			{
				type: "heatmap",
				data: cells,
				itemStyle: { borderWidth: 0.5, borderColor: theme.card },
				label: { show: false },
				emphasis: { itemStyle: { borderColor: theme.text, borderWidth: 1 } },
			},
		],
	};
}
