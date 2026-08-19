 
import { tooltip, valueAxis, COLORS } from "../../../scripts/theme.js";
import { isAuthorMetric } from "../correlation.js";

export function buildHistOption(
	{ barData, total },
	theme,
	{ m, format, formatTick, binStart, binEnd, bw, labelStep },
) {
	
	const countLabel = isAuthorMetric(m) ? "参赛者" : "作品数";
	const countUnit = isAuthorMetric(m) ? "人" : "篇";
	return {
		tooltip: tooltip({
			trigger: "item",
			formatter: (p) => {
				const d = p.data;
				const pct = ((d.cnt / total) * 100).toFixed(1);
				return `${m.label}<br/>[${format(d.lo)} – ${format(d.hi)})<br/>${countLabel}：${d.cnt} ${countUnit}（${pct}%）`;
			},
		}),
		grid: { left: 48, right: 16, bottom: 48, top: 30, containLabel: true },
		xAxis: valueAxis(m.label, theme, {
			min: Math.max(0, binStart),
			max: binEnd,
			interval: bw * labelStep,
			
			axisLabel: { color: theme.sub, formatter: formatTick },
			splitLine: { show: false },
		}),
		yAxis: valueAxis(countLabel, theme, {
			nameGap: 38,
			min: 0,
			minInterval: 1,
			axisLabel: { color: theme.sub, formatter: (v) => String(Math.round(v)) },
		}),
		series: [
			{
				name: countLabel,
				type: "bar",
				data: barData,
				itemStyle: { color: COLORS.primary, opacity: 0.85 },
				emphasis: { itemStyle: { color: COLORS.primaryDark } },
			},
		],
	};
}
