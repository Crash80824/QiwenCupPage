 

const lucide = globalThis.lucide;

 
const ICON_MAP = {
	medal: "Trophy",
	plot: "Clapperboard",
	usage: "PlaneTakeoff",
	idea: "Lightbulb",
	newstar: "Sparkles",
	book: "BookMarked",
	spark: "Sparkle",
};

 
export function buildIcon(name) {
	const svg = lucide.createElement(lucide.icons[ICON_MAP[name] || "Sparkle"], {
		"aria-hidden": "true",
		focusable: "false",
	});
	return svg;
}

 
export function buildChevron() {
	const svg = lucide.createElement(lucide.icons.ChevronDown, {
		class: "track-dropdown-chevron",
		width: 14,
		height: 14,
		"aria-hidden": "true",
	});
	return svg;
}

 
export function buildMoonIcon() {
	const svg = lucide.createElement(lucide.icons.Moon, {
		class: "icon-moon",
		"aria-hidden": "true",
		focusable: "false",
	});
	return svg;
}

 
export function buildSunIcon() {
	const svg = lucide.createElement(lucide.icons.Sun, {
		class: "icon-sun",
		"aria-hidden": "true",
		focusable: "false",
	});
	return svg;
}
