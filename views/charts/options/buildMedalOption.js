 
import { tooltip, COLORS } from "../../../scripts/theme.js";

 
export function buildMedalOption({ root }, theme, { metric }) {
	const key = metric === "favs" ? "favs" : "views";
	
	const valueTree = {
		...root,
		children: root.children.map((b) => ({
			...b,
			children: b.children.map((lf) => ({ ...lf, value: lf[key] })),
		})),
	};
	const formatNum = (n) => (n ?? 0).toLocaleString();
	return {
		tooltip: tooltip({
			trigger: "item",
			formatter: (p) => {
				const d = p.data;
				if (d.works != null) {
					
					const multi = d.works > 1;
					const viewLabel = multi ? "总浏览量" : "浏览量";
					const favLabel = multi ? "总收藏量" : "收藏量";
					const parts = [
						d.name,
						`${viewLabel}：${formatNum(d.views)}`,
						`${favLabel}：${formatNum(d.favs)}`,
					];
					if (multi) parts.push(`作品：${d.works} 篇`);
					return parts.join("<br/>");
				}
				if (d.total != null) {
					return `${d.name}<br/>参赛者：${d.total} 人<br/>总浏览量：${formatNum(d.views)}<br/>总收藏量：${formatNum(d.favs)}`;
				}
				if (d.children)
					return `${d.name}<br/>参赛者：${d.children.length} 人<br/>总浏览量：${formatNum(d.views)}<br/>总收藏量：${formatNum(d.favs)}`;
				return d.name;
			},
		}),
		series: [
			{
				type: "sunburst",
				data: [valueTree],
				radius: ["16%", "90%"],
				center: ["50%", "50%"],
				nodeClick: false,
				label: {
					rotate: "tangential",
					color: COLORS.onGold,
					fontSize: 10,
					minAngle: 5,
				},
				levels: [
					{}, 
					{
						
						r0: "0%",
						r: "16%",
						label: { show: false },
						itemStyle: { borderWidth: 2, borderColor: theme.card },
					},
					{
						
						r0: "16%",
						r: "46%",
						label: {
							rotate: "tangential",
							fontSize: 12,
							fontWeight: "bold",
						},
						itemStyle: { borderWidth: 2, borderColor: theme.card },
					},
					{
						
						r0: "46%",
						r: "90%",
						label: { show: false },
						itemStyle: { borderWidth: 1, borderColor: theme.card },
					},
				],
				emphasis: { focus: "ancestor" },
			},
		],
		graphic: {
			elements: [
				{
					type: "text",
					left: "center",
					top: "middle",
					silent: true,
					style: {
						text: "全部参赛者",
						fill: COLORS.onGold,
						font: "bold 11px sans-serif",
						textAlign: "center",
						textVerticalAlign: "middle",
					},
				},
			],
		},
	};
}
