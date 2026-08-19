 
import { tooltip, ROSE_PALETTE } from "../../../scripts/theme.js";

export function buildRoseOption({ data }, theme, { isWeekday }) {
	const labels = isWeekday ? data.weekdayLabels : data.labels;
	const counts = isWeekday ? data.weekdayCounts : data.counts;
	const colors = ROSE_PALETTE.slice(0, labels.length);
	const items = labels.map((l, i) => ({
		name: l,
		value: counts[i],
		itemStyle: { color: colors[i] },
	}));
	return {
		tooltip: tooltip({
			trigger: "item",
			formatter: (p) => `${p.name}<br/>投稿数: ${p.value} (${p.percent}%)`,
		}),
		series: [
			{
				type: "pie",
				radius: ["0%", "68%"],
				center: ["50%", "52%"],
				roseType: "area", 
				startAngle: 90, 
				clockwise: true, 
				data: items,
				label: {
					position: "outside",
					formatter: "{b}\n{d}% ({c})",
					color: theme.text,
					fontSize: 11,
				},
				labelLine: {
					show: true,
					length: 10,
					length2: 16,
					lineStyle: { color: theme.sub },
				},
				itemStyle: { borderColor: theme.card, borderWidth: 1 },
				animationType: "scale",
				animationEasing: "elasticOut",
			},
		],
	};
}
