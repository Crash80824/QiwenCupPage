 
import { valueAxis, COLORS, SCORE_MAX } from "../../../scripts/theme.js";

export function buildJudgeQuadrantOption({ judges, medCount, medAvg }, theme) {
	return {
		grid: { left: 36, right: 16, bottom: 48, top: 30, containLabel: true },
		xAxis: valueAxis("参评数", theme, { nameGap: 30, min: 0 }),
		yAxis: valueAxis("平均评分", theme, {
			nameGap: 28,
			min: 6,
			max: SCORE_MAX,
		}),
		series: [
			{
				type: "scatter",
				data: judges.map((j) => ({
					name: j.name,
					value: [j.count, j.avg],
					count: j.count,
					avg: j.avg,
					min: j.min,
					max: j.max,
					std: j.std,
				})),
				symbolSize: 14,
				itemStyle: {
					color: COLORS.highlight,
					opacity: 0.85,
					borderColor: theme.card,
					borderWidth: 0.5,
				},
				emphasis: { disabled: true },
				markLine: {
					z: 30, 
					silent: true,
					symbol: "none",
					data: [
						{
							xAxis: medCount,
							lineStyle: { color: theme.sub, type: "dashed" },
							label: {
								formatter: "中位参评数",
								color: theme.sub,
								fontSize: 10,
							},
						},
						{
							yAxis: medAvg,
							lineStyle: { color: theme.sub, type: "dashed" },
							label: {
								formatter: "中位均分",
								color: theme.sub,
								fontSize: 10,
								position: "insideEndBottom",
							},
						},
					],
				},
			},
		],
	};
}
