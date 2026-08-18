 
import CONFIG from "../../data/config.json" with { type: "json" };
import {
	parseTime,
	timeToMs,
	MS_PER_DAY,
	setBodyScrollLock,
	extLink,
	prefersReducedMotion,
	appendTitleOrLink,
	parseCutoff,
	makeThreadLookup,
} from "../../scripts/utils.js";
import { safeInt } from "../../scripts/math.js";
import { switchView } from "../../router.js";
import { buildIcon } from "../../scripts/icons.js";

let appThreads = []; 

 
function jumpToAward(award) {
	switchView("awards", null, { push: true });
	requestAnimationFrame(() => {
		const target = locateAwardTarget(award);
		if (!target) return;
		const isCard =
			target.classList.contains("podium-card") ||
			target.classList.contains("special-card") ||
			target.classList.contains("judge-card");
		const reduce = prefersReducedMotion();
		target.scrollIntoView({
			behavior: reduce ? "auto" : "smooth",
			block: isCard ? "center" : "start",
		});
		flashTarget(target);
	});
}

 
function locateMedal(view, award) {
	const section = view.querySelector(".track-section");
	if (!section) return null;
	const switcher = section.querySelector(".track-switcher");
	const tab = switcher
		? [...switcher.querySelectorAll(".track-tab")].find(
				(b) => b.textContent.trim() === award.track,
			)
		: null;
	if (tab) tab.click();
	 
	const wrap = section.querySelector(".track-podium-wrap");
	const card = wrap
		? wrap.querySelector(
				'.podium.is-active .podium-card[data-medal="' +
					(MEDAL_CLASS[award.medal] || "gold") +
					'"]',
			)
		: null;
	return card || wrap || section;
}

 
function locateSpecial(view, award) {
	const card = [...view.querySelectorAll(".special-card")].find((c) => {
		const name = c.querySelector(".special-name");
		return name && name.textContent.trim() === award.name;
	});
	return card || view.querySelector(".special-section") || null;
}

 
function locateJudge(view, award) {
	const card = [...view.querySelectorAll(".judge-card")].find((c) => {
		const label = c.querySelector(".judge-works-label");
		return label && label.textContent.trim() === award.award;
	});
	return card || view.querySelector(".judges-section") || null;
}

function locateAwardTarget(award) {
	const view = document.querySelector(".awards-view");
	if (!view) return null;
	switch (award.kind) {
		case AWARD_KIND.MEDAL:
			return locateMedal(view, award);
		case AWARD_KIND.SPECIAL:
			return locateSpecial(view, award);
		case AWARD_KIND.JUDGE:
			return locateJudge(view, award);
		default:
			return null;
	}
}

 
function flashTarget(el) {
	 
	document
		.querySelectorAll(".is-award-target")
		.forEach((n) => n.classList.remove("is-award-target"));
	if (prefersReducedMotion()) return;
	el.classList.remove("is-award-target");
	void el.offsetWidth; 
	el.classList.add("is-award-target");
}

 

 
const MEDAL = Object.freeze({
	GOLD: "金奖",
	SILVER: "银奖",
	BRONZE: "铜奖",
});
const MEDAL_CLASS = {
	[MEDAL.GOLD]: "gold",
	[MEDAL.SILVER]: "silver",
	[MEDAL.BRONZE]: "bronze",
};

 
export const AWARD_KIND = Object.freeze({
	MEDAL: "medal",
	SPECIAL: "special",
	JUDGE: "judge",
});
 
const PODIUM_ORDER = [MEDAL.SILVER, MEDAL.GOLD, MEDAL.BRONZE];

 

const TRACK_AUTO_MS = 4000;

let trackTimer = null;
let trackAutoActivate = null;
let trackAutoCount = 0;
let trackAutoIdx = 0;
let trackUserStopped = false;
let trackControls = null;
let trackLight = null;

function updateTrackState() {
	if (!trackControls) return;
	const running = !trackUserStopped && !prefersReducedMotion();
	trackControls.classList.toggle("is-running", running);
	trackControls.classList.toggle("is-paused", !running);
	if (trackLight) {
		if (running) {
			trackLight.style.left = "";
			trackLight.style.width = "";
		} else {
			const activeTab = trackControls.querySelector(".track-tab.is-active");
			if (activeTab) {
				trackLight.style.left = activeTab.offsetLeft + "px";
				trackLight.style.width = activeTab.offsetWidth + "px";
			}
		}
	}
}

