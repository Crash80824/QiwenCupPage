 

 
export const MS_PER_DAY = 86400000;

 
export function debounce(fn, ms) {
	let timer;
	return (...args) => {
		clearTimeout(timer);
		timer = setTimeout(() => fn(...args), ms);
	};
}

 
let scrollLockCount = 0;
export function setBodyScrollLock(locked) {
	scrollLockCount = Math.max(0, scrollLockCount + (locked ? 1 : -1));
	document.body.classList.toggle("no-scroll", scrollLockCount > 0);
}

 

 
export function avatarUrl(forumBase, uid) {
	const s = String(uid).padStart(9, "0");
	return `${forumBase}data/avatar/${s.slice(0, 3)}/${s.slice(3, 5)}/${s.slice(5, 7)}/${s.slice(7, 9)}_avatar_big.jpg`;
}

 
export function makeThreadLookup(threads, cfg) {
	const forumBase = (cfg && cfg.forumBase) || "";
	const threadUrlPath =
		(cfg && cfg.threadUrlPath) || "forum.php?mod=viewthread&tid={tid}";
	const byTid = new Map();
	const byTitle = new Map();
	for (const t of threads || []) {
		byTid.set(String(t.tid), t);
		if (t.title) byTitle.set(t.title, t);
	}
	 
	const threadOf = (r) => {
		if (!r) return null;
		if (r.tid != null) {
			const t = byTid.get(String(r.tid));
			if (t) return t;
		}
		return r.title ? byTitle.get(r.title) : null;
	};
	 
	const authorOf = (r) => {
		if (!r) return "";
		if (r.author) return r.author;
		const t = threadOf(r);
		return t && t.username ? t.username : "";
	};
	 
	const threadHref = (r) => {
		let tid = r && r.tid != null ? r.tid : null;
		if (tid == null) {
			const t = threadOf(r);
			if (t) tid = t.tid;
		}
		return forumBase && tid != null
			? forumBase + threadUrlPath.replace("{tid}", String(tid))
			: "";
	};
	return { threadOf, threadHref, authorOf };
}

 

 
export function extLink(href, content) {
	const a = document.createElement("a");
	a.href = href;
	a.target = "_blank";
	a.rel = "noopener";
	if (content instanceof Node) a.appendChild(content);
	else if (content != null) a.textContent = content;
	return a;
}

 
export function appendTitleOrLink(parent, href, title) {
	const text = title || "(无标题)";
	if (href) parent.appendChild(extLink(href, text));
	else parent.textContent = text;
}

 
export function prefersReducedMotion() {
	return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

 

 
export function pad2(n) {
	return String(n).padStart(2, "0");
}

 
export function formatDateISO(date) {
	const d = new Date(date);
	return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

 
export const WEEKDAY_NAMES = [
	"周一",
	"周二",
	"周三",
	"周四",
	"周五",
	"周六",
	"周日",
];

 
export const WEEKDAY_UTC = [1, 2, 3, 4, 5, 6, 0];

 
const DATETIME_RE =
	/^(\d{4})-(\d{1,2})-(\d{1,2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?$/;

export function parseTime(s) {
	const m = String(s).trim().match(DATETIME_RE);
	if (!m) return null;
	return {
		Y: +m[1],
		M: +m[2],
		D: +m[3],
		h: +m[4],
		mi: +m[5],
		s: m[6] ? +m[6] : 0,
	};
}

 
export function timeToMs(t) {
	return Date.UTC(t.Y, t.M - 1, t.D, t.h, t.mi, t.s || 0);
}

 
export function parseDateAny(s) {
	const str = String(s).trim();
	const m = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
	if (m) return Date.UTC(+m[1], +m[2] - 1, +m[3], 0, 0, 0);
	const t = parseTime(str);
	if (t) return timeToMs(t);
	return NaN;
}

 
export function shiftedDate(t, boundary = 6) {
	const d = new Date(Date.UTC(t.Y, t.M - 1, t.D));
	if (t.h < boundary) d.setUTCDate(d.getUTCDate() - 1);
	return d;
}

 
export function parseCutoff(cs) {
	if (!cs) return { ms: 0, subtitle: "" };
	const t = parseTime(cs);
	if (!t) {
		console.warn(
			'[utils] 截止时间解析失败，请按 "YYYY-MM-DD HH:MM" 格式填写：',
			cs,
		);
		return { ms: 0, subtitle: "" };
	}
	return {
		ms: timeToMs(t),
		subtitle: `数据截至 ${t.Y}-${pad2(t.M)}-${pad2(t.D)} ${pad2(t.h)}:${pad2(t.mi)}`,
	};
}

 

 
export function hexToRGB(hex) {
	const h = hex.replace("#", "");
	return [
		parseInt(h.slice(0, 2), 16),
		parseInt(h.slice(2, 4), 16),
		parseInt(h.slice(4, 6), 16),
	];
}

 

 
export function dailyAndCumulative(dates) {
	const counter = new Map();
	for (const d of dates) {
		const k = d.getTime();
		counter.set(k, (counter.get(k) || 0) + 1);
	}
	if (!counter.size) return { dates: [], daily: [], cumulative: [] };
	const keys = [...counter.keys()].sort((a, b) => a - b);
	const start = keys[0];
	const end = keys[keys.length - 1];
	const full = [];
	for (let t = start; t <= end; t += MS_PER_DAY) full.push(t);
	const daily = full.map((k) => counter.get(k) || 0);
	const cumulative = [];
	let running = 0;
	for (const c of daily) {
		running += c;
		cumulative.push(running);
	}
	return {
		dates: full.map((k) => formatDateISO(k)),
		daily,
		cumulative,
	};
}
