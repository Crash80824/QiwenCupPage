 
import CONFIG from "../../data/config.js";
import {
	parseTime,
	timeToMs,
	debounce,
	avatarUrl,
	extLink,
	appendTitleOrLink,
	makeThreadLookup,
} from "../../scripts/utils.js";
import { safeInt } from "../../scripts/math.js";
import { magmaRGB } from "../../scripts/theme.js";
import { jumpToAward, MEDAL_CLASS, AWARD_KIND } from "../awards/awards.js";
import { buildIcon, buildChevron } from "../../scripts/icons.js";

function intField(thread, key) {
	return safeInt(thread[key]);
}

 
function submitMs(t) {
	if (!t.submit_time) return Infinity;
	const p = parseTime(t.submit_time);
	return p ? timeToMs(p) : Infinity;
}

 
function mappedTracks(t) {
	const arr = Array.isArray(t["赛道"]) ? t["赛道"] : [];
	const set = new Set();
	for (const tr of arr)
		set.add(CONFIG.validTracks.includes(tr) ? tr : CONFIG.invalidTrack);
	return [...set];
}

 
const CATALOG_SORTERS = {
	views: (a, b) => intField(b, "views") - intField(a, "views"),
	replies: (a, b) => intField(b, "replies") - intField(a, "replies"),
	favs: (a, b) => intField(b, "favs") - intField(a, "favs"),
	word_count: (a, b) => intField(b, "word_count") - intField(a, "word_count"),
	submit_time: (a, b) => submitMs(a) - submitMs(b),
};
 
const WORDS_PER_MIN = 400;
 
function closeOnOutsideClick(root, onClose) {
	document.addEventListener("click", (e) => {
		if (!root.contains(e.target)) onClose();
	});
	document.addEventListener("keydown", (e) => {
		if (e.key === "Escape") onClose();
	});
}
 
