 
import { tooltip, COLORS } from "../../../scripts/theme.js";

export function buildInactivityOption(
	{ rows, lastIndex },
	theme,
	{ top, bottom, dotR, maxAxis, currentMin, formatDate },
) {
	return {
		tooltip: tooltip({
			trigger: "item",
			formatter: (p) => {
				const r = rows[p.dataIndex];
				if (!r) return "";
				const lastLabel =
					r.source === "reg" ? "注册日（从未在本版发言）" : "上次本版发帖";
				return `${r.name}<br/>${lastLabel}：${formatDate(r.lastMs)}<br/>本次活动投稿：${formatDate(r.subMs)}<br/>间隔：约 ${Math.round(r.days)} 天`;
			},
		}),
		grid: {
			left: 48,
			right: 40,
			top,
			bottom,
			containLabel: true,
		},
		xAxis: [
			{
				type: "time",
				min: currentMin,
				max: maxAxis,
				axisLabel: { color: theme.sub },
				name: "日期",
				nameLocation: "middle",
				nameGap: 30,
				nameTextStyle: { color: theme.sub },
				axisLine: { show: true, lineStyle: { color: theme.axis } },
				axisTick: { show: true, length: 4, lineStyle: { color: theme.axis } },
				splitLine: { lineStyle: { color: theme.split } },
			},
			{
				
				type: "time",
				min: currentMin,
				max: maxAxis,
				position: "top",
				axisLine: { show: true, lineStyle: { color: theme.axis } },
				axisLabel: { show: false },
				axisTick: { show: false },
				splitLine: { show: false },
			},
		],
		yAxis: [
			{
				type: "category",
				data: rows.map((r) => r.name),
				inverse: true,
				min: -1,
				max: lastIndex,
				name: "参赛者",
				nameLocation: "middle",
				nameGap: 12,
				nameTextStyle: { color: theme.sub },
				axisLabel: { show: false },
				axisLine: { show: true, lineStyle: { color: theme.axis } },
				axisTick: { show: false },
			},
			{
				
				type: "category",
				data: rows.map((r) => r.name),
				inverse: true,
				min: -1,
				max: lastIndex,
				position: "right",
				axisLine: { show: true, lineStyle: { color: theme.axis } },
				axisLabel: { show: false },
				axisTick: { show: false },
			},
		],
		series: [
			{
				type: "custom",
				renderItem: (params, api) => {
					const idx = params.dataIndex;
					const lastMs = api.value(0);
					const subMs = api.value(1);
					const source = api.value(3);
					const p1 = api.coord([lastMs, idx]);
					const p2 = api.coord([subMs, idx]);
					const isReg = source === "reg";
					const leftColor = isReg ? COLORS.highlight : COLORS.neutral;
					const leftDot = {
						type: "circle",
						shape: { cx: p1[0], cy: p1[1], r: dotR },
						style: { fill: leftColor },
					};
					const rightDot = {
						type: "circle",
						shape: { cx: p2[0], cy: p2[1], r: dotR },
						style: { fill: COLORS.primary },
					};
					
					
					const dots = isReg ? [rightDot, leftDot] : [leftDot, rightDot];
					return {
						type: "group",
						children: [
							{
								type: "line",
								shape: { x1: p1[0], y1: p1[1], x2: p2[0], y2: p2[1] },
								style: { stroke: theme.axis, lineWidth: 2 },
							},
							...dots,
						],
					};
				},
				data: rows.map((r) => ({
					value: [r.lastMs, r.subMs, r.days, r.source],
				})),
				clip: true,
			},
		],
	};
}
