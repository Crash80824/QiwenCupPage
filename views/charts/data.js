import CONFIG from "../../data/config.js";
import { COLORS, ROSE_PALETTE } from "../../scripts/theme.js";
import CHARTS from "../../data/charts.js";
import JUDGE_STATS from "../../data/judge_stats.js";
import {
	MS_PER_DAY,
	WEEKDAY_NAMES,
	parseTime,
	parseDateAny,
	shiftedDate,
	parseCutoff,
	WEEKDAY_UTC,
	dailyAndCumulative,
} from "../../scripts/utils.js";
import {
	medianOf,
	trimmedMean,
	stddev,
	meanByGroup,
} from "../../scripts/math.js";

 

 

 
const HOUR_PERIOD_LABELS = (() => {
	const a = [];
	for (let h = 0; h < 24; h += 2) a.push(`${h}-${h + 2}点`);
	return a;
})();

 
function threadTimes(threads) {
	const times = [];
	for (const r of threads) {
		if (!r.submit_time) continue;
		const t = parseTime(r.submit_time);
		if (t) times.push(t);
	}
	return times;
}

 

 
function computeWorkAvg(rows) {
	return meanByGroup(
		rows
			.filter((r) => r.score != null)
			.map((r) => ({ key: r.title, value: +r.score })),
	);
}

function computeTrend(times) {
	return dailyAndCumulative(times.map((t) => shiftedDate(t, 6)));
}

function computeRose(times) {
	
	const weekdayCounts = new Array(7).fill(0);
	
	const counts = new Array(12).fill(0);
	for (const t of times) {
		const wd = new Date(Date.UTC(t.Y, t.M - 1, t.D)).getUTCDay();
		const row = WEEKDAY_UTC.indexOf(wd);
		if (row >= 0) weekdayCounts[row]++;
		const bucket = Math.floor(t.h / 2);
		if (bucket >= 0 && bucket < 12) counts[bucket]++;
	}
	return {
		labels: HOUR_PERIOD_LABELS,
		counts,
		weekdayLabels: WEEKDAY_NAMES,
		weekdayCounts,
	};
}