function buildDropdown({ btnClass, panelClass, panelRole, ariaLabel }) {
	const root = document.createElement("div");
	root.className = btnClass;
	const btn = document.createElement("button");
	btn.type = "button";
	btn.className = "track-dropdown-btn";
	btn.setAttribute("aria-haspopup", "true");
	btn.setAttribute("aria-expanded", "false");
	root.appendChild(btn);
	const panel = document.createElement("div");
	panel.className = panelClass;
	panel.hidden = true;
	panel.setAttribute("role", panelRole);
	panel.setAttribute("aria-label", ariaLabel);
	root.appendChild(panel);
	const setOpen = (open) => {
		if (panel.hidden === !open) return; 
		panel.hidden = !open;
		btn.setAttribute("aria-expanded", String(open));
	};
	btn.addEventListener("click", () => setOpen(panel.hidden));
	closeOnOutsideClick(root, () => setOpen(false));
	return { root, btn, panel, setOpen };
}

 
function animateControlWidth(el, apply) {
	if (!el.isConnected) {
		apply();
		return;
	}
	
	const tok = (el._wTok = (el._wTok || 0) + 1);
	
	const prevDone = el._wDone;
	if (prevDone) el.removeEventListener("transitionend", prevDone);
	const cur = el.getBoundingClientRect().width;
	
	el.style.transition = "none";
	el.style.width = `${cur}px`;
	apply();
	
	el.style.width = "auto";
	const natural = el.getBoundingClientRect().width;
	
	el.style.width = `${cur}px`;
	void el.offsetWidth; 
	el.style.transition = "width 180ms cubic-bezier(.4,0,.2,1)";
	el.style.width = `${natural}px`;
	const done = (ev) => {
		if (tok !== el._wTok) return; 
		if (ev && ev.propertyName !== "width") return;
		el.style.width = "";
		el.style.transition = "";
		el.removeEventListener("transitionend", done);
		el._wDone = null;
	};
	el._wDone = done;
	el.addEventListener("transitionend", done);
	
	if (natural === cur) done();
}

 
function buildTrackDropdown(threads, onChange) {
	
	const trackCount = new Map();
	for (const t of threads) {
		for (const tr of mappedTracks(t))
			trackCount.set(tr, (trackCount.get(tr) || 0) + 1);
	}
	const trackOrder = CONFIG.validTracks.filter((tr) => trackCount.has(tr));
	trackOrder.sort((a, b) => trackCount.get(b) - trackCount.get(a));

	const trackDropdown = buildDropdown({
		btnClass: "track-dropdown",
		panelClass: "track-dropdown-panel",
		panelRole: "group",
		ariaLabel: "按赛道筛选（交集，可多选）",
	});
	const dropdownBtn = trackDropdown.btn;
	const btnLabel = document.createElement("span");
	btnLabel.textContent = "主题筛选";
	const btnCount = document.createElement("span");
	btnCount.className = "track-dropdown-count";
	btnCount.hidden = true;
	dropdownBtn.append(btnLabel, btnCount, buildChevron());

	const panel = trackDropdown.panel;

	const head = document.createElement("div");
	head.className = "track-dropdown-head";
	const hint = document.createElement("span");
	hint.textContent = "需包含全部选中主题";
	const clearBtn = document.createElement("button");
	clearBtn.type = "button";
	clearBtn.className = "track-dropdown-clear";
	clearBtn.textContent = "清空";
	clearBtn.hidden = true;
	head.append(hint, clearBtn);
	panel.appendChild(head);

	const selectedTracks = new Set();
	const trackSelect = {
		value: "", 
	};
	const updateUI = () => {
		const n = selectedTracks.size;
		animateControlWidth(dropdownBtn, () => {
			btnCount.hidden = n === 0;
			btnCount.textContent = String(n);
			clearBtn.hidden = n === 0;
		});
	};
	for (const tr of trackOrder) {
		const row = document.createElement("label");
		row.className = "track-dropdown-row";
		const cb = document.createElement("input");
		cb.type = "checkbox";
		cb.value = tr;
		const name = document.createElement("span");
		name.className = "track-dropdown-name";
		name.textContent = tr;
		row.append(cb, name);
		cb.addEventListener("change", () => {
			if (cb.checked) selectedTracks.add(tr);
			else selectedTracks.delete(tr);
			trackSelect.value = [...selectedTracks].join("\n");
			updateUI();
			onChange();
		});
		panel.appendChild(row);
	}
	clearBtn.addEventListener("click", () => {
		for (const cb of panel.querySelectorAll('input[type="checkbox"]'))
			cb.checked = false;
		selectedTracks.clear();
		trackSelect.value = "";
		updateUI();
		onChange();
	});
	return { root: trackDropdown.root, select: trackSelect };
}

 
function buildSortDropdown(onChange) {
	const SORT_OPTIONS = [
		["submit_time", "发表时间"],
		["views", "浏览量"],
		["replies", "回复量"],
		["favs", "收藏量"],
		["word_count", "字数"],
	];
	const sortDropdown = buildDropdown({
		btnClass: "track-dropdown sort-dropdown", 
		panelClass: "track-dropdown-panel sort-dropdown-panel",
		panelRole: "listbox",
		ariaLabel: "排序方式",
	});
	const sortBtn = sortDropdown.btn;
	const sortLabel = document.createElement("span");
	sortLabel.className = "track-dropdown-label";
	sortBtn.append(sortLabel, buildChevron());

	const sortPanel = sortDropdown.panel;
	
	const sortHead = document.createElement("div");
	sortHead.className = "track-dropdown-head";
	const sortHint = document.createElement("span");
	sortHint.textContent = "选择排序方式";
	sortHead.appendChild(sortHint);
	sortPanel.appendChild(sortHead);
	const sortSelect = {
		value: "submit_time",
	};
	const updateSortLabel = () => {
		const label = SORT_OPTIONS.find(([v]) => v === sortSelect.value)[1];
		animateControlWidth(sortBtn, () => {
			sortLabel.textContent = label;
		});
	};
	for (const [v, label] of SORT_OPTIONS) {
		const opt = document.createElement("button");
		opt.type = "button";
		opt.className = "track-dropdown-row sort-option";
		opt.dataset.v = v;
		opt.setAttribute("role", "option");
		opt.setAttribute("aria-selected", String(v === sortSelect.value));
		opt.textContent = label;
		opt.addEventListener("click", () => {
			if (sortSelect.value === v) {
				sortDropdown.setOpen(false);
				return;
			}
			sortSelect.value = v;
			for (const o of sortPanel.querySelectorAll(".sort-option"))
				o.setAttribute("aria-selected", String(o.dataset.v === v));
			updateSortLabel();
			sortDropdown.setOpen(false);
			onChange();
		});
		sortPanel.appendChild(opt);
	}
	updateSortLabel();
	return { root: sortDropdown.root, select: sortSelect };
}

 
function buildCatalogToolbar(threads, onFilterChange) {
	const toolbar = document.createElement("div");
	toolbar.className = "catalog-toolbar";

	const input = document.createElement("input");
	input.type = "search";
	input.className = "catalog-search";
	input.placeholder = "搜索标题或作者…";
	input.setAttribute("aria-label", "搜索标题或作者");
	toolbar.appendChild(input);

	const track = buildTrackDropdown(threads, onFilterChange);
	const sort = buildSortDropdown(onFilterChange);
	toolbar.appendChild(track.root);
	toolbar.appendChild(sort.root);
	return {
		toolbar,
		input,
		getTrackValue: () => track.select.value,
		getSortValue: () => sort.select.value,
	};
}

