import { METRICS, KEY } from "./correlation.js";
import { MS_PER_DAY, formatDateISO } from "../../scripts/utils.js";
import {
	computeBins,
	medianOf,
	stddev,
	percentile,
} from "../../scripts/math.js";
import { buildGroupOption } from "./options/buildGroupOption.js";
import { buildMedalOption } from "./options/buildMedalOption.js";
import { buildHistOption } from "./options/buildHistOption.js";
import { buildRoseOption } from "./options/buildRoseOption.js";
import { buildTrendOption } from "./options/buildTrendOption.js";
import { buildWeekdayHourOption } from "./options/buildWeekdayHourOption.js";
import { buildPopularityStackOption } from "./options/buildPopularityStackOption.js";
import { buildScoreHeatmapOption } from "./options/buildScoreHeatmapOption.js";
import { buildJudgeQuadrantOption } from "./options/buildJudgeQuadrantOption.js";
import { buildJudgeDistributionOption } from "./options/buildJudgeDistributionOption.js";
import { buildScoreConsensusOption } from "./options/buildScoreConsensusOption.js";
import { buildInactivityOption } from "./options/buildInactivityOption.js";
import { buildTrackUpsetOption } from "./options/buildTrackUpsetOption.js";
import { buildCorrOption } from "./options/buildCorrOption.js";

import { createRangeSlider } from "./ui/rangeSlider.js";
import {
	openCorrDialog,
	openHistDialog,
	updateCorrCaption,
	updateHistCaption,
	histValues,
} from "./ui/dialogs.js";

 
const metricIdx = (key) => METRICS.findIndex((m) => m.key === key);

 
let userPopMetric = KEY.VIEWS;

 
let userPopStat = "avg";

 
const childRegistry = new Map(); 

 
function attachChild(cfgId, child) {
	if (!childRegistry.has(cfgId)) childRegistry.set(cfgId, []);
	childRegistry.get(cfgId).push(child);
	return child;
}

 
function disposeChildren(cfgId) {
	const list = childRegistry.get(cfgId);
	if (list) {
		for (const c of list) {
			try {
				c.dispose();
			} catch {
				 
			}
		}
		childRegistry.delete(cfgId);
	}
}

 
function childCharts() {
	const out = [];
	for (const list of childRegistry.values()) out.push(...list);
	return out;
}

 
function chartState(card, type, init) {
	card.__st = card.__st || {};
	return (card.__st[type] ??= init);
}

 

 
function gridRect(chart) {
	try {
		const model = chart.getModel();
		const gm = model && model.getComponent("grid", 0);
		const rect = gm && gm.coordinateSystem && gm.coordinateSystem.getRect();
		return rect || null;
	} catch (e) {
		console.debug("[renderers] gridRect 失败：", e);
		return null;
	}
}

 
function centerColorbar(chart, extra = {}) {
	const rect = gridRect(chart);
	if (!rect || !rect.height) return;
	const vmItemH = Math.max(Math.round(0.5 * rect.height), 40);
	const vmTop = Math.round(rect.y + (rect.height - vmItemH) / 2);
	chart.setOption({ visualMap: { top: vmTop, itemHeight: vmItemH, ...extra } });
}

 
function placeQuadrantLabels(chart, theme, medX, medY, labels) {
	const rect = gridRect(chart);
	let med;
	try {
		med = chart.convertToPixel({ xAxisIndex: 0, yAxisIndex: 0 }, [medX, medY]);
	} catch (e) {
		console.debug("[renderers] convertToPixel 失败：", e);
	}
	if (!rect || !med) return;
	const cx = [
		rect.x + (med[0] - rect.x) / 2,
		med[0] + (rect.x + rect.width - med[0]) / 2,
	];
	const cy = [
		rect.y + (med[1] - rect.y) / 2,
		med[1] + (rect.y + rect.height - med[1]) / 2,
	];
	const mk = (id, x, y, text) => ({
		id,
		type: "text",
		left: x,
		top: y,
		z: 100, 
		style: {
			text,
			fill: theme.sub,
			fontSize: 11,
			textAlign: "center",
			textVerticalAlign: "middle",
		},
	});
	chart.setOption({
		graphic: labels.map((l, i) =>
			mk("q" + i, cx[l.x] + (l.dx || 0), cy[l.y] + (l.dy || 0), l.text),
		),
	});
}

 
function reservedChartHeight(el) {
	const header = document.querySelector("header");
	const tabs = document.querySelector(".tabs");
	const head = el.closest(".card").querySelector(".card-head");
	return (
		(header ? header.offsetHeight : 0) +
		(tabs ? tabs.offsetHeight : 0) +
		(head ? head.offsetHeight : 0) +
		16 
	);
}

 
function viewportHeight() {
	return document.documentElement.clientHeight || window.innerHeight;
}
 
