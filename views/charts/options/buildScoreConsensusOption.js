 
import {
	valueAxis,
	colorBar,
	magmaScatter,
	SCORE_MIN,
	SCORE_MAX,
} from "../../../scripts/theme.js";

export function buildScoreConsensusOption(
	{ works, medAvg, medStd, vMin, vMax },
	theme,
) {
	return {
		grid: { left: 48, right: 64, bottom: 48, top: 30, containLabel: true },
		xAxis: valueAxis("切尾均分", theme, {
			nameGap: 30,
			min: SCORE_MIN,
			max: SCORE_MAX,
		}),
		yAxis: valueAxis("标准差", theme, { nameGap: 38, min: 0 }),
		visualMap: colorBar(theme, {
			min: vMin === vMax ? vMin - 1 : vMin,
			max: vMin === vMax ? vMax + 1 : vMax,
			dimension: 2, 
			color: magmaScatter(theme),
			text: "浏览量",
		}),
		series: [
			{
				type: "scatter",
				data: works.map((w) => ({
					title: w.title,
					value: [w.avg, w.std, w.views],
					avg: w.avg,
					std: w.std,
					n: w.n,
					min: w.min,
					max: w.max,
					views: w.views,
				})),
				symbolSize: 12,
				itemStyle: {
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
							xAxis: medAvg,
							lineStyle: { color: theme.sub, type: "dashed" },
							label: {
								formatter: "中位均分",
								color: theme.sub,
								fontSize: 10,
								position: "insideMiddleTop",
							},
						},
						{
							yAxis: medStd,
							lineStyle: { color: theme.sub, type: "dashed" },
							label: {
								formatter: "中位标准差",
								color: theme.sub,
								fontSize: 10,
								position: "insideMiddleTop",
							},
						},
					],
				},
			},
		],
	};
}
