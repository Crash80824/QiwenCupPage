 
import {
	tooltip,
	colorBar,
	magmaScatter,
	COLORS,
	valueAxis,
} from "../../../scripts/theme.js";
import {
	niceStep,
	paddedRange,
	medianOf,
	linearFit,
} from "../../../scripts/math.js";

 
 
function trimMax(axisMax, step, dataMax) {
	const lastTick = Math.floor(axisMax / step) * step;
	return axisMax - lastTick < 0.5 * step && lastTick >= dataMax
		? lastTick
		: axisMax;
}

 
function trimMin(axisMin, step, dataMin) {
	const firstTick = Math.ceil(axisMin / step) * step;
	return firstTick - axisMin < 0.5 * step && firstTick <= dataMin
		? firstTick
		: axisMin;
}

function trimAxisEnds(dataMin, dataMax, axisMin, axisMax) {
	if (!Number.isFinite(axisMin) || !Number.isFinite(axisMax)) {
		return { min: axisMin, max: axisMax, step: null };
	}
	const step = niceStep(axisMin, axisMax);
	if (!(step >= 1)) return { min: axisMin, max: axisMax, step: null };
	return {
		min: trimMin(axisMin, step, dataMin),
		max: trimMax(axisMax, step, dataMax),
		step,
	};
}