function stopTrackAuto({ manual = false } = {}) {
	if (trackTimer !== null) {
		clearInterval(trackTimer);
		trackTimer = null;
	}
	if (manual) {
		trackUserStopped = true;
		updateTrackState();
	}
}

function advanceTrackAuto() {
	if (!trackAutoActivate || trackAutoCount < 2) return;
	trackAutoIdx = (trackAutoIdx + 1) % trackAutoCount;
	trackAutoActivate(trackAutoIdx);
}

function startTrackAuto() {
	if (trackTimer !== null) return;
	if (trackUserStopped || prefersReducedMotion()) return;
	if (!trackAutoActivate || trackAutoCount < 2) return;
	trackTimer = setInterval(advanceTrackAuto, TRACK_AUTO_MS);
}

function pauseTrackAuto() {
	stopTrackAuto();
}

function resumeTrackAuto() {
	stopTrackAuto();
	trackUserStopped = false;
	if (trackAutoActivate) {
		trackAutoIdx = 0;
		trackAutoActivate(0);
	}
	updateTrackState();
	startTrackAuto();
}

window.addEventListener("app:viewchange", (e) => {
	const id = e.detail?.id;
	const prev = e.detail?.prev;
	if (id === "awards" && prev !== "awards") resumeTrackAuto();
	else if (id !== "awards" && prev === "awards") pauseTrackAuto();
});
 
function renderAwards(view, data) {
	view.replaceChildren();
	const sections = Array.isArray(data) ? data : [];
	if (!sections.length) {
		const p = document.createElement("p");
		p.className = "awards-empty";
		p.textContent = "暂无颁奖名单。";
		view.appendChild(p);
		return;
	}

	const lookup = makeThreadLookup(appThreads, CONFIG);
	const threadHref = lookup.threadHref;
	 
	const authorOf = (r) => lookup.authorOf(r) || "未知";

	 
	if (CONFIG.hero) view.appendChild(buildAwardsHero());

	 
	sections.forEach((s, i) => {
		const meta = { ...s, index: String(i + 1).padStart(2, "0") };
		const items = Array.isArray(s.items) ? s.items : [];
		if (!items.length) return;
		switch (s.id) {
			case "track":
				view.appendChild(buildTrackSection(meta, items, threadHref, authorOf));
				break;
			case "special":
				view.appendChild(buildSpecialSection(meta, items, threadHref, authorOf));
				break;
			case "judges":
				view.appendChild(buildJudgesSection(meta, items, threadHref, authorOf));
				break;
			default:
				break;
		}
	});
}

 
function computeAwardsStats() {
	let minMs = Infinity;
	let maxMs = -Infinity;
	let reads = 0;
	for (const t of appThreads) {
		const p = parseTime(t.submit_time);
		if (p) {
			const ms = timeToMs(p);
			if (ms < minMs) minMs = ms;
			if (ms > maxMs) maxMs = ms;
		}
		reads += safeInt(t.views);
	}
	return {
		days: Number.isFinite(minMs)
			? Math.max(1, Math.round((maxMs - minMs) / MS_PER_DAY) + 1)
			: null,
		entries: appThreads.length,
		reads,
	};
}

 
let statObserver = null;
function animateCountUp(el, target) {
	const reduce = prefersReducedMotion();
	const fmt = (n) => Math.round(n).toLocaleString("zh-CN");
	if (reduce) {
		el.textContent = fmt(target);
		return;
	}
	const duration = 1400; 
	const start = performance.now();
	const easeOut = (t) => 1 - (1 - t) ** 3;
	const tick = (now) => {
		const t = Math.min(1, (now - start) / duration);
		el.textContent = fmt(target * easeOut(t));
		if (t < 1) requestAnimationFrame(tick);
	};
	requestAnimationFrame(tick);
}
function observeStatValue(el, target) {
	el.dataset.target = String(target);
	el.textContent = "0";
	if (!statObserver) {
		statObserver = new IntersectionObserver(
			(entries) => {
				for (const e of entries) {
					if (!e.isIntersecting) continue;
					animateCountUp(e.target, Number(e.target.dataset.target));
					statObserver.unobserve(e.target);
				}
			},
			{ threshold: 0.3 },
		);
	}
	statObserver.observe(el);
}