function buildCatalogView(threads, awardsData) {
	
	const view = document.querySelector(".catalog-view");
	view.replaceChildren();

	const forumBase = CONFIG.forumBase || "";

	 
	const favsVals = threads
		.map((t) => parseInt(t.favs, 10))
		.filter((n) => Number.isFinite(n));
	const favMin = favsVals.length ? Math.min(...favsVals) : 0;
	const favMax = favsVals.length ? Math.max(...favsVals) : 1;
	const awardIndex = buildAwardIndex(awardsData, threads);

	const { toolbar, input, getTrackValue, getSortValue } = buildCatalogToolbar(
		threads,
		applyFilters,
	);
	view.appendChild(toolbar);

	 
	const grid = document.createElement("div");
	grid.className = "catalog-grid";
	view.appendChild(grid);

	const emptyMsg = document.createElement("p");
	emptyMsg.className = "catalog-empty";

	 
	const cards = threads.map((t) => {
		const card = buildCatalogCard(t, forumBase, favMin, favMax, awardIndex);
		card.__thread = t;
		card.dataset.search = (t.title + " " + t.username).toLowerCase();
		card.dataset.tracks = mappedTracks(t).join("\n");
		return card;
	});

	let applyFilterToken = 0; 
	function computeVisible(q, track, sorter) {
		const visible = cards.filter((c) => {
			const okQ = q === "" || c.dataset.search.includes(q);
			
			const selected = track.split("\n").filter(Boolean);
			const cardTracks = c.dataset.tracks.split("\n");
			const okT =
				selected.length === 0 || selected.every((tr) => cardTracks.includes(tr));
			return okQ && okT;
		});
		if (sorter) visible.sort((a, b) => sorter(a.__thread, b.__thread));
		return visible;
	}

	function renderEmptyState(visible) {
		if (visible.length === 0) {
			emptyMsg.textContent = "没有匹配的作品";
			if (!emptyMsg.parentNode) view.appendChild(emptyMsg);
		} else if (emptyMsg.parentNode) {
			emptyMsg.parentNode.removeChild(emptyMsg);
		}
	}

	function animateFlip(visible) {
		
		for (const c of cards) {
			c.style.transition = "";
			c.style.transform = "";
			c.style.opacity = "";
		}

		
		const token = ++applyFilterToken;
		const anim = grid.clientWidth > 0; 
		const prev = anim
			? new Map([...grid.children].map((c) => [c, c.getBoundingClientRect()]))
			: null;
		const leaving = anim
			? [...prev.keys()].filter((c) => !visible.includes(c))
			: [];
		const arriving = anim ? visible.filter((c) => !prev.has(c)) : [];
		const staying = anim ? visible.filter((c) => prev.has(c)) : [];

		if (!anim) {
			grid.replaceChildren(...visible);
			return;
		}

		
		for (const c of leaving) {
			c.style.transition = "opacity 150ms ease, transform 150ms ease";
			c.style.opacity = "0";
			c.style.transform = "scale(0.92)";
		}
		window.setTimeout(() => {
			if (token !== applyFilterToken) return; 
			grid.replaceChildren(...visible);

			
			const last = new Map(visible.map((c) => [c, c.getBoundingClientRect()]));
			for (const c of staying) {
				const f = prev.get(c);
				const l = last.get(c);
				const dx = f.left - l.left;
				const dy = f.top - l.top;
				if (dx || dy) {
					c.style.transition = "none";
					c.style.transform = `translate(${dx}px, ${dy}px)`;
				}
			}
			for (const c of arriving) {
				c.style.transition = "none";
				c.style.opacity = "0";
				c.style.transform = "scale(0.94)";
			}
			void grid.offsetWidth; 

			for (const c of staying) {
				if (c.style.transform) {
					c.style.transition = "transform 260ms cubic-bezier(.4,0,.2,1)";
					c.style.transform = "";
				}
			}
			for (const c of arriving) {
				c.style.transition =
					"opacity 260ms ease, transform 260ms cubic-bezier(.4,0,.2,1)";
				c.style.opacity = "";
				c.style.transform = "";
			}
			window.setTimeout(() => {
				if (token !== applyFilterToken) return;
				for (const c of grid.children) {
					c.style.transition = "";
					c.style.transform = "";
					c.style.opacity = "";
				}
			}, 320);
		}, 160);
	}

	function applyFilters() {
		const q = input.value.trim().toLowerCase();
		const track = getTrackValue();
		const sorter = CATALOG_SORTERS[getSortValue()];
		const visible = computeVisible(q, track, sorter);
		renderEmptyState(visible);
		animateFlip(visible);
	}

	input.addEventListener("input", debounce(applyFilters, 120));

	applyFilters();
	return view;
}

 
function buildAwardIndex(awardsData, threads) {
	const index = new Map(); 
	if (!Array.isArray(awardsData)) return index;
	 
	const { threadOf } = makeThreadLookup(threads, CONFIG);
	const tidOf = (r) => {
		if (!r) return null;
		if (r.tid != null) return r.tid;
		const t = threadOf(r);
		return t ? t.tid : null;
	};
	const push = (tid, desc) => {
		if (tid == null) return;
		const key = String(tid);
		if (!index.has(key)) index.set(key, []);
		index.get(key).push(desc);
	};
	for (const sec of awardsData) {
		const items = Array.isArray(sec.items) ? sec.items : [];
		if (sec.id === "track") {
			for (const track of items) {
				if (!Array.isArray(track.winners)) continue;
				for (const w of track.winners)
					push(tidOf(w), {
						kind: AWARD_KIND.MEDAL,
						medal: w.medal,
						track: track.name,
					});
			}
		} else if (sec.id === "special") {
			for (const s of items) {
				 
				const works =
					Array.isArray(s.works) && s.works.length ? s.works : [s.title];
				for (const w of works) {
					const rec = typeof w === "string" ? { title: w } : w;
					if (!rec || !rec.title) continue;
					push(tidOf(rec), {
						kind: AWARD_KIND.SPECIAL,
						name: s.name,
						icon: s.icon,
					});
				}
			}
		} else if (sec.id === "judges") {
			for (const j of items) {
				const works = Array.isArray(j.works) ? j.works : [];
				for (const w of works)
					push(tidOf(w), {
						kind: AWARD_KIND.JUDGE,
						award: j.award || (j.name ? j.name + "奖" : "评委推荐"),
					});
			}
		}
	}
	return index;
}

 
function buildAwardChip(a) {
	const chip = document.createElement("button");
	chip.type = "button";
	chip.className = "award-chip";
	if (a.kind === "medal") {
		chip.classList.add("award-chip--medal");
		chip.classList.add("award-chip--" + (MEDAL_CLASS[a.medal] || "gold"));
		chip.appendChild(buildIcon("medal"));
		if (a.track) chip.title = a.track + " · " + a.medal;
		chip.setAttribute(
			"aria-label",
			"查看「" + a.track + " · " + a.medal + "」的颁奖处",
		);
	} else if (a.kind === "special") {
		chip.classList.add("award-chip--special");
		chip.appendChild(buildIcon(a.icon || "spark"));
		chip.appendChild(document.createTextNode(a.name || "特别奖项"));
		chip.setAttribute(
			"aria-label",
			"查看「" + (a.name || "特别奖项") + "」的颁奖处",
		);
	} else {
		chip.classList.add("award-chip--judge");
		chip.appendChild(document.createTextNode(a.award || "评委推荐"));
		chip.setAttribute(
			"aria-label",
			"查看「" + (a.award || "评委推荐") + "」的颁奖处",
		);
	}
	chip.addEventListener("click", () => jumpToAward(a));
	return chip;
}

