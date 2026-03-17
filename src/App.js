import React, { useState } from "react";
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Slider,
} from "@mui/material";
import { CS_DATES, CS_HPA } from "./caseShillerData";
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
// Annual return formula: HOME_VALUE × HPA% × Cap + Fees + Bonuses
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
  mortgageRate: [
    10.3,
    10.3,
    10.1,
    9.3,
    8.4,
    7.3,
    8.4,
    7.9,
    7.8,
    7.6, // 1988-1997
    6.9,
    7.4,
    8.1,
    7.0,
    6.5,
    5.8,
    5.8,
    5.9,
    6.4,
    6.3, // 1998-2007
    6.0,
    5.0,
    4.7,
    4.5,
    3.7,
    4.0,
    4.2,
    3.9, // 2008-2015
    3.7,
    4.0,
    4.5,
    3.9,
    3.1,
    3.0,
    5.3,
    6.8,
    6.7,
    6.6, // 2016-2025
  ],
  delinquencyRate: [
    5.0,
    5.0,
    6.0,
    6.5,
    6.0,
    5.5,
    5.0,
    4.9,
    4.9,
    4.8, // 1988-1997
    4.6,
    4.5,
    4.4,
    5.1,
    5.8,
    5.9,
    5.0,
    4.4,
    4.6,
    6.1, // 1998-2007
    9.6,
    14.0,
    13.0,
    11.5,
    10.0,
    8.5,
    6.7,
    5.5, // 2008-2015
    3.7,
    4.0,
    4.5,
    3.9,
    3.1,
    3.0,
    5.3,
    6.8,
    1.8,
    1.8, // 2016-2025
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
Object.assign(CS_ANNUAL_USA, {
  2016: 5.3,
  2017: 6.3,
  2018: 5.1,
  2019: 3.5,
  2020: 10.4,
  2021: 18.8,
  2022: 7.0,
  2023: 5.5,
  2024: 4.3,
  2025: 1.3,
});
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
        <Typography sx={{ fontSize: 11, fontWeight: 800, color: C.red }}>
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
            bgcolor: C.red,
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
    font: { ...baseFont, size: 11 },
    color: C.charcoal,
    boxWidth: 12,
    padding: 12,
  },
};