function shouldRefit(chart, cw) {
	if (chart._fitWidth !== undefined && Math.abs(cw - chart._fitWidth) < 1)
		return false;
	chart._fitWidth = cw;
	return true;
}
 
function plotHeightLimit(el, top, bottom) {
	const vh = viewportHeight();
	return Math.max(vh - reservedChartHeight(el) - top - bottom, 120);
}

 
 
function buildSegToggle(entries, { get, onChange }) {
	const seg = document.createElement("div");
	seg.className = "seg-toggle";
	for (const [key, label] of entries) {
		const btn = document.createElement("button");
		btn.type = "button";
		btn.textContent = label;
		if (get() === key) btn.classList.add("active");
		btn.addEventListener("click", () => {
			if (get() === key) return;
			onChange(key);
			seg.querySelectorAll("button").forEach((b) => b.classList.remove("active"));
			btn.classList.add("active");
		});
		seg.appendChild(btn);
	}
	return seg;
}

 
function computeCellSize({
	avail,
	cols,
	rows,
	minCellH,
	maxCell,
	plotHMax,
	squarify,
}) {
	const cellW = avail / cols;
	const rawCellH = plotHMax / rows;
	if (cellW < minCellH) {
		return { cellW, cellH: Math.min(minCellH, rawCellH) };
	}
	const cellH = Math.min(cellW, rawCellH, maxCell);
	return squarify ? { cellW: cellH, cellH } : { cellW, cellH };
}