function buildAwardsHero() {
	const wrap = document.createElement("div");
	wrap.className = "awards-hero";

	const inner = document.createElement("div");
	inner.className = "awards-hero-inner";

	const kicker = document.createElement("p");
	kicker.className = "hero-kicker";
	kicker.textContent = CONFIG.title || "征文活动";
	inner.appendChild(kicker);

	const title = document.createElement("h2");
	title.className = "hero-title";
	title.textContent = CONFIG.hero.title || "获奖名单";
	inner.appendChild(title);

	if (CONFIG.hero.summary) {
		const summary = document.createElement("p");
		summary.className = "hero-summary";
		summary.textContent = CONFIG.hero.summary;
		inner.appendChild(summary);
	}

	const stats = buildHeroStats(CONFIG.hero.stats);
	if (stats) inner.appendChild(stats);

	
	if (CONFIG.cutoff) {
		const cutoffSub = parseCutoff(CONFIG.cutoff).subtitle;
		if (cutoffSub) {
			const cutoff = document.createElement("p");
			cutoff.className = "hero-cutoff";
			cutoff.textContent = cutoffSub;
			inner.appendChild(cutoff);
		}
	}

	inner.appendChild(buildHeroActions());
	wrap.appendChild(inner);
	return wrap;
}

 
function buildHeroStats(statsCfg) {
	if (!statsCfg) return null;
	const s = computeAwardsStats();
	const stats = document.createElement("dl");
	stats.className = "hero-stats";
	const items = [
		[statsCfg.days ?? s.days, statsCfg.daysLabel],
		[s.entries, statsCfg.entriesLabel],
		[s.reads, statsCfg.readsLabel],
	];
	for (const [value, label] of items) {
		if (value == null) continue;
		const div = document.createElement("div");
		div.className = "hero-stat";
		const v = document.createElement("dt");
		v.className = "hero-stat-value";
		observeStatValue(v, Number(value));
		const l = document.createElement("dd");
		l.className = "hero-stat-label";
		l.textContent = label || "";
		div.appendChild(v);
		div.appendChild(l);
		stats.appendChild(div);
	}
	return stats;
}

 
function buildHeroActions() {
	const actions = document.createElement("div");
	actions.className = "hero-actions";

	const btnCatalog = document.createElement("button");
	btnCatalog.type = "button";
	btnCatalog.className = "hero-btn hero-btn--ghost";
	btnCatalog.textContent = "作品目录";
	btnCatalog.addEventListener("click", () =>
		switchView("catalog", null, { push: true }),
	);
	actions.appendChild(btnCatalog);

	const btnAwards = document.createElement("button");
	btnAwards.type = "button";
	btnAwards.className = "hero-btn hero-btn--primary";
	btnAwards.textContent = "获奖作品";
	btnAwards.addEventListener("click", () => {
		const sec = document.querySelector(".track-section");
		if (!sec) return;
		const reduce = prefersReducedMotion();
		sec.scrollIntoView({
			behavior: reduce ? "auto" : "smooth",
			block: "start",
		});
	});
	actions.appendChild(btnAwards);

	const btnCharts = document.createElement("button");
	btnCharts.type = "button";
	btnCharts.className = "hero-btn hero-btn--ghost";
	btnCharts.textContent = "数据图表";
	btnCharts.addEventListener("click", () =>
		switchView("charts", null, { push: true }),
	);
	actions.appendChild(btnCharts);

	return actions;
}

 
function buildSectionHeader(index, title, desc, chip) {
	const head = document.createElement("div");
	head.className = "section-head";

	const idx = document.createElement("span");
	idx.className = "section-index";
	idx.textContent = index;
	head.appendChild(idx);

	const titleRow = document.createElement("div");
	titleRow.className = "section-title-row";
	const h2 = document.createElement("h2");
	h2.className = "section-title";
	h2.textContent = title;
	titleRow.appendChild(h2);
	if (chip) {
		const c = document.createElement("span");
		c.className = "section-chip";
		c.textContent = chip;
		titleRow.appendChild(c);
	}
	head.appendChild(titleRow);

	if (desc) {
		const p = document.createElement("p");
		p.className = "section-desc";
		p.textContent = desc;
		head.appendChild(p);
	}
	return head;
}

 
function buildTrackSection(meta, tracks, threadHref, authorOf) {
	const section = document.createElement("section");
	section.className = "awards-section track-section";

	section.appendChild(
		buildSectionHeader(meta?.index || "01", meta?.title || "", meta?.desc),
	);

	const switcher = document.createElement("div");
	switcher.className = "track-switcher";
	switcher.setAttribute("role", "tablist");
	switcher.setAttribute("aria-label", "选择主题赛道");

	const podiumWrap = document.createElement("div");
	podiumWrap.className = "track-podium-wrap";

	 
	const podiums = tracks.map((track) =>
		buildPodium(track, threadHref, authorOf),
	);

	const activate = (idx) => {
		switcher.querySelectorAll(".track-tab").forEach((b, i) => {
			b.classList.toggle("is-active", i === idx);
			b.setAttribute("aria-selected", i === idx ? "true" : "false");
			b.tabIndex = i === idx ? 0 : -1;
		});
		podiums.forEach((p, i) => {
			const on = i === idx;
			p.classList.toggle("is-active", on);
			p.setAttribute("aria-hidden", on ? "false" : "true");
		});
		updateTrackState();
	};

	trackAutoActivate = activate;
	trackAutoCount = tracks.length;

	tracks.forEach((track, i) => {
		const btn = document.createElement("button");
		btn.type = "button";
		btn.className = "track-tab";
		btn.setAttribute("role", "tab");
		btn.setAttribute("aria-selected", String(i === 0));
		btn.tabIndex = i === 0 ? 0 : -1;
		btn.textContent = track.name || "赛道 " + (i + 1);
		btn.addEventListener("click", () => {
			activate(i);
			stopTrackAuto({ manual: true });
		});
		switcher.appendChild(btn);
	});

	let light = null;
	if (tracks.length >= 2) {
		light = document.createElement("span");
		light.className = "track-light";
		light.setAttribute("aria-hidden", "true");
		switcher.appendChild(light);
	}
	trackLight = light;

	const controls = document.createElement("div");
	controls.className = "track-controls";
	controls.appendChild(switcher);
	trackControls = controls;

	section.appendChild(controls);
	section.appendChild(podiumWrap);
	podiums.forEach((p) => podiumWrap.appendChild(p));
	activate(0);
	return section;
}

