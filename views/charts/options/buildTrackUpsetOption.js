 
import { tooltip, COLORS } from "../../../scripts/theme.js";

export function buildTrackUpsetOption(
	{
		tracks,
		setSizes,
		intersections,
		interLabels,
		interSizes,
		dotData,
		lineData,
		total,
		maxInter,
		maxSet,
	},
	theme,
	{ layout, comboTip },
) {
	return {
		tooltip: tooltip({
			trigger: "item",
			formatter: (p) => {
				if (p.seriesName === "矩阵")
					return comboTip(intersections[p.data.interIdx]);
				if (p.seriesName === "交集大小")
					return comboTip(intersections[p.dataIndex]);
				if (p.seriesName === "集合大小") {
					const i = p.dataIndex;
					const pct = ((setSizes[i] / total) * 100).toFixed(1);
					return `${tracks[i]}<br/>投稿数：${setSizes[i]}（${pct}%）`;
				}
				return "";
			},
		}),
		xAxis: [
			{
				gridIndex: 0,
				type: "category",
				data: interLabels,
				position: "bottom",
				axisLabel: { show: false },
				axisLine: { show: true, lineStyle: { color: theme.axis } },
				axisTick: { show: false },
				splitLine: { show: false },
			},
			{
				gridIndex: 1,
				type: "value",
				position: "bottom",
				min: 0,
				max: maxSet * 1.5,
				axisLabel: { show: false },
				axisLine: { show: false },
				axisTick: { show: false },
				splitLine: { show: false },
			},
			{
				gridIndex: 2,
				type: "category",
				data: interLabels,
				position: "bottom",
				axisLabel: { show: false },
				axisLine: { show: true, lineStyle: { color: theme.axis } },
				axisTick: { show: false },
				splitLine: { show: false },
			},
		],
		yAxis: [
			{
				gridIndex: 0,
				type: "value",
				position: "left",
				min: 0,
				max: maxInter * 1.2,
				axisLabel: { show: false },
				axisLine: { show: false },
				axisTick: { show: false },
				splitLine: { show: false },
			},
			{
				gridIndex: 1,
				type: "category",
				data: tracks,
				inverse: true,
				position: "left",
				axisLabel: { color: theme.text, fontSize: 12 },
				axisLine: { show: true, lineStyle: { color: theme.axis } },
				axisTick: { show: false },
				splitLine: { show: false },
			},
			{
				gridIndex: 2,
				type: "category",
				data: tracks,
				inverse: true,
				position: "left",
				axisLabel: { show: false },
				axisLine: { show: true, lineStyle: { color: theme.axis } },
				axisTick: { show: false },
				splitLine: { show: false },
			},
			
			{
				gridIndex: 2,
				type: "category",
				data: tracks,
				inverse: true,
				position: "right",
				axisLabel: { show: false },
				axisLine: { show: true, lineStyle: { color: theme.axis } },
				axisTick: { show: false },
				splitLine: { show: false },
			},
		],
		grid: layout.grid,
		series: [
			{
				name: "交集大小",
				type: "bar",
				xAxisIndex: 0,
				yAxisIndex: 0,
				data: interSizes,
				barWidth: "62%",
				itemStyle: { color: COLORS.primary },
				label: {
					show: true,
					position: "top",
					color: theme.sub,
					fontSize: 11,
					formatter: "{c}",
				},
			},
			{
				name: "集合大小",
				type: "bar",
				xAxisIndex: 1,
				yAxisIndex: 1,
				data: setSizes,
				barWidth: "62%",
				itemStyle: { color: COLORS.primary },
				label: {
					show: true,
					position: "right",
					color: theme.sub,
					fontSize: 11,
					formatter: "{c}",
				},
			},
			{
				name: "矩阵",
				type: "scatter",
				xAxisIndex: 2,
				yAxisIndex: 2,
				data: dotData,
				symbolSize: layout.dotSize,
				itemStyle: {
					color: COLORS.primary,
					borderColor: theme.card,
					borderWidth: 1,
				},
			},
			{
				name: "连线",
				type: "custom",
				xAxisIndex: 2,
				yAxisIndex: 2,
				data: lineData,
				silent: true,
				z: 1,
				renderItem: (_params, api) => {
					const xName = api.value(0);
					const yLo = api.value(1);
					const yHi = api.value(2);
					const p1 = api.coord([xName, yLo]);
					const p2 = api.coord([xName, yHi]);
					return {
						type: "line",
						shape: {
							x1: p1[0],
							y1: p1[1],
							x2: p2[0],
							y2: p2[1],
						},
						style: { stroke: COLORS.primary, lineWidth: 2 },
					};
				},
			},
		],
	};
}
