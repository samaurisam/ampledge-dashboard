import React, { useState } from "react";
import { signOut } from "aws-amplify/auth";
import { helix } from "ldrs";
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
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
  Marker,
} from "react-simple-maps";
import { feature as topoFeature } from "topojson-client";
import {
  C,
  HOME_VALUE,
  BM_START,
  BM,
  CAP_SCHEDULE,
  CITY_COLORS,
  baseFont,
  baseTooltip,
  baseGridScale,
  baseLegend,
  PROJ_START,
  PROJ,
  KALSHI_SERIES_META,
  GROUND_SCORE_SUPPLEMENTAL,
  GROUND_SCORE_CS_PROXY,
  GROUND_SCORE_CS_DIST,
  NEOPOLI_DIMS,
  NEOPOLI_TIER_META,
  NEOPOLI_MARKETS,
  OPPORTUNITY_DIMS,
  OPPORTUNITY_SCORES,
  OPPORTUNITY_SUPPLEMENTAL,
} from "./data";

helix.register();

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

// ─── Affordability helpers ──────────────────────────────────────────────────
const _monthlyMortgage = (homeValue, downPct, rate = 0.07, years = 30) => {
  if (!homeValue || downPct == null) return null;
  const loan = homeValue * (1 - downPct);
  const r = rate / 12;
  const n = years * 12;
  return (loan * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
};
const _monthlyPMI = (homeValue, downPct, pmiRate = 0.011) => {
  if (!homeValue || downPct == null || downPct >= 0.2) return 0;
  return (homeValue * (1 - downPct) * pmiRate) / 12;
};
const _totalMonthlyPayment = (homeValue, downPct, rate = 0.07, years = 30) => {
  const pi = _monthlyMortgage(homeValue, downPct, rate, years);
  const pmi = _monthlyPMI(homeValue, downPct);
  return pi != null ? pi + pmi : null;
};
const _housingDTI = (homeValue, hhi, downPct, rate = 0.07, years = 30, dtiDenom = 12) => {
  if (!homeValue || !hhi || downPct == null) return null;
  const payment = _totalMonthlyPayment(homeValue, downPct, rate, years);
  if (payment == null) return null;
  return (payment / (hhi / dtiDenom)) * 100;
};
const _buyerPoolPct = (homeValue, hhi, downPct, rate = 0.07, years = 30, dtiThreshold = 0.43, sigma = 0.85) => {
  if (!homeValue || !hhi || downPct == null) return null;
  const payment = _totalMonthlyPayment(homeValue, downPct, rate, years);
  if (payment == null) return null;
  const maxIncome = (payment / dtiThreshold) * 12;
  const mu = Math.log(hhi) - (sigma * sigma) / 2;
  const z = (Math.log(maxIncome) - mu) / sigma;
  const erfApprox = (x) => {
    const t = 1 / (1 + 0.3275911 * Math.abs(x));
    const poly = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
    const val = 1 - poly * Math.exp(-x * x);
    return x >= 0 ? val : -val;
  };
  return (1 - (1 + erfApprox(z / Math.SQRT2)) / 2) * 100;
};
// ─── Per-Market HPA Outlook Model ────────────────────────────────────────────
// Produces a composite directional price outlook from 5 signals:
//   1. Price momentum   (zhvi_growth_1yr)               weight 25%
//   2. Buyer pool depth (_buyerPoolPct at 20% down)      weight 25%
//   3. Affordability gap (qualifying income / median HHI) weight 20%
//   4. Demand momentum  (pop_growth_pct + lfpr proxy)    weight 20%
//   5. Macro overlay    (Kalshi mortgage rate median)     weight 10%
// Returns { label, color, score, hpaLow, hpaHigh, drivers }
const _hpaOutlook = (met, kalshiMtgMedian = null) => {
  if (!met) return null;
  const scores = [];

  // Signal 1: Price Momentum
  if (met.zhvi_growth_1yr != null) {
    const g = met.zhvi_growth_1yr;
    const s = g > 0.08 ? 1.0 : g > 0.04 ? 0.75 : g > 0.01 ? 0.45 : g > 0 ? 0.2 : 0.0;
    scores.push({ key: "momentum", weight: 0.25, score: s,
      label: "Price Momentum",
      value: `${g >= 0 ? "+" : ""}${(g * 100).toFixed(1)}%`,
      detail: "1-yr ZHVI appreciation" });
  }

  // Signal 2: Buyer Pool Depth — uses 10% down (typical conventional buyer, ~NAR median)
  if (met.zhvi_latest && met.median_hhi) {
    const pool = _buyerPoolPct(met.zhvi_latest, met.median_hhi, 0.10);
    if (pool != null) {
      const s = pool > 40 ? 1.0 : pool > 30 ? 0.75 : pool > 20 ? 0.5 : pool > 12 ? 0.25 : 0.0;
      scores.push({ key: "buyer_pool", weight: 0.25, score: s,
        label: "Buyer Pool",
        value: `${pool.toFixed(0)}%`,
        detail: "of HH qualify (10% down, conv.)" });
    }
  }

  // Signal 3: Affordability Gap — qualifying income vs. median HHI at 10% down
  if (met.zhvi_latest && met.median_hhi) {
    const payment = _totalMonthlyPayment(met.zhvi_latest, 0.10);
    if (payment) {
      const qualifyingIncome = (payment / 0.43) * 12;
      const ratio = qualifyingIncome / met.median_hhi;
      const s = ratio < 0.8 ? 1.0 : ratio < 1.0 ? 0.65 : ratio < 1.2 ? 0.35 : 0.05;
      scores.push({ key: "affordability", weight: 0.20, score: s,
        label: "Income Gap",
        value: ratio < 1 ? `${((1 - ratio) * 100).toFixed(0)}% below` : `${((ratio - 1) * 100).toFixed(0)}% above`,
        detail: ratio < 1 ? "median HHI exceeds qualifying income" : "qualifying income above median HHI" });
    }
  }

  // Signal 4: Demand Momentum (pop growth + labor participation)
  const popG = met.pop_growth_pct;
  const lfpr = met.lfpr;
  if (popG != null || lfpr != null) {
    let s = 0.5;
    if (popG != null) s = popG > 3 ? 1.0 : popG > 1 ? 0.7 : popG > 0 ? 0.4 : 0.1;
    if (lfpr != null) s = (s + (lfpr > 65 ? 1.0 : lfpr > 58 ? 0.65 : 0.3)) / 2;
    scores.push({ key: "demand_momentum", weight: 0.20, score: s,
      label: "Demand Momentum",
      value: popG != null ? `${popG >= 0 ? "+" : ""}${popG.toFixed(1)}%` : `${lfpr?.toFixed(1)}%`,
      detail: [
        popG != null ? "pop growth" : null,
        lfpr != null ? `${lfpr.toFixed(1)}% LFPR` : null,
      ].filter(Boolean).join(" · ") });
  }

  // Signal 5: Macro Overlay (Kalshi 30-yr mortgage rate consensus)
  if (kalshiMtgMedian != null) {
    const r = kalshiMtgMedian;
    const s = r < 6.0 ? 1.0 : r < 6.5 ? 0.75 : r < 7.0 ? 0.45 : r < 7.5 ? 0.2 : 0.0;
    scores.push({ key: "macro", weight: 0.10, score: s,
      label: "Rate Outlook",
      value: `${r.toFixed(2)}%`,
      detail: "Kalshi 30-yr consensus" });
  }

  if (scores.length === 0) return null;

  // Normalize weights to available signals
  const totalWeight = scores.reduce((s, x) => s + x.weight, 0);
  const composite = scores.reduce((s, x) => s + (x.score * x.weight), 0) / totalWeight;

  let label, color, hpaLow, hpaHigh;
  if (composite >= 0.72) { label = "Bullish"; color = "#27ae60"; hpaLow = 5; hpaHigh = 9; }
  else if (composite >= 0.55) { label = "Mod. Bullish"; color = "#52c27a"; hpaLow = 3; hpaHigh = 6; }
  else if (composite >= 0.38) { label = "Neutral"; color = "#7fa8cc"; hpaLow = 0; hpaHigh = 3; }
  else if (composite >= 0.22) { label = "Cautious"; color = "#e8a04a"; hpaLow = -1; hpaHigh = 2; }
  else { label = "Bearish"; color = "#e57373"; hpaLow = -4; hpaHigh = 0; }

  return { label, color, score: composite, hpaLow, hpaHigh, drivers: scores };
};

// ─── Formation Markets Scoring Model ─────────────────────────────────────────
// Identifies greenfield master-planned community (MPC) sites: growth corridors
// with land still available, rising demand, and development-ready infrastructure.
// 5 dimensions — all computed client-side from pipeline metrics.
const _formationScore = (met) => {
  if (!met) return null;
  const dims = [];

  // 1. Demographic Momentum (30%) — pop growth + net migration
  {
    const pg  = met.pop_growth_pct;    // % CAGR
    const nm  = met.net_migration_rate; // % pop
    if (pg != null || nm != null) {
      const pgS = pg  != null ? (pg  > 3 ? 1.0 : pg  > 1.5 ? 0.8 : pg  > 0.5 ? 0.55 : pg > 0 ? 0.3 : 0.05) : 0.5;
      const nmS = nm  != null ? (nm  > 2 ? 1.0 : nm  > 0.5 ? 0.75 : nm  > 0 ? 0.45 : nm > -0.5 ? 0.2 : 0.0) : 0.5;
      const s = pg != null && nm != null ? (pgS + nmS) / 2 : pg != null ? pgS : nmS;
      dims.push({ id: "demo_momentum", label: "Demographic Momentum", weight: 0.30, score: s,
        value: pg != null ? `${pg >= 0 ? "+" : ""}${pg.toFixed(1)}%` : `${nm >= 0 ? "+" : ""}${nm?.toFixed(1)}%`,
        detail: [pg != null ? "pop growth" : null, nm != null ? `${nm >= 0 ? "+" : ""}${nm.toFixed(1)}% migration` : null].filter(Boolean).join(" · ") });
    }
  }

  // 2. Greenfield Potential (25%) — low density + affordable land cost
  {
    const dens = met.pop_density;           // pop/sq mi — lower is better
    const land = met.farmland_value_acre;   // $/acre — lower is better
    if (dens != null || land != null) {
      const dS = dens != null ? (dens < 50 ? 1.0 : dens < 150 ? 0.75 : dens < 400 ? 0.45 : dens < 1000 ? 0.2 : 0.0) : 0.5;
      const lS = land != null ? (land < 2500 ? 1.0 : land < 5000 ? 0.75 : land < 10000 ? 0.45 : land < 20000 ? 0.2 : 0.0) : 0.5;
      const s = dens != null && land != null ? (dS + lS) / 2 : dens != null ? dS : lS;
      dims.push({ id: "greenfield", label: "Greenfield Potential", weight: 0.25, score: s,
        value: dens != null ? `${dens.toFixed(0)} /sq mi` : land != null ? `$${(land / 1000).toFixed(1)}k/ac` : "—",
        detail: [dens != null ? `${dens.toFixed(0)} pop/sq mi` : null, land != null ? `$${(land / 1000).toFixed(1)}k/ac land` : null].filter(Boolean).join(" · ") });
    }
  }

  // 3. Development Velocity (20%) — permit activity signals builder appetite + local approvals
  {
    const permits = met.permit_units_per_1k; // units/1k pop
    if (permits != null) {
      const s = permits > 10 ? 1.0 : permits > 5 ? 0.8 : permits > 2 ? 0.55 : permits > 0.5 ? 0.3 : 0.05;
      dims.push({ id: "dev_velocity", label: "Development Velocity", weight: 0.20, score: s,
        value: `${permits.toFixed(1)} u/1k`,
        detail: "residential permits per 1k pop" });
    }
  }

  // 4. Employment Growth (15%) — rising jobs precede housing demand
  {
    const eg = met.emp_growth_pct; // % YoY
    if (eg != null) {
      const s = eg > 4 ? 1.0 : eg > 2 ? 0.78 : eg > 0.5 ? 0.55 : eg > 0 ? 0.3 : 0.05;
      dims.push({ id: "emp_growth", label: "Employment Growth", weight: 0.15, score: s,
        value: `${eg >= 0 ? "+" : ""}${eg.toFixed(1)}%`,
        detail: "YoY covered employment" });
    }
  }

  // 5. Buyer Quality (10%) — entry-level affordability for MPC target demographic
  {
    const hhi   = met.median_hhi;        // $
    const hpaG  = met.zhvi_growth_1yr;   // appreciation signal
    if (hhi != null || hpaG != null) {
      const hhiS = hhi    != null ? (hhi > 80000 ? 1.0 : hhi > 60000 ? 0.75 : hhi > 45000 ? 0.45 : 0.2) : 0.5;
      const hpaS = hpaG   != null ? (hpaG > 0.05 ? 1.0 : hpaG > 0.02 ? 0.7 : hpaG > 0 ? 0.4 : 0.15) : 0.5;
      const s = hhi != null && hpaG != null ? (hhiS + hpaS) / 2 : hhi != null ? hhiS : hpaS;
      dims.push({ id: "buyer_quality", label: "Buyer Quality", weight: 0.10, score: s,
        value: hhi != null ? `$${(hhi / 1000).toFixed(0)}k HHI` : `${(hpaG * 100).toFixed(1)}% HPA`,
        detail: [hhi != null ? `$${(hhi / 1000).toFixed(0)}k median HHI` : null, hpaG != null ? `${(hpaG * 100).toFixed(1)}% YoY HPA` : null].filter(Boolean).join(" · ") });
    }
  }

  if (dims.length === 0) return null;
  const totalW   = dims.reduce((s, d) => s + d.weight, 0);
  const composite = dims.reduce((s, d) => s + d.score * d.weight, 0) / totalW;

  let tier, tierColor;
  if (composite >= 0.75) { tier = "Prime Site"; tierColor = "#27ae60"; }
  else if (composite >= 0.58) { tier = "High Potential"; tierColor = "#52c27a"; }
  else if (composite >= 0.42) { tier = "Emerging"; tierColor = "#7fa8cc"; }
  else if (composite >= 0.25) { tier = "Monitor"; tierColor = "#e8a04a"; }
  else { tier = "Not Ready"; tierColor = "#e57373"; }

  return { composite: composite * 100, tier, tierColor, dims };
};

// ─── Engineered Markets Scoring Model ────────────────────────────────────────
// Site optimizer for employer-first land acquisition: which counties provide the
// best foundation for a designed demand ecosystem (employer + AP housing + MPC).
// Weights shift based on employer profile input (industry, workforce size, wages).
const _engineeredScore = (met, profile = {}) => {
  if (!met) return null;
  const { industry = "manufacturing", wageLevel = "moderate", landPriority = true } = profile;

  // Weight multipliers based on profile
  const isIndustrial = industry === "manufacturing" || industry === "logistics";
  const isTech       = industry === "tech";

  const dims = [];

  // 1. Available Workforce (30%) — unemployed + broader labor pool
  {
    const unemp = met.unemployment_rate; // % — higher = more available labor
    const lfpr  = met.lfpr;              // % — total workforce participation
    const totEmp = met.total_employment; // scale signal
    if (unemp != null || lfpr != null) {
      const uS = unemp != null ? (unemp > 8 ? 1.0 : unemp > 5 ? 0.75 : unemp > 3.5 ? 0.5 : unemp > 2.5 ? 0.3 : 0.1) : 0.5;
      const lS = lfpr  != null ? (lfpr  > 65 ? 1.0 : lfpr  > 60 ? 0.75 : lfpr  > 55 ? 0.5 : 0.25) : 0.5;
      const s = unemp != null && lfpr != null ? (uS * 0.6 + lS * 0.4) : unemp != null ? uS : lS;
      dims.push({ id: "workforce", label: "Available Workforce", weight: 0.30, score: s,
        value: unemp != null ? `${unemp.toFixed(1)}% unemp` : `${lfpr?.toFixed(1)}% LFPR`,
        detail: [unemp != null ? `${unemp.toFixed(1)}% unemployed` : null, lfpr != null ? `${lfpr.toFixed(1)}% LFPR` : null, totEmp != null ? `${(totEmp / 1000).toFixed(0)}k jobs` : null].filter(Boolean).join(" · ") });
    }
  }

  // 2. Land & Development Cost (25%) — critical for site assembly
  {
    const land  = met.farmland_value_acre;  // $/acre
    const dens  = met.pop_density;          // lower = more available
    const zhvi  = met.zhvi_latest;          // home price proxy for land premium
    if (land != null || dens != null) {
      const lS = land != null ? (land < 2000 ? 1.0 : land < 4000 ? 0.78 : land < 8000 ? 0.5 : land < 15000 ? 0.25 : 0.05) : 0.5;
      const dS = dens != null ? (dens < 30 ? 1.0 : dens < 80 ? 0.8 : dens < 200 ? 0.55 : dens < 600 ? 0.25 : 0.0) : 0.5;
      const s = (lS + dS) / 2;
      dims.push({ id: "land_cost", label: "Land & Dev Cost", weight: landPriority ? 0.25 : 0.15, score: s,
        value: land != null ? `$${(land / 1000).toFixed(1)}k/ac` : `${dens?.toFixed(0)} /sq mi`,
        detail: [land != null ? `$${(land / 1000).toFixed(1)}k/ac` : null, dens != null ? `${dens.toFixed(0)} pop/sq mi` : null].filter(Boolean).join(" · ") });
    }
  }

  // 3. Infrastructure Readiness (20%) — broadband + metro connectivity (not too remote)
  {
    const bb   = met.broadband_pct;          // % coverage
    const dist = met.drive_min_nearest_metro; // minutes — sweet spot 30–90
    if (bb != null || dist != null) {
      const bbS   = bb   != null ? (bb   > 90 ? 1.0 : bb   > 75 ? 0.75 : bb   > 60 ? 0.45 : 0.15) : 0.5;
      const distS = dist != null ? (dist < 30 ? 0.8 : dist < 60 ? 1.0 : dist < 90 ? 0.75 : dist < 120 ? 0.45 : 0.15) : 0.5;
      const s = bb != null && dist != null ? (bbS * 0.5 + distS * 0.5) : bb != null ? bbS : distS;
      dims.push({ id: "infrastructure", label: "Infrastructure", weight: 0.20, score: s,
        value: dist != null ? `${dist.toFixed(0)} min metro` : `${bb?.toFixed(0)}% BB`,
        detail: [bb != null ? `${bb.toFixed(0)}% broadband` : null, dist != null ? `${dist.toFixed(0)} min to metro` : null].filter(Boolean).join(" · ") });
    }
  }

  // 4. Growth Momentum (15%) — market heading the right direction
  {
    const pg = met.pop_growth_pct;
    const eg = met.emp_growth_pct;
    if (pg != null || eg != null) {
      const pgS = pg != null ? (pg > 2 ? 1.0 : pg > 0.5 ? 0.7 : pg > 0 ? 0.4 : 0.1) : 0.5;
      const egS = eg != null ? (eg > 3 ? 1.0 : eg > 1 ? 0.7 : eg > 0 ? 0.4 : 0.1) : 0.5;
      const s = pg != null && eg != null ? (pgS + egS) / 2 : pg != null ? pgS : egS;
      dims.push({ id: "growth_momentum", label: "Growth Momentum", weight: 0.15, score: s,
        value: pg != null ? `${pg >= 0 ? "+" : ""}${pg.toFixed(1)}% pop` : `${eg >= 0 ? "+" : ""}${eg?.toFixed(1)}% emp`,
        detail: [pg != null ? `${pg.toFixed(1)}% pop growth` : null, eg != null ? `${eg.toFixed(1)}% emp growth` : null].filter(Boolean).join(" · ") });
    }
  }

  // 5. AP Housing Absorption (10%) — can American Pledge program deploy here?
  {
    const hhi   = met.median_hhi;
    const zhvi  = met.zhvi_latest;
    if (hhi != null && zhvi != null) {
      const pool = _buyerPoolPct ? _buyerPoolPct(zhvi, hhi, 0.20) : null;
      const s = pool != null ? (pool > 35 ? 1.0 : pool > 25 ? 0.75 : pool > 15 ? 0.5 : pool > 8 ? 0.25 : 0.05) : 0.5;
      dims.push({ id: "ap_absorption", label: "AP Absorption", weight: 0.10, score: s,
        value: pool != null ? `${pool.toFixed(0)}% qualify` : `$${(hhi / 1000).toFixed(0)}k HHI`,
        detail: pool != null ? `${pool.toFixed(0)}% of HH qualify at 20% down` : `$${(hhi / 1000).toFixed(0)}k median HHI` });
    }
  }

  if (dims.length === 0) return null;
  // Re-normalize in case some dimensions couldn't be computed
  const totalW    = dims.reduce((s, d) => s + d.weight, 0);
  const composite = dims.reduce((s, d) => s + d.score * d.weight, 0) / totalW;

  let tier, tierColor;
  if (composite >= 0.75) { tier = "Prime Target"; tierColor = "#27ae60"; }
  else if (composite >= 0.58) { tier = "Strong Candidate"; tierColor = "#52c27a"; }
  else if (composite >= 0.42) { tier = "Viable Site"; tierColor = "#7fa8cc"; }
  else if (composite >= 0.25) { tier = "Conditional"; tierColor = "#e8a04a"; }
  else { tier = "Poor Fit"; tierColor = "#e57373"; }

  return { composite: composite * 100, tier, tierColor, dims };
};

// Generates a renderDeepDive-compatible markdown string for a Formation Markets county
const _formationNarrative = (name, state, met, fs, rank, total) => {
  if (!met || !fs) return null;
  const pct = Math.round((1 - rank / total) * 100);
  const tierDesc = fs.tier === "Prime Site" ? "a prime greenfield formation candidate" :
    fs.tier === "Strong Site" ? "a strong formation market" :
    fs.tier === "Viable Site" ? "a viable but selective formation opportunity" :
    "a conditional site requiring catalyst support";

  const strong = fs.dims.filter(d => d.score >= 0.65).map(d => d.label);
  const weak   = fs.dims.filter(d => d.score < 0.38).map(d => d.label);

  const lines = [];

  // Opening paragraph
  lines.push(`**${name}, ${state}** ranks **#${rank}** of ${total.toLocaleString()} screened counties for master-planned community formation potential, placing it in the **top ${100 - pct}th percentile** — ${tierDesc} for greenfield MPC development.`);
  if (strong.length) {
    lines.push(`Formation strength is led by **${strong.slice(0, 2).join("** and **")}**, reflecting the combination of inbound population pressure and site availability that defines high-conviction formation markets.`);
  }
  lines.push("");

  // Demand drivers
  const popGrowth = met.pop_growth_pct;
  const migration = met.net_migration_rate;
  const empGrowth = met.emp_growth_pct;
  const hhi = met.median_hhi;
  const zhviGrowth = met.zhvi_growth_1yr;

  const demandBullets = [];
  if (popGrowth != null && popGrowth > 0) {
    demandBullets.push(`**Population Growth:** Expanding at **+${popGrowth.toFixed(1)}%**${migration != null && migration > 0 ? ` with a +${migration.toFixed(2)}% net migration tailwind` : ""} — generating sustained household formation pressure that precedes MPC demand.`);
  } else if (popGrowth != null) {
    demandBullets.push(`**Population Growth:** Flat-to-negative at **${popGrowth.toFixed(1)}%** — compresses the organic formation pipeline and raises the bar for catalyst-driven demand.`);
  }
  if (hhi != null) {
    demandBullets.push(hhi >= 80000
      ? `**Household Income:** Above-median at **$${(hhi / 1000).toFixed(0)}k** — supports attainable product pricing at MPC scale.`
      : hhi >= 55000
        ? `**Household Income:** **$${(hhi / 1000).toFixed(0)}k** — consistent with workforce-housing-targeted MPC product.`
        : `**Household Income:** **$${(hhi / 1000).toFixed(0)}k** — constrains price ceiling; favors a value-oriented product mix.`);
  }
  if (empGrowth != null && empGrowth > 2) {
    demandBullets.push(`**Employment Growth:** **+${empGrowth.toFixed(1)}%** YoY anchors incremental housing demand and reduces stabilization risk for first phases.`);
  }
  if (zhviGrowth != null) {
    demandBullets.push(zhviGrowth > 0.04
      ? `**Home Values:** Appreciating at **+${(zhviGrowth * 100).toFixed(1)}%** YoY — demand is outrunning local supply, a strong lead indicator for MPC absorption.`
      : zhviGrowth > 0
        ? `**Home Values:** Modest **+${(zhviGrowth * 100).toFixed(1)}%** HPA — stable but not overheated conditions preserve developer margin.`
        : `**Home Values:** **${(zhviGrowth * 100).toFixed(1)}%** YoY — entry basis is favorable but demand validation is required.`);
  }
  if (demandBullets.length) {
    lines.push("**Key Demand Drivers**");
    demandBullets.forEach(b => lines.push(`• ${b}`));
    lines.push("");
  }

  // Site conditions
  const density = met.pop_density;
  const landVal = met.farmland_value_acre;
  const permits = met.permit_units_per_1k;
  const fema = met.fema_risk_score;

  const siteBullets = [];
  if (density != null && density < 50) {
    siteBullets.push(`**Density:** **${density.toFixed(0)}/mi²** confirms available greenfield land with minimal displacement of existing development.`);
  } else if (density != null && density > 200) {
    siteBullets.push(`**Density:** **${density.toFixed(0)}/mi²** is elevated for a greenfield strategy — may limit contiguous parcel availability at MPC scale.`);
  }
  if (landVal != null) {
    siteBullets.push(landVal < 3000
      ? `**Land Basis:** **$${(landVal / 1000).toFixed(1)}k/ac** farmland cost — among the most competitive in the universe, supporting developer margin and attainable pricing.`
      : landVal < 8000
        ? `**Land Basis:** **$${(landVal / 1000).toFixed(1)}k/ac** — within range for an MPC land-to-finished-lot conversion model.`
        : `**Land Basis:** **$${(landVal / 1000).toFixed(1)}k/ac** — elevated; warrants careful pro forma sensitivity testing.`);
  }
  if (permits != null && permits > 5) {
    siteBullets.push(`**Permit Activity:** **${permits.toFixed(1)} units/1k pop** — active pipeline de-risks entitlement assumptions for new MPC phases.`);
  } else if (permits != null && permits < 2) {
    siteBullets.push(`**Permit Activity:** **${permits.toFixed(1)} units/1k pop** — thin pipeline may indicate entitlement friction or constrained infrastructure; diligence warranted.`);
  }
  if (siteBullets.length) {
    lines.push("**Site Conditions**");
    siteBullets.forEach(b => lines.push(`• ${b}`));
    lines.push("");
  }

  // Execution risks
  const riskBullets = [];
  if (weak.length) {
    riskBullets.push(`**Underwriting Risks:** **${weak.join("** and **")}** weigh on the composite score and require deal-level mitigation.`);
  }
  if (fema != null && fema > 60) {
    riskBullets.push(`**FEMA Risk:** Score of **${fema.toFixed(0)}/100** indicates above-average hazard exposure — infrastructure resilience and insurance underwriting should be assessed.`);
  }
  if (riskBullets.length) {
    lines.push("**Execution Considerations**");
    riskBullets.forEach(b => lines.push(`• ${b}`));
  }

  return lines.join("\n");
};

// Generates a renderDeepDive-compatible markdown string for an Engineered Markets county
const _engineeredNarrative = (name, state, met, es, rank, total, profile) => {
  if (!met || !es) return null;
  const pct = Math.round((1 - rank / total) * 100);
  const industryLabel = { manufacturing: "manufacturing", logistics: "logistics / distribution", tech: "technology / R&D", healthcare: "healthcare", mixed: "mixed-use" }[profile?.industry] || "industrial";
  const wageTxt = profile?.wageLevel === "high" ? "professional-wage" : profile?.wageLevel === "low" ? "entry-level" : "moderate-wage";
  const tierDesc = es.tier === "Prime Site" ? "a prime employer destination" :
    es.tier === "Strong Site" ? "a strong site selection candidate" :
    es.tier === "Viable Site" ? "a viable but competitive site" : "a conditional site requiring incentive support";

  const strong = es.dims.filter(d => d.score >= 0.65).map(d => d.label);
  const weak   = es.dims.filter(d => d.score < 0.38).map(d => d.label);

  const lines = [];

  // Opening
  lines.push(`For a **${wageTxt} ${industryLabel}** employer, **${name}, ${state}** ranks **#${rank}** of ${total.toLocaleString()} screened counties — placing it in the **top ${100 - pct}th percentile** and qualifying as ${tierDesc} under the current employer profile.`);
  if (strong.length) {
    lines.push(`Site strength is led by **${strong.slice(0, 2).join("** and **")}**, the dimensions most critical to ${industryLabel} site selection success.`);
  }
  lines.push("");

  // Workforce
  const unemp = met.unemployment_rate;
  const lfpr  = met.lfpr;
  const totalEmp = met.total_employment;
  const wfBullets = [];
  if (unemp != null) {
    wfBullets.push(unemp >= 6
      ? `**Unemployment: ${unemp.toFixed(1)}%** — substantial available labor pool; positive for rapid workforce ramp-up without significant wage pressure.`
      : unemp >= 4
        ? `**Unemployment: ${unemp.toFixed(1)}%** — balanced labor market with accessible workforce at scale.`
        : `**Unemployment: ${unemp.toFixed(1)}%** — tight conditions; above-market wage positioning or workforce pipeline partnerships will be required.`);
  }
  if (lfpr != null) {
    wfBullets.push(lfpr >= 60
      ? `**LFPR: ${lfpr.toFixed(1)}%** — high attachment rate signals a workforce-oriented community.`
      : `**LFPR: ${lfpr.toFixed(1)}%** — below baseline; meaningful reserve population can be activated through employer-driven training programs.`);
  }
  if (totalEmp != null) {
    wfBullets.push(totalEmp > 20000
      ? `**Employment Base: ${(totalEmp / 1000).toFixed(0)}k jobs** — diversified labor market supporting amenity infrastructure for incoming workers.`
      : `**Employment Base: ${(totalEmp / 1000).toFixed(0)}k jobs** — relatively small; a large employer would be transformative for the local economy.`);
  }
  if (wfBullets.length) {
    lines.push("**Workforce Supply**");
    wfBullets.forEach(b => lines.push(`• ${b}`));
    lines.push("");
  }

  // Site
  const landVal = met.farmland_value_acre;
  const broadband = met.broadband_pct;
  const metroDrive = met.drive_min_nearest_metro;
  const empGrowth = met.emp_growth_pct;
  const siteBullets = [];
  if (landVal != null) {
    siteBullets.push(landVal < 3000
      ? `**Land Basis: $${(landVal / 1000).toFixed(1)}k/ac** — most competitive in the screened universe; meaningful cost advantage for greenfield industrial development.`
      : landVal < 8000
        ? `**Land Basis: $${(landVal / 1000).toFixed(1)}k/ac** — within range for an industrial park or campus development model.`
        : `**Land Basis: $${(landVal / 1000).toFixed(1)}k/ac** — elevated; warrants careful per-square-foot developed cost sensitivity.`);
  }
  if (broadband != null) {
    siteBullets.push(broadband >= 85
      ? `**Broadband: ${broadband.toFixed(0)}%** — meets modern operational requirements for connected facilities.`
      : `**Broadband: ${broadband.toFixed(0)}%** — below benchmark; may require provider investment or public subsidy as a condition of commitment.`);
  }
  if (metroDrive != null) {
    siteBullets.push(metroDrive <= 45
      ? `**Metro Access: ${metroDrive.toFixed(0)} min** — meaningful labor market depth without the land cost and congestion of the core.`
      : metroDrive <= 90
        ? `**Metro Access: ${metroDrive.toFixed(0)} min** — cost and scale advantages while remaining within commuting range for specialized talent.`
        : `**Metro Access: ${metroDrive.toFixed(0)} min** — true exurban positioning; strong for commodity workforce but requires deliberate talent-access strategy for specialized roles.`);
  }
  if (empGrowth != null && empGrowth > 1) {
    siteBullets.push(`**Employment Growth: +${empGrowth.toFixed(1)}%** YoY — local economy already in expansion mode, reducing first-mover risk for an incoming employer anchor.`);
  }
  if (siteBullets.length) {
    lines.push("**Site Fundamentals**");
    siteBullets.forEach(b => lines.push(`• ${b}`));
    lines.push("");
  }

  // Absorption
  const hhi = met.median_hhi;
  const zhvi = met.zhvi_latest;
  if (hhi && zhvi) {
    const ratio = zhvi / hhi;
    lines.push("**Residential Absorption**");
    lines.push(`• **Home Value / Income Ratio: ${ratio.toFixed(1)}x** — ${ratio < 3.5 ? "exceptional affordability; workers can own near the worksite without wage concessions." : ratio < 5 ? "healthy affordability for the target wage band." : "stretched affordability; AP or employer housing assistance may be required to fully unlock the residential component."}`);
    lines.push("");
  }

  // Risks
  const riskBullets = [];
  if (weak.length) {
    riskBullets.push(`**Lowest-scoring dimensions:** **${weak.join("** and **")}** — primary risk factors under the current employer profile.`);
  }
  const fema = met.fema_risk_score;
  if (fema != null && fema > 60) {
    riskBullets.push(`**FEMA Risk: ${fema.toFixed(0)}/100** — factor into facility siting, insurance underwriting, and business continuity planning.`);
  }
  if (riskBullets.length) {
    lines.push("**Execution Risks**");
    riskBullets.forEach(b => lines.push(`• ${b}`));
  }

  return lines.join("\n");
};

const _downPaymentReachPct = (homeValue, downPct, hhi, years = 3, savingsRate = 0.10, sigma = 0.85) => {
  if (!homeValue || !hhi || downPct == null) return null;
  const target = homeValue * downPct;
  const annualSavings = hhi * savingsRate;
  const totalSavings = annualSavings * years;
  if (totalSavings <= 0) return null;
  const mu = Math.log(hhi) - (sigma * sigma) / 2;
  const minIncome = target / (savingsRate * years);
  const erfApprox = (x) => {
    const t = 1 / (1 + 0.3275911 * Math.abs(x));
    const poly = t * (0.254829592 + t * (-0.284496736 + t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
    const val = 1 - poly * Math.exp(-x * x);
    return x >= 0 ? val : -val;
  };
  const z = (Math.log(minIncome) - mu) / sigma;
  return (1 - (1 + erfApprox(z / Math.SQRT2)) / 2) * 100;
};

// ─── Sub-components ────────────────────────────────────────────────────────
const SectionHeader = ({ title, sub }) => (
  <Box
    sx={{
      mb: 2,
      pb: 1,
      borderBottom: `2px solid ${C.navy}`,
      width: "fit-content",
    }}
  >
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
  const pairs = vals
    .map((v, i) => [v, hpaVals[i]])
    .filter(([v, h]) => v != null && h != null);
  if (pairs.length < 2) return "Insufficient data for this period.";
  const vs = pairs.map(([v]) => v);
  const avg = vs.reduce((s, v) => s + v, 0) / vs.length;
  const rising = vs[vs.length - 1] > vs[0];

  switch (label) {
    case "Rental Vacancy Rate": {
      const tight = avg < 6.5;
      return `Vacancy averaged ${avg.toFixed(1)}% (${tight ? "tight" : "elevated"}) and ${rising ? "rose" : "fell"} over the period. ${
        r < -0.5
          ? "Tightening rentals strongly pushed demand toward ownership, amplifying appreciation."
          : r < -0.2
            ? "Moderately tight conditions provided some support for price gains."
            : "Loosening rental supply reduced pressure on home prices."
      }`;
    }
    case "Months of Supply": {
      const low = avg < 3.5;
      return `Supply averaged ${avg.toFixed(1)} months (equilibrium ≈ 4–5 months). ${
        low
          ? "Severe inventory constraints"
          : avg < 5
            ? "Below-equilibrium supply"
            : "Adequate supply"
      } ${r < -0.5 ? "was the dominant driver of price pressure this period." : r < -0.2 ? "provided moderate price support." : "limited the upside for appreciation."}`;
    }
    case "CPI Inflation": {
      return `Inflation averaged ${avg.toFixed(1)}% annually over the period. ${
        r > 0.5
          ? "High inflation closely tracked nominal price surges — both peaked in the same window."
          : r > 0.2
            ? "Moderate inflation alignment suggests some pass-through to home values."
            : "Inflation moved largely independently of price trends this period."
      }`;
    }
    case "Housing Starts (000s)": {
      return `Single-family starts averaged ${Math.round(avg)}k/yr and were ${rising ? "trending up" : "trending down"}. ${
        r > 0.5
          ? "Starts rose during the demand boom but couldn't outpace demand — supply lag amplified gains."
          : r > 0.2
            ? "Modest build-up tracked appreciation with a lag."
            : r < -0.2
              ? "Builder pullback coincided with cooling demand — a counter-cyclical pattern."
              : "Construction levels had little directional relationship with prices this period."
      }`;
    }
    case "NAHB Builder Confidence": {
      const sentiment =
        avg >= 60 ? "strong" : avg >= 50 ? "neutral-to-positive" : "weak";
      return `Builder confidence averaged ${Math.round(avg)} (${sentiment}; 50 = neutral) and was ${rising ? "improving" : "declining"}. ${
        r > 0.4
          ? "Confidence tracked appreciation, reflecting shared optimism about housing demand."
          : r < -0.4
            ? "Builders turned cautious as market conditions shifted — a leading indicator of cooling."
            : "Sentiment had a mixed relationship with price trends this period."
      }`;
    }
    case "Mortgage Rate": {
      return `Rates averaged ${avg.toFixed(1)}% and were ${rising ? "rising" : "falling"} over the period. ${
        r < -0.4
          ? "Higher borrowing costs visibly weighed on buyer affordability and tempered gains."
          : r < -0.1
            ? "Some rate pressure, though other demand factors partially offset the drag."
            : "Rate levels were low enough that appreciation persisted despite upward movement."
      }`;
    }
    case "10-Year Treasury Yield": {
      return `The 10yr yield averaged ${avg.toFixed(2)}% and was ${rising ? "rising" : "falling"} over the period. ${
        r < -0.4
          ? "Rising yields tightened financing conditions and correlated with price moderation."
          : r < -0.1
            ? "Yield movements had some dampening effect on housing through mortgage rates."
            : "Yields moved without a clear directional relationship to appreciation this period."
      }`;
    }
    case "Price-to-Income Ratio": {
      return `Price/income averaged ${avg.toFixed(1)}× and was ${rising ? "expanding" : "compressing"}. ${
        r > 0.4
          ? "Prices outpaced incomes throughout — demand held up despite stretched affordability."
          : r < -0.4
            ? "As affordability compressed, price growth slowed — a natural ceiling forming."
            : "Affordability moved without a strong directional link to price gains this period."
      }`;
    }
    case "Median Income": {
      return `Median income averaged $${avg.toFixed(0)}k and was ${rising ? "rising" : "flat or declining"}. ${
        r > 0.3
          ? "Income growth aligned with appreciation — fundamentals supported demand."
          : r < -0.3
            ? "Prices outpaced income growth — real affordability eroded over the period."
            : "Income growth was steady but not a leading driver of price movements this period."
      }`;
    }
    case "Unemployment Rate": {
      return `Unemployment averaged ${avg.toFixed(1)}% and was ${rising ? "rising" : "falling"} over the period. ${
        r < -0.4
          ? "A tightening labor market strongly supported buyer confidence and purchasing power."
          : r < -0.1
            ? "Modest employment gains provided some demand support for housing."
            : r > 0.4
              ? "Rising unemployment coincided with price pressure — other demand factors dominated."
              : "Employment conditions had a limited direct relationship with price trends this period."
      }`;
    }
    case "Building Permits (000s)": {
      return `Single-family permits averaged ${Math.round(avg)}k/yr — ${rising ? "expanding" : "contracting"} supply pipeline. ${
        r > 0.4
          ? "Permit growth tracked appreciation — builders responding to, not ahead of, demand surges."
          : r < -0.4
            ? "Permit pullback coincided with price acceleration — supply deficit amplified gains."
            : "Permit activity had a mixed relationship with price trends, suggesting lagged supply response."
      }`;
    }
    case "Existing Home Sales (M)": {
      return `Existing home sales averaged ${avg.toFixed(2)}M units/yr and were ${rising ? "trending up" : "trending down"}. ${
        r > 0.4
          ? "High transaction volume tracked appreciation — active markets signal strong demand."
          : r < -0.4
            ? "Sales fell as prices rose — affordability constraints began reducing buyer participation."
            : "Transaction volume had a mixed relationship with price levels this period."
      }`;
    }
    case "Net HH Formation (000s)": {
      return `Net household formation averaged ${Math.round(avg)}k/yr — ${avg > 1200 ? "above" : "near or below"} the ~1.2M annual baseline needed to absorb supply. ${
        r > 0.3
          ? "Strong formation drove structural demand — new households competing for limited inventory."
          : r < -0.3
            ? "Weak formation reduced demand absorption despite supply constraints."
            : "Formation rates were relatively stable and not a leading price driver this period."
      }`;
    }
    case "Consumer Confidence": {
      return `Consumer confidence averaged ${Math.round(avg)} (long-run avg ≈ 100) and was ${rising ? "improving" : "declining"}. ${
        r > 0.4
          ? "Rising confidence closely tracked appreciation — buyer optimism fueled demand."
          : r < -0.4
            ? "Confidence erosion coincided with price softening — uncertainty weighed on purchase decisions."
            : "Sentiment had a mixed relationship with price trends, suggesting other factors dominated."
      }`;
    }
    case "Fed Funds Rate": {
      return `The fed funds rate averaged ${avg.toFixed(2)}% and was ${rising ? "rising (tightening)" : "falling (easing)"}. ${
        r < -0.4
          ? "Fed tightening correlated with price cooling — monetary policy was a meaningful headwind."
          : r < -0.1
            ? "Rising rates provided moderate drag, though housing demand partially absorbed the pressure."
            : r > 0.3
              ? "Low rates during this window supported appreciation — cheap money fueled buyer demand."
              : "Rate policy had limited direct correlation with price movements — other factors dominated."
      }`;
    }
    case "MCAI": {
      const note =
        avg == null || pairs.length < 5
          ? " (limited data — MBA index only available from 2012)"
          : "";
      return `Mortgage credit availability averaged ${avg != null ? Math.round(avg) : "N/A"} over this period${note}. ${
        r > 0.3
          ? "Looser credit conditions aligned with appreciation — easier qualifying boosted demand."
          : r < -0.3
            ? "Tightening credit standards coincided with price softening — fewer qualified buyers."
            : "Credit availability had a mixed relationship with price trends this period."
      }`;
    }
    case "Foreclosure Rate": {
      return `Foreclosures averaged ${avg.toFixed(1)}% of mortgages and were ${rising ? "rising" : "falling"}. ${
        r < -0.4
          ? "Falling foreclosures removed distressed supply pressure and supported price recovery."
          : r > 0.4
            ? "Elevated foreclosures coincided with appreciation — a lagged crisis-recovery dynamic."
            : "Foreclosure levels had a limited direct relationship with price trends this period."
      }`;
    }
    case "Homeownership Rate": {
      return `Homeownership averaged ${avg.toFixed(1)}% and was ${rising ? "expanding" : "contracting"}. ${
        r > 0.3
          ? "Rising ownership aligned with appreciation — broad participation supported demand."
          : r < -0.3
            ? "Falling ownership coincided with price gains — investors and rentals displacing owner-occupants."
            : "Ownership rates were relatively stable and not a strong price driver this period."
      }`;
    }
    default:
      return "";
  }
};

const getProj = (field, yr, scenario) => {
  if (yr < PROJ_START) return getBM(field, yr);
  const arr = PROJ[scenario]?.[field];
  return arr ? (arr[yr - PROJ_START] ?? null) : null;
};

const pearsonR = (xs, ys) => {
  const pairs = xs
    .map((x, i) => [x, ys[i]])
    .filter(([x, y]) => x != null && y != null);
  if (pairs.length < 2) return 0;
  const n = pairs.length;
  const mx = pairs.reduce((s, [x]) => s + x, 0) / n;
  const my = pairs.reduce((s, [, y]) => s + y, 0) / n;
  const num = pairs.reduce((s, [x, y]) => s + (x - mx) * (y - my), 0);
  const den = Math.sqrt(
    pairs.reduce((s, [x]) => s + (x - mx) ** 2, 0) *
      pairs.reduce((s, [, y]) => s + (y - my) ** 2, 0),
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
  const nearestDate =
    Object.keys(byDate)
      .filter((d) => d !== "unknown")
      .sort()[0] ?? "unknown";
  const cohort = byDate[nearestDate] ?? markets;

  const parsed = cohort
    .map((m) => {
      const match = m.ticker.match(/-T(-?[\d.]+)$/);
      if (!match) return null;
      // Coerce to numbers — Kalshi API may return strings for bid/ask/last
      const bid = parseFloat(m.yes_bid);
      const ask = parseFloat(m.yes_ask);
      const lp = parseFloat(m.last_price);
      const spread = ask - bid;
      const price =
        spread > 0.25 && !isNaN(lp) && lp > 0 ? lp : (bid + ask) / 2;
      if (isNaN(price)) return null;
      return { threshold: parseFloat(match[1]), price };
    })
    .filter(Boolean)
    .sort((a, b) => a.threshold - b.threshold);

  if (parsed.length === 0) return null;

  // Find where price crosses 0.50 (markets are "above X?" so probability descends with threshold)
  for (let i = 0; i < parsed.length - 1; i++) {
    const lo = parsed[i],
      hi = parsed[i + 1];
    if (lo.price >= 0.5 && hi.price < 0.5) {
      const t = (lo.price - 0.5) / (lo.price - hi.price);
      return {
        value: lo.threshold + t * (hi.threshold - lo.threshold),
        prefix: "",
        closeDate: nearestDate,
        cohortCount: cohort.length,
      };
    }
  }
  if (parsed[parsed.length - 1].price >= 0.5)
    return {
      value: parsed[parsed.length - 1].threshold,
      prefix: ">",
      closeDate: nearestDate,
      cohortCount: cohort.length,
    };
  return {
    value: parsed[0].threshold,
    prefix: "<",
    closeDate: nearestDate,
    cohortCount: cohort.length,
  };
};

// Generates a 1-2 sentence validation note comparing Kalshi consensus to the model's outlook
const kalshiValidationNote = (kalshiData, mktTone) => {
  if (!kalshiData?.series) return null;

  const getMedian = (series) =>
    kalshiMedian(kalshiData.series[series]?.markets ?? []);

  const mtg = getMedian("KXMORTGAGERATE");
  const fed = getMedian("KXFED");
  const cpi = getMedian("KXCPIYOY");
  const eh = getMedian("KXEHSALES");
  const hv = getMedian("KXUSHOMEVAL");

  // Score each available signal: +1 = housing positive, -1 = headwind, 0 = neutral
  const signals = [];
  if (mtg) signals.push(mtg.value < 6.5 ? 1 : mtg.value < 7.0 ? 0 : -1);
  if (fed) signals.push(fed.value < 4.0 ? 1 : fed.value < 4.75 ? 0 : -1);
  if (cpi) signals.push(cpi.value < 2.8 ? 1 : cpi.value < 3.3 ? 0 : -1);
  if (eh) signals.push(eh.value > 4.3 ? 1 : eh.value > 3.9 ? 0 : -1);
  if (hv) signals.push(hv.value > 362000 ? 1 : hv.value > 355000 ? 0 : -1);

  if (signals.length === 0) return null;

  const avg = signals.reduce((a, b) => a + b, 0) / signals.length;
  const modelFavorable = mktTone.includes("favorable");
  const modelChallenging = mktTone.includes("challenging");
  const kalshiFavorable = avg > 0.2;
  const kalshiChallenging = avg < -0.2;
  const aligned =
    (modelFavorable && kalshiFavorable) ||
    (modelChallenging && kalshiChallenging) ||
    (!modelFavorable &&
      !modelChallenging &&
      !kalshiFavorable &&
      !kalshiChallenging);

  // Build a short list of the most notable signals to name-drop
  const notable = [];
  if (mtg) notable.push(`mortgage rates ${mtg.prefix}${mtg.value.toFixed(2)}%`);
  if (eh) notable.push(`existing sales ${eh.prefix}${eh.value.toFixed(2)}M`);
  if (cpi) notable.push(`CPI at ${cpi.prefix}${cpi.value.toFixed(1)}%`);
  if (hv)
    notable.push(`home values ${hv.prefix}$${Math.round(hv.value / 1000)}k`);

  const notableStr = notable.slice(0, 3).join(", ");

  const kalshiColor =
    avg > 0.2 ? C.greenLight : avg < -0.2 ? "#e57373" : C.muted;
  const em = (text) => <strong style={{ color: kalshiColor }}>{text}</strong>;
  if (aligned) {
    return (
      <>
        {em("Kalshi prediction markets broadly validate this outlook")} —
        consensus prices {notableStr}, consistent with a {mktTone} environment.
      </>
    );
  } else if (kalshiFavorable && !modelFavorable) {
    return (
      <>
        {em(
          "Kalshi prediction markets offer a more optimistic cross-check than the model signals",
        )}{" "}
        — consensus prices {notableStr}, suggesting potential upside relative to
        the current {mktTone} assessment.
      </>
    );
  } else if (kalshiChallenging && !modelChallenging) {
    return (
      <>
        {em("Kalshi prediction markets offer a cautionary cross-check")} —
        consensus prices {notableStr}, suggesting more headwind than the current{" "}
        {mktTone} assessment implies.
      </>
    );
  } else {
    return (
      <>
        {em("Kalshi prediction markets offer a mixed cross-check")} —{" "}
        {notableStr} — partially supporting and partially challenging the
        current {mktTone} outlook.
      </>
    );
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
  const fedVal = val("KXFED");
  const mortVal = val("KXMORTGAGERATE");
  if (has("KXFED") || has("KXMORTGAGERATE")) {
    const fedPart = has("KXFED")
      ? `Fed Funds at ${pfx("KXFED")}${fedVal.toFixed(2)}%`
      : null;
    const mortPart = has("KXMORTGAGERATE")
      ? `30-yr mortgage rate ${pfx("KXMORTGAGERATE")}${mortVal.toFixed(2)}%`
      : null;
    const rateDesc = [fedPart, mortPart].filter(Boolean).join(" and ");
    const easing = fedVal != null && fedVal < 4.25;
    const mortTight = mortVal != null && mortVal >= 6.5;
    sentences.push(
      `Markets imply ${rateDesc} — ${easing ? "suggesting continued Fed easing" : "with rates holding near current levels"}${mortTight ? ", keeping affordability under pressure" : ", offering modest affordability improvement for buyers"}.`,
    );
  }

  // ── Inflation ──
  const cpi = val("KXCPIYOY");
  if (has("KXCPIYOY")) {
    const cpiDesc =
      cpi > 3.5
        ? "well above the Fed's 2% target, limiting room for aggressive cuts"
        : cpi > 2.8
          ? "still above the Fed's 2% target, supporting a gradual easing path"
          : "approaching the Fed's 2% target, consistent with continued normalization";
    sentences.push(
      `CPI inflation consensus is ${pfx("KXCPIYOY")}${cpi.toFixed(1)}% YoY — ${cpiDesc}.`,
    );
  }

  // ── Labor market ──
  const u3 = val("KXU3");
  if (has("KXU3")) {
    const laborDesc =
      u3 < 4.5
        ? "a still-healthy labor market supporting buyer income and demand"
        : u3 < 5.5
          ? "a softening labor market that may begin to weigh on buyer confidence"
          : "a deteriorating labor market that poses a meaningful demand headwind";
    sentences.push(
      `Unemployment is projected at ${pfx("KXU3")}${u3.toFixed(1)}%, indicating ${laborDesc}.`,
    );
  }

  // ── Transaction activity ──
  const ehVal = val("KXEHSALES");
  const nhVal = val("KXNHSALES");
  const stVal = val("KXHOUSINGSTART");
  const activityParts = [];
  if (has("KXEHSALES"))
    activityParts.push(
      `existing sales ${pfx("KXEHSALES")}${ehVal.toFixed(2)}M`,
    );
  if (has("KXNHSALES"))
    activityParts.push(
      `new home sales ${pfx("KXNHSALES")}${Math.round(nhVal)}k`,
    );
  if (has("KXHOUSINGSTART"))
    activityParts.push(`starts ${pfx("KXHOUSINGSTART")}${stVal.toFixed(3)}M`);
  if (activityParts.length > 0) {
    const weak =
      (ehVal != null && ehVal < 4.2) || (nhVal != null && nhVal < 650);
    sentences.push(
      `Housing activity consensus: ${activityParts.join(", ")} — ${weak ? "pointing to continued transaction weakness driven by the lock-in effect and affordability constraints" : "suggesting a gradual pickup in market activity"}.`,
    );
  }

  // ── Home value ──
  const hvVal = val("KXUSHOMEVAL");
  if (has("KXUSHOMEVAL")) {
    const hvDesc =
      hvVal > 365000
        ? "reflecting continued price resilience despite affordability headwinds"
        : hvVal > 355000
          ? "suggesting modest but positive home value appreciation"
          : "implying flat-to-declining home values in the near term";
    sentences.push(
      `The Zillow ZHVI is priced at ${pfx("KXUSHOMEVAL")}$${Math.round(hvVal / 1000)}k for March 2026, ${hvDesc}.`,
    );
  }

  return sentences.length > 0 ? sentences.join(" ") : null;
};

// ─── County Choropleth Map ─────────────────────────────────────────────────
const GEO_URL = "https://cdn.jsdelivr.net/npm/us-atlas@3/counties-10m.json";

// Tier-based discrete fills — lead markets pop amber, gradient fades to grey
const TIER_FILL = {
  lead_market: "#10b981", // emerald green
  priority_market: "#1a3a5c", // deep navy
  watchlist: "#7fa8cc", // medium blue-grey
  deprioritized: "#dce4ec", // near-background
};

const CountyMap = React.memo(
  ({
    counties,
    selectedFips,
    onSelect,
    thesis,
    zoom: externalZoom,
    center: externalCenter,
    onCentroidReady,
  }) => {
    const [tooltip, setTooltip] = React.useState(null);
    const [topoData, setTopoData] = React.useState(null);
    const [centroidMap, setCentroidMap] = React.useState({});
    const [userZoom, setUserZoom] = React.useState(1);

    // Reset userZoom when external center changes (search navigation)
    React.useEffect(() => {
      setUserZoom(1);
    }, [externalCenter]);

    const effectiveZoom = (externalZoom || 1) * userZoom;
    const effectiveCenter = externalCenter || [-96, 38];

    // Refs so handlers always have the latest values without invalidating memoized JSX
    const onSelectRef = React.useRef(onSelect);
    const setTooltipRef = React.useRef(setTooltip);
    React.useEffect(() => {
      onSelectRef.current = onSelect;
    }, [onSelect]);

    const fipsMap = React.useMemo(() => {
      const m = {};
      if (counties)
        counties.forEach((c) => {
          m[c.fips] = c;
        });
      return m;
    }, [counties]);

    React.useEffect(() => {
      fetch(GEO_URL)
        .then((r) => r.json())
        .then((data) => {
          setTopoData(data);
          const features = topoFeature(data, data.objects.counties).features;
          const cmap = {};
          features.forEach((f) => {
            try {
              const coords = [];
              const collect = (arr) => {
                if (typeof arr[0] === "number") coords.push(arr);
                else arr.forEach(collect);
              };
              collect(f.geometry.coordinates);
              cmap[f.id] = [
                coords.reduce((s, c) => s + c[0], 0) / coords.length,
                coords.reduce((s, c) => s + c[1], 0) / coords.length,
              ];
            } catch {}
          });
          setCentroidMap(cmap);
          if (onCentroidReady) onCentroidReady(cmap);
        })
        .catch(() => {});
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Memoized base layer — only recomputes when topoData or fipsMap changes (once after load).
    // selectedFips is intentionally excluded: the pin marker handles selection, not polygon fills.
    const baseLayer = React.useMemo(
      () => (
        <Geographies geography={topoData || GEO_URL}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const fips = geo.id;
              const county = fipsMap[fips];
              const fill = county?.tier
                ? (TIER_FILL[county.tier] ?? "#dde3ea")
                : "#dde3ea";
              const hoverFill = county ? "#f59e0b" : fill;
              return (
                <Geography
                  key={fips}
                  geography={geo}
                  fill={fill}
                  stroke="#fff"
                  strokeWidth={0.3}
                  style={{
                    default: { outline: "none" },
                    hover: {
                      outline: "none",
                      fill: hoverFill,
                      cursor: county ? "pointer" : "default",
                    },
                    pressed: { outline: "none" },
                  }}
                  onClick={() => {
                    if (county) onSelectRef.current(fips, county);
                  }}
                  onMouseEnter={(evt) => {
                    if (!county) return;
                    setTooltipRef.current({
                      name: county.name,
                      state: county.state,
                      composite: county.composite,
                      tier: county.tier,
                      rank: county.rank,
                      x: evt.clientX,
                      y: evt.clientY,
                    });
                  }}
                  onMouseMove={(evt) => {
                    setTooltipRef.current((t) =>
                      t ? { ...t, x: evt.clientX, y: evt.clientY } : null,
                    );
                  }}
                  onMouseLeave={() => setTooltipRef.current(null)}
                />
              );
            })
          }
        </Geographies>
      ),
      [topoData, fipsMap],
    ); // eslint-disable-line react-hooks/exhaustive-deps

    const selCentroid = selectedFips ? centroidMap[selectedFips] : null;

    return (
      <Box
        sx={{
          position: "relative",
          background: "#f5f7fa",
          borderRadius: 1,
          overflow: "hidden",
        }}
      >
        {/* Zoom controls */}
        <Box
          sx={{
            position: "absolute",
            top: 6,
            left: 8,
            zIndex: 10,
            display: "flex",
            gap: 0.5,
          }}
        >
          {[
            ["+", () => setUserZoom((z) => Math.min(z * 1.6, 20))],
            ["−", () => setUserZoom((z) => Math.max(z / 1.6, 0.5))],
            ["⊙", () => setUserZoom(1)],
          ].map(([label, fn]) => (
            <button
              key={label}
              onClick={fn}
              style={{
                width: 22,
                height: 22,
                fontSize: 12,
                fontWeight: 700,
                border: "1px solid rgba(0,0,0,0.15)",
                borderRadius: 3,
                background: "rgba(255,255,255,0.85)",
                cursor: "pointer",
                fontFamily: "'Inter',sans-serif",
                lineHeight: 1,
                padding: 0,
              }}
            >
              {label}
            </button>
          ))}
        </Box>

        <ComposableMap
          projection="geoAlbersUsa"
          style={{ width: "100%", height: "auto" }}
          projectionConfig={{ scale: 900 }}
        >
          <ZoomableGroup
            center={effectiveCenter}
            zoom={effectiveZoom}
            minZoom={1}
            maxZoom={40}
          >
            {baseLayer}

            {/* Pin marker — only this re-renders on selection change */}
            {selCentroid && (
              <Marker coordinates={selCentroid}>
                <circle
                  r={5 / effectiveZoom}
                  fill="#f97316"
                  stroke="#fff"
                  strokeWidth={1.5 / effectiveZoom}
                />
                <circle
                  r={9 / effectiveZoom}
                  fill="none"
                  stroke="#f97316"
                  strokeWidth={1 / effectiveZoom}
                  opacity={0.5}
                />
              </Marker>
            )}
          </ZoomableGroup>
        </ComposableMap>

        {/* Tooltip */}
        {tooltip && (
          <Box
            sx={{
              position: "fixed",
              pointerEvents: "none",
              zIndex: 9999,
              left: tooltip.x + 12,
              top: tooltip.y - 10,
              background: C.navy,
              color: C.white,
              borderRadius: 1,
              px: 1.25,
              py: 0.75,
              boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
            }}
          >
            <Typography sx={{ fontSize: 11, fontWeight: 700 }}>
              {tooltip.name}, {tooltip.state}
            </Typography>
            <Typography sx={{ fontSize: 10, color: "rgba(255,255,255,0.75)" }}>
              Score {tooltip.composite?.toFixed(1)} · #{tooltip.rank} ·{" "}
              {tooltip.tier?.replace("_", " ")}
            </Typography>
          </Box>
        )}

        {/* Legend */}
        <Box
          sx={{
            position: "absolute",
            bottom: 8,
            right: 10,
            display: "flex",
            flexDirection: "column",
            gap: 0.4,
            alignItems: "flex-end",
          }}
        >
          {[
            ["Lead Market", TIER_FILL.lead_market],
            ["Priority", TIER_FILL.priority_market],
            ["Watchlist", TIER_FILL.watchlist],
            ["Deprioritized", TIER_FILL.deprioritized],
          ].map(([label, color]) => (
            <Box
              key={label}
              sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
            >
              <Typography sx={{ fontSize: 9, color: C.muted }}>
                {label}
              </Typography>
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: "2px",
                  background: color,
                  border: `1px solid ${C.border}`,
                }}
              />
            </Box>
          ))}
        </Box>
      </Box>
    );
  },
);

// ─── Ground Score Search Box ─────────────────────────────────────────────────
// ─── City dimension configs (mirrors pipeline ACTIVATION/EXPANSION_CITY_DIMS) ──
const NEOPOLI_DIMS_CONFIG = {
  entry_cost: { weight: 25, metrics: [["zhvi_latest", "lower_better"]] },
  distress_depth: {
    weight: 30,
    metrics: [
      ["poverty_rate", "higher_better"],
      ["unemployment_rate", "higher_better"],
      ["median_hhi", "lower_better"],
    ],
  },
  housing_supply: { weight: 15, metrics: [["vacancy_rate", "higher_better"]] },
  labor_participation: { weight: 15, metrics: [["lfpr", "higher_better"]] },
  metro_access: {
    weight: 15,
    metrics: [["drive_min_nearest_metro", "lower_better"]],
  },
};
const OPPORTUNITY_DIMS_CONFIG = {
  entry_cost: { weight: 20, metrics: [["zhvi_latest", "lower_better"]] },
  buyer_quality: {
    weight: 30,
    metrics: [
      ["median_hhi", "higher_better"],
      ["poverty_rate", "lower_better"],
      ["unemployment_rate", "lower_better"],
    ],
  },
  housing_momentum: {
    weight: 20,
    metrics: [["zhvi_growth_1yr", "higher_better"]],
  },
  labor_participation: { weight: 15, metrics: [["lfpr", "higher_better"]] },
  metro_access: {
    weight: 15,
    metrics: [["drive_min_nearest_metro", "lower_better"]],
  },
};

// ─── Browser-side city scorer ─────────────────────────────────────────────────
const PLACES_INDEX_URL =
  "https://ampledge-fund.s3.us-east-1.amazonaws.com/ground-score/places-index.json.gz";
const DEEP_DIVES_URL =
  "https://ampledge-fund.s3.us-east-1.amazonaws.com/ground-score/deep_dives.json";
const DEEP_DIVE_API_URL =
  "https://3uzi0rrxol.execute-api.us-east-1.amazonaws.com/deep-dive";
const ACS_BASE = "https://api.census.gov/data/2022/acs/acs5";
const ACS_CENSUS_KEY = process.env.REACT_APP_CENSUS_API_KEY || "";

// Metric keys used for browser-side city scoring (must exist in metric_bounds)
const CITY_SCORE_METRICS = [
  "zhvi_latest",
  "zhvi_growth_1yr",
  "poverty_rate",
  "median_hhi",
  "vacancy_rate",
  "unemployment_rate",
  "lfpr",
  "drive_min_nearest_metro",
];

function _normalizeValue(value, bound) {
  if (value == null || bound == null) return null;
  const { min, max, lower_better } = bound;
  if (max === min) return 50;
  let score = ((value - min) / (max - min)) * 100;
  score = Math.max(0, Math.min(100, score));
  return lower_better ? 100 - score : score;
}

function _scoreDims(normalized, dimConfig) {
  const dims = {};
  for (const [dimId, cfg] of Object.entries(dimConfig)) {
    const sub = cfg.metrics
      .map(([key]) => normalized[key])
      .filter((v) => v != null);
    if (sub.length) dims[dimId] = sub.reduce((a, b) => a + b, 0) / sub.length;
  }
  return dims;
}

function _compositeFromDims(dims, dimConfig) {
  let weightedSum = 0,
    totalWeight = 0;
  for (const [dimId, cfg] of Object.entries(dimConfig)) {
    if (dims[dimId] != null) {
      weightedSum += dims[dimId] * cfg.weight;
      totalWeight += cfg.weight;
    }
  }
  return totalWeight > 0
    ? Math.round((weightedSum / totalWeight) * 10) / 10
    : null;
}

async function scoreCityBrowserSide(place, metricBounds, dimConfig) {
  // place: {place_fips, state_fips, lat, lon, zhvi_latest?, zhvi_growth_1yr?}
  const sfp = place.state_fips;
  const pfp = place.place_fips?.substring(2); // 5-digit place code
  if (!sfp || !pfp) return null;

  try {
    const vars =
      "B17001_002E,B17001_001E,B19013_001E,B25002_003E,B25002_001E,B23025_005E,B23025_003E,B23025_002E,B23025_001E";
    const url = `${ACS_BASE}?get=${vars}&for=place:${pfp}&in=state:${sfp}${ACS_CENSUS_KEY ? `&key=${ACS_CENSUS_KEY}` : ""}`;
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const rows = await resp.json();
    if (rows.length < 2) return null;
    const [header, row] = [rows[0], rows[1]];
    const d = Object.fromEntries(header.map((k, i) => [k, row[i]]));

    const pov_num = parseFloat(d.B17001_002E) || 0;
    const pov_den = parseFloat(d.B17001_001E) || 1;
    const vac_num = parseFloat(d.B25002_003E) || 0;
    const vac_den = parseFloat(d.B25002_001E) || 1;
    const une_num = parseFloat(d.B23025_005E) || 0;
    const une_den = parseFloat(d.B23025_003E) || 1;
    const lf_num = parseFloat(d.B23025_002E) || 0;
    const lf_den = parseFloat(d.B23025_001E) || 1;
    const mhhi = parseFloat(d.B19013_001E) || null;

    // Haversine drive time to nearest major metro (same function as pipeline)
    let drive_min = null;
    if (place.lon != null && place.lat != null) {
      let minDist = Infinity;
      // We only have a few key metros to check against — use a condensed list
      const METROS = [
        [-74.006, 40.714],
        [-118.243, 34.052],
        [-87.629, 41.878],
        [-96.797, 32.776],
        [-95.37, 29.76],
        [-80.192, 25.775],
        [-77.037, 38.907],
        [-75.165, 39.952],
        [-84.388, 33.749],
        [-71.059, 42.36],
        [-93.265, 44.978],
        [-122.419, 37.775],
        [-112.074, 33.448],
        [-117.374, 33.98],
        [-122.332, 47.606],
        [-83.048, 42.332],
        [-94.579, 39.1],
        [-117.161, 32.715],
        [-82.458, 27.947],
        [-104.99, 39.739],
        [-80.843, 35.227],
        [-122.681, 45.523],
        [-121.494, 38.581],
        [-90.2, 38.627],
        [-81.379, 28.538],
        [-79.996, 40.441],
        [-115.137, 36.175],
        [-76.612, 39.29],
        [-86.158, 39.791],
        [-82.999, 39.961],
      ];
      for (const [mlon, mlat] of METROS) {
        const R = 6371;
        const dLat = ((mlat - place.lat) * Math.PI) / 180;
        const dLon = ((mlon - place.lon) * Math.PI) / 180;
        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos((place.lat * Math.PI) / 180) *
            Math.cos((mlat * Math.PI) / 180) *
            Math.sin(dLon / 2) ** 2;
        const km = R * 2 * Math.asin(Math.sqrt(a));
        if (km < minDist) minDist = km;
      }
      drive_min = (minDist / 80) * 60; // km at 80 km/h → minutes
    }

    const raw = {
      poverty_rate: pov_den > 0 ? (100 * pov_num) / pov_den : null,
      median_hhi: mhhi,
      vacancy_rate: vac_den > 0 ? (100 * vac_num) / vac_den : null,
      unemployment_rate: une_den > 0 ? (100 * une_num) / une_den : null,
      lfpr: lf_den > 0 ? (100 * lf_num) / lf_den : null,
      zhvi_latest: place.zhvi_latest || null,
      zhvi_growth_1yr: place.zhvi_growth_1yr || null,
      drive_min_nearest_metro: drive_min,
    };

    const normalized = {};
    for (const key of CITY_SCORE_METRICS) {
      normalized[key] = _normalizeValue(raw[key], metricBounds?.[key]);
    }

    const dims = _scoreDims(normalized, dimConfig);
    const composite = _compositeFromDims(dims, dimConfig);
    if (composite == null) return null;

    return { dims, composite, metrics: raw, scored_on_demand: true };
  } catch {
    return null;
  }
}

// ─── Ground Score Search Box ──────────────────────────────────────────────────
const SearchBox = ({
  groundScoreData,
  onSelectCounty,
  onSelectCity,
  placesIndex,
}) => {
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState([]);
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const ref = React.useRef(null);

  // Build county index from groundScoreData (pre-scored counties)
  const countyIndex = React.useMemo(() => {
    if (!groundScoreData) return [];
    const items = [];
    const addedFips = new Set();
    for (const thesis of ["activation", "expansion"]) {
      for (const c of groundScoreData[thesis] || []) {
        if (!addedFips.has(c.fips)) {
          addedFips.add(c.fips);
          items.push({
            type: "county",
            label: `${c.name}, ${c.state}`,
            sub: `#${c.rank} · ${c.composite?.toFixed(1)}`,
            fips: c.fips,
            thesis,
            rank: c.rank,
          });
        }
      }
    }
    return items;
  }, [groundScoreData]);

  // Build pre-scored city lookup {place_fips → city data}
  const scoredCityMap = React.useMemo(() => {
    const map = {};
    for (const thesis of ["activation", "expansion"]) {
      for (const c of groundScoreData?.[thesis] || []) {
        for (const city of c.cities || []) {
          map[city.place_fips] = {
            ...city,
            county_fips: c.fips,
            county_name: c.name,
            county_state: c.state,
            thesis,
          };
        }
      }
    }
    return map;
  }, [groundScoreData]);

  // ZIP → county lookup via Census geocoder
  const lookupZip = React.useCallback(
    async (zip) => {
      setLoading(true);
      try {
        const url = `https://geocoding.geo.census.gov/geocoder/geographies/address?street=1+Main+St&zip=${zip}&benchmark=Public_AR_Current&vintage=Current_Current&layers=Counties&format=json`;
        const r = await fetch(url);
        const d = await r.json();
        const matches = d?.result?.addressMatches || [];
        const zipResults = [];
        for (const m of matches) {
          for (const co of m.geographies?.Counties || []) {
            const fips = co.GEOID?.substring(0, 5);
            if (!fips) continue;
            const found = countyIndex.find((i) => i.fips === fips);
            zipResults.push(
              found
                ? { ...found, sub: `ZIP ${zip} · ` + found.sub }
                : {
                    type: "county",
                    label: co.NAME,
                    sub: `ZIP ${zip}`,
                    fips,
                    thesis: null,
                  },
            );
          }
        }
        setResults(
          zipResults.length
            ? zipResults
            : [{ type: "none", label: `No results for ZIP ${zip}` }],
        );
      } catch {
        setResults([{ type: "none", label: "ZIP lookup failed" }]);
      }
      setLoading(false);
    },
    [countyIndex],
  );

  React.useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      setOpen(false);
      return;
    }
    if (/^\d{5}$/.test(q)) {
      setOpen(true);
      lookupZip(q);
      return;
    }

    const ql = q.toLowerCase();

    // Counties
    const countyMatches = countyIndex.filter(
      (c) => c.label.toLowerCase().includes(ql) || c.fips.startsWith(ql),
    );

    // Cities — from national places index (if loaded) or fall back to scored-only
    let cityMatches = [];
    const placeSource = placesIndex || [];
    if (placeSource.length) {
      cityMatches = placeSource
        .filter(
          (p) =>
            p.name?.toLowerCase().includes(ql) ||
            (p.name + ", " + p.state).toLowerCase().includes(ql),
        )
        .slice(0, 30)
        .map((p) => {
          const scored = scoredCityMap[p.place_fips];
          const countyEntry = countyIndex.find((c) => c.fips === p.county_fips);
          return {
            type: "city",
            label: p.name,
            sub: `${countyEntry?.label || `${p.county_fips}, ${p.state}`}${scored ? ` · Score ${scored.composite?.toFixed(1)}` : ""}`,
            place_fips: p.place_fips,
            county_fips: p.county_fips,
            state: p.state,
            lat: p.lat,
            lon: p.lon,
            zhvi_latest: p.zhvi_latest,
            zhvi_growth_1yr: p.zhvi_growth_1yr,
            state_fips: p.state_fips,
            pre_scored: !!scored,
            thesis: scored?.thesis || "activation",
            rank: scored?.county_rank || 9999,
          };
        });
    }

    // Merge: counties first, then cities; sort by starts-with then rank
    const all = [...countyMatches, ...cityMatches];
    all.sort((a, b) => {
      const al = a.label.toLowerCase(),
        bl = b.label.toLowerCase();
      const aS = al.startsWith(ql) ? 0 : 1,
        bS = bl.startsWith(ql) ? 0 : 1;
      if (aS !== bS) return aS - bS;
      // Counties before cities when equal
      if (a.type !== b.type) return a.type === "county" ? -1 : 1;
      return (a.rank || 9999) - (b.rank || 9999);
    });

    setResults(all.slice(0, 14));
    setOpen(all.length > 0);
  }, [query, countyIndex, placesIndex, scoredCityMap, lookupZip]);

  // Close on outside click
  React.useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (item) => {
    if (item.type === "none") return;
    setQuery("");
    setResults([]);
    setOpen(false);
    if (item.type === "county" && item.fips) {
      onSelectCounty(item.fips);
    } else if (item.type === "city") {
      onSelectCity(item);
    }
  };

  return (
    <Box ref={ref} sx={{ position: "relative", width: 225 }}>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          border: `1px solid ${C.border}`,
          borderRadius: 1,
          background: "#fff",
          px: 1.25,
          gap: 0.75,
        }}
      >
        <span style={{ fontSize: 13, color: C.muted }}>⌕</span>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => {
            if (results.length) setOpen(true);
          }}
          placeholder="Search county, city, state or ZIP…"
          style={{
            border: "none",
            outline: "none",
            fontSize: 12,
            width: "100%",
            padding: "7px 0",
            fontFamily: "'Inter',sans-serif",
            color: C.charcoal,
            background: "transparent",
          }}
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setResults([]);
              setOpen(false);
            }}
            style={{
              border: "none",
              background: "none",
              cursor: "pointer",
              color: C.muted,
              fontSize: 14,
              padding: "0 2px",
              lineHeight: 1,
            }}
          >
            ×
          </button>
        )}
      </Box>
      {open && (
        <Box
          sx={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: "#fff",
            border: `1px solid ${C.border}`,
            borderRadius: 1,
            boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
            zIndex: 200,
            maxHeight: 340,
            overflowY: "auto",
          }}
        >
          {loading && (
            <Box sx={{ px: 1.5, py: 1.25 }}>
              <Typography sx={{ fontSize: 11, color: C.muted }}>
                Looking up ZIP…
              </Typography>
            </Box>
          )}
          {!loading &&
            results.map((item, i) => (
              <Box
                key={i}
                onClick={() => handleSelect(item)}
                sx={{
                  px: 1.5,
                  py: 1,
                  borderBottom: `1px solid ${C.border}`,
                  cursor: item.type === "none" ? "default" : "pointer",
                  "&:hover": {
                    background: item.type === "none" ? "transparent" : C.bg,
                  },
                  "&:last-child": { borderBottom: "none" },
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 700,
                      textTransform: "uppercase",
                      color: item.type === "city" ? C.blue : C.navy,
                      background:
                        item.type === "city" ? C.blue + "15" : C.navy + "12",
                      borderRadius: 3,
                      padding: "1px 5px",
                      letterSpacing: "0.05em",
                      flexShrink: 0,
                    }}
                  >
                    {item.type === "city"
                      ? "City"
                      : item.type === "none"
                        ? ""
                        : "County"}
                  </span>
                  <Typography
                    sx={{ fontSize: 12, fontWeight: 600, color: C.charcoal }}
                  >
                    {item.label}
                  </Typography>
                </Box>
                {item.sub && (
                  <Typography
                    sx={{ fontSize: 10, color: C.muted, mt: 0.2, ml: 0.5 }}
                  >
                    {item.sub}
                  </Typography>
                )}
              </Box>
            ))}
          {!loading && !placesIndex && (
            <Box
              sx={{
                px: 1.5,
                py: 0.75,
                borderTop: `1px solid ${C.border}`,
                background: C.bg,
              }}
            >
              <Typography sx={{ fontSize: 9, color: C.muted }}>
                Loading city index…
              </Typography>
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};

// ─── City Dot Map (zoomed county view) ───────────────────────────────────────
const CITY_SCORE_COLOR = (composite) => {
  if (composite == null) return "#94a3b8";
  if (composite >= 66) return "#10b981"; // strong
  if (composite >= 33) return "#2563a8"; // moderate
  return "#7fa8cc"; // weak
};

const CityMap = React.memo(
  ({ cities, countyFips, countyName, selectedCityFips, onCitySelect, showOZ, onToggleOZ, ozGeoData, ozLoading }) => {
    const [topoData, setTopoData] = React.useState(null);
    const [hoveredCity, setHoveredCity] = React.useState(null);
    const [userZoom, setUserZoom] = React.useState(1);

    React.useEffect(() => {
      fetch(GEO_URL)
        .then((r) => r.json())
        .then(setTopoData)
        .catch(() => {});
    }, []);

    const validCities = React.useMemo(
      () => (cities || []).filter((c) => c.lat != null && c.lon != null),
      [cities],
    );

    // Center on average of city centroids
    const center = React.useMemo(() => {
      if (!validCities.length) return [-96, 38];
      const avgLon =
        validCities.reduce((s, c) => s + c.lon, 0) / validCities.length;
      const avgLat =
        validCities.reduce((s, c) => s + c.lat, 0) / validCities.length;
      return [avgLon, avgLat];
    }, [validCities]);

    // Zoom based on spread of cities
    const zoom = React.useMemo(() => {
      if (validCities.length <= 1) return 72;
      const lats = validCities.map((c) => c.lat);
      const lons = validCities.map((c) => c.lon);
      const extent = Math.max(
        Math.max(...lats) - Math.min(...lats),
        Math.max(...lons) - Math.min(...lons),
        0.05,
      );
      return Math.min(Math.max(4.6 / extent, 6), 80);
    }, [validCities]);

    const effectiveZoom = zoom * userZoom;

    // Population-scaled dot radii (min 4, max 12)
    const maxPop = React.useMemo(
      () => Math.max(...validCities.map((c) => c.population || 0), 1),
      [validCities],
    );

    const dotRadius = (pop) => 4 + 8 * Math.sqrt((pop || 0) / maxPop);

    return (
      <Box
        sx={{
          position: "relative",
          background: "#f5f7fa",
          borderRadius: 1,
          overflow: "hidden",
          flex: 1,
          minHeight: 200,
        }}
      >
        {/* Zoom controls */}
        <Box
          sx={{
            position: "absolute",
            top: 6,
            left: 8,
            zIndex: 10,
            display: "flex",
            gap: 0.5,
          }}
        >
          {[
            ["+", () => setUserZoom((z) => Math.min(z * 1.6, 32))],
            ["−", () => setUserZoom((z) => Math.max(z / 1.6, 0.5))],
            ["⊙", () => setUserZoom(1)],
          ].map(([label, fn]) => (
            <button
              key={label}
              onClick={fn}
              style={{
                width: 22,
                height: 22,
                fontSize: 12,
                fontWeight: 700,
                border: `1px solid rgba(0,0,0,0.15)`,
                borderRadius: 3,
                background: "rgba(255,255,255,0.85)",
                cursor: "pointer",
                fontFamily: "'Inter',sans-serif",
                lineHeight: 1,
                padding: 0,
              }}
            >
              {label}
            </button>
          ))}
        </Box>
        <ComposableMap
          projection="geoAlbersUsa"
          style={{
            width: "100%",
            height: "100%",
            position: "absolute",
            top: 0,
            left: 0,
          }}
          projectionConfig={{ scale: 900 }}
        >
          <ZoomableGroup
            center={center}
            zoom={effectiveZoom}
            minZoom={1}
            maxZoom={80}
          >
            {/* County polygons as context */}
            {topoData && (
              <Geographies geography={topoData}>
                {({ geographies }) =>
                  geographies.map((geo) => {
                    const isTarget = countyFips && geo.id === countyFips;
                    return (
                      <Geography
                        key={geo.id}
                        geography={geo}
                        fill={isTarget ? "#fde8d0" : "#dce4ec"}
                        stroke={isTarget ? "#f97316" : "#fff"}
                        strokeWidth={isTarget ? 1.5 / effectiveZoom : 0.3}
                        style={{
                          default: { outline: "none" },
                          hover: { outline: "none" },
                          pressed: { outline: "none" },
                        }}
                      />
                    );
                  })
                }
              </Geographies>
            )}

            {showOZ && ozGeoData && (
              <Geographies geography={ozGeoData}>
                {({ geographies }) =>
                  geographies.map((geo) => (
                    <Geography key={geo.rsmKey} geography={geo}
                      fill="#7c3aed22" stroke="#7c3aed"
                      strokeWidth={1.2 / effectiveZoom}
                      style={{ default:{outline:"none"}, hover:{outline:"none"}, pressed:{outline:"none"} }}
                      pointerEvents="none" />
                  ))
                }
              </Geographies>
            )}

            {/* City dots — unselected first, selected last so it paints on top */}
            {[
              ...validCities.filter((c) => c.place_fips !== selectedCityFips),
              ...validCities.filter((c) => c.place_fips === selectedCityFips),
            ].map((city) => {
              const isSel = city.place_fips === selectedCityFips;
              const r = dotRadius(city.population) / effectiveZoom;
              return (
                <Marker
                  key={city.place_fips}
                  coordinates={[city.lon, city.lat]}
                >
                  {isSel ? (
                    <>
                      <circle
                        r={9 / effectiveZoom}
                        fill="none"
                        stroke="#f97316"
                        strokeWidth={1 / effectiveZoom}
                        opacity={0.5}
                        style={{ pointerEvents: "none" }}
                      />
                      <circle
                        r={5 / effectiveZoom}
                        fill="#f97316"
                        stroke="#fff"
                        strokeWidth={1.5 / effectiveZoom}
                        style={{ cursor: "pointer" }}
                        onClick={() =>
                          onCitySelect && onCitySelect(city.place_fips)
                        }
                        onMouseEnter={(e) => {
                          const svgEl = e.target.closest("svg");
                          const svgRect = svgEl.getBoundingClientRect();
                          const cRect = e.target.getBoundingClientRect();
                          setHoveredCity({
                            city,
                            x: cRect.left - svgRect.left + cRect.width / 2,
                            y: cRect.top - svgRect.top,
                          });
                        }}
                        onMouseLeave={() => setHoveredCity(null)}
                      />
                    </>
                  ) : (
                    <circle
                      r={r}
                      fill={CITY_SCORE_COLOR(city.composite)}
                      stroke="#fff"
                      strokeWidth={1 / effectiveZoom}
                      opacity={0.85}
                      style={{ cursor: "pointer" }}
                      onClick={() =>
                        onCitySelect && onCitySelect(city.place_fips)
                      }
                      onMouseEnter={(e) => {
                        const svgEl = e.target.closest("svg");
                        const svgRect = svgEl.getBoundingClientRect();
                        const cRect = e.target.getBoundingClientRect();
                        setHoveredCity({
                          city,
                          x: cRect.left - svgRect.left + cRect.width / 2,
                          y: cRect.top - svgRect.top,
                        });
                      }}
                      onMouseLeave={() => setHoveredCity(null)}
                    />
                  )}
                </Marker>
              );
            })}
          </ZoomableGroup>
        </ComposableMap>

        {/* Hover tooltip */}
        {hoveredCity && (
          <Box
            sx={{
              position: "absolute",
              left: Math.min(hoveredCity.x + 8, 999),
              top: Math.max(hoveredCity.y - 72, 4),
              background: "rgba(10,28,57,0.95)",
              color: "#fff",
              borderRadius: 1,
              p: 1,
              pointerEvents: "none",
              zIndex: 20,
              minWidth: 148,
              boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
            }}
          >
            <Typography
              sx={{
                fontSize: 11,
                fontWeight: 700,
                color: "#fff",
                lineHeight: 1.3,
              }}
            >
              {hoveredCity.city.name}
            </Typography>
            <Typography
              sx={{ fontSize: 10, color: "rgba(255,255,255,0.6)", mb: 0.5 }}
            >
              Pop. {(hoveredCity.city.population || 0).toLocaleString()}
            </Typography>
            {[
              ["Ground Score", hoveredCity.city.composite?.toFixed(1)],
              ["Entry Cost", hoveredCity.city.dims?.entry_cost?.toFixed(0)],
              ["Metro Access", hoveredCity.city.dims?.metro_access?.toFixed(0)],
            ].map(
              ([k, v]) =>
                v != null && (
                  <Box
                    key={k}
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 1,
                    }}
                  >
                    <span
                      style={{ fontSize: 9, color: "rgba(255,255,255,0.55)" }}
                    >
                      {k}
                    </span>
                    <span
                      style={{ fontSize: 9, fontWeight: 700, color: "#fff" }}
                    >
                      {v}
                    </span>
                  </Box>
                ),
            )}
          </Box>
        )}

        {/* OZ toggle */}
        <Box sx={{ position: "absolute", bottom: 6, left: 8, zIndex: 10 }}>
          <button
            onClick={onToggleOZ}
            style={{
              fontSize: 9,
              fontWeight: 700,
              border: `1px solid ${showOZ ? "#7c3aed" : "#c4b5fd"}`,
              borderRadius: 3,
              background: showOZ ? "#7c3aed" : "#ede9fe",
              color: showOZ ? "#fff" : "#7c3aed",
              cursor: "pointer",
              padding: "2px 6px",
              fontFamily: "'Inter',sans-serif",
            }}
          >
            {ozLoading ? "Loading…" : "OZ Tracts"}
          </button>
        </Box>

        {/* Legend */}
        <Box
          sx={{
            position: "absolute",
            bottom: 6,
            right: 8,
            display: "flex",
            flexDirection: "column",
            gap: 0.35,
            alignItems: "flex-end",
          }}
        >
          {[
            ["Strong", "#10b981"],
            ["Moderate", "#2563a8"],
            ["Developing", "#7fa8cc"],
          ].map(([label, color]) => (
            <Box
              key={label}
              sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
            >
              <Typography sx={{ fontSize: 9, color: C.muted }}>
                {label}
              </Typography>
              <Box
                sx={{
                  width: 9,
                  height: 9,
                  borderRadius: "50%",
                  background: color,
                }}
              />
            </Box>
          ))}
          <Typography sx={{ fontSize: 8, color: C.muted, mt: 0.25 }}>
            dot size = population
          </Typography>
        </Box>
      </Box>
    );
  },
);

// ── Deep-link routing ────────────────────────────────────────────────────────
const PATH_TO_TAB = {
  "/portfolio":            "portfolio",
  "/housing-market":       "housing",
  "/activation-markets":   "neopoli",
  "/expansion-markets":    "opportunity",
  "/coordinated-markets":  "coordinated",
  "/scoring-model":        "model",
  "/formation-markets":    "formation",
  "/engineered-markets":   "engineered",
  "/property-analysis":    "property",
};
const TAB_TO_PATH = {
  portfolio:    "/portfolio",
  housing:      "/housing-market",
  neopoli:      "/activation-markets",
  opportunity:  "/expansion-markets",
  coordinated:  "/coordinated-markets",
  model:        "/scoring-model",
  formation:    "/formation-markets",
  engineered:   "/engineered-markets",
  property:     "/property-analysis",
};
const tabFromPath = PATH_TO_TAB[window.location.pathname] ?? "portfolio";
const _initParams = new URLSearchParams(window.location.search);
const countyFromPath = _initParams.get("county") || null;
const cityFromPath   = _initParams.get("city")   || null;

const Dashboard = () => {
  const [yearRange, setYearRange] = useState([2016, 2025]);
  const [selectedCity, setSelectedCity] = useState(null); // null = USA highlighted only
  const [tableView, setTableView] = useState("detail"); // 'detail' | 'benchmark' | 'housing'
  const [chartPane, setChartPane] = useState(tabFromPath); // 'portfolio' | 'housing' | 'neopoli' | 'opportunity' | 'coordinated'
  const [neopoliMarket, setNeopoliMarket] = useState(countyFromPath); // FIPS of selected county
  const [mapFips, setMapFips] = useState(null); // deferred — updates after scorecard/bars render
  const [groundScoreData, setGroundScoreData] = useState(null); // { generated, activation: [...], expansion: [...] }
  const [groundScoreLoading, setGroundScoreLoading] = useState(false);
  const [gsActPage, setGsActPage] = useState(0);
  const [gsExpPage, setGsExpPage] = useState(0);
  const [gsActCityPage, setGsActCityPage] = useState(0);
  const [gsExpCityPage, setGsExpCityPage] = useState(0);
  const [actSignalsOpen, setActSignalsOpen] = useState(false);
  const [expSignalsOpen, setExpSignalsOpen] = useState(false);
  const [selectedCityFips, setSelectedCityFips] = useState(null);
  const [onDemandCities, setOnDemandCities] = useState({}); // {place_fips → scored city object}
  const [placesIndex, setPlacesIndex] = useState(null); // national places index, loaded on first search
  const [deepDives, setDeepDives] = useState({}); // { "thesis:fips" → markdown text }
  const [deepDiveLoading, setDeepDiveLoading] = useState(null); // "thesis:fips" key being fetched
  const [coordSelectedFips, setCoordSelectedFips] = useState(null);
  const [coordSelectedExpFips, setCoordSelectedExpFips] = useState(null); // expansion county of the pair
  const [coordDiveExpanded, setCoordDiveExpanded] = useState(false);
  const [coordSimThesis, setCoordSimThesis] = useState("activation"); // 'activation' | 'expansion'
  const [coordSimDeltas, setCoordSimDeltas] = useState({}); // {dim_id: delta (-30 to +30)}
  const [showDimDesc, setShowDimDesc] = useState(false);
  const [showTabOverview, setShowTabOverview] = useState(false);
  const [showAPCard, setShowAPCard] = useState(false);
  const [mapZoom, setMapZoom] = useState(1);
  const [showOZ, setShowOZ] = useState(false);
  const [ozGeoData, setOzGeoData] = useState(null);
  const [ozLoading, setOzLoading] = useState(false);
  const [mapCenter, setMapCenter] = useState([-96, 38]);
  const [scenario, setScenario] = useState("base"); // 'bear' | 'base' | 'bull'
  const [ampledgeEnabled, setAmpledgeEnabled] = useState(false);
  const [kalshiData, setKalshiData] = useState(null); // { series: {KXFED: {markets:[...]}, ...}, fetched_at }
  const [kalshiError, setKalshiError] = useState(null);
  const [kalshiLoading, setKalshiLoading] = useState(false);
  const [kalshiRefreshKey, setKalshiRefreshKey] = useState(0);
  const [policyWatchData, setPolicyWatchData] = useState(null);

  // Property Analysis
  const [propAddress, setPropAddress]         = useState("");
  const [propPrice, setPropPrice]             = useState("");
  const [propResult, setPropResult]           = useState(null);
  const [propLoading, setPropLoading]         = useState(false);
  const [propError, setPropError]             = useState(null);
  const [propApShare, setPropApShare]         = useState(0.25);
  const [propBuyerDown, setPropBuyerDown]     = useState(0.05);
  const [propSuggestions, setPropSuggestions] = useState([]);
  const [propSugOpen, setPropSugOpen]         = useState(false);
  const propSugSelectedRef = React.useRef(false);

  // Formation Markets
  const [formationSelectedFips, setFormationSelectedFips] = useState(null);
  const [formationPage, setFormationPage] = useState(0);

  // Engineered Markets
  const [engineeredSelectedFips, setEngineeredSelectedFips] = useState(null);
  const [engineeredPage, setEngineeredPage] = useState(0);
  const [engineeredProfile, setEngineeredProfile] = useState({
    industry: "manufacturing",   // manufacturing | logistics | tech | healthcare | mixed
    workforceSize: 500,          // target headcount
    wageLevel: "moderate",       // low | moderate | high
    landPriority: true,          // whether low land cost is critical
  });

  const GS_PAGE_SIZE = 10;

  const countyCentroidRef = React.useRef({});
  const searchedCityRef = React.useRef(cityFromPath); // set to place_fips when city selected via search (or from URL)

  const selectCityManually = React.useCallback((fips) => {
    setSelectedCityFips(fips);
  }, []);

  // Render deep dive markdown (bold headers, bullets, inline bold)
  const renderDeepDive = React.useCallback((text) => {
    if (!text) return null;
    const inlineBold = (str, baseKey) =>
      str.split(/(\*\*[^*]+\*\*)/g).map((p, j) => {
        const m = p.match(/^\*\*(.+)\*\*$/);
        return m ? <strong key={`${baseKey}-${j}`}>{m[1]}</strong> : p;
      });
    return text.split("\n").map((line, i) => {
      // Skip h1/h2/h3 headings and horizontal rules
      if (/^#{1,3}\s/.test(line)) return null;
      if (/^---+$/.test(line.trim())) return null;
      // Section header: whole line is **Title** — skip "Investment Thesis"
      const headerMatch = line.match(/^\*\*(.+)\*\*$/);
      if (headerMatch) {
        if (headerMatch[1].trim().toLowerCase() === "investment thesis")
          return null;
        return (
          <div
            key={i}
            style={{
              fontWeight: 700,
              fontSize: 11,
              color: "#636e72",
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              marginTop: 10,
              marginBottom: 3,
            }}
          >
            {headerMatch[1]}
          </div>
        );
      }
      // Bullet line
      if (line.startsWith("• ")) {
        return (
          <div
            key={i}
            style={{
              paddingLeft: 10,
              marginBottom: 2,
              fontSize: 11,
              color: C.charcoal,
              lineHeight: 1.6,
            }}
          >
            {"• "}
            {inlineBold(line.slice(2), i)}
          </div>
        );
      }
      // Empty line
      if (line.trim() === "") return <div key={i} style={{ height: 4 }} />;
      // Plain text (investment thesis body, etc.)
      return (
        <div
          key={i}
          style={{
            fontSize: 11,
            color: C.charcoal,
            lineHeight: 1.6,
            marginBottom: 4,
          }}
        >
          {inlineBold(line, i)}
        </div>
      );
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // On-demand deep dive request (async pattern: POST → 202 → poll GET until ready)
  const requestDeepDive = React.useCallback(
    (county, thesis) => {
      const key = `${thesis}:${county.fips}`;
      if (deepDives[key] || deepDiveLoading === key) return;
      setDeepDiveLoading(key);

      const poll = (retries = 20) => {
        if (retries <= 0) { setDeepDiveLoading(null); return; }
        setTimeout(() => {
          fetch(`${DEEP_DIVE_API_URL}?key=${encodeURIComponent(key)}`)
            .then((r) => r.json())
            .then((data) => {
              if (data.status === "ready" && data.deep_dive) {
                setDeepDives((prev) => ({ ...prev, [key]: data.deep_dive }));
                setDeepDiveLoading(null);
              } else {
                poll(retries - 1);
              }
            })
            .catch(() => setDeepDiveLoading(null));
        }, 3000);
      };

      fetch(DEEP_DIVE_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fips: county.fips,
          thesis,
          name: county.name,
          state: county.state,
          composite: county.composite,
          rank: county.rank,
          tier: county.tier,
          population: county.population,
          dims: county.dims,
          metrics: county.metrics,
        }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.deep_dive) {
            // Cache hit — immediate response
            setDeepDives((prev) => ({ ...prev, [key]: data.deep_dive }));
            setDeepDiveLoading(null);
          } else if (data.status === "generating") {
            // Async — start polling
            poll();
          } else {
            setDeepDiveLoading(null);
          }
        })
        .catch(() => setDeepDiveLoading(null));
    },
    [deepDives, deepDiveLoading],
  ); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync URL to active tab
  React.useEffect(() => {
    const path = TAB_TO_PATH[chartPane] ?? "/portfolio";
    if (window.location.pathname !== path) {
      window.history.replaceState(null, "", path + window.location.search);
    }
  }, [chartPane]);

  // Sync county + city to URL query params
  React.useEffect(() => {
    const params = new URLSearchParams();
    if (neopoliMarket) params.set("county", neopoliMarket);
    if (selectedCityFips) params.set("city", selectedCityFips);
    const qs = params.toString();
    const newUrl = window.location.pathname + (qs ? `?${qs}` : "");
    const curUrl = window.location.pathname + window.location.search;
    if (curUrl !== newUrl) window.history.replaceState(null, "", newUrl);
  }, [neopoliMarket, selectedCityFips]);

  // Fetch Kalshi prediction market data once when Housing Market tab is first visited
  const kalshiFetchedRef = React.useRef(false);
  React.useEffect(() => {
    if (chartPane !== "housing") return;
    if (kalshiFetchedRef.current) return;
    kalshiFetchedRef.current = true;
    setKalshiLoading(true);
    const base =
      process.env.REACT_APP_KALSHI_API_URL ||
      "https://5g28uduwbk.execute-api.us-east-1.amazonaws.com/markets";
    const seriesList = Object.keys(KALSHI_SERIES_META).join(",");
    const url = `${base}?series=${seriesList}`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        setKalshiData(data);
        setKalshiLoading(false);
      })
      .catch((err) => {
        kalshiFetchedRef.current = false;
        setKalshiError(err.message);
        setKalshiLoading(false);
      });
  }, [chartPane, kalshiRefreshKey]);

  // Fetch Ground Score county data + places index from S3 when any market tab first opens
  const gsFetchedRef = React.useRef(false);
  React.useEffect(() => {
    if (chartPane !== "neopoli" && chartPane !== "opportunity" && chartPane !== "coordinated" && chartPane !== "formation" && chartPane !== "engineered" && chartPane !== "property") return;
    if (gsFetchedRef.current) return;
    gsFetchedRef.current = true;
    setGroundScoreLoading(true);
    Promise.all([
      fetch(
        "https://ampledge-fund.s3.us-east-1.amazonaws.com/ground-score/counties.json",
        { cache: "reload" },
      ).then((r) => r.json()),
      fetch(PLACES_INDEX_URL)
        .then((r) => r.json())
        .catch(() => null),
      fetch(DEEP_DIVES_URL, { cache: "reload" })
        .then((r) => r.json())
        .catch(() => null),
    ])
      .then(([data, places, dives]) => {
        setGroundScoreData(data);
        if (places) setPlacesIndex(places);
        if (dives?.deep_dives) setDeepDives(dives.deep_dives);
        setGroundScoreLoading(false);
        setNeopoliMarket(
          (cur) =>
            cur ||
            (chartPane === "opportunity"
              ? data.expansion[0]?.fips
              : data.activation[0]?.fips) ||
            null,
        );
        setSelectedCity((prev) => {
          if (prev) return prev;
          const src = chartPane === "opportunity" ? data.expansion : data.activation;
          // If a county was pre-selected from the URL, use its cs_city; otherwise fall back to top-ranked
          const target = neopoliMarket ? src.find((c) => c.fips === neopoliMarket) : null;
          return (target || src[0])?.metrics?.cs_city || null;
        });
      })
      .catch(() => {
        setGroundScoreLoading(false);
        gsFetchedRef.current = false;
      });
  }, [chartPane]);

  // Defer map pin update by one frame so bar/chart animations start before
  // the expensive CountyMap re-render (3,144 Geography elements) begins
  React.useEffect(() => {
    const id = requestAnimationFrame(() => setMapFips(neopoliMarket));
    return () => cancelAnimationFrame(id);
  }, [neopoliMarket]);

  // Reset pages + city selection when selected county changes
  React.useEffect(() => {
    setGsActCityPage(0);
    setGsExpCityPage(0);
    if (!groundScoreData || !neopoliMarket) {
      setSelectedCityFips(null);
      return;
    }

    // Auto-jump county rankings to the page containing the selected county
    const actIdx = groundScoreData.activation.findIndex(
      (r) => r.fips === neopoliMarket,
    );
    if (actIdx >= 0) setGsActPage(Math.floor(actIdx / GS_PAGE_SIZE));
    const expIdx = groundScoreData.expansion.findIndex(
      (r) => r.fips === neopoliMarket,
    );
    if (expIdx >= 0) setGsExpPage(Math.floor(expIdx / GS_PAGE_SIZE));

    // Kick off on-demand scoring for all unscored places in this county
    if (placesIndex && groundScoreData.metric_bounds) {
      const preScoredFips = new Set([
        ...(
          groundScoreData.activation.find((c) => c.fips === neopoliMarket)
            ?.cities || []
        ).map((c) => c.place_fips),
        ...(
          groundScoreData.expansion.find((c) => c.fips === neopoliMarket)
            ?.cities || []
        ).map((c) => c.place_fips),
      ]);
      const dimCfg =
        chartPane === "opportunity"
          ? OPPORTUNITY_DIMS_CONFIG
          : NEOPOLI_DIMS_CONFIG;
      placesIndex
        .filter(
          (p) =>
            p.county_fips === neopoliMarket &&
            !preScoredFips.has(p.place_fips) &&
            !onDemandCities[p.place_fips],
        )
        .forEach((p) => {
          scoreCityBrowserSide(p, groundScoreData.metric_bounds, dimCfg).then(
            (result) => {
              if (result)
                setOnDemandCities((prev) => ({
                  ...prev,
                  [p.place_fips]: {
                    ...result,
                    place_fips: p.place_fips,
                    name: p.name,
                    state: p.state,
                    county_fips: p.county_fips,
                    lat: p.lat,
                    lon: p.lon,
                  },
                }));
            },
          );
        });
    }

    // Select: searched city > first pre-scored city > null (on-demand effect fills in if needed)
    if (searchedCityRef.current) {
      setSelectedCityFips(searchedCityRef.current);
      searchedCityRef.current = null;
    } else {
      const src =
        chartPane === "opportunity"
          ? groundScoreData.expansion
          : groundScoreData.activation;
      const county = src.find((c) => c.fips === neopoliMarket);
      setSelectedCityFips(county?.cities?.[0]?.place_fips || null);
    }
  }, [neopoliMarket, groundScoreData, placesIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  // When on-demand cities arrive, select the first one if nothing is selected yet
  React.useEffect(() => {
    if (selectedCityFips || !neopoliMarket) return;
    const first = Object.values(onDemandCities).find(
      (c) => c.county_fips === neopoliMarket,
    );
    if (first) setSelectedCityFips(first.place_fips);
  }, [onDemandCities]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset coordinated sim deltas + brief expansion when selected county changes
  React.useEffect(() => {
    setCoordSimDeltas({});
    setCoordDiveExpanded(false);
  }, [coordSelectedFips]);

  React.useEffect(() => {
    if (!showOZ || ozGeoData) return;
    setOzLoading(true);
    fetch("https://ampledge-fund.s3.amazonaws.com/oz_tracts.geojson")
      .then((r) => r.json())
      .then((data) => { setOzGeoData(data); setOzLoading(false); })
      .catch(() => setOzLoading(false));
  }, [showOZ]);

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
    const base =
      process.env.REACT_APP_KALSHI_API_URL ||
      "https://5g28uduwbk.execute-api.us-east-1.amazonaws.com/markets";
    fetch(`${base}?market=kxhfhousing-27`)
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) setPolicyWatchData(d);
      })
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
      const sp = projected
        ? (getProj("sp500", yr, scenario) ?? 0)
        : getBM("sp500", yr);
      const bnd = projected
        ? (getProj("bondIndex", yr, scenario) ?? 0)
        : getBM("bondIndex", yr);
      const vnq = projected
        ? (getProj("vnq", yr, scenario) ?? 0)
        : getBM("vnq", yr);
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
        mortgageRate: projected
          ? getProj("mortgageRate", yr, scenario)
          : getBM("mortgageRate", yr),
        delinquencyRate: projected
          ? getProj("delinquencyRate", yr, scenario)
          : getBM("delinquencyRate", yr),
        tenYearYield: projected
          ? getProj("tenYearYield", yr, scenario)
          : getBM("tenYearYield", yr),
        cpi: projected ? getProj("cpi", yr, scenario) : getBM("cpi", yr),
        housingStarts: projected
          ? getProj("housingStarts", yr, scenario)
          : getBM("housingStarts", yr),
        monthsOfSupply: projected
          ? getProj("monthsOfSupply", yr, scenario)
          : getBM("monthsOfSupply", yr),
        nahbHMI: projected
          ? getProj("nahbHMI", yr, scenario)
          : getBM("nahbHMI", yr),
        medianIncome: projected
          ? getProj("medianIncome", yr, scenario)
          : getBM("medianIncome", yr),
        rentalVacancy: projected
          ? getProj("rentalVacancy", yr, scenario)
          : getBM("rentalVacancy", yr),
        priceToIncome: projected
          ? getProj("priceToIncome", yr, scenario)
          : getBM("priceToIncome", yr),
        unemploymentRate: projected
          ? getProj("unemploymentRate", yr, scenario)
          : getBM("unemploymentRate", yr),
        buildingPermits: projected
          ? getProj("buildingPermits", yr, scenario)
          : getBM("buildingPermits", yr),
        existingHomeSales: projected
          ? getProj("existingHomeSales", yr, scenario)
          : getBM("existingHomeSales", yr),
        netHHFormation: projected
          ? getProj("netHHFormation", yr, scenario)
          : getBM("netHHFormation", yr),
        consumerConfidence: projected
          ? getProj("consumerConfidence", yr, scenario)
          : getBM("consumerConfidence", yr),
        fedFundsRate: projected
          ? getProj("fedFundsRate", yr, scenario)
          : getBM("fedFundsRate", yr),
        mcai: projected ? getProj("mcai", yr, scenario) : getBM("mcai", yr),
        foreclosureRate: projected
          ? getProj("foreclosureRate", yr, scenario)
          : getBM("foreclosureRate", yr),
        homeownershipRate: projected
          ? getProj("homeownershipRate", yr, scenario)
          : getBM("homeownershipRate", yr),
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
  const AMP_EXISTING_LIFT = (AMP_VOLUME * 0.7) / 1e6; // +0.035M/yr to existing sales
  const AMP_HPA_PREMIUM =
    scenario === "bear" ? 0.3 : scenario === "bull" ? 0.5 : 0.4; // pp
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
  const csMonths = [
    "01",
    "02",
    "03",
    "04",
    "05",
    "06",
    "07",
    "08",
    "09",
    "10",
    "11",
    "12",
  ];
  // Seasonal offset (sums to 0/yr): weaker Jan–Feb, stronger Apr–Jun
  const csSeasonal = [
    -0.3, -0.2, 0.0, 0.2, 0.3, 0.3, 0.2, 0.1, 0.0, -0.1, -0.2, -0.3,
  ];
  const projYears = [];
  for (let y = Math.max(yearRange[0], 2026); y <= yearRange[1]; y++)
    projYears.push(y);

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
    const devs = devPeriodIndices
      .map((i) => {
        const c = CS_HPA[city]?.[i];
        const u = CS_HPA.USA[i];
        return c != null && u != null ? c - u : null;
      })
      .filter((v) => v != null);
    const n = devs.length;
    const mu = n > 0 ? devs.reduce((s, v) => s + v, 0) / n : 0;
    const sigma =
      n > 1 ? Math.sqrt(devs.reduce((s, v) => s + (v - mu) ** 2, 0) / n) : 1;
    // Last historical deviation (city minus USA at end of visible history)
    const lastI = csFilteredIndices[csFilteredIndices.length - 1];
    const lastCityV = lastI != null ? CS_HPA[city]?.[lastI] : null;
    const lastUSAV = lastI != null ? CS_HPA.USA[lastI] : null;
    const lastDev =
      lastCityV != null && lastUSAV != null ? lastCityV - lastUSAV : mu;
    cityDevStats[city] = { mu, sigma, lastDev };
  });

  // City-specific oscillation params — different period & phase per city
  const cityOscParams = CS_CITIES.map((city, idx) => ({
    period: 28 + (idx % 5) * 5, // 28–48 month cycles
    phase: (idx * 2.09) % (2 * Math.PI), // evenly spread phases
    amp: (cityDevStats[city]?.sigma ?? 1) * 0.45, // 45% of historical σ
  }));

  const csProjCity = {};

  if (projYears.length > 0) {
    // USA national projection anchors (same as before)
    const lastHistVal = csFiltered("USA").slice(-1)[0] ?? 3.0;
    const anchors = [[-6, lastHistVal]];
    projYears.forEach((y, i) =>
      anchors.push([i * 12 + 6, getProj("hpa", y, scenario)]),
    );
    const lastIdx = projYears.length;
    const tailHPA =
      PROJ[scenario]?.hpa[lastIdx] ?? anchors[anchors.length - 1][1];
    anchors.push([lastIdx * 12 + 6, tailHPA]);

    const interp = (anch, absMonth) => {
      let a0 = anch[0],
        a1 = anch[1];
      for (let ai = 0; ai < anch.length - 1; ai++) {
        if (anch[ai][0] <= absMonth && anch[ai + 1][0] > absMonth) {
          a0 = anch[ai];
          a1 = anch[ai + 1];
          break;
        }
      }
      const t = (absMonth - a0[0]) / (a1[0] - a0[0]);
      return a0[1] + (a1[1] - a0[1]) * t;
    };

    CS_CITIES.forEach((city) => {
      csProjCity[city] = [];
    });

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
          const osc = amp * Math.sin((2 * Math.PI * absMonth) / period + phase);
          csProjCity[city].push(
            parseFloat(
              (usaBase + decayedOffset + osc + csSeasonal[mi]).toFixed(2),
            ),
          );
        });
      });
    });
  }
  const csLabels = [...csHistLabels, ...csProjLabels];
  const csProjPivot = csHistLabels.length; // index where projection starts

  // Ampledge-adjusted Case-Shiller USA projection
  const csProjUSAAmp = ampledgeEnabled
    ? csProjUSA.map((v) =>
        v != null ? parseFloat((v + AMP_HPA_PREMIUM).toFixed(2)) : v,
      )
    : [];

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
          segment:
            csProjLabels.length > 0
              ? {
                  borderColor: (ctx) =>
                    ctx.p0DataIndex >= csProjPivot
                      ? baseColor + projAlpha
                      : baseColor + histAlpha,
                }
              : {},
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
        segment:
          csProjLabels.length > 0
            ? {
                borderColor: (ctx) =>
                  ctx.p0DataIndex >= csProjPivot ? C.navy + "88" : C.navy,
              }
            : {},
      },
      // Ampledge USA overlay
      ...(ampledgeEnabled && csProjUSAAmp.length > 0
        ? [
            {
              label: "USA (With Ampledge)",
              data: [...csFiltered("USA").map(() => null), ...csProjUSAAmp],
              borderColor: C.red + "cc",
              borderWidth: 2.5,
              pointRadius: 0,
              tension: 0.3,
              spanGaps: false,
              order: -2,
              borderDash: [5, 3],
            },
          ]
        : []),
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
  const hmHPA = displayYears.map((yr) =>
    yr > 2025 ? getProj("hpa", yr, scenario) : getHPA(yr),
  );
  const hmMtg = displayYears.map((yr) =>
    yr > 2025
      ? getProj("mortgageRate", yr, scenario)
      : getBM("mortgageRate", yr),
  );
  const hmDel = displayYears.map((yr) =>
    yr > 2025
      ? getProj("delinquencyRate", yr, scenario)
      : getBM("delinquencyRate", yr),
  );
  const hmTsy = displayYears.map((yr) =>
    yr > 2025
      ? getProj("tenYearYield", yr, scenario)
      : getBM("tenYearYield", yr),
  );
  const hmCPI = displayYears.map((yr) =>
    yr > 2025 ? getProj("cpi", yr, scenario) : getBM("cpi", yr),
  );
  const hmStarts = displayYears.map((yr) =>
    yr > 2025
      ? getProj("housingStarts", yr, scenario)
      : getBM("housingStarts", yr),
  );
  const hmSupply = displayYears.map((yr) =>
    yr > 2025
      ? getProj("monthsOfSupply", yr, scenario)
      : getBM("monthsOfSupply", yr),
  );
  const hmNAHB = displayYears.map((yr) =>
    yr > 2025 ? getProj("nahbHMI", yr, scenario) : getBM("nahbHMI", yr),
  );
  const hmIncome = displayYears.map((yr) =>
    yr > 2025
      ? getProj("medianIncome", yr, scenario)
      : getBM("medianIncome", yr),
  );
  const hmPTI = displayYears.map((yr) =>
    yr > 2025
      ? getProj("priceToIncome", yr, scenario)
      : getBM("priceToIncome", yr),
  );
  const hmVacancy = displayYears.map((yr) =>
    yr > 2025
      ? getProj("rentalVacancy", yr, scenario)
      : getBM("rentalVacancy", yr),
  );
  const hmUnemployment = displayYears.map((yr) =>
    yr > 2025
      ? getProj("unemploymentRate", yr, scenario)
      : getBM("unemploymentRate", yr),
  );
  const hmPermits = displayYears.map((yr) =>
    yr > 2025
      ? getProj("buildingPermits", yr, scenario)
      : getBM("buildingPermits", yr),
  );
  const hmExistingSales = displayYears.map((yr) =>
    yr > 2025
      ? getProj("existingHomeSales", yr, scenario)
      : getBM("existingHomeSales", yr),
  );
  const hmHHFormation = displayYears.map((yr) =>
    yr > 2025
      ? getProj("netHHFormation", yr, scenario)
      : getBM("netHHFormation", yr),
  );
  const hmConsumerConf = displayYears.map((yr) =>
    yr > 2025
      ? getProj("consumerConfidence", yr, scenario)
      : getBM("consumerConfidence", yr),
  );
  const hmFedFunds = displayYears.map((yr) =>
    yr > 2025
      ? getProj("fedFundsRate", yr, scenario)
      : getBM("fedFundsRate", yr),
  );
  const hmMCAI = displayYears.map((yr) =>
    yr > 2025 ? getProj("mcai", yr, scenario) : getBM("mcai", yr),
  );
  const hmForeclosure = displayYears.map((yr) =>
    yr > 2025
      ? getProj("foreclosureRate", yr, scenario)
      : getBM("foreclosureRate", yr),
  );
  const hmOwnership = displayYears.map((yr) =>
    yr > 2025
      ? getProj("homeownershipRate", yr, scenario)
      : getBM("homeownershipRate", yr),
  );

  // Ampledge-adjusted HPA (used for correlations and outlook when toggle is on)
  const hmHPAAmp = hmHPA.map((v, i) =>
    ampledgeEnabled && displayYears[i] > 2025 && v != null
      ? parseFloat((v + AMP_HPA_PREMIUM).toFixed(2))
      : v,
  );

  // Ampledge-adjusted arrays (only projection years > 2025 are modified)
  const hmExistingSalesAmp = displayYears.map((yr, i) => {
    const v = hmExistingSales[i];
    return ampledgeEnabled && yr > 2025 && v != null
      ? v + AMP_EXISTING_LIFT
      : v;
  });
  const hmOwnershipAmp = displayYears.map((yr, i) => {
    const v = hmOwnership[i];
    return ampledgeEnabled && yr > 2025 && v != null
      ? v + AMP_OWN_LIFT_PER_YR * (yr - 2025)
      : v;
  });

  // ── Projection helpers ───────────────────────────────────────────────────
  const projIdx = displayYears.findIndex((y) => y > 2025);
  const mkSeg = (color) =>
    projIdx >= 0
      ? {
          borderColor: (ctx) =>
            ctx.p0DataIndex >= projIdx ? color + "70" : color,
          borderDash: (ctx) => (ctx.p0DataIndex >= projIdx ? [6, 3] : []),
        }
      : {};
  // projBarColor(baseColor, histAlpha, projAlpha) — keeps same hue, lower opacity for projected bars
  const projBarColor = (baseColor, histAlpha = "cc", projAlpha = "44") =>
    projIdx >= 0
      ? (ctx) =>
          displayYears[ctx.dataIndex] > 2025
            ? baseColor + projAlpha
            : baseColor + histAlpha
      : baseColor + histAlpha;

  const driverCorrelations = [
    { label: "Rental Vacancy Rate", data: hmVacancy },
    { label: "Months of Supply", data: hmSupply },
    { label: "CPI Inflation", data: hmCPI },
    { label: "Housing Starts (000s)", data: hmStarts },
    { label: "NAHB Builder Confidence", data: hmNAHB },
    { label: "Mortgage Rate", data: hmMtg },
    { label: "10-Year Treasury Yield", data: hmTsy },
    { label: "Price-to-Income Ratio", data: hmPTI },
    { label: "Median Income", data: hmIncome },
    { label: "Unemployment Rate", data: hmUnemployment },
    { label: "Building Permits (000s)", data: hmPermits },
    { label: "Existing Home Sales (M)", data: hmExistingSalesAmp },
    { label: "Net HH Formation (000s)", data: hmHHFormation },
    { label: "Consumer Confidence", data: hmConsumerConf },
    { label: "Fed Funds Rate", data: hmFedFunds },
    { label: "MCAI", data: hmMCAI },
    { label: "Foreclosure Rate", data: hmForeclosure },
    { label: "Homeownership Rate", data: hmOwnershipAmp },
  ].map(({ label, data }) => {
    const r = pearsonR(hmHPAAmp, data);
    // Signal: does the current trend help or hurt HPA?
    // trend = last valid value minus first valid value in the selected period
    const valid = data.filter((v) => v != null);
    const trend = valid.length >= 2 ? valid[valid.length - 1] - valid[0] : 0;
    // sign(r) × sign(trend): +1 = tailwind for HPA, -1 = headwind
    const signal = Math.sign(r) * Math.sign(trend); // 1, -1, or 0
    return {
      label,
      r,
      interp: generateInterp(label, r, data, hmHPAAmp),
      signal,
    };
  });

  // ── Housing Market Summary ────────────────────────────────────────────────
  const mktStrongTailwinds = driverCorrelations.filter(
    (d) => d.signal > 0 && Math.abs(d.r) >= 0.6,
  );
  const mktStrongHeadwinds = driverCorrelations.filter(
    (d) => d.signal < 0 && Math.abs(d.r) >= 0.6,
  );
  const mktNetSignal = mktStrongTailwinds.length - mktStrongHeadwinds.length;

  // Forward HPA averages always projected from 2025 baseline
  // When Ampledge is enabled, the HPA premium is added to every projected year
  const fwdAvg = (startYr, endYr) => {
    const vals = [];
    for (let y = startYr; y <= endYr; y++) {
      const v = getProj("hpa", y, scenario);
      if (v != null) vals.push(ampledgeEnabled ? v + AMP_HPA_PREMIUM : v);
    }
    return vals.length > 0
      ? vals.reduce((s, v) => s + v, 0) / vals.length
      : null;
  };
  const mktAvg3 = fwdAvg(2026, 2028);
  const mktAvg5 = fwdAvg(2026, 2030);
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
  const projScore =
    projAvgForTone == null
      ? null
      : projAvgForTone >= 5
        ? 3 // strong bull
        : projAvgForTone >= 4
          ? 2 // solid growth
          : projAvgForTone >= 3
            ? 1 // above long-run average
            : projAvgForTone >= 2
              ? 0 // near long-run average, neutral
              : projAvgForTone >= 1
                ? -1 // below inflation, weak
                : projAvgForTone >= 0
                  ? -2 // flat, poor
                  : -3; // contraction

  // Clamp correlation signal to -3…+3 then blend 50/50 projection/signals
  // Equal weighting: heavy headwinds meaningfully drag the badge even with a decent projection
  const clampedSignal = Math.max(-3, Math.min(3, mktNetSignal));
  const blendedScore =
    projScore != null ? projScore * 0.5 + clampedSignal * 0.5 : clampedSignal;

  const mktTone =
    blendedScore >= 2
      ? "favorable"
      : blendedScore >= 0.5
        ? "moderately favorable"
        : blendedScore >= -0.5
          ? "mixed"
          : blendedScore >= -2
            ? "moderately challenging"
            : "challenging";
  const mktToneColor =
    mktTone === "favorable" || mktTone === "moderately favorable"
      ? C.greenLight
      : mktTone === "mixed"
        ? C.muted
        : "#e57373";

  // Snapshot values (last valid in selected range)
  const lastOf = (arr) => arr.filter((v) => v != null).slice(-1)[0] ?? null;
  const mktHPA = lastOf(hmHPAAmp);
  const mktMtg = lastOf(hmMtg);
  const mktSupply = lastOf(hmSupply);
  const mktUnemp = lastOf(hmUnemployment);
  const mktFed = lastOf(hmFedFunds);
  const mktNAHB = lastOf(hmNAHB);

  const outlookLabel = (avg) =>
    avg == null
      ? null
      : avg >= 5
        ? "Strong Growth"
        : avg >= 3
          ? "Moderate Growth"
          : avg >= 1.5
            ? "Slow Growth"
            : avg >= 0
              ? "Flat"
              : "Contraction";
  const outlookColor = (avg) =>
    avg == null
      ? C.muted
      : avg >= 3
        ? C.greenLight
        : avg >= 1.5
          ? C.orange
          : avg >= 0
            ? C.muted
            : "#e57373";

  // ── Rates & Policy: Fed Funds + Mortgage + 10yr Yield ───────────────────
  const hRatesData = {
    labels: years,
    datasets: [
      {
        label: "Fed Funds",
        data: hmFedFunds,
        borderColor: C.red,
        backgroundColor: "transparent",
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.3,
        segment: mkSeg(C.red),
      },
      {
        label: "Mortgage Rate",
        data: hmMtg,
        borderColor: C.orange,
        backgroundColor: C.orange + "15",
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.3,
        fill: true,
        segment: mkSeg(C.orange),
      },
      {
        label: "10yr Yield",
        data: hmTsy,
        borderColor: C.blueLight,
        backgroundColor: "transparent",
        borderWidth: 1.5,
        pointRadius: 0,
        tension: 0.3,
        segment: mkSeg(C.blueLight),
      },
    ],
  };

  // ── Supply Pipeline: Permits + Starts (bar) + Months of Supply (line) ───
  const hSupplyData = {
    labels: years,
    datasets: [
      {
        type: "bar",
        label: "Permits (k)",
        data: hmPermits,
        backgroundColor: projBarColor(C.navy, "88", "44"),
        borderRadius: 2,
        yAxisID: "y",
      },
      {
        type: "bar",
        label: "Starts (k)",
        data: hmStarts,
        backgroundColor: projBarColor(C.navyMid, "66", "33"),
        borderRadius: 2,
        yAxisID: "y",
      },
      {
        type: "line",
        label: "Months of Supply",
        data: hmSupply,
        borderColor: C.red,
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.3,
        yAxisID: "y1",
        segment: mkSeg(C.red),
      },
    ],
  };

  // ── Market Stress: Unemployment + Delinquency + Foreclosure ─────────────
  const hStressData = {
    labels: years,
    datasets: [
      {
        label: "Unemployment",
        data: hmUnemployment,
        borderColor: C.orange,
        backgroundColor: C.orange + "15",
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.3,
        fill: true,
        segment: mkSeg(C.orange),
      },
      {
        label: "Delinquency",
        data: hmDel,
        borderColor: C.red,
        backgroundColor: "transparent",
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.3,
        segment: mkSeg(C.red),
      },
      {
        label: "Foreclosure",
        data: hmForeclosure,
        borderColor: C.purple,
        backgroundColor: "transparent",
        borderWidth: 1.5,
        pointRadius: 0,
        tension: 0.3,
        segment: mkSeg(C.purple),
      },
    ],
  };

  // ── Demand: Existing Home Sales (bar) + HH Formation (line) ─────────────
  const hDemandData = {
    labels: years,
    datasets: [
      {
        type: "bar",
        label: "Existing Sales (M)",
        data: ampledgeEnabled ? hmExistingSalesAmp : hmExistingSales,
        backgroundColor: projBarColor(C.greenLight, "88", "44"),
        borderRadius: 2,
        yAxisID: "y",
      },
      {
        type: "line",
        label: "HH Formation (000s)",
        data: hmHHFormation,
        borderColor: C.navy,
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.3,
        yAxisID: "y1",
        segment: mkSeg(C.navy),
      },
    ],
  };

  // ── Affordability & Ownership: Price/Income + Homeownership + Rental Vacancy ─
  const hAffordabilityData = {
    labels: years,
    datasets: [
      {
        label: "Price / Income",
        data: hmPTI,
        borderColor: C.red,
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.3,
        yAxisID: "y",
        segment: mkSeg(C.red),
      },
      {
        label: "Homeownership %",
        data: ampledgeEnabled ? hmOwnershipAmp : hmOwnership,
        borderColor: C.navy,
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.3,
        yAxisID: "y1",
        segment: mkSeg(C.navy),
      },
      {
        label: "Rental Vacancy %",
        data: hmVacancy,
        borderColor: C.blueLight,
        borderWidth: 1.5,
        pointRadius: 0,
        tension: 0.3,
        yAxisID: "y1",
        segment: mkSeg(C.blueLight),
      },
    ],
  };

  // ── Sentiment: Consumer Confidence + NAHB HMI ───────────────────────────
  const hSentimentData = {
    labels: years,
    datasets: [
      {
        label: "Consumer Confidence",
        data: hmConsumerConf,
        borderColor: C.green,
        backgroundColor: C.green + "15",
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.3,
        fill: true,
        yAxisID: "y",
        segment: mkSeg(C.green),
      },
      {
        label: "NAHB HMI",
        data: hmNAHB,
        borderColor: C.orange,
        backgroundColor: "transparent",
        borderWidth: 1.5,
        pointRadius: 0,
        tension: 0.3,
        yAxisID: "y1",
        segment: mkSeg(C.orange),
      },
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
        return v == null
          ? null
          : ` ${ctx.dataset.label}: ${fmtFn(ctx.dataset.label, v)}`;
      },
    },
  });
  const hRatesTip = mkHTip((_l, v) => v.toFixed(2) + "%");
  const hStressTip = mkHTip((_l, v) => v.toFixed(2) + "%");
  const hSupplyTip = mkHTip((l, v) =>
    l === "Months of Supply" ? v.toFixed(1) + " mo" : Math.round(v) + "k",
  );
  const hDemandTip = mkHTip((l, v) =>
    l.includes("(M)") ? v.toFixed(2) + "M" : Math.round(v) + "k",
  );
  const hAffordTip = mkHTip((l, v) =>
    l === "Price / Income" ? v.toFixed(1) + "×" : v.toFixed(1) + "%",
  );
  const hSentimentTip = mkHTip((_l, v) => Math.round(v).toString());

  // ── Tab navigation — hoisted so we can render it full-width outside the grid ──
  const handleTab = (v) => {
    setChartPane(v);
    if (v === "neopoli") {
      if (groundScoreData) {
        setNeopoliMarket(groundScoreData.activation[0]?.fips || null);
        setSelectedCity(groundScoreData.activation[0]?.metrics?.cs_city || null);
      }
    } else if (v === "opportunity") {
      if (groundScoreData) {
        setNeopoliMarket(groundScoreData.expansion[0]?.fips || null);
        setSelectedCity(groundScoreData.expansion[0]?.metrics?.cs_city || null);
      }
    } else if (v === "formation" && groundScoreData && !formationSelectedFips) {
      const scored = [...groundScoreData.activation]
        .map(c => ({ fips: c.fips, score: _formationScore(c.metrics) }))
        .filter(c => c.score)
        .sort((a, b) => b.score.composite - a.score.composite);
      if (scored[0]) setFormationSelectedFips(scored[0].fips);
      setSelectedCity(null);
    } else if (v === "engineered" && groundScoreData && !engineeredSelectedFips) {
      const scored = [...groundScoreData.activation]
        .map(c => ({ fips: c.fips, score: _engineeredScore(c.metrics, engineeredProfile) }))
        .filter(c => c.score)
        .sort((a, b) => b.score.composite - a.score.composite);
      if (scored[0]) setEngineeredSelectedFips(scored[0].fips);
      setSelectedCity(null);
    } else {
      setSelectedCity(null);
    }
  };

  // ── Load Google Maps JS once ─────────────────────────────────────────────
  React.useEffect(() => {
    if (window.google?.maps) return; // already loaded
    if (document.getElementById("gmap-script")) return; // already injected
    const script = document.createElement("script");
    script.id = "gmap-script";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.REACT_APP_GOOGLE_PLACES}&libraries=places`;
    script.async = true;
    document.head.appendChild(script);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Close autocomplete when leaving the property tab ────────────────────
  React.useEffect(() => {
    if (chartPane !== "property") {
      setPropSugOpen(false);
      setPropSuggestions([]);
    }
  }, [chartPane]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Property Analysis: autocomplete suggestions (Google Places) ─────────
  React.useEffect(() => {
    if (chartPane !== "property") return;
    if (propSugSelectedRef.current) { propSugSelectedRef.current = false; return; }
    const q = propAddress.trim();
    if (q.length < 3) { setPropSuggestions([]); setPropSugOpen(false); return; }
    const svc = window.google?.maps?.places?.AutocompleteService
      ? new window.google.maps.places.AutocompleteService()
      : null;
    if (!svc) return;
    svc.getPlacePredictions(
      { input: q, componentRestrictions: { country: "us" }, types: ["address"] },
      (predictions, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions?.length) {
          setPropSuggestions(predictions);
          setPropSugOpen(true);
        } else {
          setPropSuggestions([]);
        }
      }
    );
  }, [propAddress]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Property Analysis: geocode + enrich ──────────────────────────────────
  const analyzeProperty = React.useCallback(async (overrideAddr) => {
    const addr = (overrideAddr || propAddress).trim();
    const price = parseFloat(propPrice.replace(/[^0-9.]/g, ""));
    if (!addr || !price) { setPropError("Enter a full address and listing price."); return; }
    setPropLoading(true);
    setPropSugOpen(false);
    setPropSuggestions([]);
    setPropError(null);
    setPropResult(null);
    try {
      // 1. Google Geocoder → lat/lon
      const { lat, lon, displayAddr } = await new Promise((resolve, reject) => {
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ address: addr, region: "us" }, (results, status) => {
          if (status !== "OK" || !results?.[0]) {
            reject(new Error("Address not found — try including city and state (e.g. 123 Main St, Austin TX)."));
            return;
          }
          const r = results[0];
          const loc = r.geometry.location;
          resolve({
            lat: typeof loc.lat === "function" ? loc.lat() : loc.lat,
            lon: typeof loc.lng === "function" ? loc.lng() : loc.lng,
            displayAddr: r.formatted_address,
          });
        });
      });

      // 2. FCC Census Block Finder → county FIPS (CORS-safe, no API key)
      const fccRes = await fetch(`https://geo.fcc.gov/api/census/block/find?latitude=${lat}&longitude=${lon}&format=json`);
      const fccData = await fccRes.json();
      const fips      = fccData?.County?.FIPS || null;
      const countyName = fccData?.County?.name || null;
      const stateAbbr  = fccData?.State?.code  || null;

      // 3. Look up county in Ground Score data (if loaded)
      const gsd = groundScoreData;
      const gsCounty = fips && gsd
        ? (gsd.activation.find(c => c.fips === fips) || gsd.expansion?.find(c => c.fips === fips))
        : null;

      setPropResult({
        address: displayAddr,
        price,
        lat, lon,
        fips,
        countyName: gsCounty?.name || countyName,
        state: gsCounty?.state || stateAbbr,
        gsCounty,
      });
    } catch (e) {
      setPropError(e?.message || "Geocoding failed — check your connection and try again.");
    }
    setPropLoading(false);
  }, [propAddress, propPrice, groundScoreData]); // eslint-disable-line react-hooks/exhaustive-deps

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
              alignItems: { xs: "flex-start", md: "center" },
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
          <Box sx={{ display: "flex", alignItems: "center", ml: { xs: 0, md: 1 } }}>
            <button
              onClick={() => signOut()}
              style={{
                background: "transparent",
                border: "1px solid #1a3d5c",
                borderRadius: 4,
                color: "#5a7898",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                padding: "5px 12px",
                fontFamily: "'Inter', sans-serif",
                letterSpacing: "0.04em",
              }}
              onMouseEnter={e => { e.target.style.borderColor = "#a0b4c8"; e.target.style.color = "#a0b4c8"; }}
              onMouseLeave={e => { e.target.style.borderColor = "#1a3d5c"; e.target.style.color = "#5a7898"; }}
            >
              Sign Out
            </button>
          </Box>
        </Box>
      </Box>

      {/* ── Full-width Tab Navigation ───────────────────────────────── */}
      <Box sx={{ bgcolor: C.white, borderBottom: `1px solid ${C.border}`, px: 3 }}>
        <Box sx={{ display: "flex", gap: 0, overflowX: "auto" }}>
          {/* Portfolio group */}
          {[
            { v: "portfolio", label: "Portfolio" },
            { v: "housing",   label: "Housing Market" },
          ].map(({ v, label }, i) => (
            <button
              key={v}
              className="nav-tab"
              onClick={() => handleTab(v)}
              style={{
                padding: "10px 16px",
                fontSize: 11,
                fontWeight: 600,
                fontFamily: "'Inter',sans-serif",
                border: "none",
                borderBottom: chartPane === v ? `2px solid ${C.navy}` : "2px solid transparent",
                borderTop: "none",
                cursor: "pointer",
                whiteSpace: "nowrap",
                background: "transparent",
                color: chartPane === v ? C.navy : C.muted,
                transition: "all 0.15s",
                marginRight: i === 1 ? 16 : 0,
              }}
            >
              {label}
            </button>
          ))}
          {/* Property Analysis tab */}
          {[{ v: "property", label: "Property Analysis" }].map(({ v, label }) => (
            <button
              key={v}
              className="nav-tab-orange"
              onClick={() => handleTab(v)}
              style={{
                padding: "10px 16px",
                fontSize: 11,
                fontWeight: 600,
                fontFamily: "'Inter',sans-serif",
                border: "none",
                borderBottom: chartPane === v ? `2px solid ${C.orange}` : "2px solid transparent",
                borderTop: "none",
                cursor: "pointer",
                whiteSpace: "nowrap",
                background: "transparent",
                color: chartPane === v ? C.orange : C.muted,
                transition: "all 0.15s",
                marginRight: 16,
              }}
            >
              {label}
            </button>
          ))}
          {/* Divider */}
          <Box sx={{ width: 1, alignSelf: "stretch", bgcolor: C.border, mx: 1 }} />
          {/* Market strategy tabs */}
          {[
            { v: "neopoli",     label: "Activation Markets" },
            { v: "opportunity", label: "Expansion Markets" },
            { v: "formation",   label: "Formation Markets" },
            { v: "engineered",  label: "Engineered Markets" },
            { v: "coordinated", label: "Coordinated Markets" },
            { v: "model",       label: "Scoring Model" },
          ].map(({ v, label }) => (
            <button
              key={v}
              className="nav-tab"
              onClick={() => handleTab(v)}
              style={{
                padding: "10px 16px",
                fontSize: 11,
                fontWeight: 600,
                fontFamily: "'Inter',sans-serif",
                border: "none",
                borderBottom: chartPane === v ? `2px solid ${C.navy}` : "2px solid transparent",
                borderTop: "none",
                cursor: "pointer",
                whiteSpace: "nowrap",
                background: "transparent",
                color: chartPane === v ? C.navy : C.muted,
                transition: "all 0.15s",
              }}
            >
              {label}
            </button>
          ))}
        </Box>
      </Box>

      {/* ── Content ─────────────────────────────────────────────────── */}
      <Box sx={{ px: 3, py: 3 }}>

        {/* ── Property Analysis Pane ───────────────────────────────── */}
        {chartPane === "property" && (() => {
          // Remaining balance after Y years on a 30yr fixed
          const remainingBalance = (principal, annualRate, yearsPaid) => {
            if (!principal || !annualRate) return principal;
            const r = annualRate / 12;
            const n = 30 * 12;
            const p = yearsPaid * 12;
            return principal * (Math.pow(1 + r, n) - Math.pow(1 + r, p)) / (Math.pow(1 + r, n) - 1);
          };

          const kalshiMtgRaw = kalshiData?.series?.KXMORTGAGERATE?.markets?.length > 0
            ? (kalshiMedian(kalshiData.series.KXMORTGAGERATE.markets)?.value ?? null) : null;
          const kalshiMtgPct = kalshiMtgRaw ?? 7.0;
          const kalshiMtg    = kalshiMtgPct / 100;

          const price    = parseFloat(propPrice.replace(/[^0-9.]/g, "")) || 0;
          const result   = propResult;
          const stdDP    = propBuyerDown;
          const apContrib = price > 0 ? Math.max(0, 0.20 - stdDP) * price : 0;

          // Standard card payment
          const stdPI    = price > 0 ? _monthlyMortgage(price, stdDP, kalshiMtg) : null;
          const stdPMI   = price > 0 ? _monthlyPMI(price, stdDP) : 0;
          const stdTotal = stdPI != null ? stdPI + stdPMI : null;

          // AP card: always 20% down, no PMI
          const apPI     = price > 0 ? _monthlyMortgage(price, 0.20, kalshiMtg) : null;
          const savings  = (stdTotal != null && apPI != null) ? stdTotal - apPI : null;

          const hhi      = result?.gsCounty?.metrics?.median_hhi || null;
          const stdDTI   = (price > 0 && hhi) ? _housingDTI(price, hhi, stdDP, kalshiMtg) : null;
          const apDTI    = (price > 0 && hhi) ? _housingDTI(price, hhi, 0.20, kalshiMtg) : null;
          const stdPool  = (price > 0 && hhi) ? _buyerPoolPct(price, hhi, stdDP, kalshiMtg) : null;
          const apPool   = (price > 0 && hhi) ? _buyerPoolPct(price, hhi, 0.20, kalshiMtg) : null;
          const lift     = (stdPool != null && apPool != null) ? apPool - stdPool : null;

          return (
            <Grid container spacing={2.5}>

              {/* ── LEFT: Form ──────────────────────────────────────────── */}
              <Grid item xs={12} md={4}>
                <Card elevation={0} sx={{ border: `1px solid ${C.border}`, borderRadius: 1, overflow: "visible", height: "100%" }}>
                  <CardContent sx={{ pb: "12px !important", overflow: "visible" }}>
                    <SectionHeader title="Property Analysis" sub="Enter an address and listing price to generate a full mortgage &amp; market overview" />

                    {/* Address */}
                    <Box sx={{ mb: 2, position: "relative" }}>
                      <Typography sx={{ fontSize: 9, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.07em", mb: 0.5 }}>Property Address</Typography>
                      <input
                        value={propAddress}
                        onChange={e => { setPropAddress(e.target.value); }}
                        onKeyDown={e => {
                          if (e.key === "Enter") { setPropSugOpen(false); analyzeProperty(); }
                          if (e.key === "Escape") setPropSugOpen(false);
                        }}
                        onFocus={() => propSuggestions.length > 0 && setPropSugOpen(true)}
                        onBlur={() => setTimeout(() => setPropSugOpen(false), 150)}
                        placeholder="344 Coinbow Drive, Richmond VA 23223"
                        style={{ width: "100%", fontSize: 13, padding: "8px 12px", border: `1px solid ${C.border}`, borderRadius: 4, fontFamily: "'Inter',sans-serif", outline: "none", boxSizing: "border-box" }}
                      />
                      {propSugOpen && propSuggestions.length > 0 && (
                        <Box sx={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 9999, bgcolor: C.white, border: `1px solid ${C.border}`, borderRadius: 1, boxShadow: "0 4px 16px rgba(0,0,0,0.12)", mt: 0.5, overflow: "hidden" }}>
                          {propSuggestions.map((s, i) => {
                            const main = s.structured_formatting?.main_text || s.description;
                            const secondary = s.structured_formatting?.secondary_text || "";
                            return (
                              <Box
                                key={s.place_id || i}
                                onMouseDown={e => e.preventDefault()}
                                onClick={() => {
                                  propSugSelectedRef.current = true;
                                  setPropAddress(s.description);
                                  setPropSugOpen(false);
                                  setPropSuggestions([]);
                                }}
                                sx={{ px: 1.5, py: 1, cursor: "pointer", borderBottom: i < propSuggestions.length - 1 ? `1px solid ${C.border}` : "none", "&:hover": { bgcolor: C.bg } }}
                              >
                                <Typography sx={{ fontSize: 12, fontWeight: 600, color: C.charcoal }}>{main}</Typography>
                                {secondary && <Typography sx={{ fontSize: 10, color: C.muted }}>{secondary}</Typography>}
                              </Box>
                            );
                          })}
                        </Box>
                      )}
                    </Box>

                    {/* Listing Price */}
                    <Box sx={{ mb: 2 }}>
                      <Typography sx={{ fontSize: 9, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.07em", mb: 0.5 }}>Listing Price</Typography>
                      <input
                        value={propPrice}
                        onChange={e => setPropPrice(e.target.value.replace(/[^0-9]/g, ""))}
                        onBlur={e => {
                          const raw = e.target.value.replace(/[^0-9]/g, "");
                          setPropPrice(raw ? "$" + parseInt(raw, 10).toLocaleString() : "");
                        }}
                        onFocus={e => {
                          const raw = e.target.value.replace(/[^0-9]/g, "");
                          setPropPrice(raw || "");
                        }}
                        onKeyDown={e => e.key === "Enter" && analyzeProperty()}
                        placeholder="$425,000"
                        style={{ width: "100%", fontSize: 13, padding: "8px 12px", border: `1px solid ${C.border}`, borderRadius: 4, fontFamily: "'Inter',sans-serif", outline: "none", boxSizing: "border-box" }}
                      />
                    </Box>

                    {/* Down Payment */}
                    <Box sx={{ mb: 2 }}>
                      <Typography sx={{ fontSize: 9, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.07em", mb: 0.5 }}>Buyer Down Payment</Typography>
                      <select
                        value={propBuyerDown}
                        onChange={e => setPropBuyerDown(parseFloat(e.target.value))}
                        style={{ width: "100%", fontSize: 12, padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: 4, fontFamily: "'Inter',sans-serif", background: C.white, cursor: "pointer" }}
                      >
                        <option value={0}>0%</option>
                        <option value={0.035}>3.5%</option>
                        <option value={0.05}>5%</option>
                        <option value={0.10}>10%</option>
                      </select>
                    </Box>

                    {/* Analyze */}
                    <button
                      onClick={() => analyzeProperty()}
                      disabled={propLoading}
                      style={{ width: "100%", padding: "10px 0", fontSize: 12, fontWeight: 700, color: C.white, background: C.navy, border: "none", borderRadius: 4, cursor: propLoading ? "default" : "pointer", fontFamily: "'Inter',sans-serif", opacity: propLoading ? 0.7 : 1 }}
                    >
                      {propLoading ? "Analyzing…" : "Analyze Property"}
                    </button>
                    {propError && (
                      <Typography sx={{ fontSize: 11, color: "#e57373", mt: 1 }}>{propError}</Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {/* ── RIGHT: Output ───────────────────────────────────────── */}
              <Grid item xs={12} md={8}>

                {propLoading && (
                  <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, py: 8 }}>
                    <l-helix size="50" speed="2.5" color={C.navy}></l-helix>
                    <Typography sx={{ fontSize: 9, fontWeight: 600, color: C.muted, letterSpacing: "0.08em", textTransform: "uppercase" }}>Geocoding address · Loading market data</Typography>
                  </Box>
                )}

                {!propLoading && !result && (
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", minHeight: 200 }}>
                    <Typography sx={{ fontSize: 12, color: C.muted, textAlign: "center" }}>Enter an address and listing price,<br />then click Analyze Property.</Typography>
                  </Box>
                )}

                {result && !propLoading && (() => {
                  const county  = result.gsCounty;
                  const met     = county?.metrics || {};
                  const hpa     = met.zhvi_growth_1yr ?? 0.03;
                  const hpaOut  = county ? _hpaOutlook(met, kalshiMtgRaw) : null;

                  return (
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>

                      {/* Property header */}
                      <Card elevation={0} sx={{ border: `1px solid ${C.navy}`, borderRadius: 1, overflow: "hidden" }}>
                        <Box sx={{ background: C.navy, px: 2, py: 1.25 }}>
                          <Typography sx={{ fontSize: 11, fontWeight: 800, color: C.white, textTransform: "uppercase", letterSpacing: "0.09em" }}>Property Overview</Typography>
                          <Typography sx={{ fontSize: 10, color: "rgba(255,255,255,0.65)", mt: 0.25 }}>{result.address}</Typography>
                        </Box>
                        <CardContent sx={{ pb: "12px !important" }}>
                          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                            {[
                              { label: "Listing Price", value: `$${price.toLocaleString()}`, accent: true },
                              { label: "County", value: `${result.countyName}, ${result.state}` },
                              { label: "AP Contribution", value: apContrib > 0 ? `$${Math.round(apContrib).toLocaleString()} (${((0.20 - stdDP) * 100 % 1 === 0 ? ((0.20 - stdDP) * 100).toFixed(0) : ((0.20 - stdDP) * 100).toFixed(1))}%)` : "Buyer ≥ 20%" },
                              { label: "Buyer Down", value: `${stdDP === 0 ? "0" : (stdDP * 100 % 1 === 0 ? (stdDP * 100).toFixed(0) : (stdDP * 100).toFixed(1))}% · $${Math.round(stdDP * price).toLocaleString()}` },
                              { label: "Mortgage Rate", value: `${kalshiMtgPct.toFixed(2)}% (Kalshi)` },
                            ].map(({ label, value, accent }) => (
                              <Box key={label} sx={{ flex: "1 1 130px", minWidth: 120, border: `1px solid ${accent ? C.navy + "44" : C.border}`, borderRadius: 1, p: 0.75, background: accent ? C.navy + "08" : "transparent" }}>
                                <Typography sx={{ fontSize: 8, color: C.muted, fontWeight: 600 }}>{label}</Typography>
                                <Typography sx={{ fontSize: 12, fontWeight: 700, color: accent ? C.navy : C.charcoal }}>{value}</Typography>
                              </Box>
                            ))}
                          </Box>
                        </CardContent>
                      </Card>

                      {/* Standard vs AP mortgage cards */}
                      {stdTotal != null && apPI != null && (
                        <Card elevation={0} sx={{ border: `1px solid ${C.border}`, borderRadius: 1 }}>
                          <CardContent sx={{ pb: "12px !important" }}>
                            <SectionHeader
                              title="Mortgage Comparison"
                              sub={`${kalshiMtgPct.toFixed(2)}% rate (Kalshi) · 30-yr fixed · Standard: ${stdDP === 0 ? "0" : (stdDP * 100 % 1 === 0 ? (stdDP * 100).toFixed(0) : (stdDP * 100).toFixed(1))}% down · AP: 20% down (buyer ${stdDP === 0 ? "0" : (stdDP * 100 % 1 === 0 ? (stdDP * 100).toFixed(0) : (stdDP * 100).toFixed(1))}% + AP ${((0.20 - stdDP) * 100 % 1 === 0 ? ((0.20 - stdDP) * 100).toFixed(0) : ((0.20 - stdDP) * 100).toFixed(1))}%)`}
                            />
                            <Box sx={{ display: "flex", gap: 1.5, mb: 1.5, flexWrap: "wrap" }}>

                              {/* Standard card */}
                              <Box sx={{ flex: "1 1 140px", border: `1px solid ${C.border}`, borderRadius: 1, p: 1.5, background: C.bg }}>
                                <Typography sx={{ fontSize: 9, fontWeight: 800, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", mb: 0.75 }}>Standard · {stdDP === 0 ? "0" : (stdDP * 100 % 1 === 0 ? (stdDP * 100).toFixed(0) : (stdDP * 100).toFixed(1))}% Down</Typography>
                                <Typography sx={{ fontSize: 26, fontWeight: 800, color: C.charcoal, lineHeight: 1 }}>${Math.round(stdTotal).toLocaleString()}</Typography>
                                <Typography sx={{ fontSize: 10, color: C.muted, mb: 0.75 }}>P&amp;I: ${Math.round(stdPI).toLocaleString()}{stdPMI > 0 ? ` + $${Math.round(stdPMI).toLocaleString()} PMI` : ""}</Typography>
                                {stdDTI != null && (
                                  <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.5, mb: 0.25 }}>
                                    <Typography sx={{ fontSize: 13, fontWeight: 800, color: C.charcoal }}>{stdDTI.toFixed(1)}%</Typography>
                                    <Typography sx={{ fontSize: 10, color: C.muted }}>housing DTI</Typography>
                                  </Box>
                                )}
                                {stdPool != null && <Typography sx={{ fontSize: 10, color: C.muted, mb: 0.75 }}>~{stdPool.toFixed(0)}% of households qualify</Typography>}
                                {hhi && (() => {
                                  const req = Math.round((stdTotal / 0.43) * 12);
                                  const delta = req - hhi;
                                  const absFmt = `$${Math.round(Math.abs(delta) / 1000).toLocaleString()}k`;
                                  return (
                                    <Box sx={{ pt: 0.75, borderTop: `1px solid ${C.border}` }}>
                                      <Typography sx={{ fontSize: 9, fontWeight: 800, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", mb: 0.25 }}>Min. Income to Qualify</Typography>
                                      <Typography sx={{ fontSize: 16, fontWeight: 800, color: C.charcoal, lineHeight: 1, mb: 0.25 }}>${Math.round(req / 1000).toLocaleString()}k/yr</Typography>
                                      <Typography sx={{ fontSize: 10, fontWeight: 700, color: delta > 0 ? "#ef4444" : C.green }}>{delta > 0 ? `▲ ${absFmt} above median` : `▼ ${absFmt} below median`}</Typography>
                                    </Box>
                                  );
                                })()}
                              </Box>

                              {/* AP card */}
                              <Box sx={{ flex: "1 1 140px", border: `2px solid ${C.navy}`, borderRadius: 1, p: 1.5, background: C.navy, position: "relative" }}>
                                <Typography sx={{ fontSize: 9, fontWeight: 800, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.08em", mb: 0.75 }}>American Pledge · 20% Down</Typography>
                                <Box sx={{ display: "flex", alignItems: "flex-start", gap: "16px", mb: 0 }}>
                                  <Typography sx={{ fontSize: 26, fontWeight: 800, color: C.white, lineHeight: 1 }}>${Math.round(apPI).toLocaleString()}</Typography>
                                  {savings != null && savings > 0 && (
                                    <Box sx={{ pt: 0.25 }}>
                                      <Typography sx={{ fontSize: 10, color: "#7ee8a2", fontWeight: 700, lineHeight: 1.3 }}>saves ${Math.round(savings).toLocaleString()}/mo</Typography>
                                      {stdPMI > 0 && <Typography sx={{ fontSize: 9, color: "rgba(255,255,255,0.45)", lineHeight: 1.3 }}>${Math.round(stdPMI).toLocaleString()} PMI eliminated</Typography>}
                                    </Box>
                                  )}
                                </Box>
                                <Typography sx={{ fontSize: 10, color: "rgba(255,255,255,0.6)", mb: 0.75 }}>P&amp;I: ${Math.round(apPI).toLocaleString()} · no PMI</Typography>
                                {apDTI != null && (
                                  <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.5, mb: 0.25 }}>
                                    <Typography sx={{ fontSize: 13, fontWeight: 800, color: C.white }}>{apDTI.toFixed(1)}%</Typography>
                                    <Typography sx={{ fontSize: 10, color: "rgba(255,255,255,0.6)" }}>housing DTI</Typography>
                                  </Box>
                                )}
                                {apPool != null && <Typography sx={{ fontSize: 10, color: "rgba(255,255,255,0.75)", mb: 0.75 }}>~{apPool.toFixed(0)}% of households qualify</Typography>}
                                {hhi && (() => {
                                  const req = Math.round((apPI / 0.43) * 12);
                                  const delta = req - hhi;
                                  const absFmt = `$${Math.round(Math.abs(delta) / 1000).toLocaleString()}k`;
                                  return (
                                    <Box sx={{ pt: 0.75, borderTop: `1px solid rgba(255,255,255,0.15)` }}>
                                      <Typography sx={{ fontSize: 9, fontWeight: 800, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em", mb: 0.25 }}>Min. Income to Qualify</Typography>
                                      <Typography sx={{ fontSize: 16, fontWeight: 800, color: C.white, lineHeight: 1, mb: 0.25 }}>${Math.round(req / 1000).toLocaleString()}k/yr</Typography>
                                      <Typography sx={{ fontSize: 10, fontWeight: 700, color: delta > 0 ? "#fca5a5" : "#7ee8a2" }}>{delta > 0 ? `▲ ${absFmt} above median` : `▼ ${absFmt} below median`}</Typography>
                                    </Box>
                                  );
                                })()}
                                <img src="/ampledge_white.svg" alt="" style={{ position: "absolute", bottom: 8, right: 8, width: 18, height: 18, objectFit: "contain", opacity: 1 }} />
                              </Box>

                              {/* Affordability Lift */}
                              {lift != null && (
                                <Box sx={{ flex: "1 1 100px", border: `1px solid ${C.greenLight}55`, borderRadius: 1, p: 1.5, background: C.greenLight + "12", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                                  <Typography sx={{ fontSize: 9, fontWeight: 800, color: C.green, textTransform: "uppercase", letterSpacing: "0.08em", mb: 0.5 }}>Buyer Affordability Lift</Typography>
                                  <Typography sx={{ fontSize: 34, fontWeight: 800, color: C.greenLight, lineHeight: 1 }}>+{lift.toFixed(0)}</Typography>
                                  <Typography sx={{ fontSize: 10, color: C.green, fontWeight: 600, mb: 0.5 }}>pts buyer pool</Typography>
                                  <Typography sx={{ fontSize: 9, color: C.muted }}>AP contribution: ${Math.round(apContrib).toLocaleString()}</Typography>
                                </Box>
                              )}
                            </Box>
                          </CardContent>
                        </Card>
                      )}

                      {/* Market context */}
                      {county ? (
                        <Card elevation={0} sx={{ border: `1px solid ${C.border}`, borderRadius: 1, overflow: "hidden" }}>
                          <Box sx={{ background: C.navy + "cc", px: 2, py: 1.25 }}>
                            <Typography sx={{ fontSize: 11, fontWeight: 800, color: C.white, textTransform: "uppercase", letterSpacing: "0.09em" }}>
                              {county.name}, {county.state} · Market Context
                            </Typography>
                            <Typography sx={{ fontSize: 10, color: "rgba(255,255,255,0.65)", mt: 0.25 }}>
                              Ground Score rank #{county.rank} · {county.tier?.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                            </Typography>
                          </Box>
                          <CardContent sx={{ pb: "12px !important" }}>
                            {hpaOut && (
                              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 1.5 }}>
                                <Box sx={{ flex: "0 0 110px", border: `1px solid ${hpaOut.color}44`, borderRadius: 1, p: 1, background: hpaOut.color + "18" }}>
                                  <Typography sx={{ fontSize: 9, color: C.muted, fontWeight: 600, mb: 0.25 }}>Implied YoY Range</Typography>
                                  <Typography sx={{ fontSize: 16, fontWeight: 700, color: hpaOut.color, lineHeight: 1.1 }}>
                                    {hpaOut.hpaLow >= 0 ? "+" : ""}{hpaOut.hpaLow}–{hpaOut.hpaHigh}%
                                  </Typography>
                                  <Typography sx={{ fontSize: 9, color: C.muted }}>avg HPA/yr</Typography>
                                  <Typography sx={{ fontSize: 9, fontWeight: 700, color: hpaOut.color, mt: 0.25 }}>{hpaOut.label}</Typography>
                                </Box>
                                {hpaOut.drivers.map(d => {
                                  const dc = d.score >= 0.6 ? C.greenLight : d.score >= 0.35 ? "#f0a500" : "#e57373";
                                  return (
                                    <Box key={d.key} sx={{ flex: "1 1 90px", minWidth: 85, border: `1px solid ${dc}44`, borderRadius: 1, p: 1, background: dc + "0d" }}>
                                      <Typography sx={{ fontSize: 9, color: C.muted, fontWeight: 600, mb: 0.25 }}>{d.label}</Typography>
                                      <Typography sx={{ fontSize: 13, fontWeight: 700, color: dc, lineHeight: 1.1 }}>{d.value ?? "—"}</Typography>
                                      <Typography sx={{ fontSize: 8, color: C.muted, mt: 0.25, lineHeight: 1.4 }}>{d.detail}</Typography>
                                    </Box>
                                  );
                                })}
                              </Box>
                            )}
                            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                              {[
                                { label: "Ground Score", value: county.composite?.toFixed(1) },
                                { label: "1yr HPA", value: met.zhvi_growth_1yr != null ? `${(met.zhvi_growth_1yr * 100).toFixed(1)}%` : "—" },
                                { label: "Median HHI", value: met.median_hhi ? `$${(met.median_hhi / 1000).toFixed(0)}k` : "—" },
                                { label: "Unemployment", value: met.unemployment_rate != null ? `${met.unemployment_rate.toFixed(1)}%` : "—" },
                                { label: "Pop Growth", value: met.pop_growth_pct != null ? `${met.pop_growth_pct >= 0 ? "+" : ""}${met.pop_growth_pct.toFixed(1)}%` : "—" },
                                { label: "Median Home Val.", value: met.zhvi_latest ? `$${(met.zhvi_latest / 1000).toFixed(0)}k` : "—" },
                              ].map(({ label, value }) => (
                                <Box key={label} sx={{ flex: "1 1 90px", minWidth: 80, border: `1px solid ${C.border}`, borderRadius: 1, p: 0.75 }}>
                                  <Typography sx={{ fontSize: 8, color: C.muted, fontWeight: 600 }}>{label}</Typography>
                                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: C.charcoal }}>{value ?? "—"}</Typography>
                                </Box>
                              ))}
                            </Box>
                          </CardContent>
                        </Card>
                      ) : (
                        <Card elevation={0} sx={{ border: `1px solid ${C.border}`, borderRadius: 1 }}>
                          <CardContent>
                            <Typography sx={{ fontSize: 11, color: C.muted, p: 1 }}>
                              County FIPS <strong>{result.fips}</strong> ({result.countyName}, {result.state}) was geocoded successfully but is not in the Ground Score universe. Load a market tab first to populate the dataset.
                            </Typography>
                          </CardContent>
                        </Card>
                      )}

                      {/* Equity projections */}
                      {price > 0 && (
                        <Card elevation={0} sx={{ border: `1px solid ${C.border}`, borderRadius: 1 }}>
                          <CardContent sx={{ pb: "12px !important" }}>
                            <SectionHeader
                              title="Equity &amp; Investment Outcome"
                              sub={`${(hpa * 100).toFixed(1)}% avg annual HPA${county ? ` (${county.name})` : ""} · Standard: ${stdDP === 0 ? "0" : (stdDP * 100 % 1 === 0 ? (stdDP * 100).toFixed(0) : (stdDP * 100).toFixed(1))}% down · AP: 20% down · AP appreciation share via fund schedule`}
                            />
                            <Box sx={{ overflowX: "auto" }}>
                              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                                <thead>
                                  <tr>
                                    {["Hold Period", "Est. Value", "Appreciation", `Std ${stdDP === 0 ? "0" : (stdDP * 100 % 1 === 0 ? (stdDP * 100).toFixed(0) : (stdDP * 100).toFixed(1))}% Bal.`, `Std Equity`, "AP Bal.", "AP Cap Rate", "AP Share Due", "Buyer Net Equity", "Advantage"].map(h => (
                                      <th key={h} style={{ padding: "6px 10px", textAlign: "left", fontSize: 9, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em", borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>{h}</th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {[1, 2, 3, 5, 10].map((yr, i) => {
                                    const futureVal    = price * Math.pow(1 + hpa, yr);
                                    const appreciation = futureVal - price;
                                    const cap          = CAP_SCHEDULE[yr - 1] ?? 1.0;
                                    const apShareAmt   = appreciation * cap;

                                    const stdLoan  = price * (1 - stdDP);
                                    const stdBal   = remainingBalance(stdLoan, kalshiMtg, yr);
                                    const stdEquity = futureVal - stdBal;

                                    const apLoan   = price * 0.80;
                                    const apBal    = remainingBalance(apLoan, kalshiMtg, yr);
                                    const apNetEq  = (futureVal - apBal) - apShareAmt;
                                    const equityAdv = apNetEq - stdEquity;
                                    return (
                                      <tr key={yr} style={{ background: i % 2 === 1 ? C.bg : C.white }}>
                                        <td style={{ padding: "8px 10px", fontWeight: 700, color: C.navy }}>{yr} yr</td>
                                        <td style={{ padding: "8px 10px", color: C.charcoal }}>${Math.round(futureVal).toLocaleString()}</td>
                                        <td style={{ padding: "8px 10px", color: C.greenLight, fontWeight: 600 }}>+${Math.round(appreciation).toLocaleString()}</td>
                                        <td style={{ padding: "8px 10px", color: C.muted }}>${Math.round(stdBal).toLocaleString()}</td>
                                        <td style={{ padding: "8px 10px", fontWeight: 700, color: C.charcoal }}>${Math.round(stdEquity).toLocaleString()}</td>
                                        <td style={{ padding: "8px 10px", color: C.muted }}>${Math.round(apBal).toLocaleString()}</td>
                                        <td style={{ padding: "8px 10px", color: C.muted }}>{(cap * 100).toFixed(1)}%</td>
                                        <td style={{ padding: "8px 10px", color: C.orange }}>-${Math.round(apShareAmt).toLocaleString()}</td>
                                        <td style={{ padding: "8px 10px", fontWeight: 700, color: C.orange }}>${Math.round(apNetEq).toLocaleString()}</td>
                                        <td style={{ padding: "8px 10px", fontWeight: 700, color: equityAdv >= 0 ? C.greenLight : "#e57373" }}>
                                          {equityAdv >= 0 ? "+" : ""}${Math.round(equityAdv).toLocaleString()}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </Box>
                            <Typography sx={{ fontSize: 9, color: C.muted, mt: 1.5, lineHeight: 1.7 }}>
                              AP Cap Rate follows the fund's schedule (yr 1: 46.7% → yr 5+: 100%). AP Net Equity = home value minus loan balance minus AP's appreciation share. Advantage = buyer's AP equity minus Standard equity at sale.
                            </Typography>
                          </CardContent>
                        </Card>
                      )}

                    </Box>
                  );
                })()}

              </Grid>
            </Grid>
          );
        })()}

        {/* ── Main Two-Column Section ──────────────────────────────── */}
        {chartPane !== "property" && (<>
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
              {/* Case-Shiller chart */}
              <Box
                sx={{
                  display: "flex",
                  gap: 2,
                  flexDirection: { xs: "column", md: "row" },
                }}
              >
                {/* Left col: Case-Shiller card + conditional correlation table */}
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                    flex: 1,
                    minWidth: 0,
                    flexBasis: { md: "50%" },
                  }}
                >
                  {(chartPane === "neopoli" || chartPane === "opportunity" || chartPane === "formation" || chartPane === "engineered") && (() => {
                    const tabLabel = chartPane === "neopoli" ? "Activation Markets" : chartPane === "opportunity" ? "Expansion Markets" : chartPane === "formation" ? "Formation Markets" : "Engineered Markets";
                    const accentColor = chartPane === "neopoli" ? C.navy : chartPane === "opportunity" ? C.greenLight : chartPane === "formation" ? C.blue : C.orange;
                    const thesisMeta = {
                      neopoli:     { entry: "Distressed basis", demand: "Catalyst event · Federal awards", ap: "Buyer pool expansion", hold: "3–5 years" },
                      opportunity: { entry: "Greenfield MPC", demand: "Metro adjacency · HHI", ap: "Down payment program", hold: "5–7 years" },
                      formation:   { entry: "Greenfield land assembly", demand: "In-migration · Pop growth", ap: "MPC buyer engine", hold: "7–10 years" },
                      engineered:  { entry: "Pre-announcement land", demand: "Employer workforce", ap: "Workforce housing engine", hold: "10–15 years" },
                    }[chartPane];
                    return (
                    <Card elevation={0} sx={{ border: `1px solid ${C.border}`, borderRadius: 1 }}>
                      <Box
                        sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 2, py: 1.25, borderBottom: showTabOverview ? `1px solid ${C.border}` : "none", cursor: "pointer" }}
                        onClick={() => setShowTabOverview((v) => !v)}
                      >
                        <Typography sx={{ fontSize: 10, fontWeight: 800, color: C.navy, textTransform: "uppercase", letterSpacing: "0.09em" }}>
                          Ground Score Market Intelligence · {tabLabel}
                        </Typography>
                        <span style={{ fontSize: 12, fontWeight: 600, color: C.navy, userSelect: "none", border: `1px solid ${C.navy}`, borderRadius: 4, background: "#dce4ec", padding: "3px 10px", cursor: "pointer" }}>
                          {showTabOverview ? "HIDE" : "EXPAND"}
                        </span>
                      </Box>
                      {/* Collapsed: always show thesis quick-stats */}
                      <Box sx={{ px: 2, py: 1, display: "flex", gap: 1, flexWrap: "wrap", borderBottom: showTabOverview ? `1px solid ${C.border}` : "none" }}>
                        {[
                          { label: "Entry Strategy", val: thesisMeta.entry },
                          { label: "Demand Driver", val: thesisMeta.demand },
                          { label: "AP Role", val: thesisMeta.ap },
                          { label: "Target Hold", val: thesisMeta.hold },
                        ].map(({ label, val }) => (
                          <Box key={label} sx={{ flex: "1 1 100px", minWidth: 95, border: `1px solid ${accentColor}22`, borderRadius: 1, px: 1, py: 0.6, background: accentColor + "08" }}>
                            <Typography sx={{ fontSize: 8, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</Typography>
                            <Typography sx={{ fontSize: 10, fontWeight: 700, color: accentColor, mt: 0.2, lineHeight: 1.3 }}>{val}</Typography>
                          </Box>
                        ))}
                      </Box>
                      {showTabOverview && (
                        <CardContent sx={{ pb: "12px !important" }}>
                          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                            {/* Platform context */}
                            <Box>
                              <Typography sx={{ fontSize: 10, fontWeight: 800, color: C.navy, textTransform: "uppercase", letterSpacing: "0.09em", mb: 0.75 }}>
                                Ground Score Market Intelligence
                              </Typography>
                              <Typography sx={{ fontSize: 11, color: C.muted, lineHeight: 1.7 }}>
                                Ground Score Market Intelligence is location-intelligence based on market Ground Scores for identifying where capital deployment will generate the most durable, long-term returns. It uses deterministic scoring across economic, demographic, infrastructure, and market-readiness dimensions to surface markets that the broader investment community has not yet priced correctly — either because they are overlooked, misunderstood, or simply too early. Four complementary strategies operate within the platform, each targeting a different type of market opportunity and a different investment product.
                              </Typography>
                            </Box>
                            {/* Strategy detail */}
                            <Box sx={{ pt: 1.5, borderTop: `1px solid ${C.border}` }}>
                              <Typography sx={{ fontSize: 10, fontWeight: 800, color: accentColor, textTransform: "uppercase", letterSpacing: "0.09em", mb: 0.75 }}>
                                {tabLabel}
                              </Typography>
                              {chartPane === "neopoli" && (
                                <>
                                  <Typography sx={{ fontSize: 11, color: C.muted, lineHeight: 1.7, mb: 0.75 }}>
                                    <span style={{ fontWeight: 700, color: C.charcoal }}>Thesis — </span>
                                    Target distressed secondary and tertiary markets ahead of catalyst events. Entry cost is low by design — economic dislocation creates acquisition basis. When the catalyst fires (employer anchor, federal infrastructure award, OZ deployment), appreciation accrues to early-positioned capital. American Pledge's 20% down payment program expands the qualified buyer pool in markets where affordability is the primary barrier, accelerating exit.
                                  </Typography>
                                  <Typography sx={{ fontSize: 11, color: C.muted, lineHeight: 1.7, mb: 0.75 }}>
                                    <span style={{ fontWeight: 700, color: C.charcoal }}>What it uncovers — </span>
                                    Markets where current pricing still reflects the distressed baseline rather than the coming transformation. Ground Score screens for the convergence of cost advantage, distress depth, momentum signals, and catalyst evidence — the combination that historically precedes a breakout.
                                  </Typography>
                                  <Typography sx={{ fontSize: 11, color: C.muted, lineHeight: 1.7, mb: 0.75 }}>
                                    <span style={{ fontWeight: 700, color: C.charcoal }}>Investment strategy — </span>
                                    Acquire existing multifamily, mixed-use, or industrial assets at a low basis ahead of the activation event. Hold through the re-rating. Exit into a market that has repriced to reflect its new trajectory.
                                  </Typography>
                                  <Typography sx={{ fontSize: 11, color: C.muted, lineHeight: 1.7 }}>
                                    <span style={{ fontWeight: 700, color: C.charcoal }}>Dimensions —</span>
                                    {" "}Each market is evaluated across 12 fixed dimensions — covering cost, distress, demographic and labor momentum, business activity, catalysts, anchor institutions, infrastructure, logistics, governance, risk, and regulatory friction. The goal is not to find the cheapest place but to find where <span style={{ fontStyle: "italic", color: C.charcoal }}>low cost, distress, momentum, and executability align</span>.
                                  </Typography>
                                </>
                              )}
                              {chartPane === "opportunity" && (
                                <>
                                  <Typography sx={{ fontSize: 11, color: C.muted, lineHeight: 1.7, mb: 0.75 }}>
                                    <span style={{ fontWeight: 700, color: C.charcoal }}>Thesis — </span>
                                    Target metro-fringe counties with strong household income, land availability, and proximity to major employment centers. These markets are primed for master-planned community development where American Pledge's down payment program is the decisive lever: converting a large pool of qualified-income households into first-time buyers.
                                  </Typography>
                                  <Typography sx={{ fontSize: 11, color: C.muted, lineHeight: 1.7, mb: 0.75 }}>
                                    <span style={{ fontWeight: 700, color: C.charcoal }}>What it uncovers — </span>
                                    Greenfield sites at the edge of proven growth corridors where population is already arriving, land is still at agricultural pricing, entitlement conditions are favorable, and no competing master-planned supply has yet broken ground.
                                  </Typography>
                                  <Typography sx={{ fontSize: 11, color: C.muted, lineHeight: 1.7, mb: 0.75 }}>
                                    <span style={{ fontWeight: 700, color: C.charcoal }}>Investment strategy — </span>
                                    Acquire raw or agricultural land at the metro fringe before residential demand is fully reflected in land pricing. Entitle and develop a master-planned community targeting family households. Monetize through lot sales, homebuilder partnerships, and long-term community infrastructure ownership.
                                  </Typography>
                                  <Typography sx={{ fontSize: 11, color: C.muted, lineHeight: 1.7 }}>
                                    <span style={{ fontWeight: 700, color: C.charcoal }}>Dimensions —</span>
                                    {" "}Each market is evaluated across 12 fixed dimensions — covering metro adjacency, population and migration momentum, land availability, household income, employment base, school district quality, housing demand pressure, infrastructure capacity, permitting climate, natural amenity, risk resilience, and tax environment. The goal is not to find the fastest-growing place but to find where <span style={{ fontStyle: "italic", color: C.charcoal }}>confirmed demand, affordable land, and a favorable development environment align</span> before competing supply arrives.
                                  </Typography>
                                </>
                              )}
                              {chartPane === "formation" && (
                                <>
                                  <Typography sx={{ fontSize: 11, color: C.muted, lineHeight: 1.7, mb: 0.75 }}>
                                    <span style={{ fontWeight: 700, color: C.charcoal }}>Thesis — </span>
                                    Identify greenfield corridors where demographic momentum, low land cost, and development-ready infrastructure converge — before institutional capital arrives. Formation markets are growth corridors at early inflection where a master-planned community with the American Pledge program creates the demand ecosystem from the ground up.
                                  </Typography>
                                  <Typography sx={{ fontSize: 11, color: C.muted, lineHeight: 1.7, mb: 0.75 }}>
                                    <span style={{ fontWeight: 700, color: C.charcoal }}>What it uncovers — </span>
                                    Counties where population is growing, people are arriving from other markets, land is affordable, permits are moving, and employment is expanding — but no large community builder has yet committed land. The window before supply catches up.
                                  </Typography>
                                  <Typography sx={{ fontSize: 11, color: C.muted, lineHeight: 1.7, mb: 0.75 }}>
                                    <span style={{ fontWeight: 700, color: C.charcoal }}>Investment strategy — </span>
                                    Assemble raw land in advance of the growth wave. Develop a master-planned community targeting the in-migrant demographic. American Pledge provides the buyer engine — converting new workforce arrivals into homeowners and driving community fill velocity.
                                  </Typography>
                                  <Typography sx={{ fontSize: 11, color: C.muted, lineHeight: 1.7 }}>
                                    <span style={{ fontWeight: 700, color: C.charcoal }}>Scoring model —</span>
                                    {" "}5 dimensions computed client-side: Demographic Momentum (pop growth + net migration, 30%), Greenfield Potential (low density + affordable land, 25%), Development Velocity (permit activity, 20%), Employment Growth (15%), Buyer Quality (HHI + HPA, 10%).
                                  </Typography>
                                </>
                              )}
                              {chartPane === "engineered" && (
                                <>
                                  <Typography sx={{ fontSize: 11, color: C.muted, lineHeight: 1.7, mb: 0.75 }}>
                                    <span style={{ fontWeight: 700, color: C.charcoal }}>Thesis — </span>
                                    Employer-first site acquisition ahead of public announcement. When the family office brings an employer anchor to a market, it creates a designed demand ecosystem: the employer generates the workforce, American Pledge converts that workforce into buyers, and the adjacent MPC captures the housing demand. This is not market selection — it is market creation.
                                  </Typography>
                                  <Typography sx={{ fontSize: 11, color: C.muted, lineHeight: 1.7, mb: 0.75 }}>
                                    <span style={{ fontWeight: 700, color: C.charcoal }}>What it uncovers — </span>
                                    Sites that score on available workforce, affordable land, and infrastructure readiness — but have not yet seen the employer announcement that would activate demand. The value is captured between site acquisition and public announcement.
                                  </Typography>
                                  <Typography sx={{ fontSize: 11, color: C.muted, lineHeight: 1.7, mb: 0.75 }}>
                                    <span style={{ fontWeight: 700, color: C.charcoal }}>Investment strategy — </span>
                                    Acquire land around the future employer site before the announcement. Build the workforce housing community in parallel with employer construction. AP program converts the arriving workforce into buyers at scale, generating absorption velocity no speculative development could match.
                                  </Typography>
                                  <Typography sx={{ fontSize: 11, color: C.muted, lineHeight: 1.7 }}>
                                    <span style={{ fontWeight: 700, color: C.charcoal }}>Scoring model —</span>
                                    {" "}5 dimensions, weights adjustable via employer profile: Available Workforce (30%), Land & Dev Cost (15–25% depending on land priority setting), Infrastructure (20%), Growth Momentum (15%), AP Absorption (10%).
                                  </Typography>
                                </>
                              )}
                            </Box>
                          </Box>
                        </CardContent>
                      )}
                    </Card>
                    );
                  })()}

                  {chartPane !== "model" && chartPane !== "coordinated" && (
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
                              Monthly YoY % change · 20 MSAs + National
                              Composite · Source: FRED
                              {selectedCity && (
                                <span
                                  style={{
                                    color: C.red,
                                    fontWeight: 700,
                                    marginLeft: 8,
                                  }}
                                >
                                  ▶ {selectedCity} highlighted
                                </span>
                              )}
                            </Typography>
                          </Box>
                          {(chartPane === "neopoli" ||
                            chartPane === "opportunity") &&
                            groundScoreData &&
                            (() => {
                              const m =
                                chartPane === "neopoli"
                                  ? groundScoreData.activation.find(
                                      (x) => x.fips === neopoliMarket,
                                    ) || groundScoreData.activation[0]
                                  : groundScoreData.expansion.find(
                                      (x) => x.fips === neopoliMarket,
                                    ) || groundScoreData.expansion[0];
                              if (!m?.metrics?.cs_city) return null;
                              const csCity = m.metrics.cs_city;
                              const csDist = m.metrics.cs_dist_mi;
                              const cityColor = CITY_COLORS[csCity] || C.blue;
                              return (
                                <Box sx={{ textAlign: "right" }}>
                                  <Typography
                                    sx={{
                                      fontSize: 24,
                                      fontWeight: 800,
                                      color: cityColor,
                                      lineHeight: 1,
                                    }}
                                  >
                                    {csDist != null ? `${csDist} mi` : csCity}
                                  </Typography>
                                  {csDist != null && (
                                    <Typography
                                      sx={{
                                        fontSize: 10,
                                        color: C.muted,
                                        mt: 0.25,
                                      }}
                                    >
                                      from {m.name} to {csCity}
                                    </Typography>
                                  )}
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
                                      color: active
                                        ? CITY_COLORS[city]
                                        : C.muted,
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
                  )}

                  {/* Analysis Period slider — below Case-Shiller */}
                  {(chartPane === "portfolio" || chartPane === "housing") && (
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
                              1990, 1995, 2000, 2005, 2010, 2015, 2020, 2025,
                              2030, 2035,
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
                              ⚠ Years 2026–{yearRange[1]} are projections, not
                              historical data
                            </Typography>
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Ground Score County Map — Activation */}
                  {chartPane === "neopoli" && (
                    <Box
                      sx={{ display: "flex", gap: 2, alignItems: "stretch" }}
                    >
                      <Card
                        elevation={0}
                        sx={{
                          border: `1px solid ${C.border}`,
                          borderRadius: 1,
                          flex: "0 0 58%",
                        }}
                      >
                        <CardContent sx={{ pb: "12px !important" }}>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "flex-start",
                              justifyContent: "space-between",
                              mb: 1,
                            }}
                          >
                            <SectionHeader
                              title="Ground Score Yield Map"
                              sub="All 3,100+ US counties"
                            />
                            <SearchBox
                              groundScoreData={groundScoreData}
                              placesIndex={placesIndex}
                              onSelectCounty={(fips) => {
                                setNeopoliMarket(fips);
                                const county =
                                  groundScoreData?.activation?.find(
                                    (c) => c.fips === fips,
                                  ) ||
                                  groundScoreData?.expansion?.find(
                                    (c) => c.fips === fips,
                                  );
                                if (county)
                                  setSelectedCity(
                                    county.metrics?.cs_city || null,
                                  );
                              }}
                              onSelectCity={(item) => {
                                searchedCityRef.current = item.place_fips;
                                setSelectedCityFips(item.place_fips);
                                setNeopoliMarket(item.county_fips);
                                // Score on demand if not already pre-scored
                                if (
                                  !item.pre_scored &&
                                  !onDemandCities[item.place_fips] &&
                                  groundScoreData?.metric_bounds
                                ) {
                                  const dimCfg =
                                    chartPane === "opportunity"
                                      ? OPPORTUNITY_DIMS_CONFIG
                                      : NEOPOLI_DIMS_CONFIG;
                                  scoreCityBrowserSide(
                                    item,
                                    groundScoreData.metric_bounds,
                                    dimCfg,
                                  ).then((result) => {
                                    if (result)
                                      setOnDemandCities((prev) => ({
                                        ...prev,
                                        [item.place_fips]: {
                                          ...result,
                                          place_fips: item.place_fips,
                                          name: item.label,
                                          state: item.state,
                                          county_fips: item.county_fips,
                                          lat: item.lat,
                                          lon: item.lon,
                                        },
                                      }));
                                  });
                                }
                              }}
                            />
                          </Box>
                          <CountyMap
                            counties={groundScoreData?.activation}
                            selectedFips={mapFips}
                            thesis="activation"
                            zoom={mapZoom}
                            center={mapCenter}
                            onCentroidReady={(cmap) => {
                              countyCentroidRef.current = cmap;
                            }}
                            onSelect={(fips, county) => {
                              setNeopoliMarket(fips);
                              setSelectedCity(county.metrics?.cs_city || null);
                            }}
                          />
                        </CardContent>
                      </Card>
                      <Card
                        elevation={0}
                        sx={{
                          border: `1px solid ${C.border}`,
                          borderRadius: 1,
                          flex: "1 1 42%",
                          display: "flex",
                          flexDirection: "column",
                        }}
                      >
                        <CardContent
                          sx={{
                            pb: "12px !important",
                            display: "flex",
                            flexDirection: "column",
                            flex: 1,
                          }}
                        >
                          {groundScoreData &&
                            (() => {
                              const m =
                                groundScoreData.activation.find(
                                  (x) => x.fips === neopoliMarket,
                                ) || groundScoreData.activation[0];
                              const preScoredCities = m?.cities || [];
                              const preScoredFips = new Set(
                                preScoredCities.map((c) => c.place_fips),
                              );
                              const demandCities = Object.values(onDemandCities)
                                .filter(
                                  (c) =>
                                    c.county_fips === m?.fips &&
                                    !preScoredFips.has(c.place_fips),
                                )
                                .sort(
                                  (a, b) =>
                                    (b.composite || 0) - (a.composite || 0),
                                );
                              const cities = [
                                ...preScoredCities,
                                ...demandCities,
                              ];
                              return (
                                <>
                                  <SectionHeader
                                    title={
                                      m
                                        ? `${m.name}, ${m.state} · City Map`
                                        : "City Map"
                                    }
                                    sub={
                                      cities.length
                                        ? `${cities.length} cities · dot size = population`
                                        : "Search a city to score it on demand"
                                    }
                                  />
                                  {cities.length > 0 ? (
                                    <CityMap
                                      cities={cities}
                                      countyFips={m?.fips}
                                      countyName={m?.name || ""}
                                      selectedCityFips={selectedCityFips}
                                      onCitySelect={selectCityManually}
                                      showOZ={showOZ}
                                      onToggleOZ={() => setShowOZ((v) => !v)}
                                      ozGeoData={ozGeoData}
                                      ozLoading={ozLoading}
                                    />
                                  ) : (
                                    <Box
                                      sx={{
                                        height: 200,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                      }}
                                    >
                                      <Typography
                                        sx={{ fontSize: 11, color: C.muted }}
                                      >
                                        Search a city above to score it on
                                        demand
                                      </Typography>
                                    </Box>
                                  )}
                                </>
                              );
                            })()}
                        </CardContent>
                      </Card>
                    </Box>
                  )}

                  {/* Ground Score Market Rankings — Activation */}
                  {chartPane === "neopoli" && (
                    <Card
                      elevation={0}
                      sx={{ border: `1px solid ${C.border}`, borderRadius: 1 }}
                    >
                      <CardContent sx={{ pb: "12px !important" }}>
                        <SectionHeader
                          title="Ground Score Rankings"
                          sub={
                            groundScoreData
                              ? `Activation Dimensions · ${groundScoreData.activation.length.toLocaleString()} counties scored · ${groundScoreData.generated} · click a county to load its scorecard`
                              : "Activation Dimensions scoring · loading..."
                          }
                        />
                        {groundScoreLoading && (
                          <Typography
                            sx={{
                              fontSize: 12,
                              color: C.muted,
                              py: 2,
                              textAlign: "center",
                            }}
                          >
                            Loading county data…
                          </Typography>
                        )}
                        {groundScoreData &&
                          (() => {
                            const rows = groundScoreData.activation;
                            const totalPages = Math.ceil(
                              rows.length / GS_PAGE_SIZE,
                            );
                            const page = Math.min(gsActPage, totalPages - 1);
                            const slice = rows.slice(
                              page * GS_PAGE_SIZE,
                              (page + 1) * GS_PAGE_SIZE,
                            );
                            return (
                              <>
                                <Box sx={{ overflowX: "auto" }}>
                                  <table
                                    style={{
                                      width: "100%",
                                      borderCollapse: "collapse",
                                      fontSize: 12,
                                    }}
                                  >
                                    <thead>
                                      <tr>
                                        {[
                                          "#",
                                          "County",
                                          "State",
                                          "Ground Score",
                                          "Tier",
                                          "HPA Outlook",
                                        ].map((h) => (
                                          <th
                                            key={h}
                                            style={{
                                              padding: "6px 10px",
                                              textAlign: "left",
                                              color: C.muted,
                                              fontWeight: 700,
                                              fontSize: 10,
                                              textTransform: "uppercase",
                                              letterSpacing: "0.07em",
                                              borderBottom: `1px solid ${C.border}`,
                                              whiteSpace: "nowrap",
                                            }}
                                          >
                                            {h}
                                          </th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {slice.map((m, i) => {
                                        const tierMeta =
                                          NEOPOLI_TIER_META[m.tier] ||
                                          NEOPOLI_TIER_META.watchlist;
                                        const isSelected =
                                          neopoliMarket === m.fips;
                                        const kalshiMtg = kalshiData?.series?.KXMORTGAGERATE?.markets?.length > 0
                                          ? kalshiMedian(kalshiData.series.KXMORTGAGERATE.markets)?.value ?? null
                                          : null;
                                        const hpaOut = _hpaOutlook(m.metrics, kalshiMtg);
                                        return (
                                          <tr
                                            key={m.fips}
                                            onClick={() => {
                                              setNeopoliMarket(m.fips);
                                              setSelectedCity(
                                                m.metrics?.cs_city || null,
                                              );
                                            }}
                                            style={{
                                              background: isSelected
                                                ? C.navy
                                                : i % 2 === 0
                                                  ? "transparent"
                                                  : C.bg,
                                              cursor: "pointer",
                                              borderBottom: `1px solid ${C.border}`,
                                            }}
                                          >
                                            <td
                                              style={{
                                                padding: "7px 10px",
                                                fontWeight: 700,
                                                color: isSelected
                                                  ? C.white
                                                  : C.navy,
                                                fontSize: 11,
                                                minWidth: 28,
                                              }}
                                            >
                                              {m.rank}
                                            </td>
                                            <td
                                              style={{
                                                padding: "7px 10px",
                                                fontWeight: 700,
                                                color: isSelected
                                                  ? C.white
                                                  : C.charcoal,
                                                whiteSpace: "nowrap",
                                              }}
                                            >
                                              {m.name}
                                            </td>
                                            <td
                                              style={{
                                                padding: "7px 10px",
                                                color: isSelected
                                                  ? "rgba(255,255,255,0.7)"
                                                  : C.muted,
                                                fontSize: 11,
                                              }}
                                            >
                                              {m.state}
                                            </td>
                                            <td
                                              style={{
                                                padding: "7px 14px 7px 10px",
                                                whiteSpace: "nowrap",
                                                minWidth: 160,
                                              }}
                                            >
                                              <Box
                                                sx={{
                                                  display: "flex",
                                                  alignItems: "center",
                                                  gap: 1,
                                                }}
                                              >
                                                <Box
                                                  sx={{
                                                    flex: 1,
                                                    height: 6,
                                                    background: isSelected
                                                      ? "rgba(255,255,255,0.2)"
                                                      : C.border,
                                                    borderRadius: 3,
                                                    minWidth: 80,
                                                  }}
                                                >
                                                  <Box
                                                    sx={{
                                                      width: `${m.composite}%`,
                                                      height: "100%",
                                                      background: isSelected
                                                        ? C.white
                                                        : tierMeta.barColor,
                                                      borderRadius: 3,
                                                    }}
                                                  />
                                                </Box>
                                                <span
                                                  style={{
                                                    fontWeight: 700,
                                                    color: isSelected
                                                      ? C.white
                                                      : C.charcoal,
                                                    fontSize: 11,
                                                    minWidth: 36,
                                                    textAlign: "right",
                                                  }}
                                                >
                                                  {m.composite.toFixed(1)}
                                                </span>
                                              </Box>
                                            </td>
                                            <td style={{ padding: "7px 10px" }}>
                                              <span
                                                style={{
                                                  fontSize: 10,
                                                  fontWeight: 700,
                                                  color: isSelected
                                                    ? C.navy
                                                    : tierMeta.color,
                                                  background: isSelected
                                                    ? C.white
                                                    : tierMeta.badgeBg ||
                                                      tierMeta.color + "18",
                                                  border: `1px solid ${isSelected ? C.white : tierMeta.badgeBg ? tierMeta.color + "88" : tierMeta.color + "44"}`,
                                                  borderRadius: 4,
                                                  padding: "2px 7px",
                                                  whiteSpace: "nowrap",
                                                }}
                                              >
                                                {tierMeta.label}
                                              </span>
                                            </td>
                                            <td style={{ padding: "7px 10px", whiteSpace: "nowrap" }}>
                                              {hpaOut ? (
                                                <span style={{
                                                  fontSize: 10, fontWeight: 700,
                                                  color: isSelected ? C.navy : hpaOut.color,
                                                  background: isSelected ? C.white : hpaOut.color + "1a",
                                                  border: `1px solid ${isSelected ? C.white : hpaOut.color + "55"}`,
                                                  borderRadius: 4, padding: "2px 7px",
                                                }}>
                                                  {hpaOut.label}
                                                </span>
                                              ) : (
                                                <span style={{ fontSize: 10, color: C.muted }}>—</span>
                                              )}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </Box>
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    mt: 1.5,
                                    pt: 1,
                                    borderTop: `1px solid ${C.border}`,
                                  }}
                                >
                                  <Typography
                                    sx={{ fontSize: 10, color: C.muted }}
                                  >
                                    Page {page + 1} of {totalPages} ·{" "}
                                    {rows.length.toLocaleString()} counties
                                  </Typography>
                                  <Box sx={{ display: "flex", gap: 0.75 }}>
                                    <button
                                      onClick={() => setGsActPage(0)}
                                      disabled={page === 0}
                                      style={{
                                        fontSize: 10,
                                        padding: "3px 8px",
                                        border: `1px solid ${C.border}`,
                                        borderRadius: 4,
                                        background: "transparent",
                                        color: page === 0 ? C.border : C.muted,
                                        cursor:
                                          page === 0 ? "default" : "pointer",
                                        fontFamily: "'Inter',sans-serif",
                                      }}
                                    >
                                      «
                                    </button>
                                    <button
                                      onClick={() =>
                                        setGsActPage((p) => Math.max(0, p - 1))
                                      }
                                      disabled={page === 0}
                                      style={{
                                        fontSize: 10,
                                        padding: "3px 8px",
                                        border: `1px solid ${C.border}`,
                                        borderRadius: 4,
                                        background: "transparent",
                                        color: page === 0 ? C.border : C.muted,
                                        cursor:
                                          page === 0 ? "default" : "pointer",
                                        fontFamily: "'Inter',sans-serif",
                                      }}
                                    >
                                      ‹ Prev
                                    </button>
                                    <button
                                      onClick={() =>
                                        setGsActPage((p) =>
                                          Math.min(totalPages - 1, p + 1),
                                        )
                                      }
                                      disabled={page >= totalPages - 1}
                                      style={{
                                        fontSize: 10,
                                        padding: "3px 8px",
                                        border: `1px solid ${C.border}`,
                                        borderRadius: 4,
                                        background: "transparent",
                                        color:
                                          page >= totalPages - 1
                                            ? C.border
                                            : C.muted,
                                        cursor:
                                          page >= totalPages - 1
                                            ? "default"
                                            : "pointer",
                                        fontFamily: "'Inter',sans-serif",
                                      }}
                                    >
                                      Next ›
                                    </button>
                                    <button
                                      onClick={() =>
                                        setGsActPage(totalPages - 1)
                                      }
                                      disabled={page >= totalPages - 1}
                                      style={{
                                        fontSize: 10,
                                        padding: "3px 8px",
                                        border: `1px solid ${C.border}`,
                                        borderRadius: 4,
                                        background: "transparent",
                                        color:
                                          page >= totalPages - 1
                                            ? C.border
                                            : C.muted,
                                        cursor:
                                          page >= totalPages - 1
                                            ? "default"
                                            : "pointer",
                                        fontFamily: "'Inter',sans-serif",
                                      }}
                                    >
                                      »
                                    </button>
                                  </Box>
                                </Box>
                              </>
                            );
                          })()}
                      </CardContent>
                    </Card>
                  )}

                  {/* Data sources — Activation */}
                  {chartPane === "neopoli" && groundScoreData && (
                    <Card
                      elevation={0}
                      sx={{ border: `1px solid ${C.border}`, borderRadius: 1 }}
                    >
                      <CardContent sx={{ pb: "12px !important" }}>
                        <Typography
                          sx={{
                            fontSize: 9,
                            color: C.muted,
                            lineHeight: 1.7,
                            letterSpacing: "0.02em",
                          }}
                        >
                          <span
                            style={{
                              fontWeight: 700,
                              textTransform: "uppercase",
                              letterSpacing: "0.06em",
                            }}
                          >
                            Data Sources —{" "}
                          </span>
                          <span style={{ fontWeight: 600 }}>
                            Composite &amp; Dimension Scores:
                          </span>{" "}
                          Ground Score pipeline · {groundScoreData.generated} ·
                          Census ACS 2022 · BLS QCEW 2022 · Zillow ZHVI · FEMA
                          NRI · USDA NASS 2017 · FCC BDC · USASpending.gov
                          FY2024 · HUD Opportunity Zones · NCES EDFacts
                          SY2021-22 · Amazon Location Service drive times ·
                          Census Building Permits 2022 · scoring mode:
                          universe-relative percentile (0–100 within{" "}
                          {groundScoreData.activation.length.toLocaleString()}
                          -county universe).
                        </Typography>
                      </CardContent>
                    </Card>
                  )}

                  {/* Ground Score County Map — Expansion */}
                  {chartPane === "opportunity" && (
                    <Box
                      sx={{ display: "flex", gap: 2, alignItems: "stretch" }}
                    >
                      <Card
                        elevation={0}
                        sx={{
                          border: `1px solid ${C.border}`,
                          borderRadius: 1,
                          flex: "0 0 58%",
                        }}
                      >
                        <CardContent sx={{ pb: "12px !important" }}>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "flex-start",
                              justifyContent: "space-between",
                              mb: 1,
                            }}
                          >
                            <SectionHeader
                              title="Ground Score Yield Map"
                              sub="All 3,100+ US counties"
                            />
                            <SearchBox
                              groundScoreData={groundScoreData}
                              placesIndex={placesIndex}
                              onSelectCounty={(fips) => {
                                setNeopoliMarket(fips);
                                const centroid =
                                  countyCentroidRef.current[fips];
                                if (centroid) {
                                  setMapCenter(centroid);
                                }
                                const county =
                                  groundScoreData?.expansion?.find(
                                    (c) => c.fips === fips,
                                  ) ||
                                  groundScoreData?.activation?.find(
                                    (c) => c.fips === fips,
                                  );
                                if (county)
                                  setSelectedCity(
                                    county.metrics?.cs_city || null,
                                  );
                              }}
                              onSelectCity={(item) => {
                                searchedCityRef.current = item.place_fips;
                                setSelectedCityFips(item.place_fips);
                                setNeopoliMarket(item.county_fips);
                                // Score on demand if not already pre-scored
                                if (
                                  !item.pre_scored &&
                                  !onDemandCities[item.place_fips] &&
                                  groundScoreData?.metric_bounds
                                ) {
                                  const dimCfg =
                                    chartPane === "opportunity"
                                      ? OPPORTUNITY_DIMS_CONFIG
                                      : NEOPOLI_DIMS_CONFIG;
                                  scoreCityBrowserSide(
                                    item,
                                    groundScoreData.metric_bounds,
                                    dimCfg,
                                  ).then((result) => {
                                    if (result)
                                      setOnDemandCities((prev) => ({
                                        ...prev,
                                        [item.place_fips]: {
                                          ...result,
                                          place_fips: item.place_fips,
                                          name: item.label,
                                          state: item.state,
                                          county_fips: item.county_fips,
                                          lat: item.lat,
                                          lon: item.lon,
                                        },
                                      }));
                                  });
                                }
                              }}
                            />
                          </Box>
                          <CountyMap
                            counties={groundScoreData?.expansion}
                            selectedFips={mapFips}
                            thesis="expansion"
                            zoom={mapZoom}
                            center={mapCenter}
                            onCentroidReady={(cmap) => {
                              countyCentroidRef.current = cmap;
                            }}
                            onSelect={(fips, county) => {
                              setNeopoliMarket(fips);
                              setSelectedCity(county.metrics?.cs_city || null);
                            }}
                          />
                        </CardContent>
                      </Card>
                      <Card
                        elevation={0}
                        sx={{
                          border: `1px solid ${C.border}`,
                          borderRadius: 1,
                          flex: "1 1 42%",
                          display: "flex",
                          flexDirection: "column",
                        }}
                      >
                        <CardContent
                          sx={{
                            pb: "12px !important",
                            display: "flex",
                            flexDirection: "column",
                            flex: 1,
                          }}
                        >
                          {groundScoreData &&
                            (() => {
                              const m =
                                groundScoreData.expansion.find(
                                  (x) => x.fips === neopoliMarket,
                                ) || groundScoreData.expansion[0];
                              const preScoredCities = m?.cities || [];
                              const preScoredFips = new Set(
                                preScoredCities.map((c) => c.place_fips),
                              );
                              const demandCities = Object.values(onDemandCities)
                                .filter(
                                  (c) =>
                                    c.county_fips === m?.fips &&
                                    !preScoredFips.has(c.place_fips),
                                )
                                .sort(
                                  (a, b) =>
                                    (b.composite || 0) - (a.composite || 0),
                                );
                              const cities = [
                                ...preScoredCities,
                                ...demandCities,
                              ];
                              return (
                                <>
                                  <SectionHeader
                                    title={
                                      m
                                        ? `${m.name}, ${m.state} · City Map`
                                        : "City Map"
                                    }
                                    sub={
                                      cities.length
                                        ? `${cities.length} cities · dot size = population`
                                        : "Search a city to score it on demand"
                                    }
                                  />
                                  {cities.length > 0 ? (
                                    <CityMap
                                      cities={cities}
                                      countyFips={m?.fips}
                                      countyName={m?.name || ""}
                                      selectedCityFips={selectedCityFips}
                                      onCitySelect={selectCityManually}
                                      showOZ={showOZ}
                                      onToggleOZ={() => setShowOZ((v) => !v)}
                                      ozGeoData={ozGeoData}
                                      ozLoading={ozLoading}
                                    />
                                  ) : (
                                    <Box
                                      sx={{
                                        height: 200,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                      }}
                                    >
                                      <Typography
                                        sx={{ fontSize: 11, color: C.muted }}
                                      >
                                        Search a city above to score it on
                                        demand
                                      </Typography>
                                    </Box>
                                  )}
                                </>
                              );
                            })()}
                        </CardContent>
                      </Card>
                    </Box>
                  )}

                  {/* Ground Score Market Rankings — Expansion */}
                  {chartPane === "opportunity" && (
                    <Card
                      elevation={0}
                      sx={{ border: `1px solid ${C.border}`, borderRadius: 1 }}
                    >
                      <CardContent sx={{ pb: "12px !important" }}>
                        <SectionHeader
                          title="Ground Score Rankings"
                          sub={
                            groundScoreData
                              ? `Expansion Dimensions · ${groundScoreData.expansion.length.toLocaleString()} counties scored · ${groundScoreData.generated} · click a county to load its scorecard`
                              : "Expansion Dimensions scoring · loading..."
                          }
                        />
                        {groundScoreLoading && (
                          <Typography
                            sx={{
                              fontSize: 12,
                              color: C.muted,
                              py: 2,
                              textAlign: "center",
                            }}
                          >
                            Loading county data…
                          </Typography>
                        )}
                        {groundScoreData &&
                          (() => {
                            const rows = groundScoreData.expansion;
                            const totalPages = Math.ceil(
                              rows.length / GS_PAGE_SIZE,
                            );
                            const page = Math.min(gsExpPage, totalPages - 1);
                            const slice = rows.slice(
                              page * GS_PAGE_SIZE,
                              (page + 1) * GS_PAGE_SIZE,
                            );
                            return (
                              <>
                                <Box sx={{ overflowX: "auto" }}>
                                  <table
                                    style={{
                                      width: "100%",
                                      borderCollapse: "collapse",
                                      fontSize: 12,
                                    }}
                                  >
                                    <thead>
                                      <tr>
                                        {[
                                          "#",
                                          "County",
                                          "State",
                                          "Ground Score",
                                          "Tier",
                                          "HPA Outlook",
                                        ].map((h) => (
                                          <th
                                            key={h}
                                            style={{
                                              padding: "6px 10px",
                                              textAlign: "left",
                                              color: C.muted,
                                              fontWeight: 700,
                                              fontSize: 10,
                                              textTransform: "uppercase",
                                              letterSpacing: "0.07em",
                                              borderBottom: `1px solid ${C.border}`,
                                              whiteSpace: "nowrap",
                                            }}
                                          >
                                            {h}
                                          </th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {slice.map((m, i) => {
                                        const tierMeta =
                                          NEOPOLI_TIER_META[m.tier] ||
                                          NEOPOLI_TIER_META.watchlist;
                                        const isSelected =
                                          neopoliMarket === m.fips;
                                        const kalshiMtg = kalshiData?.series?.KXMORTGAGERATE?.markets?.length > 0
                                          ? kalshiMedian(kalshiData.series.KXMORTGAGERATE.markets)?.value ?? null
                                          : null;
                                        const hpaOut = _hpaOutlook(m.metrics, kalshiMtg);
                                        return (
                                          <tr
                                            key={m.fips}
                                            onClick={() => {
                                              setNeopoliMarket(m.fips);
                                              setSelectedCity(
                                                m.metrics?.cs_city || null,
                                              );
                                            }}
                                            style={{
                                              background: isSelected
                                                ? C.navy
                                                : i % 2 === 0
                                                  ? "transparent"
                                                  : C.bg,
                                              cursor: "pointer",
                                              borderBottom: `1px solid ${C.border}`,
                                            }}
                                          >
                                            <td
                                              style={{
                                                padding: "7px 10px",
                                                fontWeight: 700,
                                                color: isSelected
                                                  ? C.white
                                                  : C.navy,
                                                fontSize: 11,
                                                minWidth: 28,
                                              }}
                                            >
                                              {m.rank}
                                            </td>
                                            <td
                                              style={{
                                                padding: "7px 10px",
                                                fontWeight: 700,
                                                color: isSelected
                                                  ? C.white
                                                  : C.charcoal,
                                                whiteSpace: "nowrap",
                                              }}
                                            >
                                              {m.name}
                                            </td>
                                            <td
                                              style={{
                                                padding: "7px 10px",
                                                color: isSelected
                                                  ? "rgba(255,255,255,0.7)"
                                                  : C.muted,
                                                fontSize: 11,
                                              }}
                                            >
                                              {m.state}
                                            </td>
                                            <td
                                              style={{
                                                padding: "7px 14px 7px 10px",
                                                whiteSpace: "nowrap",
                                                minWidth: 160,
                                              }}
                                            >
                                              <Box
                                                sx={{
                                                  display: "flex",
                                                  alignItems: "center",
                                                  gap: 1,
                                                }}
                                              >
                                                <Box
                                                  sx={{
                                                    flex: 1,
                                                    height: 6,
                                                    background: isSelected
                                                      ? "rgba(255,255,255,0.2)"
                                                      : C.border,
                                                    borderRadius: 3,
                                                    minWidth: 80,
                                                  }}
                                                >
                                                  <Box
                                                    sx={{
                                                      width: `${m.composite}%`,
                                                      height: "100%",
                                                      background: isSelected
                                                        ? C.white
                                                        : tierMeta.barColor,
                                                      borderRadius: 3,
                                                    }}
                                                  />
                                                </Box>
                                                <span
                                                  style={{
                                                    fontWeight: 700,
                                                    color: isSelected
                                                      ? C.white
                                                      : C.charcoal,
                                                    fontSize: 11,
                                                    minWidth: 36,
                                                    textAlign: "right",
                                                  }}
                                                >
                                                  {m.composite.toFixed(1)}
                                                </span>
                                              </Box>
                                            </td>
                                            <td style={{ padding: "7px 10px" }}>
                                              <span
                                                style={{
                                                  fontSize: 10,
                                                  fontWeight: 700,
                                                  color: isSelected
                                                    ? C.navy
                                                    : tierMeta.color,
                                                  background: isSelected
                                                    ? C.white
                                                    : tierMeta.badgeBg ||
                                                      tierMeta.color + "18",
                                                  border: `1px solid ${isSelected ? C.white : tierMeta.badgeBg ? tierMeta.color + "88" : tierMeta.color + "44"}`,
                                                  borderRadius: 4,
                                                  padding: "2px 7px",
                                                  whiteSpace: "nowrap",
                                                }}
                                              >
                                                {tierMeta.label}
                                              </span>
                                            </td>
                                            <td style={{ padding: "7px 10px", whiteSpace: "nowrap" }}>
                                              {hpaOut ? (
                                                <span style={{
                                                  fontSize: 10, fontWeight: 700,
                                                  color: isSelected ? C.navy : hpaOut.color,
                                                  background: isSelected ? C.white : hpaOut.color + "1a",
                                                  border: `1px solid ${isSelected ? C.white : hpaOut.color + "55"}`,
                                                  borderRadius: 4, padding: "2px 7px",
                                                }}>
                                                  {hpaOut.label}
                                                </span>
                                              ) : (
                                                <span style={{ fontSize: 10, color: C.muted }}>—</span>
                                              )}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </Box>
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    mt: 1.5,
                                    pt: 1,
                                    borderTop: `1px solid ${C.border}`,
                                  }}
                                >
                                  <Typography
                                    sx={{ fontSize: 10, color: C.muted }}
                                  >
                                    Page {page + 1} of {totalPages} ·{" "}
                                    {rows.length.toLocaleString()} counties
                                  </Typography>
                                  <Box sx={{ display: "flex", gap: 0.75 }}>
                                    <button
                                      onClick={() => setGsExpPage(0)}
                                      disabled={page === 0}
                                      style={{
                                        fontSize: 10,
                                        padding: "3px 8px",
                                        border: `1px solid ${C.border}`,
                                        borderRadius: 4,
                                        background: "transparent",
                                        color: page === 0 ? C.border : C.muted,
                                        cursor:
                                          page === 0 ? "default" : "pointer",
                                        fontFamily: "'Inter',sans-serif",
                                      }}
                                    >
                                      «
                                    </button>
                                    <button
                                      onClick={() =>
                                        setGsExpPage((p) => Math.max(0, p - 1))
                                      }
                                      disabled={page === 0}
                                      style={{
                                        fontSize: 10,
                                        padding: "3px 8px",
                                        border: `1px solid ${C.border}`,
                                        borderRadius: 4,
                                        background: "transparent",
                                        color: page === 0 ? C.border : C.muted,
                                        cursor:
                                          page === 0 ? "default" : "pointer",
                                        fontFamily: "'Inter',sans-serif",
                                      }}
                                    >
                                      ‹ Prev
                                    </button>
                                    <button
                                      onClick={() =>
                                        setGsExpPage((p) =>
                                          Math.min(totalPages - 1, p + 1),
                                        )
                                      }
                                      disabled={page >= totalPages - 1}
                                      style={{
                                        fontSize: 10,
                                        padding: "3px 8px",
                                        border: `1px solid ${C.border}`,
                                        borderRadius: 4,
                                        background: "transparent",
                                        color:
                                          page >= totalPages - 1
                                            ? C.border
                                            : C.muted,
                                        cursor:
                                          page >= totalPages - 1
                                            ? "default"
                                            : "pointer",
                                        fontFamily: "'Inter',sans-serif",
                                      }}
                                    >
                                      Next ›
                                    </button>
                                    <button
                                      onClick={() =>
                                        setGsExpPage(totalPages - 1)
                                      }
                                      disabled={page >= totalPages - 1}
                                      style={{
                                        fontSize: 10,
                                        padding: "3px 8px",
                                        border: `1px solid ${C.border}`,
                                        borderRadius: 4,
                                        background: "transparent",
                                        color:
                                          page >= totalPages - 1
                                            ? C.border
                                            : C.muted,
                                        cursor:
                                          page >= totalPages - 1
                                            ? "default"
                                            : "pointer",
                                        fontFamily: "'Inter',sans-serif",
                                      }}
                                    >
                                      »
                                    </button>
                                  </Box>
                                </Box>
                              </>
                            );
                          })()}
                      </CardContent>
                    </Card>
                  )}

                  {/* Data sources — Expansion */}
                  {chartPane === "opportunity" && groundScoreData && (
                    <Card
                      elevation={0}
                      sx={{ border: `1px solid ${C.border}`, borderRadius: 1 }}
                    >
                      <CardContent sx={{ pb: "12px !important" }}>
                        <Typography
                          sx={{
                            fontSize: 9,
                            color: C.muted,
                            lineHeight: 1.7,
                            letterSpacing: "0.02em",
                          }}
                        >
                          <span
                            style={{
                              fontWeight: 700,
                              textTransform: "uppercase",
                              letterSpacing: "0.06em",
                            }}
                          >
                            Data Sources —{" "}
                          </span>
                          <span style={{ fontWeight: 600 }}>
                            Composite &amp; Dimension Scores:
                          </span>{" "}
                          Ground Score pipeline · {groundScoreData.generated} ·
                          Census ACS 2022 · BLS QCEW 2022 · Zillow ZHVI · FEMA
                          NRI · USDA NASS 2017 · Amazon Location Service drive
                          times · FCC BDC · USASpending.gov FY2024 · HUD
                          Opportunity Zones · NCES EDFacts SY2021-22 · Census
                          Building Permits 2022 · scoring mode:
                          universe-relative percentile (0–100 within{" "}
                          {groundScoreData.expansion.length.toLocaleString()}
                          -county universe).
                        </Typography>
                      </CardContent>
                    </Card>
                  )}

                  {/* Ground Score County Map — Formation */}
                  {chartPane === "formation" && (
                    <Box sx={{ display: "flex", gap: 2, alignItems: "stretch" }}>
                      <Card
                        elevation={0}
                        sx={{ border: `1px solid ${C.border}`, borderRadius: 1, flex: "0 0 58%" }}
                      >
                        <CardContent sx={{ pb: "12px !important" }}>
                          <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 1 }}>
                            <SectionHeader
                              title="Ground Score Yield Map"
                              sub="All 3,100+ US counties · Formation scoring"
                            />
                            <SearchBox
                              groundScoreData={groundScoreData}
                              placesIndex={placesIndex}
                              onSelectCounty={(fips) => {
                                setFormationSelectedFips(fips);
                                const centroid = countyCentroidRef.current[fips];
                                if (centroid) setMapCenter(centroid);
                              }}
                              onSelectCity={(item) => {
                                setFormationSelectedFips(item.county_fips);
                                const centroid = countyCentroidRef.current[item.county_fips];
                                if (centroid) setMapCenter(centroid);
                              }}
                            />
                          </Box>
                          <CountyMap
                            counties={groundScoreData?.activation}
                            selectedFips={formationSelectedFips}
                            thesis="activation"
                            zoom={mapZoom}
                            center={mapCenter}
                            onCentroidReady={(cmap) => { countyCentroidRef.current = cmap; }}
                            onSelect={(fips) => { setFormationSelectedFips(fips); }}
                          />
                        </CardContent>
                      </Card>
                      <Card
                        elevation={0}
                        sx={{ border: `1px solid ${C.border}`, borderRadius: 1, flex: "1 1 42%", display: "flex", flexDirection: "column" }}
                      >
                        <CardContent sx={{ pb: "12px !important", display: "flex", flexDirection: "column", flex: 1 }}>
                          {groundScoreData && (() => {
                            const selFips = formationSelectedFips || groundScoreData.activation[0]?.fips;
                            const county = groundScoreData.activation.find(c => c.fips === selFips) || groundScoreData.activation[0];
                            const fs = county ? _formationScore(county.metrics) : null;
                            return (
                              <>
                                <SectionHeader
                                  title={county ? `${county.name}, ${county.state} · Score Breakdown` : "Score Breakdown"}
                                  sub="Formation dimension weights"
                                />
                                {fs ? (
                                  <Box sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 1 }}>
                                    {fs.dims.map((d) => (
                                      <Box key={d.label}>
                                        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.25 }}>
                                          <Typography sx={{ fontSize: 10, color: C.muted, fontWeight: 600 }}>{d.label}</Typography>
                                          <Typography sx={{ fontSize: 10, color: C.navy, fontWeight: 700 }}>{Math.round(d.score * 100)}</Typography>
                                        </Box>
                                        <Box sx={{ height: 5, bgcolor: C.border, borderRadius: 1 }}>
                                          <Box sx={{ height: "100%", width: `${Math.round(d.score * 100)}%`, bgcolor: C.blue, borderRadius: 1 }} />
                                        </Box>
                                        <Typography sx={{ fontSize: 9, color: C.muted, mt: 0.25 }}>{d.weight * 100}% weight</Typography>
                                      </Box>
                                    ))}
                                    <Box sx={{ mt: 1, pt: 1, borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                      <Typography sx={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>Composite</Typography>
                                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                        <Box sx={{ px: 1, py: 0.25, borderRadius: 1, bgcolor: fs.tierColor + "22", border: `1px solid ${fs.tierColor}` }}>
                                          <Typography sx={{ fontSize: 9, color: fs.tierColor, fontWeight: 700, textTransform: "uppercase" }}>{fs.tier}</Typography>
                                        </Box>
                                        <Typography sx={{ fontSize: 16, fontWeight: 800, color: C.navy }}>{Math.round(fs.composite)}</Typography>
                                      </Box>
                                    </Box>
                                  </Box>
                                ) : (
                                  <Box sx={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <Typography sx={{ fontSize: 11, color: C.muted }}>Select a county to view its score breakdown</Typography>
                                  </Box>
                                )}
                              </>
                            );
                          })()}
                        </CardContent>
                      </Card>
                    </Box>
                  )}

                  {/* Ground Score Market Rankings — Formation */}
                  {chartPane === "formation" && (
                    <Card elevation={0} sx={{ border: `1px solid ${C.border}`, borderRadius: 1 }}>
                      <CardContent sx={{ pb: "12px !important" }}>
                        <SectionHeader
                          title="Ground Score Rankings"
                          sub={groundScoreData
                            ? `Formation Dimensions · ${groundScoreData.activation.length.toLocaleString()} counties scored · click a county to load its profile`
                            : "Formation Dimensions scoring · loading..."}
                        />
                        {groundScoreLoading && (
                          <Typography sx={{ fontSize: 12, color: C.muted, py: 2, textAlign: "center" }}>Loading county data…</Typography>
                        )}
                        {groundScoreData && (() => {
                          const allCounties = [...groundScoreData.activation]
                            .map(c => { const fs = _formationScore(c.metrics); return fs ? { ...c, formationScore: fs } : null; })
                            .filter(Boolean)
                            .sort((a, b) => b.formationScore.composite - a.formationScore.composite);
                          const FORM_PAGE = GS_PAGE_SIZE;
                          const totalPages = Math.ceil(allCounties.length / FORM_PAGE);
                          const page = Math.min(formationPage, totalPages - 1);
                          const slice = allCounties.slice(page * FORM_PAGE, (page + 1) * FORM_PAGE);
                          return (
                            <>
                              <Box sx={{ overflowX: "auto" }}>
                                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                                  <thead>
                                    <tr>
                                      {["#", "County", "State", "Ground Score", "Tier", "HPA Outlook"].map(h => (
                                        <th key={h} style={{ padding: "6px 10px", textAlign: "left", color: C.muted, fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>{h}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {slice.map((m, i) => {
                                      const fs = m.formationScore;
                                      const isSelected = formationSelectedFips === m.fips;
                                      const kalshiMtg = kalshiData?.series?.KXMORTGAGERATE?.markets?.length > 0
                                        ? kalshiMedian(kalshiData.series.KXMORTGAGERATE.markets)?.value ?? null : null;
                                      const hpaOut = _hpaOutlook(m.metrics, kalshiMtg);
                                      return (
                                        <tr key={m.fips} onClick={() => setFormationSelectedFips(m.fips)} style={{ cursor: "pointer", background: isSelected ? C.navy : i % 2 === 0 ? "transparent" : C.bg }}>
                                          <td style={{ padding: "7px 10px", fontSize: 11, fontWeight: 700, color: isSelected ? C.white : C.muted }}>{page * FORM_PAGE + i + 1}</td>
                                          <td style={{ padding: "7px 10px", fontSize: 12, fontWeight: 700, color: isSelected ? C.white : C.charcoal }}>{m.name}</td>
                                          <td style={{ padding: "7px 10px", fontSize: 11, color: isSelected ? "rgba(255,255,255,0.7)" : C.muted }}>{m.state}</td>
                                          <td style={{ padding: "7px 10px", fontSize: 13, fontWeight: 800, color: isSelected ? C.white : fs.tierColor }}>{fs.composite.toFixed(0)}</td>
                                          <td style={{ padding: "7px 10px", whiteSpace: "nowrap" }}>
                                            <span style={{ fontSize: 10, fontWeight: 700, color: isSelected ? C.navy : fs.tierColor, background: isSelected ? C.white : fs.tierColor + "1a", border: `1px solid ${isSelected ? C.white : fs.tierColor + "55"}`, borderRadius: 4, padding: "2px 7px" }}>
                                              {fs.tier}
                                            </span>
                                          </td>
                                          <td style={{ padding: "7px 10px", whiteSpace: "nowrap" }}>
                                            {hpaOut ? (
                                              <span style={{ fontSize: 10, fontWeight: 700, color: isSelected ? C.navy : hpaOut.color, background: isSelected ? C.white : hpaOut.color + "1a", border: `1px solid ${isSelected ? C.white : hpaOut.color + "55"}`, borderRadius: 4, padding: "2px 7px" }}>
                                                {hpaOut.label}
                                              </span>
                                            ) : <span style={{ fontSize: 10, color: C.muted }}>—</span>}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </Box>
                              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 1, pt: 0.75, borderTop: `1px solid ${C.border}` }}>
                                <button onClick={() => setFormationPage(p => Math.max(0, p - 1))} disabled={page === 0} style={{ fontSize: 10, padding: "3px 10px", border: `1px solid ${C.border}`, borderRadius: 4, background: "transparent", color: C.muted, cursor: page === 0 ? "default" : "pointer", fontFamily: "'Inter',sans-serif" }}>← Prev</button>
                                <Typography sx={{ fontSize: 9, color: C.muted }}>Page {page + 1} / {totalPages}</Typography>
                                <button onClick={() => setFormationPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1} style={{ fontSize: 10, padding: "3px 10px", border: `1px solid ${C.border}`, borderRadius: 4, background: "transparent", color: C.muted, cursor: page === totalPages - 1 ? "default" : "pointer", fontFamily: "'Inter',sans-serif" }}>Next →</button>
                              </Box>
                            </>
                          );
                        })()}
                      </CardContent>
                    </Card>
                  )}

                  {/* Ground Score County Map — Engineered */}
                  {chartPane === "engineered" && (
                    <Box sx={{ display: "flex", gap: 2, alignItems: "stretch" }}>
                      <Card
                        elevation={0}
                        sx={{ border: `1px solid ${C.border}`, borderRadius: 1, flex: "0 0 58%" }}
                      >
                        <CardContent sx={{ pb: "12px !important" }}>
                          <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 1 }}>
                            <SectionHeader
                              title="Ground Score Yield Map"
                              sub="All 3,100+ US counties · Engineered scoring"
                            />
                            <SearchBox
                              groundScoreData={groundScoreData}
                              placesIndex={placesIndex}
                              onSelectCounty={(fips) => {
                                setEngineeredSelectedFips(fips);
                                const centroid = countyCentroidRef.current[fips];
                                if (centroid) setMapCenter(centroid);
                              }}
                              onSelectCity={(item) => {
                                setEngineeredSelectedFips(item.county_fips);
                                const centroid = countyCentroidRef.current[item.county_fips];
                                if (centroid) setMapCenter(centroid);
                              }}
                            />
                          </Box>
                          <CountyMap
                            counties={groundScoreData?.activation}
                            selectedFips={engineeredSelectedFips}
                            thesis="activation"
                            zoom={mapZoom}
                            center={mapCenter}
                            onCentroidReady={(cmap) => { countyCentroidRef.current = cmap; }}
                            onSelect={(fips) => { setEngineeredSelectedFips(fips); }}
                          />
                        </CardContent>
                      </Card>
                      <Card
                        elevation={0}
                        sx={{ border: `1px solid ${C.border}`, borderRadius: 1, flex: "1 1 42%", display: "flex", flexDirection: "column" }}
                      >
                        <CardContent sx={{ pb: "12px !important", display: "flex", flexDirection: "column", flex: 1 }}>
                          {groundScoreData && (() => {
                            const selFips = engineeredSelectedFips || groundScoreData.activation[0]?.fips;
                            const county = groundScoreData.activation.find(c => c.fips === selFips) || groundScoreData.activation[0];
                            const es = county ? _engineeredScore(county.metrics, engineeredProfile) : null;
                            return (
                              <>
                                <SectionHeader
                                  title={county ? `${county.name}, ${county.state} · Score Breakdown` : "Score Breakdown"}
                                  sub="Engineered dimension weights"
                                />
                                {es ? (
                                  <Box sx={{ mt: 1, display: "flex", flexDirection: "column", gap: 1 }}>
                                    {es.dims.map((d) => (
                                      <Box key={d.label}>
                                        <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.25 }}>
                                          <Typography sx={{ fontSize: 10, color: C.muted, fontWeight: 600 }}>{d.label}</Typography>
                                          <Typography sx={{ fontSize: 10, color: C.orange, fontWeight: 700 }}>{Math.round(d.score * 100)}</Typography>
                                        </Box>
                                        <Box sx={{ height: 5, bgcolor: C.border, borderRadius: 1 }}>
                                          <Box sx={{ height: "100%", width: `${Math.round(d.score * 100)}%`, bgcolor: C.orange, borderRadius: 1 }} />
                                        </Box>
                                        <Typography sx={{ fontSize: 9, color: C.muted, mt: 0.25 }}>{Math.round(d.weight * 100)}% weight</Typography>
                                      </Box>
                                    ))}
                                    <Box sx={{ mt: 1, pt: 1, borderTop: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                      <Typography sx={{ fontSize: 11, color: C.muted, fontWeight: 600 }}>Composite</Typography>
                                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                        <Box sx={{ px: 1, py: 0.25, borderRadius: 1, bgcolor: es.tierColor + "22", border: `1px solid ${es.tierColor}` }}>
                                          <Typography sx={{ fontSize: 9, color: es.tierColor, fontWeight: 700, textTransform: "uppercase" }}>{es.tier}</Typography>
                                        </Box>
                                        <Typography sx={{ fontSize: 16, fontWeight: 800, color: C.navy }}>{Math.round(es.composite)}</Typography>
                                      </Box>
                                    </Box>
                                  </Box>
                                ) : (
                                  <Box sx={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center" }}>
                                    <Typography sx={{ fontSize: 11, color: C.muted }}>Select a county to view its score breakdown</Typography>
                                  </Box>
                                )}
                              </>
                            );
                          })()}
                        </CardContent>
                      </Card>
                    </Box>
                  )}

                  {/* Ground Score Market Rankings — Engineered */}
                  {chartPane === "engineered" && (
                    <Card elevation={0} sx={{ border: `1px solid ${C.border}`, borderRadius: 1 }}>
                      <CardContent sx={{ pb: "12px !important" }}>
                        <SectionHeader
                          title="Ground Score Rankings"
                          sub={groundScoreData
                            ? `Engineered Site Optimizer · ${groundScoreData.activation.length.toLocaleString()} counties scored · click a county to load its profile`
                            : "Engineered site scoring · loading..."}
                        />
                        {groundScoreLoading && (
                          <Typography sx={{ fontSize: 12, color: C.muted, py: 2, textAlign: "center" }}>Loading county data…</Typography>
                        )}
                        {groundScoreData && (() => {
                          const allCounties = [...groundScoreData.activation]
                            .map(c => { const es = _engineeredScore(c.metrics, engineeredProfile); return es ? { ...c, engineeredScore: es } : null; })
                            .filter(Boolean)
                            .sort((a, b) => b.engineeredScore.composite - a.engineeredScore.composite);
                          const ENG_PAGE = GS_PAGE_SIZE;
                          const totalPages = Math.ceil(allCounties.length / ENG_PAGE);
                          const page = Math.min(engineeredPage, totalPages - 1);
                          const slice = allCounties.slice(page * ENG_PAGE, (page + 1) * ENG_PAGE);
                          return (
                            <>
                              <Box sx={{ overflowX: "auto" }}>
                                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                                  <thead>
                                    <tr>
                                      {["#", "County", "State", "Ground Score", "Tier", "HPA Outlook"].map(h => (
                                        <th key={h} style={{ padding: "6px 10px", textAlign: "left", color: C.muted, fontWeight: 700, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.07em", borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>{h}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {slice.map((m, i) => {
                                      const es = m.engineeredScore;
                                      const isSelected = engineeredSelectedFips === m.fips;
                                      const kalshiMtg = kalshiData?.series?.KXMORTGAGERATE?.markets?.length > 0
                                        ? kalshiMedian(kalshiData.series.KXMORTGAGERATE.markets)?.value ?? null : null;
                                      const hpaOut = _hpaOutlook(m.metrics, kalshiMtg);
                                      return (
                                        <tr key={m.fips} onClick={() => setEngineeredSelectedFips(m.fips)} style={{ cursor: "pointer", background: isSelected ? C.navy : i % 2 === 0 ? "transparent" : C.bg }}>
                                          <td style={{ padding: "7px 10px", fontSize: 11, fontWeight: 700, color: isSelected ? C.white : C.muted }}>{page * ENG_PAGE + i + 1}</td>
                                          <td style={{ padding: "7px 10px", fontSize: 12, fontWeight: 700, color: isSelected ? C.white : C.charcoal }}>{m.name}</td>
                                          <td style={{ padding: "7px 10px", fontSize: 11, color: isSelected ? "rgba(255,255,255,0.7)" : C.muted }}>{m.state}</td>
                                          <td style={{ padding: "7px 10px", fontSize: 13, fontWeight: 800, color: isSelected ? C.white : es.tierColor }}>{es.composite.toFixed(0)}</td>
                                          <td style={{ padding: "7px 10px", whiteSpace: "nowrap" }}>
                                            <span style={{ fontSize: 10, fontWeight: 700, color: isSelected ? C.navy : es.tierColor, background: isSelected ? C.white : es.tierColor + "1a", border: `1px solid ${isSelected ? C.white : es.tierColor + "55"}`, borderRadius: 4, padding: "2px 7px" }}>
                                              {es.tier}
                                            </span>
                                          </td>
                                          <td style={{ padding: "7px 10px", whiteSpace: "nowrap" }}>
                                            {hpaOut ? (
                                              <span style={{ fontSize: 10, fontWeight: 700, color: isSelected ? C.navy : hpaOut.color, background: isSelected ? C.white : hpaOut.color + "1a", border: `1px solid ${isSelected ? C.white : hpaOut.color + "55"}`, borderRadius: 4, padding: "2px 7px" }}>
                                                {hpaOut.label}
                                              </span>
                                            ) : <span style={{ fontSize: 10, color: C.muted }}>—</span>}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </Box>
                              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 1, pt: 0.75, borderTop: `1px solid ${C.border}` }}>
                                <button onClick={() => setEngineeredPage(p => Math.max(0, p - 1))} disabled={page === 0} style={{ fontSize: 10, padding: "3px 10px", border: `1px solid ${C.border}`, borderRadius: 4, background: "transparent", color: C.muted, cursor: page === 0 ? "default" : "pointer", fontFamily: "'Inter',sans-serif" }}>← Prev</button>
                                <Typography sx={{ fontSize: 9, color: C.muted }}>Page {page + 1} / {totalPages}</Typography>
                                <button onClick={() => setEngineeredPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1} style={{ fontSize: 10, padding: "3px 10px", border: `1px solid ${C.border}`, borderRadius: 4, background: "transparent", color: C.muted, cursor: page === totalPages - 1 ? "default" : "pointer", fontFamily: "'Inter',sans-serif" }}>Next →</button>
                              </Box>
                            </>
                          );
                        })()}
                      </CardContent>
                    </Card>
                  )}

                  {/* Skeleton loaders — coordinated left pane */}
                  {chartPane === "coordinated" && groundScoreLoading && (<>
                    {/* Scatter skeleton — mirrors SectionHeader + 380px chart */}
                    <Card elevation={0} sx={{ border: `1px solid ${C.border}`, borderRadius: 1 }}>
                      <CardContent sx={{ pb: "12px !important" }}>
                        <Box sx={{ mb: 2, pb: 1, borderBottom: `2px solid ${C.border}`, width: "fit-content" }}>
                          <Box sx={{ height: 11, width: 220, background: C.border, borderRadius: 1, mb: 0.75 }} />
                          <Box sx={{ height: 9, width: 300, background: C.border, borderRadius: 1, opacity: 0.6 }} />
                        </Box>
                        <Box sx={{ height: 380, background: C.bg, borderRadius: 1 }} />
                      </CardContent>
                    </Card>
                    {/* Pairs table skeleton — mirrors SectionHeader + table rows */}
                    <Card elevation={0} sx={{ border: `1px solid ${C.border}`, borderRadius: 1 }}>
                      <CardContent sx={{ pb: "12px !important" }}>
                        <Box sx={{ mb: 2, pb: 1, borderBottom: `2px solid ${C.border}`, width: "fit-content" }}>
                          <Box sx={{ height: 11, width: 180, background: C.border, borderRadius: 1, mb: 0.75 }} />
                          <Box sx={{ height: 9, width: 260, background: C.border, borderRadius: 1, opacity: 0.6 }} />
                        </Box>
                        {[...Array(8)].map((_, i) => (
                          <Box key={i} sx={{ display: "flex", alignItems: "center", gap: 1, px: 1, height: 36, background: i % 2 === 0 ? "transparent" : C.bg, borderBottom: `1px solid ${C.border}` }}>
                            <Box sx={{ height: 9, width: "30%", background: C.border, borderRadius: 1 }} />
                            <Box sx={{ height: 9, width: "25%", background: C.border, borderRadius: 1, opacity: 0.6 }} />
                            <Box sx={{ height: 9, width: "20%", background: C.border, borderRadius: 1, opacity: 0.4 }} />
                          </Box>
                        ))}
                      </CardContent>
                    </Card>
                  </>)}


                  {/* Dual-Thesis Scatter — left pane */}
                  {chartPane === "coordinated" &&
                    groundScoreData &&
                    (() => {
                      const actMap = Object.fromEntries(
                        groundScoreData.activation.map((c) => [c.fips, c]),
                      );
                      const expMap = Object.fromEntries(
                        groundScoreData.expansion.map((c) => [c.fips, c]),
                      );
                      const allFips = groundScoreData.activation.map(
                        (c) => c.fips,
                      );

                      const points = allFips
                        .map((fips) => {
                          const a = actMap[fips];
                          const e = expMap[fips];
                          if (!a || !e) return null;
                          return {
                            x: a.composite,
                            y: e.composite,
                            fips,
                            name: a.name,
                            state: a.state,
                            actTier: a.tier,
                            expTier: e.tier,
                          };
                        })
                        .filter(Boolean);

                      const tierColor = (tier) =>
                        ({
                          lead_market: "#10b981",
                          priority_market: "#1a3a5c",
                          watchlist: "#7fa8cc",
                          deprioritized: "#dce4ec",
                        })[tier] || "#dce4ec";

                      const datasets = [
                        { label: "Lead Market", tier: "lead_market" },
                        { label: "Priority Market", tier: "priority_market" },
                        { label: "Watchlist", tier: "watchlist" },
                        { label: "Deprioritized", tier: "deprioritized" },
                      ].map(({ label, tier }) => ({
                        label,
                        data: points
                          .filter((p) => p.actTier === tier)
                          .map((p) => ({
                            x: p.x,
                            y: p.y,
                            fips: p.fips,
                            name: p.name,
                            state: p.state,
                            actTier: p.actTier,
                            expTier: p.expTier,
                          })),
                        backgroundColor: tierColor(tier) + "bb",
                        pointRadius:
                          tier === "lead_market"
                            ? 5
                            : tier === "priority_market"
                              ? 4
                              : 3,
                        pointHoverRadius: 7,
                      }));

                      const scatterOptions = {
                        responsive: true,
                        maintainAspectRatio: false,
                        animation: false,
                        plugins: {
                          legend: { display: false },
                          tooltip: {
                            callbacks: {
                              label: (ctx) => {
                                const d = ctx.raw;
                                return [
                                  `${d.name}, ${d.state}`,
                                  `Activation: ${d.x?.toFixed(1)} (${d.actTier?.replace(/_/g, " ")})`,
                                  `Expansion: ${d.y?.toFixed(1)} (${d.expTier?.replace(/_/g, " ")})`,
                                ];
                              },
                            },
                          },
                          annotation: undefined,
                        },
                        onClick: (_, elements) => {
                          if (elements.length) {
                            const raw = elements[0].element.$context.raw;
                            setCoordSelectedFips(raw.fips); setCoordSelectedExpFips(null);
                          }
                        },
                        scales: {
                          x: {
                            ...baseGridScale,
                            min: 0,
                            max: 100,
                            title: {
                              display: true,
                              text: "Activation Composite (0–100)",
                              color: C.muted,
                              font: { ...baseFont, size: 10 },
                            },
                            ticks: {
                              ...baseGridScale.ticks,
                              callback: (v) => v,
                            },
                          },
                          y: {
                            ...baseGridScale,
                            min: 0,
                            max: 100,
                            title: {
                              display: true,
                              text: "Expansion Composite (0–100)",
                              color: C.muted,
                              font: { ...baseFont, size: 10 },
                            },
                            ticks: {
                              ...baseGridScale.ticks,
                              callback: (v) => v,
                            },
                          },
                        },
                      };

                      return (
                        <Card
                          elevation={0}
                          sx={{
                            border: `1px solid ${C.border}`,
                            borderRadius: 1,
                          }}
                        >
                          <CardContent sx={{ pb: "12px !important" }}>
                            <SectionHeader
                              title="Activation vs. Expansion — Dual-Thesis Scatter"
                              sub={`${points.length.toLocaleString()} counties · colored by Activation tier · click any county to load coordination detail`}
                            />
                            <Box sx={{ position: "relative" }}>
                              <Box sx={{ height: 380, position: "relative" }}>
                                <Scatter
                                  data={{ datasets }}
                                  options={scatterOptions}
                                />
                              </Box>
                              <Box
                                sx={{
                                  position: "absolute",
                                  top: 8,
                                  right: 40,
                                  fontSize: 9,
                                  color: C.greenLight,
                                  fontWeight: 700,
                                  fontFamily: "'Inter',sans-serif",
                                  pointerEvents: "none",
                                }}
                              >
                                SELF-REINFORCING
                              </Box>
                              <Box
                                sx={{
                                  position: "absolute",
                                  top: 8,
                                  left: 40,
                                  fontSize: 9,
                                  color: C.muted,
                                  fontWeight: 700,
                                  fontFamily: "'Inter',sans-serif",
                                  pointerEvents: "none",
                                }}
                              >
                                EXPANSION FOUNDATION
                              </Box>
                              <Box
                                sx={{
                                  position: "absolute",
                                  bottom: 8,
                                  right: 40,
                                  fontSize: 9,
                                  color: C.orange,
                                  fontWeight: 700,
                                  fontFamily: "'Inter',sans-serif",
                                  pointerEvents: "none",
                                }}
                              >
                                ACTIVATION HANDOFF
                              </Box>
                              <Box
                                sx={{
                                  position: "absolute",
                                  bottom: 8,
                                  left: 40,
                                  fontSize: 9,
                                  color: C.border,
                                  fontWeight: 700,
                                  fontFamily: "'Inter',sans-serif",
                                  pointerEvents: "none",
                                }}
                              >
                                WATCH & WAIT
                              </Box>
                            </Box>
                            <Box
                              sx={{
                                display: "flex",
                                gap: 2,
                                mt: 1,
                                flexWrap: "wrap",
                              }}
                            >
                              {[
                                ["Lead Market", "#10b981"],
                                ["Priority Market", "#1a3a5c"],
                                ["Watchlist", "#7fa8cc"],
                                ["Deprioritized", "#dce4ec"],
                              ].map(([label, color]) => (
                                <Box
                                  key={label}
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 0.5,
                                  }}
                                >
                                  <Box
                                    sx={{
                                      width: 8,
                                      height: 8,
                                      borderRadius: "50%",
                                      background: color,
                                    }}
                                  />
                                  <Typography
                                    sx={{ fontSize: 9, color: C.muted }}
                                  >
                                    {label}
                                  </Typography>
                                </Box>
                              ))}
                            </Box>
                          </CardContent>
                        </Card>
                      );
                    })()}

                  {/* Adjacent County Coordination Pairs — left pane */}
                  {chartPane === "coordinated" &&
                    groundScoreData &&
                    (() => {
                      const pairs = groundScoreData.coord_pairs;
                      if (!pairs?.length)
                        return (
                          <Card
                            elevation={0}
                            sx={{
                              border: `1px solid ${C.border}`,
                              borderRadius: 1,
                            }}
                          >
                            <CardContent sx={{ pb: "12px !important" }}>
                              <SectionHeader
                                title="Adjacent County Coordination Pairs"
                                sub="Run pipeline to generate adjacency data"
                              />
                              <Typography
                                sx={{
                                  fontSize: 11,
                                  color: C.muted,
                                  py: 2,
                                  textAlign: "center",
                                }}
                              >
                                Re-run pipeline to populate — requires USDA
                                county adjacency collector
                              </Typography>
                            </CardContent>
                          </Card>
                        );
                      const tierLabel = (tier) =>
                        ({
                          lead_market: "Lead",
                          priority_market: "Priority",
                          watchlist: "Watchlist",
                          deprioritized: "Depr.",
                        })[tier] || tier;
                      const tierColor = (tier) =>
                        ({
                          lead_market: C.greenLight,
                          priority_market: C.navy,
                          watchlist: C.blue,
                          deprioritized: C.muted,
                        })[tier] || C.muted;
                      return (
                        <Card
                          elevation={0}
                          sx={{
                            border: `1px solid ${C.border}`,
                            borderRadius: 1,
                          }}
                        >
                          <CardContent sx={{ pb: "12px !important" }}>
                            <SectionHeader
                              title="Adjacent County Coordination Pairs"
                              sub={`Top ${pairs.length} Activation→Expansion adjacency pairs · sorted by average dual-thesis score · click to load coordination profile`}
                            />
                            <Box sx={{ overflowX: "auto" }}>
                              <table
                                style={{
                                  width: "100%",
                                  borderCollapse: "collapse",
                                  fontSize: 12,
                                }}
                              >
                                <thead>
                                  <tr>
                                    {[
                                      "Coord Score",
                                      "Activation County",
                                      "Act Score",
                                      "Act Tier",
                                      "→",
                                      "Expansion County",
                                      "Exp Score",
                                      "Exp Tier",
                                    ].map((h) => (
                                      <th
                                        key={h}
                                        style={{
                                          padding: "5px 10px",
                                          textAlign: "left",
                                          color: C.muted,
                                          fontWeight: 700,
                                          fontSize: 10,
                                          textTransform: "uppercase",
                                          letterSpacing: "0.07em",
                                          borderBottom: `1px solid ${C.border}`,
                                          whiteSpace: "normal",
                                          lineHeight: 1.3,
                                          verticalAlign: "bottom",
                                        }}
                                      >
                                        {h}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {pairs.map((pair, i) => (
                                    <tr
                                      key={pair.act_fips + pair.exp_fips}
                                      onClick={() => { setCoordSelectedFips(pair.act_fips); setCoordSelectedExpFips(pair.exp_fips); }}
                                      style={{
                                        background:
                                          coordSelectedFips === pair.act_fips
                                            ? C.navy
                                            : i % 2 === 0
                                              ? "transparent"
                                              : C.bg,
                                        borderBottom: `1px solid ${C.border}`,
                                        cursor: "pointer",
                                      }}
                                    >
                                      <td
                                        style={{
                                          padding: "7px 10px",
                                          fontWeight: 700,
                                          color:
                                            coordSelectedFips === pair.act_fips
                                              ? C.white
                                              : C.charcoal,
                                          fontSize: 13,
                                        }}
                                      >
                                        {pair.coord_score.toFixed(1)}
                                      </td>
                                      <td
                                        style={{
                                          padding: "7px 10px",
                                          fontWeight: 600,
                                          color:
                                            coordSelectedFips === pair.act_fips
                                              ? C.white
                                              : C.charcoal,
                                          whiteSpace: "nowrap",
                                        }}
                                      >
                                        {pair.act_name}, {pair.act_state}
                                      </td>
                                      <td
                                        style={{
                                          padding: "7px 10px",
                                          color:
                                            coordSelectedFips === pair.act_fips
                                              ? "rgba(255,255,255,0.8)"
                                              : C.muted,
                                        }}
                                      >
                                        {pair.act_composite.toFixed(1)}
                                      </td>
                                      <td style={{ padding: "7px 10px" }}>
                                        <span
                                          style={{
                                            fontSize: 10,
                                            fontWeight: 700,
                                            color:
                                              coordSelectedFips ===
                                              pair.act_fips
                                                ? C.navy
                                                : tierColor(pair.act_tier),
                                            background:
                                              coordSelectedFips ===
                                              pair.act_fips
                                                ? C.white
                                                : tierColor(pair.act_tier) +
                                                  "18",
                                            border: `1px solid ${coordSelectedFips === pair.act_fips ? C.white : tierColor(pair.act_tier) + "44"}`,
                                            borderRadius: 4,
                                            padding: "2px 6px",
                                          }}
                                        >
                                          {tierLabel(pair.act_tier)}
                                        </span>
                                      </td>
                                      <td
                                        style={{
                                          padding: "7px 6px",
                                          color:
                                            coordSelectedFips === pair.act_fips
                                              ? "rgba(255,255,255,0.4)"
                                              : C.border,
                                          fontSize: 14,
                                        }}
                                      >
                                        →
                                      </td>
                                      <td
                                        style={{
                                          padding: "7px 10px",
                                          fontWeight: 600,
                                          color:
                                            coordSelectedFips === pair.act_fips
                                              ? C.white
                                              : C.charcoal,
                                          whiteSpace: "nowrap",
                                        }}
                                      >
                                        {pair.exp_name}, {pair.exp_state}
                                      </td>
                                      <td
                                        style={{
                                          padding: "7px 10px",
                                          color:
                                            coordSelectedFips === pair.act_fips
                                              ? "rgba(255,255,255,0.8)"
                                              : C.muted,
                                        }}
                                      >
                                        {pair.exp_composite.toFixed(1)}
                                      </td>
                                      <td style={{ padding: "7px 10px" }}>
                                        <span
                                          style={{
                                            fontSize: 10,
                                            fontWeight: 700,
                                            color:
                                              coordSelectedFips ===
                                              pair.act_fips
                                                ? C.navy
                                                : tierColor(pair.exp_tier),
                                            background:
                                              coordSelectedFips ===
                                              pair.act_fips
                                                ? C.white
                                                : tierColor(pair.exp_tier) +
                                                  "18",
                                            border: `1px solid ${coordSelectedFips === pair.act_fips ? C.white : tierColor(pair.exp_tier) + "44"}`,
                                            borderRadius: 4,
                                            padding: "2px 6px",
                                          }}
                                        >
                                          {tierLabel(pair.exp_tier)}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </Box>
                          </CardContent>
                        </Card>
                      );
                    })()}

                  {/* Housing driver charts — shown below Case-Shiller when Housing Market tab is active */}
                  {chartPane === "housing" &&
                    (() => {
                      // Insight-relevant snapshots
                      const iMtg = lastOf(hmMtg);
                      const iFed = lastOf(hmFedFunds);
                      const iTsy = lastOf(hmTsy);
                      const iDel = lastOf(hmDel);
                      const iFcl = lastOf(hmForeclosure);
                      const iUnemp = lastOf(hmUnemployment);
                      const iSales = lastOf(hmExistingSales);
                      const iSupply = lastOf(hmSupply);
                      const iPermit = lastOf(hmPermits);
                      const iPTI = lastOf(hmPTI);
                      const iOwn = lastOf(hmOwnership);
                      const iNAHB = lastOf(hmNAHB);
                      const iCC = lastOf(hmConsumerConf);
                      const spread =
                        iMtg != null && iFed != null
                          ? (iMtg - iFed).toFixed(2)
                          : null;
                      const supplyTone =
                        iSupply == null
                          ? ""
                          : iSupply < 3
                            ? "seller's market"
                            : iSupply > 6
                              ? "buyer's market"
                              : "balanced market";

                      const Insight = ({ children }) => (
                        <Box
                          sx={{
                            mt: 1.25,
                            pt: 1.25,
                            borderTop: `1px solid ${C.border}`,
                          }}
                        >
                          <Typography
                            sx={{
                              fontSize: 11,
                              color: C.muted,
                              lineHeight: 1.6,
                            }}
                          >
                            {children}
                          </Typography>
                        </Box>
                      );
                      const Callout = ({ color, children }) => (
                        <Box
                          sx={{
                            mt: 1,
                            p: 1,
                            borderRadius: 1,
                            background: color + "12",
                            border: `1px solid ${color}44`,
                          }}
                        >
                          <Typography
                            sx={{ fontSize: 11, color, lineHeight: 1.6 }}
                          >
                            {children}
                          </Typography>
                        </Box>
                      );

                      return (
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: { xs: "column", md: "row" },
                            gap: 2,
                          }}
                        >
                          <Box
                            sx={{
                              flex: 1,
                              minWidth: 0,
                              display: "flex",
                              flexDirection: "column",
                              gap: 2,
                            }}
                          >
                            {/* Rates & Policy */}
                            <Card
                              elevation={0}
                              sx={{
                                border: `1px solid ${C.border}`,
                                borderRadius: 1,
                              }}
                            >
                              <CardContent>
                                <SectionHeader
                                  title="Rates & Policy"
                                  sub="Fed funds · mortgage rate · 10yr Treasury"
                                />
                                <Line
                                  data={hRatesData}
                                  options={{
                                    responsive: true,
                                    plugins: {
                                      legend: baseLegend,
                                      tooltip: hRatesTip,
                                    },
                                    scales: {
                                      x: baseGridScale,
                                      y: {
                                        ...baseGridScale,
                                        ticks: {
                                          ...baseGridScale.ticks,
                                          callback: (v) => v + "%",
                                        },
                                      },
                                    },
                                  }}
                                />
                                <Insight>
                                  Mortgage rates at{" "}
                                  <strong>{iMtg?.toFixed(2)}%</strong> carry a{" "}
                                  {spread && <strong>{spread}pp</strong>}{" "}
                                  premium over Fed Funds
                                  {iTsy != null && iFed != null && iTsy < iFed
                                    ? ", with an inverted yield curve signaling near-term economic stress"
                                    : ""}
                                  . Elevated rates reduce buyer purchasing power
                                  and create the <em>lock-in effect</em> —
                                  owners with legacy mortgages below 4% face a
                                  steep financial penalty to sell, suppressing
                                  both supply and transaction volume.
                                  <strong style={{ color: C.navy }}>
                                    {" "}
                                    Rate normalization is the single largest
                                    catalyst for housing market recovery and is
                                    central to all three forecast scenarios.
                                  </strong>
                                </Insight>
                                <Callout color={C.navy}>
                                  <strong>Ampledge Impact:</strong> By funding
                                  the 20% down payment, Ampledge reduces the
                                  loan balance — shrinking payment exposure to
                                  rate movements. A buyer using Ampledge on a
                                  $400k home borrows $320k vs $380k
                                  conventionally, saving ~$400–500/mo at current
                                  rates before PMI elimination. The program's
                                  value proposition is most powerful{" "}
                                  <em>
                                    precisely in this high-rate environment
                                  </em>{" "}
                                  — it de-risks the cost of entry that rates
                                  have made prohibitive.
                                </Callout>
                                {false &&
                                  ampledgeEnabled &&
                                  yearRange[1] > 2025 && (
                                    <Box
                                      sx={{
                                        mt: 0.75,
                                        p: 0.75,
                                        borderRadius: 1,
                                        background: C.navy + "0d",
                                        border: `1px solid ${C.navy}33`,
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 1,
                                      }}
                                    >
                                      <Typography
                                        sx={{
                                          fontSize: 10,
                                          color: C.navy,
                                          fontWeight: 700,
                                        }}
                                      >
                                        ▶ Model Active:
                                      </Typography>
                                      <Typography
                                        sx={{ fontSize: 10, color: C.navy }}
                                      >
                                        Payment relief reduces buyer default
                                        risk, sustaining demand through rate
                                        cycles.
                                      </Typography>
                                    </Box>
                                  )}
                              </CardContent>
                            </Card>

                            {/* Market Stress */}
                            <Card
                              elevation={0}
                              sx={{
                                border: `1px solid ${C.border}`,
                                borderRadius: 1,
                              }}
                            >
                              <CardContent>
                                <SectionHeader
                                  title="Market Stress"
                                  sub="Unemployment · delinquency · foreclosure rate"
                                />
                                <Line
                                  data={hStressData}
                                  options={{
                                    responsive: true,
                                    plugins: {
                                      legend: baseLegend,
                                      tooltip: hStressTip,
                                    },
                                    scales: {
                                      x: baseGridScale,
                                      y: {
                                        ...baseGridScale,
                                        ticks: {
                                          ...baseGridScale.ticks,
                                          callback: (v) => v + "%",
                                        },
                                      },
                                    },
                                  }}
                                />
                                <Insight>
                                  Delinquency at{" "}
                                  <strong>{iDel?.toFixed(1)}%</strong> and
                                  foreclosure inventory at{" "}
                                  <strong>{iFcl?.toFixed(1)}%</strong> remain
                                  historically moderate. Low distressed supply
                                  acts as a price floor — without forced
                                  sellers, there is no mechanism to push prices
                                  sharply lower. Unemployment at{" "}
                                  <strong>{iUnemp?.toFixed(1)}%</strong>{" "}
                                  {iUnemp != null && iUnemp < 4.5
                                    ? "remains below the ~4.5% threshold historically linked to broad mortgage stress"
                                    : "is approaching levels associated with rising credit defaults"}
                                  .
                                  <strong style={{ color: C.navy }}>
                                    {" "}
                                    Stress metrics are a lagging indicator —
                                    watch delinquency trends 12–18 months ahead
                                    of any HPA impact.
                                  </strong>
                                </Insight>
                                <Callout color={C.navy}>
                                  <strong>Ampledge Impact:</strong> The 20%
                                  equity position at origination is the most
                                  effective structural protection against
                                  foreclosure risk — for both the homeowner and
                                  Ampledge's investment. A homeowner must absorb
                                  a 20%+ price decline before going underwater,
                                  vs. just 3–5% with low-down conventional
                                  loans. This is why the 2008 crisis was
                                  catastrophic for low-equity borrowers but far
                                  less damaging for 20%-down buyers in the same
                                  markets. Ampledge-backed purchases carry
                                  structurally lower default risk regardless of
                                  the rate environment.
                                </Callout>
                                {false &&
                                  ampledgeEnabled &&
                                  yearRange[1] > 2025 && (
                                    <Box
                                      sx={{
                                        mt: 0.75,
                                        p: 0.75,
                                        borderRadius: 1,
                                        background: C.navy + "0d",
                                        border: `1px solid ${C.navy}33`,
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 1,
                                      }}
                                    >
                                      <Typography
                                        sx={{
                                          fontSize: 10,
                                          color: C.navy,
                                          fontWeight: 700,
                                        }}
                                      >
                                        ▶ Model Active:
                                      </Typography>
                                      <Typography
                                        sx={{ fontSize: 10, color: C.navy }}
                                      >
                                        20% equity floor structurally suppresses
                                        delinquency and foreclosure among
                                        Ampledge-backed loans.
                                      </Typography>
                                    </Box>
                                  )}
                              </CardContent>
                            </Card>

                            {/* Demand */}
                            <Card
                              elevation={0}
                              sx={{
                                border: `1px solid ${C.border}`,
                                borderRadius: 1,
                              }}
                            >
                              <CardContent>
                                <SectionHeader
                                  title="Demand"
                                  sub="Existing home sales (M, left) · net household formation (000s, right)"
                                />
                                <Bar
                                  data={hDemandData}
                                  options={{
                                    responsive: true,
                                    plugins: {
                                      legend: baseLegend,
                                      tooltip: hDemandTip,
                                    },
                                    scales: {
                                      x: baseGridScale,
                                      y: {
                                        ...baseGridScale,
                                        position: "left",
                                        ticks: {
                                          ...baseGridScale.ticks,
                                          callback: (v) => v + "M",
                                        },
                                      },
                                      y1: {
                                        ...baseGridScale,
                                        position: "right",
                                        grid: { drawOnChartArea: false },
                                        ticks: {
                                          ...baseGridScale.ticks,
                                          callback: (v) => v + "k",
                                        },
                                      },
                                    },
                                  }}
                                />
                                <Insight>
                                  Existing home sales at{" "}
                                  <strong>{iSales?.toFixed(2)}M</strong> are
                                  near a{" "}
                                  <strong style={{ color: C.red }}>
                                    28-year low
                                  </strong>{" "}
                                  (4.06M in 2024, weakest since 1995). The
                                  primary cause is the{" "}
                                  <em>mortgage rate lock-in effect</em> — an
                                  estimated ~40% of outstanding mortgages carry
                                  rates below 4%, making selling at 6–7%+ rates
                                  economically punishing. This creates a
                                  paradox: low sales volume despite high prices,
                                  as reduced supply offsets reduced demand and
                                  sustains HPA even in a frozen market.
                                </Insight>
                                <Callout color={C.navy}>
                                  <strong>Ampledge Impact:</strong> The 20% down
                                  payment program directly addresses the buyer
                                  affordability squeeze — the{" "}
                                  <em>demand side</em> of the freeze. By funding
                                  the down payment, Ampledge eliminates PMI
                                  (~$150–300/mo) and reduces the loan balance,
                                  translating to ~$600–800/month in payment
                                  relief on a median home. This re-qualifies
                                  buyers priced out by higher rates, expanding
                                  the active buyer pool and increasing
                                  competition for the limited inventory that
                                  does reach market — a direct HPA tailwind for
                                  AmPledge-financed transactions.
                                </Callout>
                                {false &&
                                  ampledgeEnabled &&
                                  yearRange[1] > 2025 && (
                                    <Box
                                      sx={{
                                        mt: 0.75,
                                        p: 0.75,
                                        borderRadius: 1,
                                        background: C.navy + "0d",
                                        border: `1px solid ${C.navy}33`,
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 1,
                                      }}
                                    >
                                      <Typography
                                        sx={{
                                          fontSize: 10,
                                          color: C.navy,
                                          fontWeight: 700,
                                        }}
                                      >
                                        ▶ Model Active:
                                      </Typography>
                                      <Typography
                                        sx={{ fontSize: 10, color: C.navy }}
                                      >
                                        +{AMP_EXISTING_LIFT.toFixed(3)}M
                                        existing sales/yr added · chart bars
                                        reflect Ampledge volume at scale.
                                      </Typography>
                                    </Box>
                                  )}
                              </CardContent>
                            </Card>
                          </Box>
                          <Box
                            sx={{
                              flex: 1,
                              minWidth: 0,
                              display: "flex",
                              flexDirection: "column",
                              gap: 2,
                            }}
                          >
                            {/* Supply Pipeline */}
                            <Card
                              elevation={0}
                              sx={{
                                border: `1px solid ${C.border}`,
                                borderRadius: 1,
                              }}
                            >
                              <CardContent>
                                <SectionHeader
                                  title="Supply Pipeline"
                                  sub="Permits · starts (k, left) · months of supply (right)"
                                />
                                <Bar
                                  data={hSupplyData}
                                  options={{
                                    responsive: true,
                                    plugins: {
                                      legend: baseLegend,
                                      tooltip: hSupplyTip,
                                    },
                                    scales: {
                                      x: baseGridScale,
                                      y: {
                                        ...baseGridScale,
                                        position: "left",
                                        ticks: {
                                          ...baseGridScale.ticks,
                                          callback: (v) => v + "k",
                                        },
                                      },
                                      y1: {
                                        ...baseGridScale,
                                        position: "right",
                                        grid: { drawOnChartArea: false },
                                        ticks: {
                                          ...baseGridScale.ticks,
                                          callback: (v) => v + "mo",
                                        },
                                      },
                                    },
                                  }}
                                />
                                <Insight>
                                  At{" "}
                                  <strong>{iSupply?.toFixed(1)} months</strong>{" "}
                                  of supply, the market is in a{" "}
                                  <strong>{supplyTone}</strong> ({"<"}3 =
                                  seller's, {">"}6 = buyer's). Permits at{" "}
                                  <strong>{iPermit?.toFixed(0)}k</strong> remain{" "}
                                  {iPermit != null && iPermit < 1200
                                    ? "below the ~1.2M units/yr required to absorb household formation, sustaining the structural undersupply that has underpinned prices since 2012"
                                    : "near the level needed to absorb new household formation"}
                                  .
                                  <strong style={{ color: C.navy }}>
                                    {" "}
                                    Constrained supply is the structural
                                    backstop for HPA — even with demand
                                    headwinds, limited inventory prevents
                                    significant price declines.
                                  </strong>
                                </Insight>
                                <Callout color={C.navy}>
                                  <strong>Ampledge Impact:</strong> By
                                  converting qualified-but-cash-constrained
                                  buyers into active purchasers, Ampledge
                                  activates latent demand that competes for
                                  existing inventory. As new permits eventually
                                  come to market, Ampledge-enabled buyers are
                                  positioned to absorb that supply, sustaining
                                  transaction volume across the cycle.
                                </Callout>
                                {false &&
                                  ampledgeEnabled &&
                                  yearRange[1] > 2025 && (
                                    <Box
                                      sx={{
                                        mt: 0.75,
                                        p: 0.75,
                                        borderRadius: 1,
                                        background: C.navy + "0d",
                                        border: `1px solid ${C.navy}33`,
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 1,
                                      }}
                                    >
                                      <Typography
                                        sx={{
                                          fontSize: 10,
                                          color: C.navy,
                                          fontWeight: 700,
                                        }}
                                      >
                                        ▶ Model Active:
                                      </Typography>
                                      <Typography
                                        sx={{ fontSize: 10, color: C.navy }}
                                      >
                                        Demand absorption from 50k/yr
                                        transactions reduces effective
                                        months-of-supply in target markets.
                                      </Typography>
                                    </Box>
                                  )}
                              </CardContent>
                            </Card>

                            {/* Affordability & Ownership */}
                            <Card
                              elevation={0}
                              sx={{
                                border: `1px solid ${C.border}`,
                                borderRadius: 1,
                              }}
                            >
                              <CardContent>
                                <SectionHeader
                                  title="Affordability & Ownership"
                                  sub="Price/income (left) · homeownership % · rental vacancy % (right)"
                                />
                                <Line
                                  data={hAffordabilityData}
                                  options={{
                                    responsive: true,
                                    plugins: {
                                      legend: baseLegend,
                                      tooltip: hAffordTip,
                                    },
                                    scales: {
                                      x: baseGridScale,
                                      y: {
                                        ...baseGridScale,
                                        position: "left",
                                        min: 3.5,
                                        suggestedMax: 8,
                                        ticks: {
                                          ...baseGridScale.ticks,
                                          callback: (v) => v.toFixed(1) + "×",
                                        },
                                      },
                                      y1: {
                                        ...baseGridScale,
                                        position: "right",
                                        min: 0,
                                        suggestedMax: 80,
                                        grid: { drawOnChartArea: false },
                                        ticks: {
                                          ...baseGridScale.ticks,
                                          callback: (v) => v + "%",
                                        },
                                      },
                                    },
                                  }}
                                />
                                <Insight>
                                  Price-to-income at{" "}
                                  <strong>{iPTI?.toFixed(1)}×</strong> is{" "}
                                  {iPTI != null && iPTI > 4.5 ? (
                                    <>
                                      <strong style={{ color: C.red }}>
                                        well above
                                      </strong>{" "}
                                      the 40-year average of ~3.8×
                                    </>
                                  ) : (
                                    "near the long-run average of ~3.8×"
                                  )}
                                  , reflecting a structurally stretched
                                  affordability environment. Homeownership at{" "}
                                  <strong>{iOwn?.toFixed(1)}%</strong> has held
                                  stable, confirming that existing owners are
                                  staying put rather than trading — compressing
                                  turnover and keeping effective inventory low.
                                  <strong style={{ color: C.navy }}>
                                    {" "}
                                    Stretched affordability limits the buyer
                                    universe but does not reverse prices while
                                    supply remains constrained.
                                  </strong>
                                </Insight>
                                <Callout color={C.navy}>
                                  <strong>Ampledge Impact:</strong> The
                                  price-to-income ratio is the core
                                  affordability metric Ampledge is designed to
                                  overcome. Ampledge removes that barrier
                                  entirely, converting the affordability gap
                                  from a permanent disqualifier into a solvable
                                  problem — and expanding the addressable
                                  homeownership market in the process.
                                </Callout>
                                {false &&
                                  ampledgeEnabled &&
                                  yearRange[1] > 2025 && (
                                    <Box
                                      sx={{
                                        mt: 0.75,
                                        p: 0.75,
                                        borderRadius: 1,
                                        background: C.navy + "0d",
                                        border: `1px solid ${C.navy}33`,
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 1,
                                      }}
                                    >
                                      <Typography
                                        sx={{
                                          fontSize: 10,
                                          color: C.navy,
                                          fontWeight: 700,
                                        }}
                                      >
                                        ▶ Model Active:
                                      </Typography>
                                      <Typography
                                        sx={{ fontSize: 10, color: C.navy }}
                                      >
                                        Homeownership rate rising +
                                        {AMP_OWN_LIFT_PER_YR.toFixed(3)}%/yr ·
                                        chart reflects cumulative lift through{" "}
                                        {yearRange[1]}.
                                      </Typography>
                                    </Box>
                                  )}
                              </CardContent>
                            </Card>

                            {/* Sentiment */}
                            <Card
                              elevation={0}
                              sx={{
                                border: `1px solid ${C.border}`,
                                borderRadius: 1,
                              }}
                            >
                              <CardContent>
                                <SectionHeader
                                  title="Sentiment"
                                  sub="Consumer confidence (left) · NAHB builder confidence (right)"
                                />
                                <Line
                                  data={hSentimentData}
                                  options={{
                                    responsive: true,
                                    plugins: {
                                      legend: baseLegend,
                                      tooltip: hSentimentTip,
                                    },
                                    scales: {
                                      x: baseGridScale,
                                      y: { ...baseGridScale, position: "left" },
                                      y1: {
                                        ...baseGridScale,
                                        position: "right",
                                        grid: { drawOnChartArea: false },
                                        ticks: {
                                          ...baseGridScale.ticks,
                                          callback: (v) => v,
                                        },
                                      },
                                    },
                                  }}
                                />
                                <Insight>
                                  NAHB builder confidence at{" "}
                                  <strong>{iNAHB}</strong>{" "}
                                  {iNAHB != null && iNAHB < 50 ? (
                                    <>
                                      <strong style={{ color: C.red }}>
                                        below 50
                                      </strong>{" "}
                                      — more builders view conditions as poor
                                      than good, signaling continued reluctance
                                      to add supply
                                    </>
                                  ) : (
                                    <>
                                      <strong style={{ color: C.greenLight }}>
                                        above 50
                                      </strong>{" "}
                                      — builders are net-optimistic, likely to
                                      expand supply
                                    </>
                                  )}
                                  . Consumer confidence at{" "}
                                  <strong>{iCC}</strong>{" "}
                                  {iCC != null && iCC > 100
                                    ? "reflects healthy household sentiment supportive of major purchase decisions"
                                    : "reflects cautious households more likely to delay discretionary home purchases"}
                                  .
                                  <strong style={{ color: C.navy }}>
                                    {" "}
                                    Sentiment leads housing activity by 3–6
                                    months and is an early signal for both
                                    transaction volume and pricing momentum.
                                  </strong>
                                </Insight>
                                {false &&
                                  ampledgeEnabled &&
                                  yearRange[1] > 2025 && (
                                    <Box
                                      sx={{
                                        mt: 0.75,
                                        p: 0.75,
                                        borderRadius: 1,
                                        background: C.navy + "0d",
                                        border: `1px solid ${C.navy}33`,
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 1,
                                      }}
                                    >
                                      <Typography
                                        sx={{
                                          fontSize: 10,
                                          color: C.navy,
                                          fontWeight: 700,
                                        }}
                                      >
                                        ▶ Model Active:
                                      </Typography>
                                      <Typography
                                        sx={{ fontSize: 10, color: C.navy }}
                                      >
                                        Improved homebuyer confidence from
                                        Ampledge accessibility supports both
                                        consumer sentiment and builder outlook.
                                      </Typography>
                                    </Box>
                                  )}
                              </CardContent>
                            </Card>
                          </Box>
                        </Box>
                      );
                    })()}
                  {/* ── Scoring Model — left panel ── */}
                  {chartPane === "model" &&
                    (() => {
                      const ACT_DIMS_FULL = [
                        {
                          id: "entry_cost",
                          label: "Entry Cost",
                          weight: 12,
                          metrics: [
                            [
                              "Median Home Value (ZHVI)",
                              "lower → higher score",
                            ],
                          ],
                        },
                        {
                          id: "economic_distress",
                          label: "Economic Distress",
                          weight: 10,
                          metrics: [
                            ["Poverty Rate", "higher → higher score"],
                            ["Unemployment Rate", "higher → higher score"],
                            ["Vacancy Rate", "higher → higher score"],
                            ["Median HHI", "lower → higher score"],
                          ],
                        },
                        {
                          id: "demographic_momentum",
                          label: "Demographic Momentum",
                          weight: 10,
                          metrics: [
                            [
                              "Population Growth (CAGR)",
                              "higher → higher score",
                            ],
                            [
                              "Permit Activity (units/1k)",
                              "higher → higher score",
                            ],
                          ],
                        },
                        {
                          id: "labor_market_momentum",
                          label: "Labor Market Momentum",
                          weight: 10,
                          metrics: [
                            [
                              "Employment Growth (YoY)",
                              "higher → higher score",
                            ],
                            [
                              "Labor Force Participation",
                              "higher → higher score",
                            ],
                            [
                              "Median Annual Wage (OES)",
                              "higher → higher score",
                            ],
                          ],
                        },
                        {
                          id: "business_dynamism",
                          label: "Business Dynamism",
                          weight: 8,
                          metrics: [
                            [
                              "Establishments per 1k Pop",
                              "higher → higher score",
                            ],
                            [
                              "Employees per Establishment",
                              "higher → higher score",
                            ],
                            [
                              "Establishment Growth (YoY)",
                              "higher → higher score",
                            ],
                          ],
                        },
                        {
                          id: "catalyst_evidence",
                          label: "Catalyst Evidence",
                          weight: 10,
                          metrics: [
                            [
                              "Federal Awards per Capita",
                              "higher → higher score",
                            ],
                            ["Opportunity Zone Flag", "higher → higher score"],
                          ],
                        },
                        {
                          id: "anchor_institutions",
                          label: "Anchor Institutions",
                          weight: 8,
                          metrics: [
                            [
                              "College Enrollment per 1k",
                              "higher → higher score",
                            ],
                            ["Hospital Beds per 1k", "higher → higher score"],
                          ],
                        },
                        {
                          id: "infrastructure_readiness",
                          label: "Infrastructure Readiness",
                          weight: 8,
                          metrics: [
                            ["Broadband Coverage (%)", "higher → higher score"],
                          ],
                        },
                        {
                          id: "logistics",
                          label: "Logistics & Market Access",
                          weight: 8,
                          metrics: [
                            [
                              "Transport Employment Share",
                              "higher → higher score",
                            ],
                            [
                              "Urban Area Coverage (%)",
                              "higher → higher score",
                            ],
                          ],
                        },
                        {
                          id: "governance",
                          label: "Governance & Incentives",
                          weight: 6,
                          metrics: [
                            [
                              "Government Employment Share",
                              "lower → higher score",
                            ],
                            [
                              "Permit Activity (units/1k)",
                              "higher → higher score",
                            ],
                          ],
                        },
                        {
                          id: "risk_resilience",
                          label: "Risk & Resilience",
                          weight: 5,
                          metrics: [
                            ["FEMA Climate Risk Score", "lower → higher score"],
                          ],
                        },
                        {
                          id: "env_regulatory",
                          label: "Env. & Regulatory",
                          weight: 5,
                          metrics: [
                            ["Superfund Site Density", "lower → higher score"],
                            ["Broadband Coverage (%)", "higher → higher score"],
                          ],
                        },
                      ];
                      const EXP_DIMS_FULL = [
                        {
                          id: "metro_adjacency",
                          label: "Metro Adjacency",
                          weight: 14,
                          metrics: [
                            [
                              "Drive Time to Nearest Metro",
                              "lower → higher score",
                            ],
                          ],
                        },
                        {
                          id: "pop_migration",
                          label: "Population & Migration",
                          weight: 12,
                          metrics: [
                            [
                              "Population Growth (CAGR)",
                              "higher → higher score",
                            ],
                            ["Net Migration Rate", "higher → higher score"],
                          ],
                        },
                        {
                          id: "land_availability",
                          label: "Land Availability",
                          weight: 10,
                          metrics: [
                            ["Farmland Value per Acre", "lower → higher score"],
                            ["Population Density", "lower → higher score"],
                          ],
                        },
                        {
                          id: "household_income",
                          label: "Household Income",
                          weight: 10,
                          metrics: [
                            ["Median HHI", "higher → higher score"],
                            ["Income Growth (CAGR)", "higher → higher score"],
                          ],
                        },
                        {
                          id: "employment_base",
                          label: "Employment Base",
                          weight: 10,
                          metrics: [
                            ["Total Employment", "higher → higher score"],
                            [
                              "Employment Growth (YoY)",
                              "higher → higher score",
                            ],
                            [
                              "Median Annual Wage (OES)",
                              "higher → higher score",
                            ],
                          ],
                        },
                        {
                          id: "school_district",
                          label: "School District",
                          weight: 8,
                          metrics: [
                            [
                              "School Proficiency Rate (EDFacts)",
                              "higher → higher score",
                            ],
                          ],
                        },
                        {
                          id: "housing_demand",
                          label: "Housing Demand",
                          weight: 8,
                          metrics: [
                            [
                              "1-Yr Home Price Appreciation",
                              "higher → higher score",
                            ],
                            [
                              "Permit Activity (units/1k)",
                              "higher → higher score",
                            ],
                          ],
                        },
                        {
                          id: "infrastructure",
                          label: "Infrastructure",
                          weight: 8,
                          metrics: [
                            ["Broadband Coverage (%)", "higher → higher score"],
                          ],
                        },
                        {
                          id: "permitting_climate",
                          label: "Permitting Climate",
                          weight: 8,
                          metrics: [
                            [
                              "Permit Activity (units/1k)",
                              "higher → higher score",
                            ],
                            ["Urban Area Coverage (%)", "lower → higher score"],
                          ],
                        },
                        {
                          id: "natural_amenity",
                          label: "Natural Amenity",
                          weight: 6,
                          metrics: [
                            ["USDA Amenity Scale", "higher → higher score"],
                          ],
                        },
                        {
                          id: "risk_resilience",
                          label: "Risk & Resilience",
                          weight: 4,
                          metrics: [
                            ["FEMA Climate Risk Score", "lower → higher score"],
                          ],
                        },
                        {
                          id: "tax_regulatory",
                          label: "Tax & Regulatory",
                          weight: 2,
                          metrics: [
                            ["Property Tax Rate", "lower → higher score"],
                          ],
                        },
                      ];
                      const DimTable = ({ dims, thesis }) => (
                        <Card
                          elevation={0}
                          sx={{
                            border: `1px solid ${C.border}`,
                            borderRadius: 1,
                          }}
                        >
                          <CardContent sx={{ pb: "12px !important" }}>
                            <Box
                              sx={{
                                pb: 1,
                                mb: 1.5,
                                borderBottom: `2px solid ${C.navy}`,
                                width: "fit-content",
                              }}
                            >
                              <Typography
                                sx={{
                                  fontSize: 11,
                                  fontWeight: 800,
                                  color: C.navy,
                                  textTransform: "uppercase",
                                  letterSpacing: "0.09em",
                                }}
                              >
                                {thesis} Thesis · Dimensions
                              </Typography>
                              <Typography
                                sx={{ fontSize: 10, color: C.muted, mt: 0.25 }}
                              >
                                Composite = Σ(dim score × weight) ÷ Σ weights ·
                                all scores 0–100 percentile within universe
                              </Typography>
                            </Box>
                            <Box sx={{ overflowX: "auto" }}>
                              <table
                                style={{
                                  width: "100%",
                                  borderCollapse: "collapse",
                                  fontSize: 11,
                                }}
                              >
                                <thead>
                                  <tr>
                                    {[
                                      "Dimension",
                                      "Wt",
                                      "Input Metrics & Direction",
                                    ].map((h) => (
                                      <th
                                        key={h}
                                        style={{
                                          padding: "5px 10px",
                                          textAlign: "left",
                                          color: C.muted,
                                          fontWeight: 700,
                                          fontSize: 10,
                                          textTransform: "uppercase",
                                          letterSpacing: "0.07em",
                                          borderBottom: `1px solid ${C.border}`,
                                          whiteSpace: "nowrap",
                                        }}
                                      >
                                        {h}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {dims.map((d, i) => (
                                    <tr
                                      key={d.id}
                                      style={{
                                        background:
                                          i % 2 === 0 ? "transparent" : C.bg,
                                        borderBottom: `1px solid ${C.border}`,
                                      }}
                                    >
                                      <td
                                        style={{
                                          padding: "8px 10px",
                                          fontWeight: 700,
                                          color: C.charcoal,
                                          whiteSpace: "nowrap",
                                          verticalAlign: "top",
                                        }}
                                      >
                                        {d.label}
                                      </td>
                                      <td
                                        style={{
                                          padding: "8px 10px",
                                          verticalAlign: "top",
                                          whiteSpace: "nowrap",
                                        }}
                                      >
                                        <Box
                                          sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 0.5,
                                          }}
                                        >
                                          <Box
                                            sx={{
                                              width: `${d.weight * 2}px`,
                                              height: 6,
                                              background: C.navy,
                                              borderRadius: 2,
                                              minWidth: 4,
                                            }}
                                          />
                                          <span
                                            style={{
                                              fontSize: 11,
                                              fontWeight: 700,
                                              color: C.navy,
                                            }}
                                          >
                                            {d.weight}%
                                          </span>
                                        </Box>
                                      </td>
                                      <td
                                        style={{
                                          padding: "8px 10px",
                                          verticalAlign: "top",
                                        }}
                                      >
                                        {d.metrics.map(([name, dir]) => (
                                          <Box
                                            key={name}
                                            sx={{
                                              display: "flex",
                                              alignItems: "baseline",
                                              gap: 1,
                                              mb: "3px",
                                            }}
                                          >
                                            <span
                                              style={{
                                                fontSize: 11,
                                                color: C.charcoal,
                                                fontWeight: 600,
                                              }}
                                            >
                                              {name}
                                            </span>
                                            <span
                                              style={{
                                                fontSize: 10,
                                                color: C.muted,
                                              }}
                                            >
                                              {dir}
                                            </span>
                                          </Box>
                                        ))}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </Box>
                          </CardContent>
                        </Card>
                      );
                      return (
                        <>
                          {/* Methodology Overview */}
                          <Card
                            elevation={0}
                            sx={{
                              border: `1px solid ${C.navy}`,
                              borderRadius: 1,
                              overflow: "hidden",
                            }}
                          >
                            <Box sx={{ background: C.navy, px: 2, py: 1.25 }}>
                              <Typography
                                sx={{
                                  fontSize: 11,
                                  fontWeight: 800,
                                  color: C.white,
                                  textTransform: "uppercase",
                                  letterSpacing: "0.09em",
                                }}
                              >
                                Ground Score · Scoring Methodology
                              </Typography>
                              <Typography
                                sx={{
                                  fontSize: 10,
                                  color: "rgba(255,255,255,0.6)",
                                  mt: 0.25,
                                }}
                              >
                                How every composite score, dimension, and tier
                                is computed from raw data
                              </Typography>
                            </Box>
                            <CardContent sx={{ pb: "12px !important" }}>
                              <Box
                                sx={{
                                  display: "flex",
                                  flexWrap: "wrap",
                                  gap: 3,
                                }}
                              >
                                {[
                                  [
                                    "Universe",
                                    "All 3,100+ US counties are scored simultaneously. Scores are universe-relative percentiles — a score of 72 means the county ranks in the 72nd percentile of its full 3,104-county peer set, not an absolute value.",
                                  ],
                                  [
                                    "Normalization",
                                    "Each raw metric is min-max normalized to 0–100 within the scored universe. Direction is applied (lower_better metrics are inverted). Metrics within a dimension are simple-averaged into a dimension score.",
                                  ],
                                  [
                                    "Composite",
                                    "The composite score is a weighted average of all dimension scores: Σ(dim_score × weight) ÷ Σ(weights). Weights are thesis-specific and calibrated to investment strategy — see dimension tables below.",
                                  ],
                                  [
                                    "Tiers",
                                    "Tier assignment is percentile-based within each thesis universe. Lead Market ≥ 95th pct · Priority Market ≥ 80th · Watchlist ≥ 50th · Deprioritized < 50th.",
                                  ],
                                  [
                                    "Two Theses",
                                    "Activation targets distressed secondary/tertiary markets ahead of catalyst events — dimensions emphasize distress depth, catalyst evidence, and entry cost. Expansion targets metro-fringe greenfield development — dimensions emphasize metro adjacency, land availability, household income, and school quality.",
                                  ],
                                  [
                                    "Supplemental Signals",
                                    "Some metrics (STEM occupation share, high-skill employment share) are shown in the Supplemental Signals panel as contextual benchmarks but are not inputs to dimension scores. They provide additional investment intelligence without distorting the weighted composite.",
                                  ],
                                ].map(([title, body]) => (
                                  <Box
                                    key={title}
                                    sx={{ flex: "1 1 260px", minWidth: 0 }}
                                  >
                                    <Typography
                                      sx={{
                                        fontSize: 10,
                                        fontWeight: 800,
                                        color: C.navy,
                                        textTransform: "uppercase",
                                        letterSpacing: "0.08em",
                                        mb: 0.5,
                                      }}
                                    >
                                      {title}
                                    </Typography>
                                    <Typography
                                      sx={{
                                        fontSize: 11,
                                        color: C.charcoal,
                                        lineHeight: 1.65,
                                      }}
                                    >
                                      {body}
                                    </Typography>
                                  </Box>
                                ))}
                              </Box>
                            </CardContent>
                          </Card>
                          <DimTable dims={ACT_DIMS_FULL} thesis="Activation" />
                          <DimTable dims={EXP_DIMS_FULL} thesis="Expansion" />
                        </>
                      );
                    })()}
                </Box>
                {/* end left col */}

                {/* Right 50%: portfolio / housing panes */}
                <Box
                  sx={{
                    flex: 1,
                    minWidth: 0,
                    flexBasis: { md: "50%" },
                    width: { xs: "100%", md: "auto" },
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                  }}
                >
                  {chartPane === "portfolio" && (
                    <Box
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
                                  {
                                    label: "AmPledge",
                                    st: ampSt,
                                    color: C.red,
                                  },
                                  {
                                    label: "S&P",
                                    st: spSt,
                                    color: C.greenLight,
                                  },
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
                    </Box>
                  )}

                  {chartPane === "housing" && (
                    <Box
                      sx={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                      }}
                    >
                      {/* ── Housing Market Summary ── */}
                      <Card
                        elevation={0}
                        sx={{
                          border: `1px solid ${C.border}`,
                          borderRadius: 1,
                        }}
                      >
                        <CardContent sx={{ pb: "12px !important" }}>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "flex-start",
                              justifyContent: "space-between",
                              mb: 1.5,
                              gap: 1,
                              flexWrap: "wrap",
                            }}
                          >
                            <SectionHeader
                              title="Housing Market Summary"
                              sub="Conditions assessment · selected period + scenario outlook"
                            />
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                                flexWrap: "wrap",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: mktToneColor,
                                  background: mktToneColor + "18",
                                  border: `1px solid ${mktToneColor}44`,
                                  borderRadius: 4,
                                  padding: "3px 10px",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {blendedScore > 0.5
                                  ? "▲ "
                                  : blendedScore < -0.5
                                    ? "▼ "
                                    : "● "}
                                {mktTone.charAt(0).toUpperCase() +
                                  mktTone.slice(1)}
                              </span>
                            </Box>
                          </Box>
                          {/* Scenario + Ampledge controls */}
                          <Box
                            sx={{
                              display: "flex",
                              flexDirection: "column",
                              gap: 0.75,
                              mb: 1.5,
                              pb: 1.25,
                              borderBottom: `1px solid ${C.border}`,
                            }}
                          >
                            {/* Row 1: Scenario */}
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 0.75,
                              }}
                            >
                              <Typography
                                sx={{
                                  fontSize: 11,
                                  color: C.muted,
                                  fontWeight: 600,
                                  minWidth: 68,
                                }}
                              >
                                Scenario:
                              </Typography>
                              {[
                                ["Bear", "bear", C.red],
                                ["Base", "base", C.navy],
                                ["Bull", "bull", C.greenLight],
                              ].map(([label, val, color]) => (
                                <button
                                  key={val}
                                  onClick={() => setScenario(val)}
                                  style={{
                                    padding: "3px 10px",
                                    fontSize: 11,
                                    fontWeight: 600,
                                    fontFamily: "'Inter',sans-serif",
                                    border: `1px solid ${scenario === val ? color : C.border}`,
                                    borderRadius: 4,
                                    cursor: "pointer",
                                    background:
                                      scenario === val ? color : C.white,
                                    color: scenario === val ? C.white : C.muted,
                                  }}
                                >
                                  {label}
                                </button>
                              ))}
                              <Typography
                                sx={{
                                  fontSize: 10,
                                  color: C.muted,
                                  fontStyle: "italic",
                                  ml: 0.5,
                                }}
                              >
                                {scenario === "bear"
                                  ? "Rates elevated, demand softens"
                                  : scenario === "bull"
                                    ? "Rate relief arrives, demand surges"
                                    : "Gradual normalization, steady growth"}
                              </Typography>
                            </Box>
                            {/* Row 2: Ampledge Impact — note is always rendered to prevent button shift */}
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 0.75,
                              }}
                            >
                              <Typography
                                sx={{
                                  fontSize: 11,
                                  color: C.muted,
                                  fontWeight: 600,
                                  minWidth: 68,
                                }}
                              >
                                Ampledge:
                              </Typography>
                              <button
                                onClick={() =>
                                  setAmpledgeEnabled(!ampledgeEnabled)
                                }
                                style={{
                                  padding: "3px 10px",
                                  fontSize: 11,
                                  fontWeight: 600,
                                  fontFamily: "'Inter',sans-serif",
                                  border: `1px solid ${ampledgeEnabled ? C.navy : C.border}`,
                                  borderRadius: 4,
                                  cursor: "pointer",
                                  background: ampledgeEnabled
                                    ? C.navy
                                    : C.white,
                                  color: ampledgeEnabled ? C.white : C.muted,
                                }}
                              >
                                {ampledgeEnabled ? "On" : "Off"}
                              </button>
                              <Typography
                                sx={{
                                  fontSize: 10,
                                  color: C.muted,
                                  fontStyle: "italic",
                                  ml: 0.5,
                                  visibility: ampledgeEnabled
                                    ? "visible"
                                    : "hidden",
                                }}
                              >
                                50k transactions/yr · +
                                {AMP_HPA_PREMIUM.toFixed(1)}pp HPA · +0.04%/yr
                                ownership
                              </Typography>
                            </Box>
                          </Box>

                          {/* Current conditions */}
                          <Typography
                            sx={{
                              fontSize: 12,
                              color: C.charcoal,
                              lineHeight: 1.6,
                              mb: 1.5,
                            }}
                          >
                            Over the selected period,{" "}
                            {mktStrongTailwinds.length} strong tailwind
                            {mktStrongTailwinds.length !== 1 ? "s" : ""} and{" "}
                            {mktStrongHeadwinds.length} strong headwind
                            {mktStrongHeadwinds.length !== 1 ? "s" : ""} are
                            present among key housing drivers.
                            {mktHPA != null && (
                              <>
                                {" "}
                                HPA is running at{" "}
                                <strong>{mktHPA.toFixed(1)}%</strong> annually
                              </>
                            )}
                            {mktMtg != null && (
                              <>
                                , with 30-year mortgage rates at{" "}
                                <strong>{mktMtg.toFixed(2)}%</strong>
                              </>
                            )}
                            {mktSupply != null && (
                              <>
                                {" "}
                                and{" "}
                                <strong>
                                  {mktSupply.toFixed(1)} months
                                </strong>{" "}
                                of supply on the market
                              </>
                            )}
                            .
                            {mktUnemp != null && (
                              <>
                                {" "}
                                Unemployment at{" "}
                                <strong>{mktUnemp.toFixed(1)}%</strong>
                              </>
                            )}
                            {mktFed != null && (
                              <>
                                {" "}
                                and Fed Funds at{" "}
                                <strong>{mktFed.toFixed(2)}%</strong>
                              </>
                            )}
                            {mktNAHB != null && (
                              <>
                                {" "}
                                with builder sentiment at{" "}
                                <strong>{mktNAHB}</strong> (NAHB)
                              </>
                            )}{" "}
                            paint a {mktTone} backdrop for appreciation.
                            {mktStrongHeadwinds.length > 0 && (
                              <>
                                {" "}
                                Key headwinds include{" "}
                                <em>
                                  {mktStrongHeadwinds
                                    .slice(0, 2)
                                    .map((d) => d.label)
                                    .join(" and ")}
                                </em>
                                .
                              </>
                            )}
                            {mktStrongTailwinds.length > 0 && (
                              <>
                                {" "}
                                Supporting factors include{" "}
                                <em>
                                  {mktStrongTailwinds
                                    .slice(0, 2)
                                    .map((d) => d.label)
                                    .join(" and ")}
                                </em>
                                .
                              </>
                            )}
                            {(() => {
                              const note = kalshiValidationNote(
                                kalshiData,
                                mktTone,
                              );
                              return note ? (
                                <>
                                  <br />
                                  <br />
                                  {note}
                                </>
                              ) : null;
                            })()}
                          </Typography>

                          {/* Forward outlook table */}
                          {(mktAvg3 != null ||
                            mktAvg5 != null ||
                            mktAvg10 != null) && (
                            <>
                              <Typography
                                sx={{
                                  fontSize: 10,
                                  fontWeight: 700,
                                  color: C.muted,
                                  textTransform: "uppercase",
                                  letterSpacing: "0.07em",
                                  mb: 0.75,
                                }}
                              >
                                {scenario.charAt(0).toUpperCase() +
                                  scenario.slice(1)}{" "}
                                Scenario Outlook
                              </Typography>
                              <Box
                                sx={{
                                  display: "flex",
                                  gap: 1.5,
                                  flexWrap: "wrap",
                                }}
                              >
                                {[
                                  { label: "3-Year (2026–28)", avg: mktAvg3 },
                                  { label: "5-Year (2026–30)", avg: mktAvg5 },
                                  { label: "10-Year (2026–35)", avg: mktAvg10 },
                                ]
                                  .filter(({ avg }) => avg != null)
                                  .map(({ label, avg }) => {
                                    const ol = outlookLabel(avg);
                                    const oc = outlookColor(avg);
                                    return (
                                      <Box
                                        key={label}
                                        sx={{
                                          flex: "1 1 120px",
                                          border: `1px solid ${oc}44`,
                                          borderRadius: 1,
                                          p: 1,
                                          minWidth: 110,
                                          background: oc + "18",
                                        }}
                                      >
                                        <Typography
                                          sx={{
                                            fontSize: 10,
                                            color: C.muted,
                                            fontWeight: 600,
                                            mb: 0.25,
                                          }}
                                        >
                                          {label}
                                        </Typography>
                                        <Typography
                                          sx={{
                                            fontSize: 18,
                                            fontWeight: 700,
                                            color: oc,
                                            lineHeight: 1.1,
                                          }}
                                        >
                                          {avg.toFixed(1)}%
                                        </Typography>
                                        <Typography
                                          sx={{ fontSize: 10, color: C.muted }}
                                        >
                                          avg HPA/yr
                                        </Typography>
                                        <Typography
                                          sx={{
                                            fontSize: 10,
                                            fontWeight: 700,
                                            color: oc,
                                            mt: 0.25,
                                          }}
                                        >
                                          {ol}
                                        </Typography>
                                      </Box>
                                    );
                                  })}
                              </Box>
                            </>
                          )}

                          {/* ── Policy Watch callout ── */}
                          {(() => {
                            const prob = policyWatchData
                              ? Math.round(
                                  (parseFloat(policyWatchData.last_price) ||
                                    parseFloat(policyWatchData.yes_bid) ||
                                    0) * 100,
                                )
                              : null;
                            const closeYear = policyWatchData?.close_time
                              ? new Date(
                                  policyWatchData.close_time,
                                ).getFullYear()
                              : null;
                            if (prob === null) return null;
                            const accent =
                              prob >= 60
                                ? "#f59e0b"
                                : prob >= 40
                                  ? C.muted
                                  : C.greenLight;
                            return (
                              <Box
                                sx={{
                                  mt: 1.5,
                                  p: 1.5,
                                  background: accent + "18",
                                  borderRadius: 1,
                                  borderLeft: `3px solid ${accent}`,
                                }}
                              >
                                <Box
                                  sx={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    mb: 0.75,
                                  }}
                                >
                                  <Typography
                                    sx={{
                                      fontSize: 10,
                                      fontWeight: 700,
                                      color: accent,
                                      textTransform: "uppercase",
                                      letterSpacing: "0.08em",
                                    }}
                                  >
                                    ⚠ Policy Watch · Kalshi
                                  </Typography>
                                  <Typography
                                    sx={{
                                      fontSize: 15,
                                      fontWeight: 700,
                                      color: accent,
                                      lineHeight: 1,
                                    }}
                                  >
                                    {prob}% likely
                                  </Typography>
                                </Box>
                                <Typography
                                  sx={{
                                    fontSize: 11,
                                    fontWeight: 700,
                                    color: C.charcoal,
                                    mb: 0.5,
                                  }}
                                >
                                  Will legislation restricting institutional
                                  single-family home investment become law this
                                  year?
                                </Typography>
                                <Typography
                                  sx={{
                                    fontSize: 11,
                                    color: C.charcoal,
                                    lineHeight: 1.7,
                                  }}
                                >
                                  Kalshi prediction markets price this at{" "}
                                  <strong>{prob}% probability</strong> — up
                                  sharply from ~38% in early February — making
                                  it the single highest-impact legislative risk
                                  to near-term home price appreciation.
                                  Institutional landlords such as Blackrock and
                                  Invitation Homes collectively hold an
                                  estimated 500k–1M+ single-family homes. A
                                  forced divestiture would create a significant
                                  inventory surge in investor-heavy markets like
                                  Atlanta, Phoenix, Dallas, and Charlotte,
                                  putting direct downward pressure on HPA in
                                  those MSAs in the near term.
                                </Typography>
                                <Box
                                  sx={{
                                    mt: 1,
                                    pt: 1,
                                    borderTop: `1px solid ${accent}33`,
                                  }}
                                >
                                  <Typography
                                    sx={{
                                      fontSize: 10,
                                      fontWeight: 700,
                                      color: accent,
                                      textTransform: "uppercase",
                                      letterSpacing: "0.07em",
                                      mb: 0.5,
                                    }}
                                  >
                                    American Pledge Opportunity
                                  </Typography>
                                  <Typography
                                    sx={{
                                      fontSize: 11,
                                      color: C.charcoal,
                                      lineHeight: 1.7,
                                    }}
                                  >
                                    A legislated exit creates a rare structural
                                    opportunity for the American Pledge model.
                                    Rather than flooding the market with
                                    distressed inventory, institutional holders
                                    could convert their tenant base directly
                                    into buyers — funding the required{" "}
                                    <strong>20% down payment</strong> through
                                    the AmPledge structure as a condition of
                                    sale. This approach preserves asset value
                                    for the seller, avoids a market-wide price
                                    shock, and positions AmPledge as the{" "}
                                    <strong>
                                      infrastructure for a national housing
                                      ownership transition
                                    </strong>
                                    . The higher the probability climbs, the
                                    more urgently institutional partners should
                                    be engaged before they lose negotiating
                                    leverage.
                                  </Typography>
                                </Box>
                                {closeYear && (
                                  <Typography
                                    sx={{
                                      fontSize: 10,
                                      color: C.muted,
                                      mt: 0.75,
                                      fontStyle: "italic",
                                    }}
                                  >
                                    Via Kalshi · KXHFHOUSING-27 · resolves Dec
                                    31, {closeYear}
                                  </Typography>
                                )}
                              </Box>
                            );
                          })()}
                        </CardContent>
                      </Card>

                      {/* ── Prediction Market Signals (Kalshi) ── */}
                      <Card
                        elevation={0}
                        sx={{
                          border: `1px solid ${C.border}`,
                          borderRadius: 1,
                        }}
                      >
                        <CardContent sx={{ pb: "12px !important" }}>
                          <Box
                            sx={{
                              display: "flex",
                              flexDirection: "column",
                              alignItems: "flex-start",
                              mb: 1.5,
                            }}
                          >
                            <img
                              src={kalshiLogo}
                              alt="Kalshi"
                              style={{
                                height: 18,
                                width: "auto",
                                marginBottom: 6,
                                filter:
                                  "brightness(0) saturate(100%) invert(58%) sepia(61%) saturate(428%) hue-rotate(113deg) brightness(96%) contrast(91%)",
                              }}
                            />
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                width: "100%",
                              }}
                            >
                              <SectionHeader
                                title="Prediction Market Signals"
                                sub="Market-implied consensus from Kalshi · next data release"
                              />
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1,
                                }}
                              >
                                {kalshiData?.fetched_at && (
                                  <Typography
                                    sx={{
                                      fontSize: 10,
                                      color: C.muted,
                                      fontStyle: "italic",
                                    }}
                                  >
                                    Updated{" "}
                                    {new Date(
                                      kalshiData.fetched_at,
                                    ).toLocaleTimeString()}
                                  </Typography>
                                )}
                                <button
                                  onClick={refreshKalshi}
                                  disabled={kalshiLoading}
                                  title="Refresh market data"
                                  style={{
                                    background: kalshiLoading
                                      ? "#2aa882"
                                      : "#35bd98",
                                    border: "none",
                                    borderRadius: 4,
                                    cursor: kalshiLoading
                                      ? "not-allowed"
                                      : "pointer",
                                    padding: "3px 9px",
                                    fontSize: 11,
                                    fontWeight: 600,
                                    color: "#fff",
                                    fontFamily: "'Inter',sans-serif",
                                    letterSpacing: "0.03em",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 4,
                                    opacity: kalshiLoading ? 0.8 : 1,
                                  }}
                                >
                                  <span
                                    style={{
                                      display: "inline-block",
                                      animation: kalshiLoading
                                        ? "kalshi-spin 0.8s linear infinite"
                                        : "none",
                                    }}
                                  >
                                    ⟳
                                  </span>
                                  {kalshiLoading ? "Loading..." : "Refresh"}
                                  <style>{`@keyframes kalshi-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
                                </button>
                              </Box>
                            </Box>
                          </Box>
                          <Box
                            sx={{
                              mb: 1.5,
                              p: 1.25,
                              background: C.navy + "08",
                              borderRadius: 1,
                              borderLeft: `3px solid ${C.greenLight}`,
                            }}
                          >
                            <Typography
                              sx={{
                                fontSize: 11,
                                color: C.charcoal,
                                lineHeight: 1.65,
                              }}
                            >
                              <strong>Kalshi</strong> is a regulated U.S.
                              prediction market exchange where participants
                              trade contracts on real-world outcomes — including
                              economic indicators, Fed decisions, and housing
                              metrics. Unlike surveys or analyst forecasts,
                              Kalshi prices reflect{" "}
                              <strong>actual money at risk</strong>: traders
                              profit only when they're right, creating a
                              powerful incentive for accuracy. Academic research
                              consistently shows prediction markets outperform
                              traditional forecasting models, especially near
                              data release dates when informed participants
                              concentrate. The values below represent the{" "}
                              <strong>market-implied median</strong> for each
                              metric — the threshold where the crowd
                              collectively assigns a 50/50 probability —
                              providing an independent, real-time cross-check on
                              the outlook above.
                            </Typography>
                          </Box>
                          {kalshiError && (
                            <Typography sx={{ fontSize: 11, color: "#e57373" }}>
                              Unable to load prediction market data:{" "}
                              {kalshiError}
                            </Typography>
                          )}
                          {!kalshiData && !kalshiError && (
                            <Box
                              sx={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: 1.5,
                              }}
                            >
                              {Object.keys(KALSHI_SERIES_META).map((series) => (
                                <Box
                                  key={series}
                                  sx={{
                                    flex: "1 1 140px",
                                    minWidth: 130,
                                    border: `1px solid ${C.border}`,
                                    borderRadius: 1,
                                    p: 1,
                                  }}
                                >
                                  <Skeleton
                                    variant="text"
                                    width="70%"
                                    height={14}
                                    sx={{ mb: 0.5 }}
                                  />
                                  <Skeleton
                                    variant="text"
                                    width="50%"
                                    height={28}
                                    sx={{ mb: 0.25 }}
                                  />
                                  <Skeleton
                                    variant="text"
                                    width="60%"
                                    height={12}
                                  />
                                  <Skeleton
                                    variant="text"
                                    width="80%"
                                    height={10}
                                  />
                                </Box>
                              ))}
                            </Box>
                          )}
                          {kalshiData?.series &&
                            (() => {
                              const tiles = Object.entries(
                                KALSHI_SERIES_META,
                              ).map(([series, meta]) => {
                                const seriesData = kalshiData.series[series] ?? {};
                                const markets = seriesData.markets ?? [];
                                const isSettled = seriesData.settled === true;
                                const medianResult = kalshiMedian(markets);
                                const closeDate = medianResult?.closeDate
                                  ? new Date(
                                      medianResult.closeDate,
                                    ).toLocaleDateString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                    })
                                  : null;
                                return {
                                  series,
                                  meta,
                                  median: medianResult,
                                  closeDate,
                                  count: markets.length,
                                  isSettled,
                                };
                              });
                              return (
                                <Box
                                  sx={{
                                    display: "flex",
                                    flexWrap: "wrap",
                                    gap: 1.5,
                                  }}
                                >
                                  {tiles.map(
                                    ({
                                      series,
                                      meta,
                                      median: m,
                                      closeDate,
                                      count,
                                      isSettled,
                                    }) => {
                                      const sig =
                                        m != null && meta.housingSignal
                                          ? meta.housingSignal(m.value)
                                          : null;
                                      const sigColor =
                                        sig === 1
                                          ? C.greenLight
                                          : sig === -1
                                            ? "#e57373"
                                            : null;
                                      return (
                                        <Box
                                          key={series}
                                          sx={{
                                            flex: "1 1 140px",
                                            minWidth: 130,
                                            border: `1px solid ${sigColor ? sigColor + "55" : C.border}`,
                                            borderRadius: 1,
                                            p: 1,
                                            background: sigColor
                                              ? sigColor + "0d"
                                              : "transparent",
                                            opacity: isSettled ? 0.75 : 1,
                                          }}
                                        >
                                          <Typography
                                            sx={{
                                              fontSize: 10,
                                              color: C.muted,
                                              fontWeight: 600,
                                              mb: 0.25,
                                            }}
                                          >
                                            {meta.label}
                                          </Typography>
                                          {m != null ? (
                                            <>
                                              <Typography
                                                sx={{
                                                  fontSize: 20,
                                                  fontWeight: 700,
                                                  color: sigColor ?? C.navy,
                                                  lineHeight: 1.1,
                                                }}
                                              >
                                                {m.prefix}
                                                {meta.unit === "k"
                                                  ? Math.round(m.value) + "k"
                                                  : meta.unit === "$k"
                                                    ? "$" +
                                                      Math.round(
                                                        m.value / 1000,
                                                      ) +
                                                      "k"
                                                    : m.value.toFixed(
                                                        meta.decimals,
                                                      ) + meta.unit}
                                              </Typography>
                                              <Typography
                                                sx={{
                                                  fontSize: 10,
                                                  color: C.muted,
                                                }}
                                              >
                                                {isSettled
                                                  ? "last settled"
                                                  : m.prefix
                                                    ? "boundary estimate"
                                                    : "market median"}
                                              </Typography>
                                              {closeDate && (
                                                <Typography
                                                  sx={{
                                                    fontSize: 9,
                                                    color: C.muted,
                                                    mt: 0.25,
                                                    fontStyle: "italic",
                                                  }}
                                                >
                                                  {isSettled
                                                    ? `settled ${closeDate}`
                                                    : `closes ${closeDate} · ${m.cohortCount ?? count} markets`}
                                                </Typography>
                                              )}
                                            </>
                                          ) : (
                                            <Typography
                                              sx={{
                                                fontSize: 12,
                                                color: C.muted,
                                                fontStyle: "italic",
                                              }}
                                            >
                                              No data
                                            </Typography>
                                          )}
                                        </Box>
                                      );
                                    },
                                  )}
                                </Box>
                              );
                            })()}
                          {(() => {
                            if (!kalshiData?.series) return null;
                            const tiles = Object.entries(
                              KALSHI_SERIES_META,
                            ).map(([series, meta]) => {
                              const markets =
                                kalshiData.series[series]?.markets ?? [];
                              return {
                                series,
                                meta,
                                median: kalshiMedian(markets),
                                count: markets.length,
                              };
                            });
                            const summary = kalshiSummary(tiles);
                            return summary ? (
                              <Box
                                sx={{
                                  mt: 1.5,
                                  pt: 1.5,
                                  borderTop: `1px solid ${C.border}`,
                                }}
                              >
                                <Typography
                                  sx={{
                                    fontSize: 10,
                                    fontWeight: 700,
                                    color: C.muted,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.07em",
                                    mb: 0.5,
                                  }}
                                >
                                  Market Consensus Summary
                                </Typography>
                                <Typography
                                  sx={{
                                    fontSize: 10,
                                    color: C.navyDark,
                                    lineHeight: 1.65,
                                  }}
                                >
                                  {summary}
                                </Typography>
                              </Box>
                            ) : null;
                          })()}
                          <Typography
                            sx={{
                              fontSize: 10,
                              color: C.muted,
                              mt: 1.25,
                              fontStyle: "italic",
                            }}
                          >
                            Median derived from Kalshi binary market mid-prices
                            (threshold where yes probability ≈ 50%). Not
                            investment advice. Source: Kalshi.com
                          </Typography>
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
                            title="Driver Correlation with Appreciation"
                            sub="Correlation of each metric with annual HPA · selected period"
                          />
                          <Box sx={{ overflowX: "auto" }}>
                            <table
                              style={{
                                width: "100%",
                                borderCollapse: "collapse",
                                fontSize: 12,
                              }}
                            >
                              <thead>
                                <tr>
                                  {[
                                    "Variable",
                                    "Signal",
                                    "Correlation",
                                    "Interpretation",
                                  ].map((h) => (
                                    <th
                                      key={h}
                                      style={{
                                        padding: "6px 10px",
                                        textAlign: "left",
                                        color: C.muted,
                                        fontWeight: 700,
                                        fontSize: 10,
                                        textTransform: "uppercase",
                                        letterSpacing: "0.07em",
                                        borderBottom: `1px solid ${C.border}`,
                                        whiteSpace: "nowrap",
                                      }}
                                    >
                                      {h}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {[...driverCorrelations]
                                  .sort((a, b) => {
                                    if (b.signal !== a.signal)
                                      return b.signal - a.signal;
                                    if (a.signal === -1)
                                      return Math.abs(a.r) - Math.abs(b.r);
                                    return Math.abs(b.r) - Math.abs(a.r);
                                  })
                                  .map(({ label, r, interp, signal }, i) => {
                                    const absR = Math.abs(r);
                                    const rColor =
                                      r >= 0 ? C.greenLight : "#e57373";
                                    // Signal strength folds in correlation magnitude:
                                    // strong = |r| ≥ 0.6, so "Strong Headwind" means both direction AND high predictive weight
                                    const isStrong = absR >= 0.6;
                                    const sigColor =
                                      signal > 0
                                        ? C.greenLight
                                        : signal < 0
                                          ? "#e57373"
                                          : C.muted;
                                    const sigLabel =
                                      signal === 0
                                        ? "Neutral"
                                        : signal > 0
                                          ? isStrong
                                            ? "Strong Tailwind"
                                            : "Tailwind"
                                          : isStrong
                                            ? "Strong Headwind"
                                            : "Headwind";
                                    const sigIcon =
                                      signal > 0 ? "▲" : signal < 0 ? "▼" : "—";
                                    return (
                                      <tr
                                        key={label}
                                        style={{
                                          background:
                                            i % 2 === 0 ? "transparent" : C.bg,
                                        }}
                                      >
                                        <td
                                          style={{
                                            padding: "7px 10px",
                                            color: C.charcoal,
                                            fontWeight: 600,
                                            whiteSpace: "nowrap",
                                          }}
                                        >
                                          {label}
                                        </td>
                                        <td
                                          style={{
                                            padding: "7px 10px",
                                            whiteSpace: "nowrap",
                                          }}
                                        >
                                          <span
                                            style={{
                                              display: "inline-flex",
                                              alignItems: "center",
                                              gap: 4,
                                              fontSize: 11,
                                              fontWeight: 700,
                                              color: sigColor,
                                              background: sigColor + "18",
                                              border: `1px solid ${sigColor}44`,
                                              borderRadius: 4,
                                              padding: "2px 7px",
                                            }}
                                          >
                                            <span style={{ fontSize: 9 }}>
                                              {sigIcon}
                                            </span>
                                            {sigLabel}
                                          </span>
                                        </td>
                                        <td
                                          style={{
                                            padding: "7px 10px",
                                            whiteSpace: "nowrap",
                                            fontVariantNumeric: "tabular-nums",
                                          }}
                                        >
                                          <span
                                            style={{
                                              color: rColor,
                                              fontWeight: 700,
                                            }}
                                          >
                                            {r > 0 ? "+" : ""}
                                            {r.toFixed(2)}
                                          </span>
                                        </td>
                                        <td
                                          style={{
                                            padding: "7px 10px",
                                            color: C.muted,
                                            lineHeight: 1.4,
                                          }}
                                        >
                                          {interp}
                                        </td>
                                      </tr>
                                    );
                                  })}
                              </tbody>
                            </table>
                          </Box>
                        </CardContent>
                      </Card>
                    </Box>
                  )}

                  {/* ── Ground Score Data ── */}
                  {chartPane === "neopoli" && (
                    <Box
                      sx={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                      }}
                    >
                      {/* Loading state */}
                      {groundScoreLoading && (
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 2,
                            pt: 6,
                          }}
                        >
                          <l-helix
                            size="60"
                            speed="2.5"
                            color={C.navy}
                          ></l-helix>
                          <Typography
                            sx={{
                              fontSize: 9,
                              fontWeight: 600,
                              color: C.muted,
                              letterSpacing: "0.08em",
                              textTransform: "uppercase",
                            }}
                          >
                            Loading Ground Score Intelligence
                          </Typography>
                        </Box>
                      )}

                      {/* Market Summary */}
                      {groundScoreData &&
                        (() => {
                          const m =
                            groundScoreData.activation.find(
                              (x) => x.fips === neopoliMarket,
                            ) || groundScoreData.activation[0];
                          if (!m) return null;
                          const tierMeta =
                            NEOPOLI_TIER_META[m.tier] ||
                            NEOPOLI_TIER_META.watchlist;
                          const dimScores = NEOPOLI_DIMS.map((d) => ({
                            label: d.label,
                            score: m.dims[d.id] ?? 0,
                            weight: d.weight,
                          }));
                          const sorted = [...dimScores].sort(
                            (a, b) => b.score - a.score,
                          );
                          const top3 = sorted.slice(0, 3);
                          const bot3 = sorted.slice(-3).reverse();
                          const strongCount = dimScores.filter(
                            (d) => d.score >= 70,
                          ).length;
                          const weakCount = dimScores.filter(
                            (d) => d.score < 40,
                          ).length;
                          const topStr = top3
                            .map((d) => `${d.label} (${d.score.toFixed(0)})`)
                            .join(", ");
                          const botStr = bot3
                            .filter((d) => d.score < 55)
                            .map((d) => `${d.label} (${d.score.toFixed(0)})`)
                            .join(", ");
                          return (
                            <Card
                              elevation={0}
                              sx={{
                                border: `1px solid ${C.navy}`,
                                borderRadius: 1,
                                overflow: "hidden",
                              }}
                            >
                              <Box
                                sx={{
                                  background: C.navy,
                                  px: 2,
                                  py: 1.25,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  flexWrap: "wrap",
                                  gap: 1,
                                }}
                              >
                                <Box>
                                  <Typography
                                    sx={{
                                      fontSize: 11,
                                      fontWeight: 800,
                                      color: C.white,
                                      textTransform: "uppercase",
                                      letterSpacing: "0.09em",
                                    }}
                                  >
                                    {m.name}, {m.state} · Market Summary
                                  </Typography>
                                  <Typography
                                    sx={{
                                      fontSize: 10,
                                      color: "rgba(255,255,255,0.6)",
                                      mt: 0.25,
                                    }}
                                  >
                                    rank #{m.rank} of{" "}
                                    {groundScoreData.activation.length.toLocaleString()}{" "}
                                    · composite {m.composite.toFixed(1)}
                                  </Typography>
                                </Box>
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1,
                                  }}
                                >
                                  <span
                                    style={{
                                      fontSize: 10,
                                      fontWeight: 700,
                                      color: C.navy,
                                      background: C.white,
                                      border: `1px solid ${C.white}`,
                                      borderRadius: 4,
                                      padding: "3px 10px",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {tierMeta.label}
                                  </span>
                                  {!deepDives[`activation:${m.fips}`] && (
                                    <button
                                      onClick={() =>
                                        requestDeepDive(m, "activation")
                                      }
                                      disabled={
                                        deepDiveLoading ===
                                        `activation:${m.fips}`
                                      }
                                      style={{
                                        fontSize: 10,
                                        fontWeight: 700,
                                        color: C.white,
                                        background: "rgba(255,255,255,0.15)",
                                        border:
                                          "1px solid rgba(255,255,255,0.4)",
                                        borderRadius: 4,
                                        padding: "3px 10px",
                                        cursor: "pointer",
                                        whiteSpace: "nowrap",
                                      }}
                                    >
                                      {deepDiveLoading ===
                                      `activation:${m.fips}`
                                        ? "Generating…"
                                        : "Deep Dive"}
                                    </button>
                                  )}
                                </Box>
                              </Box>
                              <CardContent sx={{ pb: "12px !important" }}>
                                {(() => {
                                  const kalshiMtg = kalshiData?.series?.KXMORTGAGERATE?.markets?.length > 0
                                    ? kalshiMedian(kalshiData.series.KXMORTGAGERATE.markets)?.value ?? null
                                    : null;
                                  const hpa = _hpaOutlook(m.metrics, kalshiMtg);
                                  if (!hpa) return null;
                                  return (
                                    <Box sx={{ mb: 1.5, pb: 1.5, borderBottom: `1px solid ${C.border}` }}>
                                      <Typography sx={{ fontSize: 9, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.07em", mb: 0.75 }}>
                                        HPA Outlook · 5-signal composite
                                      </Typography>
                                      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                                        <Box sx={{ flex: "0 0 100px", minWidth: 95, border: `1px solid ${hpa.color}44`, borderRadius: 1, p: 1, background: hpa.color + "18" }}>
                                          <Typography sx={{ fontSize: 9, color: C.muted, fontWeight: 600, mb: 0.25 }}>Implied YoY Range</Typography>
                                          <Typography sx={{ fontSize: 16, fontWeight: 700, color: hpa.color, lineHeight: 1.1 }}>
                                            {hpa.hpaLow >= 0 ? "+" : ""}{hpa.hpaLow}-{hpa.hpaHigh}%
                                          </Typography>
                                          <Typography sx={{ fontSize: 9, color: C.muted }}>avg HPA/yr</Typography>
                                          <Typography sx={{ fontSize: 9, fontWeight: 700, color: hpa.color, mt: 0.25 }}>{hpa.label}</Typography>
                                        </Box>
                                        {hpa.drivers.map((d) => {
                                          const dc = d.score >= 0.6 ? C.greenLight : d.score >= 0.35 ? "#f0a500" : "#e57373";
                                          return (
                                            <Box key={d.key} sx={{ flex: "1 1 90px", minWidth: 85, border: `1px solid ${dc}44`, borderRadius: 1, p: 1, background: dc + "0d" }}>
                                              <Typography sx={{ fontSize: 9, color: C.muted, fontWeight: 600, mb: 0.25 }}>{d.label}</Typography>
                                              <Typography sx={{ fontSize: 13, fontWeight: 700, color: dc, lineHeight: 1.1 }}>
                                                {d.value ?? "—"}
                                              </Typography>
                                              <Typography sx={{ fontSize: 8, color: C.muted, mt: 0.25, lineHeight: 1.4 }}>{d.detail}</Typography>
                                            </Box>
                                          );
                                        })}
                                      </Box>
                                    </Box>
                                  );
                                })()}
                                {deepDives[`activation:${m.fips}`] ? (
                                  <Box sx={{ mb: 1.5 }}>
                                    {renderDeepDive(
                                      deepDives[`activation:${m.fips}`],
                                    )}
                                  </Box>
                                ) : (
                                  <Typography
                                    sx={{
                                      fontSize: 12,
                                      color: C.charcoal,
                                      lineHeight: 1.7,
                                      mb: 1.5,
                                    }}
                                  >
                                    {m.summary}
                                  </Typography>
                                )}
                                {(() => {
                                  const selCity =
                                    m.cities?.find(
                                      (c) => c.place_fips === selectedCityFips,
                                    ) ||
                                    onDemandCities[selectedCityFips] ||
                                    m.cities?.[0];
                                  if (!selCity) return null;
                                  const met = selCity.metrics || {};
                                  const statRows = [
                                    [
                                      "Ground Score",
                                      selCity.composite != null
                                        ? selCity.composite.toFixed(1)
                                        : null,
                                    ],
                                    [
                                      "Median HHI",
                                      met.median_hhi
                                        ? `$${Math.round(met.median_hhi).toLocaleString()}`
                                        : null,
                                    ],
                                    [
                                      "Home Value",
                                      met.zhvi_latest
                                        ? `$${Math.round(met.zhvi_latest).toLocaleString()}`
                                        : null,
                                    ],
                                    [
                                      "1yr HPA",
                                      met.zhvi_growth_1yr != null
                                        ? `${(met.zhvi_growth_1yr * 100).toFixed(1)}%`
                                        : null,
                                    ],
                                    [
                                      "Unemployment",
                                      met.unemployment_rate != null
                                        ? `${met.unemployment_rate.toFixed(1)}%`
                                        : null,
                                    ],
                                    [
                                      "Poverty Rate",
                                      met.poverty_rate != null
                                        ? `${met.poverty_rate.toFixed(1)}%`
                                        : null,
                                    ],
                                    [
                                      "Vacancy Rate",
                                      met.vacancy_rate != null
                                        ? `${met.vacancy_rate.toFixed(1)}%`
                                        : null,
                                    ],
                                    [
                                      "Drive to Metro",
                                      met.drive_min_nearest_metro != null
                                        ? `${Math.round(met.drive_min_nearest_metro)} min`
                                        : null,
                                    ],
                                  ].filter(([, v]) => v != null);
                                  const snapshotBlock = (
                                    <Box
                                      sx={{
                                        pt: 1,
                                        borderTop: `1px solid ${C.border}`,
                                      }}
                                    >
                                      <Typography
                                        sx={{
                                          fontSize: 9,
                                          fontWeight: 700,
                                          color: C.navy,
                                          textTransform: "uppercase",
                                          letterSpacing: "0.07em",
                                          mb: 0.75,
                                        }}
                                      >
                                        {selCity.name} · City Snapshot
                                      </Typography>
                                      <Box
                                        sx={{
                                          display: "flex",
                                          flexWrap: "wrap",
                                          gap: "6px 16px",
                                          mb: 1,
                                        }}
                                      >
                                        {statRows.map(([k, v]) => (
                                          <Box key={k}>
                                            <Typography
                                              sx={{
                                                fontSize: 9,
                                                color: C.muted,
                                                textTransform: "uppercase",
                                                letterSpacing: "0.06em",
                                                lineHeight: 1.2,
                                              }}
                                            >
                                              {k}
                                            </Typography>
                                            <Typography
                                              sx={{
                                                fontSize: 12,
                                                fontWeight: 700,
                                                color: C.charcoal,
                                              }}
                                            >
                                              {v}
                                            </Typography>
                                          </Box>
                                        ))}
                                      </Box>
                                      <Box
                                        sx={{
                                          display: "flex",
                                          flexWrap: "wrap",
                                          gap: "4px 10px",
                                        }}
                                      >
                                        {Object.entries(selCity.dims || {}).map(
                                          ([dimId, score]) => {
                                            const col =
                                              score >= 66
                                                ? C.greenLight
                                                : score >= 33
                                                  ? C.blue
                                                  : C.muted;
                                            return (
                                              <Box
                                                key={dimId}
                                                sx={{
                                                  flex: "1 1 110px",
                                                  minWidth: 0,
                                                }}
                                              >
                                                <Box
                                                  sx={{
                                                    display: "flex",
                                                    justifyContent:
                                                      "space-between",
                                                    mb: "2px",
                                                  }}
                                                >
                                                  <span
                                                    style={{
                                                      fontSize: 9,
                                                      color: C.muted,
                                                    }}
                                                  >
                                                    {dimId.replace(/_/g, " ")}
                                                  </span>
                                                  <span
                                                    style={{
                                                      fontSize: 9,
                                                      fontWeight: 700,
                                                      color: col,
                                                    }}
                                                  >
                                                    {score?.toFixed(0)}
                                                  </span>
                                                </Box>
                                                <Box
                                                  sx={{
                                                    height: 3,
                                                    background: C.border,
                                                    borderRadius: 2,
                                                  }}
                                                >
                                                  <Box
                                                    sx={{
                                                      width: `${score}%`,
                                                      height: "100%",
                                                      background: col,
                                                      borderRadius: 2,
                                                    }}
                                                  />
                                                </Box>
                                              </Box>
                                            );
                                          },
                                        )}
                                      </Box>
                                    </Box>
                                  );
                                  return (
                                    <Box
                                      sx={{
                                        mt: "40px",
                                        mb: "20px",
                                        p: 1.25,
                                        background: C.bg,
                                        borderRadius: 1,
                                        borderLeft: `3px solid ${selCity.summary ? C.greenLight : C.orange}`,
                                      }}
                                    >
                                      {selCity.summary && (
                                        <>
                                          <Typography
                                            sx={{
                                              fontSize: 10,
                                              fontWeight: 700,
                                              color: C.greenLight,
                                              textTransform: "uppercase",
                                              letterSpacing: "0.07em",
                                              mb: 0.4,
                                            }}
                                          >
                                            {selCity.name} · City Spotlight
                                          </Typography>
                                          <Typography
                                            sx={{
                                              fontSize: 11,
                                              color: C.charcoal,
                                              lineHeight: 1.65,
                                            }}
                                          >
                                            {selCity.summary}
                                          </Typography>
                                        </>
                                      )}
                                      {snapshotBlock}
                                    </Box>
                                  );
                                })()}
                                {/* ── American Pledge Impact Card — Activation ── */}
                                {groundScoreData &&
                                  (() => {
                                    const apM = groundScoreData.activation.find((x) => x.fips === neopoliMarket) || groundScoreData.activation[0];
                                    const zhvi = apM?.metrics?.zhvi_latest || m.cities?.[0]?.metrics?.zhvi_latest;
                                    const hhi  = apM?.metrics?.median_hhi  || m.cities?.[0]?.metrics?.median_hhi;
                                    if (!zhvi || !hhi) return (
                                      <Box sx={{ mt: 1.5, p: 1.5, border: `1px solid ${C.border}`, borderRadius: 1, background: C.bg }}>
                                        <Typography sx={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", mb: 0.5 }}>American Pledge · Market Impact Analysis</Typography>
                                        <Typography sx={{ fontSize: 11, color: C.muted }}>Insufficient housing data to calculate loan comparisons for this area.</Typography>
                                      </Box>
                                    );
                                    const stdPI      = _monthlyMortgage(zhvi, 0.03);
                                    const stdPMI     = _monthlyPMI(zhvi, 0.03);
                                    const stdPayment = stdPI + stdPMI;
                                    const apPayment  = _monthlyMortgage(zhvi, 0.20);
                                    const stdDTI     = _housingDTI(zhvi, hhi, 0.03);
                                    const apDTI      = _housingDTI(zhvi, hhi, 0.20);
                                    const stdPool    = _buyerPoolPct(zhvi, hhi, 0.03);
                                    const apPool     = _buyerPoolPct(zhvi, hhi, 0.20);
                                    const lift       = apPool - stdPool;
                                    const totalSavings = stdPayment - apPayment;
                                    const pmiSavings = stdPMI;
                                    const dpReach    = _downPaymentReachPct(zhvi, 0.03, hhi, 3, 0.10);
                                    const estHH      = Math.round((apM.population || 0) / 2.53);
                                    const unlockedHH = Math.round((lift / 100) * estHH);
                                    const fmtHH = (n) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n.toLocaleString();
                                    const countyLabel = apM.name.replace(/\s+County$/i, "");
                                    return (
                                      <Box sx={{ mt: 1.5 }}>
                                          <Box sx={{ display: "flex", gap: 1.5, mb: 2, flexWrap: "wrap" }}>
                                            {/* Standard */}
                                            <Box sx={{ flex: "1 1 140px", border: `1px solid ${C.border}`, borderRadius: 1, p: 1.5, background: C.bg }}>
                                              <Typography sx={{ fontSize: 9, fontWeight: 800, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", mb: 0.75 }}>Standard · 3% Down (Fannie/Freddie)</Typography>
                                              <Typography sx={{ fontSize: 26, fontWeight: 800, color: C.charcoal, lineHeight: 1 }}>${Math.round(stdPayment).toLocaleString()}</Typography>
                                              <Typography sx={{ fontSize: 10, color: C.muted, mb: 0.75 }}>P&amp;I: ${Math.round(stdPI).toLocaleString()} + ${Math.round(stdPMI).toLocaleString()} PMI</Typography>
                                              <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.5, mb: 0.25 }}>
                                                <Typography sx={{ fontSize: 13, fontWeight: 800, color: C.charcoal }}>{stdDTI.toFixed(1)}%</Typography>
                                                <Typography sx={{ fontSize: 10, color: C.muted }}>housing DTI</Typography>
                                              </Box>
                                              <Typography sx={{ fontSize: 10, color: C.muted, mb: 0.75 }}>~{stdPool.toFixed(0)}% can qualify</Typography>
                                              {(() => {
                                                const req = Math.round((stdPayment / 0.43) * 12);
                                                const delta = req - hhi;
                                                const absFmt = `$${Math.round(Math.abs(delta) / 1000).toLocaleString()}k`;
                                                return (
                                                  <Box sx={{ pt: 0.75, borderTop: `1px solid ${C.border}` }}>
                                                    <Typography sx={{ fontSize: 9, fontWeight: 800, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", mb: 0.25 }}>Min. Income to Qualify</Typography>
                                                    <Typography sx={{ fontSize: 16, fontWeight: 800, color: C.charcoal, lineHeight: 1, mb: 0.25 }}>${Math.round(req / 1000).toLocaleString()}k/yr</Typography>
                                                    <Typography sx={{ fontSize: 10, fontWeight: 700, color: delta > 0 ? "#ef4444" : C.green }}>
                                                      {delta > 0 ? `▲ ${absFmt} above median` : `▼ ${absFmt} below median`}
                                                    </Typography>
                                                  </Box>
                                                );
                                              })()}
                                              {dpReach != null && <Typography sx={{ fontSize: 10, color: "#f59e0b", fontWeight: 600, mt: 0.75 }}>~{dpReach.toFixed(0)}% can save 3% down in 3 yrs</Typography>}
                                            </Box>
                                            {/* American Pledge */}
                                            <Box sx={{ flex: "1 1 140px", border: `2px solid ${C.navy}`, borderRadius: 1, p: 1.5, background: C.navy, position: "relative" }}>
                                              <Typography sx={{ fontSize: 9, fontWeight: 800, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.08em", mb: 0.75 }}>American Pledge · 20% Down</Typography>
                                              <Box sx={{ display: "flex", alignItems: "flex-start", gap: "24px", mb: 0 }}>
                                                <Typography sx={{ fontSize: 26, fontWeight: 800, color: C.white, lineHeight: 1 }}>${Math.round(apPayment).toLocaleString()}</Typography>
                                                <Box sx={{ pt: 0.25 }}>
                                                  <Typography sx={{ fontSize: 10, color: "#7ee8a2", fontWeight: 700, lineHeight: 1.3 }}>saves ${Math.round(totalSavings).toLocaleString()}/mo</Typography>
                                                  <Typography sx={{ fontSize: 9, color: "rgba(255,255,255,0.45)", lineHeight: 1.3 }}>${Math.round(pmiSavings).toLocaleString()} PMI eliminated</Typography>
                                                </Box>
                                              </Box>
                                              <Typography sx={{ fontSize: 10, color: "rgba(255,255,255,0.6)", mb: 0.75 }}>P&amp;I: ${Math.round(apPayment).toLocaleString()} + no PMI</Typography>
                                              <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.5, mb: 0.25 }}>
                                                <Typography sx={{ fontSize: 13, fontWeight: 800, color: C.white }}>{apDTI.toFixed(1)}%</Typography>
                                                <Typography sx={{ fontSize: 10, color: "rgba(255,255,255,0.6)" }}>housing DTI</Typography>
                                              </Box>
                                              <Typography sx={{ fontSize: 10, color: "rgba(255,255,255,0.75)", mb: 0.75 }}>~{apPool.toFixed(0)}% of households qualify</Typography>
                                              {(() => {
                                                const req = Math.round((apPayment / 0.43) * 12);
                                                const delta = req - hhi;
                                                const absFmt = `$${Math.round(Math.abs(delta) / 1000).toLocaleString()}k`;
                                                return (
                                                  <Box sx={{ pt: 0.75, borderTop: `1px solid rgba(255,255,255,0.15)` }}>
                                                    <Typography sx={{ fontSize: 9, fontWeight: 800, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em", mb: 0.25 }}>Min. Income to Qualify</Typography>
                                                    <Typography sx={{ fontSize: 16, fontWeight: 800, color: C.white, lineHeight: 1, mb: 0.25 }}>${Math.round(req / 1000).toLocaleString()}k/yr</Typography>
                                                    <Typography sx={{ fontSize: 10, fontWeight: 700, color: delta > 0 ? "#fca5a5" : "#7ee8a2" }}>
                                                      {delta > 0 ? `▲ ${absFmt} above median` : `▼ ${absFmt} below median`}
                                                    </Typography>
                                                  </Box>
                                                );
                                              })()}
                                              <img src="/ampledge_white.svg" alt="" style={{ position: "absolute", bottom: 8, right: 8, width: 18, height: 18, objectFit: "contain", opacity: 1 }} />
                                            </Box>
                                            {/* Buyer Affordability Lift */}
                                            <Box sx={{ flex: "1 1 100px", border: `1px solid ${C.greenLight}55`, borderRadius: 1, p: 1.5, background: C.greenLight + "12", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                                              <Typography sx={{ fontSize: 9, fontWeight: 800, color: C.green, textTransform: "uppercase", letterSpacing: "0.08em", mb: 0.5 }}>Buyer Affordability Lift</Typography>
                                              <Typography sx={{ fontSize: 34, fontWeight: 800, color: C.greenLight, lineHeight: 1 }}>+{lift.toFixed(0)}</Typography>
                                              <Typography sx={{ fontSize: 10, color: C.green, fontWeight: 600, mb: 1 }}>pts buyer pool</Typography>
                                              {unlockedHH > 0 && <>
                                                <Typography sx={{ fontSize: 22, fontWeight: 800, color: C.charcoal, lineHeight: 1 }}>~{fmtHH(unlockedHH)}</Typography>
                                                <Typography sx={{ fontSize: 10, color: C.muted, mt: 0.25 }}>additional qualifying HH</Typography>
                                              </>}
                                            </Box>
                                          </Box>
                                          {/* Buyer pool bars */}
                                          <Box sx={{ mb: 2 }}>
                                            <Typography sx={{ fontSize: 9, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", mb: 1.25 }}>Qualifying Buyer Pool</Typography>
                                            {[{ label: "Standard (3% down + PMI)", val: stdPool, color: C.muted, bar: "#b0b8c4" }, { label: "American Pledge (20% down, no PMI)", val: apPool, color: C.navy, bar: C.navy }].map(({ label, val, color, bar }) => (
                                              <Box key={label} sx={{ mb: 1 }}>
                                                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", mb: 0.4 }}>
                                                  <span style={{ fontSize: 10, color: C.charcoal, fontWeight: 600 }}>{label}</span>
                                                  <span style={{ fontSize: 11, fontWeight: 700, color }}>{val.toFixed(0)}%</span>
                                                </Box>
                                                <Box sx={{ height: 10, background: C.border, borderRadius: 2 }}>
                                                  <Box sx={{ width: `${val}%`, height: "100%", background: bar, borderRadius: 2, transition: "width 0.6s cubic-bezier(0.4,0,0.2,1)" }} />
                                                </Box>
                                              </Box>
                                            ))}
                                          </Box>
                                          {/* Headline + explanation */}
                                          <Box sx={{ borderTop: `1px solid ${C.border}`, pt: 1.25 }}>
                                            {unlockedHH > 0 && <Typography sx={{ fontSize: 11, fontWeight: 700, color: C.navy, mb: 0.75 }}>American Pledge unlocks ~{fmtHH(unlockedHH)} additional qualifying households in {countyLabel} County ({lift.toFixed(0)} pt buyer pool lift × ~{fmtHH(estHH)} est. households)</Typography>}
                                            <Box sx={{ background: "rgba(39,174,96,0.07)", border: "1px solid rgba(39,174,96,0.333)", borderRadius: 1, p: 1.5, mb: 1.25 }}>
                                              <Typography sx={{ fontSize: 10, fontWeight: 800, color: "rgb(26,122,74)", textTransform: "uppercase", letterSpacing: "0.08em", mb: 0.75 }}>What This Means</Typography>
                                              <Typography sx={{ fontSize: 11, color: "rgb(26,122,74)", lineHeight: 1.75 }}>
                                                {dpReach != null ? `~${dpReach.toFixed(0)}% of ${countyLabel} households could save the 3% down payment in three years — so the down payment itself is not the primary barrier. The real constraint is monthly cash flow: standard financing at 3% down + PMI requires $${Math.round(stdPayment).toLocaleString()}/mo (${stdDTI.toFixed(1)}% DTI), leaving only ~${stdPool.toFixed(0)}% of households able to qualify at the median home price.` : `Standard financing at 3% down + PMI requires $${Math.round(stdPayment).toLocaleString()}/mo (${stdDTI.toFixed(1)}% DTI), leaving only ~${stdPool.toFixed(0)}% of households able to qualify at the median home price.`}
                                              </Typography>
                                              <Typography sx={{ fontSize: 11, color: "rgb(26,122,74)", lineHeight: 1.75, mt: 1 }}>
                                                {`American Pledge removes both cost drivers at once: the 20% down payment shrinks the loan balance, cutting P&I by $${Math.round(totalSavings - pmiSavings).toLocaleString()}/mo, and eliminates PMI entirely (saving $${Math.round(pmiSavings).toLocaleString()}/mo). The combined $${Math.round(totalSavings).toLocaleString()}/mo reduction brings DTI from ${stdDTI.toFixed(1)}% down to ${apDTI.toFixed(1)}%, expanding the qualifying buyer pool from ~${stdPool.toFixed(0)}% to ~${apPool.toFixed(0)}% of ${countyLabel} households — directly solving the cash flow constraint that standard financing cannot address.`}
                                              </Typography>
                                              <Typography sx={{ fontSize: 11, color: "rgba(26,122,74,0.7)", lineHeight: 1.75, mt: 1 }}>
                                                Housing DTI is the share of a household's gross monthly income consumed by the mortgage payment. Lenders use 43% as the qualification ceiling — households above that threshold cannot obtain financing regardless of savings or credit.
                                              </Typography>
                                            </Box>
                                            <Typography sx={{ fontSize: 9, color: C.muted, mb: 1.5 }}>Housing DTI = monthly mortgage payment ÷ gross monthly income · Standard = 3% down (Fannie/Freddie min) + PMI at ~1.1%/yr · AP = 20% down, no PMI · 7% rate · 30-yr fixed · 43% DTI qualification ceiling · Down payment reach = % earning enough to save 3% down in 3 yrs at 10% savings rate · log-normal income dist. (σ=0.85) · ACS 2022 median HHI · ZHVI</Typography>
                                          </Box>
                                      </Box>
                                    );
                                  })()}
                                <Box
                                  sx={{
                                    pt: 1.25,
                                    borderTop: `1px solid ${C.border}`,
                                  }}
                                >
                                  <Typography
                                    sx={{
                                      fontSize: 11,
                                      color: C.muted,
                                      lineHeight: 1.65,
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontWeight: 700,
                                        color: C.charcoal,
                                      }}
                                    >
                                      Score Drivers —{" "}
                                    </span>
                                    {strongCount} of 12 dimensions score above
                                    70. Leading signals are{" "}
                                    <span
                                      style={{
                                        fontWeight: 600,
                                        color: C.charcoal,
                                      }}
                                    >
                                      {topStr}
                                    </span>
                                    .{" "}
                                    {weakCount > 0 ? (
                                      <>
                                        Primary drag:{" "}
                                        <span
                                          style={{
                                            fontWeight: 600,
                                            color: C.charcoal,
                                          }}
                                        >
                                          {botStr}
                                        </span>
                                        .
                                      </>
                                    ) : (
                                      <>No dimension below 40.</>
                                    )}
                                  </Typography>
                                </Box>
                              </CardContent>
                            </Card>
                          );
                        })()}

                      {/* ── Activation City Rankings ── */}
                      {groundScoreData &&
                        (() => {
                          const m =
                            groundScoreData.activation.find(
                              (x) => x.fips === neopoliMarket,
                            ) || groundScoreData.activation[0];
                          const preCities = m?.cities || [];
                          const demandForCounty = Object.values(
                            onDemandCities,
                          ).filter((c) => c.county_fips === m?.fips);
                          const preFipsSet = new Set(
                            preCities.map((c) => c.place_fips),
                          );
                          const demandSorted = demandForCounty
                            .filter((c) => !preFipsSet.has(c.place_fips))
                            .sort(
                              (a, b) => (b.composite || 0) - (a.composite || 0),
                            );
                          const cities = [...preCities, ...demandSorted].map(
                            (c, i) => ({ ...c, county_rank: i + 1 }),
                          );
                          if (!cities.length) return null;
                          const CITY_PAGE_SIZE = 5;
                          const totalCityPages = Math.ceil(
                            cities.length / CITY_PAGE_SIZE,
                          );
                          const selIdx = cities.findIndex(
                            (c) => c.place_fips === selectedCityFips,
                          );
                          const effectiveActPage =
                            selIdx >= 0
                              ? Math.floor(selIdx / CITY_PAGE_SIZE)
                              : Math.min(gsActCityPage, totalCityPages - 1);
                          const slice = cities.slice(
                            effectiveActPage * CITY_PAGE_SIZE,
                            (effectiveActPage + 1) * CITY_PAGE_SIZE,
                          );
                          const dimBar = (v, isSelected) => {
                            if (v == null)
                              return (
                                <span style={{ fontSize: 10, color: C.muted }}>
                                  —
                                </span>
                              );
                            const c =
                              v >= 66
                                ? C.greenLight
                                : v >= 33
                                  ? C.blue
                                  : C.muted;
                            const cSel =
                              v >= 66
                                ? "#2ecc71"
                                : v >= 33
                                  ? "#5dade2"
                                  : "#94a3b8";
                            const textColor = isSelected ? "#fff" : c;
                            const barColor = isSelected ? cSel : c;
                            return (
                              <Box sx={{ minWidth: 56 }}>
                                <Box
                                  sx={{
                                    height: 4,
                                    background: isSelected
                                      ? "rgba(255,255,255,0.12)"
                                      : C.border,
                                    borderRadius: 2,
                                    mb: "2px",
                                  }}
                                >
                                  <Box
                                    sx={{
                                      width: `${v}%`,
                                      height: "100%",
                                      background: barColor,
                                      borderRadius: 2,
                                    }}
                                  />
                                </Box>
                                <span
                                  style={{
                                    fontSize: 10,
                                    color: textColor,
                                    fontWeight: 600,
                                  }}
                                >
                                  {v.toFixed(0)}
                                </span>
                              </Box>
                            );
                          };
                          return (
                            <Card
                              elevation={0}
                              sx={{
                                border: `1px solid ${C.border}`,
                                borderRadius: 1,
                              }}
                            >
                              <CardContent sx={{ pb: "12px !important" }}>
                                <SectionHeader
                                  title="City Ground Score Rankings"
                                  sub={`${m.name}, ${m.state} · top cities by Activation composite · scored within county universe`}
                                />
                                <table
                                  style={{
                                    width: "100%",
                                    borderCollapse: "collapse",
                                    fontSize: 12,
                                  }}
                                >
                                  <thead>
                                    <tr>
                                      {[
                                        "#",
                                        "City",
                                        "Ground Score",
                                        "Entry Cost",
                                        "Distress",
                                        "Housing Supply",
                                        "Labor",
                                        "Metro Access",
                                      ].map((h) => (
                                        <th
                                          key={h}
                                          style={{
                                            padding: "5px 10px",
                                            textAlign: "left",
                                            color: C.muted,
                                            fontWeight: 700,
                                            fontSize: 10,
                                            textTransform: "uppercase",
                                            letterSpacing: "0.07em",
                                            borderBottom: `1px solid ${C.border}`,
                                            whiteSpace: "normal",
                                            verticalAlign: "bottom",
                                            lineHeight: 1.3,
                                          }}
                                        >
                                          {h}
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {slice.map((city, i) => {
                                      const isSel =
                                        selectedCityFips === city.place_fips;
                                      const color =
                                        city.composite >= 66
                                          ? C.greenLight
                                          : city.composite >= 33
                                            ? C.blue
                                            : C.muted;
                                      const colorSel =
                                        city.composite >= 66
                                          ? "#2ecc71"
                                          : city.composite >= 33
                                            ? "#5dade2"
                                            : "#94a3b8";
                                      const gsColor = isSel ? colorSel : color;
                                      const gsTextColor = isSel
                                        ? "#fff"
                                        : color;
                                      return (
                                        <tr
                                          key={city.place_fips}
                                          onClick={() =>
                                            selectCityManually(city.place_fips)
                                          }
                                          style={{
                                            background: isSel
                                              ? C.navy
                                              : i % 2 === 0
                                                ? "transparent"
                                                : C.bg,
                                            borderBottom: `1px solid ${C.border}`,
                                            cursor: "pointer",
                                          }}
                                        >
                                          <td
                                            style={{
                                              padding: "7px 10px",
                                              fontWeight: 700,
                                              color: isSel ? C.white : C.navy,
                                              fontSize: 11,
                                              minWidth: 24,
                                            }}
                                          >
                                            {city.county_rank}
                                          </td>
                                          <td
                                            style={{
                                              padding: "7px 10px",
                                              fontWeight: 600,
                                              color: isSel
                                                ? C.white
                                                : C.charcoal,
                                              whiteSpace: "nowrap",
                                            }}
                                          >
                                            {city.name}
                                          </td>
                                          <td style={{ padding: "7px 10px" }}>
                                            <Box
                                              sx={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 0.75,
                                                minWidth: 80,
                                              }}
                                            >
                                              <span
                                                style={{
                                                  fontWeight: 700,
                                                  color: gsTextColor,
                                                  fontSize: 11,
                                                  minWidth: 30,
                                                }}
                                              >
                                                {city.composite.toFixed(1)}
                                              </span>
                                              <Box
                                                sx={{
                                                  flex: 1,
                                                  height: 5,
                                                  background: isSel
                                                    ? "rgba(255,255,255,0.12)"
                                                    : C.border,
                                                  borderRadius: 3,
                                                  minWidth: 40,
                                                }}
                                              >
                                                <Box
                                                  sx={{
                                                    width: `${city.composite}%`,
                                                    height: "100%",
                                                    background: gsColor,
                                                    borderRadius: 3,
                                                  }}
                                                />
                                              </Box>
                                            </Box>
                                          </td>
                                          {[
                                            "entry_cost",
                                            "distress_depth",
                                            "housing_supply",
                                            "labor_participation",
                                            "metro_access",
                                          ].map((d) => (
                                            <td
                                              key={d}
                                              style={{ padding: "7px 10px" }}
                                            >
                                              {dimBar(city.dims?.[d], isSel)}
                                            </td>
                                          ))}
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    mt: 1.5,
                                    pt: 1,
                                    borderTop: `1px solid ${C.border}`,
                                  }}
                                >
                                  <Typography
                                    sx={{ fontSize: 10, color: C.muted }}
                                  >
                                    Page {effectiveActPage + 1} of{" "}
                                    {totalCityPages} · {cities.length} cities
                                  </Typography>
                                  <Box sx={{ display: "flex", gap: 0.75 }}>
                                    <button
                                      onClick={() => setGsActCityPage(0)}
                                      disabled={effectiveActPage === 0}
                                      style={{
                                        fontSize: 10,
                                        padding: "3px 8px",
                                        border: `1px solid ${C.border}`,
                                        borderRadius: 4,
                                        background: "transparent",
                                        color:
                                          effectiveActPage === 0
                                            ? C.border
                                            : C.muted,
                                        cursor:
                                          effectiveActPage === 0
                                            ? "default"
                                            : "pointer",
                                        fontFamily: "'Inter',sans-serif",
                                      }}
                                    >
                                      «
                                    </button>
                                    <button
                                      onClick={() =>
                                        setGsActCityPage((p) =>
                                          Math.max(0, p - 1),
                                        )
                                      }
                                      disabled={effectiveActPage === 0}
                                      style={{
                                        fontSize: 10,
                                        padding: "3px 8px",
                                        border: `1px solid ${C.border}`,
                                        borderRadius: 4,
                                        background: "transparent",
                                        color:
                                          effectiveActPage === 0
                                            ? C.border
                                            : C.muted,
                                        cursor:
                                          effectiveActPage === 0
                                            ? "default"
                                            : "pointer",
                                        fontFamily: "'Inter',sans-serif",
                                      }}
                                    >
                                      ‹ Prev
                                    </button>
                                    <button
                                      onClick={() =>
                                        setGsActCityPage((p) =>
                                          Math.min(totalCityPages - 1, p + 1),
                                        )
                                      }
                                      disabled={
                                        effectiveActPage >= totalCityPages - 1
                                      }
                                      style={{
                                        fontSize: 10,
                                        padding: "3px 8px",
                                        border: `1px solid ${C.border}`,
                                        borderRadius: 4,
                                        background: "transparent",
                                        color:
                                          effectiveActPage >= totalCityPages - 1
                                            ? C.border
                                            : C.muted,
                                        cursor:
                                          effectiveActPage >= totalCityPages - 1
                                            ? "default"
                                            : "pointer",
                                        fontFamily: "'Inter',sans-serif",
                                      }}
                                    >
                                      Next ›
                                    </button>
                                    <button
                                      onClick={() =>
                                        setGsActCityPage(totalCityPages - 1)
                                      }
                                      disabled={
                                        effectiveActPage >= totalCityPages - 1
                                      }
                                      style={{
                                        fontSize: 10,
                                        padding: "3px 8px",
                                        border: `1px solid ${C.border}`,
                                        borderRadius: 4,
                                        background: "transparent",
                                        color:
                                          effectiveActPage >= totalCityPages - 1
                                            ? C.border
                                            : C.muted,
                                        cursor:
                                          effectiveActPage >= totalCityPages - 1
                                            ? "default"
                                            : "pointer",
                                        fontFamily: "'Inter',sans-serif",
                                      }}
                                    >
                                      »
                                    </button>
                                  </Box>
                                </Box>
                              </CardContent>
                            </Card>
                          );
                        })()}

                      {/* Dimension Scorecard */}
                      {groundScoreData &&
                        (() => {
                          const m =
                            groundScoreData.activation.find(
                              (x) => x.fips === neopoliMarket,
                            ) || groundScoreData.activation[0];
                          if (!m) return null;
                          return (
                            <Card
                              elevation={0}
                              sx={{
                                border: `1px solid ${C.border}`,
                                borderRadius: 1,
                              }}
                            >
                              <CardContent>
                                <Box
                                  sx={{
                                    mb: 1.5,
                                    display: "flex",
                                    alignItems: "flex-start",
                                    justifyContent: "space-between",
                                    gap: 1,
                                  }}
                                >
                                  <SectionHeader
                                    title="Activation Dimensions"
                                    sub="12 weighted dimensions · scores 0–100"
                                  />
                                  <button
                                    onClick={() => setShowDimDesc((v) => !v)}
                                    style={{
                                      fontSize: 10,
                                      fontWeight: 600,
                                      fontFamily: "'Inter',sans-serif",
                                      padding: "3px 10px",
                                      border: `1px solid ${C.border}`,
                                      borderRadius: 4,
                                      background: showDimDesc
                                        ? C.navy
                                        : "transparent",
                                      color: showDimDesc ? C.white : C.muted,
                                      cursor: "pointer",
                                      whiteSpace: "nowrap",
                                      flexShrink: 0,
                                    }}
                                  >
                                    {showDimDesc
                                      ? "Hide descriptions"
                                      : "Show descriptions"}
                                  </button>
                                </Box>
                                <Box
                                  sx={{
                                    display: "flex",
                                    gap: 2,
                                    flexWrap: "wrap",
                                  }}
                                >
                                  {NEOPOLI_DIMS.map((dim) => {
                                    const score = m.dims[dim.id] ?? 0;
                                    const barColor =
                                      score >= 75
                                        ? C.greenLight
                                        : score >= 50
                                          ? C.blue
                                          : score >= 25
                                            ? C.orange
                                            : C.red;
                                    return (
                                      <Box
                                        key={dim.id}
                                        sx={{ flex: "1 1 200px", minWidth: 0 }}
                                      >
                                        <Box
                                          sx={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            mb: 0.25,
                                          }}
                                        >
                                          <span
                                            style={{
                                              fontSize: 10,
                                              fontWeight: 600,
                                              color: C.charcoal,
                                            }}
                                          >
                                            {dim.label}
                                          </span>
                                          <span
                                            style={{
                                              fontSize: 10,
                                              fontWeight: 700,
                                              color: barColor,
                                            }}
                                          >
                                            {score.toFixed(0)}
                                          </span>
                                        </Box>
                                        <Box
                                          sx={{
                                            height: 5,
                                            background: C.border,
                                            borderRadius: 3,
                                          }}
                                        >
                                          <Box
                                            sx={{
                                              width: `${score}%`,
                                              height: "100%",
                                              background: barColor,
                                              borderRadius: 3,
                                              transition:
                                                "width 0.5s cubic-bezier(0.4,0,0.2,1), background-color 0.3s ease",
                                            }}
                                          />
                                        </Box>
                                        <span
                                          style={{
                                            fontSize: 9,
                                            color: C.muted,
                                            display: "block",
                                            marginTop: 3,
                                          }}
                                        >
                                          <span style={{ fontWeight: 700 }}>
                                            wt {dim.weight}
                                          </span>
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

                      {/* ── Activation Supplemental Signals ── */}
                      {groundScoreData &&
                        (() => {
                          const m =
                            groundScoreData.activation.find(
                              (x) => x.fips === neopoliMarket,
                            ) || groundScoreData.activation[0];
                          if (!m?.metrics) return null;
                          const met = m.metrics;
                          const pop = m.population || 1;
                          const all = groundScoreData.activation;

                          const pctile = (key, lowerBetter = false) => {
                            const vals = all
                              .map((x) => x.metrics?.[key])
                              .filter((v) => v != null && !isNaN(v));
                            const val = met[key];
                            if (val == null || !vals.length) return null;
                            const below = vals.filter((v) =>
                              lowerBetter ? v > val : v < val,
                            ).length;
                            return Math.round((below / vals.length) * 100);
                          };
                          const sig = (pct) => {
                            if (pct == null)
                              return {
                                label: "No Data",
                                color: C.muted,
                                bg: C.bg,
                              };
                            if (pct >= 80)
                              return {
                                label: "Strong Tailwind",
                                color: C.greenLight,
                                bg: C.greenLight + "18",
                              };
                            if (pct >= 60)
                              return {
                                label: "Tailwind",
                                color: "#27ae60",
                                bg: "#27ae6018",
                              };
                            if (pct >= 40)
                              return {
                                label: "Neutral",
                                color: C.muted,
                                bg: C.border,
                              };
                            if (pct >= 20)
                              return {
                                label: "Headwind",
                                color: C.orange,
                                bg: C.orange + "18",
                              };
                            return {
                              label: "Strong Headwind",
                              color: C.red,
                              bg: C.red + "18",
                            };
                          };
                          const fmtDollar = (v) =>
                            v == null
                              ? "—"
                              : v >= 1e9
                                ? `$${(v / 1e9).toFixed(1)}B`
                                : v >= 1e6
                                  ? `$${(v / 1e6).toFixed(0)}M`
                                  : `$${Math.round(v).toLocaleString()}`;

                          const signals = [
                            {
                              pct: pctile("zhvi_latest", true),
                              metric: "Home Value (ZHVI)",
                              sub: `$${met.zhvi_latest ? Math.round(met.zhvi_latest).toLocaleString() : "—"} latest · national avg ~$350k`,
                              value: met.zhvi_latest
                                ? `$${Math.round(met.zhvi_latest / 1000)}k`
                                : "—",
                              interp:
                                met.zhvi_latest == null
                                  ? "No data."
                                  : met.zhvi_latest < 150000
                                    ? "Well below national avg — deep value basis, strong entry cost advantage for acquisition."
                                    : met.zhvi_latest < 250000
                                      ? "Below national avg — favorable entry cost for Activation thesis."
                                      : met.zhvi_latest < 350000
                                        ? "At or near national avg — standard entry cost environment."
                                        : "Above national avg — higher basis compresses relative upside.",
                            },
                            {
                              pct: pctile("zhvi_growth_1yr", false),
                              metric: "1-Yr Appreciation",
                              sub: "Zillow ZHVI YoY · tests post-hike demand durability",
                              value:
                                met.zhvi_growth_1yr != null
                                  ? `${met.zhvi_growth_1yr >= 0 ? "+" : ""}${(met.zhvi_growth_1yr * 100).toFixed(1)}%`
                                  : "—",
                              interp:
                                met.zhvi_growth_1yr == null
                                  ? "No data."
                                  : met.zhvi_growth_1yr > 0.1
                                    ? "Strong appreciation — durable demand confirmed post rate-hike cycle."
                                    : met.zhvi_growth_1yr > 0.04
                                      ? "Moderate appreciation — holding above national floor."
                                      : met.zhvi_growth_1yr > 0
                                        ? "Slow appreciation — demand present but limited momentum."
                                        : "Negative — market facing active demand headwind.",
                            },
                            {
                              pct: pctile("unemployment_rate", false),
                              metric: "Unemployment Rate",
                              sub: "Census ACS 2022 · civilian unemployment rate",
                              value:
                                met.unemployment_rate != null
                                  ? `${met.unemployment_rate.toFixed(1)}%`
                                  : "—",
                              interp:
                                met.unemployment_rate == null
                                  ? "No data."
                                  : met.unemployment_rate > 8
                                    ? "High unemployment — deep distress signal; large labor reserve available for employer catalyst."
                                    : met.unemployment_rate > 5
                                      ? "Above-average unemployment — meaningful slack in labor market, supports activation thesis."
                                      : met.unemployment_rate > 3.5
                                        ? "Moderate unemployment — some labor slack present."
                                        : "Low unemployment — tight labor market; limited workforce availability headwind.",
                            },
                            {
                              pct: pctile("poverty_rate", false),
                              metric: "Poverty Rate",
                              sub: "Census ACS 2022 · % population below poverty line",
                              value:
                                met.poverty_rate != null
                                  ? `${met.poverty_rate.toFixed(1)}%`
                                  : "—",
                              interp:
                                met.poverty_rate == null
                                  ? "No data."
                                  : met.poverty_rate > 20
                                    ? "High poverty — significant economic distress; strong basis for below-market acquisition and community reinvestment thesis."
                                    : met.poverty_rate > 14
                                      ? "Above-average poverty — meaningful distress depth, consistent with activation market profile."
                                      : met.poverty_rate > 8
                                        ? "Moderate poverty — some distress present."
                                        : "Low poverty — limited distress signal; may reduce activation upside.",
                            },
                            {
                              pct: pctile("vacancy_rate", false),
                              metric: "Housing Vacancy Rate",
                              sub: "Census ACS 2022 · % housing units vacant",
                              value:
                                met.vacancy_rate != null
                                  ? `${met.vacancy_rate.toFixed(1)}%`
                                  : "—",
                              interp:
                                met.vacancy_rate == null
                                  ? "No data."
                                  : met.vacancy_rate > 15
                                    ? "High vacancy — large pool of acquirable distressed stock; strong asset sourcing opportunity."
                                    : met.vacancy_rate > 10
                                      ? "Above-average vacancy — meaningful supply of distressed and available units."
                                      : met.vacancy_rate > 6
                                        ? "Moderate vacancy — some acquisition opportunities present."
                                        : "Low vacancy — tight housing stock; limited distressed asset sourcing.",
                            },
                            {
                              pct: pctile("pop_growth_pct", false),
                              metric: "Population Growth",
                              sub: "Census ACS 2019–2022 CAGR · demand formation trend",
                              value:
                                met.pop_growth_pct != null
                                  ? `${met.pop_growth_pct >= 0 ? "+" : ""}${met.pop_growth_pct.toFixed(1)}%`
                                  : "—",
                              interp:
                                met.pop_growth_pct == null
                                  ? "No data."
                                  : met.pop_growth_pct > 3
                                    ? "Strong population growth — demand wave building ahead of re-rating."
                                    : met.pop_growth_pct > 1
                                      ? "Moderate growth — demand trend positive."
                                      : met.pop_growth_pct > 0
                                        ? "Slow growth — limited demand momentum."
                                        : "Declining population — contracting household base; requires stronger catalyst to offset.",
                            },
                            {
                              pct: pctile("lfpr", false),
                              metric: "Labor Force Participation",
                              sub: "Census ACS 2022 · % pop 16+ in labor force",
                              value:
                                met.lfpr != null
                                  ? `${met.lfpr.toFixed(1)}%`
                                  : "—",
                              interp:
                                met.lfpr == null
                                  ? "No data."
                                  : met.lfpr > 65
                                    ? "High participation — engaged workforce, strong employment culture."
                                    : met.lfpr > 58
                                      ? "Average participation — standard labor force engagement."
                                      : "Low participation — structural unemployment or workforce discouraged; signals deeper distress.",
                            },
                            {
                              pct: pctile("fed_awards_per_capita", false),
                              metric: "Federal Investment (FY24)",
                              sub: "USASpending.gov · total county awards",
                              value: fmtDollar(
                                met.fed_awards_per_capita != null
                                  ? met.fed_awards_per_capita * pop
                                  : null,
                              ),
                              interp:
                                pctile("fed_awards_per_capita", false) == null
                                  ? "No data."
                                  : pctile("fed_awards_per_capita", false) >= 80
                                    ? "High federal investment — active public capital flow, strong catalyst signal."
                                    : pctile("fed_awards_per_capita", false) >=
                                        60
                                      ? "Above-average federal presence — meaningful public sector engagement."
                                      : pctile(
                                            "fed_awards_per_capita",
                                            false,
                                          ) >= 40
                                        ? "Moderate federal footprint — typical public sector activity."
                                        : "Below-average federal investment — limited public catalyst activity.",
                            },
                            {
                              pct: met.oz_tract_flag ? 85 : 20,
                              metric: "Opportunity Zone",
                              sub: "HUD OZ tract designation · federal tax incentive infrastructure",
                              value: met.oz_tract_flag
                                ? "Designated"
                                : "Not Designated",
                              interp: met.oz_tract_flag
                                ? "OZ designation present — federal tax-advantaged investment infrastructure in place, reducing effective capital cost."
                                : "No OZ designation — standard tax treatment applies; no federal tax incentive leverage.",
                            },
                            {
                              pct: pctile("biz_apps_per_1k", false),
                              metric: "Business Formation Rate",
                              sub: "Census BFS · high-propensity business applications per 1k pop",
                              value:
                                met.biz_apps_per_1k != null
                                  ? `${met.biz_apps_per_1k.toFixed(2)}/1k`
                                  : "—",
                              interp:
                                met.biz_apps_per_1k == null
                                  ? "No data."
                                  : met.biz_apps_per_1k > 3
                                    ? "High business formation — entrepreneurial momentum present; early indicator of economic recovery cycle."
                                    : met.biz_apps_per_1k > 1.5
                                      ? "Above-average formation — meaningful new venture activity, supports business dynamism thesis."
                                      : met.biz_apps_per_1k > 0.8
                                        ? "Moderate formation — standard business start activity."
                                        : "Below-average formation — limited entrepreneurial activity.",
                            },
                            {
                              pct: pctile("estab_growth_pct", false),
                              metric: "Establishment Growth",
                              sub: "Census CBP YoY · % change in business establishments",
                              value:
                                met.estab_growth_pct != null
                                  ? `${met.estab_growth_pct >= 0 ? "+" : ""}${met.estab_growth_pct.toFixed(1)}%`
                                  : "—",
                              interp:
                                met.estab_growth_pct == null
                                  ? "No data."
                                  : met.estab_growth_pct > 5
                                    ? "Strong establishment growth — business base expanding rapidly; market gaining economic momentum."
                                    : met.estab_growth_pct > 2
                                      ? "Above-average growth — steady business expansion."
                                      : met.estab_growth_pct > 0
                                        ? "Modest growth — stable business environment."
                                        : "Declining establishments — business contraction; deepens distress thesis but warrants monitoring.",
                            },
                            {
                              pct: pctile("estab_per_1k_pop", false),
                              metric: "Business Density",
                              sub: `${met.estab_per_1k_pop?.toFixed(1) ?? "—"} establishments per 1k pop · CBP 2022 · national avg ~25`,
                              value: met.estab_per_1k_pop
                                ? `${met.estab_per_1k_pop.toFixed(1)}/1k`
                                : "—",
                              interp:
                                met.estab_per_1k_pop == null
                                  ? "No data."
                                  : met.estab_per_1k_pop > 35
                                    ? "High business density — robust private sector ecosystem with strong absorption capacity."
                                    : met.estab_per_1k_pop > 25
                                      ? "Above-average density — solid economic base with active private sector."
                                      : met.estab_per_1k_pop > 15
                                        ? "Average density — standard business environment."
                                        : "Below-average density — limited private sector depth.",
                            },
                            {
                              pct: pctile("broadband_pct", false),
                              metric: "Broadband Coverage",
                              sub: "FCC BDC · % of addresses with broadband service",
                              value:
                                met.broadband_pct != null
                                  ? `${met.broadband_pct.toFixed(1)}%`
                                  : "—",
                              interp:
                                met.broadband_pct == null
                                  ? "No data."
                                  : met.broadband_pct > 90
                                    ? "Strong broadband infrastructure — ready for remote workforce and employer tech requirements."
                                    : met.broadband_pct > 70
                                      ? "Adequate coverage — functional connectivity, some gaps may exist."
                                      : met.broadband_pct > 50
                                        ? "Partial coverage — connectivity gaps present; may limit employer attraction."
                                        : "Limited broadband — significant infrastructure gap; headwind for knowledge-economy catalyst thesis.",
                            },
                            {
                              pct: pctile("fema_risk_score", true),
                              metric: "Climate Risk Score",
                              sub: "FEMA NRI · composite natural hazard risk (lower = safer)",
                              value:
                                met.fema_risk_score != null
                                  ? `${met.fema_risk_score.toFixed(0)}/100`
                                  : "—",
                              interp:
                                met.fema_risk_score == null
                                  ? "No data."
                                  : met.fema_risk_score < 20
                                    ? "Low climate risk — minimal natural hazard exposure; strong long-term asset durability."
                                    : met.fema_risk_score < 40
                                      ? "Below-average risk — manageable hazard profile."
                                      : met.fema_risk_score < 60
                                        ? "Moderate risk — some natural hazard exposure; factor into underwriting."
                                        : met.fema_risk_score < 80
                                          ? "Elevated risk — meaningful hazard exposure; insurance and resilience costs will be above average."
                                          : "High climate risk — significant natural hazard exposure; requires careful risk-adjusted underwriting.",
                            },
                            {
                              pct: pctile("grad_unemployment_rate", false),
                              metric: "Graduate Unemployment Rate",
                              sub: "Census ACS · bachelor's degree+ holders unemployed / grad labor force · higher = more latent workforce",
                              value:
                                met.grad_unemployment_rate != null
                                  ? `${met.grad_unemployment_rate.toFixed(1)}%`
                                  : "—",
                              interp:
                                met.grad_unemployment_rate == null
                                  ? "No data."
                                  : met.grad_unemployment_rate > 6
                                    ? "Elevated graduate unemployment — substantial pool of credentialed workers underutilized; strong latent workforce signal for employer attraction."
                                    : met.grad_unemployment_rate > 3
                                      ? "Above-average graduate unemployment — meaningful untapped credential base, positive for activation catalyst thesis."
                                      : met.grad_unemployment_rate > 1.5
                                        ? "Moderate graduate unemployment — some latent workforce available."
                                        : "Low graduate unemployment — credential base largely employed; limited untapped workforce reserve.",
                            },
                            {
                              pct: pctile("stem_jobs_pct", true),
                              metric: "STEM Underemployment Proxy",
                              sub: "Census ACS C24010 · STEM occupations as % of total employment · low % relative to grad base = underemployment signal",
                              value:
                                met.stem_jobs_pct != null
                                  ? `${met.stem_jobs_pct.toFixed(1)}%`
                                  : "—",
                              interp:
                                met.stem_jobs_pct == null
                                  ? "No data."
                                  : met.stem_jobs_pct < 5
                                    ? "Very low STEM job density — large gap between credential base and available STEM roles; significant underemployment signal and opportunity for employer catalyst."
                                    : met.stem_jobs_pct < 10
                                      ? "Below-average STEM employment — suggests meaningful credential-to-job mismatch; untapped technical workforce."
                                      : met.stem_jobs_pct < 18
                                        ? "Moderate STEM density — standard market, some underemployment potential."
                                        : "High STEM job density — credential base well-absorbed; limited underemployment gap.",
                            },
                            {
                              pct: pctile("oes_median_wage", false),
                              metric: "Median Annual Wage",
                              sub: "BLS OES · MSA-level median annual wage across all occupations",
                              value:
                                met.oes_median_wage != null
                                  ? `$${Math.round(met.oes_median_wage).toLocaleString()}`
                                  : "—",
                              interp:
                                met.oes_median_wage == null
                                  ? "No data."
                                  : met.oes_median_wage > 60000
                                    ? "Above-average wages — strong labor market income; supports household formation and spending."
                                    : met.oes_median_wage > 45000
                                      ? "Near-average wages — standard labor market income environment."
                                      : "Below-average wages — lower income base; consistent with distressed market entry cost thesis.",
                            },
                            ...(() => {
                              const zhvi = met.zhvi_latest;
                              const hhi  = met.median_hhi;
                              const stdDTI   = _housingDTI(zhvi, hhi, 0.03);
                              const apDTI    = _housingDTI(zhvi, hhi, 0.20);
                              const stdPool  = _buyerPoolPct(zhvi, hhi, 0.03);
                              const apPool   = _buyerPoolPct(zhvi, hhi, 0.20);
                              const lift     = (apPool != null && stdPool != null) ? apPool - stdPool : null;
                              const dpReach  = _downPaymentReachPct(zhvi, 0.03, hhi, 3, 0.10);
                              const stdPmt   = (zhvi && hhi) ? _totalMonthlyPayment(zhvi, 0.03) : null;
                              const apPmt    = zhvi ? _monthlyMortgage(zhvi, 0.20) : null;
                              const savings  = (stdPmt != null && apPmt != null) ? stdPmt - apPmt : null;
                              const dtiPct   = stdDTI != null ? Math.round(Math.max(0, Math.min(100, (55 - stdDTI) / (55 - 15) * 100))) : null;
                              const apDtiPct = apDTI != null ? Math.round(Math.max(0, Math.min(100, (55 - apDTI) / (55 - 15) * 100))) : null;
                              const countyLabel = (met.county_name || "").replace(/\s+County$/i, "");
                              return [
                                {
                                  pct: dtiPct,
                                  metric: "Buyer Affordability (Standard)",
                                  value: stdDTI != null ? `${stdDTI.toFixed(1)}% DTI` : "—",
                                  interp: dpReach != null
                                    ? `~${dpReach.toFixed(0)}% of ${countyLabel} households could save the 3% down payment in 3 years — the barrier is monthly cash flow, not savings. Standard financing (3% down + PMI) requires $${stdPmt != null ? Math.round(stdPmt).toLocaleString() : "—"}/mo, qualifying only ~${stdPool != null ? stdPool.toFixed(0) : "—"}% of households.`
                                    : `Standard financing at 3% down + PMI requires $${stdPmt != null ? Math.round(stdPmt).toLocaleString() : "—"}/mo (${stdDTI != null ? stdDTI.toFixed(1) : "—"}% DTI), qualifying ~${stdPool != null ? stdPool.toFixed(0) : "—"}% of households.`,
                                },
                                {
                                  pct: apDtiPct,
                                  metric: "Buyer Affordability (w/ American Pledge)",
                                  value: apDTI != null ? `${apDTI.toFixed(1)}% DTI` : "—",
                                  interp: savings != null
                                    ? `American Pledge (20% down, no PMI) saves $${Math.round(savings).toLocaleString()}/mo, reducing DTI from ${stdDTI != null ? stdDTI.toFixed(1) : "—"}% to ${apDTI != null ? apDTI.toFixed(1) : "—"}% and expanding the qualifying buyer pool from ~${stdPool != null ? stdPool.toFixed(0) : "—"}% to ~${apPool != null ? apPool.toFixed(0) : "—"}% of households${lift != null ? ` (+${lift.toFixed(0)} pts)` : ""}.`
                                    : `American Pledge reduces DTI to ${apDTI != null ? apDTI.toFixed(1) : "—"}%, qualifying ~${apPool != null ? apPool.toFixed(0) : "—"}% of households.`,
                                },
                              ];
                            })(),
                          ];

                          return (
                            <Card
                              elevation={0}
                              sx={{
                                border: `1px solid ${C.border}`,
                                borderRadius: 1,
                              }}
                            >
                              <CardContent sx={{ pb: "12px !important" }}>
                                <Box sx={{ mb: 2 }}>
                                  <Box
                                    sx={{
                                      pb: 1,
                                      borderBottom: `2px solid ${C.navy}`,
                                      width: "fit-content",
                                    }}
                                  >
                                    <Typography
                                      sx={{
                                        fontSize: 11,
                                        fontWeight: 800,
                                        color: C.navy,
                                        textTransform: "uppercase",
                                        letterSpacing: "0.09em",
                                      }}
                                    >
                                      Supplemental Signals
                                    </Typography>
                                    <Typography
                                      sx={{
                                        fontSize: 10,
                                        color: C.muted,
                                        mt: 0.25,
                                      }}
                                    >{`External data benchmarked against ${all.length.toLocaleString()}-county universe · signal = thesis impact`}</Typography>
                                  </Box>
                                </Box>
                                <Box sx={{ overflowX: "auto" }}>
                                  <table
                                    style={{
                                      width: "100%",
                                      borderCollapse: "collapse",
                                      fontSize: 12,
                                    }}
                                  >
                                    <thead>
                                      <tr>
                                        {[
                                          "Signal",
                                          "Metric",
                                          "Relative Position",
                                          "Value",
                                          "Interpretation",
                                        ].map((h) => (
                                          <th
                                            key={h}
                                            style={{
                                              padding: "6px 10px",
                                              textAlign: "left",
                                              color: C.muted,
                                              fontWeight: 700,
                                              fontSize: 10,
                                              textTransform: "uppercase",
                                              letterSpacing: "0.07em",
                                              whiteSpace: "nowrap",
                                            }}
                                          >
                                            {h}
                                          </th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {signals.map(
                                        (
                                          { pct, metric, sub, value, interp },
                                          i,
                                        ) => {
                                          const s = sig(pct);
                                          return (
                                            <tr
                                              key={metric}
                                              style={{
                                                background:
                                                  i % 2 === 0
                                                    ? "transparent"
                                                    : C.bg,
                                                borderBottom: `1px solid ${C.border}`,
                                              }}
                                            >
                                              <td
                                                style={{
                                                  padding: "10px 10px",
                                                  verticalAlign: "top",
                                                  whiteSpace: "nowrap",
                                                }}
                                              >
                                                <span
                                                  style={{
                                                    fontSize: 10,
                                                    fontWeight: 700,
                                                    color: s.color,
                                                    background: s.bg,
                                                    border: `1px solid ${s.color}55`,
                                                    borderRadius: 4,
                                                    padding: "2px 8px",
                                                  }}
                                                >
                                                  {s.label}
                                                </span>
                                              </td>
                                              <td
                                                style={{
                                                  padding: "10px 10px",
                                                  verticalAlign: "top",
                                                  minWidth: 160,
                                                }}
                                              >
                                                <div
                                                  style={{
                                                    fontWeight: 700,
                                                    color: C.charcoal,
                                                    fontSize: 12,
                                                  }}
                                                >
                                                  {metric}
                                                </div>
                                                <div
                                                  style={{
                                                    fontSize: 10,
                                                    color: C.muted,
                                                    marginTop: 2,
                                                  }}
                                                >
                                                  {sub}
                                                </div>
                                              </td>
                                              <td
                                                style={{
                                                  padding:
                                                    "10px 14px 10px 10px",
                                                  verticalAlign: "top",
                                                  minWidth: 140,
                                                }}
                                              >
                                                {pct != null ? (
                                                  <Box
                                                    sx={{
                                                      display: "flex",
                                                      alignItems: "center",
                                                      gap: 1,
                                                    }}
                                                  >
                                                    <Box
                                                      sx={{
                                                        flex: 1,
                                                        height: 6,
                                                        background: C.border,
                                                        borderRadius: 3,
                                                        minWidth: 80,
                                                      }}
                                                    >
                                                      <Box
                                                        sx={{
                                                          width: `${pct}%`,
                                                          height: "100%",
                                                          background: s.color,
                                                          borderRadius: 3,
                                                          transition:
                                                            "width 0.5s cubic-bezier(0.4,0,0.2,1), background-color 0.3s ease",
                                                        }}
                                                      />
                                                    </Box>
                                                    <span
                                                      style={{
                                                        fontSize: 10,
                                                        color: C.muted,
                                                        minWidth: 30,
                                                      }}
                                                    >
                                                      {pct}th
                                                    </span>
                                                  </Box>
                                                ) : (
                                                  <span
                                                    style={{
                                                      fontSize: 10,
                                                      color: C.muted,
                                                    }}
                                                  >
                                                    —
                                                  </span>
                                                )}
                                              </td>
                                              <td
                                                style={{
                                                  padding: "10px 10px",
                                                  verticalAlign: "top",
                                                  whiteSpace: "nowrap",
                                                }}
                                              >
                                                <span
                                                  style={{
                                                    fontWeight: 700,
                                                    color:
                                                      s.color === C.muted
                                                        ? C.charcoal
                                                        : s.color,
                                                    fontSize: 13,
                                                  }}
                                                >
                                                  {value}
                                                </span>
                                              </td>
                                              <td
                                                style={{
                                                  padding: "10px 10px",
                                                  verticalAlign: "top",
                                                  color: C.muted,
                                                  fontSize: 11,
                                                  lineHeight: 1.5,
                                                  maxWidth: 220,
                                                }}
                                              >
                                                {interp}
                                              </td>
                                            </tr>
                                          );
                                        },
                                      )}
                                    </tbody>
                                  </table>
                                </Box>
                              </CardContent>
                            </Card>
                          );
                        })()}
                    </Box>
                  )}

                  {/* ── Expansion Markets Pane ── */}
                  {chartPane === "opportunity" && (
                    <Box
                      sx={{
                        flex: 1,
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                      }}
                    >
                      {/* Loading state */}
                      {groundScoreLoading && (
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            alignItems: "center",
                            gap: 2,
                            pt: 6,
                          }}
                        >
                          <l-helix
                            size="60"
                            speed="2.5"
                            color={C.navy}
                          ></l-helix>
                          <Typography
                            sx={{
                              fontSize: 9,
                              fontWeight: 600,
                              color: C.muted,
                              letterSpacing: "0.08em",
                              textTransform: "uppercase",
                            }}
                          >
                            Loading Ground Score Intelligence
                          </Typography>
                        </Box>
                      )}

                      {/* Market Summary */}
                      {groundScoreData &&
                        (() => {
                          const m =
                            groundScoreData.expansion.find(
                              (x) => x.fips === neopoliMarket,
                            ) || groundScoreData.expansion[0];
                          if (!m) return null;
                          const tierMeta =
                            NEOPOLI_TIER_META[m.tier] ||
                            NEOPOLI_TIER_META.watchlist;
                          const dimScores = OPPORTUNITY_DIMS.map((d) => ({
                            label: d.label,
                            score: m.dims[d.id] ?? 0,
                            weight: d.weight,
                          }));
                          const sorted = [...dimScores].sort(
                            (a, b) => b.score - a.score,
                          );
                          const top3 = sorted.slice(0, 3);
                          const bot3 = sorted.slice(-3).reverse();
                          const strongCount = dimScores.filter(
                            (d) => d.score >= 70,
                          ).length;
                          const weakCount = dimScores.filter(
                            (d) => d.score < 40,
                          ).length;
                          const topStr = top3
                            .map((d) => `${d.label} (${d.score.toFixed(0)})`)
                            .join(", ");
                          const botStr = bot3
                            .filter((d) => d.score < 55)
                            .map((d) => `${d.label} (${d.score.toFixed(0)})`)
                            .join(", ");
                          return (
                            <Card
                              elevation={0}
                              sx={{
                                border: `1px solid ${C.navy}`,
                                borderRadius: 1,
                                overflow: "hidden",
                              }}
                            >
                              <Box
                                sx={{
                                  background: C.navy,
                                  px: 2,
                                  py: 1.25,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  flexWrap: "wrap",
                                  gap: 1,
                                }}
                              >
                                <Box>
                                  <Typography
                                    sx={{
                                      fontSize: 11,
                                      fontWeight: 800,
                                      color: C.white,
                                      textTransform: "uppercase",
                                      letterSpacing: "0.09em",
                                    }}
                                  >
                                    {m.name}, {m.state} · Market Summary
                                  </Typography>
                                  <Typography
                                    sx={{
                                      fontSize: 10,
                                      color: "rgba(255,255,255,0.6)",
                                      mt: 0.25,
                                    }}
                                  >
                                    rank #{m.rank} of{" "}
                                    {groundScoreData.expansion.length.toLocaleString()}{" "}
                                    · composite {m.composite.toFixed(1)}
                                  </Typography>
                                </Box>
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1,
                                  }}
                                >
                                  <span
                                    style={{
                                      fontSize: 10,
                                      fontWeight: 700,
                                      color: C.navy,
                                      background: C.white,
                                      border: `1px solid ${C.white}`,
                                      borderRadius: 4,
                                      padding: "3px 10px",
                                      whiteSpace: "nowrap",
                                    }}
                                  >
                                    {tierMeta.label}
                                  </span>
                                  {!deepDives[`expansion:${m.fips}`] && (
                                    <button
                                      onClick={() =>
                                        requestDeepDive(m, "expansion")
                                      }
                                      disabled={
                                        deepDiveLoading ===
                                        `expansion:${m.fips}`
                                      }
                                      style={{
                                        fontSize: 10,
                                        fontWeight: 700,
                                        color: C.white,
                                        background: "rgba(255,255,255,0.15)",
                                        border:
                                          "1px solid rgba(255,255,255,0.4)",
                                        borderRadius: 4,
                                        padding: "3px 10px",
                                        cursor: "pointer",
                                        whiteSpace: "nowrap",
                                      }}
                                    >
                                      {deepDiveLoading === `expansion:${m.fips}`
                                        ? "Generating…"
                                        : "Deep Dive"}
                                    </button>
                                  )}
                                </Box>
                              </Box>
                              <CardContent sx={{ pb: "12px !important" }}>
                                {(() => {
                                  const kalshiMtg = kalshiData?.series?.KXMORTGAGERATE?.markets?.length > 0
                                    ? kalshiMedian(kalshiData.series.KXMORTGAGERATE.markets)?.value ?? null
                                    : null;
                                  const hpa = _hpaOutlook(m.metrics, kalshiMtg);
                                  if (!hpa) return null;
                                  return (
                                    <Box sx={{ mb: 1.5, pb: 1.5, borderBottom: `1px solid ${C.border}` }}>
                                      <Typography sx={{ fontSize: 9, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.07em", mb: 0.75 }}>
                                        HPA Outlook · 5-signal composite
                                      </Typography>
                                      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                                        <Box sx={{ flex: "0 0 100px", minWidth: 95, border: `1px solid ${hpa.color}44`, borderRadius: 1, p: 1, background: hpa.color + "18" }}>
                                          <Typography sx={{ fontSize: 9, color: C.muted, fontWeight: 600, mb: 0.25 }}>Implied YoY Range</Typography>
                                          <Typography sx={{ fontSize: 16, fontWeight: 700, color: hpa.color, lineHeight: 1.1 }}>
                                            {hpa.hpaLow >= 0 ? "+" : ""}{hpa.hpaLow}-{hpa.hpaHigh}%
                                          </Typography>
                                          <Typography sx={{ fontSize: 9, color: C.muted }}>avg HPA/yr</Typography>
                                          <Typography sx={{ fontSize: 9, fontWeight: 700, color: hpa.color, mt: 0.25 }}>{hpa.label}</Typography>
                                        </Box>
                                        {hpa.drivers.map((d) => {
                                          const dc = d.score >= 0.6 ? C.greenLight : d.score >= 0.35 ? "#f0a500" : "#e57373";
                                          return (
                                            <Box key={d.key} sx={{ flex: "1 1 90px", minWidth: 85, border: `1px solid ${dc}44`, borderRadius: 1, p: 1, background: dc + "0d" }}>
                                              <Typography sx={{ fontSize: 9, color: C.muted, fontWeight: 600, mb: 0.25 }}>{d.label}</Typography>
                                              <Typography sx={{ fontSize: 13, fontWeight: 700, color: dc, lineHeight: 1.1 }}>
                                                {d.value ?? "—"}
                                              </Typography>
                                              <Typography sx={{ fontSize: 8, color: C.muted, mt: 0.25, lineHeight: 1.4 }}>{d.detail}</Typography>
                                            </Box>
                                          );
                                        })}
                                      </Box>
                                    </Box>
                                  );
                                })()}
                                {deepDives[`expansion:${m.fips}`] ? (
                                  <Box sx={{ mb: 1.5 }}>
                                    {renderDeepDive(
                                      deepDives[`expansion:${m.fips}`],
                                    )}
                                  </Box>
                                ) : (
                                  <Typography
                                    sx={{
                                      fontSize: 12,
                                      color: C.charcoal,
                                      lineHeight: 1.7,
                                      mb: 1.5,
                                    }}
                                  >
                                    {m.summary}
                                  </Typography>
                                )}
                                {(() => {
                                  const selCity =
                                    m.cities?.find(
                                      (c) => c.place_fips === selectedCityFips,
                                    ) ||
                                    onDemandCities[selectedCityFips] ||
                                    m.cities?.[0];
                                  if (!selCity) return null;
                                  const met = selCity.metrics || {};
                                  const statRows = [
                                    [
                                      "Ground Score",
                                      selCity.composite != null
                                        ? selCity.composite.toFixed(1)
                                        : null,
                                    ],
                                    [
                                      "Median HHI",
                                      met.median_hhi
                                        ? `$${Math.round(met.median_hhi).toLocaleString()}`
                                        : null,
                                    ],
                                    [
                                      "Home Value",
                                      met.zhvi_latest
                                        ? `$${Math.round(met.zhvi_latest).toLocaleString()}`
                                        : null,
                                    ],
                                    [
                                      "1yr HPA",
                                      met.zhvi_growth_1yr != null
                                        ? `${(met.zhvi_growth_1yr * 100).toFixed(1)}%`
                                        : null,
                                    ],
                                    [
                                      "Unemployment",
                                      met.unemployment_rate != null
                                        ? `${met.unemployment_rate.toFixed(1)}%`
                                        : null,
                                    ],
                                    [
                                      "Poverty Rate",
                                      met.poverty_rate != null
                                        ? `${met.poverty_rate.toFixed(1)}%`
                                        : null,
                                    ],
                                    [
                                      "Vacancy Rate",
                                      met.vacancy_rate != null
                                        ? `${met.vacancy_rate.toFixed(1)}%`
                                        : null,
                                    ],
                                    [
                                      "Drive to Metro",
                                      met.drive_min_nearest_metro != null
                                        ? `${Math.round(met.drive_min_nearest_metro)} min`
                                        : null,
                                    ],
                                  ].filter(([, v]) => v != null);
                                  const snapshotBlock = (
                                    <Box
                                      sx={{
                                        pt: 1,
                                        borderTop: `1px solid ${C.border}`,
                                      }}
                                    >
                                      <Typography
                                        sx={{
                                          fontSize: 9,
                                          fontWeight: 700,
                                          color: C.navy,
                                          textTransform: "uppercase",
                                          letterSpacing: "0.07em",
                                          mb: 0.75,
                                        }}
                                      >
                                        {selCity.name} · City Snapshot
                                      </Typography>
                                      <Box
                                        sx={{
                                          display: "flex",
                                          flexWrap: "wrap",
                                          gap: "6px 16px",
                                          mb: 1,
                                        }}
                                      >
                                        {statRows.map(([k, v]) => (
                                          <Box key={k}>
                                            <Typography
                                              sx={{
                                                fontSize: 9,
                                                color: C.muted,
                                                textTransform: "uppercase",
                                                letterSpacing: "0.06em",
                                                lineHeight: 1.2,
                                              }}
                                            >
                                              {k}
                                            </Typography>
                                            <Typography
                                              sx={{
                                                fontSize: 12,
                                                fontWeight: 700,
                                                color: C.charcoal,
                                              }}
                                            >
                                              {v}
                                            </Typography>
                                          </Box>
                                        ))}
                                      </Box>
                                      <Box
                                        sx={{
                                          display: "flex",
                                          flexWrap: "wrap",
                                          gap: "4px 10px",
                                        }}
                                      >
                                        {Object.entries(selCity.dims || {}).map(
                                          ([dimId, score]) => {
                                            const col =
                                              score >= 66
                                                ? C.greenLight
                                                : score >= 33
                                                  ? C.blue
                                                  : C.muted;
                                            return (
                                              <Box
                                                key={dimId}
                                                sx={{
                                                  flex: "1 1 110px",
                                                  minWidth: 0,
                                                }}
                                              >
                                                <Box
                                                  sx={{
                                                    display: "flex",
                                                    justifyContent:
                                                      "space-between",
                                                    mb: "2px",
                                                  }}
                                                >
                                                  <span
                                                    style={{
                                                      fontSize: 9,
                                                      color: C.muted,
                                                    }}
                                                  >
                                                    {dimId.replace(/_/g, " ")}
                                                  </span>
                                                  <span
                                                    style={{
                                                      fontSize: 9,
                                                      fontWeight: 700,
                                                      color: col,
                                                    }}
                                                  >
                                                    {score?.toFixed(0)}
                                                  </span>
                                                </Box>
                                                <Box
                                                  sx={{
                                                    height: 3,
                                                    background: C.border,
                                                    borderRadius: 2,
                                                  }}
                                                >
                                                  <Box
                                                    sx={{
                                                      width: `${score}%`,
                                                      height: "100%",
                                                      background: col,
                                                      borderRadius: 2,
                                                    }}
                                                  />
                                                </Box>
                                              </Box>
                                            );
                                          },
                                        )}
                                      </Box>
                                    </Box>
                                  );
                                  return (
                                    <Box
                                      sx={{
                                        mt: "40px",
                                        mb: "20px",
                                        p: 1.25,
                                        background: C.bg,
                                        borderRadius: 1,
                                        borderLeft: `3px solid ${selCity.summary ? C.greenLight : C.orange}`,
                                      }}
                                    >
                                      {selCity.summary && (
                                        <>
                                          <Typography
                                            sx={{
                                              fontSize: 10,
                                              fontWeight: 700,
                                              color: C.greenLight,
                                              textTransform: "uppercase",
                                              letterSpacing: "0.07em",
                                              mb: 0.4,
                                            }}
                                          >
                                            {selCity.name} · City Spotlight
                                          </Typography>
                                          <Typography
                                            sx={{
                                              fontSize: 11,
                                              color: C.charcoal,
                                              lineHeight: 1.65,
                                            }}
                                          >
                                            {selCity.summary}
                                          </Typography>
                                        </>
                                      )}
                                      {snapshotBlock}
                                    </Box>
                                  );
                                })()}
                                {/* ── American Pledge Impact Card — Expansion ── */}
                                {groundScoreData &&
                                  (() => {
                                    const apM = groundScoreData.expansion.find((x) => x.fips === neopoliMarket) || groundScoreData.expansion[0];
                                    const zhvi = apM?.metrics?.zhvi_latest || m.cities?.[0]?.metrics?.zhvi_latest;
                                    const hhi  = apM?.metrics?.median_hhi  || m.cities?.[0]?.metrics?.median_hhi;
                                    if (!zhvi || !hhi) return (
                                      <Box sx={{ mt: 1.5, p: 1.5, border: `1px solid ${C.border}`, borderRadius: 1, background: C.bg }}>
                                        <Typography sx={{ fontSize: 10, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", mb: 0.5 }}>American Pledge · Market Impact Analysis</Typography>
                                        <Typography sx={{ fontSize: 11, color: C.muted }}>Insufficient housing data to calculate loan comparisons for this area.</Typography>
                                      </Box>
                                    );
                                    const stdPI      = _monthlyMortgage(zhvi, 0.03);
                                    const stdPMI     = _monthlyPMI(zhvi, 0.03);
                                    const stdPayment = stdPI + stdPMI;
                                    const apPayment  = _monthlyMortgage(zhvi, 0.20);
                                    const stdDTI     = _housingDTI(zhvi, hhi, 0.03);
                                    const apDTI      = _housingDTI(zhvi, hhi, 0.20);
                                    const stdPool    = _buyerPoolPct(zhvi, hhi, 0.03);
                                    const apPool     = _buyerPoolPct(zhvi, hhi, 0.20);
                                    const lift       = apPool - stdPool;
                                    const totalSavings = stdPayment - apPayment;
                                    const pmiSavings = stdPMI;
                                    const dpReach    = _downPaymentReachPct(zhvi, 0.03, hhi, 3, 0.10);
                                    const estHH      = Math.round((apM.population || 0) / 2.53);
                                    const unlockedHH = Math.round((lift / 100) * estHH);
                                    const fmtHH = (n) => n >= 1000 ? `${(n / 1000).toFixed(1)}k` : n.toLocaleString();
                                    const countyLabel = apM.name.replace(/\s+County$/i, "");
                                    return (
                                      <Box sx={{ mt: 1.5 }}>
                                          <Box sx={{ display: "flex", gap: 1.5, mb: 2, flexWrap: "wrap" }}>
                                            {/* Standard */}
                                            <Box sx={{ flex: "1 1 140px", border: `1px solid ${C.border}`, borderRadius: 1, p: 1.5, background: C.bg }}>
                                              <Typography sx={{ fontSize: 9, fontWeight: 800, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", mb: 0.75 }}>Standard · 3% Down (Fannie/Freddie)</Typography>
                                              <Typography sx={{ fontSize: 26, fontWeight: 800, color: C.charcoal, lineHeight: 1 }}>${Math.round(stdPayment).toLocaleString()}</Typography>
                                              <Typography sx={{ fontSize: 10, color: C.muted, mb: 0.75 }}>P&amp;I: ${Math.round(stdPI).toLocaleString()} + ${Math.round(stdPMI).toLocaleString()} PMI</Typography>
                                              <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.5, mb: 0.25 }}>
                                                <Typography sx={{ fontSize: 13, fontWeight: 800, color: C.charcoal }}>{stdDTI.toFixed(1)}%</Typography>
                                                <Typography sx={{ fontSize: 10, color: C.muted }}>housing DTI</Typography>
                                              </Box>
                                              <Typography sx={{ fontSize: 10, color: C.muted, mb: 0.75 }}>~{stdPool.toFixed(0)}% can qualify</Typography>
                                              {(() => {
                                                const req = Math.round((stdPayment / 0.43) * 12);
                                                const delta = req - hhi;
                                                const absFmt = `$${Math.round(Math.abs(delta) / 1000).toLocaleString()}k`;
                                                return (
                                                  <Box sx={{ pt: 0.75, borderTop: `1px solid ${C.border}` }}>
                                                    <Typography sx={{ fontSize: 9, fontWeight: 800, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", mb: 0.25 }}>Min. Income to Qualify</Typography>
                                                    <Typography sx={{ fontSize: 16, fontWeight: 800, color: C.charcoal, lineHeight: 1, mb: 0.25 }}>${Math.round(req / 1000).toLocaleString()}k/yr</Typography>
                                                    <Typography sx={{ fontSize: 10, fontWeight: 700, color: delta > 0 ? "#ef4444" : C.green }}>
                                                      {delta > 0 ? `▲ ${absFmt} above median` : `▼ ${absFmt} below median`}
                                                    </Typography>
                                                  </Box>
                                                );
                                              })()}
                                              {dpReach != null && <Typography sx={{ fontSize: 10, color: "#f59e0b", fontWeight: 600, mt: 0.75 }}>~{dpReach.toFixed(0)}% can save 3% down in 3 yrs</Typography>}
                                            </Box>
                                            {/* American Pledge */}
                                            <Box sx={{ flex: "1 1 140px", border: `2px solid ${C.navy}`, borderRadius: 1, p: 1.5, background: C.navy, position: "relative" }}>
                                              <Typography sx={{ fontSize: 9, fontWeight: 800, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.08em", mb: 0.75 }}>American Pledge · 20% Down</Typography>
                                              <Box sx={{ display: "flex", alignItems: "flex-start", gap: "24px", mb: 0 }}>
                                                <Typography sx={{ fontSize: 26, fontWeight: 800, color: C.white, lineHeight: 1 }}>${Math.round(apPayment).toLocaleString()}</Typography>
                                                <Box sx={{ pt: 0.25 }}>
                                                  <Typography sx={{ fontSize: 10, color: "#7ee8a2", fontWeight: 700, lineHeight: 1.3 }}>saves ${Math.round(totalSavings).toLocaleString()}/mo</Typography>
                                                  <Typography sx={{ fontSize: 9, color: "rgba(255,255,255,0.45)", lineHeight: 1.3 }}>${Math.round(pmiSavings).toLocaleString()} PMI eliminated</Typography>
                                                </Box>
                                              </Box>
                                              <Typography sx={{ fontSize: 10, color: "rgba(255,255,255,0.6)", mb: 0.75 }}>P&amp;I: ${Math.round(apPayment).toLocaleString()} + no PMI</Typography>
                                              <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.5, mb: 0.25 }}>
                                                <Typography sx={{ fontSize: 13, fontWeight: 800, color: C.white }}>{apDTI.toFixed(1)}%</Typography>
                                                <Typography sx={{ fontSize: 10, color: "rgba(255,255,255,0.6)" }}>housing DTI</Typography>
                                              </Box>
                                              <Typography sx={{ fontSize: 10, color: "rgba(255,255,255,0.75)", mb: 0.75 }}>~{apPool.toFixed(0)}% of households qualify</Typography>
                                              {(() => {
                                                const req = Math.round((apPayment / 0.43) * 12);
                                                const delta = req - hhi;
                                                const absFmt = `$${Math.round(Math.abs(delta) / 1000).toLocaleString()}k`;
                                                return (
                                                  <Box sx={{ pt: 0.75, borderTop: `1px solid rgba(255,255,255,0.15)` }}>
                                                    <Typography sx={{ fontSize: 9, fontWeight: 800, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.08em", mb: 0.25 }}>Min. Income to Qualify</Typography>
                                                    <Typography sx={{ fontSize: 16, fontWeight: 800, color: C.white, lineHeight: 1, mb: 0.25 }}>${Math.round(req / 1000).toLocaleString()}k/yr</Typography>
                                                    <Typography sx={{ fontSize: 10, fontWeight: 700, color: delta > 0 ? "#fca5a5" : "#7ee8a2" }}>
                                                      {delta > 0 ? `▲ ${absFmt} above median` : `▼ ${absFmt} below median`}
                                                    </Typography>
                                                  </Box>
                                                );
                                              })()}
                                              <img src="/ampledge_white.svg" alt="" style={{ position: "absolute", bottom: 8, right: 8, width: 18, height: 18, objectFit: "contain", opacity: 1 }} />
                                            </Box>
                                            {/* Buyer Affordability Lift */}
                                            <Box sx={{ flex: "1 1 100px", border: `1px solid ${C.greenLight}55`, borderRadius: 1, p: 1.5, background: C.greenLight + "12", display: "flex", flexDirection: "column", justifyContent: "center" }}>
                                              <Typography sx={{ fontSize: 9, fontWeight: 800, color: C.green, textTransform: "uppercase", letterSpacing: "0.08em", mb: 0.5 }}>Buyer Affordability Lift</Typography>
                                              <Typography sx={{ fontSize: 34, fontWeight: 800, color: C.greenLight, lineHeight: 1 }}>+{lift.toFixed(0)}</Typography>
                                              <Typography sx={{ fontSize: 10, color: C.green, fontWeight: 600, mb: 1 }}>pts buyer pool</Typography>
                                              {unlockedHH > 0 && <>
                                                <Typography sx={{ fontSize: 22, fontWeight: 800, color: C.charcoal, lineHeight: 1 }}>~{fmtHH(unlockedHH)}</Typography>
                                                <Typography sx={{ fontSize: 10, color: C.muted, mt: 0.25 }}>additional qualifying HH</Typography>
                                              </>}
                                            </Box>
                                          </Box>
                                          {/* Buyer pool bars */}
                                          <Box sx={{ mb: 2 }}>
                                            <Typography sx={{ fontSize: 9, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.08em", mb: 1.25 }}>Qualifying Buyer Pool</Typography>
                                            {[{ label: "Standard (3% down + PMI)", val: stdPool, color: C.muted, bar: "#b0b8c4" }, { label: "American Pledge (20% down, no PMI)", val: apPool, color: C.navy, bar: C.navy }].map(({ label, val, color, bar }) => (
                                              <Box key={label} sx={{ mb: 1 }}>
                                                <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", mb: 0.4 }}>
                                                  <span style={{ fontSize: 10, color: C.charcoal, fontWeight: 600 }}>{label}</span>
                                                  <span style={{ fontSize: 11, fontWeight: 700, color }}>{val.toFixed(0)}%</span>
                                                </Box>
                                                <Box sx={{ height: 10, background: C.border, borderRadius: 2 }}>
                                                  <Box sx={{ width: `${val}%`, height: "100%", background: bar, borderRadius: 2, transition: "width 0.6s cubic-bezier(0.4,0,0.2,1)" }} />
                                                </Box>
                                              </Box>
                                            ))}
                                          </Box>
                                          {/* Headline + explanation */}
                                          <Box sx={{ borderTop: `1px solid ${C.border}`, pt: 1.25 }}>
                                            {unlockedHH > 0 && <Typography sx={{ fontSize: 11, fontWeight: 700, color: C.navy, mb: 0.75 }}>American Pledge unlocks ~{fmtHH(unlockedHH)} additional qualifying households in {countyLabel} County ({lift.toFixed(0)} pt buyer pool lift × ~{fmtHH(estHH)} est. households)</Typography>}
                                            <Box sx={{ background: "rgba(39,174,96,0.07)", border: "1px solid rgba(39,174,96,0.333)", borderRadius: 1, p: 1.5, mb: 1.25 }}>
                                              <Typography sx={{ fontSize: 10, fontWeight: 800, color: "rgb(26,122,74)", textTransform: "uppercase", letterSpacing: "0.08em", mb: 0.75 }}>What This Means</Typography>
                                              <Typography sx={{ fontSize: 11, color: "rgb(26,122,74)", lineHeight: 1.75 }}>
                                                {dpReach != null ? `~${dpReach.toFixed(0)}% of ${countyLabel} households could save the 3% down payment in three years — so the down payment itself is not the primary barrier. The real constraint is monthly cash flow: standard financing at 3% down + PMI requires $${Math.round(stdPayment).toLocaleString()}/mo (${stdDTI.toFixed(1)}% DTI), leaving only ~${stdPool.toFixed(0)}% of households able to qualify at the median home price.` : `Standard financing at 3% down + PMI requires $${Math.round(stdPayment).toLocaleString()}/mo (${stdDTI.toFixed(1)}% DTI), leaving only ~${stdPool.toFixed(0)}% of households able to qualify at the median home price.`}
                                              </Typography>
                                              <Typography sx={{ fontSize: 11, color: "rgb(26,122,74)", lineHeight: 1.75, mt: 1 }}>
                                                {`American Pledge removes both cost drivers at once: the 20% down payment shrinks the loan balance, cutting P&I by $${Math.round(totalSavings - pmiSavings).toLocaleString()}/mo, and eliminates PMI entirely (saving $${Math.round(pmiSavings).toLocaleString()}/mo). The combined $${Math.round(totalSavings).toLocaleString()}/mo reduction brings DTI from ${stdDTI.toFixed(1)}% down to ${apDTI.toFixed(1)}%, expanding the qualifying buyer pool from ~${stdPool.toFixed(0)}% to ~${apPool.toFixed(0)}% of ${countyLabel} households — directly solving the cash flow constraint that standard financing cannot address.`}
                                              </Typography>
                                              <Typography sx={{ fontSize: 11, color: "rgba(26,122,74,0.7)", lineHeight: 1.75, mt: 1 }}>
                                                Housing DTI is the share of a household's gross monthly income consumed by the mortgage payment. Lenders use 43% as the qualification ceiling — households above that threshold cannot obtain financing regardless of savings or credit.
                                              </Typography>
                                            </Box>
                                            <Typography sx={{ fontSize: 9, color: C.muted, mb: 1.5 }}>Housing DTI = monthly mortgage payment ÷ gross monthly income · Standard = 3% down (Fannie/Freddie min) + PMI at ~1.1%/yr · AP = 20% down, no PMI · 7% rate · 30-yr fixed · 43% DTI qualification ceiling · Down payment reach = % earning enough to save 3% down in 3 yrs at 10% savings rate · log-normal income dist. (σ=0.85) · ACS 2022 median HHI · ZHVI</Typography>
                                          </Box>
                                      </Box>
                                    );
                                  })()}
                                <Box
                                  sx={{
                                    pt: 1.25,
                                    borderTop: `1px solid ${C.border}`,
                                  }}
                                >
                                  <Typography
                                    sx={{
                                      fontSize: 11,
                                      color: C.muted,
                                      lineHeight: 1.65,
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontWeight: 700,
                                        color: C.charcoal,
                                      }}
                                    >
                                      Score Drivers —{" "}
                                    </span>
                                    {strongCount} of 12 dimensions score above
                                    70. Leading:{" "}
                                    <span
                                      style={{
                                        fontWeight: 600,
                                        color: C.charcoal,
                                      }}
                                    >
                                      {topStr}
                                    </span>
                                    .{" "}
                                    {weakCount > 0 ? (
                                      <>
                                        Primary gaps:{" "}
                                        <span
                                          style={{
                                            fontWeight: 600,
                                            color: C.charcoal,
                                          }}
                                        >
                                          {botStr}
                                        </span>
                                        .
                                      </>
                                    ) : (
                                      <>No dimension below 40.</>
                                    )}
                                  </Typography>
                                </Box>
                              </CardContent>
                            </Card>
                          );
                        })()}

                      {/* ── Expansion City Rankings ── */}
                      {groundScoreData &&
                        (() => {
                          const m =
                            groundScoreData.expansion.find(
                              (x) => x.fips === neopoliMarket,
                            ) || groundScoreData.expansion[0];
                          const preCities = m?.cities || [];
                          const demandForCounty = Object.values(
                            onDemandCities,
                          ).filter((c) => c.county_fips === m?.fips);
                          const preFipsSet = new Set(
                            preCities.map((c) => c.place_fips),
                          );
                          const demandSorted = demandForCounty
                            .filter((c) => !preFipsSet.has(c.place_fips))
                            .sort(
                              (a, b) => (b.composite || 0) - (a.composite || 0),
                            );
                          const cities = [...preCities, ...demandSorted].map(
                            (c, i) => ({ ...c, county_rank: i + 1 }),
                          );
                          if (!cities.length) return null;
                          const CITY_PAGE_SIZE = 5;
                          const totalCityPages = Math.ceil(
                            cities.length / CITY_PAGE_SIZE,
                          );
                          // Auto-jump to the page containing the selected city (compute inline, no setState during render)
                          const selIdx = cities.findIndex(
                            (c) => c.place_fips === selectedCityFips,
                          );
                          const effectiveExpPage =
                            selIdx >= 0
                              ? Math.floor(selIdx / CITY_PAGE_SIZE)
                              : Math.min(gsExpCityPage, totalCityPages - 1);
                          const slice = cities.slice(
                            effectiveExpPage * CITY_PAGE_SIZE,
                            (effectiveExpPage + 1) * CITY_PAGE_SIZE,
                          );
                          const dimBar = (v, isSelected) => {
                            if (v == null)
                              return (
                                <span style={{ fontSize: 10, color: C.muted }}>
                                  —
                                </span>
                              );
                            const c =
                              v >= 66
                                ? C.greenLight
                                : v >= 33
                                  ? C.blue
                                  : C.muted;
                            const cSel =
                              v >= 66
                                ? "#2ecc71"
                                : v >= 33
                                  ? "#5dade2"
                                  : "#94a3b8";
                            const textColor = isSelected ? "#fff" : c;
                            const barColor = isSelected ? cSel : c;
                            return (
                              <Box sx={{ minWidth: 56 }}>
                                <Box
                                  sx={{
                                    height: 4,
                                    background: isSelected
                                      ? "rgba(255,255,255,0.12)"
                                      : C.border,
                                    borderRadius: 2,
                                    mb: "2px",
                                  }}
                                >
                                  <Box
                                    sx={{
                                      width: `${v}%`,
                                      height: "100%",
                                      background: barColor,
                                      borderRadius: 2,
                                    }}
                                  />
                                </Box>
                                <span
                                  style={{
                                    fontSize: 10,
                                    color: textColor,
                                    fontWeight: 600,
                                  }}
                                >
                                  {v.toFixed(0)}
                                </span>
                              </Box>
                            );
                          };
                          return (
                            <Card
                              elevation={0}
                              sx={{
                                border: `1px solid ${C.border}`,
                                borderRadius: 1,
                              }}
                            >
                              <CardContent sx={{ pb: "12px !important" }}>
                                <SectionHeader
                                  title="City Ground Score Rankings"
                                  sub={`${m.name}, ${m.state} · top cities by Expansion composite · scored within county universe`}
                                />
                                <table
                                  style={{
                                    width: "100%",
                                    borderCollapse: "collapse",
                                    fontSize: 12,
                                  }}
                                >
                                  <thead>
                                    <tr>
                                      {[
                                        "#",
                                        "City",
                                        "Ground Score",
                                        "Entry Cost",
                                        "Buyer Quality",
                                        "Housing Momentum",
                                        "Labor",
                                        "Metro Access",
                                      ].map((h) => (
                                        <th
                                          key={h}
                                          style={{
                                            padding: "5px 10px",
                                            textAlign: "left",
                                            color: C.muted,
                                            fontWeight: 700,
                                            fontSize: 10,
                                            textTransform: "uppercase",
                                            letterSpacing: "0.07em",
                                            borderBottom: `1px solid ${C.border}`,
                                            whiteSpace: "normal",
                                            verticalAlign: "bottom",
                                            lineHeight: 1.3,
                                          }}
                                        >
                                          {h}
                                        </th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {slice.map((city, i) => {
                                      const isSel =
                                        selectedCityFips === city.place_fips;
                                      const color =
                                        city.composite >= 66
                                          ? C.greenLight
                                          : city.composite >= 33
                                            ? C.blue
                                            : C.muted;
                                      const colorSel =
                                        city.composite >= 66
                                          ? "#2ecc71"
                                          : city.composite >= 33
                                            ? "#5dade2"
                                            : "#94a3b8";
                                      const gsColor = isSel ? colorSel : color;
                                      const gsTextColor = isSel
                                        ? "#fff"
                                        : color;
                                      return (
                                        <tr
                                          key={city.place_fips}
                                          onClick={() =>
                                            selectCityManually(city.place_fips)
                                          }
                                          style={{
                                            background: isSel
                                              ? C.navy
                                              : i % 2 === 0
                                                ? "transparent"
                                                : C.bg,
                                            borderBottom: `1px solid ${C.border}`,
                                            cursor: "pointer",
                                          }}
                                        >
                                          <td
                                            style={{
                                              padding: "7px 10px",
                                              fontWeight: 700,
                                              color: isSel ? C.white : C.navy,
                                              fontSize: 11,
                                              minWidth: 24,
                                            }}
                                          >
                                            {city.county_rank}
                                          </td>
                                          <td
                                            style={{
                                              padding: "7px 10px",
                                              fontWeight: 600,
                                              color: isSel
                                                ? C.white
                                                : C.charcoal,
                                              whiteSpace: "nowrap",
                                            }}
                                          >
                                            {city.name}
                                          </td>
                                          <td style={{ padding: "7px 10px" }}>
                                            <Box
                                              sx={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 0.75,
                                                minWidth: 80,
                                              }}
                                            >
                                              <span
                                                style={{
                                                  fontWeight: 700,
                                                  color: gsTextColor,
                                                  fontSize: 11,
                                                  minWidth: 30,
                                                }}
                                              >
                                                {city.composite.toFixed(1)}
                                              </span>
                                              <Box
                                                sx={{
                                                  flex: 1,
                                                  height: 5,
                                                  background: isSel
                                                    ? "rgba(255,255,255,0.12)"
                                                    : C.border,
                                                  borderRadius: 3,
                                                  minWidth: 40,
                                                }}
                                              >
                                                <Box
                                                  sx={{
                                                    width: `${city.composite}%`,
                                                    height: "100%",
                                                    background: gsColor,
                                                    borderRadius: 3,
                                                  }}
                                                />
                                              </Box>
                                            </Box>
                                          </td>
                                          <td style={{ padding: "7px 10px" }}>
                                            {dimBar(
                                              city.dims?.entry_cost,
                                              isSel,
                                            )}
                                          </td>
                                          <td style={{ padding: "7px 10px" }}>
                                            {dimBar(
                                              city.dims?.buyer_quality,
                                              isSel,
                                            )}
                                          </td>
                                          <td style={{ padding: "7px 10px" }}>
                                            {dimBar(
                                              city.dims?.housing_momentum,
                                              isSel,
                                            )}
                                          </td>
                                          <td style={{ padding: "7px 10px" }}>
                                            {dimBar(
                                              city.dims?.labor_participation,
                                              isSel,
                                            )}
                                          </td>
                                          <td style={{ padding: "7px 10px" }}>
                                            {dimBar(
                                              city.dims?.metro_access,
                                              isSel,
                                            )}
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    mt: 1.5,
                                    pt: 1,
                                    borderTop: `1px solid ${C.border}`,
                                  }}
                                >
                                  <Typography
                                    sx={{ fontSize: 10, color: C.muted }}
                                  >
                                    Page {effectiveExpPage + 1} of{" "}
                                    {totalCityPages} · {cities.length} cities
                                  </Typography>
                                  <Box sx={{ display: "flex", gap: 0.75 }}>
                                    <button
                                      onClick={() => setGsExpCityPage(0)}
                                      disabled={effectiveExpPage === 0}
                                      style={{
                                        fontSize: 10,
                                        padding: "3px 8px",
                                        border: `1px solid ${C.border}`,
                                        borderRadius: 4,
                                        background: "transparent",
                                        color:
                                          effectiveExpPage === 0
                                            ? C.border
                                            : C.muted,
                                        cursor:
                                          effectiveExpPage === 0
                                            ? "default"
                                            : "pointer",
                                        fontFamily: "'Inter',sans-serif",
                                      }}
                                    >
                                      «
                                    </button>
                                    <button
                                      onClick={() =>
                                        setGsExpCityPage((p) =>
                                          Math.max(0, p - 1),
                                        )
                                      }
                                      disabled={effectiveExpPage === 0}
                                      style={{
                                        fontSize: 10,
                                        padding: "3px 8px",
                                        border: `1px solid ${C.border}`,
                                        borderRadius: 4,
                                        background: "transparent",
                                        color:
                                          effectiveExpPage === 0
                                            ? C.border
                                            : C.muted,
                                        cursor:
                                          effectiveExpPage === 0
                                            ? "default"
                                            : "pointer",
                                        fontFamily: "'Inter',sans-serif",
                                      }}
                                    >
                                      ‹ Prev
                                    </button>
                                    <button
                                      onClick={() =>
                                        setGsExpCityPage((p) =>
                                          Math.min(totalCityPages - 1, p + 1),
                                        )
                                      }
                                      disabled={
                                        effectiveExpPage >= totalCityPages - 1
                                      }
                                      style={{
                                        fontSize: 10,
                                        padding: "3px 8px",
                                        border: `1px solid ${C.border}`,
                                        borderRadius: 4,
                                        background: "transparent",
                                        color:
                                          effectiveExpPage >= totalCityPages - 1
                                            ? C.border
                                            : C.muted,
                                        cursor:
                                          effectiveExpPage >= totalCityPages - 1
                                            ? "default"
                                            : "pointer",
                                        fontFamily: "'Inter',sans-serif",
                                      }}
                                    >
                                      Next ›
                                    </button>
                                    <button
                                      onClick={() =>
                                        setGsExpCityPage(totalCityPages - 1)
                                      }
                                      disabled={
                                        effectiveExpPage >= totalCityPages - 1
                                      }
                                      style={{
                                        fontSize: 10,
                                        padding: "3px 8px",
                                        border: `1px solid ${C.border}`,
                                        borderRadius: 4,
                                        background: "transparent",
                                        color:
                                          effectiveExpPage >= totalCityPages - 1
                                            ? C.border
                                            : C.muted,
                                        cursor:
                                          effectiveExpPage >= totalCityPages - 1
                                            ? "default"
                                            : "pointer",
                                        fontFamily: "'Inter',sans-serif",
                                      }}
                                    >
                                      »
                                    </button>
                                  </Box>
                                </Box>
                              </CardContent>
                            </Card>
                          );
                        })()}

                      {/* Dimension Scorecard */}
                      {groundScoreData &&
                        (() => {
                          const m =
                            groundScoreData.expansion.find(
                              (x) => x.fips === neopoliMarket,
                            ) || groundScoreData.expansion[0];
                          if (!m) return null;
                          return (
                            <Card
                              elevation={0}
                              sx={{
                                border: `1px solid ${C.border}`,
                                borderRadius: 1,
                              }}
                            >
                              <CardContent>
                                <Box
                                  sx={{
                                    mb: 1.5,
                                    display: "flex",
                                    alignItems: "flex-start",
                                    justifyContent: "space-between",
                                    gap: 1,
                                  }}
                                >
                                  <SectionHeader
                                    title="Expansion Dimensions"
                                    sub="12 weighted dimensions · scores 0–100"
                                  />
                                  <button
                                    onClick={() => setShowDimDesc((v) => !v)}
                                    style={{
                                      fontSize: 10,
                                      fontWeight: 600,
                                      fontFamily: "'Inter',sans-serif",
                                      padding: "3px 10px",
                                      border: `1px solid ${C.border}`,
                                      borderRadius: 4,
                                      background: showDimDesc
                                        ? C.navy
                                        : "transparent",
                                      color: showDimDesc ? C.white : C.muted,
                                      cursor: "pointer",
                                      whiteSpace: "nowrap",
                                      flexShrink: 0,
                                    }}
                                  >
                                    {showDimDesc
                                      ? "Hide descriptions"
                                      : "Show descriptions"}
                                  </button>
                                </Box>
                                <Box
                                  sx={{
                                    display: "flex",
                                    gap: 2,
                                    flexWrap: "wrap",
                                  }}
                                >
                                  {OPPORTUNITY_DIMS.map((dim) => {
                                    const score = m.dims[dim.id] ?? 0;
                                    const barColor =
                                      score >= 75
                                        ? C.greenLight
                                        : score >= 50
                                          ? C.blue
                                          : score >= 25
                                            ? C.orange
                                            : C.red;
                                    return (
                                      <Box
                                        key={dim.id}
                                        sx={{ flex: "1 1 200px", minWidth: 0 }}
                                      >
                                        <Box
                                          sx={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            mb: 0.25,
                                          }}
                                        >
                                          <span
                                            style={{
                                              fontSize: 10,
                                              fontWeight: 600,
                                              color: C.charcoal,
                                            }}
                                          >
                                            {dim.label}
                                          </span>
                                          <span
                                            style={{
                                              fontSize: 10,
                                              fontWeight: 700,
                                              color: barColor,
                                            }}
                                          >
                                            {score.toFixed(0)}
                                          </span>
                                        </Box>
                                        <Box
                                          sx={{
                                            height: 5,
                                            background: C.border,
                                            borderRadius: 3,
                                          }}
                                        >
                                          <Box
                                            sx={{
                                              width: `${score}%`,
                                              height: "100%",
                                              background: barColor,
                                              borderRadius: 3,
                                              transition:
                                                "width 0.5s cubic-bezier(0.4,0,0.2,1), background-color 0.3s ease",
                                            }}
                                          />
                                        </Box>
                                        <span
                                          style={{
                                            fontSize: 9,
                                            color: C.muted,
                                            display: "block",
                                            marginTop: 3,
                                          }}
                                        >
                                          <span style={{ fontWeight: 700 }}>
                                            wt {dim.weight}
                                          </span>
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

                      {/* ── Expansion Supplemental Signals ── */}
                      {groundScoreData &&
                        (() => {
                          const m =
                            groundScoreData.expansion.find(
                              (x) => x.fips === neopoliMarket,
                            ) || groundScoreData.expansion[0];
                          if (!m?.metrics) return null;
                          const met = m.metrics;
                          const all = groundScoreData.expansion;

                          const pctile = (key, lowerBetter = false) => {
                            const vals = all
                              .map((x) => x.metrics?.[key])
                              .filter((v) => v != null && !isNaN(v));
                            const val = met[key];
                            if (val == null || !vals.length) return null;
                            const below = vals.filter((v) =>
                              lowerBetter ? v > val : v < val,
                            ).length;
                            return Math.round((below / vals.length) * 100);
                          };
                          const sig = (pct) => {
                            if (pct == null)
                              return {
                                label: "No Data",
                                color: C.muted,
                                bg: C.bg,
                              };
                            if (pct >= 80)
                              return {
                                label: "Strong Tailwind",
                                color: C.greenLight,
                                bg: C.greenLight + "18",
                              };
                            if (pct >= 60)
                              return {
                                label: "Tailwind",
                                color: "#27ae60",
                                bg: "#27ae6018",
                              };
                            if (pct >= 40)
                              return {
                                label: "Neutral",
                                color: C.muted,
                                bg: C.border,
                              };
                            if (pct >= 20)
                              return {
                                label: "Headwind",
                                color: C.orange,
                                bg: C.orange + "18",
                              };
                            return {
                              label: "Strong Headwind",
                              color: C.red,
                              bg: C.red + "18",
                            };
                          };
                          const fmtDollar = (v) =>
                            v == null
                              ? "—"
                              : `$${Math.round(v).toLocaleString()}`;

                          const signals = [
                            {
                              pct: pctile("drive_min_nearest_metro", true),
                              metric: "Metro Drive Time",
                              sub: "Amazon Location Service · minutes to nearest major metro",
                              value:
                                met.drive_min_nearest_metro != null
                                  ? `${Math.round(met.drive_min_nearest_metro)} min`
                                  : "—",
                              interp:
                                met.drive_min_nearest_metro == null
                                  ? "No data."
                                  : met.drive_min_nearest_metro < 30
                                    ? "Excellent metro access — within commute shed, strong workforce capture and logistics advantage."
                                    : met.drive_min_nearest_metro < 60
                                      ? "Strong metro adjacency — viable daily commute, accessible to metro amenities and employers."
                                      : met.drive_min_nearest_metro < 90
                                        ? "Moderate proximity — functional metro access, typical for fringe master-planned sites."
                                        : "Remote — limited metro adjacency; site viability depends on self-sufficient demand generation.",
                            },
                            {
                              pct: pctile("pop_growth_pct", false),
                              metric: "Population Growth",
                              sub: "Census ACS 2019–2022 CAGR · household formation momentum",
                              value:
                                met.pop_growth_pct != null
                                  ? `${met.pop_growth_pct >= 0 ? "+" : ""}${met.pop_growth_pct.toFixed(1)}%`
                                  : "—",
                              interp:
                                met.pop_growth_pct == null
                                  ? "No data."
                                  : met.pop_growth_pct > 5
                                    ? "High growth — confirmed in-migration wave; demand likely ahead of supply."
                                    : met.pop_growth_pct > 2
                                      ? "Above-average growth — solid household formation momentum."
                                      : met.pop_growth_pct > 0
                                        ? "Modest growth — demand present but moderate pace."
                                        : "Declining population — contracting household base, demand headwind.",
                            },
                            {
                              pct: pctile("median_hhi", false),
                              metric: "Median Household Income",
                              sub: "Census ACS 2022 · purchasing power base",
                              value:
                                met.median_hhi != null
                                  ? fmtDollar(met.median_hhi)
                                  : "—",
                              interp:
                                met.median_hhi == null
                                  ? "No data."
                                  : met.median_hhi > 85000
                                    ? "Strong purchasing power — household income supports premium lot and home pricing."
                                    : met.median_hhi > 65000
                                      ? "Above-average income — solid demand base for mid-to-upper price points."
                                      : met.median_hhi > 50000
                                        ? "Average income — sufficient for standard community price points."
                                        : "Below-average income — limits achievable price points; may require affordability-focused product.",
                            },
                            {
                              pct: pctile("edfacts_proficiency", false),
                              metric: "School District Quality",
                              sub: "NCES EDFacts SY2021-22 · % students at or above proficiency",
                              value:
                                met.edfacts_proficiency != null
                                  ? `${met.edfacts_proficiency.toFixed(1)}%`
                                  : "—",
                              interp:
                                met.edfacts_proficiency == null
                                  ? "No data available."
                                  : met.edfacts_proficiency > 60
                                    ? "Top-tier school quality — strong family demand driver, commands premium pricing."
                                    : met.edfacts_proficiency > 45
                                      ? "Competitive schools — above-average quality, meaningful family household appeal."
                                      : met.edfacts_proficiency > 30
                                        ? "Average school quality — standard district, adequate for broad market."
                                        : "Below-average proficiency — school quality is a headwind for family household targeting.",
                            },
                            {
                              pct: pctile("farmland_value_acre", true),
                              metric: "Land Value",
                              sub: "USDA NASS 2017 · avg $/acre all land and buildings",
                              value:
                                met.farmland_value_acre != null
                                  ? `$${Math.round(met.farmland_value_acre).toLocaleString()}/acre`
                                  : "—",
                              interp:
                                met.farmland_value_acre == null
                                  ? "No data."
                                  : met.farmland_value_acre < 1500
                                    ? "Low land cost — strong greenfield acquisition economics, wide margin between basis and finished lot value."
                                    : met.farmland_value_acre < 4000
                                      ? "Below-average land cost — favorable acquisition basis for master-planned development."
                                      : met.farmland_value_acre < 8000
                                        ? "Moderate land cost — standard acquisition environment."
                                        : "Elevated land cost — tight margin between raw land basis and finished lot pricing.",
                            },
                            {
                              pct: pctile("permit_units_per_1k", false),
                              metric: "Permit Activity",
                              sub: "Census Building Permits 2022 · units per 1k population",
                              value:
                                met.permit_units_per_1k != null
                                  ? `${met.permit_units_per_1k.toFixed(1)}/1k`
                                  : "—",
                              interp:
                                met.permit_units_per_1k == null
                                  ? "No data."
                                  : met.permit_units_per_1k > 8
                                    ? "High permit velocity — active development market, confirmed demand absorption."
                                    : met.permit_units_per_1k > 4
                                      ? "Above-average permitting — healthy construction pipeline, market validating demand."
                                      : met.permit_units_per_1k > 1
                                        ? "Moderate activity — standard permit pace."
                                        : "Low permit activity — limited construction pipeline; either constrained demand or early-stage opportunity.",
                            },
                            {
                              pct: pctile("oes_median_wage", false),
                              metric: "Median Annual Wage",
                              sub: "BLS OES · MSA-level median annual wage across all occupations",
                              value:
                                met.oes_median_wage != null
                                  ? `$${Math.round(met.oes_median_wage).toLocaleString()}`
                                  : "—",
                              interp:
                                met.oes_median_wage == null
                                  ? "No data."
                                  : met.oes_median_wage > 65000
                                    ? "Strong wage base — household income supports premium lot and home pricing in master-planned communities."
                                    : met.oes_median_wage > 50000
                                      ? "Above-average wages — solid purchasing power for mid-to-upper price point product."
                                      : met.oes_median_wage > 40000
                                        ? "Average wage environment — standard price point addressable market."
                                        : "Below-average wages — limits achievable home pricing; may require affordability-focused product mix.",
                            },
                            {
                              pct: pctile("high_skill_emp_share", false),
                              metric: "High-Skill Employment Share",
                              sub: "BLS OES · management, professional & STEM occupations as % of total employment",
                              value:
                                met.high_skill_emp_share != null
                                  ? `${met.high_skill_emp_share.toFixed(1)}%`
                                  : "—",
                              interp:
                                met.high_skill_emp_share == null
                                  ? "No data."
                                  : met.high_skill_emp_share > 35
                                    ? "High professional density — strong knowledge-economy employment base; supports move-up buyer demand and premium pricing."
                                    : met.high_skill_emp_share > 25
                                      ? "Above-average high-skill employment — solid professional workforce, favorable buyer profile for expansion product."
                                      : met.high_skill_emp_share > 15
                                        ? "Moderate professional mix — standard employment base."
                                        : "Below-average high-skill share — limited professional workforce concentration; buyer profile skews toward workforce housing.",
                            },
                            {
                              pct: pctile("stem_jobs_pct", false),
                              metric: "STEM Occupation Share",
                              sub: "Census ACS C24010 · STEM occupations as % of total employment · higher = stronger technical employer base",
                              value:
                                met.stem_jobs_pct != null
                                  ? `${met.stem_jobs_pct.toFixed(1)}%`
                                  : "—",
                              interp:
                                met.stem_jobs_pct == null
                                  ? "No data."
                                  : met.stem_jobs_pct > 18
                                    ? "High STEM job density — strong technical employer base drives household formation and sustained income growth."
                                    : met.stem_jobs_pct > 10
                                      ? "Above-average STEM employment — meaningful technology and engineering presence supports income-qualified buyer demand."
                                      : met.stem_jobs_pct > 5
                                        ? "Moderate STEM presence — some technical employment base."
                                        : "Low STEM job density — limited technical employer presence; household income more dependent on traditional sectors.",
                            },
                            {
                              pct: pctile("vacancy_rate", true),
                              metric: "Housing Vacancy Rate",
                              sub: "Census ACS 2022 · % housing units vacant · lower = tighter supply",
                              value:
                                met.vacancy_rate != null
                                  ? `${met.vacancy_rate.toFixed(1)}%`
                                  : "—",
                              interp:
                                met.vacancy_rate == null
                                  ? "No data."
                                  : met.vacancy_rate < 5
                                    ? "Very low vacancy — critically tight supply; strong demand signal for new construction absorption."
                                    : met.vacancy_rate < 8
                                      ? "Low vacancy — constrained supply supports greenfield development pricing."
                                      : met.vacancy_rate < 12
                                        ? "Moderate vacancy — some existing supply competing with new product."
                                        : "High vacancy — significant existing supply; new product faces absorption headwind.",
                            },
                            {
                              pct: pctile("net_migration_rate", false),
                              metric: "Net Migration Rate",
                              sub: "Census ACS · net domestic/international migration as % of population",
                              value:
                                met.net_migration_rate != null
                                  ? `${met.net_migration_rate >= 0 ? "+" : ""}${met.net_migration_rate.toFixed(2)}%`
                                  : "—",
                              interp:
                                met.net_migration_rate == null
                                  ? "No data."
                                  : met.net_migration_rate > 2
                                    ? "Strong net in-migration — confirmed population influx ahead of housing supply; strong demand signal."
                                    : met.net_migration_rate > 0.5
                                      ? "Positive migration — net in-flow supports household formation thesis."
                                      : met.net_migration_rate > -0.5
                                        ? "Near-neutral migration — population relatively stable."
                                        : "Net out-migration — population leaving; demand headwind for expansion product.",
                            },
                            {
                              pct: pctile("usda_amenity_scale", false),
                              metric: "Natural Amenity Score",
                              sub: "USDA ERS · climate, topography and water area amenity index",
                              value:
                                met.usda_amenity_scale != null
                                  ? `${met.usda_amenity_scale.toFixed(1)}`
                                  : "—",
                              interp:
                                met.usda_amenity_scale == null
                                  ? "No data."
                                  : met.usda_amenity_scale > 5
                                    ? "High natural amenity — exceptional climate/landscape appeal; strong lifestyle draw for move-up and retirement buyers."
                                    : met.usda_amenity_scale > 2
                                      ? "Above-average amenity — meaningful lifestyle appeal supporting premium pricing."
                                      : met.usda_amenity_scale > 0
                                        ? "Moderate amenity — standard natural environment."
                                        : "Below-average amenity — limited natural lifestyle differentiation; product must compete on price and schools.",
                            },
                            {
                              pct: pctile("broadband_pct", false),
                              metric: "Broadband Coverage",
                              sub: "FCC BDC · % of addresses with broadband service",
                              value:
                                met.broadband_pct != null
                                  ? `${met.broadband_pct.toFixed(1)}%`
                                  : "—",
                              interp:
                                met.broadband_pct == null
                                  ? "No data."
                                  : met.broadband_pct > 90
                                    ? "Strong broadband infrastructure — essential for remote worker buyer segment and family household tech expectations."
                                    : met.broadband_pct > 70
                                      ? "Adequate coverage — functional for most buyers."
                                      : met.broadband_pct > 50
                                        ? "Partial coverage — connectivity gaps may deter remote worker buyers."
                                        : "Limited broadband — significant gap; headwind for attracting remote-work household segment.",
                            },
                            {
                              pct: pctile("fema_risk_score", true),
                              metric: "Climate Risk Score",
                              sub: "FEMA NRI · composite natural hazard risk (lower = safer)",
                              value:
                                met.fema_risk_score != null
                                  ? `${met.fema_risk_score.toFixed(0)}/100`
                                  : "—",
                              interp:
                                met.fema_risk_score == null
                                  ? "No data."
                                  : met.fema_risk_score < 20
                                    ? "Low climate risk — strong long-term asset durability; favorable for lender and buyer confidence."
                                    : met.fema_risk_score < 40
                                      ? "Below-average risk — manageable hazard profile, standard insurance environment."
                                      : met.fema_risk_score < 60
                                        ? "Moderate risk — factor into HOA reserve and insurance cost underwriting."
                                        : met.fema_risk_score < 80
                                          ? "Elevated risk — above-average insurance and resilience costs; may impact buyer qualification."
                                          : "High climate risk — significant natural hazard exposure; material impact on long-term asset value and insurability.",
                            },
                            ...(() => {
                              const zhvi = met.zhvi_latest;
                              const hhi  = met.median_hhi;
                              const stdDTI   = _housingDTI(zhvi, hhi, 0.03);
                              const apDTI    = _housingDTI(zhvi, hhi, 0.20);
                              const stdPool  = _buyerPoolPct(zhvi, hhi, 0.03);
                              const apPool   = _buyerPoolPct(zhvi, hhi, 0.20);
                              const lift     = (apPool != null && stdPool != null) ? apPool - stdPool : null;
                              const dpReach  = _downPaymentReachPct(zhvi, 0.03, hhi, 3, 0.10);
                              const stdPmt   = (zhvi && hhi) ? _totalMonthlyPayment(zhvi, 0.03) : null;
                              const apPmt    = zhvi ? _monthlyMortgage(zhvi, 0.20) : null;
                              const savings  = (stdPmt != null && apPmt != null) ? stdPmt - apPmt : null;
                              const dtiPct   = stdDTI != null ? Math.round(Math.max(0, Math.min(100, (55 - stdDTI) / (55 - 15) * 100))) : null;
                              const apDtiPct = apDTI != null ? Math.round(Math.max(0, Math.min(100, (55 - apDTI) / (55 - 15) * 100))) : null;
                              const countyLabel = (met.county_name || "").replace(/\s+County$/i, "");
                              return [
                                {
                                  pct: dtiPct,
                                  metric: "Buyer Affordability (Standard)",
                                  value: stdDTI != null ? `${stdDTI.toFixed(1)}% DTI` : "—",
                                  interp: dpReach != null
                                    ? `~${dpReach.toFixed(0)}% of ${countyLabel} households could save the 3% down payment in 3 years — the barrier is monthly cash flow, not savings. Standard financing (3% down + PMI) requires $${stdPmt != null ? Math.round(stdPmt).toLocaleString() : "—"}/mo, qualifying only ~${stdPool != null ? stdPool.toFixed(0) : "—"}% of households.`
                                    : `Standard financing at 3% down + PMI requires $${stdPmt != null ? Math.round(stdPmt).toLocaleString() : "—"}/mo (${stdDTI != null ? stdDTI.toFixed(1) : "—"}% DTI), qualifying ~${stdPool != null ? stdPool.toFixed(0) : "—"}% of households.`,
                                },
                                {
                                  pct: apDtiPct,
                                  metric: "Buyer Affordability (w/ American Pledge)",
                                  value: apDTI != null ? `${apDTI.toFixed(1)}% DTI` : "—",
                                  interp: savings != null
                                    ? `American Pledge (20% down, no PMI) saves $${Math.round(savings).toLocaleString()}/mo, reducing DTI from ${stdDTI != null ? stdDTI.toFixed(1) : "—"}% to ${apDTI != null ? apDTI.toFixed(1) : "—"}% and expanding the qualifying buyer pool from ~${stdPool != null ? stdPool.toFixed(0) : "—"}% to ~${apPool != null ? apPool.toFixed(0) : "—"}% of households${lift != null ? ` (+${lift.toFixed(0)} pts)` : ""}.`
                                    : `American Pledge reduces DTI to ${apDTI != null ? apDTI.toFixed(1) : "—"}%, qualifying ~${apPool != null ? apPool.toFixed(0) : "—"}% of households.`,
                                },
                              ];
                            })(),
                          ];

                          return (
                            <Card
                              elevation={0}
                              sx={{
                                border: `1px solid ${C.border}`,
                                borderRadius: 1,
                              }}
                            >
                              <CardContent sx={{ pb: "12px !important" }}>
                                <Box sx={{ mb: 2 }}>
                                  <Box
                                    sx={{
                                      pb: 1,
                                      borderBottom: `2px solid ${C.navy}`,
                                      width: "fit-content",
                                    }}
                                  >
                                    <Typography
                                      sx={{
                                        fontSize: 11,
                                        fontWeight: 800,
                                        color: C.navy,
                                        textTransform: "uppercase",
                                        letterSpacing: "0.09em",
                                      }}
                                    >
                                      Supplemental Signals
                                    </Typography>
                                    <Typography
                                      sx={{
                                        fontSize: 10,
                                        color: C.muted,
                                        mt: 0.25,
                                      }}
                                    >{`External data benchmarked against ${all.length.toLocaleString()}-county universe · signal = thesis impact`}</Typography>
                                  </Box>
                                </Box>
                                <Box sx={{ overflowX: "auto" }}>
                                  <table
                                    style={{
                                      width: "100%",
                                      borderCollapse: "collapse",
                                      fontSize: 12,
                                    }}
                                  >
                                    <thead>
                                      <tr>
                                        {[
                                          "Signal",
                                          "Metric",
                                          "Relative Position",
                                          "Value",
                                          "Interpretation",
                                        ].map((h) => (
                                          <th
                                            key={h}
                                            style={{
                                              padding: "6px 10px",
                                              textAlign: "left",
                                              color: C.muted,
                                              fontWeight: 700,
                                              fontSize: 10,
                                              textTransform: "uppercase",
                                              letterSpacing: "0.07em",
                                              whiteSpace: "nowrap",
                                            }}
                                          >
                                            {h}
                                          </th>
                                        ))}
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {signals.map(
                                        (
                                          { pct, metric, sub, value, interp },
                                          i,
                                        ) => {
                                          const s = sig(pct);
                                          return (
                                            <tr
                                              key={metric}
                                              style={{
                                                background:
                                                  i % 2 === 0
                                                    ? "transparent"
                                                    : C.bg,
                                                borderBottom: `1px solid ${C.border}`,
                                              }}
                                            >
                                              <td
                                                style={{
                                                  padding: "10px 10px",
                                                  verticalAlign: "top",
                                                  whiteSpace: "nowrap",
                                                }}
                                              >
                                                <span
                                                  style={{
                                                    fontSize: 10,
                                                    fontWeight: 700,
                                                    color: s.color,
                                                    background: s.bg,
                                                    border: `1px solid ${s.color}55`,
                                                    borderRadius: 4,
                                                    padding: "2px 8px",
                                                  }}
                                                >
                                                  {s.label}
                                                </span>
                                              </td>
                                              <td
                                                style={{
                                                  padding: "10px 10px",
                                                  verticalAlign: "top",
                                                  minWidth: 160,
                                                }}
                                              >
                                                <div
                                                  style={{
                                                    fontWeight: 700,
                                                    color: C.charcoal,
                                                    fontSize: 12,
                                                  }}
                                                >
                                                  {metric}
                                                </div>
                                                <div
                                                  style={{
                                                    fontSize: 10,
                                                    color: C.muted,
                                                    marginTop: 2,
                                                  }}
                                                >
                                                  {sub}
                                                </div>
                                              </td>
                                              <td
                                                style={{
                                                  padding:
                                                    "10px 14px 10px 10px",
                                                  verticalAlign: "top",
                                                  minWidth: 140,
                                                }}
                                              >
                                                {pct != null ? (
                                                  <Box
                                                    sx={{
                                                      display: "flex",
                                                      alignItems: "center",
                                                      gap: 1,
                                                    }}
                                                  >
                                                    <Box
                                                      sx={{
                                                        flex: 1,
                                                        height: 6,
                                                        background: C.border,
                                                        borderRadius: 3,
                                                        minWidth: 80,
                                                      }}
                                                    >
                                                      <Box
                                                        sx={{
                                                          width: `${pct}%`,
                                                          height: "100%",
                                                          background: s.color,
                                                          borderRadius: 3,
                                                          transition:
                                                            "width 0.5s cubic-bezier(0.4,0,0.2,1), background-color 0.3s ease",
                                                        }}
                                                      />
                                                    </Box>
                                                    <span
                                                      style={{
                                                        fontSize: 10,
                                                        color: C.muted,
                                                        minWidth: 30,
                                                      }}
                                                    >
                                                      {pct}th
                                                    </span>
                                                  </Box>
                                                ) : (
                                                  <span
                                                    style={{
                                                      fontSize: 10,
                                                      color: C.muted,
                                                    }}
                                                  >
                                                    —
                                                  </span>
                                                )}
                                              </td>
                                              <td
                                                style={{
                                                  padding: "10px 10px",
                                                  verticalAlign: "top",
                                                  whiteSpace: "nowrap",
                                                }}
                                              >
                                                <span
                                                  style={{
                                                    fontWeight: 700,
                                                    color:
                                                      s.color === C.muted
                                                        ? C.charcoal
                                                        : s.color,
                                                    fontSize: 13,
                                                  }}
                                                >
                                                  {value}
                                                </span>
                                              </td>
                                              <td
                                                style={{
                                                  padding: "10px 10px",
                                                  verticalAlign: "top",
                                                  color: C.muted,
                                                  fontSize: 11,
                                                  lineHeight: 1.5,
                                                  maxWidth: 220,
                                                }}
                                              >
                                                {interp}
                                              </td>
                                            </tr>
                                          );
                                        },
                                      )}
                                    </tbody>
                                  </table>
                                </Box>
                              </CardContent>
                            </Card>
                          );
                        })()}
                    </Box>
                  )}

                  {/* ── Formation Markets Pane (right: county detail only) ── */}
                  {chartPane === "formation" && (() => {
                    if (!groundScoreData) return groundScoreLoading ? (
                      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, pt: 6 }}>
                        <l-helix size="60" speed="2.5" color={C.navy}></l-helix>
                        <Typography sx={{ fontSize: 9, fontWeight: 600, color: C.muted, letterSpacing: "0.08em", textTransform: "uppercase" }}>Loading Ground Score Intelligence</Typography>
                      </Box>
                    ) : null;
                    const allCounties = [...groundScoreData.activation]
                      .map(c => { const fs = _formationScore(c.metrics); return fs ? { ...c, formationScore: fs } : null; })
                      .filter(Boolean).sort((a, b) => b.formationScore.composite - a.formationScore.composite);
                    const selFips = formationSelectedFips || allCounties[0]?.fips || null;
                    const selCounty = allCounties.find(c => c.fips === selFips) || allCounties[0];
                    if (!selCounty) return null;
                    const fs = selCounty.formationScore;
                    const met = selCounty.metrics;
                    const rank = allCounties.findIndex(c => c.fips === selFips) + 1;
                    return (
                      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
                        <Card elevation={0} sx={{ border: `1px solid ${C.blue}`, borderRadius: 1, overflow: "hidden" }}>
                          <Box sx={{ background: C.blue, px: 2, py: 1.25, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
                            <Box>
                              <Typography sx={{ fontSize: 11, fontWeight: 800, color: C.white, textTransform: "uppercase", letterSpacing: "0.09em" }}>
                                {selCounty.name}, {selCounty.state} · Formation Profile
                              </Typography>
                              <Typography sx={{ fontSize: 10, color: "rgba(255,255,255,0.6)", mt: 0.25 }}>
                                rank #{rank} of {allCounties.length.toLocaleString()} · composite {fs.composite.toFixed(1)}
                              </Typography>
                            </Box>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                              <span style={{ fontSize: 10, fontWeight: 700, color: C.blue, background: C.white, border: `1px solid ${C.white}`, borderRadius: 4, padding: "3px 10px" }}>{fs.tier}</span>
                              {!deepDives[`formation:${selCounty.fips}`] && (
                                <button
                                  onClick={() => requestDeepDive({ fips: selCounty.fips, name: selCounty.name, state: selCounty.state, composite: fs.composite, rank, tier: fs.tier, population: selCounty.population, dims: Object.fromEntries(fs.dims.map(d => [d.id, d.score * 100])), metrics: met }, "formation")}
                                  disabled={deepDiveLoading === `formation:${selCounty.fips}`}
                                  style={{ fontSize: 10, fontWeight: 700, color: C.white, background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.4)", borderRadius: 4, padding: "3px 10px", cursor: "pointer", whiteSpace: "nowrap", fontFamily: "'Inter',sans-serif" }}
                                >
                                  {deepDiveLoading === `formation:${selCounty.fips}` ? "Generating…" : "Deep Dive"}
                                </button>
                              )}
                            </Box>
                          </Box>
                          <CardContent sx={{ pb: "12px !important" }}>
                            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 1.5 }}>
                              {fs.dims.map(d => {
                                const dc = d.score >= 0.65 ? C.greenLight : d.score >= 0.38 ? "#f0a500" : "#e57373";
                                return (
                                  <Box key={d.id} sx={{ flex: "1 1 110px", minWidth: 100, border: `1px solid ${dc}44`, borderRadius: 1, p: 1, background: dc + "0d" }}>
                                    <Typography sx={{ fontSize: 9, color: C.muted, fontWeight: 600, mb: 0.25 }}>{d.label}</Typography>
                                    <Typography sx={{ fontSize: 14, fontWeight: 700, color: dc, lineHeight: 1.1 }}>{d.value ?? "—"}</Typography>
                                    <Typography sx={{ fontSize: 8, color: C.muted, mt: 0.25, lineHeight: 1.4 }}>{d.detail}</Typography>
                                  </Box>
                                );
                              })}
                            </Box>
                            {(() => {
                              const text = deepDives[`formation:${selCounty.fips}`] || _formationNarrative(selCounty.name, selCounty.state, met, fs, rank, allCounties.length);
                              return text ? <Box sx={{ mb: 1.5 }}>{renderDeepDive(text)}</Box> : null;
                            })()}
                            <Typography sx={{ fontSize: 9, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.07em", mb: 0.75 }}>Key Metrics</Typography>
                            <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                              {[
                                { label: "Home Value", value: met?.zhvi_latest ? `$${(met.zhvi_latest / 1000).toFixed(0)}k` : "—" },
                                { label: "Median HHI", value: met?.median_hhi ? `$${(met.median_hhi / 1000).toFixed(0)}k` : "—" },
                                { label: "Unemployment", value: met?.unemployment_rate != null ? `${met.unemployment_rate.toFixed(1)}%` : "—" },
                                { label: "Emp Growth", value: met?.emp_growth_pct != null ? `${met.emp_growth_pct >= 0 ? "+" : ""}${met.emp_growth_pct.toFixed(1)}%` : "—" },
                                { label: "Pop Density", value: met?.pop_density != null ? `${met.pop_density.toFixed(0)}/mi²` : "—" },
                                { label: "Land Value", value: met?.farmland_value_acre != null ? `$${(met.farmland_value_acre / 1000).toFixed(1)}k/ac` : "—" },
                                { label: "Permits/1k", value: met?.permit_units_per_1k != null ? `${met.permit_units_per_1k.toFixed(1)}` : "—" },
                                { label: "FEMA Risk", value: met?.fema_risk_score != null ? `${met.fema_risk_score.toFixed(0)}/100` : "—" },
                              ].map(({ label, value }) => (
                                <Box key={label} sx={{ flex: "1 1 90px", minWidth: 85, border: `1px solid ${C.border}`, borderRadius: 1, p: 0.75 }}>
                                  <Typography sx={{ fontSize: 8, color: C.muted, fontWeight: 600 }}>{label}</Typography>
                                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: C.charcoal }}>{value}</Typography>
                                </Box>
                              ))}
                            </Box>
                          </CardContent>
                        </Card>
                      </Box>
                    );
                  })()}

                  {/* ── Engineered Markets Pane (right: employer profile inputs + county detail) ── */}
                  {chartPane === "engineered" && (() => {
                    if (!groundScoreData) return groundScoreLoading ? (
                      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, pt: 6 }}>
                        <l-helix size="60" speed="2.5" color={C.navy}></l-helix>
                        <Typography sx={{ fontSize: 9, fontWeight: 600, color: C.muted, letterSpacing: "0.08em", textTransform: "uppercase" }}>Loading Ground Score Intelligence</Typography>
                      </Box>
                    ) : null;
                    const INDUSTRY_OPTS = [
                      { v: "manufacturing", label: "Manufacturing" },
                      { v: "logistics",     label: "Logistics / Distribution" },
                      { v: "tech",          label: "Technology / R&D" },
                      { v: "healthcare",    label: "Healthcare / Medical" },
                      { v: "mixed",         label: "Mixed Use / Other" },
                    ];
                    const WAGE_OPTS = [
                      { v: "low",      label: "Entry-level (<$45k)" },
                      { v: "moderate", label: "Moderate ($45k–$80k)" },
                      { v: "high",     label: "Professional (>$80k)" },
                    ];
                    const allCounties = [...groundScoreData.activation]
                      .map(c => { const es = _engineeredScore(c.metrics, engineeredProfile); return es ? { ...c, engineeredScore: es } : null; })
                      .filter(Boolean).sort((a, b) => b.engineeredScore.composite - a.engineeredScore.composite);
                    const selFips = engineeredSelectedFips || allCounties[0]?.fips || null;
                    const selCounty = allCounties.find(c => c.fips === selFips) || allCounties[0];
                    return (
                      <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
                        {/* Employer Profile Inputs */}
                        <Card elevation={0} sx={{ border: `1px solid ${C.border}`, borderRadius: 1 }}>
                          <CardContent sx={{ pb: "12px !important" }}>
                            <Typography sx={{ fontSize: 9, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.07em", mb: 1 }}>
                              Employer Profile — Site Optimizer Inputs
                            </Typography>
                            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", alignItems: "flex-start" }}>
                              <Box sx={{ flex: "1 1 140px", minWidth: 130 }}>
                                <Typography sx={{ fontSize: 9, color: C.muted, fontWeight: 600, mb: 0.5 }}>Employer Industry</Typography>
                                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
                                  {INDUSTRY_OPTS.map(({ v, label }) => (
                                    <button key={v} onClick={() => setEngineeredProfile(p => ({ ...p, industry: v }))} style={{ fontSize: 10, fontWeight: 600, textAlign: "left", padding: "4px 10px", border: `1px solid ${engineeredProfile.industry === v ? C.orange : C.border}`, borderRadius: 4, background: engineeredProfile.industry === v ? C.orange + "18" : "transparent", color: engineeredProfile.industry === v ? C.orange : C.muted, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>{label}</button>
                                  ))}
                                </Box>
                              </Box>
                              <Box sx={{ flex: "1 1 140px", minWidth: 130 }}>
                                <Typography sx={{ fontSize: 9, color: C.muted, fontWeight: 600, mb: 0.5 }}>Target Wage Level</Typography>
                                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
                                  {WAGE_OPTS.map(({ v, label }) => (
                                    <button key={v} onClick={() => setEngineeredProfile(p => ({ ...p, wageLevel: v }))} style={{ fontSize: 10, fontWeight: 600, textAlign: "left", padding: "4px 10px", border: `1px solid ${engineeredProfile.wageLevel === v ? C.orange : C.border}`, borderRadius: 4, background: engineeredProfile.wageLevel === v ? C.orange + "18" : "transparent", color: engineeredProfile.wageLevel === v ? C.orange : C.muted, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>{label}</button>
                                  ))}
                                </Box>
                              </Box>
                              <Box sx={{ flex: "1 1 140px", minWidth: 130 }}>
                                <Typography sx={{ fontSize: 9, color: C.muted, fontWeight: 600, mb: 0.5 }}>Land Cost Priority</Typography>
                                <button onClick={() => setEngineeredProfile(p => ({ ...p, landPriority: !p.landPriority }))} style={{ fontSize: 10, fontWeight: 700, padding: "5px 14px", border: `1px solid ${engineeredProfile.landPriority ? C.orange : C.border}`, borderRadius: 4, background: engineeredProfile.landPriority ? C.orange + "18" : "transparent", color: engineeredProfile.landPriority ? C.orange : C.muted, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}>
                                  {engineeredProfile.landPriority ? "Critical (high weight)" : "Standard (base weight)"}
                                </button>
                                <Typography sx={{ fontSize: 8, color: C.muted, mt: 0.75, mb: 0.5, fontWeight: 600 }}>Active Weights</Typography>
                                {[["Available Workforce","30%"],["Land & Dev Cost", engineeredProfile.landPriority ? "25%" : "15%"],["Infrastructure","20%"],["Growth Momentum","15%"],["AP Absorption","10%"]].map(([dim, wt]) => (
                                  <Box key={dim} sx={{ display: "flex", justifyContent: "space-between", mb: 0.2 }}>
                                    <Typography sx={{ fontSize: 8, color: C.muted }}>{dim}</Typography>
                                    <Typography sx={{ fontSize: 8, fontWeight: 700, color: C.charcoal }}>{wt}</Typography>
                                  </Box>
                                ))}
                              </Box>
                            </Box>
                          </CardContent>
                        </Card>
                        {/* County Detail */}
                        {selCounty && (() => {
                          const es = selCounty.engineeredScore;
                          const met = selCounty.metrics;
                          const rank = allCounties.findIndex(c => c.fips === selFips) + 1;
                          return (
                            <Card elevation={0} sx={{ border: `1px solid ${C.orange}`, borderRadius: 1, overflow: "hidden" }}>
                              <Box sx={{ background: C.orange, px: 2, py: 1.25, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1 }}>
                                <Box>
                                  <Typography sx={{ fontSize: 11, fontWeight: 800, color: C.white, textTransform: "uppercase", letterSpacing: "0.09em" }}>
                                    {selCounty.name}, {selCounty.state} · Site Profile
                                  </Typography>
                                  <Typography sx={{ fontSize: 10, color: "rgba(255,255,255,0.7)", mt: 0.25 }}>
                                    rank #{rank} of {allCounties.length.toLocaleString()} · composite {es.composite.toFixed(1)} · {INDUSTRY_OPTS.find(o => o.v === engineeredProfile.industry)?.label}
                                  </Typography>
                                </Box>
                                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                                  <span style={{ fontSize: 10, fontWeight: 700, color: C.orange, background: C.white, border: `1px solid ${C.white}`, borderRadius: 4, padding: "3px 10px" }}>{es.tier}</span>
                                  {!deepDives[`engineered:${selCounty.fips}`] && (
                                    <button
                                      onClick={() => requestDeepDive({ fips: selCounty.fips, name: selCounty.name, state: selCounty.state, composite: es.composite, rank, tier: es.tier, population: selCounty.population, dims: Object.fromEntries(es.dims.map(d => [d.id, d.score * 100])), metrics: met }, "engineered")}
                                      disabled={deepDiveLoading === `engineered:${selCounty.fips}`}
                                      style={{ fontSize: 10, fontWeight: 700, color: C.white, background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.4)", borderRadius: 4, padding: "3px 10px", cursor: "pointer", whiteSpace: "nowrap", fontFamily: "'Inter',sans-serif" }}
                                    >
                                      {deepDiveLoading === `engineered:${selCounty.fips}` ? "Generating…" : "Deep Dive"}
                                    </button>
                                  )}
                                </Box>
                              </Box>
                              <CardContent sx={{ pb: "12px !important" }}>
                                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 1.5 }}>
                                  {es.dims.map(d => {
                                    const dc = d.score >= 0.65 ? C.greenLight : d.score >= 0.38 ? "#f0a500" : "#e57373";
                                    return (
                                      <Box key={d.id} sx={{ flex: "1 1 110px", minWidth: 100, border: `1px solid ${dc}44`, borderRadius: 1, p: 1, background: dc + "0d" }}>
                                        <Typography sx={{ fontSize: 9, color: C.muted, fontWeight: 600, mb: 0.25 }}>{d.label}</Typography>
                                        <Typography sx={{ fontSize: 14, fontWeight: 700, color: dc, lineHeight: 1.1 }}>{d.value ?? "—"}</Typography>
                                        <Typography sx={{ fontSize: 8, color: C.muted, mt: 0.25, lineHeight: 1.4 }}>{d.detail}</Typography>
                                      </Box>
                                    );
                                  })}
                                </Box>
                                {(() => {
                                  const text = deepDives[`engineered:${selCounty.fips}`] || _engineeredNarrative(selCounty.name, selCounty.state, met, es, rank, allCounties.length, engineeredProfile);
                                  return text ? <Box sx={{ mb: 1.5 }}>{renderDeepDive(text)}</Box> : null;
                                })()}
                                <Typography sx={{ fontSize: 9, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.07em", mb: 0.75 }}>Site Intelligence</Typography>
                                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                                  {[
                                    { label: "Unemployment", value: met?.unemployment_rate != null ? `${met.unemployment_rate.toFixed(1)}%` : "—" },
                                    { label: "Labor Force", value: met?.lfpr != null ? `${met.lfpr.toFixed(1)}% LFPR` : "—" },
                                    { label: "Total Jobs", value: met?.total_employment ? `${(met.total_employment / 1000).toFixed(0)}k` : "—" },
                                    { label: "Land Value", value: met?.farmland_value_acre != null ? `$${(met.farmland_value_acre / 1000).toFixed(1)}k/ac` : "—" },
                                    { label: "Pop Density", value: met?.pop_density != null ? `${met.pop_density.toFixed(0)}/mi²` : "—" },
                                    { label: "Broadband", value: met?.broadband_pct != null ? `${met.broadband_pct.toFixed(0)}%` : "—" },
                                    { label: "Metro Drive", value: met?.drive_min_nearest_metro != null ? `${met.drive_min_nearest_metro.toFixed(0)} min` : "—" },
                                    { label: "Median Wage", value: met?.oes_median_wage ? `$${(met.oes_median_wage / 1000).toFixed(0)}k` : "—" },
                                    { label: "Median HHI", value: met?.median_hhi ? `$${(met.median_hhi / 1000).toFixed(0)}k` : "—" },
                                    { label: "Home Value", value: met?.zhvi_latest ? `$${(met.zhvi_latest / 1000).toFixed(0)}k` : "—" },
                                  ].map(({ label, value }) => (
                                    <Box key={label} sx={{ flex: "1 1 90px", minWidth: 85, border: `1px solid ${C.border}`, borderRadius: 1, p: 0.75 }}>
                                      <Typography sx={{ fontSize: 8, color: C.muted, fontWeight: 600 }}>{label}</Typography>
                                      <Typography sx={{ fontSize: 12, fontWeight: 700, color: C.charcoal }}>{value}</Typography>
                                    </Box>
                                  ))}
                                </Box>
                              </CardContent>
                            </Card>
                          );
                        })()}
                      </Box>
                    );
                  })()}

                  {/* ── Coordinated Markets Pane ── */}
                  {chartPane === "coordinated" && (
                    <Box sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>

                      {/* Loading — helix, same pattern as activation/expansion right pane */}
                      {groundScoreLoading && (
                        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, pt: 6 }}>
                          <l-helix size="60" speed="2.5" color={C.navy}></l-helix>
                          <Typography sx={{ fontSize: 9, fontWeight: 600, color: C.muted, letterSpacing: "0.08em", textTransform: "uppercase" }}>Loading Ground Score Intelligence</Typography>
                        </Box>
                      )}

                      {/* Overview — shown when no county selected */}
                      {groundScoreData && !coordSelectedFips && (
                        <Card elevation={0} sx={{ border: `1px solid ${C.navy}`, borderRadius: 1, overflow: "hidden" }}>
                          <Box sx={{ background: C.navy, px: 2, py: 1.25 }}>
                            <Typography sx={{ fontSize: 11, fontWeight: 800, color: C.white, textTransform: "uppercase", letterSpacing: "0.09em" }}>
                              Coordinated Markets Intelligence
                            </Typography>
                            <Typography sx={{ fontSize: 10, color: "rgba(255,255,255,0.6)", mt: 0.25 }}>
                              Identify Activation–Expansion county pairs where coordinated investment compounds both theses
                            </Typography>
                          </Box>
                          <CardContent sx={{ pb: "12px !important" }}>
                            <Typography sx={{ fontSize: 12, color: C.charcoal, lineHeight: 1.7 }}>
                              When the catalyst underpinning an Activation position fires — an employer anchor, federal
                              infrastructure award, or logistics build-out — the resulting job creation and in-migration
                              tend to spill into adjacent affordable fringe counties. An investor already positioned in
                              both markets captures the direct economic impact in the Activation county and the housing
                              demand overspill in the Expansion county, running both sides of the same catalyst event.
                            </Typography>
                            <Typography sx={{ fontSize: 12, color: C.charcoal, lineHeight: 1.7, mt: 1.5 }}>
                              The scatter below plots every scored county on both theses simultaneously. Counties in the
                              upper-right quadrant are self-reinforcing. Counties high on Activation but moderate on
                              Expansion are prime handoff candidates. Click any county or select a pre-identified pair
                              from the table to load the coordination profile.
                            </Typography>
                          </CardContent>
                        </Card>
                      )}

                      {/* Selected County / Pair Detail */}
                      {groundScoreData && coordSelectedFips && (() => {
                        const act = groundScoreData.activation.find(c => c.fips === coordSelectedFips);
                        // If selected from pairs table, use the paired exp county; else same fips (scatter click)
                        const expFips = coordSelectedExpFips || coordSelectedFips;
                        const exp = groundScoreData.expansion.find(c => c.fips === expFips);
                        if (!act || !exp) return null;
                        const isPair = coordSelectedExpFips && coordSelectedExpFips !== coordSelectedFips;
                        const actMeta = NEOPOLI_TIER_META[act.tier] || NEOPOLI_TIER_META.watchlist;
                        const expMeta = NEOPOLI_TIER_META[exp.tier] || NEOPOLI_TIER_META.watchlist;
                        const actHigh = act.composite >= 60;
                        const expHigh = exp.composite >= 60;
                        const coordType = actHigh && expHigh ? "self_reinforcing" : actHigh ? "activation_handoff" : expHigh ? "expansion_foundation" : "watch_wait";
                        const coordColor = coordType === "self_reinforcing" ? C.greenLight : coordType === "activation_handoff" ? C.orange : C.blue;
                        const coordInsight = isPair ? {
                          self_reinforcing: `${act.name} and ${exp.name} form a self-reinforcing pair — both score in the top tier on their respective theses. Activation capital deployed in ${act.name} will directly amplify ${exp.name}'s Expansion fundamentals through job creation, wage growth, and workforce housing demand.`,
                          activation_handoff: `${act.name} is a high-confidence Activation market (${act.composite.toFixed(1)}) adjacent to ${exp.name}, which shows emerging Expansion potential (${exp.composite.toFixed(1)}). Catalyst activity in ${act.name} — employer anchors, federal awards, infrastructure — is the proximate driver that should unlock ${exp.name}'s housing demand and population migration.`,
                          expansion_foundation: `${exp.name} is a high-confidence Expansion market (${exp.composite.toFixed(1)}) adjacent to ${act.name} (Activation: ${act.composite.toFixed(1)}). An Activation investor targeting ${act.name}'s distressed basis can inject the employment and catalyst signals ${exp.name} needs to fully unlock its Expansion thesis.`,
                          watch_wait: `Neither ${act.name} nor ${exp.name} is currently positioned strongly. Monitor for a triggering event — a major employer announcement, federal infrastructure award, or OZ deployment — that could rapidly upgrade one or both composites.`,
                        }[coordType] : {
                          self_reinforcing: `${act.name} scores strongly on both theses — a rare self-reinforcing opportunity where Activation and Expansion capital can compound each other's returns within the same county.`,
                          activation_handoff: `${act.name}'s Activation thesis is strong (${act.composite.toFixed(1)}) while its own Expansion score is moderate (${exp.composite.toFixed(1)}). Select a pair row to see its specific adjacent Expansion market.`,
                          expansion_foundation: `${act.name}'s Expansion fundamentals are strong (${exp.composite.toFixed(1)}) relative to Activation depth (${act.composite.toFixed(1)}). Select a pair row to see the adjacent Activation market that could inject the catalyst it needs.`,
                          watch_wait: `${act.name} is not currently positioned strongly on either thesis. Select a pair row for adjacency context.`,
                        }[coordType];

                        const actDive = deepDives[`activation:${act.fips}`];
                        const expDive = isPair ? deepDives[`expansion:${exp.fips}`] : null;

                        // Extract opening paragraph (text before first section header or ---)
                        const divePreview = (text) => {
                          if (!text) return null;
                          const lines = text.split('\n');
                          const endIdx = lines.findIndex((l, i) => i > 0 && (/^\*\*[A-Z]/.test(l.trim()) || /^---+$/.test(l.trim())));
                          return endIdx > 0 ? lines.slice(0, endIdx).join('\n').trim() : lines.slice(0, 4).join('\n').trim();
                        };

                        const DimBars = ({ county, dims }) => (
                          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                            {dims.map(dim => {
                              const s = county.dims[dim.id] ?? 0;
                              const bc = s >= 75 ? C.greenLight : s >= 50 ? C.blue : s >= 25 ? C.orange : C.red;
                              return (
                                <Box key={dim.id}>
                                  <Box sx={{ display: "flex", justifyContent: "space-between", mb: 0.3 }}>
                                    <span style={{ fontSize: 10, color: C.charcoal }}>{dim.label}</span>
                                    <span style={{ fontSize: 10, fontWeight: 700, color: bc }}>{s.toFixed(0)}</span>
                                  </Box>
                                  <Box sx={{ height: 4, background: C.border, borderRadius: 2 }}>
                                    <Box sx={{ width: `${s}%`, height: "100%", background: bc, borderRadius: 2 }} />
                                  </Box>
                                </Box>
                              );
                            })}
                          </Box>
                        );

                        return (
                          <>
                            {/* Pair header card */}
                            <Card elevation={0} sx={{ border: `1px solid ${C.navy}`, borderRadius: 1, overflow: "hidden" }}>
                              <Box sx={{ background: C.navy, px: 2, py: 1.25, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <Box>
                                  <Typography sx={{ fontSize: 13, fontWeight: 800, color: C.white, lineHeight: 1.3 }}>
                                    {act.name}, {act.state}
                                    {isPair && <span style={{ color: "rgba(255,255,255,0.4)", margin: "0 8px", fontWeight: 400 }}>→</span>}
                                    {isPair && `${exp.name}, ${exp.state}`}
                                  </Typography>
                                  <Typography sx={{ fontSize: 10, color: "rgba(255,255,255,0.55)", mt: 0.25 }}>
                                    {isPair ? "Activation → Expansion adjacent pair · click another row to change" : "dual-thesis analysis · click a pair row for specific adjacency context"}
                                  </Typography>
                                </Box>
                                <button onClick={() => { setCoordSelectedFips(null); setCoordSelectedExpFips(null); }} style={{ fontSize: 10, padding: "3px 8px", border: "1px solid rgba(255,255,255,0.3)", borderRadius: 4, background: "transparent", color: "rgba(255,255,255,0.7)", cursor: "pointer", fontFamily: "'Inter',sans-serif", flexShrink: 0 }}>✕ Clear</button>
                              </Box>
                              <CardContent sx={{ pb: "12px !important" }}>
                                {/* Coordination type + insight */}
                                <Box sx={{ mb: 2, p: 1.25, background: coordColor + "0d", borderRadius: 1, border: `1px solid ${coordColor}33` }}>
                                  <Typography sx={{ fontSize: 10, fontWeight: 700, color: coordColor, textTransform: "uppercase", letterSpacing: "0.08em", mb: 0.5 }}>
                                    {coordType.replace(/_/g, " ")}
                                  </Typography>
                                  <Typography sx={{ fontSize: 11, color: C.charcoal, lineHeight: 1.7 }}>{coordInsight}</Typography>
                                </Box>

                                {/* Side-by-side county panels */}
                                <Box sx={{ display: "flex", gap: 2 }}>
                                  {/* Activation county */}
                                  <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Box sx={{ pb: 1, mb: 1.5, borderBottom: `2px solid ${C.navy}` }}>
                                      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.25 }}>
                                        <Typography sx={{ fontSize: 10, fontWeight: 800, color: C.navy, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                                          {isPair ? `${act.name}, ${act.state}` : "Activation"}
                                        </Typography>
                                        <span style={{ fontSize: 10, fontWeight: 700, color: actMeta.color, background: actMeta.color + "18", border: `1px solid ${actMeta.color}44`, borderRadius: 4, padding: "2px 6px" }}>{actMeta.label}</span>
                                      </Box>
                                      <Typography sx={{ fontSize: 9, color: C.muted }}>Activation thesis · rank #{act.rank} of {groundScoreData.activation.length.toLocaleString()}</Typography>
                                      <Typography sx={{ fontSize: 20, fontWeight: 800, color: C.navy, lineHeight: 1.1, mt: 0.5 }}>{act.composite.toFixed(1)}<span style={{ fontSize: 11, fontWeight: 400, color: C.muted, marginLeft: 4 }}>/100</span></Typography>
                                    </Box>
                                    <DimBars county={act} dims={NEOPOLI_DIMS} />
                                    {actDive ? (
                                      <Box sx={{ mt: 2, pt: 1.5, borderTop: `1px solid ${C.border}` }}>
                                        <Typography sx={{ fontSize: 9, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.07em", mb: 1 }}>Activation Brief</Typography>
                                        {renderDeepDive(coordDiveExpanded ? actDive : divePreview(actDive))}
                                        <button onClick={() => setCoordDiveExpanded(v => !v)} style={{ marginTop: 6, fontSize: 10, color: C.navy, background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "'Inter',sans-serif", fontWeight: 600 }}>
                                          {coordDiveExpanded ? "Show less ▲" : "Read more ▼"}
                                        </button>
                                      </Box>
                                    ) : (
                                      <Box sx={{ mt: 2 }}>
                                        <button
                                          onClick={() => requestDeepDive(act, "activation")}
                                          disabled={deepDiveLoading === `activation:${act.fips}`}
                                          style={{ fontSize: 10, padding: "4px 10px", border: `1px solid ${C.border}`, borderRadius: 4, background: "transparent", color: C.muted, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}
                                        >{deepDiveLoading === `activation:${act.fips}` ? "Generating…" : "Generate Activation Brief"}</button>
                                      </Box>
                                    )}
                                  </Box>

                                  <Box sx={{ width: "1px", flexShrink: 0, background: C.border, alignSelf: "stretch" }} />

                                  {/* Expansion county */}
                                  <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Box sx={{ pb: 1, mb: 1.5, borderBottom: `2px solid ${C.greenLight}` }}>
                                      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.25 }}>
                                        <Typography sx={{ fontSize: 10, fontWeight: 800, color: C.greenLight, textTransform: "uppercase", letterSpacing: "0.07em" }}>
                                          {isPair ? `${exp.name}, ${exp.state}` : "Expansion (same county)"}
                                        </Typography>
                                        <span style={{ fontSize: 10, fontWeight: 700, color: expMeta.color, background: expMeta.color + "18", border: `1px solid ${expMeta.color}44`, borderRadius: 4, padding: "2px 6px" }}>{expMeta.label}</span>
                                      </Box>
                                      <Typography sx={{ fontSize: 9, color: C.muted }}>Expansion thesis · rank #{exp.rank} of {groundScoreData.expansion.length.toLocaleString()}</Typography>
                                      <Typography sx={{ fontSize: 20, fontWeight: 800, color: C.navy, lineHeight: 1.1, mt: 0.5 }}>{exp.composite.toFixed(1)}<span style={{ fontSize: 11, fontWeight: 400, color: C.muted, marginLeft: 4 }}>/100</span></Typography>
                                    </Box>
                                    <DimBars county={exp} dims={OPPORTUNITY_DIMS} />
                                    {expDive ? (
                                      <Box sx={{ mt: 2, pt: 1.5, borderTop: `1px solid ${C.border}` }}>
                                        <Typography sx={{ fontSize: 9, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: "0.07em", mb: 1 }}>Expansion Brief</Typography>
                                        {renderDeepDive(coordDiveExpanded ? expDive : divePreview(expDive))}
                                        <button onClick={() => setCoordDiveExpanded(v => !v)} style={{ marginTop: 6, fontSize: 10, color: C.navy, background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "'Inter',sans-serif", fontWeight: 600 }}>
                                          {coordDiveExpanded ? "Show less ▲" : "Read more ▼"}
                                        </button>
                                      </Box>
                                    ) : isPair ? (
                                      <Box sx={{ mt: 2 }}>
                                        <button
                                          onClick={() => requestDeepDive(exp, "expansion")}
                                          disabled={deepDiveLoading === `expansion:${exp.fips}`}
                                          style={{ fontSize: 10, padding: "4px 10px", border: `1px solid ${C.border}`, borderRadius: 4, background: "transparent", color: C.muted, cursor: "pointer", fontFamily: "'Inter',sans-serif" }}
                                        >{deepDiveLoading === `expansion:${exp.fips}` ? "Generating…" : "Generate Expansion Brief"}</button>
                                      </Box>
                                    ) : null}
                                  </Box>
                                </Box>
                              </CardContent>
                            </Card>
                          </>
                        );
                      })()}

                      {/* Catalyst Simulator */}
                      {groundScoreData &&
                        coordSelectedFips &&
                        (() => {
                          const thesis = coordSimThesis;
                          const counties =
                            thesis === "activation"
                              ? groundScoreData.activation
                              : groundScoreData.expansion;
                          const dims =
                            thesis === "activation"
                              ? NEOPOLI_DIMS
                              : OPPORTUNITY_DIMS;
                          const county = counties.find(
                            (c) => c.fips === coordSelectedFips,
                          );
                          if (!county) return null;

                          // Compute simulated composite
                          const simDims = dims.map((d) => {
                            const base = county.dims[d.id] ?? 0;
                            const delta = coordSimDeltas[d.id] || 0;
                            return {
                              ...d,
                              base,
                              simScore: Math.min(
                                100,
                                Math.max(0, base + delta),
                              ),
                            };
                          });
                          const totalWeight = simDims.reduce(
                            (s, d) => s + d.weight,
                            0,
                          );
                          const simComposite =
                            simDims.reduce(
                              (s, d) => s + d.simScore * d.weight,
                              0,
                            ) / totalWeight;

                          // Estimate simulated tier from universe percentile
                          const allComposites = counties
                            .map((c) => c.composite)
                            .sort((a, b) => a - b);
                          const simPct =
                            (allComposites.filter((v) => v < simComposite)
                              .length /
                              allComposites.length) *
                            100;
                          const simTier =
                            simPct >= 95
                              ? "lead_market"
                              : simPct >= 80
                                ? "priority_market"
                                : simPct >= 50
                                  ? "watchlist"
                                  : "deprioritized";
                          const simMeta =
                            NEOPOLI_TIER_META[simTier] ||
                            NEOPOLI_TIER_META.watchlist;
                          const baseTierMeta =
                            NEOPOLI_TIER_META[county.tier] ||
                            NEOPOLI_TIER_META.watchlist;

                          return (
                            <Card
                              elevation={0}
                              sx={{
                                border: `1px solid ${C.border}`,
                                borderRadius: 1,
                              }}
                            >
                              <CardContent sx={{ pb: "12px !important" }}>
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "flex-start",
                                    justifyContent: "space-between",
                                    mb: 1.5,
                                    flexWrap: "wrap",
                                    gap: 1,
                                  }}
                                >
                                  <Box sx={{ maxWidth: "55%" }}>
                                    <SectionHeader
                                      title="Catalyst Simulator"
                                      sub="Adjust dimension scores to model the effect of coordinated investment — e.g. what happens if you inject a major employer or federal award"
                                    />
                                  </Box>
                                  <Box sx={{ display: "flex", gap: 0 }}>
                                    {[
                                      ["activation", "Activation"],
                                      ["expansion", "Expansion"],
                                    ].map(([v, label]) => (
                                      <button
                                        key={v}
                                        onClick={() => {
                                          setCoordSimThesis(v);
                                          setCoordSimDeltas({});
                                        }}
                                        style={{
                                          fontSize: 10,
                                          fontWeight: 600,
                                          padding: "3px 10px",
                                          border: `1px solid ${C.border}`,
                                          fontFamily: "'Inter',sans-serif",
                                          background:
                                            coordSimThesis === v
                                              ? C.navy
                                              : "transparent",
                                          color:
                                            coordSimThesis === v
                                              ? C.white
                                              : C.muted,
                                          cursor: "pointer",
                                          borderLeft:
                                            v === "activation"
                                              ? undefined
                                              : "none",
                                        }}
                                      >
                                        {label}
                                      </button>
                                    ))}
                                  </Box>
                                </Box>

                                {/* Score comparison */}
                                <Box
                                  sx={{
                                    display: "flex",
                                    gap: 3,
                                    mb: 2,
                                    p: 1.5,
                                    background: C.bg,
                                    borderRadius: 1,
                                  }}
                                >
                                  <Box>
                                    <Typography
                                      sx={{
                                        fontSize: 9,
                                        color: C.muted,
                                        textTransform: "uppercase",
                                        letterSpacing: "0.07em",
                                      }}
                                    >
                                      Current
                                    </Typography>
                                    <Typography
                                      sx={{
                                        fontSize: 24,
                                        fontWeight: 800,
                                        color: C.navy,
                                        lineHeight: 1,
                                      }}
                                    >
                                      {county.composite.toFixed(1)}
                                    </Typography>
                                    <span
                                      style={{
                                        fontSize: 10,
                                        fontWeight: 700,
                                        color: baseTierMeta.color,
                                        background: baseTierMeta.color + "18",
                                        border: `1px solid ${baseTierMeta.color}44`,
                                        borderRadius: 4,
                                        padding: "2px 6px",
                                      }}
                                    >
                                      {baseTierMeta.label}
                                    </span>
                                  </Box>
                                  <Box
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                    }}
                                  >
                                    <Typography
                                      sx={{
                                        fontSize: 20,
                                        color:
                                          simComposite > county.composite
                                            ? C.greenLight
                                            : simComposite < county.composite
                                              ? C.red
                                              : C.muted,
                                      }}
                                    >
                                      {simComposite > county.composite
                                        ? "↑"
                                        : simComposite < county.composite
                                          ? "↓"
                                          : "→"}
                                      {Math.abs(
                                        simComposite - county.composite,
                                      ).toFixed(1)}
                                    </Typography>
                                  </Box>
                                  <Box>
                                    <Typography
                                      sx={{
                                        fontSize: 9,
                                        color: C.muted,
                                        textTransform: "uppercase",
                                        letterSpacing: "0.07em",
                                      }}
                                    >
                                      Simulated
                                    </Typography>
                                    <Typography
                                      sx={{
                                        fontSize: 24,
                                        fontWeight: 800,
                                        color:
                                          simComposite > county.composite
                                            ? C.greenLight
                                            : C.navy,
                                        lineHeight: 1,
                                      }}
                                    >
                                      {simComposite.toFixed(1)}
                                    </Typography>
                                    <span
                                      style={{
                                        fontSize: 10,
                                        fontWeight: 700,
                                        color: simMeta.color,
                                        background: simMeta.color + "18",
                                        border: `1px solid ${simMeta.color}44`,
                                        borderRadius: 4,
                                        padding: "2px 6px",
                                      }}
                                    >
                                      {simMeta.label}
                                    </span>
                                  </Box>
                                  <Box
                                    sx={{
                                      ml: "auto",
                                      display: "flex",
                                      alignItems: "center",
                                    }}
                                  >
                                    <button
                                      onClick={() => setCoordSimDeltas({})}
                                      style={{
                                        fontSize: 10,
                                        padding: "3px 10px",
                                        border: `1px solid ${C.border}`,
                                        borderRadius: 4,
                                        background: "transparent",
                                        color: C.muted,
                                        cursor: "pointer",
                                        fontFamily: "'Inter',sans-serif",
                                      }}
                                    >
                                      Reset
                                    </button>
                                  </Box>
                                </Box>

                                {/* Dimension sliders */}
                                <style>{`
                              .coord-sim-slider { -webkit-appearance: none; appearance: none; height: 6px; border-radius: 3px; outline: none; cursor: pointer; width: 100%; margin: 0; }
                              .coord-sim-slider::-webkit-slider-thumb { -webkit-appearance: none; appearance: none; width: 16px; height: 16px; border-radius: 50%; background: #fff; border: 2px solid currentColor; cursor: pointer; opacity: 0; transition: opacity 0.15s; }
                              .coord-sim-slider:hover::-webkit-slider-thumb, .coord-sim-slider:active::-webkit-slider-thumb { opacity: 1; }
                              .coord-sim-slider::-moz-range-thumb { width: 16px; height: 16px; border-radius: 50%; background: #fff; border: 2px solid currentColor; cursor: pointer; opacity: 0; transition: opacity 0.15s; }
                              .coord-sim-slider:hover::-moz-range-thumb, .coord-sim-slider:active::-moz-range-thumb { opacity: 1; }
                            `}</style>
                                <Box
                                  sx={{
                                    display: "flex",
                                    gap: 2,
                                    flexWrap: "wrap",
                                  }}
                                >
                                  {simDims.map((dim) => {
                                    const delta = coordSimDeltas[dim.id] || 0;
                                    const color =
                                      dim.simScore >= 75
                                        ? C.greenLight
                                        : dim.simScore >= 50
                                          ? C.blue
                                          : dim.simScore >= 25
                                            ? C.orange
                                            : C.red;
                                    const trackStyle = {
                                      background: `linear-gradient(to right, ${color} ${dim.simScore}%, ${C.border} ${dim.simScore}%)`,
                                      color,
                                    };
                                    return (
                                      <Box
                                        key={dim.id}
                                        sx={{ flex: "1 1 220px", minWidth: 0 }}
                                      >
                                        <Box
                                          sx={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            mb: 0.75,
                                          }}
                                        >
                                          <span
                                            style={{
                                              fontSize: 11,
                                              fontWeight: 600,
                                              color: C.charcoal,
                                            }}
                                          >
                                            {dim.label}
                                          </span>
                                          <Box
                                            sx={{
                                              display: "flex",
                                              alignItems: "center",
                                              gap: 0.75,
                                            }}
                                          >
                                            {delta !== 0 && (
                                              <span
                                                style={{
                                                  fontSize: 10,
                                                  color:
                                                    delta > 0
                                                      ? C.greenLight
                                                      : C.red,
                                                  fontWeight: 600,
                                                }}
                                              >
                                                {delta > 0 ? "+" : ""}
                                                {delta}
                                              </span>
                                            )}
                                            <span
                                              style={{
                                                fontSize: 13,
                                                fontWeight: 700,
                                                color,
                                                minWidth: 28,
                                                textAlign: "right",
                                              }}
                                            >
                                              {dim.simScore.toFixed(0)}
                                            </span>
                                          </Box>
                                        </Box>
                                        <input
                                          className="coord-sim-slider"
                                          type="range"
                                          min={0}
                                          max={100}
                                          step={1}
                                          value={dim.simScore}
                                          onChange={(e) => {
                                            const newVal = Number(
                                              e.target.value,
                                            );
                                            setCoordSimDeltas((d) => ({
                                              ...d,
                                              [dim.id]: Math.round(
                                                newVal - dim.base,
                                              ),
                                            }));
                                          }}
                                          style={trackStyle}
                                        />
                                        <span
                                          style={{
                                            fontSize: 9,
                                            color: C.muted,
                                            display: "block",
                                            marginTop: 3,
                                          }}
                                        >
                                          base {dim.base.toFixed(0)} · wt{" "}
                                          {dim.weight}
                                        </span>
                                      </Box>
                                    );
                                  })}
                                </Box>
                              </CardContent>
                            </Card>
                          );
                        })()}
                    </Box>
                  )}

                  {/* ── Scoring Model Pane — Metric Index (right) ── */}
                  {chartPane === "model" &&
                    (() => {
                      const METRIC_INDEX = [
                        // [key, label, source, vintage, unit, description, act_dims, exp_dims]
                        [
                          "zhvi_latest",
                          "Median Home Value",
                          "Zillow ZHVI",
                          "2024",
                          "$",
                          "Zillow Home Value Index median; proxy for acquisition basis and entry cost.",
                          "Entry Cost",
                          "—",
                        ],
                        [
                          "zhvi_growth_1yr",
                          "1-Yr Home Price Appreciation",
                          "Zillow ZHVI",
                          "2024",
                          "% YoY",
                          "Year-over-year change in ZHVI; signals active housing demand.",
                          "—",
                          "Housing Demand",
                        ],
                        [
                          "poverty_rate",
                          "Poverty Rate",
                          "Census ACS",
                          "2022",
                          "% pop",
                          "% of residents below federal poverty line. In Activation: higher distress = more activation upside.",
                          "Economic Distress",
                          "—",
                        ],
                        [
                          "unemployment_rate",
                          "Unemployment Rate",
                          "Census ACS",
                          "2022",
                          "% labor force",
                          "Civilian unemployment rate. Activation: higher = more distress. Expansion city: lower = stronger buyers.",
                          "Economic Distress",
                          "—",
                        ],
                        [
                          "median_hhi",
                          "Median Household Income",
                          "Census ACS",
                          "2022",
                          "$",
                          "Median annual HHI. Activation: lower HHI = more distress. Expansion: higher = stronger buyer pool.",
                          "Economic Distress",
                          "Household Income",
                        ],
                        [
                          "hhi_growth_pct",
                          "Income Growth Rate",
                          "Census ACS",
                          "2018–22",
                          "% CAGR",
                          "Compound annual growth in median HHI; forward-looking buyer quality signal.",
                          "—",
                          "Household Income",
                        ],
                        [
                          "vacancy_rate",
                          "Housing Vacancy Rate",
                          "Census ACS",
                          "2022",
                          "% units",
                          "% of housing units vacant. Activation: high vacancy signals acquisition opportunity in distressed stock.",
                          "Economic Distress",
                          "—",
                        ],
                        [
                          "lfpr",
                          "Labor Force Participation",
                          "Census ACS",
                          "2022",
                          "% pop 16+",
                          "Civilian labor force as % of working-age population; workforce capacity signal.",
                          "Labor Market Momentum",
                          "—",
                        ],
                        [
                          "pop_growth_pct",
                          "Population Growth",
                          "Census ACS",
                          "2019–22",
                          "% CAGR",
                          "Compound annual population growth; demographic momentum and in-migration signal.",
                          "Demographic Momentum",
                          "Population & Migration",
                        ],
                        [
                          "net_migration_rate",
                          "Net Migration Rate",
                          "Census ACS",
                          "2022",
                          "% pop",
                          "Net domestic + international migration as % of population; confirms growth is net positive.",
                          "—",
                          "Population & Migration",
                        ],
                        [
                          "pop_density",
                          "Population Density",
                          "Census ACS",
                          "2022",
                          "pop/sq mi",
                          "Lower density = more underdeveloped land available for greenfield master-planned communities.",
                          "—",
                          "Land Availability",
                        ],
                        [
                          "permit_units_per_1k",
                          "Permit Activity",
                          "Census Building Permits",
                          "2022",
                          "units/1k pop",
                          "New residential permit units per 1,000 population; measures active construction and development velocity.",
                          "Demographic Momentum · Governance",
                          "Housing Demand · Permitting Climate",
                        ],
                        [
                          "emp_growth_pct",
                          "Employment Growth",
                          "BLS QCEW",
                          "2022",
                          "% YoY",
                          "Year-over-year covered employment growth; labor market momentum signal.",
                          "Labor Market Momentum",
                          "Employment Base",
                        ],
                        [
                          "oes_median_wage",
                          "Median Annual Wage",
                          "BLS OES",
                          "2022",
                          "$",
                          "All-occupation MSA-level median wage. Signals labor market quality and household income potential.",
                          "Labor Market Momentum",
                          "Employment Base",
                        ],
                        [
                          "high_skill_emp_share",
                          "High-Skill Employment Share",
                          "BLS OES",
                          "2022",
                          "% emp",
                          "Management, professional & STEM occupations as % of total employment. Shown in Supplemental Signals; not currently a dimension input — reflects workforce quality and knowledge-economy density.",
                          "Supplemental only",
                          "Supplemental only",
                        ],
                        [
                          "stem_jobs_pct",
                          "STEM Occupation Share",
                          "Census ACS C24010",
                          "2022",
                          "% emp",
                          "STEM occupations as % of civilian employment. Shown in Supplemental Signals; not a direct dimension input. High STEM share signals technical employer base, graduate retention, and income growth durability.",
                          "Supplemental only",
                          "Supplemental only",
                        ],
                        [
                          "estab_per_1k_pop",
                          "Establishments per 1k Pop",
                          "Census CBP",
                          "2022",
                          "per 1k",
                          "Business establishments per 1,000 residents; market density and private-sector vitality.",
                          "Business Dynamism",
                          "—",
                        ],
                        [
                          "emp_per_estab",
                          "Employees per Establishment",
                          "Census CBP",
                          "2022",
                          "count",
                          "Average employer size; higher values indicate presence of larger anchor employers.",
                          "Business Dynamism",
                          "—",
                        ],
                        [
                          "estab_growth_pct",
                          "Establishment Growth",
                          "Census CBP",
                          "2022",
                          "% YoY",
                          "YoY growth in business establishments; early signal of economic activity picking up.",
                          "Business Dynamism",
                          "—",
                        ],
                        [
                          "fed_awards_per_capita",
                          "Federal Awards per Capita",
                          "USASpending.gov",
                          "FY2024",
                          "$/person",
                          "Total federal contract & grant awards per resident. Direct catalyst signal — federal investment precedes private follow-on activity.",
                          "Catalyst Evidence",
                          "—",
                        ],
                        [
                          "oz_tract_flag",
                          "Opportunity Zone Designation",
                          "HUD / IRS",
                          "2018",
                          "binary",
                          "County contains ≥1 Qualified Opportunity Zone tract. Signals potential for OZ-advantaged capital deployment.",
                          "Catalyst Evidence",
                          "—",
                        ],
                        [
                          "college_enrollment_per_1k",
                          "College Enrollment per 1k",
                          "Census ACS",
                          "2022",
                          "per 1k",
                          "Post-secondary enrollment rate. Anchor institution signal — colleges create stable employment and student demand.",
                          "Anchor Institutions",
                          "—",
                        ],
                        [
                          "hospital_beds_per_1k",
                          "Hospital Beds per 1k",
                          "AHA / Census",
                          "2022",
                          "per 1k",
                          "Hospital bed capacity per 1,000 residents. Anchor institution signal and healthcare access indicator.",
                          "Anchor Institutions",
                          "—",
                        ],
                        [
                          "broadband_pct",
                          "Broadband Coverage",
                          "FCC BDC",
                          "2022",
                          "% addresses",
                          "% of addresses with fixed broadband available. Infrastructure baseline for remote workers and modern employers.",
                          "Infrastructure Readiness · Env. & Regulatory",
                          "Infrastructure",
                        ],
                        [
                          "transport_emp_share",
                          "Transportation Employment",
                          "BLS QCEW",
                          "2022",
                          "% emp",
                          "Transportation & warehousing employment as % of total; signals logistics infrastructure and supply chain access.",
                          "Logistics & Market Access",
                          "—",
                        ],
                        [
                          "urban_area_pct",
                          "Urban Area Coverage",
                          "Census TIGER",
                          "2020",
                          "% land",
                          "% of county classified as urban. Logistics: higher = better market access. Expansion: lower = more greenfield land.",
                          "Logistics & Market Access",
                          "Permitting Climate",
                        ],
                        [
                          "govt_emp_share",
                          "Government Employment Share",
                          "BLS QCEW",
                          "2022",
                          "% emp",
                          "Government employment as % of total. Lower share = stronger private-sector foundation and less public-sector dependency.",
                          "Governance & Incentives",
                          "—",
                        ],
                        [
                          "fema_risk_score",
                          "FEMA Climate Risk Score",
                          "FEMA NRI",
                          "2023",
                          "0–100",
                          "Composite natural hazard risk index (flood, wind, wildfire, etc.). Lower score = safer long-term asset.",
                          "Risk & Resilience",
                          "Risk & Resilience",
                        ],
                        [
                          "superfund_sites_per_1k_sqmi",
                          "Superfund Site Density",
                          "EPA CERCLIS",
                          "2024",
                          "per 1k sq mi",
                          "Active Superfund sites per 1,000 sq mi. Lower density = cleaner regulatory environment for development.",
                          "Env. & Regulatory",
                          "—",
                        ],
                        [
                          "drive_min_nearest_metro",
                          "Drive to Nearest Metro",
                          "Amazon Location Service",
                          "2024",
                          "minutes",
                          "Driving time to nearest major metro (250k+ jobs). Shorter = better workforce access, logistics advantage, and lifestyle appeal.",
                          "—",
                          "Metro Adjacency",
                        ],
                        [
                          "farmland_value_acre",
                          "Land Value per Acre",
                          "USDA NASS",
                          "2017",
                          "$/acre",
                          "Avg value of all farmland and buildings per acre. Primary proxy for raw land acquisition cost in greenfield development.",
                          "—",
                          "Land Availability",
                        ],
                        [
                          "total_employment",
                          "Total Employment",
                          "BLS QCEW",
                          "2022",
                          "jobs",
                          "Total covered employment — base labor market scale signal.",
                          "—",
                          "Employment Base",
                        ],
                        [
                          "edfacts_proficiency",
                          "School Proficiency Rate",
                          "NCES EDFacts",
                          "SY2021–22",
                          "% students",
                          "% of students at/above proficiency in math & reading. Top demand driver for family household buyer targeting in master-planned communities.",
                          "—",
                          "School District",
                        ],
                        [
                          "usda_amenity_scale",
                          "Natural Amenity Score",
                          "USDA ERS",
                          "2004",
                          "−7 to +7",
                          "Index of natural amenities: climate, topography, water proximity. Lifestyle draw for move-up and retirement buyers.",
                          "—",
                          "Natural Amenity",
                        ],
                        [
                          "property_tax_rate",
                          "Property Tax Rate",
                          "Census / Assessor",
                          "2022",
                          "% assessed",
                          "Effective property tax rate. Lower = better for development economics and household affordability.",
                          "—",
                          "Tax & Regulatory",
                        ],
                      ];
                      return (
                        <Box
                          sx={{
                            flex: 1,
                            display: "flex",
                            flexDirection: "column",
                            gap: 2,
                          }}
                        >
                          {/* Data sources note */}
                          <Card
                            elevation={0}
                            sx={{
                              border: `1px solid ${C.border}`,
                              borderRadius: 1,
                            }}
                          >
                            <CardContent sx={{ pb: "12px !important" }}>
                              <Typography
                                sx={{
                                  fontSize: 9,
                                  color: C.muted,
                                  lineHeight: 1.7,
                                }}
                              >
                                <span
                                  style={{
                                    fontWeight: 700,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.06em",
                                  }}
                                >
                                  Primary Data Sources —{" "}
                                </span>
                                Census ACS 2022 5-Year Estimates · BLS QCEW 2022
                                Annual · BLS OES 2022 MSA-Level · Zillow ZHVI
                                County Series · FEMA National Risk Index 2023 ·
                                USDA NASS 2017 Census of Agriculture · USDA ERS
                                Natural Amenity Index · Amazon Location Service
                                Route Calculator · FCC BDC Broadband Coverage
                                2022 · USASpending.gov FY2024 Awards · HUD / IRS
                                Qualified Opportunity Zones · NCES EDFacts
                                SY2021–22 · Census Building Permits Survey 2022
                                · Census CBP 2022 · EPA CERCLIS Active Superfund
                                Sites · Census TIGER Urban Area Boundaries 2020
                                · AHA Annual Survey (hospital beds).
                              </Typography>
                            </CardContent>
                          </Card>

                          {/* Full Metric Index */}
                          <Card
                            elevation={0}
                            sx={{
                              border: `1px solid ${C.border}`,
                              borderRadius: 1,
                            }}
                          >
                            <CardContent sx={{ pb: "12px !important" }}>
                              <Box
                                sx={{
                                  pb: 1,
                                  mb: 1.5,
                                  borderBottom: `2px solid ${C.navy}`,
                                  width: "fit-content",
                                }}
                              >
                                <Typography
                                  sx={{
                                    fontSize: 11,
                                    fontWeight: 800,
                                    color: C.navy,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.09em",
                                  }}
                                >
                                  Complete Metric Index
                                </Typography>
                                <Typography
                                  sx={{
                                    fontSize: 10,
                                    color: C.muted,
                                    mt: 0.25,
                                  }}
                                >
                                  All {METRIC_INDEX.length} raw data inputs —
                                  sources, vintages, units, and which thesis
                                  dimensions they feed
                                </Typography>
                              </Box>
                              <table
                                style={{
                                  width: "100%",
                                  borderCollapse: "collapse",
                                  fontSize: 11,
                                }}
                              >
                                <thead>
                                  <tr>
                                    {[
                                      "Metric",
                                      "Source",
                                      "Vintage",
                                      "Unit",
                                      "Activation Dim(s)",
                                      "Expansion Dim(s)",
                                    ].map((h) => (
                                      <th
                                        key={h}
                                        style={{
                                          padding: "5px 10px",
                                          textAlign: "left",
                                          color: C.muted,
                                          fontWeight: 700,
                                          fontSize: 10,
                                          textTransform: "uppercase",
                                          letterSpacing: "0.07em",
                                          borderBottom: `1px solid ${C.border}`,
                                          whiteSpace: "nowrap",
                                        }}
                                      >
                                        {h}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {METRIC_INDEX.map(
                                    (
                                      [
                                        key,
                                        label,
                                        source,
                                        vintage,
                                        unit,
                                        desc,
                                        actDim,
                                        expDim,
                                      ],
                                      i,
                                    ) => {
                                      const isSupplemental =
                                        actDim === "Supplemental only";
                                      return (
                                        <tr
                                          key={key}
                                          style={{
                                            background:
                                              i % 2 === 0
                                                ? "transparent"
                                                : C.bg,
                                            borderBottom: `1px solid ${C.border}`,
                                          }}
                                        >
                                          <td
                                            style={{
                                              padding: "8px 10px",
                                              verticalAlign: "top",
                                            }}
                                          >
                                            <div
                                              style={{
                                                fontSize: 11,
                                                fontWeight: 700,
                                                color: C.charcoal,
                                              }}
                                            >
                                              {label}
                                            </div>
                                            <div
                                              style={{
                                                fontSize: 9,
                                                color: C.muted,
                                                fontFamily: "monospace",
                                                marginTop: 1,
                                                marginBottom: 3,
                                              }}
                                            >
                                              {key}
                                            </div>
                                            <div
                                              style={{
                                                fontSize: 8,
                                                color: C.muted,
                                                lineHeight: 1.5,
                                                maxWidth: 280,
                                              }}
                                            >
                                              {desc}
                                            </div>
                                          </td>
                                          <td
                                            style={{
                                              padding: "8px 10px",
                                              verticalAlign: "top",
                                              whiteSpace: "nowrap",
                                              fontSize: 10,
                                              color: C.muted,
                                            }}
                                          >
                                            {source}
                                          </td>
                                          <td
                                            style={{
                                              padding: "8px 10px",
                                              verticalAlign: "top",
                                              whiteSpace: "nowrap",
                                              fontSize: 10,
                                              color: C.muted,
                                            }}
                                          >
                                            {vintage}
                                          </td>
                                          <td
                                            style={{
                                              padding: "8px 10px",
                                              verticalAlign: "top",
                                              whiteSpace: "nowrap",
                                              fontSize: 10,
                                              color: C.muted,
                                            }}
                                          >
                                            {unit}
                                          </td>
                                          <td
                                            style={{
                                              padding: "8px 10px",
                                              verticalAlign: "top",
                                              minWidth: 80,
                                              maxWidth: 130,
                                            }}
                                          >
                                            <span
                                              style={{
                                                fontSize: 10,
                                                fontWeight: 600,
                                                color: isSupplemental
                                                  ? C.muted
                                                  : C.blue,
                                                background: isSupplemental
                                                  ? "transparent"
                                                  : C.blue + "18",
                                                borderRadius: 3,
                                                padding: isSupplemental
                                                  ? "0"
                                                  : "2px 6px",
                                                display: "inline-block",
                                                lineHeight: 1.4,
                                              }}
                                            >
                                              {actDim}
                                            </span>
                                          </td>
                                          <td
                                            style={{
                                              padding: "8px 10px",
                                              verticalAlign: "top",
                                              minWidth: 80,
                                              maxWidth: 130,
                                            }}
                                          >
                                            <span
                                              style={{
                                                fontSize: 10,
                                                fontWeight: 600,
                                                color:
                                                  expDim === "—"
                                                    ? C.muted
                                                    : C.greenLight,
                                                background:
                                                  expDim === "—"
                                                    ? "transparent"
                                                    : C.greenLight + "18",
                                                borderRadius: 3,
                                                padding:
                                                  expDim === "—"
                                                    ? "0"
                                                    : "2px 6px",
                                                display: "inline-block",
                                                lineHeight: 1.4,
                                              }}
                                            >
                                              {expDim}
                                            </span>
                                          </td>
                                        </tr>
                                      );
                                    },
                                  )}
                                </tbody>
                              </table>
                            </CardContent>
                          </Card>
                        </Box>
                      );
                    })()}
                </Box>
              </Box>

              {/* KPI stat cards — Portfolio tab only */}
              {chartPane === "portfolio" && (
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
              )}
            </Box>
            {/* end left flex column */}
          </Grid>
        </Grid>

        {chartPane === "portfolio" && (
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
              <Box
                sx={{ overflowX: "auto", overflowY: "auto", maxHeight: 380 }}
              >
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
                                  r.fees + r.bonuses > 0
                                    ? C.greenLight
                                    : C.muted,
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
                      if (tableView === "benchmark")
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
                                  r.bondIndex != null
                                    ? rc(r.bondIndex)
                                    : C.muted,
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
                                color:
                                  r.spCagr != null ? rc(r.spCagr) : C.muted,
                              }}
                            >
                              {r.spCagr != null ? fmtSign(r.spCagr) : "—"}
                            </td>
                            <td
                              style={{
                                padding: "8px 11px",
                                textAlign: "right",
                                color:
                                  r.bndCagr != null ? rc(r.bndCagr) : C.muted,
                              }}
                            >
                              {r.bndCagr != null ? fmtSign(r.bndCagr) : "—"}
                            </td>
                            <td
                              style={{
                                padding: "8px 11px",
                                textAlign: "right",
                                color:
                                  r.vnqCagr != null ? rc(r.vnqCagr) : C.muted,
                              }}
                            >
                              {r.vnqCagr != null ? fmtSign(r.vnqCagr) : "—"}
                            </td>
                          </tr>
                        );
                      // ── Housing Drivers row ──
                      const cell = (val, fmt) => (
                        <td
                          style={{
                            padding: "8px 11px",
                            textAlign: "right",
                            color: C.muted,
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {val != null ? fmt(val) : "—"}
                        </td>
                      );
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
                              {last?.spCagr != null
                                ? fmtSign(last.spCagr)
                                : "—"}
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
        )}

        </>)}

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