// ─── Dashboard ─────────────────────────────────────────────────────────────
const Dashboard = () => {
  const [yearRange, setYearRange] = useState([2016, 2025]);
  const [selectedCity, setSelectedCity] = useState(null); // null = USA highlighted only
  const [tableView, setTableView] = useState("detail"); // 'detail' | 'benchmark'
  const [projectedHPA, setProjectedHPA] = useState(4.5); // assumed HPA for years > 2025
  // Consensus CMA defaults: JP Morgan/Vanguard 2026 Long-Term Capital Market Assumptions
  const [projectedSP, setProjectedSP] = useState(5.5);
  const [projectedBond, setProjectedBond] = useState(4.5);
  const [projectedVNQ, setProjectedVNQ] = useState(6.0);

  // All years in the selected range
  const displayYears = [];
  for (let y = yearRange[0]; y <= yearRange[1]; y++) displayYears.push(y);

  // ── Build modeling table (recomputed on every yearRange change) ──
  // Cap schedule is relative to the start year (year 1 = first year in range).
  // Formula: Annual Return = HOME_VALUE × HPA% × Cap + Fees + Bonuses
  // Starting capital compounds: next_start = prev_start + annual_return
  let capital = 80000;
  let spComp = 1.0,
    bndComp = 1.0,
    vnqComp = 1.0;
  const table = displayYears
    .map((yr, i) => {
      const projected = yr > 2025;
      const hpa = projected ? projectedHPA : getHPA(yr);
      if (hpa == null) return null; // skip years with no HPA data
      const cap = CAP_SCHEDULE[i] ?? 1.0; // relative: i=0 → year 1
      const fees = i < 5 ? 900 : 0; // years 1–5 of any simulation
      const bonuses = i === 6 ? 8104 : 0; // year 7 only
      const annualReturn = HOME_VALUE * (hpa / 100) * cap + fees + bonuses;
      const irr = (annualReturn / capital) * 100;
      const endingCapital = capital + annualReturn;
      const cagr = (Math.pow(endingCapital / 80000, 1 / (i + 1)) - 1) * 100;
      const sp = projected ? projectedSP : getBM("sp500", yr);
      const bnd = projected ? projectedBond : getBM("bondIndex", yr);
      const vnq = projected ? projectedVNQ : getBM("vnq", yr);
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
        mortgageRate: getBM("mortgageRate", yr),
        delinquencyRate: getBM("delinquencyRate", yr),
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
    if (yr >= yearRange[0] && yr <= yearRange[1]) acc.push(i);
    return acc;
  }, []);
  const csLabels = csFilteredIndices.map((i) => CS_DATES[i]);
  const csFiltered = (city) => csFilteredIndices.map((i) => CS_HPA[city][i]);

  const shillerData = {
    labels: csLabels,
    datasets: [
      // Cities first (drawn underneath USA)
      ...CS_CITIES.map((city) => {
        const isSelected = selectedCity === city;
        const alpha = isSelected ? "ff" : selectedCity ? "40" : "99";
        const width = isSelected ? 2.5 : 1;
        return {
          label: city,
          data: csFiltered(city),
          borderColor: CITY_COLORS[city] + alpha,
          borderWidth: width,
          pointRadius: 0,
          tension: 0.3,
          spanGaps: true,
        };
      }),
      // USA always on top at full opacity
      {
        label: "USA",
        data: csFiltered("USA"),
        borderColor: C.navy,
        borderWidth: selectedCity ? 2.5 : 3.5,
        pointRadius: 0,
        tension: 0.3,
        spanGaps: true,
        order: -1,
      },
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
        pointRadius: 3,
        tension: 0.3,
      },
      {
        label: "S&P 500",
        data: cumulative(sp500s),
        borderColor: C.greenLight,
        backgroundColor: "transparent",
        borderWidth: 2,
        pointRadius: 2,
        tension: 0.3,
        borderDash: [5, 3],
      },
      {
        label: "Bond Index",
        data: cumulative(bonds),
        borderColor: C.blueLight,
        backgroundColor: "transparent",
        borderWidth: 2,
        pointRadius: 2,
        tension: 0.3,
        borderDash: [2, 2],
      },
      {
        label: "VNQ",
        data: cumulative(vnqs),
        borderColor: C.purpleLight,
        backgroundColor: "transparent",
        borderWidth: 2,
        pointRadius: 2,
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
        label: "Bond Index",
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
        label: "Bond Index",
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
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: `3px solid ${C.red}`,
        }}
      >
        <Box>
          <Box sx={{ display: "flex", alignItems: "baseline", gap: 1 }}>
            <Typography
              sx={{
                color: C.white,
                fontWeight: 900,
                fontSize: 22,
                letterSpacing: "0.01em",
              }}
            >
              AmPledge
            </Typography>
            <Box sx={{ width: 3, height: 18, bgcolor: C.red, mx: 0.5 }} />
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
        <Box sx={{ display: "flex", gap: 1.5 }}>
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
                minWidth: 96,
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
                    <Box sx={{ px: 2, pt: 1, pb: 0.5 }}>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          flexWrap: "wrap",
                        }}
                      >
                        <Typography
                          sx={{
                            fontSize: 11,
                            color: C.muted,
                            fontWeight: 600,
                            mr: 0.5,
                          }}
                        >
                          Projected HPA:
                        </Typography>
                        {[
                          ["Bear", 2],
                          ["Base", 4.5],
                          ["Bull", 7],
                        ].map(([label, val]) => (
                          <button
                            key={label}
                            onClick={() => setProjectedHPA(val)}
                            style={{
                              padding: "3px 10px",
                              fontSize: 11,
                              fontWeight: 600,
                              fontFamily: "'Inter',sans-serif",
                              border: `1px solid ${projectedHPA === val ? C.navy : C.border}`,
                              borderRadius: 4,
                              cursor: "pointer",
                              background:
                                projectedHPA === val ? C.navy : C.white,
                              color: projectedHPA === val ? C.white : C.muted,
                            }}
                          >
                            {label} {val}%
                          </button>
                        ))}
                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                            ml: 0.5,
                          }}
                        >
                          <input
                            type="number"
                            min={-10}
                            max={30}
                            step={0.1}
                            value={projectedHPA}
                            onChange={(e) =>
                              setProjectedHPA(parseFloat(e.target.value) || 0)
                            }
                            style={{
                              width: 60,
                              padding: "3px 6px",
                              fontSize: 11,
                              fontFamily: "'Inter',sans-serif",
                              border: `1px solid ${C.border}`,
                              borderRadius: 4,
                              textAlign: "right",
                            }}
                          />
                          <Typography sx={{ fontSize: 11, color: C.muted }}>
                            %
                          </Typography>
                        </Box>
                      </Box>
                      <Box
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 2,
                          mt: 1,
                          flexWrap: "wrap",
                        }}
                      >
                        {[
                          ["S&P 500", projectedSP, setProjectedSP],
                          ["Bonds", projectedBond, setProjectedBond],
                          ["VNQ", projectedVNQ, setProjectedVNQ],
                        ].map(([label, val, setter]) => (
                          <Box
                            key={label}
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 0.5,
                            }}
                          >
                            <Typography
                              sx={{
                                fontSize: 11,
                                color: C.muted,
                                fontWeight: 600,
                              }}
                            >
                              {label}:
                            </Typography>
                            <input
                              type="number"
                              min={-20}
                              max={50}
                              step={0.1}
                              value={val}
                              onChange={(e) =>
                                setter(parseFloat(e.target.value) || 0)
                              }
                              style={{
                                width: 56,
                                padding: "3px 6px",
                                fontSize: 11,
                                fontFamily: "'Inter',sans-serif",
                                border: `1px solid ${C.border}`,
                                borderRadius: 4,
                                textAlign: "right",
                              }}
                            />
                            <Typography sx={{ fontSize: 11, color: C.muted }}>
                              %
                            </Typography>
                          </Box>
                        ))}
                        <Typography
                          sx={{
                            fontSize: 10,
                            color: C.muted,
                            fontStyle: "italic",
                          }}
                        >
                          Source: JP Morgan / Vanguard 2026 CMA
                        </Typography>
                      </Box>
                      <Typography
                        sx={{ fontSize: 10, color: C.orange, mt: 0.5 }}
                      >
                        ⚠ Years 2026–{yearRange[1]} are projections, not
                        historical data
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>

              {/* Case-Shiller chart */}
              <Box sx={{ display: "flex", gap: 2 }}>
                <Card
                  elevation={0}
                  sx={{
                    border: `1px solid ${C.border}`,
                    borderRadius: 1,
                    flex: 1,
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

                {/* Right 50%: 2 sub-columns */}
                <Grid item xs={12} md={6}>
                  <Grid container spacing={2} sx={{ height: "100%" }}>
                    {/* Left sub-col: Cumulative Growth → Annual Returns → Risk vs Return */}
                    <Grid item xs={12} sm={6}>
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
                    </Grid>

                    {/* Right sub-col: Performance vs Benchmarks (tall) + Portfolio Structure */}
                    <Grid item xs={12} sm={6}>
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
                    </Grid>
                  </Grid>
                </Grid>
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
                mb: 1.5,
              }}
            >
              <SectionHeader
                title="Historical Modeling Table"
                sub="Portfolio simulation · Starting capital $80,000 · AmPledge cap schedule · Annual fees $900 (yrs 1–5) · Bonus $8,104 at yr 7"
              />
              <Box
                sx={{
                  display: "flex",
                  gap: 0,
                  border: `1px solid ${C.border}`,
                  borderRadius: 1,
                  overflow: "hidden",
                  flexShrink: 0,
                  ml: 2,
                }}
              >
                {[
                  ["detail", "Portfolio Detail"],
                  ["benchmark", "Benchmark Comparison"],
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
                      : [
                          "Year",
                          "HPA %",
                          "HOF IRR %",
                          "S&P 500",
                          "Bond Index",
                          "VNQ",
                          "HOF CAGR",
                          "S&P 500 CAGR",
                          "Bond CAGR",
                          "VNQ CAGR",
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
                    const emptyCount = tableView === "detail" ? 9 : 9;
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
            For institutional use only · Not investment advice · AmPledge{" "}
            {new Date().getFullYear()}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default Dashboard;
