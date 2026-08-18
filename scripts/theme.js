 
import { hexToRGB } from "./utils.js";
 
function readVar(name) {
	return getComputedStyle(document.documentElement)
		.getPropertyValue(name)
		.trim();
}

 
export const MAGMA = [
	"#000004",
	"#180f3d",
	"#451077",
	"#721f81",
	"#9e2f7f",
	"#cd4071",
	"#f1605d",
	"#fd9467",
	"#feca8d",
	"#fcfdbf",
];

 
export function magmaScatter(theme) {
	return theme.dark ? MAGMA.slice(2) : MAGMA.slice(0, -1);
}

 
export function magmaRGB(t) {
	const x = Math.max(0, Math.min(1, t || 0));
	const n = MAGMA.length - 1;
	const pos = x * n;
	const i = Math.min(Math.floor(pos), n - 1);
	const f = pos - i;
	const a = hexToRGB(MAGMA[i]);
	const b = hexToRGB(MAGMA[i + 1]);
	return [
		Math.round(a[0] + (b[0] - a[0]) * f),
		Math.round(a[1] + (b[1] - a[1]) * f),
		Math.round(a[2] + (b[2] - a[2]) * f),
	];
}

 
export const ROSE_PALETTE = [
	"#4b6cf7", 
	"#6d7cf2", 
	"#8b8ae8", 
	"#7aa3e8", 
	"#5e93c9", 
	"#5f9e8e", 
	"#93a86a", 
	"#c8a25c", 
	"#d98324", 
	"#e2715c", 
	"#c35f96", 
	"#9660c9", 
];

 
export const COLORS = {
	primary: "#4b6cf7",
	accent: "#d98324",
	highlight: "#e2705c",
	primaryDark: "#3a51c7",
	
	primarySoft: "rgba(75,108,247,0.3)",
	
	stackColors: ["#9660c9", "#4b6cf7", "#5f9e8e", "#d98324"],
	
	danger: "#b03a1f",
	
	neutral: "#9aa3ad",
	
	treemapRoot: "#b07aa1",
	
	onGold: "#fff",
};

 
export const SCORE_MIN = 0;
export const SCORE_MAX = 10;

 
export function valueAxis(name, theme, opts = {}) {
	const axis = {
		type: "value",
		name,
		nameLocation: "middle",
		nameGap: opts.nameGap ?? 30,
		nameTextStyle: opts.nameTextStyle ?? { color: theme.sub },
		axisLabel: opts.axisLabel ?? { color: theme.sub },
		axisLine: opts.axisLine ?? { lineStyle: { color: theme.axis } },
		splitLine: opts.splitLine ?? { lineStyle: { color: theme.split } },
	};
	if (opts.min !== undefined) axis.min = opts.min;
	if (opts.max !== undefined) axis.max = opts.max;
	if (opts.minInterval !== undefined) axis.minInterval = opts.minInterval;
	if (opts.interval !== undefined) axis.interval = opts.interval;
	if (opts.position) axis.position = opts.position;
	if (opts.inverse !== undefined) axis.inverse = opts.inverse;
	if (opts.axisTick !== undefined) axis.axisTick = opts.axisTick;
	return axis;
}

 
export function catAxis(data, theme, opts = {}) {
	const axis = {
		type: "category",
		data,
		axisLabel: opts.axisLabel ?? { color: theme.sub },
		axisLine: opts.axisLine ?? { lineStyle: { color: theme.axis } },
	};
	if (opts.splitLine !== undefined) axis.splitLine = opts.splitLine;
	if (opts.inverse !== undefined) axis.inverse = opts.inverse;
	if (opts.name) {
		axis.name = opts.name;
		axis.nameLocation = opts.nameLocation ?? "middle";
		axis.nameGap = opts.nameGap ?? 12;
		axis.nameTextStyle = opts.nameTextStyle ?? {
			color: theme.sub,
			fontSize: 12,
		};
	} else {
		if (opts.nameLocation !== undefined) axis.nameLocation = opts.nameLocation;
		if (opts.nameGap !== undefined) axis.nameGap = opts.nameGap;
	}
	if (opts.nameRotate !== undefined) axis.nameRotate = opts.nameRotate;
	if (opts.axisTick !== undefined) axis.axisTick = opts.axisTick;
	if (opts.axisLabel !== undefined) axis.axisLabel = opts.axisLabel;
	if (opts.axisLine !== undefined) axis.axisLine = opts.axisLine;
	if (opts.boundaryGap !== undefined) axis.boundaryGap = opts.boundaryGap;
	if (opts.splitArea !== undefined) axis.splitArea = opts.splitArea;
	if (opts.position) axis.position = opts.position;
	return axis;
}

 
export function theme() {
	const dark = document.documentElement.getAttribute("data-theme") === "dark";
	return {
		dark,
		text: readVar("--text"),
		sub: readVar("--sub"),
		axis: readVar("--axis"),
		split: readVar("--split"),
		card: readVar("--card"),
		ttBg: readVar("--tt-bg"),
		ttBorder: readVar("--tt-border"),
		ttText: readVar("--text"),
		nullColor: readVar("--null"),
	};
}

 
export function tooltip(obj) {
	const t = theme();
	return Object.assign(
		{
			backgroundColor: t.ttBg,
			borderColor: t.ttBorder,
			borderWidth: 1,
			textStyle: { color: t.ttText },
			extraCssText: "box-shadow: 0 2px 8px rgba(0,0,0,0.15);",
			
			confine: true,
		},
		obj,
	);
}

 
export function colorBar(
	theme,
	{
		min,
		max,
		color,
		text = "",
		fontSize = 11,
		right = 8,
		itemHeight = 160,
		dimension,
		seriesIndex,
	},
) {
	const vm = {
		type: "continuous",
		min,
		max,
		calculable: false,
		hoverLink: false,
		orient: "vertical",
		right,
		top: "center",
		itemWidth: 13,
		itemHeight,
		text: [text, ""],
		textStyle: { color: theme.sub, fontSize },
		inRange: { color },
	};
	if (dimension !== undefined) vm.dimension = dimension;
	if (seriesIndex !== undefined) vm.seriesIndex = seriesIndex;
	return vm;
}
