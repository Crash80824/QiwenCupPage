 

import { debounce } from "./scripts/utils.js";
import { buildMoonIcon, buildSunIcon } from "./scripts/icons.js";
import {
	switchView,
	routeFromHash,
	syncHeaderOffset,
	VIEWS,
} from "./router.js";
import {
	createChartsView,
	loadChartData,
	resizeAll,
	rerenderAllCharts,
} from "./views/charts/charts.js";
import { buildCatalogView } from "./views/catalog/catalog.js";
import { renderAwards, setAppThreads } from "./views/awards/awards.js";
import CONFIG from "./data/config.json" with { type: "json" };

 
function buildPage(threads, awardsData) {
	document.querySelector(".page-title").textContent = CONFIG.title || "";

	
	document.getElementById("loader")?.remove();

	const tabs = document.querySelector(".tabs");
	tabs.replaceChildren();

	
	VIEWS.forEach((v) => {
		const btn = document.createElement("button");
		btn.className = "tab";
		btn.dataset.view = v.id;
		btn.appendChild(document.createTextNode(v.label));
		btn.addEventListener("click", () => switchView(v.id, null, { push: true }));
		tabs.appendChild(btn);
	});

	
	createChartsView();

	
	buildCatalogView(threads || [], awardsData);

	
	setAppThreads(threads);
}

 
function initTheme() {
	
	function applyTheme(dark, persist) {
		document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
		
		if (persist) localStorage.setItem("theme", dark ? "dark" : "light");
		rerenderAllCharts();
	}

	const saved = localStorage.getItem("theme");
	const dark = saved
		? saved === "dark"
		: window.matchMedia("(prefers-color-scheme: dark)").matches;
	applyTheme(dark, false);
	
	if (!saved) {
		window
			.matchMedia("(prefers-color-scheme: dark)")
			.addEventListener("change", (e) => applyTheme(e.matches, false));
	}
	const btn = document.querySelector(".theme-toggle");
	
	btn.append(buildMoonIcon(), buildSunIcon());
	btn.addEventListener("click", () => {
		const cur = document.documentElement.getAttribute("data-theme") === "dark";
		applyTheme(!cur, true);
	});
}

 
async function init() {
	initTheme();

	 
	let threads, awardsData;
	try {
		const [tRes, aRes] = await Promise.all([
			fetch("data/threads.json", { cache: "no-cache" }),
			fetch("data/awards.json", { cache: "no-cache" }),
		]);
		if (!tRes.ok) throw new Error("threads.json: HTTP " + tRes.status);
		if (!aRes.ok) throw new Error("awards.json: HTTP " + aRes.status);
		[threads, awardsData] = await Promise.all([tRes.json(), aRes.json()]);
	} catch (e) {
		
		console.error("数据加载失败", e);
		return;
	}

	buildPage(threads, awardsData);
	renderAwards(document.querySelector(".awards-view"), awardsData);
	
	routeFromHash();
	syncHeaderOffset();

	window.addEventListener("hashchange", routeFromHash);
	window.addEventListener(
		"resize",
		debounce(() => {
			resizeAll();
			syncHeaderOffset();
		}, 150),
	);

	 
	loadChartData(threads);
}

document.addEventListener("DOMContentLoaded", init);
