 
import { RENDERERS, disposeChildren, childCharts } from "./renderers.js";
import { theme, COLORS } from "../../scripts/theme.js";
import { buildDoc } from "./data.js";
import { setBodyScrollLock } from "../../scripts/utils.js";

 
const instances = new Map(); 
const rendered = new Set(); 
let chartObserver = null; 

 
let chartsViewEl = null; 

 
function renderChart(card) {
	const cfg = card.__cfg;
	const el = card.__el;
	const renderer = RENDERERS[cfg.type];
	
	disposeChildren(cfg.id);
	if (instances.has(cfg.id)) {
		instances.get(cfg.id).dispose();
		instances.delete(cfg.id);
	}
	el.replaceChildren();
	const chart = echarts.init(el, null, { renderer: "canvas" });
	instances.set(cfg.id, chart);
	if (!renderer) {
		chart.setOption({
			title: {
				text: "未知图表类型: " + cfg.type,
				left: "center",
				top: "center",
				textStyle: { color: COLORS.danger },
			},
		});
		console.warn("[charts] 未知 type:", cfg.type, "（id=" + cfg.id + "）");
		return;
	}
	try {
		renderer(chart, cfg, theme());
	} catch (e) {
		console.error("[charts] 渲染失败:", cfg.id, e);
		chart.setOption({
			title: {
				text: "渲染失败: " + e.message,
				left: "center",
				top: "center",
				textStyle: { color: COLORS.danger },
			},
		});
	}
}

 
document.addEventListener("pointerdown", (e) => {
	const hideTip = (chart) => {
		if (!chart.getDom().contains(e.target)) {
			chart.dispatchAction({ type: "hideTip" });
			
			chart.dispatchAction({ type: "downplay" });
			
			
			
			setTimeout(() => chart.dispatchAction({ type: "updateAxisPointer" }), 200);
		}
	};
	for (const chart of instances.values()) hideTip(chart);
	
	
	for (const c of childCharts()) hideTip(c);
});

function resizeAll() {
	instances.forEach((c) => {
		if (c._customResize) c._customResize();
		else c.resize();
	});
}

 
function buildChartsView(doc) {
	if (!chartsViewEl) return;
	chartsViewEl.replaceChildren();
	doc.categories.forEach((cat, i) => {
		const sec = document.createElement("section");
		sec.className = "chart-section";
		sec.id = cat.id;
		const h2 = document.createElement("h2");
		h2.className = "chart-section-title";
		const idx = document.createElement("span");
		idx.className = "chart-section-index";
		idx.textContent = String(i + 1).padStart(2, "0");
		const name = document.createElement("span");
		name.className = "chart-section-name";
		name.textContent = cat.name;
		const chip = document.createElement("span");
		chip.className = "chart-section-chip";
		const subCount = cat.charts.reduce((n, ch) => n + (ch.subCharts || 1), 0);
		chip.textContent = `${subCount} 张图`;
		h2.append(idx, name, chip);
		sec.appendChild(h2);
		const grid = document.createElement("div");
		grid.className = "chart-grid";
		if (cat.charts.length) {
			cat.charts.forEach((ch) => grid.appendChild(buildCard(ch)));
		}
		sec.appendChild(grid);
		chartsViewEl.appendChild(sec);
	});
	
	setupChartObserver(chartsViewEl);
}

 
async function loadChartData(threads) {
	try {
				const [uMod, sMod] = await Promise.all([
			import("../../data/users.js"),
			import("../../data/scores.js"),
		]);
		const [users, scores] = [uMod.default, sMod.default];

		buildChartsView(buildDoc({ threads, users, scores }));
	} catch (e) {
		console.error("[init] 图表数据加载失败：", e);
		if (chartsViewEl) {
			chartsViewEl.replaceChildren();
			const p = document.createElement("p");
			p.className = "awards-error";
			p.textContent = "无法加载图表数据：" + (e && e.message ? e.message : e);
			chartsViewEl.appendChild(p);
		}
	}
}

 
function buildNoteBlock(text) {
	if (!text) return null;
	const block = document.createElement("div");
	block.className = "analysis";
	const txt = document.createElement("div");
	txt.className = "analysis-text";
	txt.textContent = text;
	block.appendChild(txt);
	return block;
}

 
let captionDialog = null;

 
function setCaptionDialog(open) {
	if (captionDialog.classList.contains("open") === open) return;
	captionDialog.classList.toggle("open", open);
	setBodyScrollLock(open);
}
function openCaption(title, text) {
	if (!captionDialog) {
		captionDialog = document.createElement("div");

		captionDialog.className = "caption-dialog";
		const panel = document.createElement("div");
		panel.className = "caption-dialog-panel";
		const close = document.createElement("button");
		close.type = "button";
		close.className = "caption-dialog-close";
		close.setAttribute("aria-label", "关闭");
		close.textContent = "×";
		const titleEl = document.createElement("div");
		titleEl.className = "caption-dialog-title";
		const textEl = document.createElement("div");
		textEl.className = "caption-dialog-text";
		panel.appendChild(close);
		panel.appendChild(titleEl);
		panel.appendChild(textEl);
		captionDialog.appendChild(panel);
		close.addEventListener("click", () => setCaptionDialog(false));
		captionDialog.addEventListener("click", (e) => {
			if (e.target === captionDialog) setCaptionDialog(false);
		});
		document.addEventListener("keydown", (e) => {
			if (e.key === "Escape" && captionDialog.classList.contains("open"))
				setCaptionDialog(false);
		});
		document.body.appendChild(captionDialog);
	}
	captionDialog.querySelector(".caption-dialog-title").textContent = title;
	captionDialog.querySelector(".caption-dialog-text").textContent = text;
	setCaptionDialog(true);
	
	captionDialog.querySelector(".caption-dialog-panel").scrollTop = 0;
}

