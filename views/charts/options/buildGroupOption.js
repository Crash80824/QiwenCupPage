 
import { tooltip, COLORS } from "../../../scripts/theme.js";

 
export function buildGroupOption({ groups }, theme, { metric, stat = "avg" }) {
	const names = groups.map((g) => g.name);
	const isFav = metric === "favs";
	const isMed = stat === "med";
	const statLabel = isMed ? "中位" : "平均";
	const field = isFav ? "Favs" : "Views";
	const barLabel = `${statLabel}${isFav ? "收藏量" : "浏览量"}`;
	const barColor = COLORS.primary;
	const pick = (g, f) => (isMed ? g[`med${f}`] : g[`avg${f}`]);
	return {
		tooltip: tooltip({
			trigger: "axis",
			axisPointer: { type: "shadow" },
			formatter: (ps) => {
				const g = groups[ps[0].dataIndex];
				return `${g.name}<br/>参赛者：${g.authors} 人<br/>投稿数：${g.works} 篇<br/>${statLabel}浏览量：${Math.round(pick(g, "Views"))}<br/>${statLabel}回复量：${pick(g, "Replies").toFixed(1)}<br/>${statLabel}收藏量：${pick(g, "Favs").toFixed(1)}`;
			},
		}),
		grid: { left: 60, right: 40, bottom: 52, top: 30 },
		xAxis: {
			type: "category",
			data: names,
			boundaryGap: true,
			axisLabel: { color: theme.sub, fontSize: 11, rotate: 30, interval: 0 },
			axisLine: { lineStyle: { color: theme.axis } },
			splitLine: { show: false },
		},
		yAxis: [
			{
				type: "value",
				name: `{a|■} ${barLabel}`,
				nameLocation: "end",
				nameGap: 10,
				nameTextStyle: {
					color: theme.text,
					fontSize: 12,
					rich: { a: { color: barColor } },
				},
				min: 0,
				axisLabel: { color: theme.sub },
				axisLine: { lineStyle: { color: theme.axis } },
				splitLine: { lineStyle: { color: theme.split } },
			},
			{
				type: "value",
				name: "{b|■} 作品数",
				nameLocation: "end",
				nameGap: 10,
				nameTextStyle: {
					color: theme.text,
					fontSize: 12,
					rich: { b: { color: COLORS.accent } },
				},
				position: "right",
				min: 0,
				axisLabel: { color: theme.sub, formatter: (v) => v },
				axisLine: { lineStyle: { color: theme.axis } },
				splitLine: { show: false },
			},
		],
		series: [
			{
				name: barLabel,
				type: "bar",
				barWidth: "55%",
				data: groups.map((g) => Math.round(pick(g, field))),
				itemStyle: { color: barColor },
			},
			{
				name: "作品数",
				type: "line",
				yAxisIndex: 1,
				data: groups.map((g) => g.works),
				itemStyle: { color: COLORS.accent },
				lineStyle: { width: 2 },
				symbolSize: 7,
			},
		],
	};
}