function buildCatalogCard(t, forumBase, favMin, favMax, awardIndex) {
	const card = document.createElement("article");
	card.className = "work-card";

	 
	const favs = parseInt(t.favs, 10);
	const span = favMax > favMin ? favMax - favMin : 1;
	const norm = Number.isFinite(favs) ? (favs - favMin) / span : 0;
	const [r, g, b] = magmaRGB(norm);
	card.style.setProperty("--tint-strong", `rgba(${r},${g},${b},0.42)`);
	card.style.setProperty("--tint-soft", `rgba(${r},${g},${b},0.20)`);

	 
	const author = document.createElement("div");
	author.className = "work-author";
	if (forumBase && t.uid) {
		const link = extLink(forumBase + "home.php?mod=space&uid=" + t.uid);
		const avatar = document.createElement("img");
		avatar.className = "avatar";
		avatar.src = avatarUrl(forumBase, t.uid);
		avatar.alt = "";
		avatar.loading = "lazy";
		avatar.onerror = () => {
			avatar.onerror = null;
			
			avatar.src = "images/noavatar.svg";
		};
		const name = document.createElement("span");
		name.className = "work-username";
		name.textContent = t.username;
		link.appendChild(avatar);
		link.appendChild(name);
		author.appendChild(link);
	} else {
		const name = document.createElement("span");
		name.className = "work-username";
		name.textContent = t.username;
		author.appendChild(name);
	}
	 
	const fav = document.createElement("span");
	fav.className = "work-favs";
	const heart = document.createElement("span");
	heart.className = "favs-heart";
	heart.textContent = "♥";
	fav.appendChild(heart);
	fav.appendChild(
		document.createTextNode(
			Number.isFinite(favs) ? favs.toLocaleString("en-US") : "-",
		),
	);
	author.appendChild(fav);
	card.appendChild(author);

	 
	const titleEl = document.createElement("div");
	titleEl.className = "work-title";
	appendTitleOrLink(
		titleEl,
		forumBase && t.tid
			? forumBase + CONFIG.threadUrlPath.replace("{tid}", String(t.tid))
			: null,
		t.title,
	);
	card.appendChild(titleEl);

	 
	const awards = awardIndex.get(String(t.tid)) || [];
	if (awards.length) {
		const awardEl = document.createElement("div");
		awardEl.className = "work-awards";
		for (const a of awards) awardEl.appendChild(buildAwardChip(a));
		card.appendChild(awardEl);
	}

	 
	const meta = document.createElement("div");
	meta.className = "work-meta";
	const wc = parseInt(t.word_count, 10);
	if (Number.isFinite(wc)) {
		meta.appendChild(document.createTextNode(wc.toLocaleString("en-US") + " 字"));
		const rt = document.createElement("span");
		rt.className = "read-time";
		rt.textContent =
			" · 约 " + Math.max(1, Math.ceil(wc / WORDS_PER_MIN)) + " 分钟";
		meta.appendChild(rt);
	} else {
		meta.textContent = "-";
	}
	card.appendChild(meta);

	 
	const tracks = mappedTracks(t);
	if (tracks.length) {
		const trackEl = document.createElement("div");
		trackEl.className = "work-tracks";
		for (const tr of tracks) {
			const chip = document.createElement("span");
			chip.className = "track-chip";
			chip.textContent = tr;
			trackEl.appendChild(chip);
		}
		card.appendChild(trackEl);
	}

	return card;
}

export { buildCatalogView };
