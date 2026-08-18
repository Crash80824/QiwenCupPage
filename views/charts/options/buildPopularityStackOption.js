 
import { catAxis, valueAxis, COLORS } from "../../../scripts/theme.js";

export function buildPopularityStackOption({ rows }, theme) {
	
	const PARTS = [
		["digest", "精华"],
		["submission", "投稿"],
		["discussion_self", "讨论（本人）"],
		["discussion_others", "讨论（他人）"],
	];
	return {
		
		legend: {
			data: PARTS.map(([, label]) => label),
			
			orient: "vertical",
			top: 10,
			right: 14,
			itemWidth: 14,
			itemHeight: 10,
			itemGap: 8,
			padding: [6, 10, 6, 10],
			borderRadius: 6,
			backgroundColor: theme.ttBg + "99",
			textStyle: { color: theme.sub, fontSize: 11 },
		},
		grid: { left: 84, right: 16, bottom: 48, top: 40 },
		xAxis: catAxis(
			rows.map((_, i) => i),
			theme,
			{
				name: "参赛者",
				boundaryGap: false, 
				axisLabel: { show: false },
				axisTick: { show: false },
				splitLine: { show: false },
			},
		), 
		yAxis: valueAxis("人气收入", theme, {
			nameGap: 56,
			min: 0,
			axisLabel: { color: theme.sub, margin: 22 }, 
		}),
		series: PARTS.map(([key, label], i) => ({
			name: label,
			type: "bar",
			stack: "popularity",
			barCategoryGap: 0, 
			barGap: 0,
			silent: true, 
			data: rows.map((r) => r[key]),
			itemStyle: { color: COLORS.stackColors[i] },
		})),
	};
}