function buildPodium(track, threadHref, authorOf) {
	const wrap = document.createElement("div");
	wrap.className = "podium";
	const grid = document.createElement("div");
	grid.className = "podium-grid";

	const winners = Array.isArray(track.winners) ? track.winners : [];
	const byMedal = new Map(winners.map((w) => [w.medal, w]));

	for (const m of PODIUM_ORDER) {
		const w = byMedal.get(m);
		if (!w) continue;
		grid.appendChild(buildPodiumCard(w, m, threadHref, authorOf));
	}
	wrap.appendChild(grid);
	return wrap;
}

function buildPodiumCard(w, medal, threadHref, authorOf) {
	const card = document.createElement("article");
	card.className = "podium-card";
	card.dataset.medal = MEDAL_CLASS[medal] || "gold";

	const head = document.createElement("div");
	head.className = "podium-card-head";
	const seal = document.createElement("span");
	seal.className = "medal-seal medal-seal--" + (MEDAL_CLASS[medal] || "gold");
	seal.appendChild(buildIcon("medal"));
	seal.setAttribute("aria-hidden", "true");
	head.appendChild(seal);
	const label = document.createElement("span");
	label.className = "medal-label";
	label.textContent = medal;
	head.appendChild(label);
	card.appendChild(head);

	const title = document.createElement("h3");
	title.className = "podium-title";
	appendTitleOrLink(title, threadHref(w), w.title);
	card.appendChild(title);

	const authorName = authorOf(w);
	if (authorName) {
		const author = document.createElement("p");
		author.className = "podium-author";
		const lab = document.createElement("span");
		lab.className = "podium-author-label";
		lab.textContent = "作者";
		author.appendChild(lab);
		const name = document.createElement("span");
		name.className = "podium-author-name";
		name.textContent = authorName;
		author.appendChild(name);
		card.appendChild(author);
	}

	const href = threadHref(w);
	if (href) {
		card.appendChild(buildReadLink(href));
	}
	return card;
}

 
function buildReadLink(href) {
	const link = extLink(href);
	link.className = "read-link";
	const txt = document.createElement("span");
	txt.textContent = "阅读作品";
	const arrow = document.createElement("span");
	arrow.className = "arrow";
	arrow.textContent = "→";
	link.appendChild(txt);
	link.appendChild(arrow);
	return link;
}

 
function buildSpecialSection(meta, specials, threadHref, authorOf) {
	const section = document.createElement("section");
	section.className = "awards-section special-section";
	section.appendChild(
		buildSectionHeader(meta?.index || "02", meta?.title || "", meta?.desc),
	);
	const grid = document.createElement("div");
	grid.className = "specials-grid";
	specials.forEach((s, i) => {
		grid.appendChild(
			buildSpecialCard(s, i === 0 && specials.length >= 2, threadHref, authorOf),
		);
	});
	section.appendChild(grid);
	return section;
}

 
function openFullText(title, fullText) {
	let dlg = document.getElementById("note-dialog");
	if (!dlg) {
		dlg = document.createElement("dialog");
		dlg.id = "note-dialog";
		dlg.className = "note-dialog";

		const head = document.createElement("div");
		head.className = "note-dialog-head";
		const ttl = document.createElement("h3");
		ttl.className = "note-dialog-title";
		const close = document.createElement("button");
		close.type = "button";
		close.className = "note-dialog-close";
		close.setAttribute("aria-label", "关闭");
		close.textContent = "×";
		head.append(ttl, close);
		const body = document.createElement("div");
		body.className = "note-dialog-body";
		dlg.append(head, body);

		close.onclick = () => dlg.close();
		
		dlg.addEventListener("close", () => setBodyScrollLock(false));
		
		dlg.addEventListener("click", (e) => {
			const r = dlg.getBoundingClientRect();
			const outside =
				e.clientX < r.left ||
				e.clientX > r.right ||
				e.clientY < r.top ||
				e.clientY > r.bottom;
			if (outside) dlg.close();
		});
		dlg.__title = ttl;
		dlg.__body = body;
		document.body.appendChild(dlg);
	}
	dlg.__title.textContent = title || "";
	dlg.__body.textContent = fullText || "";
	if (!dlg.open) {
		dlg.showModal();
		
		dlg.__body.scrollTop = 0;
		setBodyScrollLock(true);
	}
}

 
function buildNoteMore(title, fullText) {
	const btn = document.createElement("button");
	btn.type = "button";
	btn.className = "note-more";
	const arrow = document.createElement("span");
	arrow.className = "note-more-arrow";
	arrow.setAttribute("aria-hidden", "true");
	arrow.textContent = "›";
	btn.append("查看更多", arrow);
	btn.addEventListener("click", () => openFullText(title, fullText));
	return btn;
}

 
function specialWorksOf(s) {
	if (Array.isArray(s.works) && s.works.length) {
		return s.works.map((w) => (typeof w === "string" ? { title: w } : w));
	}
	return s && s.title ? [s] : [];
}

