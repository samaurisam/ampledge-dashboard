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

// ─── Color Palette (Morningstar-inspired) ──────────────────────────────────
const C = {
  navy: "#0a2240",
  navyMid: "#1a3a5c",
  navyDark: "#061828",
  red: "#c0392b",
  redLight: "#e74c3c",
  green: "#1a7a4a",
  greenLight: "#27ae60",
  blue: "#1f6da8",
  blueLight: "#2980b9",
  purple: "#6c3483",
  purpleLight: "#8e44ad",
  orange: "#d35400",
  bg: "#f4f6f9",
  white: "#ffffff",
  border: "#dde2ea",
  rowAlt: "#f0f4f8",
  muted: "#6b7280",
  charcoal: "#2c3344",
};

// ─── Static Data ───────────────────────────────────────────────────────────
// Simulation starts 2016 — matching the "2016-2026 Sim" sheet exactly.
// Home value is FIXED at $400,000 (purchase price, not revalued annually).
// Annual return formula: HOME_VALUE Ã— HPA% Ã— Cap + Fees + Bonuses
// Starting capital compounds: next_start = prev_start + annual_return

const HOME_VALUE = 400000; // Fixed home purchase price throughout simulation

// Benchmark data — 1988–2025 (38 years)
// Historical (1988-2015): S&P 500 total return, Bloomberg US Agg bond index,
// NAREIT All REIT index (proxy for VNQ), Freddie Mac 30-yr avg, MBA delinquency rate
// 2016-2025: sourced from "2016-2026 Sim" tab (exact match)
const BM_START = 1988;
const BM = {
  sp500: [
    16.6,
    31.7,
    -3.1,
    30.5,
    7.6,
    10.1,
    1.3,
    37.6,
    23.0,
    33.4, // 1988-1997
    28.6,
    21.0,
    -9.1,
    -11.9,
    -22.1,
    28.7,
    10.9,
    4.9,
    15.8,
    5.5, // 1998-2007
    -37.0,
    26.5,
    15.1,
    2.1,
    16.0,
    32.4,
    13.7,
    1.4, // 2008-2015
    12.0,
    21.8,
    -4.4,
    31.5,
    18.4,
    28.7,
    -18.1,
    26.3,
    24.6,
    15.2, // 2016-2025
  ],
  bondIndex: [
    7.9,
    14.5,
    9.0,
    16.0,
    7.4,
    9.8,
    -2.9,
    18.5,
    3.6,
    9.7, // 1988-1997
    8.7,
    -0.8,
    11.6,
    8.4,
    10.3,
    4.1,
    4.3,
    2.4,
    4.3,
    7.0, // 1998-2007
    5.7,
    5.9,
    6.5,
    7.8,
    4.2,
    -2.0,
    6.0,
    0.5, // 2008-2015
    2.6,
    3.5,
    0.0,
    8.7,
    7.5,
    -1.5,
    -13.0,
    5.5,
    3.0,
    4.1, // 2016-2025
  ],
  vnq: [
    13.5,
    8.8,
    -15.4,
    35.7,
    14.6,
    19.7,
    3.2,
    15.3,
    35.3,
    20.3, // 1988-1997
    -17.5,
    -4.6,
    26.4,
    13.9,
    3.8,
    37.1,
    30.7,
    12.2,
    35.9,
    -15.7, // 1998-2007
    -37.7,
    28.0,
    27.9,
    8.7,
    19.7,
    2.9,
    30.1,
    2.8, // 2008-2015
    8.5,
    5.0,
    -6.0,
    28.9,
    -4.7,
    46.2,
    -26.2,
    16.7,
    4.0,
    7.5, // 2016-2025
  ],
  // Source: Freddie Mac PMMS — 30-yr fixed rate annual averages
  mortgageRate: [
    10.3,
    10.3,
    10.1,
    9.3,
    8.4,
    7.3,
    8.4,
    8.0,
    7.8,
    7.6, // 1988-1997
    7.0,
    7.4,
    8.1,
    7.0,
    6.5,
    5.8,
    5.8,
    5.9,
    6.4,
    6.4, // 1998-2007
    6.0,
    5.1,
    4.6,
    4.5,
    3.7,
    4.1,
    4.2,
    3.9, // 2008-2015
    3.7,
    4.0,
    4.5,
    4.0,
    3.1,
    3.0,
    5.3,
    6.8,
    6.7,
    6.8, // 2016-2025
  ],
  // Source: MBA National Delinquency Survey — total 30+ day past due, all loans, seasonally adjusted
  delinquencyRate: [
    4.7,
    4.9,
    6.0,
    7.3,
    6.3,
    4.9,
    3.5,
    2.9,
    2.6,
    2.3, // 1988-1997
    2.1,
    1.9,
    1.9,
    2.1,
    2.0,
    1.8,
    1.4,
    1.4,
    1.5,
    2.3, // 1998-2007
    4.7,
    8.4,
    9.7,
    8.8,
    8.0,
    6.5,
    4.8,
    3.6, // 2008-2015
    4.7,
    4.8,
    4.4,
    4.2,
    6.7,
    5.4,
    3.8,
    3.6,
    4.0,
    4.1, // 2016-2025
  ],
  // Source: Federal Reserve H.15 — 10-year Treasury constant maturity, annual average
  tenYearYield: [
    8.85, 8.49, 8.55, 7.86, 7.01, 5.87, 7.09, 6.57, 6.44, 6.35, // 1988-1997
    5.26, 5.64, 6.03, 5.02, 4.61, 4.01, 4.27, 4.29, 4.79, 4.63, // 1998-2007
    3.66, 3.26, 3.22, 2.78, 1.80, 2.35, 2.54, 2.14,              // 2008-2015
    1.84, 2.33, 2.91, 2.14, 0.89, 1.45, 2.95, 3.97, 4.20, 4.28, // 2016-2025
  ],
  // Source: BLS CPI-U — annual % change
  cpi: [
    4.1, 4.8, 5.4, 4.2, 3.0, 3.0, 2.6, 2.8, 3.0, 2.3, // 1988-1997
    1.6, 2.2, 3.4, 2.8, 1.6, 2.3, 2.7, 3.4, 3.2, 2.9, // 1998-2007
    3.8, -0.4, 1.6, 3.2, 2.1, 1.5, 1.6, 0.1,          // 2008-2015
    1.3, 2.1, 2.4, 1.8, 1.2, 4.7, 8.0, 4.1, 2.9, 2.8, // 2016-2025
  ],
  // Source: Census Bureau — single-family housing starts, thousands of units
  housingStarts: [
    1081, 1003, 894, 840, 1030, 1126, 1198, 1076, 1161, 1134, // 1988-1997
    1271, 1302, 1231, 1273, 1359, 1499, 1610, 1716, 1465, 1046, // 1998-2007
    622, 445, 471, 431, 535, 618, 648, 715,                     // 2008-2015
    781, 849, 876, 888, 991, 1127, 1005, 947, 1004, 1000,       // 2016-2025
  ],
  // Source: NAR — existing homes months of supply, annual average
  monthsOfSupply: [
    6.2, 7.5, 8.1, 8.6, 7.6, 6.5, 5.5, 6.2, 5.6, 5.1, // 1988-1997
    4.8, 4.5, 4.5, 4.9, 4.4, 4.2, 4.3, 4.5, 6.4, 9.6, // 1998-2007
    10.0, 9.0, 8.7, 8.2, 5.5, 4.9, 5.5, 5.0,           // 2008-2015
    4.0, 3.8, 3.9, 3.9, 2.5, 2.1, 2.9, 3.2, 3.7, 3.9,  // 2016-2025
  ],
  // Source: NAHB — Housing Market Index, annual average (0-100)
  nahbHMI: [
    54, 45, 28, 35, 55, 65, 56, 48, 58, 57, // 1988-1997
    71, 77, 64, 57, 61, 65, 68, 67, 42, 20, // 1998-2007
    14, 14, 16, 15, 27, 54, 55, 60,         // 2008-2015
    63, 67, 60, 64, 72, 83, 47, 40, 42, 44, // 2016-2025
  ],
  // Source: Census Bureau — median household income, $thousands
  medianIncome: [
    27.2, 28.9, 29.9, 30.1, 30.6, 31.2, 32.3, 34.1, 35.5, 37.0, // 1988-1997
    38.9, 40.7, 42.0, 42.2, 42.4, 43.3, 44.3, 46.3, 48.2, 50.2, // 1998-2007
    50.3, 49.8, 49.4, 50.1, 51.0, 51.9, 53.7, 56.5,              // 2008-2015
    59.0, 61.4, 63.2, 68.7, 67.5, 70.8, 74.6, 80.6, 82.0, 84.0, // 2016-2025
  ],
  // Source: Census Bureau — rental vacancy rate %
  rentalVacancy: [
    7.7, 7.4, 7.2, 7.4, 7.4, 7.3, 7.4, 7.6, 7.9, 7.8, // 1988-1997
    7.9, 8.1, 8.0, 8.4, 8.9, 9.1, 9.1, 9.0, 8.9, 9.0, // 1998-2007
    9.6, 10.6, 10.2, 9.5, 8.7, 8.3, 7.6, 7.0,          // 2008-2015
    6.9, 7.2, 6.8, 6.8, 6.4, 5.8, 5.8, 6.6, 6.9, 7.0,  // 2016-2025
  ],
  // Source: NAR / Census — median home price / median household income ratio
  priceToIncome: [
    3.1, 3.3, 3.2, 3.1, 2.9, 2.8, 2.7, 2.7, 2.7, 2.7, // 1988-1997
    2.7, 2.8, 2.9, 3.1, 3.3, 3.5, 3.7, 4.2, 4.4, 4.2, // 1998-2007
    3.9, 3.5, 3.3, 3.2, 3.3, 3.6, 3.7, 3.9,            // 2008-2015
    4.1, 4.2, 4.3, 4.4, 4.7, 5.3, 5.4, 5.5, 5.7, 5.8,  // 2016-2025
  ],
  // Source: BLS — civilian unemployment rate, annual average %
  unemploymentRate: [
    5.5, 5.3, 5.6, 6.8, 7.5, 6.9, 6.1, 5.6, 5.4, 4.9, // 1988-1997
    4.5, 4.2, 4.0, 4.7, 5.8, 6.0, 5.5, 5.3, 5.1, 4.6, // 1998-2007
    5.8, 9.3, 9.6, 8.9, 8.1, 7.4, 6.2, 5.3,            // 2008-2015
    4.9, 4.4, 3.9, 3.7, 8.1, 5.4, 3.6, 3.6, 4.0, 4.2,  // 2016-2025
  ],
  // Source: Census — single-family building permits authorized, thousands
  buildingPermits: [
    1085, 971, 794, 754, 910, 987, 1069, 997, 1069, 1062, // 1988-1997
    1187, 1235, 1198, 1237, 1366, 1461, 1613, 1682, 1378,  980, // 1998-2007
     622,  441,  447,  418,  535,  619,  640,  710,         // 2008-2015
     778,  848,  862,  862, 1004, 1115,  975,  908,  970,  955, // 2016-2025
  ],
  // Source: NAR — existing home sales, millions of units
  existingHomeSales: [
    3.51, 3.01, 3.21, 3.22, 3.52, 3.80, 3.95, 3.80, 4.09, 4.21, // 1988-1997
    4.97, 5.23, 5.17, 5.30, 5.56, 6.18, 6.78, 7.08, 6.48, 5.65, // 1998-2007
    4.91, 5.16, 4.19, 4.26, 4.66, 5.09, 4.94, 5.25,              // 2008-2015
    5.45, 5.51, 5.34, 5.34, 5.64, 6.12, 5.03, 4.09, 4.06, 4.20, // 2016-2025
  ],
  // Source: Census — net new households formed annually, thousands
  netHHFormation: [
    1200, 1100, 1100,  900, 1000, 1100, 1200, 1200, 1200, 1300, // 1988-1997
    1300, 1400, 1300, 1200, 1100, 1200, 1400, 1300, 1300,  900, // 1998-2007
     500,  400,  500,  900, 1000, 1100, 1200, 1400,              // 2008-2015
    1200, 1300, 1300, 1300, 1500, 1800, 1600, 1400, 1300, 1200, // 2016-2025
  ],
  // Source: Conference Board — Consumer Confidence Index, 1985=100
  consumerConfidence: [
    120, 112,  83,  67,  70,  79,  93, 101, 109, 125, // 1988-1997
    130, 137, 135, 107,  97,  83,  96, 100, 105, 103, // 1998-2007
     58,  45,  54,  58,  67,  73,  92,  98,            // 2008-2015
    100, 119, 130, 128,  92, 113, 104, 108, 105,  95,  // 2016-2025
  ],
  // Source: Federal Reserve — effective federal funds rate, annual average %
  fedFundsRate: [
    7.57, 9.22, 8.10, 5.69, 3.52, 3.02, 4.21, 5.83, 5.30, 5.46, // 1988-1997
    5.35, 4.97, 6.24, 3.88, 1.67, 1.13, 1.35, 3.22, 4.97, 5.02, // 1998-2007
    1.92, 0.24, 0.18, 0.10, 0.14, 0.11, 0.09, 0.13,              // 2008-2015
    0.39, 1.00, 1.83, 2.16, 0.36, 0.08, 1.68, 5.02, 5.33, 4.50, // 2016-2025
  ],
  // Source: MBA — Mortgage Credit Availability Index (null pre-2012; 100=Mar 2012 baseline)
  mcai: [
    null, null, null, null, null, null, null, null, null, null, // 1988-1997
    null, null, null, null, null, null, null, null, null, null, // 1998-2007
    null, null, null, null, 100, 108, 115, 116,                 // 2008-2015 (2012 onward)
     120,  178,  183,  189,  162,  134,  115,  97,  95,  93,   // 2016-2025
  ],
  // Source: MBA — % of mortgages in foreclosure inventory, annual average
  foreclosureRate: [
    0.9, 1.0, 1.2, 1.3, 1.3, 1.2, 1.0, 0.9, 0.9, 1.0, // 1988-1997
    1.1, 1.2, 1.2, 1.3, 1.5, 1.6, 1.3, 1.0, 1.1, 1.8, // 1998-2007
    3.3, 4.6, 4.6, 4.4, 3.7, 2.9, 2.3, 1.8,            // 2008-2015
    1.4, 1.2, 1.1, 1.0, 0.7, 0.4, 0.5, 0.6, 0.7, 0.8, // 2016-2025
  ],
  // Source: Census — homeownership rate, % of households that own
  homeownershipRate: [
    63.8, 63.9, 63.9, 64.0, 64.2, 64.0, 64.0, 64.7, 65.4, 65.7, // 1988-1997
    66.3, 66.8, 67.4, 67.8, 67.9, 68.3, 69.0, 68.9, 68.8, 68.1, // 1998-2007
    67.8, 67.4, 66.9, 66.1, 65.5, 65.1, 64.5, 63.7,              // 2008-2015
    63.4, 63.9, 64.4, 64.6, 65.8, 65.5, 65.8, 65.7, 65.6, 65.5, // 2016-2025
  ],
};
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

