import { setBodyScrollLock } from "../../../scripts/utils.js";
import {
	autoBinWidth,
	binCountFor,
	fmtDec2,
	fmtStat,
} from "../../../scripts/math.js";
import { METRICS, METRIC_GROUPS, KEY, isAuthorMetric } from "../correlation.js";
import CONFIG from "../../../data/config.js";

 
const metricIdx = (key) => METRICS.findIndex((m) => m.key === key);

 
function fillMetricOptions(sel, allowEmpty) {
	if (allowEmpty) {
		const o = document.createElement("option");
		o.value = "";
		o.textContent = "（无）";
		sel.appendChild(o);
	}
	for (const g of METRIC_GROUPS) {
		const og = document.createElement("optgroup");
		og.label = g.label;
		for (let i = g.start; i < g.end; i++) {
			const o = document.createElement("option");
			o.value = i;
			o.textContent = METRICS[i].label;
			og.appendChild(o);
		}
		sel.appendChild(og);
	}
}

 
function closeDialog(variant) {
	const dlg = document.querySelector(`.chart-dialog[data-variant="${variant}"]`);
	if (dlg && dlg.classList.contains("open")) {
		dlg.classList.remove("open");
		setBodyScrollLock(false);
	}
}

 
let metricHelpDialog = null;

function openMetricHelp(openerBtn) {
	if (!metricHelpDialog) {
		metricHelpDialog = document.createElement("div");
		metricHelpDialog.className = "caption-dialog";
		const panel = document.createElement("div");
		panel.className = "caption-dialog-panel";
		const close = document.createElement("button");
		close.type = "button";
		close.className = "caption-dialog-close";
		close.setAttribute("aria-label", "关闭");
		close.textContent = "×";
		const titleEl = document.createElement("div");
		titleEl.className = "caption-dialog-title";
		titleEl.textContent = "变量说明";
		const textEl = document.createElement("div");
		textEl.className = "caption-dialog-text";
		textEl.textContent = CONFIG.metricHelp;
		panel.appendChild(close);
		panel.appendChild(titleEl);
		panel.appendChild(textEl);
		metricHelpDialog.appendChild(panel);
		metricHelpDialog.__lastOpener = null;
		metricHelpDialog.__closeBtn = close;

		const setOpen = (open) => {
			metricHelpDialog.classList.toggle("open", open);
			setBodyScrollLock(open);
			if (open) {
				
				metricHelpDialog.querySelector(".caption-dialog-panel").scrollTop = 0;
				
				metricHelpDialog.__closeBtn.focus();
			} else if (metricHelpDialog.__lastOpener) {
				
				metricHelpDialog.__lastOpener.focus();
				metricHelpDialog.__lastOpener = null;
			}
		};
		close.addEventListener("click", () => setOpen(false));
		metricHelpDialog.addEventListener("click", (e) => {
			if (e.target === metricHelpDialog) setOpen(false);
		});
		document.addEventListener("keydown", (e) => {
			if (e.key === "Escape" && metricHelpDialog.classList.contains("open"))
				setOpen(false);
		});
		metricHelpDialog.__setOpen = setOpen;
		document.body.appendChild(metricHelpDialog);
	}
	
	
	document.body.appendChild(metricHelpDialog);
	metricHelpDialog.__lastOpener = openerBtn || null;
	metricHelpDialog.__setOpen(true);
}

 
function makeDialogTitle(titleText) {
	const row = document.createElement("div");
	row.className = "chart-dialog-title-row";
	const title = document.createElement("div");
	title.className = "chart-dialog-title";
	title.textContent = titleText;
	row.appendChild(title);
	const btn = document.createElement("button");
	btn.type = "button";
	btn.className = "caption-btn";
	btn.textContent = "i";
	btn.setAttribute("aria-label", "查看变量说明");
	btn.title = "查看变量说明";
	btn.addEventListener("click", () => openMetricHelp(btn));
	row.appendChild(btn);
	return row;
}

 
function ensureAnalysisBlock(card) {
	let block = card.querySelector(".analysis");
	if (block) return block;
	block = document.createElement("div");
	block.className = "analysis";
	const txt = document.createElement("div");
	txt.className = "analysis-text";
	block.appendChild(txt);
	const chartEl = card.querySelector(".chart");
	card.insertBefore(block, chartEl ? chartEl.nextSibling : null);
	return block;
}

 

 
function corrCat(r2) {
	if (r2 < 0.1) return "不相关";
	if (r2 < 0.3) return "弱相关";
	if (r2 < 0.6) return "中等程度相关";
	return "强相关";
}

 
function buildCorrStats(s) {
	const dims = [`横轴：${s.xMetric.label}`, `纵轴：${s.yMetric.label}`];
	if (s.sizeMetric) dims.push(`圆点尺寸：${s.sizeMetric.label}`);
	if (s.colorMetric)
		dims.push(`圆点颜色（越亮数值越高）：${s.colorMetric.label}`);
	const lines = [
		"[当前选择]",
		dims.join("，"),
		`横轴均值：${fmtStat(s.xMean, s.xMetric.unit)}，横轴中位数：${fmtStat(s.xMed, s.xMetric.unit)}`,
		`纵轴均值：${fmtStat(s.yMean, s.yMetric.unit)}，纵轴中位数：${fmtStat(s.yMed, s.yMetric.unit)}`,
	];
	if (s.fit) {
		const b = +s.fit.b.toFixed(2);
		let intercept = "";
		if (b !== 0) intercept = (b < 0 ? "-" : "+") + fmtDec2(Math.abs(b));
		lines.push(
			`线性拟合：${s.yMetric.label}=${fmtDec2(s.fit.a)}×${s.xMetric.label}${intercept}，R²=${s.fit.r2.toFixed(2)}，二者${corrCat(s.fit.r2)}`,
		);
	} else if (s.n < 2) {
		lines.push("样本不足，无法拟合");
	}
	return lines.join("\n");
}

 
function buildHistStats(m, s) {
	return [
		`[当前变量：${m.label}]`,
		`最小值：${fmtStat(s.min, m.unit)}，中位数：${fmtStat(s.median, m.unit)}，最大值：${fmtStat(s.max, m.unit)}，平均值：${fmtStat(s.mean, m.unit)}，标准差：${fmtStat(s.std, m.unit)}`,
	].join("\n");
}

 
function combinedAnalysis(card, dynamic) {
	const staticText = card.__cfg?.analysis;
	if (!staticText) return dynamic;
	if (!dynamic) return staticText;
	return `${dynamic}\n\n${staticText}`;
}

 

 
function setCardTitle(h2, text) {
	const captionBtn = h2 && h2.querySelector(".caption-btn");
	if (h2) h2.textContent = text;
	if (captionBtn) h2.appendChild(captionBtn);
}

