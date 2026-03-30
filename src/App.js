import React, { useState } from "react";
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Slider,
  Skeleton,
} from "@mui/material";
import { CS_DATES, CS_HPA } from "./caseShillerData";
import kalshiLogo from "./kalshi.svg";
import {
  Chart as ChartJS,
  LineElement,
  BarElement,
  PointElement,
  LinearScale,
  CategoryScale,
  ArcElement,
  Tooltip,
  Legend,
  Title,
  Filler,
} from "chart.js";
import { Line, Bar, Scatter, Pie } from "react-chartjs-2";
import { ComposableMap, Geographies, Geography, ZoomableGroup, Marker } from "react-simple-maps";
import { C, HOME_VALUE, BM_START, BM, CAP_SCHEDULE, CITY_COLORS, baseFont, baseTooltip, baseGridScale, baseLegend, PROJ_START, PROJ, KALSHI_SERIES_META, GROUND_SCORE_SUPPLEMENTAL, GROUND_SCORE_CS_PROXY, GROUND_SCORE_CS_DIST, NEOPOLI_DIMS, NEOPOLI_TIER_META, NEOPOLI_MARKETS, OPPORTUNITY_DIMS, OPPORTUNITY_SCORES, OPPORTUNITY_SUPPLEMENTAL } from "./data";

const legendBottomPadding = {
  id: "legendBottomPadding",
  beforeInit(chart) {
    const origFit = chart.legend.fit.bind(chart.legend);
    chart.legend.fit = function () {
      origFit();
      this.height += 12;
    };
  },
};

ChartJS.register(
  LineElement,
  BarElement,
  PointElement,
  LinearScale,
  CategoryScale,
  ArcElement,
  Tooltip,
  Legend,
  Title,
  Filler,
  legendBottomPadding,
);

const getBM = (field, yr) => {
  const i = yr - BM_START;
  return BM[field]?.[i] ?? null;
};

// ─── Annual HPA from Case-Shiller monthly data ─────────────────────────────
// Derive annual avg YoY% from the monthly FRED series. For 2016-2025 the exact
// spreadsheet values override the CS averages to preserve model accuracy.
const _csAcc = {};
CS_DATES.forEach((d, i) => {
  const yr = parseInt(d.slice(0, 4));
  const v = CS_HPA.USA[i];
  if (v != null) {
    (_csAcc[yr] = _csAcc[yr] || []).push(v);
  }
});
const CS_ANNUAL_USA = Object.fromEntries(
  Object.entries(_csAcc).map(([yr, vals]) => [
    +yr,
    vals.reduce((s, v) => s + v, 0) / vals.length,
  ]),
);
// Override 2016-2025 with exact spreadsheet values
// Object.assign(CS_ANNUAL_USA, {
//   2016: 5.3,
//   2017: 6.3,
//   2018: 5.1,
//   2019: 3.5,
//   2020: 10.4,
//   2021: 18.8,
//   2022: 7.0,
//   2023: 5.5,
//   2024: 4.3,
//   2025: 1.3,
// });
const getHPA = (yr) => CS_ANNUAL_USA[yr] ?? null;


// ─── Helpers ───────────────────────────────────────────────────────────────
const avg = (arr) =>
  arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
const stdv = (arr) => {
  const m = avg(arr);
  return Math.sqrt(
    arr.reduce((s, v) => s + (v - m) ** 2, 0) / (arr.length || 1),
  );
};
const calcStats = (returns) => {
  if (!returns || returns.length === 0)
    return { avg: 0, vol: 0, sharpe: 0, total: 0 };
  const a = avg(returns);
  const v = stdv(returns);
  const sharpe = v > 0 ? (a - 2) / v : 0;
  const total = (returns.reduce((acc, r) => acc * (1 + r / 100), 1) - 1) * 100;
  return { avg: a, vol: v, sharpe, total };
};
const cumulative = (returns, seed = 10000) =>
  returns.reduce((acc, r) => {
    acc.push((acc.length ? acc[acc.length - 1] : seed) * (1 + r / 100));
    return acc;
  }, []);
const fmtPct = (n, d = 1) => (n >= 0 ? "+" : "") + n.toFixed(d) + "%";
const fmtUSD = (n) => "$" + Math.round(n).toLocaleString("en-US");
const fmtSign = (n, d = 2) => (n >= 0 ? "+" : "") + n.toFixed(d) + "%";

// ─── Sub-components ────────────────────────────────────────────────────────
const SectionHeader = ({ title, sub }) => (
  <Box sx={{ mb: 2, pb: 1, borderBottom: `2px solid ${C.navy}` }}>
    <Typography
      sx={{
        fontSize: 11,
        fontWeight: 800,
        color: C.navy,
        textTransform: "uppercase",
        letterSpacing: "0.09em",
      }}
    >
      {title}
    </Typography>
    {sub && (
      <Typography sx={{ fontSize: 10, color: C.muted, mt: 0.25 }}>
        {sub}
      </Typography>
    )}
  </Box>
);

const StatCard = ({ label, value, sub, accent }) => (
  <Box
    sx={{
      bgcolor: C.white,
      border: `1px solid ${C.border}`,
      borderTop: `3px solid ${accent || C.navy}`,
      p: 2,
      borderRadius: 1,
      flex: 1,
      minWidth: 130,
    }}
  >
    <Typography
      sx={{
        fontSize: 10,
        fontWeight: 700,
        color: C.muted,
        textTransform: "uppercase",
        letterSpacing: "0.07em",
      }}
    >
      {label}
    </Typography>
    <Typography
      sx={{
        fontSize: 22,
        fontWeight: 800,
        color: accent || C.charcoal,
        mt: 0.5,
        lineHeight: 1,
      }}
    >
      {value}
    </Typography>
    {sub && (
      <Typography sx={{ fontSize: 10, color: C.muted, mt: 0.4 }}>
        {sub}
      </Typography>
    )}
  </Box>
);

const BulletRow = ({ label, value, benchmarks, max }) => {
  const pct = (v) => `${Math.max(0, Math.min(100, (v / (max || 1)) * 100))}%`;
  return (
    <Box sx={{ mb: 2 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.5 }}>
        <Typography sx={{ fontSize: 11, fontWeight: 600, color: C.charcoal }}>
          {label}
        </Typography>
        <Typography sx={{ fontSize: 11, fontWeight: 800, color: C.navyDark }}>
          {value.toFixed(2)}%
        </Typography>
      </Box>
      {/* track */}
      <Box
        sx={{
          position: "relative",
          height: 16,
          bgcolor: "#e2e8f0",
          borderRadius: "4px",
          overflow: "hidden",
        }}
      >
        {benchmarks.map((b, i) => (
          <Box
            key={i}
            sx={{
              position: "absolute",
              left: 0,
              top: 0,
              height: "100%",
              width: pct(b.value),
              bgcolor: b.color,
              opacity: 0.22,
            }}
          />
        ))}
        <Box
          sx={{
            position: "absolute",
            left: 0,
            top: "25%",
            height: "50%",
            width: pct(value),
            bgcolor: C.navyDark,
            borderRadius: "0 3px 3px 0",
            zIndex: 1,
          }}
        />
      </Box>
      <Box sx={{ display: "flex", gap: 2, mt: 0.5 }}>
        {benchmarks.map((b, i) => (
          <Typography key={i} sx={{ fontSize: 10, color: C.muted }}>
            <span style={{ color: b.color, fontSize: 10 }}>■</span> {b.label}:{" "}
            {b.value.toFixed(1)}%
          </Typography>
        ))}
      </Box>
    </Box>
  );
};


// ─── Housing Driver Correlations (2016–2025) ────────────────────────────────
const generateInterp = (label, r, vals, hpaVals) => {
  const pairs = vals.map((v, i) => [v, hpaVals[i]]).filter(([v, h]) => v != null && h != null);
  if (pairs.length < 2) return "Insufficient data for this period.";
  const vs = pairs.map(([v]) => v);
  const avg = vs.reduce((s, v) => s + v, 0) / vs.length;
  const rising = vs[vs.length - 1] > vs[0];

  switch (label) {
    case "Rental Vacancy Rate": {
      const tight = avg < 6.5;
      return `Vacancy averaged ${avg.toFixed(1)}% (${tight ? "tight" : "elevated"}) and ${rising ? "rose" : "fell"} over the period. ${
        r < -0.5 ? "Tightening rentals strongly pushed demand toward ownership, amplifying appreciation." :
        r < -0.2 ? "Moderately tight conditions provided some support for price gains." :
        "Loosening rental supply reduced pressure on home prices."
      }`;
    }
    case "Months of Supply": {
      const low = avg < 3.5;
      return `Supply averaged ${avg.toFixed(1)} months (equilibrium ≈ 4–5 months). ${
        low ? "Severe inventory constraints" : avg < 5 ? "Below-equilibrium supply" : "Adequate supply"
      } ${r < -0.5 ? "was the dominant driver of price pressure this period." : r < -0.2 ? "provided moderate price support." : "limited the upside for appreciation."}`;
    }
    case "CPI Inflation": {
      return `Inflation averaged ${avg.toFixed(1)}% annually over the period. ${
        r > 0.5 ? "High inflation closely tracked nominal price surges — both peaked in the same window." :
        r > 0.2 ? "Moderate inflation alignment suggests some pass-through to home values." :
        "Inflation moved largely independently of price trends this period."
      }`;
    }
    case "Housing Starts (000s)": {
      return `Single-family starts averaged ${Math.round(avg)}k/yr and were ${rising ? "trending up" : "trending down"}. ${
        r > 0.5 ? "Starts rose during the demand boom but couldn't outpace demand — supply lag amplified gains." :
        r > 0.2 ? "Modest build-up tracked appreciation with a lag." :
        r < -0.2 ? "Builder pullback coincided with cooling demand — a counter-cyclical pattern." :
        "Construction levels had little directional relationship with prices this period."
      }`;
    }
    case "NAHB Builder Confidence": {
      const sentiment = avg >= 60 ? "strong" : avg >= 50 ? "neutral-to-positive" : "weak";
      return `Builder confidence averaged ${Math.round(avg)} (${sentiment}; 50 = neutral) and was ${rising ? "improving" : "declining"}. ${
        r > 0.4 ? "Confidence tracked appreciation, reflecting shared optimism about housing demand." :
        r < -0.4 ? "Builders turned cautious as market conditions shifted — a leading indicator of cooling." :
        "Sentiment had a mixed relationship with price trends this period."
      }`;
    }
    case "Mortgage Rate": {
      return `Rates averaged ${avg.toFixed(1)}% and were ${rising ? "rising" : "falling"} over the period. ${
        r < -0.4 ? "Higher borrowing costs visibly weighed on buyer affordability and tempered gains." :
        r < -0.1 ? "Some rate pressure, though other demand factors partially offset the drag." :
        "Rate levels were low enough that appreciation persisted despite upward movement."
      }`;
    }
    case "10-Year Treasury Yield": {
      return `The 10yr yield averaged ${avg.toFixed(2)}% and was ${rising ? "rising" : "falling"} over the period. ${
        r < -0.4 ? "Rising yields tightened financing conditions and correlated with price moderation." :
        r < -0.1 ? "Yield movements had some dampening effect on housing through mortgage rates." :
        "Yields moved without a clear directional relationship to appreciation this period."
      }`;
    }
    case "Price-to-Income Ratio": {
      return `Price/income averaged ${avg.toFixed(1)}× and was ${rising ? "expanding" : "compressing"}. ${
        r > 0.4 ? "Prices outpaced incomes throughout — demand held up despite stretched affordability." :
        r < -0.4 ? "As affordability compressed, price growth slowed — a natural ceiling forming." :
        "Affordability moved without a strong directional link to price gains this period."
      }`;
    }
    case "Median Income": {
      return `Median income averaged $${avg.toFixed(0)}k and was ${rising ? "rising" : "flat or declining"}. ${
        r > 0.3 ? "Income growth aligned with appreciation — fundamentals supported demand." :
        r < -0.3 ? "Prices outpaced income growth — real affordability eroded over the period." :
        "Income growth was steady but not a leading driver of price movements this period."
      }`;
    }
    case "Unemployment Rate": {
      return `Unemployment averaged ${avg.toFixed(1)}% and was ${rising ? "rising" : "falling"} over the period. ${
        r < -0.4 ? "A tightening labor market strongly supported buyer confidence and purchasing power." :
        r < -0.1 ? "Modest employment gains provided some demand support for housing." :
        r > 0.4 ? "Rising unemployment coincided with price pressure — other demand factors dominated." :
        "Employment conditions had a limited direct relationship with price trends this period."
      }`;
    }
    case "Building Permits (000s)": {
      return `Single-family permits averaged ${Math.round(avg)}k/yr — ${rising ? "expanding" : "contracting"} supply pipeline. ${
        r > 0.4 ? "Permit growth tracked appreciation — builders responding to, not ahead of, demand surges." :
        r < -0.4 ? "Permit pullback coincided with price acceleration — supply deficit amplified gains." :
        "Permit activity had a mixed relationship with price trends, suggesting lagged supply response."
      }`;
    }
    case "Existing Home Sales (M)": {
      return `Existing home sales averaged ${avg.toFixed(2)}M units/yr and were ${rising ? "trending up" : "trending down"}. ${
        r > 0.4 ? "High transaction volume tracked appreciation — active markets signal strong demand." :
        r < -0.4 ? "Sales fell as prices rose — affordability constraints began reducing buyer participation." :
        "Transaction volume had a mixed relationship with price levels this period."
      }`;
    }
    case "Net HH Formation (000s)": {
      return `Net household formation averaged ${Math.round(avg)}k/yr — ${avg > 1200 ? "above" : "near or below"} the ~1.2M annual baseline needed to absorb supply. ${
        r > 0.3 ? "Strong formation drove structural demand — new households competing for limited inventory." :
        r < -0.3 ? "Weak formation reduced demand absorption despite supply constraints." :
        "Formation rates were relatively stable and not a leading price driver this period."
      }`;
    }
    case "Consumer Confidence": {
      return `Consumer confidence averaged ${Math.round(avg)} (long-run avg ≈ 100) and was ${rising ? "improving" : "declining"}. ${
        r > 0.4 ? "Rising confidence closely tracked appreciation — buyer optimism fueled demand." :
        r < -0.4 ? "Confidence erosion coincided with price softening — uncertainty weighed on purchase decisions." :
        "Sentiment had a mixed relationship with price trends, suggesting other factors dominated."
      }`;
    }
    case "Fed Funds Rate": {
      return `The fed funds rate averaged ${avg.toFixed(2)}% and was ${rising ? "rising (tightening)" : "falling (easing)"}. ${
        r < -0.4 ? "Fed tightening correlated with price cooling — monetary policy was a meaningful headwind." :
        r < -0.1 ? "Rising rates provided moderate drag, though housing demand partially absorbed the pressure." :
        r > 0.3 ? "Low rates during this window supported appreciation — cheap money fueled buyer demand." :
        "Rate policy had limited direct correlation with price movements — other factors dominated."
      }`;
    }
    case "MCAI": {
      const note = avg == null || pairs.length < 5 ? " (limited data — MBA index only available from 2012)" : "";
      return `Mortgage credit availability averaged ${avg != null ? Math.round(avg) : "N/A"} over this period${note}. ${
        r > 0.3 ? "Looser credit conditions aligned with appreciation — easier qualifying boosted demand." :
        r < -0.3 ? "Tightening credit standards coincided with price softening — fewer qualified buyers." :
        "Credit availability had a mixed relationship with price trends this period."
      }`;
    }
    case "Foreclosure Rate": {
      return `Foreclosures averaged ${avg.toFixed(1)}% of mortgages and were ${rising ? "rising" : "falling"}. ${
        r < -0.4 ? "Falling foreclosures removed distressed supply pressure and supported price recovery." :
        r > 0.4 ? "Elevated foreclosures coincided with appreciation — a lagged crisis-recovery dynamic." :
        "Foreclosure levels had a limited direct relationship with price trends this period."
      }`;
    }
    case "Homeownership Rate": {
      return `Homeownership averaged ${avg.toFixed(1)}% and was ${rising ? "expanding" : "contracting"}. ${
        r > 0.3 ? "Rising ownership aligned with appreciation — broad participation supported demand." :
        r < -0.3 ? "Falling ownership coincided with price gains — investors and rentals displacing owner-occupants." :
        "Ownership rates were relatively stable and not a strong price driver this period."
      }`;
    }
    default: return "";
  }
};

const getProj = (field, yr, scenario) => {
  if (yr < PROJ_START) return getBM(field, yr);
  const arr = PROJ[scenario]?.[field];
  return arr ? (arr[yr - PROJ_START] ?? null) : null;
};

const pearsonR = (xs, ys) => {
  const pairs = xs.map((x, i) => [x, ys[i]]).filter(([x, y]) => x != null && y != null);
  if (pairs.length < 2) return 0;
  const n = pairs.length;
  const mx = pairs.reduce((s, [x]) => s + x, 0) / n;
  const my = pairs.reduce((s, [, y]) => s + y, 0) / n;
  const num = pairs.reduce((s, [x, y]) => s + (x - mx) * (y - my), 0);
  const den = Math.sqrt(
    pairs.reduce((s, [x]) => s + (x - mx) ** 2, 0) *
    pairs.reduce((s, [, y]) => s + (y - my) ** 2, 0)
  );
  return den === 0 ? 0 : num / den;
};

// ─── Dashboard ─────────────────────────────────────────────────────────────
// ── Kalshi helpers ──────────────────────────────────────────────────────────
// Returns { value, prefix, closeDate } where prefix is "<" or ">" when the median is
// outside the range of tracked thresholds, or "" when interpolated cleanly.
// When markets span multiple resolution dates (e.g. KXFED across meetings),
// only the nearest upcoming date's markets are used.
const kalshiMedian = (markets) => {
  if (!markets || markets.length === 0) return null;

  // Group by close_time — use only the nearest date to avoid mixing probability curves
  const byDate = {};
  for (const m of markets) {
    const d = m.close_time ?? "unknown";
    if (!byDate[d]) byDate[d] = [];
    byDate[d].push(m);
  }
  const nearestDate = Object.keys(byDate).filter(d => d !== "unknown").sort()[0] ?? "unknown";
  const cohort = byDate[nearestDate] ?? markets;

  const parsed = cohort
    .map((m) => {
      const match = m.ticker.match(/-T(-?[\d.]+)$/);
      if (!match) return null;
      // Coerce to numbers — Kalshi API may return strings for bid/ask/last
      const bid = parseFloat(m.yes_bid);
      const ask = parseFloat(m.yes_ask);
      const lp  = parseFloat(m.last_price);
      const spread = ask - bid;
      const price = spread > 0.25 && !isNaN(lp) && lp > 0 ? lp : (bid + ask) / 2;
      if (isNaN(price)) return null;
      return { threshold: parseFloat(match[1]), price };
    })
    .filter(Boolean)
    .sort((a, b) => a.threshold - b.threshold);

  if (parsed.length === 0) return null;

  // Find where price crosses 0.50 (markets are "above X?" so probability descends with threshold)
  for (let i = 0; i < parsed.length - 1; i++) {
    const lo = parsed[i], hi = parsed[i + 1];
    if (lo.price >= 0.5 && hi.price < 0.5) {
      const t = (lo.price - 0.5) / (lo.price - hi.price);
      return { value: lo.threshold + t * (hi.threshold - lo.threshold), prefix: "", closeDate: nearestDate, cohortCount: cohort.length };
    }
  }
  if (parsed[parsed.length - 1].price >= 0.5)
    return { value: parsed[parsed.length - 1].threshold, prefix: ">", closeDate: nearestDate, cohortCount: cohort.length };
  return { value: parsed[0].threshold, prefix: "<", closeDate: nearestDate, cohortCount: cohort.length };
};

// Generates a 1-2 sentence validation note comparing Kalshi consensus to the model's outlook
const kalshiValidationNote = (kalshiData, mktTone) => {
  if (!kalshiData?.series) return null;

  const getMedian = (series) => kalshiMedian(kalshiData.series[series]?.markets ?? []);

  const mtg  = getMedian("KXMORTGAGERATE");
  const fed  = getMedian("KXFED");
  const cpi  = getMedian("KXCPIYOY");
  const eh   = getMedian("KXEHSALES");
  const hv   = getMedian("KXUSHOMEVAL");

  // Score each available signal: +1 = housing positive, -1 = headwind, 0 = neutral
  const signals = [];
  if (mtg)  signals.push(mtg.value < 6.5 ? 1 : mtg.value < 7.0 ? 0 : -1);
  if (fed)  signals.push(fed.value < 4.0 ? 1 : fed.value < 4.75 ? 0 : -1);
  if (cpi)  signals.push(cpi.value < 2.8 ? 1 : cpi.value < 3.3 ? 0 : -1);
  if (eh)   signals.push(eh.value > 4.3 ? 1 : eh.value > 3.9 ? 0 : -1);
  if (hv)   signals.push(hv.value > 362000 ? 1 : hv.value > 355000 ? 0 : -1);

  if (signals.length === 0) return null;

  const avg = signals.reduce((a, b) => a + b, 0) / signals.length;
  const modelFavorable = mktTone.includes("favorable");
  const modelChallenging = mktTone.includes("challenging");
  const kalshiFavorable = avg > 0.2;
  const kalshiChallenging = avg < -0.2;
  const aligned = (modelFavorable && kalshiFavorable) || (modelChallenging && kalshiChallenging) || (!modelFavorable && !modelChallenging && !kalshiFavorable && !kalshiChallenging);

  // Build a short list of the most notable signals to name-drop
  const notable = [];
  if (mtg)  notable.push(`mortgage rates ${mtg.prefix}${mtg.value.toFixed(2)}%`);
  if (eh)   notable.push(`existing sales ${eh.prefix}${eh.value.toFixed(2)}M`);
  if (cpi)  notable.push(`CPI at ${cpi.prefix}${cpi.value.toFixed(1)}%`);
  if (hv)   notable.push(`home values ${hv.prefix}$${Math.round(hv.value / 1000)}k`);

  const notableStr = notable.slice(0, 3).join(", ");

  const kalshiColor = avg > 0.2 ? C.greenLight : avg < -0.2 ? "#e57373" : C.muted;
  const em = (text) => <strong style={{ color: kalshiColor }}>{text}</strong>;
  if (aligned) {
    return <>{em("Kalshi prediction markets broadly validate this outlook")} — consensus prices {notableStr}, consistent with a {mktTone} environment.</>;
  } else if (kalshiFavorable && !modelFavorable) {
    return <>{em("Kalshi prediction markets offer a more optimistic cross-check than the model signals")} — consensus prices {notableStr}, suggesting potential upside relative to the current {mktTone} assessment.</>;
  } else if (kalshiChallenging && !modelChallenging) {
    return <>{em("Kalshi prediction markets offer a cautionary cross-check")} — consensus prices {notableStr}, suggesting more headwind than the current {mktTone} assessment implies.</>;
  } else {
    return <>{em("Kalshi prediction markets offer a mixed cross-check")} — {notableStr} — partially supporting and partially challenging the current {mktTone} outlook.</>;
  }
};