function computeScoreHeatmap(rows) {
	const workScores = new Map();
	const judgesOrder = [];
	const judgesSet = new Set();
	const judgeScoreCount = new Map();
	for (const r of rows) {
		const title = r.title;
		const judge = r.judge;
		if (title == null || judge == null) continue;
		if (!workScores.has(title)) workScores.set(title, []);
		workScores.get(title).push([judge, r.score]);
		
		if (r.score != null)
			judgeScoreCount.set(judge, (judgeScoreCount.get(judge) || 0) + 1);
		if (!judgesSet.has(judge)) {
			judgesSet.add(judge);
			judgesOrder.push(judge);
		}
	}
	
	const rankScoreByTitle = new Map();
	for (const [title, entries] of workScores) {
		const vals = entries.map(([, s]) => s).filter((s) => s != null);
		rankScoreByTitle.set(title, vals.length ? trimmedMean(vals) : -1);
	}
	const titles = [...workScores.keys()].sort(
		(a, b) => rankScoreByTitle.get(b) - rankScoreByTitle.get(a),
	);
	const titleIndex = new Map(titles.map((t, i) => [t, i]));
	
	judgesOrder.sort(
		(a, b) => (judgeScoreCount.get(b) || 0) - (judgeScoreCount.get(a) || 0),
	);
	
	const judges = judgesOrder.filter((j) => (judgeScoreCount.get(j) || 0) > 0);
	const judgeIndex = new Map(judges.map((j, i) => [j, i]));
	const cells = [];
	for (const r of rows) {
		const title = r.title;
		const judge = r.judge;
		if (title == null || judge == null) continue;
		if (!judgeIndex.has(judge)) continue; 
		const score = r.score;
		cells.push({
			value: [
				titleIndex.get(title),
				judgeIndex.get(judge),
				score == null ? -1 : score,
			],
			score,
			title,
			judge,
		});
	}
	return { titles, judges, cells };
}

 
function computeJudgeQuadrant() {
	const judges = JUDGE_STATS.map((j) => ({
		name: j.name,
		count: j.count,
		avg: j.avg,
		min: j.min,
		max: j.max,
		std: j.std,
	}));
	return {
		judges,
		medCount: medianOf(judges.map((j) => j.count)),
		medAvg: medianOf(judges.map((j) => j.avg)),
	};
}

 
function computeJudgeDistribution() {
	const judges = [...JUDGE_STATS].sort((a, b) => a.avg - b.avg);
	const summaries = judges.map((j) => [j.min, j.q1, j.median, j.q3, j.max]);
	
	const total = judges.reduce((s, j) => s + j.count, 0);
	const overall = total
		? judges.reduce((s, j) => s + j.avg * j.count, 0) / total
		: 0;
	return {
		judges: judges.map((j) => j.name),
		summaries,
		overall,
	};
}

 
function computeScoreConsensus(scores, threads) {
	const byWork = new Map();
	for (const r of scores) {
		if (r.score == null) continue;
		if (!byWork.has(r.title)) byWork.set(r.title, []);
		byWork.get(r.title).push(+r.score);
	}
	const viewsByTitle = new Map();
	for (const t of threads) viewsByTitle.set(t.title, parseInt(t.views, 10));
	const works = [];
	for (const [title, vals] of byWork) {
		if (vals.length < 2) continue;
		const sorted = [...vals].sort((a, b) => a - b);
		const avg = trimmedMean(vals);
		const std = stddev(vals);
		works.push({
			title,
			avg,
			std,
			n: vals.length,
			min: sorted[0],
			max: sorted[sorted.length - 1],
			views: viewsByTitle.get(title) || 0,
		});
	}
	return {
		works,
		medAvg: medianOf(works.map((w) => w.avg)),
		medStd: medianOf(works.map((w) => w.std)),
	};
}

 
function computeGroupCompare(threads, users) {
	const userByUid = new Map(users.map((u) => [u.uid, u]));
	const ORDER = CONFIG.userGroupOrder;
	const groups = {};
	for (const g of ORDER)
		groups[g] = {
			uids: new Set(),
			works: 0,
			views: 0,
			replies: 0,
			favs: 0,
			viewsArr: [],
			repliesArr: [],
			favsArr: [],
		};
	const classify = (u) => {
		if (!u) return null;
		const profile = u["活跃概况"];
		if (!profile) return null;
		
		if (profile["管理组"] != null) return "管理";
		const g = profile["用户组"];
		if (g === "名誉会员" || g === "名誉版主") return "名誉";
		if (g === "VIP") return "VIP";
		if (g && ORDER.includes(g)) return g;
		return null;
	};
	for (const t of threads) {
		const g = classify(userByUid.get(t.uid));
		if (!g) continue;
		const d = groups[g];
		d.uids.add(t.uid);
		d.works++;
		const v = parseInt(t.views, 10);
		const r = parseInt(t.replies, 10);
		const f = parseInt(t.favs, 10);
		d.views += v;
		d.replies += r;
		d.favs += f;
		d.viewsArr.push(v);
		d.repliesArr.push(r);
		d.favsArr.push(f);
	}
	return ORDER.map((g) => {
		const d = groups[g];
		const n = d.works || 1;
		return {
			name: g,
			authors: d.uids.size,
			works: d.works,
			avgViews: d.views / n,
			avgReplies: d.replies / n,
			avgFavs: d.favs / n,
			
			medViews: medianOf(d.viewsArr),
			medReplies: medianOf(d.repliesArr),
			medFavs: medianOf(d.favsArr),
		};
	}).filter((g) => g.works > 0);
}

 
function computeMedalSunburst(threads, users, scores) {
	const BUCKETS = [
		{
			name: "人气作者",
			color: COLORS.primary,
			test: (u) => (u.勋章 || []).includes("人气作者"),
		},
		{
			name: "原创作者",
			color: COLORS.accent,
			test: (u) => (u.勋章 || []).includes("原创作者"),
		},
		{ name: "其他作者", color: ROSE_PALETTE[5], test: () => true }, 
	];
	const agg = {};
	for (const t of threads) {
		const a = agg[t.uid] || (agg[t.uid] = { views: 0, favs: 0, works: 0 });
		a.views += parseInt(t.views, 10);
		a.favs += parseInt(t.favs, 10);
		a.works++;
	}
	const workAvg = computeWorkAvg(scores);
	const titleToUid = {};
	for (const t of threads) titleToUid[t.title] = t.uid;
	const authorAvg = {};
	for (const [title, avg] of Object.entries(workAvg)) {
		const uid = titleToUid[title];
		if (uid == null) continue;
		(authorAvg[uid] = authorAvg[uid] || []).push(avg);
	}
	const buckets = BUCKETS.map((b) => ({ ...b, list: [] }));
	for (const u of users) {
		const idx = BUCKETS.findIndex((b) => b.test(u));
		if (idx >= 0) buckets[idx].list.push(u);
	}
	const children = buckets.map((b) => {
		const leaves = b.list
			.map((u) => {
				const a = agg[u.uid] || { views: 0, works: 0 };
				const avgs = authorAvg[u.uid] || [];
				const avgScore = avgs.length
					? avgs.reduce((x, y) => x + y, 0) / avgs.length
					: null;
				return {
					name: u.username,
					value: a.views,
					views: a.views,
					favs: a.favs,
					works: a.works,
					avgScore,
					itemStyle: { color: b.color, opacity: 0.8 },
				};
			})
			.filter((c) => c.value > 0)
			.sort((p, q) => q.value - p.value);
		const views = leaves.reduce((s, c) => s + c.views, 0);
		const favs = leaves.reduce((s, c) => s + c.favs, 0);
		return {
			name: b.name,
			itemStyle: { color: b.color },
			views,
			favs,
			children: leaves,
		};
	});
	const total = children.reduce((s, b) => s + b.children.length, 0);
	const views = children.reduce((s, b) => s + b.views, 0);
	const favs = children.reduce((s, b) => s + b.favs, 0);
	return {
		root: {
			name: "全部参赛者",
			itemStyle: { color: COLORS.treemapRoot },
			total,
			views,
			favs,
			children,
		},
	};
}

 
function computeWeekdayHour(times) {
	const xLabels = HOUR_PERIOD_LABELS;
	const yLabels = WEEKDAY_NAMES;
	const WD = WEEKDAY_UTC; 
	const cnt = Array.from({ length: 7 }, () => new Array(12).fill(0));
	for (const t of times) {
		const wd = new Date(Date.UTC(t.Y, t.M - 1, t.D)).getUTCDay();
		const row = WD.indexOf(wd);
		const bucket = Math.floor(t.h / 2);
		if (row >= 0 && bucket >= 0 && bucket < 12) cnt[row][bucket]++;
	}
	const cells = [];
	let max = 0;
	for (let yi = 0; yi < 7; yi++) {
		for (let xi = 0; xi < 12; xi++) {
			const v = cnt[yi][xi];
			cells.push([xi, yi, v]);
			if (v > max) max = v;
		}
	}
	return { xLabels, yLabels, cells, max };
}

 
function computeInactivity(threads, users) {
	const earliest = new Map();
	for (const t of threads) {
		if (!t.submit_time || !t.uid) continue;
		const ms = parseDateAny(t.submit_time);
		if (!Number.isFinite(ms)) continue;
		if (!earliest.has(t.uid) || ms < earliest.get(t.uid)) earliest.set(t.uid, ms);
	}
	const rows = [];
	for (const u of users) {
		const subMs = earliest.get(u.uid);
		if (subMs == null) continue;
		let lastMs = NaN;
		let source = "";
		const lastInBoard = u.last_submit_in_fid7;
		if (lastInBoard && lastInBoard.date) {
			lastMs = parseDateAny(lastInBoard.date);
			source = "fid7";
		} else if (u.活跃概况 && u.活跃概况.注册时间) {
			lastMs = parseDateAny(u.活跃概况.注册时间);
			source = "reg";
		}
		if (!Number.isFinite(lastMs)) continue;
		rows.push({
			name: u.username,
			uid: u.uid,
			subMs,
			lastMs,
			days: (subMs - lastMs) / MS_PER_DAY,
			source,
		});
	}
	rows.sort((a, b) => b.days - a.days);
	return { rows };
}

 
function enrichUsersWithActiveGap(rows, users) {
	const gapByUid = new Map();
	for (const r of rows) {
		if (Number.isFinite(r.days)) gapByUid.set(r.uid, r.days);
	}
	return users.map((u) => ({ ...u, __activeGap: gapByUid.get(u.uid) }));
}

 
function computePopularityStack(users) {
	const KEYS = ["digest", "submission", "discussion_self", "discussion_others"];
	const rows = users
		.map((u) => {
			const p = u.popularity || {};
			const parts = {};
			let total = 0;
			for (const k of KEYS) {
				let v = 0;
				if (k === "digest" || k === "submission" || k === "discussion_self") {
					
					const key = k === "discussion_self" ? "discussion" : k;
					for (const e of p.self || []) v += Number(e[key]) || 0;
				} else {
					
					v = Number(p.others) || 0;
				}
				parts[k] = v;
				total += v;
			}
			return { name: u.username, ...parts, total };
		})
		.sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
	return { rows };
}

 
function computeTrackUpset(threads) {
	const setCount = new Map();
	const works = [];
	for (const t of threads) {
		const tracks = t["赛道"];
		if (!Array.isArray(tracks) || tracks.length === 0) continue;
		const mapped = new Set();
		for (const tr of tracks) if (CONFIG.validTracks.includes(tr)) mapped.add(tr);
		
		if (mapped.size === 0) continue;
		const uniq = [...mapped];
		for (const tr of uniq) setCount.set(tr, (setCount.get(tr) || 0) + 1);
		works.push(uniq);
	}
	
	const tracks = CONFIG.validTracks
		.filter((t) => setCount.has(t))
		.sort((a, b) => setCount.get(b) - setCount.get(a));
	const idx = new Map(tracks.map((t, i) => [t, i]));
	const setSizes = tracks.map((t) => setCount.get(t));
	const combo = new Map();
	for (const ws of works) {
		const key = ws
			.map((t) => idx.get(t))
			.sort((a, b) => a - b)
			.join(",");
		combo.set(key, (combo.get(key) || 0) + 1);
	}
	const cmpArr = (a, b) => {
		const n = Math.min(a.length, b.length);
		for (let i = 0; i < n; i++) if (a[i] !== b[i]) return a[i] - b[i];
		return a.length - b.length;
	};
	const sortBySizeDeg = (a, b) =>
		b.size - a.size ||
		a.members.length - b.members.length ||
		cmpArr(a.members, b.members);
	const intersections = [...combo]
		.map(([key, size]) => ({
			members: key.split(",").map(Number),
			size,
		}))
		.sort(sortBySizeDeg);
	return { tracks, setSizes, intersections, total: works.length };
}

 
function computeDataFor(id, raw, inactivity) {
	switch (id) {
		case "trend_6am":
			return computeTrend(threadTimes(raw.threads));
		case "hourly_rose":
			return computeRose(threadTimes(raw.threads));
		case "score_heatmap":
			return computeScoreHeatmap(raw.scores);

		case "judge_quadrant":
			return computeJudgeQuadrant();
		case "judge_distribution":
			return computeJudgeDistribution();
		case "user_popularity":
			return {
				group: computeGroupCompare(raw.threads, raw.users),
				medal: computeMedalSunburst(raw.threads, raw.users, raw.scores),
			};
		case "popularity_stack":
			return computePopularityStack(raw.users);
		case "weekday_hour_heatmap":
			return computeWeekdayHour(threadTimes(raw.threads));

		case "score_consensus":
			return computeScoreConsensus(raw.scores, raw.threads);
		case "correlation":
		case "distribution_hist":
			return {
				threads: raw.threads,
				users: enrichUsersWithActiveGap(inactivity, raw.users),
				cutoff: raw.cutoff,
			};
		case "inactivity_dumbbell":
			return { rows: inactivity };
		case "track_upset":
			return computeTrackUpset(raw.threads);
		default:
			return {};
	}
}

export function buildDoc(raw) {
	const { ms: cutoffMs, subtitle } = parseCutoff(CONFIG.cutoff);
	const raw2 = { ...raw, cutoff: cutoffMs };
	
	const inactivity = computeInactivity(raw2.threads, raw2.users).rows;
	return {
		title: CONFIG.title,
		subtitle,
		threads: raw.threads,
		categories: CHARTS.map((cat) => ({
			id: cat.id,
			name: cat.name,
			charts: cat.charts.map((ch) => ({
				...ch,
				data: computeDataFor(ch.id, raw2, inactivity),
			})),
		})),
	};
}