function updateCorrCaption(card, stats) {
	const head = card.querySelector(".card-head");
	if (!head || !stats) return;
	const h2 = head.querySelector("h2");
	if (h2)
		setCardTitle(h2, `${stats.xMetric.label} × ${stats.yMetric.label}相关性`);
	const block = ensureAnalysisBlock(card);
	const txt = block.querySelector(".analysis-text");
	const text = combinedAnalysis(card, buildCorrStats(stats));
	txt.textContent = text;
	block.style.display = text ? "" : "none";
}

function openCorrDialog(card) {
	let dlg = document.querySelector('.chart-dialog[data-variant="corr"]');
	if (!dlg) {
		dlg = buildCorrDialog();
		document.body.appendChild(dlg);
	}
	const state = card.__st.corr;
	const { xSel, ySel, sizeSel, colorSel } = dlg.__sels;
	xSel.value = String(state.x);
	ySel.value = String(state.y);
	sizeSel.value = state.size == null ? "" : String(state.size);
	colorSel.value = state.color == null ? "" : String(state.color);
	dlg.__card = card;
	dlg.classList.add("open");
	setBodyScrollLock(true);
	const panel = dlg.querySelector(".chart-dialog-panel");
	if (panel) panel.focus();
}

function buildCorrDialog() {
	const dlg = document.createElement("div");
	dlg.className = "chart-dialog";
	dlg.dataset.variant = "corr";

	const panel = document.createElement("div");
	panel.className = "chart-dialog-panel";
	panel.tabIndex = -1;

	panel.appendChild(makeDialogTitle("相关性·变量设置"));

	const hint = document.createElement("div");
	hint.className = "chart-dialog-hint";
	hint.textContent = "为四个维度各选一个变量；圆点尺寸与颜色可留空。";
	panel.appendChild(hint);

	const mkRow = (label, allowEmpty) => {
		const row = document.createElement("label");
		row.className = "chart-dialog-row";
		const span = document.createElement("span");
		span.textContent = label;
		const sel = document.createElement("select");
		sel.className = "chart-dialog-select";
		fillMetricOptions(sel, allowEmpty);
		row.appendChild(span);
		row.appendChild(sel);
		panel.appendChild(row);
		return sel;
	};

	const xSel = mkRow("X 轴", false);
	const ySel = mkRow("Y 轴", false);
	const sizeSel = mkRow("圆点尺寸", true);
	const colorSel = mkRow("圆点颜色", true);

	const actions = document.createElement("div");
	actions.className = "chart-dialog-actions";
	const cancel = document.createElement("button");
	cancel.type = "button";
	cancel.className = "dlg-btn dlg-btn-ghost";
	cancel.textContent = "取消";
	const ok = document.createElement("button");
	ok.type = "button";
	ok.className = "dlg-btn dlg-btn-primary";
	ok.textContent = "应用";
	actions.appendChild(cancel);
	actions.appendChild(ok);
	panel.appendChild(actions);

	dlg.appendChild(panel);
	dlg.__sels = { xSel, ySel, sizeSel, colorSel };

	const apply = () => {
		const card = dlg.__card;
		if (!card || !card.__st?.corr) return;
		const state = card.__st.corr;
		state.x = +xSel.value;
		state.y = +ySel.value;
		state.size = sizeSel.value === "" ? null : +sizeSel.value;
		state.color = colorSel.value === "" ? null : +colorSel.value;
		closeDialog("corr");
		state.draw && state.draw();
	};
	ok.onclick = apply;
	cancel.onclick = () => closeDialog("corr");
	dlg.onclick = (e) => {
		if (e.target === dlg) closeDialog("corr");
	};
	panel.addEventListener("keydown", (e) => {
		if (e.key === "Escape") closeDialog("corr");
	});

	return dlg;
}

 
function histValues(ctx, m) {
	const author = isAuthorMetric(m);
	const seen = author ? new Set() : null;
	const out = [];
	for (const r of ctx.threads) {
		const u = ctx.userByUid.get(r.uid);
		if (author && u && seen.has(u.uid)) continue;
		const v = m.get(r, u, ctx.cutoff);
		if (Number.isFinite(v)) {
			out.push(v);
			if (author && u) seen.add(u.uid);
		}
	}
	return out;
}

 

