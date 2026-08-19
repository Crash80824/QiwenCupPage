 
import {
	valueAxis,
	catAxis,
	COLORS,
	SCORE_MIN,
	SCORE_MAX,
} from "../../../scripts/theme.js";

export function buildJudgeDistributionOption(
	{ judges, summaries, overall },
	theme,
) {
	return {
		grid: { left: 10, right: 16, bottom: 48, top: 24, containLabel: true },
		xAxis: valueAxis("分数", theme, {
			nameGap: 30,
			min: SCORE_MIN,
			max: SCORE_MAX,
		}),
		yAxis: catAxis(judges, theme, {
			inverse: true,
			axisLabel: { color: theme.sub, fontSize: 11 },
			splitLine: { show: false },
		}),
		series: [
			{
				name: "评分分布",
				type: "boxplot",
				data: summaries,
				itemStyle: {
					color: COLORS.primarySoft,
					borderColor: COLORS.primary,
				},
				emphasis: { disabled: true },
				markLine: {
					silent: true,
					symbol: "none",
					data: [{ xAxis: overall, label: { show: false } }],
					lineStyle: { color: theme.sub, type: "dashed", width: 1 },
				},
			},
		],
	};
}