// Generates a contextual narrative from resolved Kalshi tile data
const kalshiSummary = (tiles) => {
  const get = (series) => tiles.find((t) => t.series === series);
  const val = (series) => get(series)?.median?.value ?? null;
  const pfx = (series) => get(series)?.median?.prefix ?? "";
  const has = (series) => get(series)?.median != null;

  const sentences = [];

  // ── Rate environment ──
  const fedVal  = val("KXFED");
  const mortVal = val("KXMORTGAGERATE");
  if (has("KXFED") || has("KXMORTGAGERATE")) {
    const fedPart  = has("KXFED")          ? `Fed Funds at ${pfx("KXFED")}${fedVal.toFixed(2)}%`             : null;
    const mortPart = has("KXMORTGAGERATE") ? `30-yr mortgage rate ${pfx("KXMORTGAGERATE")}${mortVal.toFixed(2)}%` : null;
    const rateDesc = [fedPart, mortPart].filter(Boolean).join(" and ");
    const easing   = fedVal != null && fedVal < 4.25;
    const mortTight = mortVal != null && mortVal >= 6.5;
    sentences.push(
      `Markets imply ${rateDesc} — ${easing ? "suggesting continued Fed easing" : "with rates holding near current levels"}${mortTight ? ", keeping affordability under pressure" : ", offering modest affordability improvement for buyers"}.`
    );
  }

  // ── Inflation ──
  const cpi = val("KXCPIYOY");
  if (has("KXCPIYOY")) {
    const cpiDesc = cpi > 3.5 ? "well above the Fed's 2% target, limiting room for aggressive cuts"
      : cpi > 2.8 ? "still above the Fed's 2% target, supporting a gradual easing path"
      : "approaching the Fed's 2% target, consistent with continued normalization";
    sentences.push(`CPI inflation consensus is ${pfx("KXCPIYOY")}${cpi.toFixed(1)}% YoY — ${cpiDesc}.`);
  }

  // ── Labor market ──
  const u3 = val("KXU3");
  if (has("KXU3")) {
    const laborDesc = u3 < 4.5 ? "a still-healthy labor market supporting buyer income and demand"
      : u3 < 5.5 ? "a softening labor market that may begin to weigh on buyer confidence"
      : "a deteriorating labor market that poses a meaningful demand headwind";
    sentences.push(`Unemployment is projected at ${pfx("KXU3")}${u3.toFixed(1)}%, indicating ${laborDesc}.`);
  }

  // ── Transaction activity ──
  const ehVal  = val("KXEHSALES");
  const nhVal  = val("KXNHSALES");
  const stVal  = val("KXHOUSINGSTART");
  const activityParts = [];
  if (has("KXEHSALES"))      activityParts.push(`existing sales ${pfx("KXEHSALES")}${ehVal.toFixed(2)}M`);
  if (has("KXNHSALES"))      activityParts.push(`new home sales ${pfx("KXNHSALES")}${Math.round(nhVal)}k`);
  if (has("KXHOUSINGSTART")) activityParts.push(`starts ${pfx("KXHOUSINGSTART")}${stVal.toFixed(3)}M`);
  if (activityParts.length > 0) {
    const weak = (ehVal != null && ehVal < 4.2) || (nhVal != null && nhVal < 650);
    sentences.push(
      `Housing activity consensus: ${activityParts.join(", ")} — ${weak ? "pointing to continued transaction weakness driven by the lock-in effect and affordability constraints" : "suggesting a gradual pickup in market activity"}.`
    );
  }

  // ── Home value ──
  const hvVal = val("KXUSHOMEVAL");
  if (has("KXUSHOMEVAL")) {
    const hvDesc = hvVal > 365000 ? "reflecting continued price resilience despite affordability headwinds"
      : hvVal > 355000 ? "suggesting modest but positive home value appreciation"
      : "implying flat-to-declining home values in the near term";
    sentences.push(`The Zillow ZHVI is priced at ${pfx("KXUSHOMEVAL")}$${Math.round(hvVal / 1000)}k for March 2026, ${hvDesc}.`);
  }

  return sentences.length > 0 ? sentences.join(" ") : null;
};