const RENDERERS = {
	 
	trend(chart, cfg, theme) {
		chart.setOption(buildTrendOption(cfg.data, theme), true);
	},

	 
	rose(chart, cfg, theme) {
		const el = chart.getDom();
		const card = el.closest(".card");
		const data = cfg.data;

		
		const st = chartState(card, "rose", { mode: "hour" });

		el.classList.add("rose-chart");
		el.replaceChildren();

		
		const wrap = document.createElement("div");
		wrap.className = "userpop-controls";
		wrap.appendChild(
			buildSegToggle(
				[
					["hour", "时刻"],
					["weekday", "星期"],
				],
				{
					get: () => st.mode,
					onChange: (v) => {
						st.mode = v;
						draw();
					},
				},
			),
		);

		const holder = document.createElement("div");
		holder.className = "rose-holder";
		el.appendChild(wrap);
		el.appendChild(holder);

		const roseChart = attachChild(
			cfg.id,
			echarts.init(holder, null, { renderer: "canvas" }),
		);

		const draw = () => {
			const isWeekday = st.mode === "weekday";
			roseChart.setOption(buildRoseOption({ data }, theme, { isWeekday }), true);
		};
		draw();

		
		chart._customResize = () => roseChart.resize();
	},

	 
	correlation(chart, cfg, theme) {
		const el = chart.getDom();
		const card = el.closest(".card");
		el.style.position = "relative";

		
		
		const state = chartState(card, "corr", {
			x: metricIdx(KEY.VIEWS),
			y: metricIdx(KEY.OTHER_REPLIES),
			size: metricIdx(KEY.WORD_COUNT),
			color: metricIdx(KEY.FAVS),
		});

		
		setupMetaRow(card, "切换", () => openCorrDialog(card));

		
		const fitColorbar = () => {
			try {
				if (!chart.getModel().getComponent("visualMap", 0)) return; 
			} catch (_) {
				 
			}
			centerColorbar(chart);
		};
		const draw = () => {
			const xMetric = METRICS[state.x];
			const yMetric = METRICS[state.y];
			const sizeMetric = state.size == null ? null : METRICS[state.size];
			const colorMetric = state.color == null ? null : METRICS[state.color];
			const opt = buildCorrOption(
				{ threads: cfg.data.threads, users: cfg.data.users },
				theme,
				{ xMetric, yMetric, sizeMetric, colorMetric, cutoff: cfg.data.cutoff },
			);
			updateCorrCaption(card, opt.stats);
			chart.setOption(opt, true);
			fitColorbar();
		};
		chart._customResize = () => {
			chart.resize();
			fitColorbar();
		};
		state.draw = draw;
		draw();
	},

	 
	distribution_hist(chart, cfg, theme) {
		const el = chart.getDom();
		const card = el.closest(".card");
		el.style.position = "relative";

		const state = chartState(card, "hist", {
			varIdx: metricIdx(KEY.WORD_COUNT),
			nBins: null,
		});

		const userByUid = new Map(cfg.data.users.map((u) => [u.uid, u]));
		const ctx = {
			threads: cfg.data.threads,
			userByUid,
			cutoff: cfg.data.cutoff,
		};
		state.ctx = ctx;

		setupMetaRow(card, "切换", () => openHistDialog(card));

		const draw = () => {
			const m = METRICS[state.varIdx] || METRICS[metricIdx(KEY.WORD_COUNT)];
			const vals = histValues(ctx, m);
			const { binStart, bw, nBins } = computeBins(vals, state.nBins);
			const binEnd = binStart + nBins * bw;
			const counts = new Array(nBins).fill(0);
			for (const v of vals) {
				let idx = Math.floor((v - binStart) / bw);
				if (idx < 0) idx = 0;
				else if (idx >= nBins) idx = nBins - 1;
				counts[idx]++;
			}

			const format = formatMetricVal(m);
			const formatTick = formatMetricTick(m);
			const total = vals.length || 1;
			const barData = [];
			for (let i = 0; i < nBins; i++) {
				const lo = binStart + i * bw;
				const hi = binStart + (i + 1) * bw;
				const center = binStart + (i + 0.5) * bw;
				barData.push({ value: [center, counts[i]], lo, hi, cnt: counts[i] });
			}

			const labelStep = Math.max(1, Math.ceil(nBins / 15));
			chart.setOption(
				buildHistOption({ barData, total }, theme, {
					m,
					format,
					formatTick,
					binStart,
					binEnd,
					bw,
					labelStep,
				}),
				true,
			);
			state.nBinsUsed = nBins;
			state.bw = bw;
			fitBars(chart, nBins, bw);
			
			const sorted = [...vals].sort((a, b) => a - b);
			const stats = {
				n: vals.length,
				min: sorted[0],
				max: sorted.at(-1),
				mean: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : NaN,
				median: medianOf(vals),
				q1: percentile(sorted, 0.25),
				q3: percentile(sorted, 0.75),
				std: stddev(vals),
			};
			updateHistCaption(card, m, stats);
		};

		chart._customResize = () => {
			chart.resize();
			if (state.nBinsUsed) fitBars(chart, state.nBinsUsed, state.bw);
		};
		state.draw = draw;
		draw();
	},

	 
	score_heatmap(chart, cfg, theme) {
		const { titles, judges, cells } = cfg.data;
		const el = chart.getDom();
		el.style.padding = "0";
		
		const nullColor = theme.nullColor;
		const data = cells.map((c) => {
			
			const swapped = [c.value[1], c.value[0], c.value[2]];
			return c.score === null || c.score === undefined
				? {
						...c,
						value: swapped,
						itemStyle: { color: nullColor, borderWidth: 0 },
					}
				: { ...c, value: swapped };
		});
		const COLS = judges.length;
		const ROWS = titles.length;

		
		const LEFT = 44, 
			RIGHT = 60, 
			TOP = 12,
			BOTTOM = 44, 
			MIN_CELL_H = 24, 
			MAX_CELL = 60; 

		chart.setOption(
			buildScoreHeatmapOption({ data, judges, titles }, theme, {
				left: LEFT,
				right: RIGHT,
				top: TOP,
				bottom: BOTTOM,
			}),
			true,
		);

		 
		
		const fitCells = () => {
			const cw = el.clientWidth;
			if (!shouldRefit(chart, cw)) return;
			const avail = Math.max(cw - LEFT - RIGHT, 200);
			const plotHMax = plotHeightLimit(el, TOP, BOTTOM);
			const { cellH } = computeCellSize({
				avail,
				cols: COLS,
				rows: ROWS,
				minCellH: MIN_CELL_H,
				maxCell: MAX_CELL,
				plotHMax,
				squarify: false,
			});
			const plotH = cellH * ROWS;
			el.style.height = plotH + TOP + BOTTOM + "px";
			
			chart.setOption({
				grid: { left: LEFT, right: RIGHT, top: TOP, height: plotH },
			});
			chart.resize();
			centerColorbar(chart);
		};
		chart._customResize = fitCells;
		fitCells();
	},

	 
	judge_quadrant(chart, cfg, theme) {
		const { judges, medCount, medAvg } = cfg.data;
		
		chart.setOption(
			buildJudgeQuadrantOption({ judges, medCount, medAvg }, theme),
			true,
		);
		
		const quadrantLabels = [
			{ x: 0, y: 0, text: "佛系·宽松" },
			{ x: 1, y: 0, text: "勤奋·宽松" },
			{ x: 0, y: 1, text: "佛系·严格" },
			{ x: 1, y: 1, text: "勤奋·严格" },
		];
		const positionLabels = () =>
			placeQuadrantLabels(chart, theme, medCount, medAvg, quadrantLabels);
		positionLabels();
		chart._customResize = () => {
			chart.resize();
			positionLabels();
		};
	},

	 
	judge_distribution(chart, cfg, theme) {
		const { judges, summaries, overall } = cfg.data;
		chart.setOption(
			buildJudgeDistributionOption({ judges, summaries, overall }, theme),
			true,
		);
		
		const positionMeanLabel = () => {
			const rect = gridRect(chart);
			let xPx;
			try {
				xPx = chart.convertToPixel({ xAxisIndex: 0 }, overall);
			} catch (e) {
				console.debug("[renderers] convertToPixel 失败：", e);
			}
			if (!rect || xPx == null) return;
			chart.setOption({
				graphic: [
					{
						id: "meanLabel",
						type: "text",
						left: xPx - 12,
						top: rect.y - 12,
						style: {
							text: "整体均分",
							fill: theme.sub,
							fontSize: 10,
							textAlign: "center",
							textVerticalAlign: "bottom",
						},
					},
				],
			});
		};
		positionMeanLabel();
		chart._customResize = () => {
			chart.resize();
			positionMeanLabel();
		};
	},

	 
	score_consensus(chart, cfg, theme) {
		const { works, medAvg, medStd } = cfg.data;
		
		const views = works.map((w) => w.views || 0);
		const vMin = Math.min(...views);
		const vMax = Math.max(...views);
		chart.setOption(
			buildScoreConsensusOption({ works, medAvg, medStd, vMin, vMax }, theme),
			true,
		);
		
		const quadrantLabels = [
			{ x: 1, y: 0, dx: -12, text: "高分·争议" },
			{ x: 1, y: 1, dx: -12, dy: 12, text: "高分·共识" },
			{ x: 0, y: 0, text: "低分·争议" },
			{ x: 0, y: 1, dy: 12, text: "低分·共识" },
		];
		const positionLabels = () =>
			placeQuadrantLabels(chart, theme, medAvg, medStd, quadrantLabels);
		
		const fitColorbar = () => centerColorbar(chart);
		positionLabels();
		fitColorbar();
		chart._customResize = () => {
			chart.resize();
			positionLabels();
			fitColorbar();
		};
	},

	 
	popularity_stack(chart, cfg, theme) {
		const { rows } = cfg.data;
		chart.setOption(buildPopularityStackOption({ rows }, theme), true);
		
		chart.on("legendselectchanged", (params) => {
			const sel = params.selected || {};
			const names = Object.keys(sel);
			if (names.length && !names.some((n) => sel[n])) {
				chart.setOption({
					legend: { selected: { [params.name]: true } },
				});
			}
		});
	},
	 
	user_popularity(chart, cfg, theme) {
		const el = chart.getDom();
		el.classList.add("is-grow");
		
		el.replaceChildren();
		const splitEl = document.createElement("div");
		splitEl.className = "userpop-split";
		const paneA = document.createElement("div");
		const paneB = document.createElement("div");
		splitEl.appendChild(paneA);
		splitEl.appendChild(paneB);
		el.appendChild(splitEl);
		const bar = attachChild(
			cfg.id,
			echarts.init(paneA, null, { renderer: "canvas" }),
		);
		const sun = attachChild(
			cfg.id,
			echarts.init(paneB, null, { renderer: "canvas" }),
		);
		const render = () => {
			bar.setOption(
				buildGroupOption({ groups: cfg.data.group }, theme, {
					metric: userPopMetric,
					stat: userPopStat,
				}),
				true,
			);
			sun.setOption(
				buildMedalOption({ root: cfg.data.medal.root }, theme, {
					metric: userPopMetric,
				}),
				true,
			);
		};
		render();
		
		const topBar = document.createElement("div");
		topBar.className = "userpop-bar";
		topBar.appendChild(
			buildSegToggle(
				[
					["avg", "平均数"],
					["med", "中位数"],
				],
				{
					get: () => userPopStat,
					onChange: (v) => {
						userPopStat = v;
						render();
					},
				},
			),
		);
		topBar.appendChild(
			buildSegToggle(
				[
					[KEY.VIEWS, "浏览量"],
					[KEY.FAVS, "收藏量"],
				],
				{
					get: () => userPopMetric,
					onChange: (v) => {
						userPopMetric = v;
						render();
					},
				},
			),
		);
		el.insertBefore(topBar, splitEl);
		chart._customResize = () => {
			bar.resize();
			sun.resize();
		};
	},

	 
	weekday_hour(chart, cfg, theme) {
		const { xLabels, yLabels, cells, max } = cfg.data;
		const el = chart.getDom();
		el.style.padding = "0";
		const ROWS = 7,
			COLS = 12;
		chart.setOption(
			buildWeekdayHourOption({ xLabels, yLabels, cells, max }, theme),
			true,
		);

		 
		const LEFT = 40, 
			RIGHT = 64, 
			TOP = 12,
			MIN_CELL_H = 30, 
			MAX_CELL = 80, 
			CBAR_W = 53, 
			CBAR_GAP = 8, 
			BOTTOM_RESERVE = 92; 
		
		
		const computeCellGeometry = () => {
			const cw = el.clientWidth;
			if (!shouldRefit(chart, cw)) return null;
			const avail = Math.max(cw - LEFT - RIGHT, 120);
			const plotHMax = plotHeightLimit(el, TOP, BOTTOM_RESERVE);
			const { cellW, cellH } = computeCellSize({
				avail,
				cols: COLS,
				rows: ROWS,
				minCellH: MIN_CELL_H,
				maxCell: MAX_CELL,
				plotHMax,
				squarify: true,
			});
			const plotW = cellW * COLS;
			const plotH = cellH * ROWS;
			const capped = plotW < avail - 1; 
			let gridLeft, vmRight;
			if (capped) {
				gridLeft = Math.max((cw - (plotW + CBAR_GAP + CBAR_W)) / 2, LEFT);
				vmRight = cw - gridLeft - plotW - CBAR_GAP - CBAR_W;
			} else {
				gridLeft = LEFT;
				vmRight = 2;
			}
			let rotate, nameGap, bottom;
			if (cellW < 28) {
				rotate = 90;
				nameGap = 58;
				bottom = 86;
			} else if (cellW < 44) {
				rotate = 45;
				nameGap = 48;
				bottom = 72;
			} else {
				rotate = 0;
				nameGap = 28;
				bottom = 52;
			}
			return { plotW, plotH, gridLeft, vmRight, rotate, nameGap, bottom };
		};

		
		const applyLayout = (geo) => {
			el.style.height = geo.plotH + TOP + geo.bottom + "px";
			
			chart.setOption({
				grid: {
					left: geo.gridLeft,
					top: TOP,
					containLabel: false,
					width: geo.plotW,
					height: geo.plotH,
				},
				xAxis: { axisLabel: { rotate: geo.rotate }, nameGap: geo.nameGap },
			});
			chart.resize();
			centerColorbar(chart, { right: geo.vmRight });
		};

		const fitCells = () => {
			const geo = computeCellGeometry();
			if (geo) applyLayout(geo);
		};
		chart._customResize = fitCells;
		fitCells();
	},

	 
	inactivity_dumbbell(chart, cfg, theme) {
		const el = chart.getDom();
		const card = el.closest(".card");
		const { rows } = cfg.data;
		const n = rows.length;
		const TOP = 16,
			BOTTOM = 70;  
		
		
		const reserve = 320; 
		const availH = Math.max(260, viewportHeight() - reserve);
		const rowH = Math.min(
			14,
			Math.max(6, Math.floor((availH - TOP - BOTTOM) / n)),
		);
		const dotR = Math.min(4, Math.max(2.5, rowH / 2 - 1));
		el.style.height = n * rowH + TOP + BOTTOM + "px";
		const formatDate = (ms) => formatDateISO(ms);
		const xMin = rows.length ? Math.min(...rows.map((r) => r.lastMs)) : 0;
		const xMax = rows.length ? Math.max(...rows.map((r) => r.subMs)) : 1;
		const xPad = (xMax - xMin || 1) * 0.03; 
		
		const MIN_LIMIT = xMin - xPad; 
		const MAX_LIMIT = Date.UTC(2026, 5, 1); 
		const MAX_AXIS = Date.UTC(2026, 7, 15); 
		
		const DEFAULT_MIN = Math.max(
			MIN_LIMIT,
			Math.min(MAX_LIMIT, Date.UTC(2024, 5, 1)),
		);
		const st = chartState(card, "inactivity", { min: null });
		let currentMin = st.min == null ? DEFAULT_MIN : st.min;
		
		chart.setOption(
			buildInactivityOption({ rows, n }, theme, {
				top: TOP,
				bottom: BOTTOM,
				dotR,
				maxAxis: MAX_AXIS,
				currentMin,
				formatDate,
			}),
			true,
		);
		chart.resize();
		
		if (MAX_LIMIT > MIN_LIMIT + MS_PER_DAY) {
			const slider = createRangeSlider(el, {
				min: MIN_LIMIT,
				max: MAX_LIMIT,
				value: currentMin,
				format: formatDate,
				getRect: () => {
					const r = gridRect(chart);
					return r && r.width ? r : null;
				},
				onChange: (ms) => {
					currentMin = ms;
					st.min = ms;
					try {
						chart.setOption({
							xAxis: [{ min: currentMin }, { min: currentMin }],
						});
					} catch (e) {
						console.debug("[renderers] setOption 失败：", e);
					}
				},
			});
			chart._customResize = () => {
				chart.resize();
				slider.layout();
			};
		}
	},

	 
	track_upset(chart, cfg, theme) {
		const el = chart.getDom();
		el.style.padding = "0";
		const { tracks, setSizes, intersections, total } = cfg.data;
		const nSets = tracks.length;
		const nInter = intersections.length;

		const interLabels = intersections.map((inter) =>
			inter.members.map((i) => tracks[i]).join("+"),
		);
		const interSizes = intersections.map((inter) => inter.size);
		const maxInter = Math.max(1, ...interSizes);
		const maxSet = Math.max(1, ...setSizes);

		
		const dotData = [];
		for (let j = 0; j < nInter; j++) {
			for (const i of intersections[j].members) {
				dotData.push({ value: [interLabels[j], tracks[i]], interIdx: j });
			}
		}
		
		const lineData = [];
		for (let j = 0; j < nInter; j++) {
			const m = intersections[j].members;
			if (m.length < 2) continue;
			const lo = Math.min(...m);
			const hi = Math.max(...m);
			lineData.push({ value: [interLabels[j], tracks[lo], tracks[hi]] });
		}

		
		const TOP_PAD = 14,
			TOP_BAR_H = 82,
			CELL_H = 30,
			BOTTOM_PAD = 18,
			LEFT_LABEL_W = 72,
			SET_BAR_W = 66,
			RIGHT_PAD = 24,
			MIN_CELL_W = 14,
			MAX_CELL_W = 96;

		const computeLayout = () => {
			const cw = el.clientWidth || 600;
			const matrixH = nSets * CELL_H;
			const availW = cw - LEFT_LABEL_W - SET_BAR_W - RIGHT_PAD;
			const cellW = Math.min(Math.max(availW / nInter, MIN_CELL_W), MAX_CELL_W);
			const matrixW = cellW * nInter;
			const containerH = TOP_PAD + TOP_BAR_H + matrixH + BOTTOM_PAD;
			
			const dotSize = Math.min(Math.max(Math.min(cellW, CELL_H) * 0.5, 10), 15);
			
			const blockW = LEFT_LABEL_W + SET_BAR_W + matrixW + RIGHT_PAD;
			const offset = Math.max(0, (cw - blockW) / 2);
			const setBarLeft = offset + LEFT_LABEL_W;
			const matLeft = offset + LEFT_LABEL_W + SET_BAR_W;
			const matTop = TOP_PAD + TOP_BAR_H;
			return {
				containerH,
				dotSize,
				grid: [
					{ left: matLeft, width: matrixW, top: TOP_PAD, height: TOP_BAR_H },
					{
						left: setBarLeft,
						width: SET_BAR_W,
						top: matTop,
						height: matrixH,
					},
					{ left: matLeft, width: matrixW, top: matTop, height: matrixH },
				],
			};
		};

		const comboName = (inter) => inter.members.map((i) => tracks[i]).join(" + ");
		const comboTip = (inter) => {
			const pct = ((inter.size / total) * 100).toFixed(1);
			
			const name =
				inter.members.length === 1
					? `仅${tracks[inter.members[0]]}`
					: comboName(inter);
			return `${name}<br/>投稿数：${inter.size}（${pct}%）`;
		};

		const layout = computeLayout();
		el.style.height = layout.containerH + "px";
		chart.setOption(
			buildTrackUpsetOption(
				{
					tracks,
					setSizes,
					intersections,
					interLabels,
					interSizes,
					dotData,
					lineData,
					total,
					maxInter,
					maxSet,
				},
				theme,
				{ layout, comboTip },
			),
			true,
		);

		chart.resize();
		chart._customResize = () => {
			const layout = computeLayout();
			el.style.height = layout.containerH + "px";
			chart.setOption({
				grid: layout.grid,
				series: [{}, {}, { symbolSize: layout.dotSize }, {}],
			});
			chart.resize();
		};
	},
};

 
 
