 
import { resizeAll, replayChartAnimations } from "./views/charts/charts.js";
import CONFIG from "./data/config.json" with { type: "json" };

 
export const VIEWS = CONFIG.views;

 
function switchView(id, sectionId, { push = false } = {}) {
	if (!VIEWS.some((v) => v.id === id)) id = "charts";
	const prev = document.querySelector(".view.active")?.dataset.view || null;
	document
		.querySelectorAll(".tab")
		.forEach((b) => b.classList.toggle("active", b.dataset.view === id));
	document
		.querySelectorAll(".view")
		.forEach((v) => v.classList.toggle("active", v.dataset.view === id));

	
	window.dispatchEvent(
		new CustomEvent("app:viewchange", { detail: { id, prev } }),
	);

	
	document.body.classList.toggle("no-chrome", id === "awards");
	syncHeaderOffset();

	if (id === "charts") {
		
		
		
		requestAnimationFrame(() => {
			resizeAll();
			replayChartAnimations();
			if (sectionId) {
				const sec = document.getElementById(sectionId);
				if (sec) sec.scrollIntoView({ behavior: "smooth" });
			} else {
				window.scrollTo(0, 0);
			}
		});
	} else {
		
		window.scrollTo(0, 0);
	}

	
	
	
	
	const hash = id;
	if (location.hash.slice(1) !== hash) {
		const url = "#" + hash;
		if (push) history.pushState(null, "", url);
		else history.replaceState(null, "", url);
	}
}

 
function routeFromHash() {
	const hash = location.hash.slice(1);
	if (hash === "catalog" || hash === "awards" || hash === "charts") {
		switchView(hash);
	} else {
		switchView("awards");
	}
}

 

function syncHeaderOffset() {
	const navBar = document.querySelector(".nav-bar");
	const h = navBar ? navBar.offsetHeight : 0;
	document.documentElement.style.setProperty("--header-h", h + "px");
	document.documentElement.style.setProperty("--content-offset", h + "px");
}

export { switchView, routeFromHash, syncHeaderOffset };
