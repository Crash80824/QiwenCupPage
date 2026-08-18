 
import { tooltip, COLORS } from "../../../scripts/theme.js";
import { MS_PER_DAY } from "../../../scripts/utils.js";
import CONFIG from "../../../data/config.json" with { type: "json" };

export function buildTrendOption({ dates, daily, cumulative }, theme) {
	
	const anchor = new Date(CONFIG.deadline + "T00:00:00");
	const ticks = new Set();
	dates.forEach((d, i) => {
		const diff = Math.round((new Date(d + "T00:00:00") - anchor) / MS_PER_DAY);
		if (diff % 7 === 0) ticks.add(i);
	});
	return {
		tooltip: tooltip({ trigger: "axis", axisPointer: { type: "shadow" } }),
		grid: { left: 15, right: 25, bottom: 8, top: 34, containLabel: true },
		xAxis: {
			type: "category",
			data: dates.map((s) => s.slice(5)),
			boundaryGap: true,
			axisLabel: {
				interval: (i) => ticks.has(i),
				rotate: 45,
				color: theme.sub,
			},
			axisLine: { lineStyle: { color: theme.axis } },
			axisTick: { alignWithLabel: true },
		},
		yAxis: [
			{
				type: "value",
				name: "{a|■} 单日投稿数",
				nameLocation: "end",
				nameGap: 12,
				nameTextStyle: {
					color: theme.text,
					fontSize: 12,
					padding: [0, 0, 0, 32], 
					rich: { a: { color: COLORS.primary } },
				},
				min: 0,
				axisLabel: { color: theme.sub },
				axisLine: { lineStyle: { color: theme.axis } },
				splitLine: { lineStyle: { color: theme.split } },
			},
			{
				type: "value",
				name: "{b|■} 累计投稿数",
				nameLocation: "end",
				nameGap: 12,
				nameTextStyle: {
					color: theme.text,
					fontSize: 12,
					padding: [0, 28, 0, 0], 
					rich: { b: { color: COLORS.accent } },
				},
				position: "right",
				min: 0,
				axisLabel: { color: theme.sub },
				axisLine: { lineStyle: { color: theme.axis } },
				splitLine: { show: false },
			},
		],
		series: [
			{
				name: "单日投稿数",
				type: "bar",
				data: daily,
				barWidth: "60%",
				itemStyle: { color: COLORS.primary },
			},
			{
				name: "累计投稿数",
				type: "line",
				yAxisIndex: 1,
				data: cumulative,
				showSymbol: false,
				lineStyle: { color: COLORS.accent, width: 2 },
				itemStyle: { color: COLORS.accent },
			},
		],
	};
}