function buildSpecialCard(s, isMain, threadHref, authorOf) {
	const card = document.createElement("article");
	card.className = "special-card" + (isMain ? " special-card--main" : "");

	const works = specialWorksOf(s);

	const top = document.createElement("div");
	top.className = "special-top";
	const icon = document.createElement("span");
	icon.className = "special-icon";
	icon.appendChild(buildIcon(s.icon));
	top.appendChild(icon);
	const name = document.createElement("h3");
	name.className = "special-name";
	name.textContent = s.name || "特别奖项";
	top.appendChild(name);
	card.appendChild(top);
	card.appendChild(top);

	 
	if (s.note) {
		const note = document.createElement("blockquote");
		note.className = "special-note";
		note.textContent = s.note;
		if (s.noteFull)
			note.append(
				buildNoteMore(s.name ? `${s.name} · 授奖词` : "授奖词", s.noteFull),
			);
		card.appendChild(note);
	} else if (s.noteFull) {
		card.appendChild(
			buildNoteMore(s.name ? `${s.name} · 授奖词` : "授奖词", s.noteFull),
		);
	}

	 
	const worksWrap = document.createElement("div");
	worksWrap.className = "special-works";
	for (const w of works) {
		const work = document.createElement("div");
		work.className = "special-work";
		const wt = document.createElement("p");
		wt.className = "special-work-title";
		appendTitleOrLink(wt, threadHref(w), w.title);
		work.appendChild(wt);
		const authorName = authorOf(w);
		if (authorName) {
			const wa = document.createElement("p");
			wa.className = "special-work-author";
			wa.textContent = authorName;
			work.appendChild(wa);
		}
		worksWrap.appendChild(work);
	}
	card.appendChild(worksWrap);
	return card;
}

 
function buildJudgesSection(meta, judges, threadHref, authorOf) {
	const section = document.createElement("section");
	section.className = "awards-section judges-section";
	section.appendChild(
		buildSectionHeader(meta?.index || "03", meta?.title || "", meta?.desc),
	);
	const grid = document.createElement("div");
	grid.className = "judges-grid";
	judges.forEach((j) =>
		grid.appendChild(buildJudgeCard(j, threadHref, authorOf)),
	);
	section.appendChild(grid);
	return section;
}

 
const EMPTY_NOTE = "暂无评语";