function setupMetaRow(card, btnText, onClick) {
	const head = card.querySelector(".card-head");
	if (!head || head.querySelector(".card-action-btn")) return;
	const h2 = head.querySelector("h2");
	
	const row = document.createElement("div");
	row.className = "card-title-row";
	if (h2) head.insertBefore(row, h2);
	else head.appendChild(row);
	if (h2) row.appendChild(h2); 
	
	const controls = document.createElement("div");
	controls.className = "card-controls";
	const btn = document.createElement("button");
	btn.type = "button";
	btn.className = "card-action-btn";
	btn.textContent = btnText;
	btn.onclick = onClick;
	controls.appendChild(btn);
	head.appendChild(controls);
	
	const sub = document.createElement("div");
	sub.className = "card-subtitle";
	head.appendChild(sub);
}

 
function formatMetricVal(m) {
	if (m.unit === "%") return (v) => (+v).toFixed(1) + "%";
	return (v) => {
		const n = +(0 + v).toFixed(4);
		return Number.isInteger(n) ? n.toLocaleString("en-US") : String(n);
	};
}

 
function formatMetricTick(m) {
	if (m.unit === "%") {
		return (v) => {
			const s = (+v).toFixed(1);
			return s.endsWith(".0") ? s.slice(0, -2) : s;
		};
	}
	return (v) => Math.round(v).toLocaleString("en-US");
}

 
function fitBars(chart, nBins, bw) {
	const rect = gridRect(chart);
	if (!rect || !rect.width || !nBins) return;
	const bwPx = rect.width / nBins;
	const opt = { series: [{ barWidth: Math.max(bwPx - 0.5, 1) }] };
	
	if (bw) {
		const maxLabels = Math.max(2, Math.floor(rect.width / 50));
		const labelStep = Math.max(1, Math.ceil(nBins / maxLabels));
		opt.xAxis = { interval: bw * labelStep };
	}
	chart.setOption(opt);
}

export { RENDERERS, disposeChildren, childCharts };