const Dashboard = () => {
  const [yearRange, setYearRange] = useState([2016, 2025]);
  const [selectedCity, setSelectedCity] = useState(null); // null = USA highlighted only
  const [tableView, setTableView] = useState("detail"); // 'detail' | 'benchmark' | 'housing'
  const [chartPane, setChartPane] = useState("portfolio"); // 'portfolio' | 'housing' | 'neopoli'
  const [neopoliMarket, setNeopoliMarket] = useState("brownsville_tx");
  const [showDimDesc, setShowDimDesc] = useState(false);
  const [mapZoom, setMapZoom] = useState(1);
  const [mapCenter, setMapCenter] = useState([-96, 38]);
  const [scenario, setScenario] = useState("base"); // 'bear' | 'base' | 'bull'
  const [ampledgeEnabled, setAmpledgeEnabled] = useState(false);
  const [kalshiData, setKalshiData] = useState(null);   // { series: {KXFED: {markets:[...]}, ...}, fetched_at }
  const [kalshiError, setKalshiError] = useState(null);
  const [kalshiLoading, setKalshiLoading] = useState(false);
  const [kalshiRefreshKey, setKalshiRefreshKey] = useState(0);
  const [policyWatchData, setPolicyWatchData] = useState(null);

  // Fetch Kalshi prediction market data once when Housing Market tab is first visited
  const kalshiFetchedRef = React.useRef(false);
  React.useEffect(() => {
    if (chartPane !== "housing") return;
    if (kalshiFetchedRef.current) return;
    kalshiFetchedRef.current = true;
    setKalshiLoading(true);
    const base = process.env.REACT_APP_KALSHI_API_URL || "https://5g28uduwbk.execute-api.us-east-1.amazonaws.com/markets";
    const seriesList = Object.keys(KALSHI_SERIES_META).join(",");
    const url = `${base}?series=${seriesList}`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => { setKalshiData(data); setKalshiLoading(false); })
      .catch((err) => { kalshiFetchedRef.current = false; setKalshiError(err.message); setKalshiLoading(false); });
  }, [chartPane, kalshiRefreshKey]);

  const refreshKalshi = () => {
    kalshiFetchedRef.current = false;
    setKalshiData(null);
    setKalshiError(null);
    setPolicyWatchData(null);
    setKalshiRefreshKey((k) => k + 1);
  };

  // Fetch kxhfhousing-27 policy watch market once
  const policyWatchRef = React.useRef(false);
  React.useEffect(() => {
    if (policyWatchRef.current) return;
    policyWatchRef.current = true;
    const base = process.env.REACT_APP_KALSHI_API_URL || "https://5g28uduwbk.execute-api.us-east-1.amazonaws.com/markets";
    fetch(`${base}?market=kxhfhousing-27`)
      .then((r) => r.json())
      .then((d) => { if (!d.error) setPolicyWatchData(d); })
      .catch(() => {});
  }, [kalshiRefreshKey]);

  // All years in the selected range
  const displayYears = [];
  for (let y = yearRange[0]; y <= yearRange[1]; y++) displayYears.push(y);

  // ── Build modeling table (recomputed on every yearRange change) ──
  // Cap schedule is relative to the start year (year 1 = first year in range).
  // Formula: Annual Return = homeValue × HPA% × Cap + Fees + Bonuses
  // Home value compounds each year: homeValue *= (1 + HPA%)
  // Starting capital compounds: next_start = prev_start + annual_return

  // Pre-compute accrued dollars held back in years 1–5.
  // Accrued per year = homeValue × HPA × (1 − cap) — appreciation the fund retains.
  // Year 7 bonus = half of total accrued from years 1–5.
  let preHomeValue = HOME_VALUE;
  const yr1to5Accrued = displayYears.slice(0, 5).reduce((sum, yr, i) => {
    const hpa = yr > 2025 ? (getProj("hpa", yr, scenario) ?? 0) : getHPA(yr);
    if (hpa == null) return sum;
    const cap = CAP_SCHEDULE[i] ?? 1.0;
    const accrued = preHomeValue * (hpa / 100) * (1 - cap);
    preHomeValue *= 1 + hpa / 100;
    return sum + accrued;
  }, 0);
  const yr7Bonus = yr1to5Accrued / 2;

  let capital = 80000;
  let spComp = 1.0,
    bndComp = 1.0,
    vnqComp = 1.0;
  const table = displayYears
    .map((yr, i) => {
      const projected = yr > 2025;
      const hpa = projected ? (getProj("hpa", yr, scenario) ?? 0) : getHPA(yr);
      if (hpa == null) return null; // skip years with no HPA data
      const cap = CAP_SCHEDULE[i] ?? 1.0; // relative: i=0 → year 1
      const fees = i < 5 ? (hpa >= 1 ? 900 : 1800) : 0; // $900 if HPA ≥ 1%, else $1,800
      const bonuses = i === 6 ? yr7Bonus : 0; // year 7 = half of yrs 1–5 accrued
      const annualReturn = HOME_VALUE * (hpa / 100) * cap + fees + bonuses;
      const irr = (annualReturn / capital) * 100;
      const endingCapital = capital + annualReturn;
      const cagr = (Math.pow(endingCapital / 80000, 1 / (i + 1)) - 1) * 100;
      const sp  = projected ? (getProj("sp500",      yr, scenario) ?? 0) : getBM("sp500", yr);
      const bnd = projected ? (getProj("bondIndex",   yr, scenario) ?? 0) : getBM("bondIndex", yr);
      const vnq = projected ? (getProj("vnq",         yr, scenario) ?? 0) : getBM("vnq", yr);
      if (sp != null) spComp *= 1 + sp / 100;
      if (bnd != null) bndComp *= 1 + bnd / 100;
      if (vnq != null) vnqComp *= 1 + vnq / 100;
      const n1 = i + 1;
      const spCagr = sp != null ? (Math.pow(spComp, 1 / n1) - 1) * 100 : null;
      const bndCagr =
        bnd != null ? (Math.pow(bndComp, 1 / n1) - 1) * 100 : null;
      const vnqCagr =
        vnq != null ? (Math.pow(vnqComp, 1 / n1) - 1) * 100 : null;
      const row = {
        yr,
        projected,
        apprec: hpa,
        starting: capital,
        cap: cap * 100,
        fees,
        bonuses,
        annualReturn,
        ending: endingCapital,
        irr,
        cagr,
        mortgageRate:      projected ? getProj("mortgageRate",      yr, scenario) : getBM("mortgageRate", yr),
        delinquencyRate:   projected ? getProj("delinquencyRate",   yr, scenario) : getBM("delinquencyRate", yr),
        tenYearYield:      projected ? getProj("tenYearYield",      yr, scenario) : getBM("tenYearYield", yr),
        cpi:               projected ? getProj("cpi",               yr, scenario) : getBM("cpi", yr),
        housingStarts:     projected ? getProj("housingStarts",     yr, scenario) : getBM("housingStarts", yr),
        monthsOfSupply:    projected ? getProj("monthsOfSupply",    yr, scenario) : getBM("monthsOfSupply", yr),
        nahbHMI:           projected ? getProj("nahbHMI",           yr, scenario) : getBM("nahbHMI", yr),
        medianIncome:      projected ? getProj("medianIncome",      yr, scenario) : getBM("medianIncome", yr),
        rentalVacancy:     projected ? getProj("rentalVacancy",     yr, scenario) : getBM("rentalVacancy", yr),
        priceToIncome:     projected ? getProj("priceToIncome",     yr, scenario) : getBM("priceToIncome", yr),
        unemploymentRate:  projected ? getProj("unemploymentRate",  yr, scenario) : getBM("unemploymentRate", yr),
        buildingPermits:   projected ? getProj("buildingPermits",   yr, scenario) : getBM("buildingPermits", yr),
        existingHomeSales: projected ? getProj("existingHomeSales", yr, scenario) : getBM("existingHomeSales", yr),
        netHHFormation:    projected ? getProj("netHHFormation",    yr, scenario) : getBM("netHHFormation", yr),
        consumerConfidence:projected ? getProj("consumerConfidence",yr, scenario) : getBM("consumerConfidence", yr),
        fedFundsRate:      projected ? getProj("fedFundsRate",      yr, scenario) : getBM("fedFundsRate", yr),
        mcai:              projected ? getProj("mcai",              yr, scenario) : getBM("mcai", yr),
        foreclosureRate:   projected ? getProj("foreclosureRate",   yr, scenario) : getBM("foreclosureRate", yr),
        homeownershipRate: projected ? getProj("homeownershipRate", yr, scenario) : getBM("homeownershipRate", yr),
        sp500: sp,
        bondIndex: bnd,
        vnq,
        spCagr,
        bndCagr,
        vnqCagr,
      };
      capital = endingCapital;
      return row;
    })
    .filter(Boolean);

  const years = table.map((r) => r.yr);
  const n = years.length;

  // ── Stats ──
  const ampIRRs = table.map((r) => r.irr);
  const sp500s = table.map((r) => r.sp500);
  const bonds = table.map((r) => r.bondIndex);
  const vnqs = table.map((r) => r.vnq);

  const ampSt = calcStats(ampIRRs);
  const spSt = calcStats(sp500s);
  const bndSt = calcStats(bonds);
  const vnqSt = calcStats(vnqs);

  const periodLabel =
    n > 0
      ? `${yearRange[0]}–${yearRange[1]}  ·  ${n} yr${n !== 1 ? "s" : ""}`
      : "—";

  // ── Ampledge Impact Model (must be defined before CS projection uses AMP_HPA_PREMIUM) ──
  const AMP_VOLUME = 50000; // transactions/year at scale
  const AMP_EXISTING_LIFT = (AMP_VOLUME * 0.70) / 1e6; // +0.035M/yr to existing sales
  const AMP_HPA_PREMIUM = scenario === "bear" ? 0.30 : scenario === "bull" ? 0.50 : 0.40; // pp
  const AMP_OWN_LIFT_PER_YR = (AMP_VOLUME / 131e6) * 100; // ~0.038%/yr homeownership

  // ── Case-Shiller monthly chart data (from FRED, 1988–2025) ──
  const CS_CITIES = [
    "Atlanta",
    "Boston",
    "Charlotte",
    "Chicago",
    "Cleveland",
    "Dallas",
    "Denver",
    "Detroit",
    "Las Vegas",
    "Los Angeles",
    "Miami",
    "Minneapolis",
    "New York",
    "Phoenix",
    "Portland",
    "San Diego",
    "San Francisco",
    "Seattle",
    "Tampa",
    "Washington DC",
  ];

  // Chart filters to the selected brush window (yearRange); table uses same window
  const csFilteredIndices = CS_DATES.reduce((acc, d, i) => {
    const yr = parseInt(d.slice(0, 4));
    if (yr >= yearRange[0] && yr <= Math.min(yearRange[1], 2025)) acc.push(i);
    return acc;
  }, []);
  const csHistLabels = csFilteredIndices.map((i) => CS_DATES[i]);
  const csFiltered = (city) => csFilteredIndices.map((i) => CS_HPA[city][i]);

  // Append projected monthly entries for years > 2025 within the selected range.
  // Use mid-year anchors + linear interpolation + seasonal offset for a realistic curve.
  const csProjLabels = [];
  const csProjUSA = [];
  const csMonths = ["01","02","03","04","05","06","07","08","09","10","11","12"];
  // Seasonal offset (sums to 0/yr): weaker Jan–Feb, stronger Apr–Jun
  const csSeasonal = [-0.3, -0.2, 0.0, 0.2, 0.3, 0.3, 0.2, 0.1, 0.0, -0.1, -0.2, -0.3];
  const projYears = [];
  for (let y = Math.max(yearRange[0], 2026); y <= yearRange[1]; y++) projYears.push(y);

  // ── City deviation model ───────────────────────────────────────────────────
  // Each city is projected as: usa_proj + mean_dev + decaying_offset + oscillation
  // This preserves each city's characteristic spread rather than compressing it.

  // Monthly deviation stats over 2016–2025
  const devPeriodIndices = CS_DATES.reduce((acc, d, i) => {
    const yr = parseInt(d.slice(0, 4));
    if (yr >= 2016 && yr <= 2025) acc.push(i);
    return acc;
  }, []);

  const cityDevStats = {};
  CS_CITIES.forEach((city) => {
    const devs = devPeriodIndices.map((i) => {
      const c = CS_HPA[city]?.[i];
      const u = CS_HPA.USA[i];
      return (c != null && u != null) ? c - u : null;
    }).filter((v) => v != null);
    const n = devs.length;
    const mu = n > 0 ? devs.reduce((s, v) => s + v, 0) / n : 0;
    const sigma = n > 1 ? Math.sqrt(devs.reduce((s, v) => s + (v - mu) ** 2, 0) / n) : 1;
    // Last historical deviation (city minus USA at end of visible history)
    const lastI = csFilteredIndices[csFilteredIndices.length - 1];
    const lastCityV = lastI != null ? CS_HPA[city]?.[lastI] : null;
    const lastUSAV  = lastI != null ? CS_HPA.USA[lastI]       : null;
    const lastDev   = (lastCityV != null && lastUSAV != null) ? lastCityV - lastUSAV : mu;
    cityDevStats[city] = { mu, sigma, lastDev };
  });

  // City-specific oscillation params — different period & phase per city
  const cityOscParams = CS_CITIES.map((city, idx) => ({
    period: 28 + (idx % 5) * 5,             // 28–48 month cycles
    phase:  (idx * 2.09) % (2 * Math.PI),   // evenly spread phases
    amp:    (cityDevStats[city]?.sigma ?? 1) * 0.45, // 45% of historical σ
  }));

  const csProjCity = {};

  if (projYears.length > 0) {
    // USA national projection anchors (same as before)
    const lastHistVal = csFiltered("USA").slice(-1)[0] ?? 3.0;
    const anchors = [[-6, lastHistVal]];
    projYears.forEach((y, i) => anchors.push([i * 12 + 6, getProj("hpa", y, scenario)]));
    const lastIdx = projYears.length;
    const tailHPA = PROJ[scenario]?.hpa[lastIdx] ?? anchors[anchors.length - 1][1];
    anchors.push([lastIdx * 12 + 6, tailHPA]);

    const interp = (anch, absMonth) => {
      let a0 = anch[0], a1 = anch[1];
      for (let ai = 0; ai < anch.length - 1; ai++) {
        if (anch[ai][0] <= absMonth && anch[ai + 1][0] > absMonth) { a0 = anch[ai]; a1 = anch[ai + 1]; break; }
      }
      const t = (absMonth - a0[0]) / (a1[0] - a0[0]);
      return a0[1] + (a1[1] - a0[1]) * t;
    };

    CS_CITIES.forEach((city) => { csProjCity[city] = []; });

    projYears.forEach((y, yi) => {
      csMonths.forEach((m, mi) => {
        const absMonth = yi * 12 + mi;
        csProjLabels.push(`${y}-${m}`);

        // USA: interpolated national + seasonal
        const usaBase = interp(anchors, absMonth);
        csProjUSA.push(parseFloat((usaBase + csSeasonal[mi]).toFixed(2)));

        // Cities: usa_base + decaying_offset_toward_mean_dev + oscillation + seasonal
        CS_CITIES.forEach((city, cidx) => {
          const { mu, lastDev } = cityDevStats[city];
          const { period, phase, amp } = cityOscParams[cidx];
          // Offset decays from lastDev toward mu over ~30 months
          const decayedOffset = mu + (lastDev - mu) * Math.exp(-absMonth / 30);
          const osc = amp * Math.sin(2 * Math.PI * absMonth / period + phase);
          csProjCity[city].push(parseFloat((usaBase + decayedOffset + osc + csSeasonal[mi]).toFixed(2)));
        });
      });
    });
  }
  const csLabels = [...csHistLabels, ...csProjLabels];
  const csProjPivot = csHistLabels.length; // index where projection starts

  // Ampledge-adjusted Case-Shiller USA projection
  const csProjUSAAmp = ampledgeEnabled ? csProjUSA.map((v) => v != null ? parseFloat((v + AMP_HPA_PREMIUM).toFixed(2)) : v) : [];

  const shillerData = {
    labels: csLabels,
    datasets: [
      // Cities drawn underneath USA
      ...CS_CITIES.map((city) => {
        const isSelected = selectedCity === city;
        const histAlpha = isSelected ? "ff" : selectedCity ? "40" : "99";
        const projAlpha = isSelected ? "99" : selectedCity ? "28" : "44"; // extra-dim in projection
        const width = isSelected ? 2.5 : 1;
        const cityProjData = csProjCity[city] ?? csProjLabels.map(() => null);
        const baseColor = CITY_COLORS[city];
        return {
          label: city,
          data: [...csFiltered(city), ...cityProjData],
          borderColor: baseColor + histAlpha,
          borderWidth: width,
          pointRadius: 0,
          tension: 0.3,
          spanGaps: true,
          order: 1, // drawn before (below) USA
          segment: csProjLabels.length > 0 ? {
            borderColor: (ctx) => ctx.p0DataIndex >= csProjPivot
              ? baseColor + projAlpha
              : baseColor + histAlpha,
          } : {},
        };
      }),
      // USA always on top — order: -1 ensures it renders last (highest z)
      {
        label: "USA",
        data: [...csFiltered("USA"), ...csProjUSA],
        borderColor: C.navy,
        borderWidth: selectedCity ? 2.5 : 3.5,
        pointRadius: 0,
        tension: 0.3,
        spanGaps: true,
        order: -1,
        segment: csProjLabels.length > 0 ? {
          borderColor: (ctx) => ctx.p0DataIndex >= csProjPivot ? C.navy + "88" : C.navy,
        } : {},
      },
      // Ampledge USA overlay
      ...(ampledgeEnabled && csProjUSAAmp.length > 0 ? [{
        label: "USA (With Ampledge)",
        data: [...csFiltered("USA").map(() => null), ...csProjUSAAmp],
        borderColor: C.red + "cc",
        borderWidth: 2.5,
        pointRadius: 0,
        tension: 0.3,
        spanGaps: false,
        order: -2,
        borderDash: [5, 3],
      }] : []),
    ],
  };

  const lineData = {
    labels: years,
    datasets: [
      {
        label: "AmPledge",
        data: cumulative(ampIRRs),
        borderColor: C.red,
        backgroundColor: C.red + "15",
        borderWidth: 2.5,
        pointRadius: 0,
        tension: 0.3,
      },
      {
        label: "S&P 500",
        data: cumulative(sp500s),
        borderColor: C.greenLight,
        backgroundColor: "transparent",
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.3,
        borderDash: [5, 3],
      },
      {
        label: "Bonds",
        data: cumulative(bonds),
        borderColor: C.blueLight,
        backgroundColor: "transparent",
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.3,
        borderDash: [2, 2],
      },
      {
        label: "VNQ",
        data: cumulative(vnqs),
        borderColor: C.purpleLight,
        backgroundColor: "transparent",
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.3,
        borderDash: [6, 2],
      },
    ],
  };

  const barData = {
    labels: years,
    datasets: [
      {
        label: "AmPledge",
        data: ampIRRs,
        backgroundColor: C.red + "cc",
        borderRadius: 2,
      },
      {
        label: "S&P 500",
        data: sp500s,
        backgroundColor: C.greenLight + "cc",
        borderRadius: 2,
      },
      {
        label: "Bonds",
        data: bonds,
        backgroundColor: C.blueLight + "cc",
        borderRadius: 2,
      },
      {
        label: "VNQ",
        data: vnqs,
        backgroundColor: C.purpleLight + "cc",
        borderRadius: 2,
      },
    ],
  };

  const scatterData = {
    datasets: [
      {
        label: "AmPledge",
        data: [{ x: ampSt.vol, y: ampSt.avg }],
        backgroundColor: C.red,
        pointRadius: 11,
      },
      {
        label: "S&P 500",
        data: [{ x: spSt.vol, y: spSt.avg }],
        backgroundColor: C.greenLight,
        pointRadius: 9,
      },
      {
        label: "Bonds",
        data: [{ x: bndSt.vol, y: bndSt.avg }],
        backgroundColor: C.blueLight,
        pointRadius: 9,
      },
      {
        label: "VNQ",
        data: [{ x: vnqSt.vol, y: vnqSt.avg }],
        backgroundColor: C.purpleLight,
        pointRadius: 9,
      },
    ],
  };

  const pieData = {
    labels: ["Early Exits", "Mid Term Exits", "Target Exits", "Late Exits"],
    datasets: [
      {
        data: [45, 28, 19, 8],
        backgroundColor: [C.navy, C.red, C.purple, C.blueLight],
        borderColor: [C.white, C.white],
        borderWidth: 3,
      },
    ],
  };

  // ── Housing Driver Charts ────────────────────────────────────────────────
  const hmHPA          = displayYears.map((yr) => yr > 2025 ? getProj("hpa",              yr, scenario) : getHPA(yr));
  const hmMtg          = displayYears.map((yr) => yr > 2025 ? getProj("mortgageRate",      yr, scenario) : getBM("mortgageRate", yr));
  const hmDel          = displayYears.map((yr) => yr > 2025 ? getProj("delinquencyRate",   yr, scenario) : getBM("delinquencyRate", yr));
  const hmTsy          = displayYears.map((yr) => yr > 2025 ? getProj("tenYearYield",      yr, scenario) : getBM("tenYearYield", yr));
  const hmCPI          = displayYears.map((yr) => yr > 2025 ? getProj("cpi",               yr, scenario) : getBM("cpi", yr));
  const hmStarts       = displayYears.map((yr) => yr > 2025 ? getProj("housingStarts",     yr, scenario) : getBM("housingStarts", yr));
  const hmSupply       = displayYears.map((yr) => yr > 2025 ? getProj("monthsOfSupply",    yr, scenario) : getBM("monthsOfSupply", yr));
  const hmNAHB         = displayYears.map((yr) => yr > 2025 ? getProj("nahbHMI",           yr, scenario) : getBM("nahbHMI", yr));
  const hmIncome       = displayYears.map((yr) => yr > 2025 ? getProj("medianIncome",      yr, scenario) : getBM("medianIncome", yr));
  const hmPTI          = displayYears.map((yr) => yr > 2025 ? getProj("priceToIncome",     yr, scenario) : getBM("priceToIncome", yr));
  const hmVacancy      = displayYears.map((yr) => yr > 2025 ? getProj("rentalVacancy",     yr, scenario) : getBM("rentalVacancy", yr));
  const hmUnemployment = displayYears.map((yr) => yr > 2025 ? getProj("unemploymentRate",  yr, scenario) : getBM("unemploymentRate", yr));
  const hmPermits      = displayYears.map((yr) => yr > 2025 ? getProj("buildingPermits",   yr, scenario) : getBM("buildingPermits", yr));
  const hmExistingSales= displayYears.map((yr) => yr > 2025 ? getProj("existingHomeSales", yr, scenario) : getBM("existingHomeSales", yr));
  const hmHHFormation  = displayYears.map((yr) => yr > 2025 ? getProj("netHHFormation",    yr, scenario) : getBM("netHHFormation", yr));
  const hmConsumerConf = displayYears.map((yr) => yr > 2025 ? getProj("consumerConfidence",yr, scenario) : getBM("consumerConfidence", yr));
  const hmFedFunds     = displayYears.map((yr) => yr > 2025 ? getProj("fedFundsRate",      yr, scenario) : getBM("fedFundsRate", yr));
  const hmMCAI         = displayYears.map((yr) => yr > 2025 ? getProj("mcai",              yr, scenario) : getBM("mcai", yr));
  const hmForeclosure  = displayYears.map((yr) => yr > 2025 ? getProj("foreclosureRate",   yr, scenario) : getBM("foreclosureRate", yr));
  const hmOwnership    = displayYears.map((yr) => yr > 2025 ? getProj("homeownershipRate", yr, scenario) : getBM("homeownershipRate", yr));

  // Ampledge-adjusted HPA (used for correlations and outlook when toggle is on)
  const hmHPAAmp = hmHPA.map((v, i) =>
    ampledgeEnabled && displayYears[i] > 2025 && v != null
      ? parseFloat((v + AMP_HPA_PREMIUM).toFixed(2)) : v
  );

  // Ampledge-adjusted arrays (only projection years > 2025 are modified)
  const hmExistingSalesAmp = displayYears.map((yr, i) => {
    const v = hmExistingSales[i];
    return ampledgeEnabled && yr > 2025 && v != null ? v + AMP_EXISTING_LIFT : v;
  });
  const hmOwnershipAmp = displayYears.map((yr, i) => {
    const v = hmOwnership[i];
    return ampledgeEnabled && yr > 2025 && v != null
      ? v + AMP_OWN_LIFT_PER_YR * (yr - 2025)
      : v;
  });

  // ── Projection helpers ───────────────────────────────────────────────────
  const projIdx = displayYears.findIndex((y) => y > 2025);
  const mkSeg = (color) => projIdx >= 0 ? {
    borderColor: (ctx) => ctx.p0DataIndex >= projIdx ? color + "70" : color,
    borderDash:  (ctx) => ctx.p0DataIndex >= projIdx ? [6, 3] : [],
  } : {};
  // projBarColor(baseColor, histAlpha, projAlpha) — keeps same hue, lower opacity for projected bars
  const projBarColor = (baseColor, histAlpha = "cc", projAlpha = "44") => projIdx >= 0
    ? (ctx) => (displayYears[ctx.dataIndex] > 2025 ? baseColor + projAlpha : baseColor + histAlpha)
    : baseColor + histAlpha;

  const driverCorrelations = [
    { label: "Rental Vacancy Rate",      data: hmVacancy         },
    { label: "Months of Supply",         data: hmSupply          },
    { label: "CPI Inflation",            data: hmCPI             },
    { label: "Housing Starts (000s)",    data: hmStarts          },
    { label: "NAHB Builder Confidence",  data: hmNAHB            },
    { label: "Mortgage Rate",            data: hmMtg             },
    { label: "10-Year Treasury Yield",   data: hmTsy             },
    { label: "Price-to-Income Ratio",    data: hmPTI             },
    { label: "Median Income",            data: hmIncome          },
    { label: "Unemployment Rate",        data: hmUnemployment    },
    { label: "Building Permits (000s)",  data: hmPermits         },
    { label: "Existing Home Sales (M)",  data: hmExistingSalesAmp},
    { label: "Net HH Formation (000s)",  data: hmHHFormation     },
    { label: "Consumer Confidence",      data: hmConsumerConf    },
    { label: "Fed Funds Rate",           data: hmFedFunds        },
    { label: "MCAI",                     data: hmMCAI            },
    { label: "Foreclosure Rate",         data: hmForeclosure     },
    { label: "Homeownership Rate",       data: hmOwnershipAmp    },
  ].map(({ label, data }) => {
    const r = pearsonR(hmHPAAmp, data);
    // Signal: does the current trend help or hurt HPA?
    // trend = last valid value minus first valid value in the selected period
    const valid = data.filter((v) => v != null);
    const trend = valid.length >= 2 ? valid[valid.length - 1] - valid[0] : 0;
    // sign(r) × sign(trend): +1 = tailwind for HPA, -1 = headwind
    const signal = Math.sign(r) * Math.sign(trend); // 1, -1, or 0
    return { label, r, interp: generateInterp(label, r, data, hmHPAAmp), signal };
  });

  // ── Housing Market Summary ────────────────────────────────────────────────
  const mktStrongTailwinds = driverCorrelations.filter((d) => d.signal > 0 && Math.abs(d.r) >= 0.6);
  const mktStrongHeadwinds = driverCorrelations.filter((d) => d.signal < 0 && Math.abs(d.r) >= 0.6);
  const mktNetSignal = mktStrongTailwinds.length - mktStrongHeadwinds.length;

  // Forward HPA averages always projected from 2025 baseline
  // When Ampledge is enabled, the HPA premium is added to every projected year
  const fwdAvg = (startYr, endYr) => {
    const vals = [];
    for (let y = startYr; y <= endYr; y++) {
      const v = getProj("hpa", y, scenario);
      if (v != null) vals.push(ampledgeEnabled ? v + AMP_HPA_PREMIUM : v);
    }
    return vals.length > 0 ? vals.reduce((s, v) => s + v, 0) / vals.length : null;
  };
  const mktAvg3  = fwdAvg(2026, 2028);
  const mktAvg5  = fwdAvg(2026, 2030);
  const mktAvg10 = fwdAvg(2026, 2035);

  // Tone: blends forward HPA projection (60%) + driver correlation net signal (40%)
  // Both inputs matter — projections say where prices are headed; signals say whether
  // current conditions support or undermine that trajectory.
  // When no projection years are selected, pure correlation signal drives the tone.
  // Projections are always shown in the outlook tiles, so always blend them into the badge
  const projAvgForTone = mktAvg3 ?? mktAvg5;

  // Convert forward HPA avg → -3…+3 score anchored to long-run nominal average (~3%)
  // 0.9% HPA is below inflation — real prices flat/declining → negative score
  // ~2-3% is the neutral/normal zone
  const projScore = projAvgForTone == null ? null
    : projAvgForTone >= 5   ?  3   // strong bull
    : projAvgForTone >= 4   ?  2   // solid growth
    : projAvgForTone >= 3   ?  1   // above long-run average
    : projAvgForTone >= 2   ?  0   // near long-run average, neutral
    : projAvgForTone >= 1   ? -1   // below inflation, weak
    : projAvgForTone >= 0   ? -2   // flat, poor
                            : -3;  // contraction

  // Clamp correlation signal to -3…+3 then blend 50/50 projection/signals
  // Equal weighting: heavy headwinds meaningfully drag the badge even with a decent projection
  const clampedSignal = Math.max(-3, Math.min(3, mktNetSignal));
  const blendedScore = projScore != null
    ? projScore * 0.50 + clampedSignal * 0.50
    : clampedSignal;

  const mktTone = blendedScore >=  2   ? "favorable"
    : blendedScore >=  0.5  ? "moderately favorable"
    : blendedScore >= -0.5  ? "mixed"
    : blendedScore >= -2    ? "moderately challenging"
                            : "challenging";
  const mktToneColor = (mktTone === "favorable" || mktTone === "moderately favorable") ? C.greenLight : mktTone === "mixed" ? C.muted : "#e57373";

  // Snapshot values (last valid in selected range)
  const lastOf = (arr) => arr.filter((v) => v != null).slice(-1)[0] ?? null;
  const mktHPA    = lastOf(hmHPAAmp);
  const mktMtg    = lastOf(hmMtg);
  const mktSupply = lastOf(hmSupply);
  const mktUnemp  = lastOf(hmUnemployment);
  const mktFed    = lastOf(hmFedFunds);
  const mktNAHB   = lastOf(hmNAHB);

  const outlookLabel = (avg) => avg == null ? null : avg >= 5 ? "Strong Growth" : avg >= 3 ? "Moderate Growth" : avg >= 1.5 ? "Slow Growth" : avg >= 0 ? "Flat" : "Contraction";
  const outlookColor = (avg) => avg == null ? C.muted : avg >= 3 ? C.greenLight : avg >= 1.5 ? C.orange : avg >= 0 ? C.muted : "#e57373";

  // ── Rates & Policy: Fed Funds + Mortgage + 10yr Yield ───────────────────
  const hRatesData = {
    labels: years,
    datasets: [
      { label: "Fed Funds",    data: hmFedFunds, borderColor: C.red,       backgroundColor: "transparent",   borderWidth: 2,   pointRadius: 0, tension: 0.3, segment: mkSeg(C.red) },
      { label: "Mortgage Rate",data: hmMtg,      borderColor: C.orange,    backgroundColor: C.orange + "15", borderWidth: 2,   pointRadius: 0, tension: 0.3, fill: true, segment: mkSeg(C.orange) },
      { label: "10yr Yield",   data: hmTsy,      borderColor: C.blueLight, backgroundColor: "transparent",   borderWidth: 1.5, pointRadius: 0, tension: 0.3, segment: mkSeg(C.blueLight) },
    ],
  };

  // ── Supply Pipeline: Permits + Starts (bar) + Months of Supply (line) ───
  const hSupplyData = {
    labels: years,
    datasets: [
      { type: "bar",  label: "Permits (k)",      data: hmPermits, backgroundColor: projBarColor(C.navy,    "88", "44"), borderRadius: 2, yAxisID: "y" },
      { type: "bar",  label: "Starts (k)",        data: hmStarts,  backgroundColor: projBarColor(C.navyMid, "66", "33"), borderRadius: 2, yAxisID: "y" },
      { type: "line", label: "Months of Supply",  data: hmSupply,  borderColor: C.red, borderWidth: 2, pointRadius: 0, tension: 0.3, yAxisID: "y1", segment: mkSeg(C.red) },
    ],
  };

  // ── Market Stress: Unemployment + Delinquency + Foreclosure ─────────────
  const hStressData = {
    labels: years,
    datasets: [
      { label: "Unemployment",  data: hmUnemployment, borderColor: C.orange,    backgroundColor: C.orange + "15",  borderWidth: 2,   pointRadius: 0, tension: 0.3, fill: true, segment: mkSeg(C.orange) },
      { label: "Delinquency",   data: hmDel,          borderColor: C.red,       backgroundColor: "transparent",    borderWidth: 2,   pointRadius: 0, tension: 0.3, segment: mkSeg(C.red) },
      { label: "Foreclosure",   data: hmForeclosure,  borderColor: C.purple,    backgroundColor: "transparent",    borderWidth: 1.5, pointRadius: 0, tension: 0.3, segment: mkSeg(C.purple) },
    ],
  };

  // ── Demand: Existing Home Sales (bar) + HH Formation (line) ─────────────
  const hDemandData = {
    labels: years,
    datasets: [
      { type: "bar",  label: "Existing Sales (M)",  data: ampledgeEnabled ? hmExistingSalesAmp : hmExistingSales, backgroundColor: projBarColor(C.greenLight, "88", "44"), borderRadius: 2, yAxisID: "y" },
      { type: "line", label: "HH Formation (000s)", data: hmHHFormation,   borderColor: C.navy, borderWidth: 2, pointRadius: 0, tension: 0.3, yAxisID: "y1", segment: mkSeg(C.navy) },
    ],
  };

  // ── Affordability & Ownership: Price/Income + Homeownership + Rental Vacancy ─
  const hAffordabilityData = {
    labels: years,
    datasets: [
      { label: "Price / Income",   data: hmPTI,                                           borderColor: C.red,       borderWidth: 2,   pointRadius: 0, tension: 0.3, yAxisID: "y",  segment: mkSeg(C.red) },
      { label: "Homeownership %",  data: ampledgeEnabled ? hmOwnershipAmp : hmOwnership,  borderColor: C.navy,      borderWidth: 2,   pointRadius: 0, tension: 0.3, yAxisID: "y1", segment: mkSeg(C.navy) },
      { label: "Rental Vacancy %", data: hmVacancy,                                       borderColor: C.blueLight, borderWidth: 1.5, pointRadius: 0, tension: 0.3, yAxisID: "y1", segment: mkSeg(C.blueLight) },
    ],
  };

  // ── Sentiment: Consumer Confidence + NAHB HMI ───────────────────────────
  const hSentimentData = {
    labels: years,
    datasets: [
      { label: "Consumer Confidence", data: hmConsumerConf, borderColor: C.green,  backgroundColor: C.green + "15", borderWidth: 2,   pointRadius: 0, tension: 0.3, fill: true, yAxisID: "y",  segment: mkSeg(C.green) },
      { label: "NAHB HMI",            data: hmNAHB,         borderColor: C.orange, backgroundColor: "transparent",  borderWidth: 1.5, pointRadius: 0, tension: 0.3, yAxisID: "y1", segment: mkSeg(C.orange) },
    ],
  };

  // bullet chart max values
  const bulletMax = (_stat, accessor) =>
    Math.max(
      ampSt[accessor],
      spSt[accessor],
      bndSt[accessor],
      vnqSt[accessor],
      0.1,
    ) * 1.4;
  const bBenchmarks = (accessor) => [
    { label: "S&P 500", value: spSt[accessor], color: C.greenLight },
    { label: "Bonds", value: bndSt[accessor], color: C.blueLight },
    { label: "VNQ", value: vnqSt[accessor], color: C.purpleLight },
  ];

  // ── Table footer averages ──
  const hpaAvg = avg(table.map((r) => r.apprec));
  const mrgAvg = avg(table.map((r) => r.mortgageRate).filter((v) => v != null));
  const delAvg = avg(
    table.map((r) => r.delinquencyRate).filter((v) => v != null),
  );
  const totalFees = table.reduce((s, r) => s + r.fees, 0);
  const totalBon = table.reduce((s, r) => s + r.bonuses, 0);
  const finalEnd = table.length > 0 ? table[table.length - 1].ending : 0;

  // ── Shared chart option fragments ──
  const pctYAxis = {
    ...baseGridScale,
    ticks: { ...baseGridScale.ticks, callback: (v) => v + "%" },
  };
  const pctXAxis = {
    ...baseGridScale,
    ticks: { ...baseGridScale.ticks, callback: (v) => v + "%" },
  };

  // ── Housing chart tooltip helpers ──────────────────────────────────────────
  const mkHTip = (fmtFn) => ({
    ...baseTooltip,
    mode: "index",
    intersect: false,
    callbacks: {
      label: (ctx) => {
        const v = ctx.parsed.y;
        return v == null ? null : ` ${ctx.dataset.label}: ${fmtFn(ctx.dataset.label, v)}`;
      },
    },
  });
  const hRatesTip    = mkHTip((_l, v) => v.toFixed(2) + "%");
  const hStressTip   = mkHTip((_l, v) => v.toFixed(2) + "%");
  const hSupplyTip   = mkHTip((l,  v) => l === "Months of Supply" ? v.toFixed(1) + " mo" : Math.round(v) + "k");
  const hDemandTip   = mkHTip((l,  v) => l.includes("(M)") ? v.toFixed(2) + "M" : Math.round(v) + "k");
  const hAffordTip   = mkHTip((l,  v) => l === "Price / Income" ? v.toFixed(1) + "×" : v.toFixed(1) + "%");
  const hSentimentTip = mkHTip((_l, v) => Math.round(v).toString());

  return (
    <Box
      sx={{
        fontFamily: "'Inter','Helvetica Neue',sans-serif",
        bgcolor: C.bg,
        minHeight: "100vh",
      }}
    >
      {/* ── Report Header ───────────────────────────────────────────── */}
      <Box
        sx={{
          bgcolor: C.navy,
          px: 4,
          py: 2.5,
          display: "flex",
          alignItems: { xs: "flex-start", md: "center" },
          justifyContent: "space-between",
          flexDirection: { xs: "column", md: "row" },
          gap: { xs: 2, md: 0 },
          borderBottom: `3px solid ${C.red}`,
        }}
      >
        <Box>
          <Box
            sx={{
              display: "flex",
              alignItems: { xs: "flex-start", md: "baseline" },
              flexDirection: { xs: "column", md: "row" },
              gap: { xs: 0.25, md: 1 },
            }}
          >
            <Box sx={{ display: "flex", alignItems: "baseline", gap: 1 }}>
              <Typography
                sx={{
                  color: C.white,
                  fontWeight: 900,
                  fontSize: 22,
                  letterSpacing: "0.01em",
                }}
              >
                American Pledge
              </Typography>
              <Box
                sx={{
                  width: 3,
                  height: 18,
                  bgcolor: C.red,
                  mx: 0.5,
                  display: { xs: "none", md: "block" },
                }}
              />
            </Box>
            <Typography
              sx={{ color: "#a0b4c8", fontWeight: 400, fontSize: 14 }}
            >
              Investment Performance Report
            </Typography>
          </Box>
          <Typography sx={{ color: "#5a7898", fontSize: 11, mt: 0.5 }}>
            American Pledge · Housing Finance Infrastructure · {periodLabel}
          </Typography>
        </Box>
        <Box
          sx={{
            display: "flex",
            gap: 1.5,
            flexWrap: "wrap",
            width: { xs: "100%", md: "auto" },
          }}
        >
          {[
            {
              label: "Avg Annual IRR",
              value: fmtPct(ampSt.avg),
              accent: ampSt.avg >= 0 ? "#4ade80" : "#f87171",
            },
            {
              label: "vs S&P 500",
              value: fmtPct(ampSt.avg - spSt.avg),
              accent: ampSt.avg >= spSt.avg ? "#4ade80" : "#f87171",
            },
            {
              label: "Sharpe Ratio",
              value: ampSt.sharpe.toFixed(2),
              accent: ampSt.sharpe >= 1 ? "#4ade80" : "#facc15",
            },
            {
              label: "Total Return",
              value: fmtPct(ampSt.total, 0),
              accent: ampSt.total >= 0 ? "#4ade80" : "#f87171",
            },
          ].map((s) => (
            <Box
              key={s.label}
              sx={{
                textAlign: "center",
                px: 2,
                py: 1.25,
                bgcolor: "#0d2d50",
                borderRadius: 1,
                flex: { xs: "1 1 calc(50% - 6px)", md: "0 0 auto" },
                minWidth: { xs: 0, md: 96 },
                border: `1px solid #1a3d5c`,
              }}
            >
              <Typography
                sx={{
                  fontSize: 9,
                  color: "#5a7898",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                {s.label}
              </Typography>
              <Typography
                sx={{
                  fontSize: 19,
                  fontWeight: 800,
                  color: s.accent,
                  mt: 0.25,
                  lineHeight: 1.1,
                }}
              >
                {s.value}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* ── Content ─────────────────────────────────────────────────── */}
      <Box sx={{ px: 3, py: 3 }}>
        {/* ── Main Two-Column Section ──────────────────────────────── */}
        <Grid container spacing={2.5} sx={{ mb: 3, alignItems: "stretch" }}>
          {/* Left 50%: Slider + Case-Shiller chart stacked */}
          <Grid item xs={12} md={6}>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 2.5,
                height: "100%",
              }}
            >
              {/* Slider */}
              <Card
                elevation={0}
                sx={{ border: `1px solid ${C.border}`, borderRadius: 1 }}
              >
                <CardContent sx={{ py: 2, "&:last-child": { pb: 2 } }}>
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 2,
                      mb: 2,
                    }}
                  >
                    <Typography
                      sx={{
                        fontSize: 11,
                        fontWeight: 800,
                        color: C.navy,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        minWidth: 110,
                      }}
                    >
                      Analysis Period
                    </Typography>
                    <Typography
                      sx={{ fontSize: 15, fontWeight: 800, color: C.red }}
                    >
                      {yearRange[0]} – {yearRange[1]}
                    </Typography>
                    <Typography sx={{ fontSize: 11, color: C.muted }}>
                      · {n} year{n !== 1 ? "s" : ""}
                    </Typography>
                  </Box>
                  <Box sx={{ px: 2 }}>
                    <Slider
                      value={yearRange}
                      onChange={(_, v) => setYearRange(v)}
                      min={1988}
                      max={2035}
                      step={1}
                      valueLabelDisplay="auto"
                      marks={[
                        1990, 1995, 2000, 2005, 2010, 2015, 2020, 2025, 2030,
                        2035,
                      ].map((y) => ({ value: y, label: String(y) }))}
                      sx={{
                        color: C.navy,
                        "& .MuiSlider-thumb": { bgcolor: C.navy },
                        "& .MuiSlider-track": {
                          bgcolor: C.navy,
                          borderColor: C.navy,
                        },
                        "& .MuiSlider-rail": { bgcolor: "#dde2ea" },
                        "& .MuiSlider-markLabel": {
                          fontSize: 10,
                          color: C.muted,
                        },
                        "& .MuiSlider-valueLabel": {
                          bgcolor: C.navy,
                          fontSize: 11,
                        },
                      }}
                    />
                  </Box>
                  {yearRange[1] > 2025 && (
                    <Box sx={{ px: 2, pt: 0.75, pb: 0.25 }}>
                      <Typography sx={{ fontSize: 10, color: C.orange }}>
                        ⚠ Years 2026–{yearRange[1]} are projections, not historical data
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>

              {/* Case-Shiller chart */}
              <Box
                sx={{
                  display: "flex",
                  gap: 2,
                  flexDirection: { xs: "column", md: "row" },
                }}
              >
                {/* Left col: Case-Shiller card + conditional correlation table */}
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, minWidth: 0 }}>
                <Card
                  elevation={0}
                  sx={{
                    border: `1px solid ${C.border}`,
                    borderRadius: 1,
                    minWidth: 0,
                    width: { xs: "100%", md: "auto" },
                  }}
                >
                  <CardContent>
                    <Box
                      sx={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        mb: 1,
                      }}
                    >
                      <Box>
                        <Typography
                          sx={{
                            fontSize: 11,
                            fontWeight: 800,
                            color: C.navy,
                            textTransform: "uppercase",
                            letterSpacing: "0.09em",
                          }}
                        >
                          S&P/Case-Shiller Home Price Appreciation Index
                        </Typography>
                        <Typography
                          sx={{ fontSize: 10, color: C.muted, mt: 0.25 }}
                        >
                          Monthly YoY % change · 20 MSAs + National Composite ·
                          Source: FRED
                          {selectedCity && (
                            <span style={{ color: C.red, fontWeight: 700, marginLeft: 8 }}>
                              ▶ {selectedCity} highlighted
                            </span>
                          )}
                        </Typography>
                      </Box>
                      {(chartPane === "neopoli" || chartPane === "opportunity") && (() => {
                        const mkt = NEOPOLI_MARKETS.find(x => x.id === neopoliMarket);
                        const proxy = mkt && GROUND_SCORE_CS_PROXY[mkt.id];
                        const dist  = mkt && GROUND_SCORE_CS_DIST[mkt.id];
                        if (!proxy || !dist) return null;
                        return (
                          <Box sx={{ textAlign: "right" }}>
                            <Typography sx={{ fontSize: 22, fontWeight: 800, color: CITY_COLORS[proxy] || C.navy, lineHeight: 1.1 }}>{dist} mi</Typography>
                            <Typography sx={{ fontSize: 10, color: C.muted, mt: 0.25 }}>from {mkt.name} to {proxy}</Typography>
                          </Box>
                        );
                      })()}
                    </Box>

                    {/* Zero line reference + chart */}
                    <Line
                      data={shillerData}
                      options={{
                        responsive: true,
                        animation: { duration: 200 },
                        plugins: {
                          legend: { display: false }, // custom legend below
                          tooltip: {
                            ...baseTooltip,
                            mode: "index",
                            intersect: false,
                            filter: (item) =>
                              item.dataset.label === "USA" ||
                              item.dataset.label === selectedCity,
                            callbacks: {
                              title: (items) => items[0]?.label ?? "",
                              label: (ctx) => {
                                const v = ctx.parsed.y;
                                return v != null
                                  ? ` ${ctx.dataset.label}: ${v.toFixed(2)}%`
                                  : null;
                              },
                            },
                          },
                        },
                        scales: {
                          x: {
                            ...baseGridScale,
                            ticks: {
                              ...baseGridScale.ticks,
                              maxRotation: 0,
                              autoSkip: true,
                              maxTicksLimit: 20,
                              callback: (_, index) => {
                                const label = csLabels[index];
                                return label && label.endsWith("-01")
                                  ? label.slice(0, 4)
                                  : "";
                              },
                            },
                          },
                          y: {
                            ...baseGridScale,
                            ticks: {
                              ...baseGridScale.ticks,
                              callback: (v) => v + "%",
                            },
                            title: {
                              display: true,
                              text: "YoY Home Price Appreciation (%)",
                              color: C.muted,
                              font: { ...baseFont, size: 11 },
                            },
                          },
                        },
                      }}
                    />

                    {/* Interactive city legend */}
                    <Box
                      sx={{
                        mt: 1.5,
                        pt: 1.5,
                        borderTop: `1px solid ${C.border}`,
                      }}
                    >
                      <Box
                        sx={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: 0.75,
                          alignItems: "center",
                        }}
                      >
                        {/* USA badge — always "on" */}
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                            px: 1.25,
                            py: 0.4,
                            borderRadius: "4px",
                            bgcolor: C.navy,
                            cursor: "default",
                            border: `1.5px solid ${C.navy}`,
                          }}
                        >
                          <Box
                            sx={{
                              width: 14,
                              height: 3,
                              bgcolor: "#fff",
                              borderRadius: 1,
                            }}
                          />
                          <Typography
                            sx={{
                              fontSize: 10,
                              fontWeight: 700,
                              color: "#fff",
                            }}
                          >
                            USA
                          </Typography>
                        </Box>
                        {/* City toggle chips */}
                        {CS_CITIES.map((city) => {
                          const active = selectedCity === city;
                          return (
                            <Box
                              key={city}
                              onClick={() =>
                                setSelectedCity(active ? null : city)
                              }
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 0.5,
                                px: 1.25,
                                py: 0.4,
                                borderRadius: "4px",
                                cursor: "pointer",
                                userSelect: "none",
                                bgcolor: active
                                  ? CITY_COLORS[city] + "22"
                                  : "transparent",
                                border: `1.5px solid ${active ? CITY_COLORS[city] : C.border}`,
                                "&:hover": {
                                  borderColor: CITY_COLORS[city],
                                  bgcolor: CITY_COLORS[city] + "15",
                                },
                                transition: "all 0.15s ease",
                              }}
                            >
                              <Box
                                sx={{
                                  width: 14,
                                  height: 3,
                                  bgcolor: CITY_COLORS[city],
                                  borderRadius: 1,
                                }}
                              />
                              <Typography
                                sx={{
                                  fontSize: 10,
                                  fontWeight: active ? 700 : 500,
                                  color: active ? CITY_COLORS[city] : C.muted,
                                }}
                              >
                                {city}
                              </Typography>
                            </Box>
                          );
                        })}
                      </Box>
                    </Box>
                  </CardContent>
                </Card>

                {/* Ground Score Market Rankings — shown below Case-Shiller when Urban Signal Indexing tab is active */}
                {chartPane === "neopoli" && (
                  <Card elevation={0} sx={{ border: `1px solid ${C.border}`, borderRadius: 1 }}>
                    <CardContent sx={{ pb: "12px !important" }}>
                      <SectionHeader title="Ground Score Rankings" sub="Composite scored candidates · deterministic screening run · 2026-03-27 · click a market to load its scorecard" />

                      {/* Concept explanation */}
                      <Box sx={{ mb: 2, pb: 2, borderBottom: `1px solid ${C.border}`, display: "flex", flexDirection: "column", gap: 1 }}>
                        <Typography sx={{ fontSize: 11, color: C.muted, lineHeight: 1.65 }}>
                          <span style={{ fontWeight: 700, color: C.charcoal }}>What Ground Score Is — </span>
                          Ground Score is a location-intelligence scoring platform built to identify where capital, infrastructure investment, and public-sector alignment are most likely to produce successful long-term urban growth. It answers a single high-value strategic question: <span style={{ fontStyle: "italic", color: C.charcoal }}>where should a new city or major district actually be built?</span>
                        </Typography>
                        <Typography sx={{ fontSize: 11, color: C.muted, lineHeight: 1.65 }}>
                          <span style={{ fontWeight: 700, color: C.charcoal }}>Where the Data Comes From — </span>
                          Scores are built from U.S. Census Bureau QuickFacts, Bureau of Labor Statistics employment data, DOE project records, and other official public sources. Each market is evaluated on 12 fixed dimensions covering cost, distress, demographic and labor momentum, business activity, catalysts, anchor institutions, infrastructure, logistics, governance, risk, and regulatory friction.
                        </Typography>
                        <Typography sx={{ fontSize: 11, color: C.muted, lineHeight: 1.65 }}>
                          <span style={{ fontWeight: 700, color: C.charcoal }}>The Logic & Why It Matters — </span>
                          The goal is not to find the cheapest place — it is to find where <span style={{ fontStyle: "italic", color: C.charcoal }}>low cost, distress, momentum, and executability align</span>. Some poor places begin to grow while others stay stagnant; the rubric is designed to separate the two. A higher composite score means more convergence of those conditions. Green tiers represent viable candidates worth advancing; gray indicates insufficient evidence for near-term prioritization.
                        </Typography>
                      </Box>

                      <Box sx={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                          <thead>
                            <tr>
                              {["#", "Market", "State · County", "Ground Score", "Confidence", "Portfolio Tier"].map(h => (
                                <th key={h} style={{ padding: "6px 10px", textAlign: "left", color: C.muted, fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {NEOPOLI_MARKETS.map((m, i) => {
                              const tierMeta = NEOPOLI_TIER_META[m.tier] || NEOPOLI_TIER_META.watchlist;
                              const isSelected = neopoliMarket === m.id;
                              const csProxy = GROUND_SCORE_CS_PROXY[m.id];
                              const csDist  = GROUND_SCORE_CS_DIST[m.id];
                              return (
                                <tr key={m.id} onClick={() => {
                                  setNeopoliMarket(m.id);
                                  if (csProxy) setSelectedCity(csProxy);
                                }} style={{ background: isSelected ? "#e8f0fa" : i % 2 === 0 ? "transparent" : C.bg, cursor: "pointer", borderBottom: `1px solid ${C.border}` }}>
                                  <td style={{ padding: "7px 10px", fontWeight: 700, color: C.navy, fontSize: 11, minWidth: 24, borderLeft: isSelected ? `3px solid ${C.navy}` : "3px solid transparent" }}>{m.rank}</td>
                                  <td style={{ padding: "7px 10px", fontWeight: isSelected ? 700 : 600, color: isSelected ? C.navy : C.charcoal, whiteSpace: "nowrap" }}>
                                    {m.name}
                                    {csProxy && <span style={{ fontSize: 9, color: C.muted, marginLeft: 5 }}>≈ {csProxy}{csDist ? ` · ${csDist} mi` : ""}</span>}
                                  </td>
                                  <td style={{ padding: "7px 10px", color: C.muted, whiteSpace: "nowrap", fontSize: 11 }}>{m.state} · {m.county}</td>
                                  <td style={{ padding: "7px 14px 7px 10px", whiteSpace: "nowrap", minWidth: 160 }}>
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                      <Box sx={{ flex: 1, height: 6, background: C.border, borderRadius: 3, minWidth: 80 }}>
                                        <Box sx={{ width: `${m.composite}%`, height: "100%", background: tierMeta.barColor, borderRadius: 3 }} />
                                      </Box>
                                      <span style={{ fontWeight: 700, color: C.charcoal, fontSize: 11, minWidth: 36, textAlign: "right" }}>{m.composite.toFixed(1)}</span>
                                    </Box>
                                  </td>
                                  <td style={{ padding: "7px 10px", color: C.muted, fontSize: 11, fontVariantNumeric: "tabular-nums", textAlign: "right" }}>{m.confidence.toFixed(1)}</td>
                                  <td style={{ padding: "7px 10px" }}>
                                    <span style={{ fontSize: 10, fontWeight: 700, color: tierMeta.color, background: tierMeta.badgeBg || tierMeta.color + "18", border: `1px solid ${tierMeta.badgeBg ? tierMeta.color + "88" : tierMeta.color + "44"}`, borderRadius: 4, padding: "2px 7px", whiteSpace: "nowrap" }}>{tierMeta.label}</span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </Box>
                    </CardContent>
                  </Card>
                )}

                {/* Opportunity Rankings — shown below Case-Shiller when Opportunity Urban Signals tab is active */}
                {chartPane === "opportunity" && (
                  <Card elevation={0} sx={{ border: `1px solid ${C.border}`, borderRadius: 1 }}>
                    <CardContent sx={{ pb: "12px !important" }}>
                      <SectionHeader title="Opportunity Score Rankings" sub="MPD site-selection scoring · same 15 markets evaluated on greenfield development criteria · click a market to load its scorecard" />
                      <Box sx={{ mb: 2, pb: 2, borderBottom: `1px solid ${C.border}`, display: "flex", flexDirection: "column", gap: 1 }}>
                        <Typography sx={{ fontSize: 11, color: C.muted, lineHeight: 1.65 }}>
                          <span style={{ fontWeight: 700, color: C.charcoal }}>Purpose of This View — </span>
                          The same 15 markets are scored here against master-planned community development criteria: metro adjacency, household income, school quality, permitting climate, and confirmed population demand. These markets are Contrarian candidates — expect low scores. This view validates the thesis separation and serves as a baseline until dedicated Opportunity candidates are added.
                        </Typography>
                      </Box>
                      <Box sx={{ overflowX: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                          <thead>
                            <tr>
                              {["#", "Market", "State · County", "Opportunity Score", "Confidence", "Dev. Tier"].map(h => (
                                <th key={h} style={{ padding: "6px 10px", textAlign: "left", color: C.muted, fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {[...NEOPOLI_MARKETS].sort((a, b) => (OPPORTUNITY_SCORES[b.id]?.composite || 0) - (OPPORTUNITY_SCORES[a.id]?.composite || 0)).map((m, i) => {
                              const opp = OPPORTUNITY_SCORES[m.id] || { composite: 0, confidence: 0, tier: "deprioritized" };
                              const tierMeta = NEOPOLI_TIER_META[opp.tier] || NEOPOLI_TIER_META.deprioritized;
                              const isSelected = neopoliMarket === m.id;
                              const csProxy = GROUND_SCORE_CS_PROXY[m.id];
                              const csDist  = GROUND_SCORE_CS_DIST[m.id];
                              return (
                                <tr key={m.id} onClick={() => { setNeopoliMarket(m.id); if (csProxy) setSelectedCity(csProxy); }} style={{ background: isSelected ? "#e8f0fa" : i % 2 === 0 ? "transparent" : C.bg, cursor: "pointer", borderBottom: `1px solid ${C.border}` }}>
                                  <td style={{ padding: "7px 10px", fontWeight: 700, color: C.navy, fontSize: 11, minWidth: 24, borderLeft: isSelected ? `3px solid ${C.navy}` : "3px solid transparent" }}>{i + 1}</td>
                                  <td style={{ padding: "7px 10px", fontWeight: isSelected ? 700 : 600, color: isSelected ? C.navy : C.charcoal, whiteSpace: "nowrap" }}>
                                    {m.name}
                                    {csProxy && <span style={{ fontSize: 9, color: C.muted, marginLeft: 5 }}>≈ {csProxy}{csDist ? ` · ${csDist} mi` : ""}</span>}
                                  </td>
                                  <td style={{ padding: "7px 10px", color: C.muted, whiteSpace: "nowrap", fontSize: 11 }}>{m.state} · {m.county}</td>
                                  <td style={{ padding: "7px 14px 7px 10px", whiteSpace: "nowrap", minWidth: 160 }}>
                                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                      <Box sx={{ flex: 1, height: 6, background: C.border, borderRadius: 3, minWidth: 80 }}>
                                        <Box sx={{ width: `${opp.composite}%`, height: "100%", background: tierMeta.barColor, borderRadius: 3 }} />
                                      </Box>
                                      <span style={{ fontWeight: 700, color: C.charcoal, fontSize: 11, minWidth: 36, textAlign: "right" }}>{opp.composite.toFixed(1)}</span>
                                    </Box>
                                  </td>
                                  <td style={{ padding: "7px 10px", color: C.muted, fontSize: 11, fontVariantNumeric: "tabular-nums", textAlign: "right" }}>{opp.confidence.toFixed(1)}</td>
                                  <td style={{ padding: "7px 10px" }}>
                                    <span style={{ fontSize: 10, fontWeight: 700, color: tierMeta.color, background: tierMeta.badgeBg || tierMeta.color + "18", border: `1px solid ${tierMeta.badgeBg ? tierMeta.color + "88" : tierMeta.color + "44"}`, borderRadius: 4, padding: "2px 7px", whiteSpace: "nowrap" }}>{tierMeta.label}</span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </Box>
                    </CardContent>
                  </Card>
                )}

                {/* Housing driver charts — shown below Case-Shiller when Housing Market tab is active */}
                {chartPane === "housing" && (() => {
                  // Insight-relevant snapshots
                  const iMtg    = lastOf(hmMtg);
                  const iFed    = lastOf(hmFedFunds);
                  const iTsy    = lastOf(hmTsy);
                  const iDel    = lastOf(hmDel);
                  const iFcl    = lastOf(hmForeclosure);
                  const iUnemp  = lastOf(hmUnemployment);
                  const iSales  = lastOf(hmExistingSales);
                  const iSupply = lastOf(hmSupply);
                  const iPermit = lastOf(hmPermits);
                  const iPTI    = lastOf(hmPTI);
                  const iOwn    = lastOf(hmOwnership);
                  const iNAHB   = lastOf(hmNAHB);
                  const iCC     = lastOf(hmConsumerConf);
                  const spread  = iMtg != null && iFed != null ? (iMtg - iFed).toFixed(2) : null;
                  const supplyTone = iSupply == null ? "" : iSupply < 3 ? "seller's market" : iSupply > 6 ? "buyer's market" : "balanced market";

                  const Insight = ({ children }) => (
                    <Box sx={{ mt: 1.25, pt: 1.25, borderTop: `1px solid ${C.border}` }}>
                      <Typography sx={{ fontSize: 11, color: C.muted, lineHeight: 1.6 }}>{children}</Typography>
                    </Box>
                  );
                  const Callout = ({ color, children }) => (
                    <Box sx={{ mt: 1, p: 1, borderRadius: 1, background: color + "12", border: `1px solid ${color}44` }}>
                      <Typography sx={{ fontSize: 11, color, lineHeight: 1.6 }}>{children}</Typography>
                    </Box>
                  );

                  return (
                  <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, gap: 2 }}>
                    <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>

                      {/* Rates & Policy */}
                      <Card elevation={0} sx={{ border: `1px solid ${C.border}`, borderRadius: 1 }}>
                        <CardContent>
                          <SectionHeader title="Rates & Policy" sub="Fed funds · mortgage rate · 10yr Treasury" />
                          <Line data={hRatesData} options={{ responsive: true, plugins: { legend: baseLegend, tooltip: hRatesTip }, scales: { x: baseGridScale, y: { ...baseGridScale, ticks: { ...baseGridScale.ticks, callback: (v) => v + "%" } } } }} />
                          <Insight>
                            Mortgage rates at <strong>{iMtg?.toFixed(2)}%</strong> carry a {spread && <strong>{spread}pp</strong>} premium over Fed Funds
                            {iTsy != null && iFed != null && iTsy < iFed ? ", with an inverted yield curve signaling near-term economic stress" : ""}.
                            {" "}Elevated rates reduce buyer purchasing power and create the <em>lock-in effect</em> — owners with legacy mortgages below 4% face a steep financial penalty to sell, suppressing both supply and transaction volume.
                            <strong style={{ color: C.navy }}> Rate normalization is the single largest catalyst for housing market recovery and is central to all three forecast scenarios.</strong>
                          </Insight>
                          <Callout color={C.navy}>
                            <strong>Ampledge Impact:</strong> By funding the 20% down payment, Ampledge reduces the loan balance — shrinking payment exposure to rate movements.
                            {" "}A buyer using Ampledge on a $400k home borrows $320k vs $380k conventionally, saving ~$400–500/mo at current rates before PMI elimination.
                            {" "}The program's value proposition is most powerful <em>precisely in this high-rate environment</em> — it de-risks the cost of entry that rates have made prohibitive.
                          </Callout>
                          {false && ampledgeEnabled && yearRange[1] > 2025 && (
                            <Box sx={{ mt: 0.75, p: 0.75, borderRadius: 1, background: C.navy + "0d", border: `1px solid ${C.navy}33`, display: "flex", alignItems: "center", gap: 1 }}>
                              <Typography sx={{ fontSize: 10, color: C.navy, fontWeight: 700 }}>▶ Model Active:</Typography>
                              <Typography sx={{ fontSize: 10, color: C.navy }}>Payment relief reduces buyer default risk, sustaining demand through rate cycles.</Typography>
                            </Box>
                          )}
                        </CardContent>
                      </Card>

                      {/* Market Stress */}
                      <Card elevation={0} sx={{ border: `1px solid ${C.border}`, borderRadius: 1 }}>
                        <CardContent>
                          <SectionHeader title="Market Stress" sub="Unemployment · delinquency · foreclosure rate" />
                          <Line data={hStressData} options={{ responsive: true, plugins: { legend: baseLegend, tooltip: hStressTip }, scales: { x: baseGridScale, y: { ...baseGridScale, ticks: { ...baseGridScale.ticks, callback: (v) => v + "%" } } } }} />
                          <Insight>
                            Delinquency at <strong>{iDel?.toFixed(1)}%</strong> and foreclosure inventory at <strong>{iFcl?.toFixed(1)}%</strong> remain historically moderate.
                            {" "}Low distressed supply acts as a price floor — without forced sellers, there is no mechanism to push prices sharply lower.
                            {" "}Unemployment at <strong>{iUnemp?.toFixed(1)}%</strong> {iUnemp != null && iUnemp < 4.5 ? "remains below the ~4.5% threshold historically linked to broad mortgage stress" : "is approaching levels associated with rising credit defaults"}.
                            <strong style={{ color: C.navy }}> Stress metrics are a lagging indicator — watch delinquency trends 12–18 months ahead of any HPA impact.</strong>
                          </Insight>
                          <Callout color={C.navy}>
                            <strong>Ampledge Impact:</strong> The 20% equity position at origination is the most effective structural protection against foreclosure risk — for both the homeowner and Ampledge's investment.
                            {" "}A homeowner must absorb a 20%+ price decline before going underwater, vs. just 3–5% with low-down conventional loans.
                            {" "}This is why the 2008 crisis was catastrophic for low-equity borrowers but far less damaging for 20%-down buyers in the same markets. Ampledge-backed purchases carry structurally lower default risk regardless of the rate environment.
                          </Callout>
                          {false && ampledgeEnabled && yearRange[1] > 2025 && (
                            <Box sx={{ mt: 0.75, p: 0.75, borderRadius: 1, background: C.navy + "0d", border: `1px solid ${C.navy}33`, display: "flex", alignItems: "center", gap: 1 }}>
                              <Typography sx={{ fontSize: 10, color: C.navy, fontWeight: 700 }}>▶ Model Active:</Typography>
                              <Typography sx={{ fontSize: 10, color: C.navy }}>20% equity floor structurally suppresses delinquency and foreclosure among Ampledge-backed loans.</Typography>
                            </Box>
                          )}
                        </CardContent>
                      </Card>

                      {/* Demand */}
                      <Card elevation={0} sx={{ border: `1px solid ${C.border}`, borderRadius: 1 }}>
                        <CardContent>
                          <SectionHeader title="Demand" sub="Existing home sales (M, left) · net household formation (000s, right)" />
                          <Bar data={hDemandData} options={{ responsive: true, plugins: { legend: baseLegend, tooltip: hDemandTip }, scales: { x: baseGridScale, y: { ...baseGridScale, position: "left", ticks: { ...baseGridScale.ticks, callback: (v) => v + "M" } }, y1: { ...baseGridScale, position: "right", grid: { drawOnChartArea: false }, ticks: { ...baseGridScale.ticks, callback: (v) => v + "k" } } } }} />
                          <Insight>
                            Existing home sales at <strong>{iSales?.toFixed(2)}M</strong> are near a <strong style={{ color: C.red }}>28-year low</strong> (4.06M in 2024, weakest since 1995).
                            {" "}The primary cause is the <em>mortgage rate lock-in effect</em> — an estimated ~40% of outstanding mortgages carry rates below 4%, making selling at 6–7%+ rates economically punishing.
                            {" "}This creates a paradox: low sales volume despite high prices, as reduced supply offsets reduced demand and sustains HPA even in a frozen market.
                          </Insight>
                          <Callout color={C.navy}>
                            <strong>Ampledge Impact:</strong> The 20% down payment program directly addresses the buyer affordability squeeze — the <em>demand side</em> of the freeze.
                            {" "}By funding the down payment, Ampledge eliminates PMI (~$150–300/mo) and reduces the loan balance, translating to ~$600–800/month in payment relief on a median home.
                            {" "}This re-qualifies buyers priced out by higher rates, expanding the active buyer pool and increasing competition for the limited inventory that does reach market — a direct HPA tailwind for AmPledge-financed transactions.
                          </Callout>
                          {false && ampledgeEnabled && yearRange[1] > 2025 && (
                            <Box sx={{ mt: 0.75, p: 0.75, borderRadius: 1, background: C.navy + "0d", border: `1px solid ${C.navy}33`, display: "flex", alignItems: "center", gap: 1 }}>
                              <Typography sx={{ fontSize: 10, color: C.navy, fontWeight: 700 }}>▶ Model Active:</Typography>
                              <Typography sx={{ fontSize: 10, color: C.navy }}>+{AMP_EXISTING_LIFT.toFixed(3)}M existing sales/yr added · chart bars reflect Ampledge volume at scale.</Typography>
                            </Box>
                          )}
                        </CardContent>
                      </Card>

                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 }}>

                      {/* Supply Pipeline */}
                      <Card elevation={0} sx={{ border: `1px solid ${C.border}`, borderRadius: 1 }}>
                        <CardContent>
                          <SectionHeader title="Supply Pipeline" sub="Permits · starts (k, left) · months of supply (right)" />
                          <Bar data={hSupplyData} options={{ responsive: true, plugins: { legend: baseLegend, tooltip: hSupplyTip }, scales: { x: baseGridScale, y: { ...baseGridScale, position: "left", ticks: { ...baseGridScale.ticks, callback: (v) => v + "k" } }, y1: { ...baseGridScale, position: "right", grid: { drawOnChartArea: false }, ticks: { ...baseGridScale.ticks, callback: (v) => v + "mo" } } } }} />
                          <Insight>
                            At <strong>{iSupply?.toFixed(1)} months</strong> of supply, the market is in a <strong>{supplyTone}</strong> ({"<"}3 = seller's, {">"}6 = buyer's).
                            {" "}Permits at <strong>{iPermit?.toFixed(0)}k</strong> remain {iPermit != null && iPermit < 1200 ? "below the ~1.2M units/yr required to absorb household formation, sustaining the structural undersupply that has underpinned prices since 2012" : "near the level needed to absorb new household formation"}.
                            <strong style={{ color: C.navy }}> Constrained supply is the structural backstop for HPA — even with demand headwinds, limited inventory prevents significant price declines.</strong>
                          </Insight>
                          <Callout color={C.navy}>
                            <strong>Ampledge Impact:</strong> By converting qualified-but-cash-constrained buyers into active purchasers, Ampledge activates latent demand that competes for existing inventory.
                            {" "}As new permits eventually come to market, Ampledge-enabled buyers are positioned to absorb that supply, sustaining transaction volume across the cycle.
                          </Callout>
                          {false && ampledgeEnabled && yearRange[1] > 2025 && (
                            <Box sx={{ mt: 0.75, p: 0.75, borderRadius: 1, background: C.navy + "0d", border: `1px solid ${C.navy}33`, display: "flex", alignItems: "center", gap: 1 }}>
                              <Typography sx={{ fontSize: 10, color: C.navy, fontWeight: 700 }}>▶ Model Active:</Typography>
                              <Typography sx={{ fontSize: 10, color: C.navy }}>Demand absorption from 50k/yr transactions reduces effective months-of-supply in target markets.</Typography>
                            </Box>
                          )}
                        </CardContent>
                      </Card>

                      {/* Affordability & Ownership */}
                      <Card elevation={0} sx={{ border: `1px solid ${C.border}`, borderRadius: 1 }}>
                        <CardContent>
                          <SectionHeader title="Affordability & Ownership" sub="Price/income (left) · homeownership % · rental vacancy % (right)" />
                          <Line data={hAffordabilityData} options={{ responsive: true, plugins: { legend: baseLegend, tooltip: hAffordTip }, scales: { x: baseGridScale, y: { ...baseGridScale, position: "left", min: 3.5, suggestedMax: 8, ticks: { ...baseGridScale.ticks, callback: (v) => v.toFixed(1) + "×" } }, y1: { ...baseGridScale, position: "right", min: 0, suggestedMax: 80, grid: { drawOnChartArea: false }, ticks: { ...baseGridScale.ticks, callback: (v) => v + "%" } } } }} />
                          <Insight>
                            Price-to-income at <strong>{iPTI?.toFixed(1)}×</strong> is {iPTI != null && iPTI > 4.5 ? <><strong style={{ color: C.red }}>well above</strong> the 40-year average of ~3.8×</> : "near the long-run average of ~3.8×"}, reflecting a structurally stretched affordability environment.
                            {" "}Homeownership at <strong>{iOwn?.toFixed(1)}%</strong> has held stable, confirming that existing owners are staying put rather than trading — compressing turnover and keeping effective inventory low.
                            <strong style={{ color: C.navy }}> Stretched affordability limits the buyer universe but does not reverse prices while supply remains constrained.</strong>
                          </Insight>
                          <Callout color={C.navy}>
                            <strong>Ampledge Impact:</strong> The price-to-income ratio is the core affordability metric Ampledge is designed to overcome.
                            {" "}Ampledge removes that barrier entirely, converting the affordability gap from a permanent disqualifier into a solvable problem — and expanding the addressable homeownership market in the process.
                          </Callout>
                          {false && ampledgeEnabled && yearRange[1] > 2025 && (
                            <Box sx={{ mt: 0.75, p: 0.75, borderRadius: 1, background: C.navy + "0d", border: `1px solid ${C.navy}33`, display: "flex", alignItems: "center", gap: 1 }}>
                              <Typography sx={{ fontSize: 10, color: C.navy, fontWeight: 700 }}>▶ Model Active:</Typography>
                              <Typography sx={{ fontSize: 10, color: C.navy }}>Homeownership rate rising +{AMP_OWN_LIFT_PER_YR.toFixed(3)}%/yr · chart reflects cumulative lift through {yearRange[1]}.</Typography>
                            </Box>
                          )}
                        </CardContent>
                      </Card>

                      {/* Sentiment */}
                      <Card elevation={0} sx={{ border: `1px solid ${C.border}`, borderRadius: 1 }}>
                        <CardContent>
                          <SectionHeader title="Sentiment" sub="Consumer confidence (left) · NAHB builder confidence (right)" />
                          <Line data={hSentimentData} options={{ responsive: true, plugins: { legend: baseLegend, tooltip: hSentimentTip }, scales: { x: baseGridScale, y: { ...baseGridScale, position: "left" }, y1: { ...baseGridScale, position: "right", grid: { drawOnChartArea: false }, ticks: { ...baseGridScale.ticks, callback: (v) => v } } } }} />
                          <Insight>
                            NAHB builder confidence at <strong>{iNAHB}</strong> {iNAHB != null && iNAHB < 50 ? <><strong style={{ color: C.red }}>below 50</strong> — more builders view conditions as poor than good, signaling continued reluctance to add supply</> : <><strong style={{ color: C.greenLight }}>above 50</strong> — builders are net-optimistic, likely to expand supply</>}.
                            {" "}Consumer confidence at <strong>{iCC}</strong> {iCC != null && iCC > 100 ? "reflects healthy household sentiment supportive of major purchase decisions" : "reflects cautious households more likely to delay discretionary home purchases"}.
                            <strong style={{ color: C.navy }}> Sentiment leads housing activity by 3–6 months and is an early signal for both transaction volume and pricing momentum.</strong>
                          </Insight>
                          {false && ampledgeEnabled && yearRange[1] > 2025 && (
                            <Box sx={{ mt: 0.75, p: 0.75, borderRadius: 1, background: C.navy + "0d", border: `1px solid ${C.navy}33`, display: "flex", alignItems: "center", gap: 1 }}>
                              <Typography sx={{ fontSize: 10, color: C.navy, fontWeight: 700 }}>▶ Model Active:</Typography>
                              <Typography sx={{ fontSize: 10, color: C.navy }}>Improved homebuyer confidence from Ampledge accessibility supports both consumer sentiment and builder outlook.</Typography>
                            </Box>
                          )}
                        </CardContent>
                      </Card>

                    </Box>
                  </Box>
                  );
                })()}
                </Box>{/* end left col */}

                {/* Right 50%: portfolio / housing panes */}
                <Box
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    width: { xs: "100%", md: "auto" },
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                  }}
                >
                  {/* Pane toggle */}
                  <Box sx={{ display: "flex", borderRadius: 1, overflow: "hidden", border: `1px solid ${C.border}`, alignSelf: "flex-start" }}>
                    {[["portfolio", "Portfolio"], ["housing", "Housing Market"], ["neopoli", "Contrarian Urban Signals"], ["opportunity", "Opportunity Urban Signals"]].map(([v, label]) => (
                      <button key={v} onClick={() => {
                        setChartPane(v);
                        if (v === "neopoli" || v === "opportunity") {
                          const proxy = GROUND_SCORE_CS_PROXY[neopoliMarket];
                          setSelectedCity(proxy || null);
                        } else {
                          setSelectedCity(null);
                        }
                      }} style={{
                        padding: "5px 12px", fontSize: 11, fontWeight: 600,
                        fontFamily: "'Inter',sans-serif", border: "none", cursor: "pointer",
                        background: chartPane === v ? C.navy : C.white,
                        color: chartPane === v ? C.white : C.muted,
                        transition: "all 0.15s",
                        borderLeft: v === "portfolio" ? "none" : `1px solid ${C.border}`,
                      }}>{label}</button>
                    ))}
                  </Box>

                  {chartPane === "portfolio" && <Box
                    sx={{
                      display: "flex",
                      flexDirection: { xs: "column", md: "row" },
                      gap: 2,
                      flex: 1,
                    }}
                  >
                    {/* Left sub-col: Cumulative Growth → Annual Returns → Risk vs Return */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 2,
                          height: "100%",
                        }}
                      >
                        <Card
                          elevation={0}
                          sx={{
                            border: `1px solid ${C.border}`,
                            borderRadius: 1,
                            flex: 1,
                          }}
                        >
                          <CardContent>
                            <SectionHeader
                              title="Cumulative Growth"
                              sub="$10,000 initial · Dividends reinvested"
                            />
                            <Line
                              data={lineData}
                              options={{
                                responsive: true,
                                plugins: {
                                  legend: baseLegend,
                                  tooltip: {
                                    ...baseTooltip,
                                    callbacks: {
                                      label: (ctx) =>
                                        `${ctx.dataset.label}: ${fmtUSD(ctx.parsed.y)}`,
                                    },
                                  },
                                },
                                scales: {
                                  x: baseGridScale,
                                  y: {
                                    ...baseGridScale,
                                    ticks: {
                                      ...baseGridScale.ticks,
                                      callback: (v) => fmtUSD(v),
                                    },
                                  },
                                },
                              }}
                            />
                          </CardContent>
                        </Card>
                        <Card
                          elevation={0}
                          sx={{
                            border: `1px solid ${C.border}`,
                            borderRadius: 1,
                            flex: 1,
                          }}
                        >
                          <CardContent>
                            <SectionHeader
                              title="Annual Returns"
                              sub="Year-by-year vs benchmarks"
                            />
                            <Bar
                              data={barData}
                              options={{
                                responsive: true,
                                plugins: {
                                  legend: baseLegend,
                                  tooltip: baseTooltip,
                                },
                                scales: { x: baseGridScale, y: pctYAxis },
                              }}
                            />
                          </CardContent>
                        </Card>

                        <Card
                          elevation={0}
                          sx={{
                            border: `1px solid ${C.border}`,
                            borderRadius: 1,
                          }}
                        >
                          <CardContent>
                            <SectionHeader
                              title="Portfolio Structure"
                              sub="Capital tranche allocation"
                            />
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 2,
                              }}
                            >
                              <Box sx={{ width: 100, flexShrink: 0 }}>
                                <Pie
                                  data={pieData}
                                  options={{
                                    responsive: true,
                                    plugins: {
                                      legend: { display: false },
                                      tooltip: baseTooltip,
                                    },
                                  }}
                                />
                              </Box>
                              <Box>
                                {[
                                  {
                                    label: "Early Exits",
                                    pct: "45%",
                                    desc: "Yrs 1–3",
                                    color: C.navy,
                                  },
                                  {
                                    label: "Mid Term Exits",
                                    pct: "28%",
                                    desc: "Yrs 4–7",
                                    color: C.red,
                                  },
                                  {
                                    label: "Target Exits",
                                    pct: "19%",
                                    desc: "Yrs 7–11",
                                    color: C.purple,
                                  },
                                  {
                                    label: "Late Exits",
                                    pct: "8%",
                                    desc: "Yrs 12+",
                                    color: C.blueLight,
                                  },
                                ].map((t) => (
                                  <Box
                                    key={t.label}
                                    sx={{
                                      display: "flex",
                                      gap: 1,
                                      mb: 1,
                                      alignItems: "flex-start",
                                    }}
                                  >
                                    <Box
                                      sx={{
                                        width: 8,
                                        height: 8,
                                        borderRadius: "50%",
                                        bgcolor: t.color,
                                        mt: 0.5,
                                        flexShrink: 0,
                                      }}
                                    />
                                    <Typography
                                      sx={{ fontSize: 10, color: C.charcoal }}
                                    >
                                      <strong>{t.label}</strong>{" "}
                                      <span style={{ color: t.color }}>
                                        {t.pct}
                                      </span>{" "}
                                      — {t.desc}
                                    </Typography>
                                  </Box>
                                ))}
                              </Box>
                            </Box>
                          </CardContent>
                        </Card>
                      </Box>
                    </Box>

                    {/* Right sub-col: Performance vs Benchmarks (tall) + Portfolio Structure */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 2,
                          height: "100%",
                        }}
                      >
                        <Card
                          elevation={0}
                          sx={{
                            border: `1px solid ${C.border}`,
                            borderRadius: 1,
                            flex: 1,
                          }}
                        >
                          <CardContent>
                            <SectionHeader
                              title="Performance vs. Benchmarks"
                              sub="AmPledge bullet chart"
                            />
                            <BulletRow
                              label="Avg Annual Return (%)"
                              value={ampSt.avg}
                              max={bulletMax(null, "avg")}
                              benchmarks={bBenchmarks("avg")}
                            />
                            <BulletRow
                              label="Sharpe Ratio"
                              value={Math.max(0, ampSt.sharpe)}
                              max={
                                Math.max(
                                  ampSt.sharpe,
                                  spSt.sharpe,
                                  bndSt.sharpe,
                                  vnqSt.sharpe,
                                  0.1,
                                ) * 1.5
                              }
                              benchmarks={[
                                {
                                  label: "S&P 500",
                                  value: Math.max(0, spSt.sharpe),
                                  color: C.greenLight,
                                },
                                {
                                  label: "Bonds",
                                  value: Math.max(0, bndSt.sharpe),
                                  color: C.blueLight,
                                },
                                {
                                  label: "VNQ",
                                  value: Math.max(0, vnqSt.sharpe),
                                  color: C.purpleLight,
                                },
                              ]}
                            />
                            <BulletRow
                              label="Volatility (%)"
                              value={ampSt.vol}
                              max={bulletMax(null, "vol")}
                              benchmarks={bBenchmarks("vol")}
                            />
                            <BulletRow
                              label="Total Return (%)"
                              value={Math.max(0, ampSt.total)}
                              max={
                                Math.max(
                                  ampSt.total,
                                  spSt.total,
                                  bndSt.total,
                                  vnqSt.total,
                                  1,
                                ) * 1.3
                              }
                              benchmarks={[
                                {
                                  label: "S&P 500",
                                  value: Math.max(0, spSt.total),
                                  color: C.greenLight,
                                },
                                {
                                  label: "Bonds",
                                  value: Math.max(0, bndSt.total),
                                  color: C.blueLight,
                                },
                                {
                                  label: "VNQ",
                                  value: Math.max(0, vnqSt.total),
                                  color: C.purpleLight,
                                },
                              ]}
                            />
                          </CardContent>
                        </Card>

                        <Card
                          elevation={0}
                          sx={{
                            border: `1px solid ${C.border}`,
                            borderRadius: 1,
                            flex: 1,
                          }}
                        >
                          <CardContent>
                            <SectionHeader
                              title="Risk vs. Return"
                              sub="Return vs. volatility"
                            />
                            <Scatter
                              data={scatterData}
                              options={{
                                responsive: true,
                                plugins: {
                                  legend: baseLegend,
                                  tooltip: {
                                    ...baseTooltip,
                                    callbacks: {
                                      label: (ctx) => {
                                        const s = [ampSt, spSt, bndSt, vnqSt][
                                          ctx.datasetIndex
                                        ];
                                        return [
                                          ctx.dataset.label,
                                          `Return: ${ctx.parsed.y.toFixed(2)}%`,
                                          `Vol: ${ctx.parsed.x.toFixed(2)}%`,
                                          `Sharpe: ${s.sharpe.toFixed(2)}`,
                                        ];
                                      },
                                    },
                                  },
                                },
                                scales: {
                                  x: {
                                    ...pctXAxis,
                                    title: {
                                      display: true,
                                      text: "Volatility (%)",
                                      color: C.muted,
                                      font: { ...baseFont, size: 10 },
                                    },
                                  },
                                  y: {
                                    ...pctYAxis,
                                    title: {
                                      display: true,
                                      text: "Return (%)",
                                      color: C.muted,
                                      font: { ...baseFont, size: 10 },
                                    },
                                  },
                                },
                              }}
                            />
                            <Box
                              sx={{
                                mt: 1,
                                pt: 1,
                                borderTop: `1px solid ${C.border}`,
                                display: "flex",
                                gap: 1,
                              }}
                            >
                              {[
                                { label: "AmPledge", st: ampSt, color: C.red },
                                { label: "S&P", st: spSt, color: C.greenLight },
                                {
                                  label: "Bonds",
                                  st: bndSt,
                                  color: C.blueLight,
                                },
                                {
                                  label: "VNQ",
                                  st: vnqSt,
                                  color: C.purpleLight,
                                },
                              ].map((s) => (
                                <Box
                                  key={s.label}
                                  sx={{
                                    flex: 1,
                                    textAlign: "center",
                                    py: 0.5,
                                    borderRadius: 1,
                                    bgcolor: C.bg,
                                    border: `1px solid ${C.border}`,
                                  }}
                                >
                                  <Typography
                                    sx={{
                                      fontSize: 8,
                                      color: C.muted,
                                      textTransform: "uppercase",
                                    }}
                                  >
                                    {s.label}
                                  </Typography>
                                  <Typography
                                    sx={{
                                      fontSize: 14,
                                      fontWeight: 800,
                                      color: s.color,
                                      lineHeight: 1.1,
                                    }}
                                  >
                                    {s.st.sharpe.toFixed(2)}
                                  </Typography>
                                  <Typography
                                    sx={{ fontSize: 8, color: C.muted }}
                                  >
                                    Sharpe
                                  </Typography>
                                </Box>
                              ))}
                            </Box>
                          </CardContent>
                        </Card>
                      </Box>
                    </Box>
                  </Box>}

                  {chartPane === "housing" && <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>

                    {/* ── Housing Market Summary ── */}
                    <Card elevation={0} sx={{ border: `1px solid ${C.border}`, borderRadius: 1 }}>
                      <CardContent sx={{ pb: "12px !important" }}>
                        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 1.5, gap: 1, flexWrap: "wrap" }}>
                          <SectionHeader title="Housing Market Summary" sub="Conditions assessment · selected period + scenario outlook" />
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: mktToneColor, background: mktToneColor + "18", border: `1px solid ${mktToneColor}44`, borderRadius: 4, padding: "3px 10px", whiteSpace: "nowrap" }}>
                              {blendedScore > 0.5 ? "▲ " : blendedScore < -0.5 ? "▼ " : "● "}{mktTone.charAt(0).toUpperCase() + mktTone.slice(1)}
                            </span>
                          </Box>
                        </Box>
                        {/* Scenario + Ampledge controls */}
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75, mb: 1.5, pb: 1.25, borderBottom: `1px solid ${C.border}` }}>
                          {/* Row 1: Scenario */}
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                            <Typography sx={{ fontSize: 11, color: C.muted, fontWeight: 600, minWidth: 68 }}>Scenario:</Typography>
                            {[["Bear","bear",C.red],["Base","base",C.navy],["Bull","bull",C.greenLight]].map(([label,val,color]) => (
                              <button key={val} onClick={() => setScenario(val)} style={{ padding: "3px 10px", fontSize: 11, fontWeight: 600, fontFamily: "'Inter',sans-serif", border: `1px solid ${scenario === val ? color : C.border}`, borderRadius: 4, cursor: "pointer", background: scenario === val ? color : C.white, color: scenario === val ? C.white : C.muted }}>
                                {label}
                              </button>
                            ))}
                            <Typography sx={{ fontSize: 10, color: C.muted, fontStyle: "italic", ml: 0.5 }}>
                              {scenario === "bear" ? "Rates elevated, demand softens" : scenario === "bull" ? "Rate relief arrives, demand surges" : "Gradual normalization, steady growth"}
                            </Typography>
                          </Box>
                          {/* Row 2: Ampledge Impact — note is always rendered to prevent button shift */}
                          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                            <Typography sx={{ fontSize: 11, color: C.muted, fontWeight: 600, minWidth: 68 }}>Ampledge:</Typography>
                            <button onClick={() => setAmpledgeEnabled(!ampledgeEnabled)} style={{ padding: "3px 10px", fontSize: 11, fontWeight: 600, fontFamily: "'Inter',sans-serif", border: `1px solid ${ampledgeEnabled ? C.navy : C.border}`, borderRadius: 4, cursor: "pointer", background: ampledgeEnabled ? C.navy : C.white, color: ampledgeEnabled ? C.white : C.muted }}>
                              {ampledgeEnabled ? "On" : "Off"}
                            </button>
                            <Typography sx={{ fontSize: 10, color: C.muted, fontStyle: "italic", ml: 0.5, visibility: ampledgeEnabled ? "visible" : "hidden" }}>
                              50k transactions/yr · +{AMP_HPA_PREMIUM.toFixed(1)}pp HPA · +0.04%/yr ownership
                            </Typography>
                          </Box>
                        </Box>

                        {/* Current conditions */}
                        <Typography sx={{ fontSize: 12, color: C.charcoal, lineHeight: 1.6, mb: 1.5 }}>
                          Over the selected period, {mktStrongTailwinds.length} strong tailwind{mktStrongTailwinds.length !== 1 ? "s" : ""} and {mktStrongHeadwinds.length} strong headwind{mktStrongHeadwinds.length !== 1 ? "s" : ""} are present among key housing drivers.
                          {mktHPA != null && <> HPA is running at <strong>{mktHPA.toFixed(1)}%</strong> annually</>}
                          {mktMtg != null && <>, with 30-year mortgage rates at <strong>{mktMtg.toFixed(2)}%</strong></>}
                          {mktSupply != null && <> and <strong>{mktSupply.toFixed(1)} months</strong> of supply on the market</>}.
                          {mktUnemp != null && <> Unemployment at <strong>{mktUnemp.toFixed(1)}%</strong></>}
                          {mktFed != null && <> and Fed Funds at <strong>{mktFed.toFixed(2)}%</strong></>}
                          {mktNAHB != null && <> with builder sentiment at <strong>{mktNAHB}</strong> (NAHB)</>}
                          {" "}paint a {mktTone} backdrop for appreciation.
                          {mktStrongHeadwinds.length > 0 && <> Key headwinds include <em>{mktStrongHeadwinds.slice(0, 2).map((d) => d.label).join(" and ")}</em>.</>}
                          {mktStrongTailwinds.length > 0 && <> Supporting factors include <em>{mktStrongTailwinds.slice(0, 2).map((d) => d.label).join(" and ")}</em>.</>}
                          {(() => { const note = kalshiValidationNote(kalshiData, mktTone); return note ? <><br /><br />{note}</> : null; })()}
                        </Typography>

                        {/* Forward outlook table */}
                        {(mktAvg3 != null || mktAvg5 != null || mktAvg10 != null) && (
                          <>
                            <Typography sx={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.07em", mb: 0.75 }}>
                              {scenario.charAt(0).toUpperCase() + scenario.slice(1)} Scenario Outlook
                            </Typography>
                            <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
                              {[
                                { label: "3-Year (2026–28)", avg: mktAvg3 },
                                { label: "5-Year (2026–30)", avg: mktAvg5 },
                                { label: "10-Year (2026–35)", avg: mktAvg10 },
                              ].filter(({ avg }) => avg != null).map(({ label, avg }) => {
                                const ol = outlookLabel(avg);
                                const oc = outlookColor(avg);
                                return (
                                  <Box key={label} sx={{ flex: "1 1 120px", border: `1px solid ${oc}44`, borderRadius: 1, p: 1, minWidth: 110, background: oc + "18" }}>
                                    <Typography sx={{ fontSize: 10, color: C.muted, fontWeight: 600, mb: 0.25 }}>{label}</Typography>
                                    <Typography sx={{ fontSize: 18, fontWeight: 700, color: oc, lineHeight: 1.1 }}>{avg.toFixed(1)}%</Typography>
                                    <Typography sx={{ fontSize: 10, color: C.muted }}>avg HPA/yr</Typography>
                                    <Typography sx={{ fontSize: 10, fontWeight: 700, color: oc, mt: 0.25 }}>{ol}</Typography>
                                  </Box>
                                );
                              })}
                            </Box>
                          </>
                        )}

                        {/* ── Policy Watch callout ── */}
                        {(() => {
                          const prob = policyWatchData
                            ? Math.round((parseFloat(policyWatchData.last_price) || parseFloat(policyWatchData.yes_bid) || 0) * 100)
                            : null;
                          const closeYear = policyWatchData?.close_time
                            ? new Date(policyWatchData.close_time).getFullYear()
                            : null;
                          if (prob === null) return null;
                          const accent = prob >= 60 ? "#f59e0b" : prob >= 40 ? C.muted : C.greenLight;
                          return (
                            <Box sx={{ mt: 1.5, p: 1.5, background: accent + "18", borderRadius: 1, borderLeft: `3px solid ${accent}` }}>
                              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.75 }}>
                                <Typography sx={{ fontSize: 10, fontWeight: 700, color: accent, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                                  ⚠ Policy Watch · Kalshi
                                </Typography>
                                <Typography sx={{ fontSize: 15, fontWeight: 700, color: accent, lineHeight: 1 }}>
                                  {prob}% likely
                                </Typography>
                              </Box>
                              <Typography sx={{ fontSize: 11, fontWeight: 700, color: C.charcoal, mb: 0.5 }}>
                                Will legislation restricting institutional single-family home investment become law this year?
                              </Typography>
                              <Typography sx={{ fontSize: 11, color: C.charcoal, lineHeight: 1.7 }}>
                                Kalshi prediction markets price this at <strong>{prob}% probability</strong> — up sharply from ~38% in early
                                February — making it the single highest-impact legislative risk to near-term home price appreciation.
                                Institutional landlords such as Blackrock and Invitation Homes collectively hold an estimated 500k–1M+
                                single-family homes. A forced divestiture would create a significant inventory surge in investor-heavy
                                markets like Atlanta, Phoenix, Dallas, and Charlotte, putting direct downward pressure on HPA in those
                                MSAs in the near term.
                              </Typography>
                              <Box sx={{ mt: 1, pt: 1, borderTop: `1px solid ${accent}33` }}>
                                <Typography sx={{ fontSize: 10, fontWeight: 700, color: accent, textTransform: "uppercase", letterSpacing: "0.07em", mb: 0.5 }}>
                                  American Pledge Opportunity
                                </Typography>
                                <Typography sx={{ fontSize: 11, color: C.charcoal, lineHeight: 1.7 }}>
                                  A legislated exit creates a rare structural opportunity for the American Pledge model. Rather than
                                  flooding the market with distressed inventory, institutional holders could convert their tenant base
                                  directly into buyers — funding the required <strong>20% down payment</strong> through the AmPledge
                                  structure as a condition of sale. This approach preserves asset value for the seller, avoids a
                                  market-wide price shock, and positions AmPledge as the <strong>infrastructure for a national
                                  housing ownership transition</strong>. The higher the probability climbs, the more urgently
                                  institutional partners should be engaged before they lose negotiating leverage.
                                </Typography>
                              </Box>
                              {closeYear && (
                                <Typography sx={{ fontSize: 10, color: C.muted, mt: 0.75, fontStyle: "italic" }}>
                                  Via Kalshi · KXHFHOUSING-27 · resolves Dec 31, {closeYear}
                                </Typography>
                              )}
                            </Box>
                          );
                        })()}
                      </CardContent>
                    </Card>

                    {/* ── Prediction Market Signals (Kalshi) ── */}
                    <Card elevation={0} sx={{ border: `1px solid ${C.border}`, borderRadius: 1 }}>
                        <CardContent sx={{ pb: "12px !important" }}>
                          <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start", mb: 1.5 }}>
                            <img src={kalshiLogo} alt="Kalshi" style={{ height: 18, width: "auto", marginBottom: 6, filter: "brightness(0) saturate(100%) invert(58%) sepia(61%) saturate(428%) hue-rotate(113deg) brightness(96%) contrast(91%)" }} />
                          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                            <SectionHeader title="Prediction Market Signals" sub="Market-implied consensus from Kalshi · next data release" />
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                              {kalshiData?.fetched_at && (
                                <Typography sx={{ fontSize: 10, color: C.muted, fontStyle: "italic" }}>
                                  Updated {new Date(kalshiData.fetched_at).toLocaleTimeString()}
                                </Typography>
                              )}
                              <button onClick={refreshKalshi} disabled={kalshiLoading} title="Refresh market data" style={{ background: kalshiLoading ? "#2aa882" : "#35bd98", border: "none", borderRadius: 4, cursor: kalshiLoading ? "not-allowed" : "pointer", padding: "3px 9px", fontSize: 11, fontWeight: 600, color: "#fff", fontFamily: "'Inter',sans-serif", letterSpacing: "0.03em", display: "flex", alignItems: "center", gap: 4, opacity: kalshiLoading ? 0.8 : 1 }}>
                                <span style={{ display: "inline-block", animation: kalshiLoading ? "kalshi-spin 0.8s linear infinite" : "none" }}>⟳</span>
                                {kalshiLoading ? "Loading..." : "Refresh"}
                                <style>{`@keyframes kalshi-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
                              </button>
                            </Box>
                          </Box>
                          </Box>
                          <Box sx={{ mb: 1.5, p: 1.25, background: C.navy + "08", borderRadius: 1, borderLeft: `3px solid ${C.greenLight}` }}>
                            <Typography sx={{ fontSize: 11, color: C.charcoal, lineHeight: 1.65 }}>
                              <strong>Kalshi</strong> is a regulated U.S. prediction market exchange where participants trade contracts on real-world outcomes — including economic indicators, Fed decisions, and housing metrics.
                              {" "}Unlike surveys or analyst forecasts, Kalshi prices reflect <strong>actual money at risk</strong>: traders profit only when they're right, creating a powerful incentive for accuracy.
                              {" "}Academic research consistently shows prediction markets outperform traditional forecasting models, especially near data release dates when informed participants concentrate.
                              {" "}The values below represent the <strong>market-implied median</strong> for each metric — the threshold where the crowd collectively assigns a 50/50 probability — providing an independent, real-time cross-check on the outlook above.
                            </Typography>
                          </Box>
                          {kalshiError && (
                            <Typography sx={{ fontSize: 11, color: "#e57373" }}>
                              Unable to load prediction market data: {kalshiError}
                            </Typography>
                          )}
                          {!kalshiData && !kalshiError && (
                            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
                              {Object.keys(KALSHI_SERIES_META).map((series) => (
                                <Box key={series} sx={{ flex: "1 1 140px", minWidth: 130, border: `1px solid ${C.border}`, borderRadius: 1, p: 1 }}>
                                  <Skeleton variant="text" width="70%" height={14} sx={{ mb: 0.5 }} />
                                  <Skeleton variant="text" width="50%" height={28} sx={{ mb: 0.25 }} />
                                  <Skeleton variant="text" width="60%" height={12} />
                                  <Skeleton variant="text" width="80%" height={10} />
                                </Box>
                              ))}
                            </Box>
                          )}
                          {kalshiData?.series && (() => {
                            const tiles = Object.entries(KALSHI_SERIES_META).map(([series, meta]) => {
                              const markets = kalshiData.series[series]?.markets ?? [];
                              const medianResult = kalshiMedian(markets);
                              const closeDate = medianResult?.closeDate
                                ? new Date(medianResult.closeDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                                : null;
                              return { series, meta, median: medianResult, closeDate, count: markets.length };
                            });
                            return (
                              <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
                                {tiles.map(({ series, meta, median: m, closeDate, count }) => {
                                  const sig = m != null && meta.housingSignal ? meta.housingSignal(m.value) : null;
                                  const sigColor = sig === 1 ? C.greenLight : sig === -1 ? "#e57373" : null;
                                  return (
                                  <Box key={series} sx={{ flex: "1 1 140px", minWidth: 130, border: `1px solid ${sigColor ? sigColor + "55" : C.border}`, borderRadius: 1, p: 1, background: sigColor ? sigColor + "0d" : "transparent" }}>
                                    <Typography sx={{ fontSize: 10, color: C.muted, fontWeight: 600, mb: 0.25 }}>{meta.label}</Typography>
                                    {m != null ? (
                                      <>
                                        <Typography sx={{ fontSize: 20, fontWeight: 700, color: sigColor ?? C.navy, lineHeight: 1.1 }}>
                                          {m.prefix}
                                          {meta.unit === "k"
                                            ? Math.round(m.value) + "k"
                                            : meta.unit === "$k"
                                            ? "$" + Math.round(m.value / 1000) + "k"
                                            : m.value.toFixed(meta.decimals) + meta.unit}
                                        </Typography>
                                        <Typography sx={{ fontSize: 10, color: C.muted }}>
                                          {m.prefix ? "boundary estimate" : "market median"}
                                        </Typography>
                                        {closeDate && (
                                          <Typography sx={{ fontSize: 9, color: C.muted, mt: 0.25, fontStyle: "italic" }}>
                                            closes {closeDate} · {m.cohortCount ?? count} markets
                                          </Typography>
                                        )}
                                      </>
                                    ) : (
                                      <Typography sx={{ fontSize: 12, color: C.muted, fontStyle: "italic" }}>
                                        {count === 0 ? "No open markets" : "Insufficient data"}
                                      </Typography>
                                    )}
                                  </Box>
                                ); })}
                              </Box>
                            );
                          })()}
                          {(() => {
                            if (!kalshiData?.series) return null;
                            const tiles = Object.entries(KALSHI_SERIES_META).map(([series, meta]) => {
                              const markets = kalshiData.series[series]?.markets ?? [];
                              return { series, meta, median: kalshiMedian(markets), count: markets.length };
                            });
                            const summary = kalshiSummary(tiles);
                            return summary ? (
                              <Box sx={{ mt: 1.5, pt: 1.5, borderTop: `1px solid ${C.border}` }}>
                                <Typography sx={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.07em", mb: 0.5 }}>
                                  Market Consensus Summary
                                </Typography>
                                <Typography sx={{ fontSize: 10, color: C.navyDark, lineHeight: 1.65 }}>
                                  {summary}
                                </Typography>
                              </Box>
                            ) : null;
                          })()}
                          <Typography sx={{ fontSize: 10, color: C.muted, mt: 1.25, fontStyle: "italic" }}>
                            Median derived from Kalshi binary market mid-prices (threshold where yes probability ≈ 50%).
                            {" "}Not investment advice. Source: Kalshi.com
                          </Typography>
                        </CardContent>
                      </Card>


                    <Card elevation={0} sx={{ border: `1px solid ${C.border}`, borderRadius: 1 }}>
                      <CardContent>
                        <SectionHeader title="Driver Correlation with Appreciation" sub="Correlation of each metric with annual HPA · selected period" />
                        <Box sx={{ overflowX: "auto" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                            <thead>
                              <tr>
                                {["Variable", "Signal", "Correlation", "Interpretation"].map((h) => (
                                  <th key={h} style={{ padding: "6px 10px", textAlign: "left", color: C.muted, fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {[...driverCorrelations].sort((a, b) => {
                                if (b.signal !== a.signal) return b.signal - a.signal;
                                if (a.signal === -1) return Math.abs(a.r) - Math.abs(b.r);
                                return Math.abs(b.r) - Math.abs(a.r);
                              }).map(({ label, r, interp, signal }, i) => {
                                const absR = Math.abs(r);
                                const rColor = r >= 0 ? C.greenLight : "#e57373";
                                // Signal strength folds in correlation magnitude:
                                // strong = |r| ≥ 0.6, so "Strong Headwind" means both direction AND high predictive weight
                                const isStrong = absR >= 0.6;
                                const sigColor = signal > 0 ? C.greenLight : signal < 0 ? "#e57373" : C.muted;
                                const sigLabel = signal === 0  ? "Neutral"
                                  : signal > 0 ? (isStrong ? "Strong Tailwind"  : "Tailwind")
                                              : (isStrong ? "Strong Headwind" : "Headwind");
                                const sigIcon  = signal > 0 ? "▲" : signal < 0 ? "▼" : "—";
                                return (
                                  <tr key={label} style={{ background: i % 2 === 0 ? "transparent" : C.bg }}>
                                    <td style={{ padding: "7px 10px", color: C.charcoal, fontWeight: 600, whiteSpace: "nowrap" }}>{label}</td>
                                    <td style={{ padding: "7px 10px", whiteSpace: "nowrap" }}>
                                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: sigColor, background: sigColor + "18", border: `1px solid ${sigColor}44`, borderRadius: 4, padding: "2px 7px" }}>
                                        <span style={{ fontSize: 9 }}>{sigIcon}</span>{sigLabel}
                                      </span>
                                    </td>
                                    <td style={{ padding: "7px 10px", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
                                      <span style={{ color: rColor, fontWeight: 700 }}>{r > 0 ? "+" : ""}{r.toFixed(2)}</span>
                                    </td>
                                    <td style={{ padding: "7px 10px", color: C.muted, lineHeight: 1.4 }}>{interp}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </Box>
                      </CardContent>
                    </Card>
                  </Box>}

                  {/* ── Ground Score Data ── */}
                  {chartPane === "neopoli" && <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>

                    {/* US Map — hidden until dataset is larger; infrastructure preserved (react-simple-maps import, mapZoom/mapCenter state, market coordinates) */}

                    {/* Market Summary */}
                    {(() => {
                      const m = NEOPOLI_MARKETS.find(x => x.id === neopoliMarket) || NEOPOLI_MARKETS[0];
                      const tierMeta = NEOPOLI_TIER_META[m.tier] || NEOPOLI_TIER_META.watchlist;
                      // Metric-driven insight generation
                      const dimScores = NEOPOLI_DIMS.map(d => ({ label: d.label, score: m.dims[d.id] ?? 0, weight: d.weight }));
                      const sorted = [...dimScores].sort((a, b) => b.score - a.score);
                      const top3 = sorted.slice(0, 3);
                      const bot3 = sorted.slice(-3).reverse();
                      const strongCount = dimScores.filter(d => d.score >= 70).length;
                      const weakCount   = dimScores.filter(d => d.score < 40).length;
                      const topStr = top3.map(d => `${d.label} (${d.score.toFixed(0)})`).join(", ");
                      const botStr = bot3.filter(d => d.score < 55).map(d => `${d.label} (${d.score.toFixed(0)})`).join(", ");
                      return (
                        <Card elevation={0} sx={{ border: `1px solid ${C.border}`, borderRadius: 1 }}>
                          <CardContent sx={{ pb: "12px !important" }}>
                            <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 1.25, flexWrap: "wrap", gap: 1 }}>
                              <Box sx={{ mb: 2, pb: 1, borderBottom: `2px solid ${C.navy}` }}>
                                <Typography sx={{ fontSize: 11, fontWeight: 800, color: C.navy, textTransform: "uppercase", letterSpacing: "0.09em" }}>{m.name}, {m.state} · Market Summary</Typography>
                                <Typography sx={{ fontSize: 10, color: C.muted, mt: 0.25 }}>
                                  {m.county} · rank #{m.rank} of 15 · composite {m.composite.toFixed(1)} · confidence {m.confidence.toFixed(0)}%
                                </Typography>
                              </Box>
                              <span style={{ fontSize: 10, fontWeight: 700, color: tierMeta.color, background: tierMeta.badgeBg || tierMeta.color + "18", border: `1px solid ${tierMeta.badgeBg ? tierMeta.color + "88" : tierMeta.color + "44"}`, borderRadius: 4, padding: "3px 10px", whiteSpace: "nowrap", alignSelf: "flex-start" }}>{tierMeta.label}</span>
                            </Box>
                            <Typography sx={{ fontSize: 12, color: C.charcoal, lineHeight: 1.7, mb: 1.5 }}>{m.rationale}</Typography>
                            <Box sx={{ pt: 1.25, borderTop: `1px solid ${C.border}`, display: "flex", flexDirection: "column", gap: 0.75 }}>
                              <Typography sx={{ fontSize: 11, color: C.muted, lineHeight: 1.65 }}>
                                <span style={{ fontWeight: 700, color: C.charcoal }}>Score Drivers — </span>
                                {strongCount} of 12 dimensions score above 70. Leading signals are <span style={{ fontWeight: 600, color: C.charcoal }}>{topStr}</span> — reflecting the market's strongest structural advantages. {weakCount > 0 ? <>Primary drag comes from <span style={{ fontWeight: 600, color: C.charcoal }}>{botStr}</span>, {weakCount > 1 ? "the lowest-scoring dimensions" : "the lowest-scoring dimension"} in this market's profile and the primary areas of caution for near-term development planning.</> : <>No dimension scores below 40, indicating a broadly capable market profile with no single structural failure point.</>}
                              </Typography>
                            </Box>
                            <Box sx={{ pt: 1.25, mt: 0.5, borderTop: `1px solid ${C.border}`, display: "flex", gap: 2, flexWrap: "wrap" }}>
                              <Box sx={{ flex: 1, minWidth: 160 }}>
                                <Typography sx={{ fontSize: 10, fontWeight: 700, color: C.green, textTransform: "uppercase", letterSpacing: "0.05em", mb: 0.5 }}>Tailwinds</Typography>
                                {m.strengths.map((s, idx) => <Typography key={idx} sx={{ fontSize: 10, color: C.charcoal, lineHeight: 1.5 }}>· {s}</Typography>)}
                              </Box>
                              <Box sx={{ flex: 1, minWidth: 160 }}>
                                <Typography sx={{ fontSize: 10, fontWeight: 700, color: C.red, textTransform: "uppercase", letterSpacing: "0.05em", mb: 0.5 }}>Headwinds</Typography>
                                {m.constraints.map((cn, idx) => <Typography key={idx} sx={{ fontSize: 10, color: C.charcoal, lineHeight: 1.5 }}>· {cn}</Typography>)}
                              </Box>
                            </Box>
                          </CardContent>
                        </Card>
                      );
                    })()}

                    {/* Dimension Scorecard */}
                    {(() => {
                      const m = NEOPOLI_MARKETS.find(x => x.id === neopoliMarket) || NEOPOLI_MARKETS[0];
                      return (
                        <Card elevation={0} sx={{ border: `1px solid ${C.border}`, borderRadius: 1 }}>
                          <CardContent>
                            <Box sx={{ mb: 1.5, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1 }}>
                              <SectionHeader title="Dimension Scorecard" sub="12 weighted dimensions · scores 0–100" />
                              <button onClick={() => setShowDimDesc(v => !v)} style={{ fontSize: 10, fontWeight: 600, fontFamily: "'Inter',sans-serif", padding: "3px 10px", border: `1px solid ${C.border}`, borderRadius: 4, background: showDimDesc ? C.navy : "transparent", color: showDimDesc ? C.white : C.muted, cursor: "pointer", whiteSpace: "nowrap", flexShrink: 0 }}>
                                {showDimDesc ? "Hide descriptions" : "Show descriptions"}
                              </button>
                            </Box>
                            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                              {NEOPOLI_DIMS.map(dim => {
                                const score = m.dims[dim.id] ?? 0;
                                const barColor = score >= 75 ? C.greenLight : score >= 50 ? C.blue : score >= 25 ? C.orange : C.red;
                                return (
                                  <Box key={dim.id} sx={{ flex: "1 1 200px", minWidth: 0 }}>
                                    <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.25 }}>
                                      <span style={{ fontSize: 10, fontWeight: 600, color: C.charcoal }}>{dim.label}</span>
                                      <span style={{ fontSize: 10, fontWeight: 700, color: barColor }}>{score.toFixed(0)}</span>
                                    </Box>
                                    <Box sx={{ height: 5, background: C.border, borderRadius: 3 }}>
                                      <Box sx={{ width: `${score}%`, height: "100%", background: barColor, borderRadius: 3 }} />
                                    </Box>
                                    <span style={{ fontSize: 9, color: C.muted, display: "block", marginTop: 3 }}>
                                      <span style={{ fontWeight: 700 }}>wt {dim.weight}</span>
                                      {showDimDesc && <> · {dim.desc}</>}
                                    </span>
                                  </Box>
                                );
                              })}
                            </Box>
                          </CardContent>
                        </Card>
                      );
                    })()}

                    {/* ── Supplemental Signals ── */}
                    {(() => {
                      const m = NEOPOLI_MARKETS.find(x => x.id === neopoliMarket) || NEOPOLI_MARKETS[0];
                      const s = GROUND_SCORE_SUPPLEMENTAL[m.id] || {};
                      const allS = Object.values(GROUND_SCORE_SUPPLEMENTAL);

                      // Universe-relative normalization
                      const uniRange = (key) => {
                        const vals = allS.map(x => x[key]).filter(v => v != null);
                        return { min: Math.min(...vals), max: Math.max(...vals) };
                      };
                      const norm = (val, min, max) => max === min ? 50 : Math.round(((val - min) / (max - min)) * 100);

                      // Log-normalize for federal investment (heavy outlier skew)
                      const logNorm = (val, key) => {
                        const logVals = allS.map(x => Math.log((x[key] || 0) + 1));
                        const lMin = Math.min(...logVals), lMax = Math.max(...logVals);
                        return lMax === lMin ? 50 : Math.round(((Math.log(val + 1) - lMin) / (lMax - lMin)) * 100);
                      };

                      const fmtM = (v) => v == null ? "—" : v >= 1000 ? `$${(v/1000).toFixed(1)}B` : `$${v}M`;
                      const { min: app4Min, max: app4Max } = uniRange("app_4yr");
                      const { min: estabMin, max: estabMax } = uniRange("estab");
                      const { min: ozMin, max: ozMax } = uniRange("oz_tracts");
                      const { min: bfMin, max: bfMax } = uniRange("epa_brownfields");

                      // Signal: 2=StrongTailwind 1=Tailwind 0=Neutral -1=Headwind -2=StrongHeadwind
                      // National ZHVI benchmarks (2020–2025-03 and 2023–2025-03)
                      const NAT_4YR = 47; // ~national all-homes ZHVI 4-yr appreciation
                      const NAT_2YR = 9;  // ~national all-homes ZHVI 2-yr appreciation (post rate hike)
                      const { min: app2Min, max: app2Max } = uniRange("app_2yr");

                      const signals = [
                        {
                          label: "4-Yr Appreciation (2020–2025)",
                          val: s.app_4yr != null ? `${s.app_4yr > 0 ? "+" : ""}${s.app_4yr}%` : "—",
                          sub: s.zhvi_latest ? `$${s.zhvi_latest.toLocaleString()} latest · $${s.zhvi_2020?.toLocaleString()} in 2020 · national avg ~+${NAT_4YR}%` : null,
                          // National avg ~47% over this period (pandemic boom lifted all boats).
                          // Above national = market caught the wave — basis compressed. Well above = headwind.
                          // Below national = relative basis better preserved — potential tailwind.
                          signal: s.app_4yr == null ? 0 : s.app_4yr < 0 ? -2 : s.app_4yr < 20 ? 2 : s.app_4yr < NAT_4YR ? 2 : s.app_4yr <= NAT_4YR + 15 ? 0 : -1,
                          barPct: s.app_4yr != null ? norm(s.app_4yr, app4Min, app4Max) : 0,
                          interp: s.app_4yr == null ? "No data." : s.app_4yr < 0 ? "Negative appreciation — demand absent even during the pandemic boom. Entry basis deteriorating." : s.app_4yr < NAT_4YR ? `+${s.app_4yr}% vs. national avg ~+${NAT_4YR}% — below-average run-up; basis better preserved than most markets nationally.` : s.app_4yr <= NAT_4YR + 15 ? `+${s.app_4yr}% vs. national avg ~+${NAT_4YR}% — at or near national pace; this market caught the pandemic wave like most others.` : `+${s.app_4yr}% vs. national avg ~+${NAT_4YR}% — meaningfully above national pace; basis compressed relative to 2020 entry points.`,
                          source: "Zillow ZHVI",
                        },
                        {
                          label: "2-Yr Appreciation (post rate hike)",
                          val: s.app_2yr != null ? `${s.app_2yr > 0 ? "+" : ""}${s.app_2yr}%` : "—",
                          sub: `2023–2025 · national avg ~+${NAT_2YR}% · tests demand durability post-hike`,
                          // Post-hike period strips pandemic distortion. Markets holding appreciation here have durable demand.
                          // Well above national = strong durable demand = tailwind.
                          // Near/below national = demand faded after rates rose = neutral/headwind.
                          // Negative = demand fully reversed = strong headwind.
                          signal: s.app_2yr == null ? 0 : s.app_2yr < 0 ? -2 : s.app_2yr < NAT_2YR - 3 ? -1 : s.app_2yr < NAT_2YR + 8 ? 1 : 2,
                          barPct: s.app_2yr != null ? norm(s.app_2yr, app2Min, app2Max) : 0,
                          interp: s.app_2yr == null ? "No data." : s.app_2yr < 0 ? "Negative post-hike appreciation — demand has fully reversed. Pandemic gains giving back." : s.app_2yr < NAT_2YR ? `+${s.app_2yr}% vs. national avg ~+${NAT_2YR}% post-hike — below national pace; demand momentum faded as rates rose.` : s.app_2yr < NAT_2YR + 8 ? `+${s.app_2yr}% vs. national avg ~+${NAT_2YR}% post-hike — holding above national pace; demand durable despite rate environment.` : `+${s.app_2yr}% vs. national avg ~+${NAT_2YR}% post-hike — well above national pace; strong durable demand signal independent of pandemic distortion.`,
                          source: "Zillow ZHVI",
                        },
                        {
                          label: "Federal Investment (FY24)",
                          val: fmtM(s.usaspending_fy24_m),
                          sub: null,
                          signal: s.usaspending_fy24_m == null ? 0 : s.usaspending_fy24_m < 700 ? -1 : s.usaspending_fy24_m < 2500 ? 1 : 2,
                          barPct: s.usaspending_fy24_m != null ? logNorm(s.usaspending_fy24_m, "usaspending_fy24_m") : 0,
                          interp: s.usaspending_fy24_m == null ? "No data." : s.usaspending_fy24_m < 700 ? "Low federal capital deployment — limited government investment signal in county." : s.usaspending_fy24_m < 2500 ? "Moderate federal investment presence — active capital flow from public programs." : "High federal investment footprint — strong public capital deployment and contracting signal.",
                          source: "USASpending FY2024",
                        },
                        {
                          label: "Opportunity Zone Tracts",
                          val: s.oz_tracts != null ? `${s.oz_tracts} tract${s.oz_tracts !== 1 ? "s" : ""}` : "—",
                          sub: null,
                          signal: s.oz_tracts == null ? 0 : s.oz_tracts === 0 ? -1 : s.oz_tracts <= 5 ? 1 : 2,
                          barPct: s.oz_tracts != null ? norm(s.oz_tracts, ozMin, ozMax) : 0,
                          interp: s.oz_tracts == null ? "No data." : s.oz_tracts === 0 ? "No OZ tracts — federal tax incentive infrastructure absent from this county." : s.oz_tracts <= 5 ? `${s.oz_tracts} OZ tract${s.oz_tracts > 1 ? "s" : ""} — partial incentive coverage; some tax-advantaged capital eligible.` : `${s.oz_tracts} OZ tracts — broad coverage; strong federal tax-advantaged investment infrastructure in place.`,
                          source: "HUD / IRS §1400Z",
                        },
                        {
                          label: "Business Establishments",
                          val: s.estab ? s.estab.toLocaleString() : "—",
                          // National context: avg firm size vs. national ~15; estab count vs. national county scale
                          // Bar = peer-relative (ranks this market within the 15 candidates)
                          // Signal + interp = national context (is this economically substantial nationally?)
                          sub: (() => {
                            const avgFirm = s.estab && s.emp ? Math.round(s.emp / s.estab) : null;
                            const natAvgFirm = 15;
                            return s.estab && s.emp
                              ? `${s.emp.toLocaleString()} employees · avg firm size ${avgFirm} vs. national avg ~${natAvgFirm}`
                              : null;
                          })(),
                          signal: s.estab == null ? 0 : s.estab < 2000 ? -1 : s.estab < 5000 ? 1 : s.estab < 15000 ? 2 : 2,
                          barPct: s.estab != null ? norm(s.estab, estabMin, estabMax) : 0,
                          interp: s.estab == null ? "No data." : (() => {
                            const avgFirm = s.estab && s.emp ? Math.round(s.emp / s.estab) : null;
                            const firmNote = avgFirm ? (avgFirm <= 15 ? " Avg firm size at or below national avg (~15) — diverse small-business economy." : avgFirm <= 22 ? " Avg firm size slightly above national avg (~15) — moderate employer concentration." : " Avg firm size well above national avg (~15) — more concentrated employment base.") : "";
                            return s.estab < 2000
                              ? `Thin business base nationally — fewer than 2,000 establishments is a small economic footprint for a development candidate.${firmNote}`
                              : s.estab < 5000
                              ? `Moderate national footprint — ${s.estab.toLocaleString()} establishments is a workable but modest economic base.${firmNote}`
                              : s.estab < 15000
                              ? `Solid national footprint — ${s.estab.toLocaleString()} establishments indicates a real economic ecosystem with absorption capacity.${firmNote}`
                              : `Large national footprint — ${s.estab.toLocaleString()} establishments places this market among meaningfully sized U.S. county economies.${firmNote}`;
                          })(),
                          source: "Census CBP 2023",
                        },
                        {
                          label: "Brownfield Sites",
                          val: s.epa_brownfields != null ? `${s.epa_brownfields} sites` : "—",
                          sub: null,
                          // Inverted: fewer is better
                          signal: s.epa_brownfields == null ? 0 : s.epa_brownfields <= 10 ? 2 : s.epa_brownfields <= 30 ? 1 : s.epa_brownfields <= 100 ? -1 : -2,
                          barPct: s.epa_brownfields != null ? 100 - norm(s.epa_brownfields, bfMin, bfMax) : 0,
                          interp: s.epa_brownfields == null ? "No data." : s.epa_brownfields <= 10 ? "Low brownfield burden — minimal environmental friction for site development." : s.epa_brownfields <= 30 ? "Moderate brownfield presence — targeted remediation likely in select parcels." : s.epa_brownfields <= 100 ? "Elevated brownfield density — meaningful remediation burden; parcel-level diligence required." : "High brownfield concentration — significant cleanup liability and development friction.",
                          source: "EPA ACRES/FRS",
                        },
                      ];

                      const tailwinds = signals.filter(d => d.signal > 0);
                      const headwinds = signals.filter(d => d.signal < 0);

                      const sigColor = (sig) => sig >= 1 ? C.greenLight : sig <= -1 ? "#e57373" : C.muted;
                      const sigLabel = (sig) => sig === 2 ? "Strong Tailwind" : sig === 1 ? "Tailwind" : sig === 0 ? "Neutral" : sig === -1 ? "Headwind" : "Strong Headwind";
                      const sigIcon  = (sig) => sig > 0 ? "▲" : sig < 0 ? "▼" : "—";

                      return (
                        <Card elevation={0} sx={{ border: `1px solid ${C.border}`, borderRadius: 1 }}>
                          <CardContent sx={{ pb: "12px !important" }}>
                            <SectionHeader title="Supplemental Signals" sub="External data benchmarked against 15-market candidate universe · signal = thesis impact" />
                            <Box sx={{ overflowX: "auto" }}>
                              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                                <thead>
                                  <tr>
                                    {["Signal", "Metric", "Relative Position", "Value", "Interpretation"].map(h => (
                                      <th key={h} style={{ padding: "6px 10px", textAlign: "left", color: C.muted, fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>{h}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {signals.map((d, i) => {
                                    const sc = sigColor(d.signal);
                                    return (
                                      <tr key={d.label} style={{ background: i % 2 === 0 ? "transparent" : C.bg, borderBottom: `1px solid ${C.border}` }}>
                                        <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>
                                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: sc, background: sc + "18", border: `1px solid ${sc}44`, borderRadius: 4, padding: "2px 7px" }}>
                                            <span style={{ fontSize: 9 }}>{sigIcon(d.signal)}</span>{sigLabel(d.signal)}
                                          </span>
                                        </td>
                                        <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>
                                          <span style={{ fontWeight: 600, color: C.charcoal, fontSize: 11 }}>{d.label}</span>
                                          {d.sub && <><br /><span style={{ fontSize: 9, color: C.muted }}>{d.sub}</span></>}
                                        </td>
                                        <td style={{ padding: "8px 10px", minWidth: 110 }}>
                                          <Box sx={{ height: 6, background: C.border, borderRadius: 3, width: "100%", minWidth: 90 }}>
                                            <Box sx={{ width: `${d.barPct}%`, height: "100%", background: sc, borderRadius: 3, transition: "width 0.3s" }} />
                                          </Box>
                                        </td>
                                        <td style={{ padding: "8px 10px", fontWeight: 700, color: sc, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums", fontSize: 12 }}>{d.val}</td>
                                        <td style={{ padding: "8px 10px", color: C.muted, lineHeight: 1.45, fontSize: 11 }}>{d.interp}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </Box>
                            <Box sx={{ pt: 1.5, mt: 1, borderTop: `1px solid ${C.border}` }}>
                              <Typography sx={{ fontSize: 9, color: C.muted, lineHeight: 1.7, letterSpacing: "0.02em" }}>
                                <span style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Data Sources — </span>
                                <span style={{ fontWeight: 600 }}>Composite &amp; Dimension Scores:</span> Deterministic Ground Score screening run 2026-03-27 · U.S. Census Bureau QuickFacts · BLS · DOE · official public sources · scoring mode: universe-relative (0–100 within evaluated set, not national percentile).{" "}
                                <span style={{ fontWeight: 600 }}>Home Value Trajectory:</span> Zillow ZHVI · SF &amp; condo · smoothed, seasonally adjusted · county · vintage 2025-03.{" "}
                                <span style={{ fontWeight: 600 }}>Federal Investment:</span> USASpending.gov · FY2024 · contracts &amp; grants · place of performance · county.{" "}
                                <span style={{ fontWeight: 600 }}>Opportunity Zones:</span> HUD / IRS §1400Z · designated QOZ census tracts · 2018 · via HUD ArcGIS.{" "}
                                <span style={{ fontWeight: 600 }}>Business Base:</span> Census CBP 2023 · all industries · private sector.{" "}
                                <span style={{ fontWeight: 600 }}>Environmental Context:</span> EPA FRS / ACRES · brownfield assessment &amp; cleanup sites · county.{" "}
                                Composite scores are fixed and are <span style={{ fontStyle: "italic" }}>not</span> recalculated from supplemental data. Supplemental signals are informational context only. Relative Position bar shows this market's position within the 15-market candidate universe. Signal and interpretation reference national benchmarks where noted in the sub-label.
                              </Typography>
                            </Box>
                          </CardContent>
                        </Card>
                      );
                    })()}

                  </Box>}

                  {/* ── Opportunity Urban Signals Pane ── */}
                  {chartPane === "opportunity" && <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>

                    {/* Market Summary */}
                    {(() => {
                      const m = NEOPOLI_MARKETS.find(x => x.id === neopoliMarket) || NEOPOLI_MARKETS[0];
                      const opp = OPPORTUNITY_SCORES[m.id] || { composite: 0, confidence: 0, tier: "deprioritized", dims: {} };
                      const tierMeta = NEOPOLI_TIER_META[opp.tier] || NEOPOLI_TIER_META.deprioritized;
                      const dimScores = OPPORTUNITY_DIMS.map(d => ({ label: d.label, score: opp.dims[d.id] ?? 0, weight: d.weight }));
                      const sorted = [...dimScores].sort((a, b) => b.score - a.score);
                      const top3 = sorted.slice(0, 3);
                      const bot3 = sorted.slice(-3).reverse();
                      const oppRank = [...NEOPOLI_MARKETS].sort((a, b) => (OPPORTUNITY_SCORES[b.id]?.composite || 0) - (OPPORTUNITY_SCORES[a.id]?.composite || 0)).findIndex(x => x.id === m.id) + 1;
                      const topStr = top3.map(d => `${d.label} (${d.score.toFixed(0)})`).join(", ");
                      const botStr = bot3.map(d => `${d.label} (${d.score.toFixed(0)})`).join(", ");
                      return (
                        <Card elevation={0} sx={{ border: `1px solid ${C.border}`, borderRadius: 1 }}>
                          <CardContent sx={{ pb: "12px !important" }}>
                            <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 1.25, flexWrap: "wrap", gap: 1 }}>
                              <Box sx={{ mb: 2, pb: 1, borderBottom: `2px solid ${C.navy}` }}>
                                <Typography sx={{ fontSize: 11, fontWeight: 800, color: C.navy, textTransform: "uppercase", letterSpacing: "0.09em" }}>{m.name}, {m.state} · Opportunity Assessment</Typography>
                                <Typography sx={{ fontSize: 10, color: C.muted, mt: 0.25 }}>
                                  {m.county} · opportunity rank #{oppRank} of 15 · opportunity score {opp.composite.toFixed(1)} · confidence {opp.confidence.toFixed(0)}%
                                </Typography>
                              </Box>
                              <span style={{ fontSize: 10, fontWeight: 700, color: tierMeta.color, background: tierMeta.badgeBg || tierMeta.color + "18", border: `1px solid ${tierMeta.badgeBg ? tierMeta.color + "88" : tierMeta.color + "44"}`, borderRadius: 4, padding: "3px 10px", whiteSpace: "nowrap", alignSelf: "flex-start" }}>{tierMeta.label}</span>
                            </Box>
                            <Typography sx={{ fontSize: 12, color: C.charcoal, lineHeight: 1.7, mb: 1.5 }}>
                              {m.name} is a Contrarian Urban Signals candidate evaluated here against master-planned community development criteria. With an Opportunity Score of {opp.composite.toFixed(1)}, it ranks {oppRank} of 15 in this universe — all of which are expected to score poorly, as the current candidate set was selected for distressed-market activation, not greenfield development. This comparison serves as a baseline and validates thesis separation between the two strategies.
                            </Typography>
                            <Box sx={{ pt: 1.25, borderTop: `1px solid ${C.border}`, display: "flex", flexDirection: "column", gap: 0.75 }}>
                              <Typography sx={{ fontSize: 11, color: C.muted, lineHeight: 1.65 }}>
                                <span style={{ fontWeight: 700, color: C.charcoal }}>Relative Strengths — </span>{topStr}
                              </Typography>
                              <Typography sx={{ fontSize: 11, color: C.muted, lineHeight: 1.65 }}>
                                <span style={{ fontWeight: 700, color: C.charcoal }}>Primary Limitations — </span>{botStr}
                              </Typography>
                            </Box>
                          </CardContent>
                        </Card>
                      );
                    })()}

                    {/* Dimension Scorecard */}
                    {(() => {
                      const m = NEOPOLI_MARKETS.find(x => x.id === neopoliMarket) || NEOPOLI_MARKETS[0];
                      const opp = OPPORTUNITY_SCORES[m.id] || { composite: 0, confidence: 0, tier: "deprioritized", dims: {} };
                      const tierMeta = NEOPOLI_TIER_META[opp.tier] || NEOPOLI_TIER_META.deprioritized;
                      return (
                        <Card elevation={0} sx={{ border: `1px solid ${C.border}`, borderRadius: 1 }}>
                          <CardContent sx={{ pb: "12px !important" }}>
                            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5, flexWrap: "wrap", gap: 1 }}>
                              <SectionHeader title="Opportunity Dimension Scorecard" sub="12 MPD site-selection dimensions · scored within 15-market universe" />
                              <button onClick={() => setShowDimDesc(v => !v)} style={{ fontSize: 10, color: C.muted, background: "none", border: `1px solid ${C.border}`, borderRadius: 4, padding: "3px 9px", cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>{showDimDesc ? "Hide descriptions" : "Show descriptions"}</button>
                            </Box>
                            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                              {OPPORTUNITY_DIMS.map(dim => {
                                const score = opp.dims[dim.id] ?? 0;
                                const barColor = score >= 65 ? C.greenLight : score >= 40 ? C.blue : "#e57373";
                                return (
                                  <Box key={dim.id}>
                                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.3 }}>
                                      <Typography sx={{ fontSize: 11, fontWeight: 600, color: C.charcoal }}>{dim.label}</Typography>
                                      <Typography sx={{ fontSize: 11, fontWeight: 700, color: barColor }}>{score.toFixed(0)}</Typography>
                                    </Box>
                                    <Box sx={{ height: 6, background: C.border, borderRadius: 3 }}>
                                      <Box sx={{ width: `${score}%`, height: "100%", background: barColor, borderRadius: 3, transition: "width 0.3s" }} />
                                    </Box>
                                    <span style={{ fontSize: 9, color: C.muted, display: "block", marginTop: 3 }}><span style={{ fontWeight: 700 }}>wt {dim.weight}</span>{showDimDesc && <> · {dim.desc}</>}</span>
                                  </Box>
                                );
                              })}
                            </Box>
                            <Box sx={{ mt: 2, pt: 1.5, borderTop: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                              <Typography sx={{ fontSize: 11, color: C.muted }}>Opportunity Score</Typography>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                                <Box sx={{ width: 120, height: 8, background: C.border, borderRadius: 4 }}>
                                  <Box sx={{ width: `${opp.composite}%`, height: "100%", background: tierMeta.barColor, borderRadius: 4 }} />
                                </Box>
                                <Typography sx={{ fontSize: 14, fontWeight: 800, color: C.navy }}>{opp.composite.toFixed(1)}</Typography>
                                <span style={{ fontSize: 10, fontWeight: 700, color: tierMeta.color, background: tierMeta.badgeBg || tierMeta.color + "18", border: `1px solid ${tierMeta.badgeBg ? tierMeta.color + "88" : tierMeta.color + "44"}`, borderRadius: 4, padding: "2px 8px" }}>{tierMeta.label}</span>
                              </Box>
                            </Box>
                          </CardContent>
                        </Card>
                      );
                    })()}

                    {/* Supplemental Signals */}
                    {(() => {
                      const m = NEOPOLI_MARKETS.find(x => x.id === neopoliMarket) || NEOPOLI_MARKETS[0];
                      const s = OPPORTUNITY_SUPPLEMENTAL[m.id] || {};
                      const allS = Object.values(OPPORTUNITY_SUPPLEMENTAL);
                      const norm = (v, arr) => { const mn = Math.min(...arr), mx = Math.max(...arr); return mx === mn ? 50 : Math.round(((v - mn) / (mx - mn)) * 100); };
                      const driveArr = allS.map(x => x.metro_drive_min);
                      const popArr   = allS.map(x => x.county_pop_growth_5yr);
                      const hhiArr   = allS.map(x => x.median_hhi);
                      const schoolArr= allS.map(x => x.school_rating);
                      const landArr  = allS.map(x => x.land_price_acre);
                      const permitArr= allS.map(x => x.permits_per_1k);

                      const driveSignal = s.metro_drive_min == null ? 0 : s.metro_drive_min <= 30 ? 2 : s.metro_drive_min <= 60 ? 1 : s.metro_drive_min <= 90 ? 0 : s.metro_drive_min <= 120 ? -1 : -2;
                      const popSignal   = s.county_pop_growth_5yr == null ? 0 : s.county_pop_growth_5yr >= 10 ? 2 : s.county_pop_growth_5yr >= 5 ? 1 : s.county_pop_growth_5yr >= 0 ? 0 : s.county_pop_growth_5yr >= -3 ? -1 : -2;
                      const hhiSignal   = s.median_hhi == null ? 0 : s.median_hhi >= 80000 ? 2 : s.median_hhi >= 65000 ? 1 : s.median_hhi >= 50000 ? 0 : s.median_hhi >= 40000 ? -1 : -2;
                      const schoolSignal= s.school_rating == null ? 0 : s.school_rating >= 8 ? 2 : s.school_rating >= 6 ? 1 : s.school_rating >= 4 ? 0 : s.school_rating >= 2 ? -1 : -2;
                      const landSignal  = s.land_price_acre == null ? 0 : s.land_price_acre <= 8000 ? 2 : s.land_price_acre <= 15000 ? 1 : s.land_price_acre <= 25000 ? 0 : s.land_price_acre <= 40000 ? -1 : -2;
                      const permitSignal= s.permits_per_1k == null ? 0 : s.permits_per_1k >= 15 ? 2 : s.permits_per_1k >= 10 ? 1 : s.permits_per_1k >= 5 ? 0 : s.permits_per_1k >= 2 ? -1 : -2;

                      const signals = [
                        { label: "Metro Drive Time", sub: "minutes to nearest major employment center", val: s.metro_drive_min != null ? `${s.metro_drive_min === 0 ? "N/A (is metro)" : s.metro_drive_min + " min"}` : "—", signal: driveSignal, barPct: s.metro_drive_min != null ? 100 - norm(s.metro_drive_min, driveArr) : 0, interp: s.metro_drive_min == null ? "No data." : s.metro_drive_min === 0 ? "Market is itself a mid-size metro — no commute to a larger center applies. Standalone demand dynamics." : s.metro_drive_min <= 30 ? "Excellent metro proximity — households can commute daily to a major job center, the primary driver of MPD demand." : s.metro_drive_min <= 60 ? "Acceptable commute range — within the typical household tolerance for suburban relocation." : s.metro_drive_min <= 90 ? "Marginal commute range — demand depends on remote-work prevalence and strong lifestyle differentiators." : "Too distant from major employment — household demand for an MPD here would be speculative without a local job anchor.", source: "Estimated driving distance" },
                        { label: "County Pop. Growth", sub: "5-year change · MPD demand signal", val: s.county_pop_growth_5yr != null ? `${s.county_pop_growth_5yr > 0 ? "+" : ""}${s.county_pop_growth_5yr.toFixed(1)}%` : "—", signal: popSignal, barPct: s.county_pop_growth_5yr != null ? norm(s.county_pop_growth_5yr, popArr) : 0, interp: s.county_pop_growth_5yr == null ? "No data." : s.county_pop_growth_5yr >= 10 ? "Strong confirmed in-migration — the county is an established growth destination, ideal for MPD absorption." : s.county_pop_growth_5yr >= 5 ? "Positive growth trajectory — meaningful demand pipeline building in the region." : s.county_pop_growth_5yr >= 0 ? "Flat to modest growth — demand is not contracting but lacks the momentum to absorb significant new inventory quickly." : s.county_pop_growth_5yr >= -3 ? "Moderate population decline — headwind for MPD absorption; speculative without a specific demand catalyst." : "Significant population decline — a master-planned community here would face severe absorption risk.", source: "U.S. Census Bureau estimates" },
                        { label: "Median Household Income", sub: "buyer qualification proxy", val: s.median_hhi != null ? `$${(s.median_hhi / 1000).toFixed(0)}k` : "—", signal: hhiSignal, barPct: s.median_hhi != null ? norm(s.median_hhi, hhiArr) : 0, interp: s.median_hhi == null ? "No data." : s.median_hhi >= 80000 ? "Strong income base — households can qualify for new construction pricing; supports premium product positioning." : s.median_hhi >= 65000 ? "Adequate income base — supports mid-market new home pricing with manageable qualification risk." : s.median_hhi >= 50000 ? "Moderate income — constrains new home pricing; would require entry-level or workforce product focus." : s.median_hhi >= 40000 ? "Below-average income — significant qualification headwind for new construction; affordability risk is real." : "Low income base — new home pricing would exceed local qualification capacity; demand must rely on in-migrating households.", source: "U.S. Census Bureau ACS" },
                        { label: "School District Rating", sub: "GreatSchools-style composite (0–10)", val: s.school_rating != null ? `${s.school_rating.toFixed(1)} / 10` : "—", signal: schoolSignal, barPct: s.school_rating != null ? norm(s.school_rating, schoolArr) : 0, interp: s.school_rating == null ? "No data." : s.school_rating >= 8 ? "High-quality district — a primary draw for family households; supports premium home pricing and fast absorption." : s.school_rating >= 6 ? "Above-average district — competitive enough to attract family buyers; a real positive for community positioning." : s.school_rating >= 4 ? "Average district — not a barrier but also not a draw; community branding must rely on other lifestyle factors." : s.school_rating >= 2 ? "Below-average district — a meaningful negative for family household targeting; would limit buyer profile." : "Poor district quality — a significant headwind for family-targeted MPD positioning; school investment required.", source: "GreatSchools / state assessments" },
                        { label: "Fringe Land Price", sub: "estimated $/acre at urban edge", val: s.land_price_acre != null ? `$${(s.land_price_acre / 1000).toFixed(0)}k/ac` : "—", signal: landSignal, barPct: s.land_price_acre != null ? 100 - norm(s.land_price_acre, landArr) : 0, interp: s.land_price_acre == null ? "No data." : s.land_price_acre <= 8000 ? "Very low land cost — strong basis advantage for MPD; minimal land carry before development." : s.land_price_acre <= 15000 ? "Affordable land — supportive MPD economics; acquisition at scale is viable without heavy capital drag." : s.land_price_acre <= 25000 ? "Moderate land cost — manageable for a well-capitalized developer; watch for cost creep at scale." : s.land_price_acre <= 40000 ? "Elevated land cost — puts pressure on lot pricing and margin; requires strong absorption rates to underwrite." : "High land cost — a significant headwind for MPD economics at scale; limits return profile.", source: "Estimated market comps" },
                        { label: "Permit Activity", sub: "residential permits per 1,000 residents (annualized)", val: s.permits_per_1k != null ? `${s.permits_per_1k.toFixed(1)} / 1k` : "—", signal: permitSignal, barPct: s.permits_per_1k != null ? norm(s.permits_per_1k, permitArr) : 0, interp: s.permits_per_1k == null ? "No data." : s.permits_per_1k >= 15 ? "Very high permit velocity — proven construction demand; existing market absorbs new supply effectively." : s.permits_per_1k >= 10 ? "Strong permit activity — active development market with demonstrated absorption capacity." : s.permits_per_1k >= 5 ? "Moderate permit activity — market supports some new construction but is not a high-growth corridor." : s.permits_per_1k >= 2 ? "Low permit activity — limited organic demand signal; an MPD would be swimming against the current." : "Very low permits — construction market is dormant; demand does not support new community development.", source: "Census Bureau Building Permits Survey" },
                      ];

                      const sigColor = (sig) => sig >= 1 ? C.greenLight : sig <= -1 ? "#e57373" : C.muted;
                      const sigLabel = (sig) => sig === 2 ? "Strong Tailwind" : sig === 1 ? "Tailwind" : sig === 0 ? "Neutral" : sig === -1 ? "Headwind" : "Strong Headwind";
                      const sigIcon  = (sig) => sig > 0 ? "▲" : sig < 0 ? "▼" : "—";

                      return (
                        <Card elevation={0} sx={{ border: `1px solid ${C.border}`, borderRadius: 1 }}>
                          <CardContent sx={{ pb: "12px !important" }}>
                            <SectionHeader title="Supplemental Signals" sub="MPD site-selection indicators · signal = development thesis impact" />
                            <Box sx={{ overflowX: "auto" }}>
                              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                                <thead>
                                  <tr>
                                    {["Signal", "Metric", "Relative Position", "Value", "Interpretation"].map(h => (
                                      <th key={h} style={{ padding: "6px 10px", textAlign: "left", color: C.muted, fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>{h}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {signals.map((d, i) => {
                                    const sc = sigColor(d.signal);
                                    return (
                                      <tr key={d.label} style={{ background: i % 2 === 0 ? "transparent" : C.bg, borderBottom: `1px solid ${C.border}` }}>
                                        <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>
                                          <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: sc, background: sc + "18", border: `1px solid ${sc}44`, borderRadius: 4, padding: "2px 7px" }}>
                                            <span style={{ fontSize: 9 }}>{sigIcon(d.signal)}</span>{sigLabel(d.signal)}
                                          </span>
                                        </td>
                                        <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>
                                          <span style={{ fontWeight: 600, color: C.charcoal, fontSize: 11 }}>{d.label}</span>
                                          {d.sub && <><br /><span style={{ fontSize: 9, color: C.muted }}>{d.sub}</span></>}
                                        </td>
                                        <td style={{ padding: "8px 10px", minWidth: 110 }}>
                                          <Box sx={{ height: 6, background: C.border, borderRadius: 3, width: "100%", minWidth: 90 }}>
                                            <Box sx={{ width: `${d.barPct}%`, height: "100%", background: sc, borderRadius: 3, transition: "width 0.3s" }} />
                                          </Box>
                                        </td>
                                        <td style={{ padding: "8px 10px", fontWeight: 700, color: sc, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums", fontSize: 12 }}>{d.val}</td>
                                        <td style={{ padding: "8px 10px", color: C.muted, lineHeight: 1.45, fontSize: 11 }}>{d.interp}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </Box>
                            <Box sx={{ pt: 1.5, mt: 1, borderTop: `1px solid ${C.border}` }}>
                              <Typography sx={{ fontSize: 9, color: C.muted, lineHeight: 1.7, letterSpacing: "0.02em" }}>
                                <span style={{ fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Data Sources — </span>
                                <span style={{ fontWeight: 600 }}>Opportunity Scores:</span> Deterministic scoring run 2026-03-28 · same 15-market universe as Contrarian tab · scored against MPD site-selection criteria.{" "}
                                <span style={{ fontWeight: 600 }}>Metro Drive Time:</span> Estimated driving distance to nearest major employment center.{" "}
                                <span style={{ fontWeight: 600 }}>Population Growth:</span> U.S. Census Bureau county population estimates · 5-year change.{" "}
                                <span style={{ fontWeight: 600 }}>Household Income:</span> U.S. Census Bureau ACS · median household income.{" "}
                                <span style={{ fontWeight: 600 }}>School Rating:</span> GreatSchools composite / state assessment data.{" "}
                                <span style={{ fontWeight: 600 }}>Land Price:</span> Estimated market comps for vacant/agricultural fringe land.{" "}
                                <span style={{ fontWeight: 600 }}>Permits:</span> Census Bureau Building Permits Survey · annualized per 1,000 residents. Scores are universe-relative (0–100 within evaluated set). All 15 markets are expected to score poorly — this view serves as a baseline until dedicated Opportunity candidates are added.
                              </Typography>
                            </Box>
                          </CardContent>
                        </Card>
                      );
                    })()}

                  </Box>}

                </Box>
              </Box>

              {/* KPI stat cards — pinned to bottom of left column */}
              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                <StatCard
                  label="Avg IRR"
                  value={fmtPct(ampSt.avg)}
                  sub="AmPledge annualized"
                  accent={ampSt.avg >= 0 ? C.greenLight : C.red}
                />
                <StatCard
                  label="Total Return"
                  value={fmtPct(ampSt.total, 0)}
                  sub={`${n}-yr cumulative`}
                  accent={ampSt.total >= 0 ? C.greenLight : C.red}
                />
                <StatCard
                  label="Sharpe"
                  value={ampSt.sharpe.toFixed(2)}
                  sub="Risk-free 2.0%"
                  accent={ampSt.sharpe >= 1 ? C.greenLight : C.orange}
                />
                <StatCard
                  label="Volatility"
                  value={ampSt.vol.toFixed(1) + "%"}
                  sub="Std dev of returns"
                  accent={C.blue}
                />
                <StatCard
                  label="vs S&P 500"
                  value={fmtPct(ampSt.avg - spSt.avg)}
                  sub="Avg annual alpha"
                  accent={ampSt.avg >= spSt.avg ? C.greenLight : C.red}
                />
                <StatCard
                  label="vs Bonds"
                  value={fmtPct(ampSt.avg - bndSt.avg)}
                  sub="Avg annual spread"
                  accent={ampSt.avg >= bndSt.avg ? C.greenLight : C.red}
                />
                <StatCard
                  label="vs VNQ"
                  value={fmtPct(ampSt.avg - vnqSt.avg)}
                  sub="vs Real Estate ETF"
                  accent={ampSt.avg >= vnqSt.avg ? C.greenLight : C.red}
                />
              </Box>
            </Box>
            {/* end left flex column */}
          </Grid>
        </Grid>
        {/* end main two-column section */}

        {/* ── Historical Modeling Table ───────────────────────────── */}
        <Card
          elevation={0}
          sx={{ border: `1px solid ${C.border}`, borderRadius: 1, mb: 3 }}
        >
          <CardContent>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                flexWrap: "wrap",
                gap: 1,
                mb: 1.5,
              }}
            >
              <SectionHeader
                title="Historical Modeling Table"
                sub="Portfolio simulation · Starting capital $80,000 · AmPledge cap schedule · Fees yrs 1–5: $900 (HPA ≥ 1%, $900 accrues) or $1,800 (HPA < 1%, $0 accrues) · Yr 7 bonus = 50% of accrued dollars"
              />
              <Box
                sx={{
                  display: "flex",
                  gap: 0,
                  border: `1px solid ${C.border}`,
                  borderRadius: 1,
                  overflow: "hidden",
                  flexShrink: 0,
                }}
              >
                {[
                  ["detail", "Portfolio Detail"],
                  ["benchmark", "Benchmark Comparison"],
                  ["housing", "Housing Market"],
                ].map(([v, label]) => (
                  <button
                    key={v}
                    onClick={() => setTableView(v)}
                    style={{
                      padding: "6px 14px",
                      fontSize: 11,
                      fontWeight: 600,
                      fontFamily: "'Inter',sans-serif",
                      border: "none",
                      borderRight:
                        v === "detail" ? `1px solid ${C.border}` : "none",
                      cursor: "pointer",
                      background: tableView === v ? C.navy : C.white,
                      color: tableView === v ? C.white : C.muted,
                      transition: "all 0.15s",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </Box>
            </Box>
            <Box sx={{ overflowX: "auto", overflowY: "auto", maxHeight: 380 }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 12,
                  fontFamily: "'Inter',sans-serif",
                }}
              >
                <thead style={{ position: "sticky", top: 0, zIndex: 1 }}>
                  <tr style={{ background: C.navy }}>
                    {(tableView === "detail"
                      ? [
                          "Year",
                          "Mortgage Rate",
                          "Delinquency",
                          "HPA %",
                          "Starting Capital",
                          "Cap %",
                          "Bonuses",
                          "Annual Return $",
                          "IRR %",
                          "Ending Capital",
                        ]
                      : tableView === "benchmark"
                      ? [
                          "Year",
                          "HPA %",
                          "AMPLEDGE IRR %",
                          "S&P 500",
                          "Bond Index",
                          "VNQ",
                          "AMPLEDGE CAGR",
                          "S&P 500 CAGR",
                          "Bond CAGR",
                          "VNQ CAGR",
                        ]
                      : [
                          "Year",
                          "HPA %",
                          "Fed Funds",
                          "Unemployment",
                          "Mtg Rate",
                          "Delinquency",
                          "Foreclosure",
                          "Mo. Supply",
                          "Permits (k)",
                          "Homeownership",
                        ]
                    ).map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "9px 11px",
                          color: "#c8d8e8",
                          fontWeight: 700,
                          fontSize: 10,
                          textAlign: "right",
                          letterSpacing: "0.04em",
                          borderBottom: `2px solid ${C.navyMid}`,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {displayYears.map((yr, i) => {
                    const r = table.find((row) => row.yr === yr);
                    const isProj = r?.projected || yr > 2025;
                    const bg = isProj
                      ? i % 2 === 0
                        ? "#eef4ff"
                        : "#e4eefa"
                      : i % 2 === 0
                        ? C.white
                        : C.rowAlt;
                    const rc = (v) =>
                      v > 5 ? C.green : v > 0 ? C.charcoal : C.red;
                    const emptyCount = tableView === "housing" ? 9 : 9;
                    if (!r)
                      return (
                        <tr
                          key={yr}
                          style={{
                            background: bg,
                            borderBottom: `1px solid ${C.border}`,
                          }}
                        >
                          <td
                            style={{
                              padding: "8px 11px",
                              fontWeight: 700,
                              color: C.navy,
                            }}
                          >
                            {yr}
                          </td>
                          {Array(emptyCount)
                            .fill(null)
                            .map((_, j) => (
                              <td
                                key={j}
                                style={{
                                  padding: "8px 11px",
                                  textAlign: "right",
                                  color: C.muted,
                                  fontSize: 11,
                                }}
                              >
                                —
                              </td>
                            ))}
                        </tr>
                      );
                    if (tableView === "detail")
                      return (
                        <tr
                          key={yr}
                          style={{
                            background: bg,
                            borderBottom: `1px solid ${C.border}`,
                          }}
                        >
                          <td
                            style={{
                              padding: "8px 11px",
                              fontWeight: 700,
                              color: C.navy,
                              fontVariantNumeric: "tabular-nums",
                              fontStyle: isProj ? "italic" : "normal",
                            }}
                          >
                            {r.yr}
                            {isProj && (
                              <span
                                style={{
                                  marginLeft: 4,
                                  fontSize: 9,
                                  fontWeight: 700,
                                  color: C.white,
                                  background: C.blue,
                                  borderRadius: 3,
                                  padding: "1px 4px",
                                  verticalAlign: "middle",
                                }}
                              >
                                PROJ
                              </span>
                            )}
                          </td>
                          <td
                            style={{
                              padding: "8px 11px",
                              textAlign: "right",
                              color: C.muted,
                            }}
                          >
                            {r.mortgageRate != null
                              ? r.mortgageRate.toFixed(1) + "%"
                              : "—"}
                          </td>
                          <td
                            style={{
                              padding: "8px 11px",
                              textAlign: "right",
                              color: C.muted,
                            }}
                          >
                            {r.delinquencyRate != null
                              ? r.delinquencyRate.toFixed(1) + "%"
                              : "—"}
                          </td>
                          <td
                            style={{
                              padding: "8px 11px",
                              textAlign: "right",
                              color: rc(r.apprec),
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            {r.apprec.toFixed(1)}%
                          </td>
                          <td
                            style={{
                              padding: "8px 11px",
                              textAlign: "right",
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            {fmtUSD(r.starting)}
                          </td>
                          <td
                            style={{
                              padding: "8px 11px",
                              textAlign: "right",
                              color: C.muted,
                            }}
                          >
                            {r.cap.toFixed(1)}%
                          </td>
                          <td
                            style={{
                              padding: "8px 11px",
                              textAlign: "right",
                              color:
                                r.fees + r.bonuses > 0 ? C.greenLight : C.muted,
                            }}
                          >
                            {r.fees + r.bonuses > 0
                              ? fmtUSD(r.fees + r.bonuses)
                              : "—"}
                          </td>
                          <td
                            style={{
                              padding: "8px 11px",
                              textAlign: "right",
                              fontWeight: 600,
                              fontVariantNumeric: "tabular-nums",
                              color: rc(r.annualReturn),
                            }}
                          >
                            {fmtUSD(r.annualReturn)}
                          </td>
                          <td
                            style={{
                              padding: "8px 11px",
                              textAlign: "right",
                              fontWeight: 700,
                              color: rc(r.irr),
                            }}
                          >
                            {fmtSign(r.irr)}
                          </td>
                          <td
                            style={{
                              padding: "8px 11px",
                              textAlign: "right",
                              fontWeight: 600,
                              fontVariantNumeric: "tabular-nums",
                            }}
                          >
                            {fmtUSD(r.ending)}
                          </td>
                        </tr>
                      );
                    if (tableView === "benchmark") return (
                      <tr
                        key={yr}
                        style={{
                          background: bg,
                          borderBottom: `1px solid ${C.border}`,
                        }}
                      >
                        <td
                          style={{
                            padding: "8px 11px",
                            fontWeight: 700,
                            color: C.navy,
                            fontVariantNumeric: "tabular-nums",
                            fontStyle: isProj ? "italic" : "normal",
                          }}
                        >
                          {r.yr}
                          {isProj && (
                            <span
                              style={{
                                marginLeft: 4,
                                fontSize: 9,
                                fontWeight: 700,
                                color: C.white,
                                background: C.blue,
                                borderRadius: 3,
                                padding: "1px 4px",
                                verticalAlign: "middle",
                              }}
                            >
                              PROJ
                            </span>
                          )}
                        </td>
                        <td
                          style={{
                            padding: "8px 11px",
                            textAlign: "right",
                            color: rc(r.apprec),
                          }}
                        >
                          {r.apprec.toFixed(1)}%
                        </td>
                        <td
                          style={{
                            padding: "8px 11px",
                            textAlign: "right",
                            fontWeight: 700,
                            color: rc(r.irr),
                          }}
                        >
                          {fmtSign(r.irr)}
                        </td>
                        <td
                          style={{
                            padding: "8px 11px",
                            textAlign: "right",
                            color: r.sp500 != null ? rc(r.sp500) : C.muted,
                          }}
                        >
                          {r.sp500 != null ? fmtSign(r.sp500) : "—"}
                        </td>
                        <td
                          style={{
                            padding: "8px 11px",
                            textAlign: "right",
                            color:
                              r.bondIndex != null ? rc(r.bondIndex) : C.muted,
                          }}
                        >
                          {r.bondIndex != null ? fmtSign(r.bondIndex) : "—"}
                        </td>
                        <td
                          style={{
                            padding: "8px 11px",
                            textAlign: "right",
                            color: r.vnq != null ? rc(r.vnq) : C.muted,
                          }}
                        >
                          {r.vnq != null ? fmtSign(r.vnq) : "—"}
                        </td>
                        <td
                          style={{
                            padding: "8px 11px",
                            textAlign: "right",
                            fontWeight: 700,
                            color: rc(r.cagr),
                          }}
                        >
                          {fmtSign(r.cagr)}
                        </td>
                        <td
                          style={{
                            padding: "8px 11px",
                            textAlign: "right",
                            color: r.spCagr != null ? rc(r.spCagr) : C.muted,
                          }}
                        >
                          {r.spCagr != null ? fmtSign(r.spCagr) : "—"}
                        </td>
                        <td
                          style={{
                            padding: "8px 11px",
                            textAlign: "right",
                            color: r.bndCagr != null ? rc(r.bndCagr) : C.muted,
                          }}
                        >
                          {r.bndCagr != null ? fmtSign(r.bndCagr) : "—"}
                        </td>
                        <td
                          style={{
                            padding: "8px 11px",
                            textAlign: "right",
                            color: r.vnqCagr != null ? rc(r.vnqCagr) : C.muted,
                          }}
                        >
                          {r.vnqCagr != null ? fmtSign(r.vnqCagr) : "—"}
                        </td>
                      </tr>
                    );
                    // ── Housing Drivers row ──
                    const cell = (val, fmt) => (
                      <td style={{ padding: "8px 11px", textAlign: "right", color: C.muted, fontVariantNumeric: "tabular-nums" }}>
                        {val != null ? fmt(val) : "—"}
                      </td>
                    );
                    return (
                      <tr key={yr} style={{ background: bg, borderBottom: `1px solid ${C.border}` }}>
                        <td style={{ padding: "8px 11px", fontWeight: 700, color: C.navy, fontVariantNumeric: "tabular-nums", fontStyle: isProj ? "italic" : "normal" }}>
                          {r.yr}{isProj && <span style={{ marginLeft: 4, fontSize: 9, fontWeight: 700, color: C.white, background: C.blue, borderRadius: 3, padding: "1px 4px", verticalAlign: "middle" }}>PROJ</span>}
                        </td>
                        {cell(r.apprec, (v) => v.toFixed(1) + "%")}
                        {cell(r.fedFundsRate, (v) => v.toFixed(2) + "%")}
                        {cell(r.unemploymentRate, (v) => v.toFixed(1) + "%")}
                        {cell(r.mortgageRate, (v) => v.toFixed(1) + "%")}
                        {cell(r.delinquencyRate, (v) => v.toFixed(1) + "%")}
                        {cell(r.foreclosureRate, (v) => v.toFixed(1) + "%")}
                        {cell(r.monthsOfSupply, (v) => v.toFixed(1))}
                        {cell(r.buildingPermits, (v) => v.toLocaleString())}
                        {cell(r.homeownershipRate, (v) => v.toFixed(1) + "%")}
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr
                    style={{
                      background: "#e2e9f3",
                      borderTop: `2px solid ${C.navy}`,
                    }}
                  >
                    {(() => {
                      const last =
                        table.length > 0 ? table[table.length - 1] : null;
                      const fs = {
                        padding: "9px 11px",
                        textAlign: "right",
                        fontSize: 11,
                      };
                      if (tableView === "detail")
                        return (
                          <>
                            <td
                              style={{
                                ...fs,
                                fontWeight: 800,
                                color: C.navy,
                                textAlign: "left",
                              }}
                            >
                              AVG / TOTAL
                            </td>
                            <td style={{ ...fs, color: C.muted }}>
                              {mrgAvg.toFixed(1)}%
                            </td>
                            <td style={{ ...fs, color: C.muted }}>
                              {delAvg.toFixed(1)}%
                            </td>
                            <td style={{ ...fs, fontWeight: 600 }}>
                              {hpaAvg.toFixed(1)}%
                            </td>
                            <td style={{ ...fs, color: C.muted }}>—</td>
                            <td style={{ ...fs, color: C.muted }}>—</td>
                            <td
                              style={{
                                ...fs,
                                color: C.greenLight,
                                fontWeight: 600,
                              }}
                            >
                              {fmtUSD(totalFees + totalBon)}
                            </td>
                            <td
                              style={{
                                ...fs,
                                fontWeight: 800,
                                color: C.greenLight,
                              }}
                            >
                              {fmtUSD(
                                table.reduce((s, r) => s + r.annualReturn, 0),
                              )}
                            </td>
                            <td
                              style={{
                                ...fs,
                                fontWeight: 800,
                                color: C.greenLight,
                              }}
                            >
                              {fmtSign(ampSt.avg)}
                            </td>
                            <td style={{ ...fs, fontWeight: 800 }}>
                              {fmtUSD(finalEnd)}
                            </td>
                          </>
                        );
                      return (
                        <>
                          <td
                            style={{
                              ...fs,
                              fontWeight: 800,
                              color: C.navy,
                              textAlign: "left",
                            }}
                          >
                            HOF AVG / CAGR
                          </td>
                          <td style={{ ...fs, fontWeight: 600 }}>
                            {hpaAvg.toFixed(1)}%
                          </td>
                          <td
                            style={{
                              ...fs,
                              fontWeight: 800,
                              color: C.greenLight,
                            }}
                          >
                            {fmtSign(ampSt.avg)}
                          </td>
                          <td style={{ ...fs, fontWeight: 600 }}>
                            {fmtSign(spSt.avg)}
                          </td>
                          <td style={{ ...fs, fontWeight: 600 }}>
                            {fmtSign(bndSt.avg)}
                          </td>
                          <td style={{ ...fs, fontWeight: 600 }}>
                            {fmtSign(vnqSt.avg)}
                          </td>
                          <td
                            style={{
                              ...fs,
                              fontWeight: 800,
                              color: C.greenLight,
                            }}
                          >
                            {last ? fmtSign(last.cagr) : "—"}
                          </td>
                          <td style={{ ...fs, fontWeight: 600 }}>
                            {last?.spCagr != null ? fmtSign(last.spCagr) : "—"}
                          </td>
                          <td style={{ ...fs, fontWeight: 600 }}>
                            {last?.bndCagr != null
                              ? fmtSign(last.bndCagr)
                              : "—"}
                          </td>
                          <td style={{ ...fs, fontWeight: 600 }}>
                            {last?.vnqCagr != null
                              ? fmtSign(last.vnqCagr)
                              : "—"}
                          </td>
                        </>
                      );
                    })()}
                  </tr>
                </tfoot>
              </table>
            </Box>
          </CardContent>
        </Card>

        {/* ── Footer ─────────────────────────────────────────────── */}
        <Box
          sx={{
            mt: 4,
            pt: 2,
            borderTop: `1px solid ${C.border}`,
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <Typography sx={{ fontSize: 10, color: C.muted }}>
            Data sources: S&P/Case-Shiller Home Price Indices · FRED · S&P 500
            Total Return · Bloomberg Barclays US Aggregate Bond Index · VNQ
            (Vanguard Real Estate ETF)
          </Typography>
          <Typography sx={{ fontSize: 10, color: C.muted }}>
            For institutional use only · Not investment advice · American Pledge{" "}
            {new Date().getFullYear()}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default Dashboard;
