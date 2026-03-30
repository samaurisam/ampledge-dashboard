// ─── Color Palette (Morningstar-inspired) ──────────────────────────────────
export const C = {
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
export const HOME_VALUE = 400000; // Fixed home purchase price throughout simulation

export const BM_START = 1988;
export const BM = {
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

export const CAP_SCHEDULE = [
  0.4667, 0.5716, 0.6921, 0.8329, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0,
];

export const CITY_COLORS = {
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

// ─── Chart shared option factories ────────────────────────────────────────
export const baseFont = { family: "'Inter','Helvetica Neue',sans-serif" };
export const baseTooltip = {
  backgroundColor: C.navyDark,
  padding: 10,
  cornerRadius: 4,
  titleFont: { ...baseFont, size: 12 },
  bodyFont: { ...baseFont, size: 11 },
};
export const baseGridScale = {
  grid: { color: "#e8ecf1", lineWidth: 0.8 },
  ticks: { font: { ...baseFont, size: 10 }, color: C.muted },
};
export const baseLegend = {
  labels: {
    font: (ctx) => ({ ...baseFont, size: ctx.chart.width < 450 ? 9 : 11 }),
    color: C.charcoal,
    boxWidth: 10,
    padding: 8,
  },
};

// ─── 5-Year Scenario Projections (2026–2030) ────────────────────────────────
export const PROJ_START = 2026;
export const PROJ = {
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

// Map Kalshi series → dashboard metric label
export const KALSHI_SERIES_META = {
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

// ─── Ground Score Supplemental Data ─────────────────────────────────────────
// Sources: USASpending FY2024, EPA ACRES/FRS, HUD Opportunity Zones ArcGIS,
//          Zillow ZHVI county CSV (2025-03 vintage), Census CBP 2023
export const GROUND_SCORE_SUPPLEMENTAL = {
  brownsville_tx:  { usaspending_fy24_m: 2077,  epa_brownfields: 8,  oz_tracts: 16, estab: 6732,  emp: 123749, zhvi_2020: 125615, zhvi_latest: 201232, app_4yr: 60.2, app_2yr: 18.9 },
  edinburg_tx:     { usaspending_fy24_m: 3665,  epa_brownfields: 10, oz_tracts: 23, estab: 13393, emp: 227682, zhvi_2020: 118116, zhvi_latest: 190200, app_4yr: 61.0, app_2yr: 27.3 },
  kokomo_in:       { usaspending_fy24_m: 571,   epa_brownfields: 51, oz_tracts: 1,  estab: 1813,  emp: 31554,  zhvi_2020: 110752, zhvi_latest: 175176, app_4yr: 58.2, app_2yr: 26.5 },
  winstonsalem_nc: { usaspending_fy24_m: 2747,  epa_brownfields: 18, oz_tracts: 11, estab: 9141,  emp: 190157, zhvi_2020: 177065, zhvi_latest: 277950, app_4yr: 57.0, app_2yr: 22.4 },
  tulsa_ok:        { usaspending_fy24_m: 4750,  epa_brownfields: 87, oz_tracts: 21, estab: 19556, emp: 329036, zhvi_2020: 156975, zhvi_latest: 239702, app_4yr: 52.7, app_2yr: 19.9 },
  hinesville_ga:   { usaspending_fy24_m: 645,   epa_brownfields: 6,  oz_tracts: 0,  estab: 921,   emp: 14880,  zhvi_2020: 143054, zhvi_latest: 242700, app_4yr: 69.7, app_2yr: 35.8 },
  pittsburgh_pa:   { usaspending_fy24_m: 23427, epa_brownfields: 500,oz_tracts: 68, estab: 33812, emp: 709774, zhvi_2020: 168373, zhvi_latest: 229802, app_4yr: 36.5, app_2yr: 13.9 },
  rockford_il:     { usaspending_fy24_m: 2410,  epa_brownfields: 177,oz_tracts: 5,  estab: 6286,  emp: 117137, zhvi_2020: 110321, zhvi_latest: 181654, app_4yr: 64.7, app_2yr: 35.3 },
  muncie_in:       { usaspending_fy24_m: 710,   epa_brownfields: 60, oz_tracts: 4,  estab: 2314,  emp: 40098,  zhvi_2020: 93779,  zhvi_latest: 157619, app_4yr: 68.1, app_2yr: 28.8 },
  erie_pa:         { usaspending_fy24_m: 1977,  epa_brownfields: 16, oz_tracts: 8,  estab: 6103,  emp: 114339, zhvi_2020: 131677, zhvi_latest: 201398, app_4yr: 52.9, app_2yr: 27.7 },
  scranton_pa:     { usaspending_fy24_m: 1742,  epa_brownfields: 31, oz_tracts: 8,  estab: 5198,  emp: 91059,  zhvi_2020: 140805, zhvi_latest: 221817, app_4yr: 57.5, app_2yr: 25.3 },
  binghamton_ny:   { usaspending_fy24_m: 1367,  epa_brownfields: 10, oz_tracts: 6,  estab: 4001,  emp: 68190,  zhvi_2020: 114296, zhvi_latest: 179062, app_4yr: 56.7, app_2yr: 30.2 },
  terrehaute_in:   { usaspending_fy24_m: 669,   epa_brownfields: 32, oz_tracts: 3,  estab: 2473,  emp: 41318,  zhvi_2020: 101818, zhvi_latest: 154097, app_4yr: 51.3, app_2yr: 24.4 },
  johnstown_pa:    { usaspending_fy24_m: 1618,  epa_brownfields: 75, oz_tracts: 5,  estab: 2996,  emp: 43601,  zhvi_2020: 122433, zhvi_latest: 121316, app_4yr: -0.9, app_2yr: -15.7 },
  beckley_wv:      { usaspending_fy24_m: 653,   epa_brownfields: 6,  oz_tracts: 2,  estab: 1713,  emp: 26532,  zhvi_2020: 97645,  zhvi_latest: 157171, app_4yr: 61.0, app_2yr: 33.5 },
};

// Nearest Case-Shiller metro proxy per market (null = no meaningful match)
export const GROUND_SCORE_CS_PROXY = {
  brownsville_tx:  "Dallas",
  edinburg_tx:     "Dallas",
  kokomo_in:       "Chicago",
  winstonsalem_nc: "Charlotte",
  tulsa_ok:        null,
  hinesville_ga:   "Atlanta",
  pittsburgh_pa:   null,
  rockford_il:     "Chicago",
  muncie_in:       "Chicago",
  erie_pa:         "Cleveland",
  scranton_pa:     "New York",
  binghamton_ny:   "New York",
  terrehaute_in:   "Chicago",
  johnstown_pa:    "Cleveland",
  beckley_wv:      null,
};
// Approximate driving distance (miles) from each market to its CS proxy metro
export const GROUND_SCORE_CS_DIST = {
  brownsville_tx:  540,
  edinburg_tx:     500,
  kokomo_in:        65,
  winstonsalem_nc:  80,
  hinesville_ga:   245,
  rockford_il:      90,
  muncie_in:       165,
  erie_pa:          95,
  scranton_pa:     120,
  binghamton_ny:   185,
  terrehaute_in:   170,
  johnstown_pa:    165,
};

// ─── Ground Score Location Intelligence Data ────────────────────────────────
export const NEOPOLI_DIMS = [
  { id: "entry_cost",               label: "Entry Cost",                weight: 12, desc: "Median home price, land cost, and rent burden relative to the candidate universe. Higher score = cheaper, more accessible basis." },
  { id: "economic_distress",        label: "Economic Distress",         weight: 10, desc: "Poverty rate, median household income, unemployment rate, and vacancy burden. Higher score = deeper distress and greater receptiveness to intervention." },
  { id: "demographic_momentum",     label: "Demographic Momentum",      weight: 10, desc: "City and county population growth rates and permit intensity. Higher score = more people and construction activity moving into the market." },
  { id: "labor_market_momentum",    label: "Labor Momentum",            weight: 10, desc: "County employment growth rate and labor force participation trends. Higher score = more jobs being created and a workforce that is expanding, not contracting." },
  { id: "business_dynamism",        label: "Business Dynamism",         weight:  8, desc: "Establishment count, firm formation rate, and sectoral diversity. Higher score = more active, diverse private-sector economy with capacity to absorb new development." },
  { id: "catalyst_evidence",        label: "Catalyst Evidence",         weight: 10, desc: "Documented large-scale investments, federal awards, major project announcements, and Opportunity Zone designation. Higher score = more concrete activation signals already in motion." },
  { id: "anchor_institutions",      label: "Anchor Institutions",       weight:  8, desc: "Presence of universities, major health systems, military installations, and large stable employers. Higher score = more institutional permanence anchoring long-term demand." },
  { id: "infrastructure_readiness", label: "Infrastructure Readiness",  weight:  8, desc: "Utility capacity, broadband access, road and transit quality, and available industrial or commercial land. Higher score = less infrastructure investment required before development can begin." },
  { id: "logistics",                label: "Logistics & Market Access",  weight:  8, desc: "Interstate highway access, rail and port connectivity, proximity to distribution hubs, and freight movement capacity. Higher score = better ability to move goods and people to and from the market." },
  { id: "governance",               label: "Governance & Incentives",   weight:  6, desc: "Local government fiscal health, planning capacity, tax incentive availability, and track record of public-private collaboration. Higher score = more capable and cooperative local operating environment." },
  { id: "risk_resilience",          label: "Risk & Resilience",         weight:  5, desc: "Natural hazard exposure (flood, wind, seismic), FEMA risk profile, and climate vulnerability. Higher score = lower physical risk to long-term infrastructure and asset value." },
  { id: "env_regulatory",           label: "Env. & Regulatory",         weight:  5, desc: "Brownfield burden, EPA enforcement history, air and water quality, and permitting complexity. Higher score = lower environmental friction and remediation liability for development." },
];

export const NEOPOLI_TIER_META = {
  lead_market:     { label: "Lead Market",     color: "#27ae60", barColor: "#27ae60" },
  priority_market: { label: "Priority Market", color: "#52a870", barColor: "#82c8a5", badgeBg: "#e0f2e9" },
  watchlist:       { label: "Watchlist",       color: "#6b9bb3", barColor: "#81b6d1", badgeBg: "#dce5e9" },
  deprioritized:   { label: "Deprioritized",   color: C.muted,   barColor: "#bac0c9" },
};

export const NEOPOLI_MARKETS = [
  { rank: 1,  id: "brownsville_tx",  name: "Brownsville",   state: "TX", county: "Cameron County",    coordinates: [-97.4975, 25.9017], composite: 69.19, confidence: 88.4, tier: "lead_market",
    strategic: "South Texas border market with SpaceX-adjacent regional stimulus, strong permit intensity, and strong labor expansion.",
    rationale: "Brownsville leads the candidate set by combining a measurable cost basis, the highest labor-market expansion score in the universe, and the transformative regional footprint of SpaceX's Starbase facility 30 miles south. Federal contract flows, port and rail logistics connectivity, and continuous population growth make this the most broadly activated market in the screened set. Lead Market status reflects the strongest convergence of cost advantage, momentum, and executable conditions found in this analysis — the primary risk factors of hurricane exposure and moderate relative cost are real but do not offset the depth of its catalyst stack.",
    strengths: ["Strong anchor and logistics profile", "Strong county employment growth", "Positive city and county population growth"],
    constraints: ["Not the cheapest market in the screened set", "Material hurricane/flood exposure"],
    dims: { entry_cost: 51.32, economic_distress: 65.69, demographic_momentum: 57.92, labor_market_momentum: 100.0, business_dynamism: 65.39, catalyst_evidence: 90.0, anchor_institutions: 68.0, infrastructure_readiness: 70.0, logistics: 90.0, governance: 70.0, risk_resilience: 38.0, env_regulatory: 42.0 } },
  { rank: 2,  id: "edinburg_tx",     name: "Edinburg",      state: "TX", county: "Hidalgo County",    coordinates: [-98.1633, 26.3017], composite: 62.21, confidence: 88.4, tier: "priority_market",
    strategic: "Fast-growing border-corridor market with very strong population and construction momentum and a broader Hidalgo County development platform.",
    rationale: "Edinburg is the demographic front-runner in the candidate set, posting the highest population growth rate and permit intensity of any market screened. As part of the broader Hidalgo County development corridor it shares South Texas macro-tailwinds with Brownsville while offering a distinct county-scale platform. Priority Market status reflects strong multi-dimensional convergence; the main offsets are weaker affordability relative to peers and material storm risk shared across the Rio Grande Valley.",
    strengths: ["Highest demographic momentum in candidate universe", "Highest permit intensity in candidate universe", "Strong border-metro scale"],
    constraints: ["Weaker affordability than several peers", "Hurricane and flood risk remain material"],
    dims: { entry_cost: 29.31, economic_distress: 64.67, demographic_momentum: 95.40, labor_market_momentum: 58.97, business_dynamism: 29.45, catalyst_evidence: 78.0, anchor_institutions: 70.0, infrastructure_readiness: 72.0, logistics: 86.0, governance: 69.0, risk_resilience: 40.0, env_regulatory: 45.0 } },
  { rank: 3,  id: "kokomo_in",       name: "Kokomo",        state: "IN", county: "Howard County",     coordinates: [-86.1336, 40.4864], composite: 61.50, confidence: 75.4, tier: "priority_market",
    strategic: "Anchor-led Midwestern manufacturing market transformed by the StarPlus battery complex and related supplier activity.",
    rationale: "Kokomo's Priority Market placement is anchored by a single transformative catalyst: the StarPlus Energy battery gigafactory, a multi-billion-dollar investment that has fundamentally restructured local labor demand and regional supply chains. The thesis is anchor-led industrial activation on a workable Midwestern cost basis rather than organic demographic momentum. The primary risk is anchor concentration — if the broader EV investment cycle slows, the activation thesis requires reassessment.",
    strengths: ["Transformative documented catalyst", "Manageable basis and Midwestern operating costs", "Manufacturing thesis fits market well"],
    constraints: ["Anchor concentration risk elevated", "Demographic momentum is only moderate"],
    dims: { entry_cost: 51.47, economic_distress: 46.82, demographic_momentum: 32.49, labor_market_momentum: 60.57, business_dynamism: 72.49, catalyst_evidence: 88.0, anchor_institutions: 72.0, infrastructure_readiness: 66.0, logistics: 72.0, governance: 64.0, risk_resilience: 62.0, env_regulatory: 60.0 } },
  { rank: 4,  id: "winstonsalem_nc", name: "Winston-Salem", state: "NC", county: "Forsyth County",    coordinates: [-80.2442, 36.0999], composite: 59.62, confidence: 88.4, tier: "priority_market",
    strategic: "Piedmont Triad growth market with Innovation Quarter Phase II, strong county permit activity, and strong institutional depth.",
    rationale: "Winston-Salem combines exceptional institutional depth — Wake Forest University, Atrium Health, and an expanding Innovation Quarter — with some of the strongest permit activity in the candidate set. It earns Priority Market status as a high-execution-capability market with documented district-scale development ambition, particularly in life sciences and advanced manufacturing. This is not a distress or deep basis play; the constraint is limited affordability advantage relative to lower-cost peers.",
    strengths: ["Strong institutions and human capital", "Very strong permit and county growth profile", "Documented district-scale expansion activity"],
    constraints: ["Too expensive for a deep-value basis play", "Distress is modest rather than acute"],
    dims: { entry_cost: 8.46, economic_distress: 44.76, demographic_momentum: 73.01, labor_market_momentum: 70.23, business_dynamism: 22.99, catalyst_evidence: 82.0, anchor_institutions: 86.0, infrastructure_readiness: 80.0, logistics: 75.0, governance: 74.0, risk_resilience: 58.0, env_regulatory: 63.0 } },
  { rank: 5,  id: "tulsa_ok",        name: "Tulsa",         state: "OK", county: "Tulsa County",      coordinates: [-95.9928, 36.1540], composite: 58.71, confidence: 88.4, tier: "priority_market",
    strategic: "Large inland Oklahoma logistics market with the Tulsa Port of Catoosa, growing county base, and diversified business stock.",
    rationale: "Tulsa's Priority Market designation reflects a well-balanced profile: a large inland metro with workable costs, a significant logistics platform anchored by the Port of Catoosa, and a diversified business base that no single employer dominates. No individual dimension scores at the extremes, making this a lower-volatility candidate compared to more concentrated activation plays. The opportunity is less about transformative upside and more about a large, underpriced market with real infrastructure assets and steady underlying fundamentals.",
    strengths: ["Strong logistics and industrial access", "Large diverse county business base", "Still reasonably priced vs. major metros"],
    constraints: ["City-level distress is moderate not high", "Momentum steady rather than explosive"],
    dims: { entry_cost: 26.58, economic_distress: 45.07, demographic_momentum: 48.02, labor_market_momentum: 52.54, business_dynamism: 48.64, catalyst_evidence: 76.0, anchor_institutions: 78.0, infrastructure_readiness: 76.0, logistics: 88.0, governance: 71.0, risk_resilience: 55.0, env_regulatory: 62.0 } },
  { rank: 6,  id: "hinesville_ga",   name: "Hinesville",    state: "GA", county: "Liberty County",    coordinates: [-81.5960, 31.8469], composite: 57.79, confidence: 88.4, tier: "watchlist",
    strategic: "Seed-case market supported by Fort Stewart, MidCoast Regional Airport, I-95 access, and proximity to the Savannah logistics system.",
    rationale: "Hinesville is the seed case for the Ground Score rubric — the market that first revealed the growth pattern the scoring framework was built to detect. Fort Stewart provides a permanent institutional anchor, and I-95 proximity to the Savannah logistics corridor ensures freight connectivity and a durable demand floor. Watchlist placement reflects lower-than-average distress and a growth thesis that remains heavily tied to military allocation and the Savannah corridor rather than independent development catalysts.",
    strengths: ["Very strong county and city growth", "Clear military-anchor ecosystem", "Small enough to matter but large enough to absorb district investment"],
    constraints: ["Distress lower than in poorest-comp set", "Growth heavily linked to Fort Stewart and Savannah corridor"],
    dims: { entry_cost: 16.28, economic_distress: 26.90, demographic_momentum: 78.18, labor_market_momentum: 64.42, business_dynamism: 24.49, catalyst_evidence: 88.0, anchor_institutions: 82.0, infrastructure_readiness: 74.0, logistics: 84.0, governance: 68.0, risk_resilience: 45.0, env_regulatory: 52.0 } },
  { rank: 7,  id: "pittsburgh_pa",   name: "Pittsburgh",    state: "PA", county: "Allegheny County",  coordinates: [-79.9959, 40.4406], composite: 57.49, confidence: 88.4, tier: "watchlist",
    strategic: "High-capability innovation market anchored by CMU, health systems, and advanced manufacturing redevelopment.",
    rationale: "Pittsburgh holds the highest anchor institution score in the candidate universe, driven by Carnegie Mellon, the University of Pittsburgh, and a deep health system network — all supporting a credible advanced manufacturing and robotics redevelopment thesis. It sits at Watchlist rather than Priority because basis advantage is weak by this rubric's standards and county-level population continues to decline. The opportunity is real but requires a specific execution framework that pairs the institutional platform with available development sites and a committed public-sector partner.",
    strengths: ["Exceptional anchor institutions and advanced-industry ecosystem", "Large labor shed and strong governance capacity", "Documented robotics/manufacturing redevelopment"],
    constraints: ["Basis advantage is weak for this thesis", "County population trend is negative"],
    dims: { entry_cost: 10.40, economic_distress: 44.06, demographic_momentum: 29.04, labor_market_momentum: 50.22, business_dynamism: 71.95, catalyst_evidence: 80.0, anchor_institutions: 94.0, infrastructure_readiness: 82.0, logistics: 78.0, governance: 73.0, risk_resilience: 61.0, env_regulatory: 48.0 } },
  { rank: 8,  id: "rockford_il",     name: "Rockford",      state: "IL", county: "Winnebago County",  coordinates: [-89.0940, 42.2711], composite: 56.54, confidence: 82.8, tier: "watchlist",
    strategic: "Better labor-market performance than many distressed peers but weaker demographic momentum and middling catalyst depth.",
    rationale: "Rockford scores well on labor-market momentum relative to its distress profile and occupies a useful Midwest freight position near major I-39/I-90 corridors. Watchlist placement reflects the tension between that labor performance and a still-declining population trend, combined with a catalyst stack that has not yet produced a documented development trigger strong enough for Priority consideration. It remains a viable candidate — the conditions exist — but advancement requires a specific identified project or anchor commitment.",
    strengths: ["Good labor-market momentum", "Reasonable housing cost profile", "Useful logistics position in the Midwest"],
    constraints: ["Population still declining", "Catalyst stack not yet strong enough"],
    dims: { entry_cost: 52.36, economic_distress: 57.53, demographic_momentum: 18.21, labor_market_momentum: 78.28, business_dynamism: 52.19, catalyst_evidence: 50.0, anchor_institutions: 62.0, infrastructure_readiness: 66.0, logistics: 77.0, governance: 58.0, risk_resilience: 59.0, env_regulatory: 57.0 } },
  { rank: 9,  id: "muncie_in",       name: "Muncie",        state: "IN", county: "Delaware County",   coordinates: [-85.3864, 40.1934], composite: 53.86, confidence: 82.8, tier: "watchlist",
    strategic: "Cheap and still-usable Midwestern university market with modest stabilization but limited current labor momentum.",
    rationale: "Muncie offers one of the best basis-advantage profiles in the screened universe — very low entry cost combined with high economic distress — with Ball State University providing a residual institutional anchor and some workforce stabilization. Watchlist placement reflects that these conditions alone are not sufficient: labor-market momentum is weak, business dynamism is low, and catalyst evidence is limited. Muncie's value is latent; it becomes more compelling only if a specific development trigger or committed public investment can be identified to break the stagnation pattern.",
    strengths: ["Very good basis advantage", "High distress with still-usable workforce", "Some stabilization rather than outright collapse"],
    constraints: ["Weak labor momentum", "Catalyst evidence is limited"],
    dims: { entry_cost: 68.07, economic_distress: 85.87, demographic_momentum: 29.95, labor_market_momentum: 32.41, business_dynamism: 16.73, catalyst_evidence: 44.0, anchor_institutions: 66.0, infrastructure_readiness: 60.0, logistics: 64.0, governance: 58.0, risk_resilience: 63.0, env_regulatory: 66.0 } },
  { rank: 10, id: "erie_pa",         name: "Erie",          state: "PA", county: "Erie County",       coordinates: [-80.0851, 42.1292], composite: 53.12, confidence: 82.8, tier: "watchlist",
    strategic: "Great Lakes industrial legacy market with workable cost structure but declining population and only mid-level activation evidence.",
    rationale: "Erie is a Great Lakes legacy industrial market with a workable cost structure and a usable port and manufacturing platform inherited from its industrial history. It sits at Watchlist because demographic momentum is negative, labor and business activity are only moderate, and catalyst depth is limited relative to higher-ranked peers. The structural case for intervention is present — the physical assets and workforce base exist — but the current signal environment does not yet support a higher designation.",
    strengths: ["Good entry cost", "Manageable institutional base", "Useful lake/industrial legacy context"],
    constraints: ["Negative demographic trajectory", "Only moderate labor and business momentum"],
    dims: { entry_cost: 63.08, economic_distress: 70.12, demographic_momentum: 11.97, labor_market_momentum: 52.53, business_dynamism: 27.25, catalyst_evidence: 46.0, anchor_institutions: 67.0, infrastructure_readiness: 62.0, logistics: 72.0, governance: 58.0, risk_resilience: 57.0, env_regulatory: 58.0 } },
  { rank: 11, id: "scranton_pa",     name: "Scranton",      state: "PA", county: "Lackawanna County", coordinates: [-75.6624, 41.4090], composite: 53.03, confidence: 82.8, tier: "watchlist",
    strategic: "Northeast corridor-adjacent market with modest resilience but less basis advantage and only moderate momentum.",
    rationale: "Scranton's primary asset is its position within commuting range of the Northeast corridor, which provides a structural floor on demand and labor-market stability that more isolated markets lack. Watchlist placement reflects moderate scores across most dimensions without a standout strength — it is not cheap enough for a deep basis play, not dynamic enough for a momentum play, and not catalyst-rich enough for an activation play. Corridor access and baseline resilience keep it on the list as a candidate worth monitoring for a triggering event.",
    strengths: ["Reasonable corridor access", "Moderate labor and governance profile", "Not in steepest decline"],
    constraints: ["Less cheap than better-value peers", "Momentum remains only moderate"],
    dims: { entry_cost: 38.48, economic_distress: 65.24, demographic_momentum: 23.91, labor_market_momentum: 54.94, business_dynamism: 37.55, catalyst_evidence: 48.0, anchor_institutions: 68.0, infrastructure_readiness: 63.0, logistics: 79.0, governance: 60.0, risk_resilience: 60.0, env_regulatory: 56.0 } },
  { rank: 12, id: "binghamton_ny",   name: "Binghamton",    state: "NY", county: "Broome County",     coordinates: [-75.9180, 42.0987], composite: 52.05, confidence: 82.8, tier: "watchlist",
    strategic: "Very distressed and still affordable, but the current evidence base points to stagnation rather than self-sustaining acceleration.",
    rationale: "Binghamton carries the highest distress score in the candidate universe, which means it offers maximum receptiveness to intervention and significant potential for basis-driven upside. Watchlist placement reflects the fact that current momentum signals — demographic, labor, and business — are all weak, indicating stagnation rather than early-stage acceleration. A strong external catalyst or committed public-sector partner would be required to move this market into a Priority tier; absent that, it remains a high-upside but unactivated candidate.",
    strengths: ["Very strong distress/basis profile", "Some institutional depth", "Could respond to a strong intervention strategy"],
    constraints: ["Current momentum remains weak", "Business dynamism is low"],
    dims: { entry_cost: 59.51, economic_distress: 93.10, demographic_momentum: 12.46, labor_market_momentum: 32.41, business_dynamism: 24.04, catalyst_evidence: 44.0, anchor_institutions: 70.0, infrastructure_readiness: 60.0, logistics: 66.0, governance: 56.0, risk_resilience: 61.0, env_regulatory: 54.0 } },
  { rank: 13, id: "terrehaute_in",   name: "Terre Haute",   state: "IN", county: "Vigo County",       coordinates: [-87.4139, 39.4667], composite: 51.99, confidence: 82.8, tier: "watchlist",
    strategic: "Low-cost value market with acceptable stability but limited evidence of near-term acceleration.",
    rationale: "Terre Haute is a low-cost, moderate-distress Indiana market with acceptable stability but limited evidence of near-term acceleration. Watchlist placement reflects a viable but unactivated candidate — the cost structure and usable workforce are present, but the catalyst stack is thin and current momentum metrics do not indicate self-sustaining growth. Additional research into specific site or sector opportunities would be needed before advancement to a higher tier can be justified.",
    strengths: ["Solid affordability", "Usable distress profile", "Not currently overheating"],
    constraints: ["Current acceleration is weak", "Catalyst stack is thin"],
    dims: { entry_cost: 60.36, economic_distress: 76.19, demographic_momentum: 24.96, labor_market_momentum: 38.05, business_dynamism: 20.24, catalyst_evidence: 42.0, anchor_institutions: 64.0, infrastructure_readiness: 58.0, logistics: 68.0, governance: 56.0, risk_resilience: 62.0, env_regulatory: 67.0 } },
  { rank: 14, id: "johnstown_pa",    name: "Johnstown",     state: "PA", county: "Cambria County",    coordinates: [-78.9219, 40.3267], composite: 49.82, confidence: 82.8, tier: "deprioritized",
    strategic: "Extreme basis-advantage market, but the current demographic and labor trends remain materially adverse.",
    rationale: "Johnstown offers the highest basis advantage in the entire candidate set — it is by far the cheapest market on absolute cost metrics — alongside extreme economic distress that creates clear receptiveness to intervention. It is deprioritized because demographic and labor trends are materially adverse, and a viable development strategy would require an unusually intervention-heavy approach to overcome structural headwinds. Advancement is possible only with a specific committed catalyst and a credible public-sector partner; without that, near-term prioritization is not supported by the current evidence.",
    strengths: ["Extreme basis advantage", "High distress creates receptiveness", "Still a meaningful small-city platform"],
    constraints: ["Demographic and labor trends materially adverse", "Would require a very intervention-heavy strategy"],
    dims: { entry_cost: 100.0, economic_distress: 90.59, demographic_momentum: 1.85, labor_market_momentum: 22.29, business_dynamism: 19.12, catalyst_evidence: 28.0, anchor_institutions: 55.0, infrastructure_readiness: 50.0, logistics: 60.0, governance: 52.0, risk_resilience: 64.0, env_regulatory: 50.0 } },
  { rank: 15, id: "beckley_wv",      name: "Beckley",       state: "WV", county: "Raleigh County",    coordinates: [-81.1882, 37.7782], composite: 46.27, confidence: 68.8, tier: "deprioritized",
    strategic: "Lower-cost Appalachian market with some labor stabilization but major demographic drag and weaker execution conditions.",
    rationale: "Beckley is the lowest-scoring market in the screened universe, reflecting a combination of severe demographic decline, weaker infrastructure and logistics conditions, and a constrained execution environment relative to peers. Some labor-market stabilization has occurred, and the Appalachian entry cost is low, but these positives are not sufficient to offset the demographic trajectory and execution challenges. Deprioritized status reflects that this market lacks the institutional depth and connectivity needed to support a near-term development initiative without extraordinary intervention.",
    strengths: ["Lower-cost Appalachian entry point", "Employment trend not as weak as population trend"],
    constraints: ["Population trend severely negative", "Infrastructure and logistics profile weaker than most peers"],
    dims: { entry_cost: 48.26, economic_distress: 45.86, demographic_momentum: 0.24, labor_market_momentum: 71.37, business_dynamism: 45.89, catalyst_evidence: 36.0, anchor_institutions: 54.0, infrastructure_readiness: 48.0, logistics: 55.0, governance: 50.0, risk_resilience: 60.0, env_regulatory: 58.0 } },
];

// ─── Opportunity Urban Signals — MPD Site Selection ─────────────────────────
export const OPPORTUNITY_DIMS = [
  { id: "metro_adjacency",    label: "Metro Adjacency",           weight: 14, desc: "Drive time and highway access to the nearest major employment center. Higher score = closer commute to a substantial job market, the primary demand driver for master-planned communities." },
  { id: "pop_migration",      label: "Population & Migration",    weight: 12, desc: "Net in-migration rate, household formation, and county/MSA growth trajectory. Higher score = confirmed, sustained population demand flowing into the region." },
  { id: "land_availability",  label: "Land Availability",         weight: 10, desc: "Raw land cost per acre at the urban fringe, contiguous parcel availability, and undeveloped land share. Higher score = cheaper, more accessible greenfield sites for large-scale community development." },
  { id: "household_income",   label: "Household Income",          weight: 10, desc: "Median household income of residents and in-migrating households, plus income growth trajectory. Higher score = stronger buyer qualification capacity and pricing power for new home product." },
  { id: "employment_base",    label: "Employment Base",           weight: 10, desc: "Size, growth rate, and industry diversity of the parent metro job market. Higher score = larger, more diverse employment base within commute range, sustaining long-term demand." },
  { id: "school_district",    label: "School District Quality",   weight:  8, desc: "School district ratings, standardized test performance, and enrollment capacity headroom. Higher score = stronger district quality, the single most cited factor in family household location decisions." },
  { id: "housing_demand",     label: "Housing Demand Pressure",   weight:  8, desc: "Metro price appreciation, inventory tightness, days on market, and new home absorption rate. Higher score = more demand pressure and less competitive supply, supporting new community pricing." },
  { id: "infrastructure",     label: "Infrastructure Capacity",   weight:  8, desc: "Water, sewer, and utility availability at the urban fringe, road network capacity, and broadband coverage. Higher score = less infrastructure investment required before development can begin." },
  { id: "permitting_climate", label: "Permitting & Dev. Climate", weight:  8, desc: "Development approval speed, impact fee structure, annexation policy, and demonstrated pro-growth local government posture. Higher score = faster, more predictable path through entitlement." },
  { id: "natural_amenity",    label: "Natural Amenity",           weight:  6, desc: "Climate desirability, recreation access, natural beauty, and quality-of-life factors driving household migration decisions. Higher score = stronger lifestyle appeal attracting and retaining residents." },
  { id: "risk_resilience",    label: "Risk & Resilience",         weight:  4, desc: "Natural hazard exposure including flood, wind, seismic, and long-term climate vulnerability. Higher score = lower physical risk profile for long-term infrastructure and asset value." },
  { id: "tax_regulatory",     label: "Tax & Regulatory",          weight:  2, desc: "State income tax burden, property tax rate, and overall development-friendliness of state and local regulatory environment. Higher score = lower tax friction and more business-friendly operating environment." },
];

// Opportunity scores for the current contrarian market set (expected poor — validates thesis separation)
export const OPPORTUNITY_SCORES = {
  brownsville_tx:  { composite: 35.1, confidence: 68, tier: "deprioritized", dims: { metro_adjacency: 12, pop_migration: 62, land_availability: 42, household_income: 14, employment_base: 33, school_district: 18, housing_demand: 36, infrastructure: 44, permitting_climate: 46, natural_amenity: 44, risk_resilience: 36, tax_regulatory: 76 } },
  edinburg_tx:     { composite: 38.0, confidence: 68, tier: "deprioritized", dims: { metro_adjacency: 15, pop_migration: 74, land_availability: 52, household_income: 16, employment_base: 30, school_district: 20, housing_demand: 38, infrastructure: 46, permitting_climate: 48, natural_amenity: 34, risk_resilience: 38, tax_regulatory: 76 } },
  kokomo_in:       { composite: 42.5, confidence: 72, tier: "deprioritized", dims: { metro_adjacency: 46, pop_migration: 24, land_availability: 56, household_income: 36, employment_base: 42, school_district: 38, housing_demand: 34, infrastructure: 54, permitting_climate: 52, natural_amenity: 28, risk_resilience: 62, tax_regulatory: 68 } },
  winstonsalem_nc: { composite: 51.2, confidence: 72, tier: "watchlist",     dims: { metro_adjacency: 42, pop_migration: 52, land_availability: 46, household_income: 42, employment_base: 54, school_district: 46, housing_demand: 58, infrastructure: 62, permitting_climate: 58, natural_amenity: 58, risk_resilience: 58, tax_regulatory: 58 } },
  tulsa_ok:        { composite: 47.3, confidence: 72, tier: "watchlist",     dims: { metro_adjacency: 26, pop_migration: 44, land_availability: 58, household_income: 44, employment_base: 56, school_district: 42, housing_demand: 46, infrastructure: 60, permitting_climate: 62, natural_amenity: 42, risk_resilience: 50, tax_regulatory: 62 } },
  hinesville_ga:   { composite: 43.0, confidence: 68, tier: "deprioritized", dims: { metro_adjacency: 38, pop_migration: 58, land_availability: 36, household_income: 38, employment_base: 30, school_district: 40, housing_demand: 44, infrastructure: 54, permitting_climate: 42, natural_amenity: 50, risk_resilience: 44, tax_regulatory: 56 } },
  pittsburgh_pa:   { composite: 40.8, confidence: 72, tier: "deprioritized", dims: { metro_adjacency: 20, pop_migration: 16, land_availability: 30, household_income: 50, employment_base: 66, school_district: 50, housing_demand: 38, infrastructure: 58, permitting_climate: 42, natural_amenity: 55, risk_resilience: 60, tax_regulatory: 36 } },
  rockford_il:     { composite: 39.6, confidence: 68, tier: "deprioritized", dims: { metro_adjacency: 52, pop_migration: 20, land_availability: 56, household_income: 32, employment_base: 36, school_district: 28, housing_demand: 36, infrastructure: 52, permitting_climate: 46, natural_amenity: 30, risk_resilience: 55, tax_regulatory: 30 } },
  muncie_in:       { composite: 35.8, confidence: 68, tier: "deprioritized", dims: { metro_adjacency: 46, pop_migration: 14, land_availability: 58, household_income: 24, employment_base: 26, school_district: 24, housing_demand: 24, infrastructure: 44, permitting_climate: 50, natural_amenity: 28, risk_resilience: 62, tax_regulatory: 68 } },
  erie_pa:         { composite: 35.0, confidence: 68, tier: "deprioritized", dims: { metro_adjacency: 36, pop_migration: 18, land_availability: 40, household_income: 30, employment_base: 34, school_district: 26, housing_demand: 36, infrastructure: 44, permitting_climate: 44, natural_amenity: 40, risk_resilience: 58, tax_regulatory: 36 } },
  scranton_pa:     { composite: 39.9, confidence: 68, tier: "deprioritized", dims: { metro_adjacency: 42, pop_migration: 24, land_availability: 32, household_income: 38, employment_base: 42, school_district: 40, housing_demand: 44, infrastructure: 50, permitting_climate: 46, natural_amenity: 40, risk_resilience: 60, tax_regulatory: 36 } },
  binghamton_ny:   { composite: 34.8, confidence: 65, tier: "deprioritized", dims: { metro_adjacency: 32, pop_migration: 18, land_availability: 32, household_income: 36, employment_base: 40, school_district: 38, housing_demand: 36, infrastructure: 48, permitting_climate: 40, natural_amenity: 34, risk_resilience: 50, tax_regulatory: 20 } },
  terrehaute_in:   { composite: 38.6, confidence: 68, tier: "deprioritized", dims: { metro_adjacency: 44, pop_migration: 20, land_availability: 62, household_income: 28, employment_base: 30, school_district: 30, housing_demand: 26, infrastructure: 50, permitting_climate: 52, natural_amenity: 28, risk_resilience: 60, tax_regulatory: 68 } },
  johnstown_pa:    { composite: 29.0, confidence: 65, tier: "deprioritized", dims: { metro_adjacency: 46, pop_migration: 12, land_availability: 28, household_income: 24, employment_base: 24, school_district: 26, housing_demand: 14, infrastructure: 40, permitting_climate: 38, natural_amenity: 30, risk_resilience: 40, tax_regulatory: 36 } },
  beckley_wv:      { composite: 25.2, confidence: 62, tier: "deprioritized", dims: { metro_adjacency: 12, pop_migration: 14, land_availability: 26, household_income: 18, employment_base: 20, school_district: 20, housing_demand: 36, infrastructure: 34, permitting_climate: 30, natural_amenity: 44, risk_resilience: 54, tax_regulatory: 50 } },
};

export const OPPORTUNITY_SUPPLEMENTAL = {
  brownsville_tx:  { metro_drive_min:  55, county_pop_growth_5yr:  8.2, median_hhi:  42300, school_rating: 3.5, land_price_acre: 18000, permits_per_1k:  8.2 },
  edinburg_tx:     { metro_drive_min:  22, county_pop_growth_5yr: 14.8, median_hhi:  39800, school_rating: 3.8, land_price_acre: 16000, permits_per_1k: 12.4 },
  kokomo_in:       { metro_drive_min:  65, county_pop_growth_5yr: -1.2, median_hhi:  52400, school_rating: 5.2, land_price_acre:  8500, permits_per_1k:  3.8 },
  winstonsalem_nc: { metro_drive_min:  78, county_pop_growth_5yr:  6.4, median_hhi:  58900, school_rating: 6.1, land_price_acre: 22000, permits_per_1k:  7.2 },
  tulsa_ok:        { metro_drive_min:   0, county_pop_growth_5yr:  3.8, median_hhi:  57200, school_rating: 5.8, land_price_acre: 15000, permits_per_1k:  5.4 },
  hinesville_ga:   { metro_drive_min:  42, county_pop_growth_5yr: 10.2, median_hhi:  54100, school_rating: 5.6, land_price_acre: 14000, permits_per_1k:  9.8 },
  pittsburgh_pa:   { metro_drive_min:   0, county_pop_growth_5yr: -2.1, median_hhi:  63400, school_rating: 6.8, land_price_acre: 45000, permits_per_1k:  2.8 },
  rockford_il:     { metro_drive_min:  88, county_pop_growth_5yr: -3.4, median_hhi:  50200, school_rating: 4.2, land_price_acre: 12000, permits_per_1k:  2.4 },
  muncie_in:       { metro_drive_min:  64, county_pop_growth_5yr: -4.8, median_hhi:  41800, school_rating: 3.9, land_price_acre:  7500, permits_per_1k:  2.2 },
  erie_pa:         { metro_drive_min:  92, county_pop_growth_5yr: -3.2, median_hhi:  48600, school_rating: 4.4, land_price_acre: 18000, permits_per_1k:  2.6 },
  scranton_pa:     { metro_drive_min: 118, county_pop_growth_5yr: -0.8, median_hhi:  53200, school_rating: 5.4, land_price_acre: 24000, permits_per_1k:  3.2 },
  binghamton_ny:   { metro_drive_min: 182, county_pop_growth_5yr: -3.6, median_hhi:  51400, school_rating: 5.2, land_price_acre: 16000, permits_per_1k:  1.8 },
  terrehaute_in:   { metro_drive_min:  74, county_pop_growth_5yr: -2.6, median_hhi:  44200, school_rating: 4.8, land_price_acre:  6500, permits_per_1k:  2.8 },
  johnstown_pa:    { metro_drive_min:  68, county_pop_growth_5yr: -5.4, median_hhi:  43800, school_rating: 3.8, land_price_acre: 32000, permits_per_1k:  1.4 },
  beckley_wv:      { metro_drive_min:  62, county_pop_growth_5yr: -6.8, median_hhi:  38400, school_rating: 3.2, land_price_acre: 28000, permits_per_1k:  1.6 },
};
