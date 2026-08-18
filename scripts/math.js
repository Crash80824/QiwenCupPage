 

 
export function niceNum(x, round) {
	if (x === 0) return 0;
	const sign = x < 0 ? -1 : 1;
	const ax = Math.abs(x);
	const exp = Math.floor(Math.log10(ax));
	const f = ax / 10 ** exp;
	let nf;
	if (round) {
		if (f < 1.5) nf = 1;
		else if (f < 3) nf = 2;
		else if (f < 7) nf = 5;
		else nf = 10;
	} else if (f <= 1) nf = 1;
	else if (f <= 2) nf = 2;
	else if (f <= 5) nf = 5;
	else nf = 10;
	return sign * nf * 10 ** exp;
}

 
export function niceStep(min, max) {
	const span = max - min;
	if (!(span > 0)) return null;
	return niceNum(span / 5, true);
}

 
export function paddedRange(min, max, clampZero = false) {
	if (!Number.isFinite(min) || !Number.isFinite(max)) return [null, null];
	let lo;
	let hi;
	if (min === max) {
		const pad = Math.abs(min) * 0.1 || 1;
		lo = min - pad;
		hi = max + pad;
	} else {
		const pad = (max - min) * 0.1;
		lo = min - pad;
		hi = max + pad;
	}
	if (clampZero && lo < 0) lo = 0;
	return [Math.floor(lo), Math.ceil(hi)];
}

 
export function safeInt(v) {
	const n = parseInt(v, 10);
	return Number.isFinite(n) ? n : 0;
}

 
export function ratio(num, den) {
	return Number.isFinite(num) && Number.isFinite(den) && den !== 0
		? num / den
		: NaN;
}

 
export function fmtDec2(v) {
	if (!Number.isFinite(v)) return "—";
	return (+v.toFixed(2)).toLocaleString("en-US");
}

 
export function fmtStat(v, unit) {
	if (!Number.isFinite(v)) return "—";
	if (unit === "%") return `${(+v).toFixed(2)}%`;
	const av = Math.abs(v);
	if (av >= 100) return Math.round(v).toLocaleString("en-US");
	if (av >= 10) return (+v.toFixed(1)).toLocaleString("en-US");
	return (+v.toFixed(2)).toLocaleString("en-US");
}

 
export function percentile(sorted, p) {
	if (!sorted.length) return NaN;
	const idx = (sorted.length - 1) * p;
	const lo = Math.floor(idx);
	const hi = Math.ceil(idx);
	return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

 
export function medianOf(arr) {
	if (!arr.length) return NaN;
	const s = [...arr].sort((a, b) => a - b);
	const m = Math.floor(s.length / 2);
	return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

 
export function trimmedMean(vals) {
	if (vals.length >= 3) {
		const s = [...vals].sort((a, b) => a - b).slice(1, -1);
		return s.reduce((a, b) => a + b, 0) / s.length;
	}
	return vals.reduce((a, b) => a + b, 0) / vals.length;
}

 
export function stddev(values) {
	if (!values.length) return NaN;
	const mean = values.reduce((a, v) => a + v, 0) / values.length;
	return Math.sqrt(
		values.reduce((a, v) => a + (v - mean) ** 2, 0) / values.length,
	);
}

 
export function linearFit(xs, ys) {
	const n = xs.length;
	if (n < 2) return null;
	const sx = xs.reduce((p, x) => p + x, 0);
	const sy = ys.reduce((p, y) => p + y, 0);
	const sxx = xs.reduce((p, x) => p + x * x, 0);
	const sxy = xs.reduce((p, x, i) => p + x * ys[i], 0);
	const denom = n * sxx - sx * sx;
	if (denom === 0) return null;
	const a = (n * sxy - sx * sy) / denom;
	const b = (sy - a * sx) / n;
	const meanY = sy / n;
	const ssRes = xs.reduce((p, x, i) => p + (ys[i] - (a * x + b)) ** 2, 0);
	const ssTot = ys.reduce((p, y) => p + (y - meanY) ** 2, 0);
	const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;
	return { a, b, r2 };
}

 
export function autoBinWidth(mn, mx) {
	const span = mx - mn;
	if (!(span > 0)) return 1;
	return niceNum(span / 20, true);
}

 
export function binCountFor(mn, mx, bw) {
	if (!(bw > 0) || !(mx > mn)) return 1;
	const start = Math.floor(mn / bw) * bw;
	return Math.max(1, Math.ceil((mx - start) / bw));
}

 
export function computeBins(vals, nBinsHint) {
	const MAX_BINS = 500;
	const mn = vals.length ? Math.min(...vals) : 0;
	const mx = vals.length ? Math.max(...vals) : 0;
	const span = mx - mn;
	let bw, binStart, nBins;
	if (nBinsHint && nBinsHint > 0) {
		
		nBins = Math.min(Math.max(nBinsHint, 1), MAX_BINS);
		bw = span > 0 ? span / nBins : 1;
		binStart = Math.max(0, mn);
	} else {
		
		bw = autoBinWidth(mn, mx);
		if (!(bw > 0)) bw = 1;
		if (binCountFor(mn, mx, bw) > MAX_BINS) {
			
			binStart = Math.max(0, mn);
			nBins = MAX_BINS;
			bw = span > 0 ? span / nBins : 1;
		} else {
			binStart = Math.max(0, Math.floor(mn / bw) * bw);
			nBins = binCountFor(binStart, mx, bw);
		}
	}
	return { binStart, bw, nBins };
}

 
function groupEntries(entries) {
	const byKey = new Map();
	for (const e of entries) {
		if (!byKey.has(e.key)) byKey.set(e.key, []);
		byKey.get(e.key).push(+e.value);
	}
	return byKey;
}
 
export function statsByGroup(entries) {
	const byKey = groupEntries(entries);
	const out = [];
	for (const [key, values] of byKey) {
		const sorted = [...values].sort((a, b) => a - b);
		const sum = values.reduce((a, b) => a + b, 0);
		out.push({
			key,
			count: values.length,
			avg: sum / values.length,
			min: sorted[0],
			max: sorted[sorted.length - 1],
			q1: percentile(sorted, 0.25),
			median: percentile(sorted, 0.5),
			q3: percentile(sorted, 0.75),
			std: stddev(values),
			range: sorted[sorted.length - 1] - sorted[0],
			values,
		});
	}
	return out;
}

 
export function meanByGroup(entries) {
	const byKey = groupEntries(entries);
	const out = {};
	for (const [key, values] of byKey) {
		out[key] = trimmedMean(values);
	}
	return out;
}