function buildCard(ch) {
	const card = document.createElement("div");
	card.className = "card" + (ch.wide ? " wide" : "");
	card.id = "card-" + ch.id;

	const head = document.createElement("div");
	head.className = "card-head";
	const h2 = document.createElement("h2");
	h2.textContent = ch.title || ch.id;
	
	if (ch.caption) {
		const btn = document.createElement("button");
		btn.type = "button";
		btn.className = "caption-btn";
		btn.textContent = "i";
		btn.setAttribute("aria-label", "查看图注");
		btn.title = "查看图注";
		btn.addEventListener("click", () =>
			openCaption(ch.title || ch.id, ch.caption),
		);
		h2.appendChild(btn);
	}
	head.appendChild(h2);

	const chartEl = document.createElement("div");
	chartEl.className = "chart";
	
	const chartScroll = document.createElement("div");
	chartScroll.className = "chart-hscroll";
	chartScroll.appendChild(chartEl);

	card.appendChild(head);
	card.appendChild(chartScroll);
	const analysis = buildNoteBlock(ch.analysis);
	if (analysis) card.appendChild(analysis);

	card.__cfg = ch;
	card.__el = chartEl;
	return card;
}

 
function setupChartObserver(root) {
	chartObserver = new IntersectionObserver(
		(entries) => {
			for (const e of entries) {
				if (!e.isIntersecting) continue;
				const card = e.target;
				const id = card.__cfg.id;
				if (rendered.has(id)) continue;
				renderChart(card);
				rendered.add(id);
			}
		},
		{ rootMargin: "50px 0px" },
	);
	root.querySelectorAll(".card").forEach((c) => chartObserver.observe(c));
}

 
function replayChartAnimations() {
	const cards = document.querySelectorAll(".charts-view .card");
	for (const card of cards) {
		if (!rendered.has(card.__cfg.id)) continue;
		renderChart(card);
	}
}

 
export function createChartsView() {
	chartsViewEl = document.querySelector(".charts-view");
	return chartsViewEl;
}

 
export function rerenderAllCharts() {
	for (const id of rendered) {
		const card = document.getElementById("card-" + id);
		if (card) renderChart(card);
	}
}

export {
	renderChart,
	resizeAll,
	buildChartsView,
	loadChartData,
	replayChartAnimations,
};
