import { parseTime, timeToMs, MS_PER_DAY } from "../../scripts/utils.js";
import { ratio } from "../../scripts/math.js";
import CONFIG from "../../data/config.json" with { type: "json" };

 

 
 
const METRIC_GETTERS = {
	points: (_r, u) => parseInt(u?.["统计信息"]?.["积分"], 10),
	contribution: (_r, u) => parseInt(u?.["统计信息"]?.["贡献"], 10),
	trend: (_r, u) => parseInt(u?.["统计信息"]?.["人气"], 10),
	author_threads: (_r, u) => parseInt(u?.["统计信息"]?.["主题数"], 10),
	author_replies: (_r, u) => parseInt(u?.["统计信息"]?.["回帖数"], 10),
	fans: (_r, u) => parseInt(u?.["统计信息"]?.["粉丝数"], 10),
	reg_days: (_r, u, cutoff) => regDurationDays(u, cutoff),
	online_hours: (_r, u) => parseInt(u?.["活跃概况"]?.["在线时间"], 10),
	active_gap: (_r, u) => u?.__activeGap, 
	event_income: (r, u) => {
		const e = workPopularity(r, u);
		return e ? workIncomeSum(e) : NaN; 
	},
	event_income_self: (r, u) => {
		const e = workPopularity(r, u);
		return e ? workIncomeSum(e, ["submission", "discussion"]) : NaN; 
	},
	views: (r) => parseInt(r.views, 10),
	replies: (r) => parseInt(r.replies, 10),
	favs: (r) => parseInt(r.favs, 10),
	other_replies: (r) => parseInt(r.other_replies, 10),
	daily_views: (r, _u, cutoff) => dailyViews(r, cutoff),
	rr_other: (r) =>
		ratio(parseInt(r.other_replies, 10), parseInt(r.views, 10)) * 100,
	fav_ratio: (r) => ratio(parseInt(r.favs, 10), parseInt(r.views, 10)) * 100,
	
	engagement: (r) => {
		const rep = parseInt(r.replies, 10);
		const ar = parseInt(r.author_replies, 10);
		const fl = Array.isArray(r.floors) ? r.floors.length : NaN;
		if (!Number.isFinite(rep) || !Number.isFinite(ar) || !Number.isFinite(fl))
			return NaN;
		const authorChat = ar - fl + 1; 
		const totalChat = rep - fl + 1; 
		if (authorChat < 0 || totalChat <= 0) return NaN;
		return (authorChat / totalChat) * 100;
	},
	word_count: (r) => parseInt(r.word_count, 10),
	newline_count: (r) => parseInt(r.newline_count, 10),
	niao_count: (r) => parseInt(r.niao_count, 10),
	track_count: (r) => (Array.isArray(r["赛道"]) ? r["赛道"].length : NaN),
	submit_hour: (r) => {
		const t = parseTime(r.submit_time);
		return t ? t.h : NaN;
	},
	edit_days: (r) => editDurationDays(r),
	content_floors: (r) => (Array.isArray(r.floors) ? r.floors.length : NaN),
};

 
const METRICS = (CONFIG.metrics || []).map((m) => ({
	key: m.key,
	label: m.label,
	...(m.unit ? { unit: m.unit } : {}),
	...(m.group ? { group: m.group } : {}),
	get: METRIC_GETTERS[m.key],
}));

 
function regDurationDays(u, cutoff) {
	const s = u?.["活跃概况"]?.["注册时间"];
	if (!s) return NaN;
	const t = parseTime(s);
	if (!t) return NaN;
	return (cutoff - timeToMs(t)) / MS_PER_DAY;
}

 
function dailyViews(r, cutoff) {
	if (!r.submit_time) return NaN;
	const t = parseTime(r.submit_time);
	if (!t) return NaN;
	const days = (cutoff - timeToMs(t)) / MS_PER_DAY;
	return days > 0 ? parseInt(r.views, 10) / days : NaN;
}

 
function editDurationDays(r) {
	if (!r.submit_time || !r.last_edit_time) return NaN;
	const s = parseTime(r.submit_time);
	const e = parseTime(r.last_edit_time);
	if (!s || !e) return NaN;
	const ms = timeToMs(e) - timeToMs(s);
	return Math.ceil(ms / MS_PER_DAY);
}

 
function workPopularity(r, u) {
	const p = u?.popularity;
	if (!p || !Array.isArray(p.self)) return null;
	return p.self.find((e) => String(e.tid) === String(r.tid)) || null;
}

 
function workIncomeSum(entry, keys) {
	const list = keys || ["submission", "digest", "discussion"];
	let s = 0;
	for (const k of list) {
		const v = Number(entry[k]);
		if (!Number.isFinite(v)) return NaN;
		s += v;
	}
	return s;
}

 
const METRIC_GROUPS = (CONFIG.metricGroups || []).map((g) => {
	let start = -1;
	let end = -1;
	CONFIG.metrics.forEach((m, i) => {
		if (m.group === g.id) {
			if (start === -1) start = i;
			end = i + 1;
		}
	});
	return {
		label: g.label,
		start: start === -1 ? 0 : start,
		end: end === -1 ? 0 : end,
	};
});

 
export const KEY = Object.freeze({
	VIEWS: "views",
	REPLIES: "replies",
	OTHER_REPLIES: "other_replies",
	WORD_COUNT: "word_count",
	FAVS: "favs",
});
export { METRICS, METRIC_GROUPS };

 
export const isAuthorMetric = (m) => m?.group === "author-accum";