function hasJudgeNote(note) {
	return !!(note && note.trim() && note.trim() !== EMPTY_NOTE);
}

 
function resolveJudgeNote(j) {
	const firstWork = Array.isArray(j.works) && j.works.length ? j.works[0] : null;
	let note = "";
	if (hasJudgeNote(j.note)) note = j.note;
	else if (firstWork && hasJudgeNote(firstWork.note)) note = firstWork.note;
	const noteFull = (
		j.noteFull ||
		(firstWork && firstWork.noteFull) ||
		""
	).trim();
	 
	const noteImage = (
		j.noteImage ||
		(firstWork && firstWork.noteImage) ||
		""
	).trim();
	return { note, noteFull, noteImage };
}

 
function buildNoteImage(src) {
	const img = document.createElement("img");
	img.className = "judge-note-image";
	img.src = src;
	img.alt = "";
	img.loading = "lazy";
	img.addEventListener("error", () => img.remove());
	return img;
}

function buildJudgeCard(j, threadHref, authorOf) {
	const card = document.createElement("article");
	const { note, noteFull, noteImage } = resolveJudgeNote(j);
	const hasNote = !!note;

	 
	card.className =
		"judge-card" + (hasNote || noteFull ? "" : " judge-card--silent");

	if (hasNote) {
		const noteEl = document.createElement("blockquote");
		noteEl.className = "judge-note";
		noteEl.textContent = note;
		 
		if (noteImage) noteEl.append(buildNoteImage(noteImage));
		if (noteFull)
			noteEl.append(buildNoteMore(j.name ? `${j.name} · 评语` : "评语", noteFull));
		card.appendChild(noteEl);
	} else if (noteFull) {
		card.appendChild(
			buildNoteMore(j.name ? `${j.name} · 评语` : "评语", noteFull),
		);
	} else {
		 
		const pick = document.createElement("p");
		pick.className = "judge-pick";
		const role = document.createElement("span");
		role.className = "judge-pick-role";
		role.textContent = "评委";
		const nameEl = document.createElement("span");
		nameEl.className = "judge-pick-name";
		nameEl.textContent = j.name || "";
		const seal = document.createElement("span");
		seal.className = "judge-pick-seal";
		seal.textContent = "力荐";
		pick.append(role, nameEl, seal);
		card.appendChild(pick);
	}

	 
	if (noteImage && !hasNote) card.appendChild(buildNoteImage(noteImage));

	 
	if (hasNote || noteFull) {
		const sign = document.createElement("p");
		sign.className = "judge-sign";
		const dash = document.createElement("span");
		dash.textContent = "—— 评委 · ";
		sign.appendChild(dash);
		const name = document.createElement("b");
		name.textContent = j.name || "";
		sign.appendChild(name);
		card.appendChild(sign);
	}

	const works = Array.isArray(j.works) ? j.works : [];
	if (works.length) {
		const block = document.createElement("div");
		block.className = "judge-works";
		const label = document.createElement("p");
		label.className = "judge-works-label";
		label.textContent = j.award || (j.name ? j.name + "奖" : "推荐作品");
		block.appendChild(label);
		for (const w of works) {
			const item = document.createElement("div");
			item.className = "judge-work";
			const href = threadHref(w);
			const wt = document.createElement("p");
			wt.className = "judge-work-title";
			appendTitleOrLink(wt, href, w.title);
			item.appendChild(wt);
			const whoName = authorOf(w);
			if (whoName) {
				const who = document.createElement("p");
				who.className = "judge-work-who";
				who.textContent = whoName;
				item.appendChild(who);
			}
			block.appendChild(item);
		}
		card.appendChild(block);
	}
	return card;
}

 
export function setAppThreads(threads) {
	appThreads = threads || [];
}

export { renderAwards, jumpToAward, MEDAL_CLASS };