function openHistDialog(card) {
	let dlg = document.querySelector('.chart-dialog[data-variant="hist"]');
	if (!dlg) {
		dlg = buildHistDialog();
		document.body.appendChild(dlg);
	}
	const state = card.__st.hist;
	const { varSel, nBinsInput } = dlg.__fields;
	varSel.value = String(state.varIdx);
	nBinsInput.value = state.nBins == null ? "" : String(state.nBins);
	dlg.__card = card;
	dlg.classList.add("open");
	setBodyScrollLock(true);
	dlg.__recompute && dlg.__recompute();
	const panel = dlg.querySelector(".chart-dialog-panel");
	if (panel) panel.focus();
}

function buildHistDialog() {
	const dlg = document.createElement("div");
	dlg.className = "chart-dialog";
	dlg.dataset.variant = "hist";

	const panel = document.createElement("div");
	panel.className = "chart-dialog-panel";
	panel.tabIndex = -1;

	panel.appendChild(makeDialogTitle("直方图 · 变量设置"));

	const hint = document.createElement("div");
	hint.className = "chart-dialog-hint";
	hint.textContent = "选择统计变量并调整组数；组数留空则自动取约20组。";
	panel.appendChild(hint);

	const varRow = document.createElement("label");
	varRow.className = "chart-dialog-row";
	const varSpan = document.createElement("span");
	varSpan.textContent = "变量";
	const varSel = document.createElement("select");
	varSel.className = "chart-dialog-select";
	fillMetricOptions(varSel, false);
	varRow.appendChild(varSpan);
	varRow.appendChild(varSel);
	panel.appendChild(varRow);

	const nBinsRow = document.createElement("label");
	nBinsRow.className = "chart-dialog-row";
	const nBinsSpan = document.createElement("span");
	nBinsSpan.textContent = "组数";
	const nBinsInput = document.createElement("input");
	nBinsInput.type = "number";
	nBinsInput.min = "1";
	nBinsInput.step = "1";
	nBinsInput.className = "chart-dialog-input";
	nBinsInput.placeholder = "自动";
	nBinsRow.appendChild(nBinsSpan);
	nBinsRow.appendChild(nBinsInput);
	panel.appendChild(nBinsRow);

	const hintEl = document.createElement("div");
	hintEl.className = "chart-dialog-subhint";
	panel.appendChild(hintEl);

	const actions = document.createElement("div");
	actions.className = "chart-dialog-actions";
	const cancel = document.createElement("button");
	cancel.type = "button";
	cancel.className = "dlg-btn dlg-btn-ghost";
	cancel.textContent = "取消";
	const ok = document.createElement("button");
	ok.type = "button";
	ok.className = "dlg-btn dlg-btn-primary";
	ok.textContent = "应用";
	actions.appendChild(cancel);
	actions.appendChild(ok);
	panel.appendChild(actions);

	dlg.appendChild(panel);
	dlg.__fields = { varSel, nBinsInput, hintEl };

	const recompute = () => {
		const card = dlg.__card;
		const ctx = card && card.__st?.hist?.ctx;
		if (!ctx) {
			hintEl.textContent = "";
			return;
		}
		const m = METRICS[+varSel.value] || METRICS[metricIdx(KEY.WORD_COUNT)];
		const vals = histValues(ctx, m);
		const mn = vals.length ? Math.min(...vals) : 0;
		const mx = vals.length ? Math.max(...vals) : 0;
		const span = mx - mn;
		const count = vals.length;
		const raw = nBinsInput.value.trim();
		if (raw === "") {
			const bw = autoBinWidth(mn, mx);
			hintEl.textContent = `自动 · 约 ${binCountFor(mn, mx, bw)} 组`;
			return;
		}
		const v = parseInt(raw, 10);
		if (!Number.isFinite(v) || v <= 0 || !(span > 0)) {
			hintEl.textContent = count ? "请输入正整数" : "该变量无数据";
			return;
		}
		const bw = span / v;
		const bwn = +(0 + bw).toFixed(4);
		const bwLabel = Number.isInteger(bwn)
			? bwn.toLocaleString("en-US")
			: String(bwn);
		hintEl.textContent = `${v} 组 · bin 宽 ${bwLabel}`;
	};
	dlg.__recompute = recompute;

	const apply = () => {
		const card = dlg.__card;
		if (!card || !card.__st?.hist) return;
		const state = card.__st.hist;
		state.varIdx = +varSel.value;
		const raw = nBinsInput.value.trim();
		state.nBins = raw === "" ? null : parseInt(raw, 10);
		if (state.nBins != null && !(state.nBins > 0)) state.nBins = null;
		closeDialog("hist");
		state.draw && state.draw();
	};
	ok.onclick = apply;
	cancel.onclick = () => closeDialog("hist");
	dlg.onclick = (e) => {
		if (e.target === dlg) closeDialog("hist");
	};
	panel.addEventListener("keydown", (e) => {
		if (e.key === "Escape") closeDialog("hist");
	});
	nBinsInput.addEventListener("input", recompute);
	varSel.addEventListener("change", recompute);

	return dlg;
}

 
function updateHistCaption(card, m, stats) {
	const head = card.querySelector(".card-head");
	if (!head) return;
	const h2 = head.querySelector("h2");
	if (h2) setCardTitle(h2, `${m.label}分布`);
	const block = ensureAnalysisBlock(card);
	const txt = block.querySelector(".analysis-text");
	const text = stats
		? combinedAnalysis(card, buildHistStats(m, stats))
		: combinedAnalysis(card, "");
	txt.textContent = text;
	block.style.display = text ? "" : "none";
}

export {
	openCorrDialog,
	openHistDialog,
	updateCorrCaption,
	updateHistCaption,
	histValues,
};