const SIZE_RANGE = [6, 36]; 

 
export function buildCorrOption(
	{ threads, users },
	theme,
	{ xMetric, yMetric, sizeMetric, colorMetric, cutoff },
) {
	const userByUid = new Map(users.map((u) => [u.uid, u]));
	const pts = [];
	let sMin = Infinity;
	let sMax = -Infinity;
	let cMin = Infinity;
	let cMax = -Infinity;
	for (const r of threads) {
		const u = userByUid.get(r.uid);
		const x = xMetric.get(r, u, cutoff);
		const y = yMetric.get(r, u, cutoff);
		if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
		let s = null;
		let c = null;
		if (sizeMetric) {
			s = sizeMetric.get(r, u, cutoff);
			if (!Number.isFinite(s)) continue;
			if (s < sMin) sMin = s;
			if (s > sMax) sMax = s;
		}
		if (colorMetric) {
			c = colorMetric.get(r, u, cutoff);
			if (!Number.isFinite(c)) continue;
			if (c < cMin) cMin = c;
			if (c > cMax) cMax = c;
		}
		pts.push({
			value: [x, y, s, c],
			title: r.title || "",
			username: r.username || "",
		});
	}

	 
	let line = [];
	let xMin = NaN;
	let xMax = NaN;
	let yMin = NaN;
	let yMax = NaN;
	const n = pts.length;
	const xs = pts.map((p) => p.value[0]);
	const ys = pts.map((p) => p.value[1]);
	if (n >= 1) {
		xMin = Math.min(...xs);
		xMax = Math.max(...xs);
		yMin = Math.min(...ys);
		yMax = Math.max(...ys);
	}
	const fit = linearFit(xs, ys);
	if (fit) {
		line = [
			[xMin, +(fit.a * xMin + fit.b).toFixed(2)],
			[xMax, +(fit.a * xMax + fit.b).toFixed(2)],
		];
		
		yMin = Math.min(yMin, line[0][1], line[1][1]);
		yMax = Math.max(yMax, line[0][1], line[1][1]);
	}

	const xPad = paddedRange(xMin, xMax, true);
	const yPad = paddedRange(yMin, yMax, true);
	const xAx = trimAxisEnds(xMin, xMax, xPad[0], xPad[1]);
	const yAx = trimAxisEnds(yMin, yMax, yPad[0], yPad[1]);

	const formatVal = (v, m) => {
		if (m.unit === "%") return `${v.toFixed(2)}%`;
		if (Number.isInteger(v)) return String(v);
		return (+v.toFixed(2)).toString();
	};

	
	const tickLabel = (m) =>
		m.unit === "%"
			? (v) => {
					const s = (+v).toFixed(1);
					return s.endsWith(".0") ? s.slice(0, -2) : s;
				}
			: (v) => String(Math.round(v));

	const hasColor = !!colorMetric;
	const hasSize = !!sizeMetric;

	
	let symbolSize;
	if (hasSize) {
		const span = sMax - sMin || 1;
		const base = SIZE_RANGE[0];
		const amp = SIZE_RANGE[1] - SIZE_RANGE[0];
		symbolSize = (d) => {
			const v = d && d[2];
			if (v == null || !Number.isFinite(v)) return base;
			return base + Math.sqrt(Math.max((v - sMin) / span, 0)) * amp;
		};
	} else {
		symbolSize = 9;
	}

	const scatterItemStyle = {
		opacity: 0.7,
		borderColor: theme.card,
		borderWidth: 0.5,
	};
	
	if (!hasColor) scatterItemStyle.color = COLORS.primary;

	const option = {
		tooltip: tooltip({
			trigger: "item",
			formatter: (p) => {
				const d = p.data;
				if (Array.isArray(d)) {
					return `线性拟合<br/>${xMetric.label}: ${formatVal(d[0], xMetric)}<br/>${yMetric.label}: ${formatVal(d[1], yMetric)}`;
				}
				const v = d.value;
				let html = `${d.title}<br/>作者: ${d.username}<br/>${xMetric.label}: ${formatVal(v[0], xMetric)}<br/>${yMetric.label}: ${formatVal(v[1], yMetric)}`;
				if (sizeMetric)
					html += `<br/>${sizeMetric.label}: ${formatVal(v[2], sizeMetric)}`;
				if (colorMetric)
					html += `<br/>${colorMetric.label}: ${formatVal(v[3], colorMetric)}`;
				return html;
			},
		}),
		
		grid: {
			left: 60,
			right: hasColor ? 72 : 16,
			bottom: 48,
			top: 8,
		},
		xAxis: valueAxis(xMetric.label, theme, {
			min: Math.max(0, xAx.min),
			max: xAx.max,
			...(xAx.step ? { interval: xAx.step } : { minInterval: 1 }),
			axisLabel: { color: theme.sub, formatter: tickLabel(xMetric) },
		}),
		yAxis: valueAxis(yMetric.label, theme, {
			min: Math.max(0, yAx.min),
			max: yAx.max,
			nameGap: 42,
			...(yAx.step ? { interval: yAx.step } : { minInterval: 1 }),
			axisLabel: { color: theme.sub, formatter: tickLabel(yMetric) },
		}),
		series: [
			{
				name: "帖子",
				type: "scatter",
				data: pts,
				symbolSize,
				itemStyle: scatterItemStyle,
			},
			{
				name: "线性拟合",
				type: "line",
				data: line,
				showSymbol: false,
				smooth: false,
				lineStyle: { color: COLORS.accent, width: 2, type: "dashed" },
				itemStyle: { color: COLORS.accent },
			},
		],
	};

	
	if (hasColor) {
		const cLo = Number.isFinite(cMin) ? cMin : 0;
		let cHi = Number.isFinite(cMax) ? cMax : cLo + 1;
		if (!(cHi > cLo)) cHi = cLo + 1;
		option.visualMap = colorBar(theme, {
			min: cLo,
			max: cHi,
			color: magmaScatter(theme),
			text: colorMetric.label,
			dimension: 3,
			seriesIndex: 0,
		});
	}
	
	option.stats = {
		n,
		fit,
		xMetric,
		yMetric,
		sizeMetric,
		colorMetric,
		xMean: n ? xs.reduce((a, b) => a + b, 0) / n : NaN,
		yMean: n ? ys.reduce((a, b) => a + b, 0) / n : NaN,
		xMed: medianOf(xs),
		yMed: medianOf(ys),
	};

	return option;
}