const CITY_COLORS = {
  USA: C.red,
  Atlanta: "#e74c3c",
  Boston: "#9b59b6",
  Charlotte: "#2ecc71",
  Chicago: "#3498db",
  Cleveland: "#1abc9c",
  Dallas: "#f39c12",
  Denver: "#d35400",
  Detroit: "#c0392b",
  "Las Vegas": "#8e44ad",
  "Los Angeles": "#2980b9",
  Miami: "#16a085",
  Minneapolis: "#27ae60",
  "New York": "#2c3e50",
  Phoenix: "#e67e22",
  Portland: "#7f8c8d",
  "San Diego": "#6c5ce7",
  "San Francisco": "#00b894",
  Seattle: "#0984e3",
  Tampa: "#fd79a8",
  "Washington DC": "#636e72",
};

const CAP_SCHEDULE = [
  0.4667, 0.5716, 0.6921, 0.8329, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0,
];

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

// ─── Chart shared option factories ────────────────────────────────────────
const baseFont = { family: "'Inter','Helvetica Neue',sans-serif" };
const baseTooltip = {
  backgroundColor: C.navyDark,
  padding: 10,
  cornerRadius: 4,
  titleFont: { ...baseFont, size: 12 },
  bodyFont: { ...baseFont, size: 11 },
};
const baseGridScale = {
  grid: { color: "#e8ecf1", lineWidth: 0.8 },
  ticks: { font: { ...baseFont, size: 10 }, color: C.muted },
};
const baseLegend = {
  labels: {
    font: (ctx) => ({ ...baseFont, size: ctx.chart.width < 450 ? 9 : 11 }),
    color: C.charcoal,
    boxWidth: 10,
    padding: 8,
  },
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

// ─── 5-Year Scenario Projections (2026–2030) ────────────────────────────────
const PROJ_START = 2026;
const PROJ = {
  bear: {
    // 2026–2035 (indices 0–9)
    hpa:              [0.8,  0.8,  1.0,  1.5,  1.5,  1.5,  1.8,  2.0,  2.0,  2.2],
    sp500:            [3.0,  0.5,  6.0,  2.5,  7.0,  2.0,  7.5,  4.5,  6.5,  6.0],
    bondIndex:        [5.0,  1.5,  4.0,  2.5,  4.5,  2.0,  4.0,  3.5,  4.0,  4.0],
    vnq:              [-3.0, 1.0,  4.0,  5.0,  3.0,  7.5,  2.5,  8.0,  5.5,  4.5],
    mortgageRate:     [6.0,  6.0,  5.75, 5.5,  5.5,  5.5,  5.25, 5.25, 5.0,  5.0],
    delinquencyRate:  [4.3,  4.6,  4.8,  4.7,  4.5,  4.3,  4.1,  4.0,  3.9,  3.8],
    tenYearYield:     [4.5,  4.6,  4.4,  4.3,  4.2,  4.1,  4.0,  3.9,  3.8,  3.8],
    cpi:              [3.2,  3.0,  2.8,  2.7,  2.6,  2.5,  2.4,  2.3,  2.3,  2.2],
    housingStarts:    [940,  910,  900,  910,  930,  950,  960,  970,  975,  980],
    monthsOfSupply:   [3.9,  4.3,  4.6,  4.7,  4.6,  4.5,  4.4,  4.3,  4.2,  4.1],
    nahbHMI:          [38,   34,   36,   39,   42,   43,   45,   47,   48,   50],
    medianIncome:     [85.0, 86.0, 87.5, 89.0, 90.5, 92.0, 93.5, 95.0, 96.5, 98.0],
    rentalVacancy:    [7.2,  7.6,  7.9,  8.1,  8.2,  8.3,  8.3,  8.2,  8.1,  8.0],
    priceToIncome:    [5.8,  5.7,  5.7,  5.7,  5.7,  5.7,  5.7,  5.7,  5.7,  5.8],
    unemploymentRate: [4.5,  5.1,  5.4,  5.3,  5.1,  5.0,  4.8,  4.6,  4.5,  4.4],
    buildingPermits:  [920,  885,  865,  880,  900,  915,  930,  945,  955,  965],
    existingHomeSales:[3.8,  3.6,  3.7,  3.9,  4.0,  4.1,  4.2,  4.3,  4.4,  4.5],
    netHHFormation:   [1100, 980,  990,  1030, 1080, 1100, 1120, 1130, 1140, 1150],
    consumerConfidence:[83,  75,   76,   81,   85,   87,   89,   91,   93,   95],
    fedFundsRate:     [4.0,  4.0,  3.75, 3.5,  3.5,  3.5,  3.25, 3.25, 3.0,  3.0],
    mcai:             [90,   86,   83,   84,   87,   88,   90,   91,   92,   93],
    foreclosureRate:  [1.0,  1.3,  1.4,  1.4,  1.3,  1.2,  1.1,  1.0,  0.9,  0.9],
    homeownershipRate:[65.3, 65.0, 64.8, 64.7, 64.6, 64.6, 64.6, 64.7, 64.8, 64.9],
  },
  base: {
    // 2026–2035 (indices 0–9)
    hpa:              [3.0,  3.5,  4.0,  4.0,  3.5,  3.5,  3.5,  3.5,  3.5,  3.5],
    sp500:            [8.0,  3.5,  11.0, -1.5, 7.0,  4.5,  8.5,  2.0,  6.5,  5.5],
    bondIndex:        [5.5,  2.5,  4.5,  3.0,  5.0,  2.0,  5.0,  4.0,  4.5,  4.5],
    vnq:              [9.0,  4.0,  12.5, 1.5,  9.5,  4.5,  10.0, 3.5,  8.0,  6.5],
    mortgageRate:     [5.5,  5.0,  4.8,  4.5,  4.5,  4.5,  4.5,  4.5,  4.5,  4.5],
    delinquencyRate:  [4.2,  4.0,  3.9,  3.8,  3.7,  3.6,  3.5,  3.5,  3.4,  3.4],
    tenYearYield:     [4.1,  3.9,  3.75, 3.65, 3.6,  3.55, 3.5,  3.45, 3.4,  3.4],
    cpi:              [2.5,  2.3,  2.2,  2.1,  2.1,  2.1,  2.0,  2.0,  2.0,  2.0],
    housingStarts:    [1020, 1060, 1090, 1110, 1130, 1150, 1165, 1180, 1190, 1200],
    monthsOfSupply:   [3.7,  3.5,  3.4,  3.3,  3.2,  3.1,  3.0,  3.0,  2.9,  2.9],
    nahbHMI:          [46,   50,   53,   55,   55,   56,   57,   58,   59,   60],
    medianIncome:     [86.5, 89.0, 91.5, 94.0, 96.5, 99.0, 101.5,104.0,106.5,109.0],
    rentalVacancy:    [6.9,  6.8,  6.7,  6.6,  6.5,  6.4,  6.4,  6.3,  6.3,  6.2],
    priceToIncome:    [5.8,  5.8,  5.9,  6.0,  6.0,  6.1,  6.1,  6.2,  6.3,  6.3],
    unemploymentRate: [4.3,  4.2,  4.0,  3.9,  3.9,  3.8,  3.8,  3.8,  3.8,  3.8],
    buildingPermits:  [980,  1020, 1055, 1080, 1110, 1130, 1150, 1165, 1180, 1190],
    existingHomeSales:[4.3,  4.6,  4.8,  5.0,  5.1,  5.2,  5.3,  5.4,  5.5,  5.5],
    netHHFormation:   [1250, 1280, 1300, 1290, 1270, 1260, 1250, 1240, 1240, 1230],
    consumerConfidence:[100, 104,  107,  109,  111,  112,  114,  115,  116,  117],
    fedFundsRate:     [3.75, 3.25, 3.0,  2.75, 2.75, 2.75, 2.75, 2.75, 2.75, 2.75],
    mcai:             [95,   99,   103,  106,  108,  110,  112,  113,  115,  116],
    foreclosureRate:  [0.9,  0.8,  0.8,  0.7,  0.7,  0.7,  0.6,  0.6,  0.6,  0.6],
    homeownershipRate:[65.5, 65.6, 65.7, 65.8, 66.0, 66.1, 66.2, 66.3, 66.4, 66.5],
  },
  bull: {
    // 2026–2035 (indices 0–9)
    hpa:              [5.0,  6.0,  6.5,  6.0,  5.5,  5.0,  4.5,  4.0,  3.8,  3.5],
    sp500:            [10.0, 5.5,  12.0, 3.0,  9.5,  5.0,  11.5, 3.5,  8.5,  0.0],
    bondIndex:        [6.0,  2.5,  5.5,  2.5,  5.0,  2.5,  5.0,  3.0,  4.5,  4.0],
    vnq:              [18.0, 8.5,  19.0, 4.0,  14.0, 5.0,  16.0, 2.5,  8.0,  0.0],
    mortgageRate:     [4.8,  4.3,  4.0,  4.0,  4.0,  4.0,  4.0,  4.0,  3.8,  3.8],
    delinquencyRate:  [4.0,  3.7,  3.5,  3.4,  3.3,  3.2,  3.1,  3.0,  3.0,  2.9],
    tenYearYield:     [3.9,  3.6,  3.4,  3.3,  3.2,  3.1,  3.0,  2.9,  2.9,  2.8],
    cpi:              [2.3,  2.1,  2.0,  2.0,  2.0,  2.0,  2.0,  2.0,  2.0,  2.0],
    housingStarts:    [1080, 1140, 1190, 1230, 1260, 1280, 1300, 1315, 1325, 1330],
    monthsOfSupply:   [3.4,  3.1,  2.9,  2.8,  2.7,  2.6,  2.5,  2.5,  2.4,  2.4],
    nahbHMI:          [52,   59,   64,   64,   63,   62,   61,   60,   59,   59],
    medianIncome:     [87.5, 91.0, 94.5, 98.0, 101.5,105.0,108.5,112.0,115.5,119.0],
    rentalVacancy:    [6.6,  6.3,  6.1,  5.9,  5.8,  5.7,  5.6,  5.5,  5.5,  5.4],
    priceToIncome:    [5.8,  6.0,  6.1,  6.2,  6.4,  6.5,  6.5,  6.6,  6.6,  6.7],
    unemploymentRate: [4.0,  3.7,  3.5,  3.5,  3.6,  3.6,  3.5,  3.5,  3.5,  3.5],
    buildingPermits:  [1050, 1110, 1170, 1220, 1250, 1275, 1295, 1310, 1325, 1335],
    existingHomeSales:[4.7,  5.2,  5.5,  5.7,  5.8,  5.9,  6.0,  6.1,  6.1,  6.2],
    netHHFormation:   [1350, 1430, 1490, 1470, 1440, 1410, 1380, 1360, 1340, 1320],
    consumerConfidence:[111, 119,  125,  128,  129,  131,  132,  133,  133,  134],
    fedFundsRate:     [3.25, 2.75, 2.5,  2.5,  2.5,  2.5,  2.5,  2.5,  2.25, 2.25],
    mcai:             [100,  109,  117,  122,  125,  127,  129,  131,  132,  133],
    foreclosureRate:  [0.7,  0.6,  0.55, 0.55, 0.5,  0.5,  0.5,  0.45, 0.45, 0.45],
    homeownershipRate:[65.8, 66.2, 66.5, 66.8, 67.1, 67.3, 67.5, 67.6, 67.7, 67.8],
  },
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

  if (aligned) {
    return `Kalshi prediction markets broadly validate this outlook — consensus prices ${notableStr}, consistent with a ${mktTone} environment.`;
  } else if (kalshiFavorable && !modelFavorable) {
    return `Kalshi prediction markets offer a more optimistic cross-check than the model signals — consensus prices ${notableStr}, suggesting potential upside relative to the current ${mktTone} assessment.`;
  } else if (kalshiChallenging && !modelChallenging) {
    return `Kalshi prediction markets offer a cautionary cross-check — consensus prices ${notableStr}, suggesting more headwind than the current ${mktTone} assessment implies.`;
  } else {
    return `Kalshi prediction markets offer a mixed cross-check — ${notableStr} — partially supporting and partially challenging the current ${mktTone} outlook.`;
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

// Map Kalshi series → dashboard metric label
const KALSHI_SERIES_META = {
  KXUSHOMEVAL:    { label: "US Home Value (ZHVI)",  unit: "$k", decimals: 0, housingSignal: (v) => v > 362000 ? 1 : v > 355000 ? 0 : -1 },
  KXMORTGAGERATE: { label: "30-yr Mortgage Rate",  unit: "%",  decimals: 2, housingSignal: (v) => v < 6.5   ? 1 : v < 7.0    ? 0 : -1 },
  KXFED:          { label: "Fed Funds Rate",        unit: "%",  decimals: 2, housingSignal: (v) => v < 4.0   ? 1 : v < 4.75   ? 0 : -1 },
  KXCPIYOY:       { label: "CPI (YoY)",             unit: "%",  decimals: 1, housingSignal: (v) => v < 2.8   ? 1 : v < 3.3    ? 0 : -1 },
  KXCPI:          { label: "CPI (MoM)",             unit: "%",  decimals: 2, housingSignal: (v) => v < 0.2   ? 1 : v < 0.4    ? 0 : -1 },
  KXU3:           { label: "Unemployment Rate",     unit: "%",  decimals: 1, housingSignal: (v) => v < 4.0   ? 1 : v < 5.0    ? 0 : -1 },
  KXEHSALES:      { label: "Existing Home Sales",   unit: "M",  decimals: 2, housingSignal: (v) => v > 4.3   ? 1 : v > 3.9    ? 0 : -1 },
  KXHOUSINGSTART: { label: "Housing Starts",        unit: "M",  decimals: 3, housingSignal: (v) => v > 1.4   ? 1 : v > 1.2    ? 0 : -1 },
  KXNHSALES:      { label: "New Home Sales",        unit: "k",  decimals: 0, housingSignal: (v) => v > 700   ? 1 : v > 600    ? 0 : -1 },
};

const Dashboard = () => {
  const [yearRange, setYearRange] = useState([2016, 2025]);
  const [selectedCity, setSelectedCity] = useState(null); // null = USA highlighted only
  const [tableView, setTableView] = useState("detail"); // 'detail' | 'benchmark' | 'housing'
  const [chartPane, setChartPane] = useState("portfolio"); // 'portfolio' | 'housing'
  const [scenario, setScenario] = useState("base"); // 'bear' | 'base' | 'bull'
  const [ampledgeEnabled, setAmpledgeEnabled] = useState(false);
  const [kalshiData, setKalshiData] = useState(null);   // { series: {KXFED: {markets:[...]}, ...}, fetched_at }
  const [kalshiError, setKalshiError] = useState(null);
  const [kalshiRefreshKey, setKalshiRefreshKey] = useState(0);

  // Fetch Kalshi prediction market data once when Housing Market tab is first visited
  const kalshiFetchedRef = React.useRef(false);
  React.useEffect(() => {
    if (chartPane !== "housing") return;
    if (kalshiFetchedRef.current) return;
    kalshiFetchedRef.current = true;
    const base = process.env.REACT_APP_KALSHI_API_URL || "https://5g28uduwbk.execute-api.us-east-1.amazonaws.com/markets";
    const seriesList = Object.keys(KALSHI_SERIES_META).join(",");
    const url = `${base}?series=${seriesList}`;
    fetch(url)
      .then((r) => r.json())
      .then((data) => setKalshiData(data))
      .catch((err) => { kalshiFetchedRef.current = false; setKalshiError(err.message); });
  }, [chartPane, kalshiRefreshKey]);

  const refreshKalshi = () => {
    kalshiFetchedRef.current = false;
    setKalshiData(null);
    setKalshiError(null);
    setKalshiRefreshKey((k) => k + 1);
  };

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
                    {[["portfolio", "Portfolio"], ["housing", "Housing Market"]].map(([v, label]) => (
                      <button key={v} onClick={() => setChartPane(v)} style={{
                        padding: "5px 12px", fontSize: 11, fontWeight: 600,
                        fontFamily: "'Inter',sans-serif", border: "none", cursor: "pointer",
                        background: chartPane === v ? C.navy : C.white,
                        color: chartPane === v ? C.white : C.muted,
                        transition: "all 0.15s",
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
                              <button onClick={refreshKalshi} title="Refresh market data" style={{ background: "none", border: `1px solid ${C.border}`, borderRadius: 4, cursor: "pointer", padding: "2px 7px", fontSize: 13, color: C.muted, lineHeight: 1 }}>⟳</button>
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
