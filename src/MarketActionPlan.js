import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
  Font,
  Svg,
  Circle,
  Line,
  G,
  Rect,
  Path,
  Defs,
  ClipPath,
  Image,
} from "@react-pdf/renderer";
import { NEOPOLI_DIMS, OPPORTUNITY_DIMS } from "./data";

Font.registerHyphenationCallback((word) => [word]);

// ─── Poppins (cover page — local TTF via public/fonts) ───────────────────────
Font.register({
  family: "Poppins",
  fonts: [
    {
      src: `${window.location.origin}/fonts/Poppins-Regular.ttf`,
      fontWeight: 400,
    },
    {
      src: `${window.location.origin}/fonts/Poppins-SemiBold.ttf`,
      fontWeight: 600,
    },
    {
      src: `${window.location.origin}/fonts/Poppins-Bold.ttf`,
      fontWeight: 700,
    },
    {
      src: `${window.location.origin}/fonts/Poppins-ExtraBold.ttf`,
      fontWeight: 800,
    },
  ],
});

// ─── Palette ──────────────────────────────────────────────────────────────────
const P = {
  navy: "#0a2240",
  navyDark: "#060f1a",
  navyMid: "#0d2b45",
  emerald: "#ff0a4b", // accent — replaces all green
  emeraldDim: "#cc0038",
  gold: "#b8924a",
  goldLight: "#fef3c7",
  red: "#dc2626",
  redLight: "#fef2f2",
  amber: "#d97706",
  ink: "#1a1a2e",
  sub: "#4b5563",
  muted: "#9ca3af",
  border: "#dde2ea",
  row: "#f4f6f9",
  light: "#f8f9fb",
  white: "#ffffff",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const THESIS_LABEL = {
  activation: "Activation",
  expansion: "Expansion",
  formation: "Formation",
  engineered: "Engineered",
};

const TIER_LABEL = {
  lead_market: "Lead Market",
  priority_market: "Priority",
  watchlist: "Watchlist",
  deprioritized: "Deprioritized",
};

const TIER_COLOR = {
  lead_market: P.emerald,
  priority_market: P.navy,
  watchlist: "#7fa8cc",
  deprioritized: P.muted,
};

const CEI_COLOR = {
  "Early Leader": P.emerald,
  "Mature Cluster": "#2563eb",
  "Structural Isolation": P.amber,
  "Regional Laggard": P.red,
  Neutral: P.muted,
};

const CEI_THESIS_IMPLICATIONS = {
  activation: {
    "Early Leader": {
      verdict: "Strong Buy Signal",
      body: "This distressed market is recovering faster than its neighbors. The catalyst is producing results before the surrounding region catches up — a narrow window to acquire at pre-recovery basis before the cluster effect prices in.",
    },
    "Mature Cluster": {
      verdict: "Proceed with Basis Discipline",
      body: "The entire region is in recovery mode. Multiple neighboring markets have similar distress-to-recovery profiles, providing regional demand confirmation. Entry is still valid but competitive — underwrite basis conservatively.",
    },
    "Structural Isolation": {
      verdict: "Catalyst Validation Required",
      body: "Strong standalone distress metrics but neighboring counties have not followed. Local catalyst must be independently confirmed — do not rely on regional spillover. Front-load diligence on anchor employers and demand drivers.",
    },
    "Regional Laggard": {
      verdict: "Proceed with Caution",
      body: "Neighboring distressed markets are recovering faster than this county. Evaluate whether a specific local catalyst justifies the thesis, or whether capital is better deployed in an adjacent market with stronger momentum.",
    },
    Neutral: {
      verdict: "Local Fundamentals Drive Decision",
      body: "No dominant regional signal in either direction. The activation case depends entirely on local distress metrics, recovery indicators, and catalyst identification. Standard thesis diligence applies.",
    },
  },
  expansion: {
    "Early Leader": {
      verdict: "Prioritize — Window Open",
      body: "This market is outperforming its neighbors on expansion fundamentals before the region broadly prices in. First-mover advantage on industrial and commercial land is available. Move with urgency.",
    },
    "Mature Cluster": {
      verdict: "Strong Regional Validation",
      body: "Multiple neighboring markets also score well — regional economic momentum is broad-based. Demand spillover is likely as the cluster matures. Basis discipline is critical as entry prices will reflect regional competition.",
    },
    "Structural Isolation": {
      verdict: "Standalone Thesis Only",
      body: "Strong expansion fundamentals without a regional cluster to reinforce demand. Local employer base, infrastructure, and logistics must independently justify the position. Do not underwrite regional spillover.",
    },
    "Regional Laggard": {
      verdict: "Deprioritize or Find Catalyst",
      body: "Adjacent markets are stronger expansion candidates. Unless a site-specific or incentive-specific factor applies, consider the regional leaders as primary targets. Present alternative markets in the recommendation.",
    },
    Neutral: {
      verdict: "Local Signals are Decisive",
      body: "Mixed regional context. Expansion thesis depends on local infrastructure, employment trends, and permitting environment rather than cluster dynamics. Evaluate each fundamental in isolation.",
    },
  },
  formation: {
    "Early Leader": {
      verdict: "Formation Window Open",
      body: "This market leads its contiguous neighbors in formation fundamentals — business formation, permit activity, and population growth are accelerating before neighboring markets catch up. Early-stage entry is most accessible now.",
    },
    "Mature Cluster": {
      verdict: "Cluster Momentum Confirmed",
      body: "The surrounding region broadly shows formation activity. Regional ecosystem reinforcement (talent pools, service providers, supply chains) is building. Entry is validated but competitive — basis and timing discipline apply.",
    },
    "Structural Isolation": {
      verdict: "Local Ecosystem Validation Needed",
      body: "Formation signals are strong locally but not confirmed regionally. Validate that local business services, workforce pipelines, and supply chain infrastructure are sufficient to sustain growth without regional ecosystem support.",
    },
    "Regional Laggard": {
      verdict: "Formation Activity Elsewhere",
      body: "Neighboring markets are showing stronger formation signals. Evaluate whether this county has a specific anchor or incentive advantage, or whether the formation opportunity is better captured in an adjacent market.",
    },
    Neutral: {
      verdict: "Internal Metrics are Decisive",
      body: "No strong regional formation signal. The case depends on local permit trends, BFS rates, workforce supply, and regulatory environment. Standard formation thesis diligence applies without regional tailwind assumptions.",
    },
  },
  engineered: {
    "Early Leader": {
      verdict: "Regional Validation — Act on Site Control",
      body: "This market leads its neighbors on the engineered scoring model — labor availability, infrastructure, and land cost are more favorable here than in the surrounding region. For an employer site decision, this is the strongest regional validation signal: the inputs that make employer investment viable are concentrated in this county. Site control and incentive package assembly should move with urgency.",
    },
    "Mature Cluster": {
      verdict: "Proven Industrial Region",
      body: "This county sits within a proven industrial or logistics cluster — multiple neighboring counties are also scoring well on employer-site metrics. This has two implications: (1) the regional infrastructure and labor pool are established and reliable, and (2) competing employers and developers are already active in the area. Use the cluster as validation but negotiate hard on incentives — the county knows it's in a competitive region.",
    },
    "Structural Isolation": {
      verdict: "Incentive Leverage is High",
      body: "Strong employer-site metrics but neighbors are weak. This county may have a specific infrastructure advantage (rail access, highway interchange, utility capacity) that neighbors lack. Isolation means less competition from other employers, which increases your incentive negotiating leverage. Validate that the infrastructure advantage is genuine and durable. The workforce commute shed may be the binding constraint in an isolated market.",
    },
    "Regional Laggard": {
      verdict: "Revisit Site Selection",
      body: "Adjacent counties score better on the engineered model — stronger labor pools, better infrastructure, or lower land costs. Unless there's a very specific reason to be in this county (unique parcel, specific incentive package, anchor tenant requirement), the site selection case is stronger in a neighboring market. Present both options to the employer before committing.",
    },
    Neutral: {
      verdict: "Site-Specific Factors Dominate",
      body: "No strong regional cluster signal in either direction. The employer site decision comes down to site-specific factors: parcel availability, zoning, utility capacity, proximity to workforce, and incentive package. Standard engineered market diligence applies.",
    },
  },
};

function fmtPhone(v) {
  if (!v) return "";
  const d = String(v).replace(/\D/g, "");
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  if (d.length === 11 && d[0] === "1") return `(${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
  return v;
}
function fmtNum(v, decimals = 0, fallback = "—") {
  if (v == null || isNaN(v)) return fallback;
  return Number(v).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtPct(v, decimals = 1, fallback = "—") {
  if (v == null || isNaN(v)) return fallback;
  const n = Number(v);
  return `${n >= 0 ? "+" : ""}${n.toFixed(decimals)}%`;
}

function fmtScore(v, fallback = "—") {
  if (v == null || isNaN(v)) return fallback;
  return Math.round(Number(v)).toString();
}

function scoreColor(score) {
  if (score == null) return P.muted;
  if (score >= 70) return P.emerald;
  if (score >= 50) return P.gold;
  return P.red;
}

// Parse markdown text into segments for inline bold rendering
function parseInline(text) {
  if (!text) return [];
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return { bold: true, text: part.slice(2, -2) };
    }
    return { bold: false, text: part };
  });
}

// Parse markdown block into typed segments
function parseMd(text) {
  if (!text) return [];
  const lines = text.split("\n");
  const segs = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      // collapse consecutive spacers
      if (segs.length && segs[segs.length - 1].type !== "spacer")
        segs.push({ type: "spacer" });
      continue;
    }
    // skip horizontal rules entirely
    if (/^-{3,}$/.test(line) || /^\*{3,}$/.test(line) || /^_{3,}$/.test(line)) {
      continue;
    }
    if (line.startsWith("## ")) {
      segs.push({ type: "h2", text: line.slice(3) });
      continue;
    }
    if (line.startsWith("# ")) {
      segs.push({ type: "h1", text: line.slice(2) });
      continue;
    }
    if (
      line.startsWith("**") &&
      line.endsWith("**") &&
      !line.slice(2, -2).includes("**")
    ) {
      segs.push({ type: "bold_line", text: line.slice(2, -2) });
      continue;
    }
    if (
      line.startsWith("• ") ||
      line.startsWith("- ") ||
      line.startsWith("* ")
    ) {
      segs.push({ type: "bullet", text: line.slice(2) });
      continue;
    }
    segs.push({ type: "para", text: line });
  }
  // trim trailing spacer
  while (segs.length && segs[segs.length - 1].type === "spacer") segs.pop();
  return segs;
}

// ─── Thesis colors ───────────────────────────────────────────────────────────
const THESIS_COLOR = {
  activation: "#0a2240",
  expansion: "#0a2240",
  formation: "#0a2240",
  engineered: "#0a2240",
};

// ─── Thesis descriptions (for exec brief) ────────────────────────────────────
const THESIS_DESCRIPTION = {
  activation:
    "Identifies U.S. counties where distressed market conditions — elevated vacancy, suppressed home values, and labor slack — are beginning to reverse. Entry is most advantageous when the recovery signal is present but not yet priced into land and asset basis. American Pledge expands the qualified buyer pool in distressed markets, converting previously non-qualifying renters into purchasers.",
  expansion:
    "Targets growth-corridor counties experiencing demand-pull expansion — rising population, increasing permit activity, and land still priced near agricultural basis. The thesis is structural: demographic momentum drives long-duration housing demand, and the capital advantage lies in land and entitlement positioning ahead of the demand wave.",
  formation:
    "Identifies counties where organic demographic momentum — net in-migration, household formation, and school-age population growth — is compounding against underdeveloped land. The earliest-stage thesis: land at agricultural basis, infrastructure gap present but closing, demand wave not yet visible in permit data.",
  engineered:
    "Positions counties where an employer-anchor investment creates engineered demand for workforce housing. The thesis requires a specific employer profile match, infrastructure confirmation, and incentive stacking. Ground Score filters the national county universe to the tightest-fit sites for a given employer profile, then AP workforce housing solves the employer's persistent hiring friction.",
};

const METHODOLOGY_BRIEF =
  "Ground Score aggregates 30+ data sources across 3,000+ U.S. counties, normalizes each metric to a 0–100 percentile scale, and applies thesis-specific dimension weights to produce a composite score. Tiers — Lead Market, Priority, Watchlist, Deprioritized — are assigned by percentile rank across the full scored universe. The Cluster Emergence Index (CEI) adds a regional layer: it compares each county against its contiguous neighbors to identify early-forming clusters versus isolated outliers.";

// ─── Thesis-specific default content ─────────────────────────────────────────
const THESIS_DEFAULTS = {
  activation: {
    thesis_fit:
      "This market exhibits the distress-and-catalyst profile central to the Activation thesis. Elevated unemployment, suppressed home values, and a qualifying catalyst event create the entry window. American Pledge buyer pool expansion converts previously non-qualifying renters into purchasers, absorbing the distressed inventory while the catalyst begins its employment multiplier.",
    immediate: [
      {
        action: "Map distressed inventory",
        detail:
          "Pull REO, tax-delinquent, and sub-market-value listings in target price bands.",
        owner: "Acquisitions",
      },
      {
        action: "Validate catalyst status",
        detail:
          "Confirm groundbreaking timeline, permit status, and employment projection for the primary catalyst.",
        owner: "Research",
      },
      {
        action: "Run AP buyer pool model",
        detail:
          "Calculate % of households qualifying under 3% conventional vs. 20% AP — determines demand base.",
        owner: "Analytics",
      },
    ],
    day30: [
      {
        action: "Engage local broker network",
        detail:
          "Identify 2–3 brokers with REO/distressed experience; secure off-market pipeline access.",
        owner: "Acquisitions",
      },
      {
        action: "Title and lien screening",
        detail:
          "Run preliminary title/lien searches on top-priority properties to flag issues early.",
        owner: "Diligence",
      },
      {
        action: "Comparable exit analysis",
        detail:
          "Model exit scenarios at 3, 5, and 7 years against projected HPA recovery curve.",
        owner: "Analytics",
      },
    ],
    day60: [
      {
        action: "Submit LOIs on priority properties",
        detail:
          "Execute on top 3–5 properties identified in month one; target basis below recovery scenario floor.",
        owner: "Acquisitions",
      },
      {
        action: "Begin Phase I ESA",
        detail:
          "Environmental screen on all LOI properties; must complete before any acquisition close.",
        owner: "Diligence",
      },
      {
        action: "Establish servicer relationships",
        detail:
          "Identify local bank/servicer portfolio contacts for bulk or NPL opportunities.",
        owner: "Capital Markets",
      },
    ],
    day90: [
      {
        action: "Close first acquisition or reassess",
        detail:
          "Complete first transaction or formally re-rate market if catalyst or inventory assumptions have shifted.",
        owner: "Acquisitions",
      },
      {
        action: "Activate AP buyer pipeline",
        detail:
          "Begin qualifying buyer outreach; confirm program availability with lending partners.",
        owner: "Operations",
      },
    ],
    diligence: [
      {
        workstream: "Title & Liens",
        priority: "HIGH",
        items: [
          "Full title search",
          "Tax lien/judgment search",
          "HOA delinquency check",
          "IRS/state tax lien screen",
        ],
      },
      {
        workstream: "Environmental",
        priority: "HIGH",
        items: [
          "Phase I ESA",
          "FEMA flood zone determination",
          "Hazmat/RCRA database screen",
          "Underground storage tank search",
        ],
      },
      {
        workstream: "Property Condition",
        priority: "HIGH",
        items: [
          "Physical inspection",
          "Deferred maintenance estimate",
          "Roof/systems condition",
          "Code violation search",
        ],
      },
      {
        workstream: "Market Validation",
        priority: "MED",
        items: [
          "REO/distressed inventory count",
          "Comparable closed sales (6–12 mo)",
          "DOM analysis",
          "List-to-sale price ratio",
        ],
      },
      {
        workstream: "Catalyst Verification",
        priority: "HIGH",
        items: [
          "Project permits pulled",
          "Groundbreaking confirmation",
          "Employment projection sourcing",
          "Phase II timeline",
        ],
      },
      {
        workstream: "Legal & Regulatory",
        priority: "MED",
        items: [
          "Zoning classification confirm",
          "Deed restrictions/covenants",
          "HOA rules and fees",
          "Local ordinance review",
        ],
      },
    ],
    risks: [
      {
        risk: "Catalyst Delay",
        likelihood: "M",
        impact: "H",
        mitigation:
          "Set 18-month trigger: if no groundbreaking or employment by month 18, execute exit strategy.",
      },
      {
        risk: "Extended Distress",
        likelihood: "M",
        impact: "H",
        mitigation:
          "Stress-test basis at 15% further price decline; structure as option/JV where possible.",
      },
      {
        risk: "AP Buyer Pool Shortfall",
        likelihood: "M",
        impact: "M",
        mitigation:
          "Validate income eligibility before acquisition close; maintain fallback rental strategy.",
      },
      {
        risk: "Title / Environmental Surprise",
        likelihood: "M",
        impact: "H",
        mitigation:
          "Complete Phase I ESA on all properties before close; never skip title search.",
      },
      {
        risk: "Catalyst Disappoints",
        likelihood: "L",
        impact: "H",
        mitigation:
          "Diversify across multiple catalyst types in market; do not concentrate on single project.",
      },
    ],
    employer_brief: {
      headline: "Activation Market — Labor Availability & Incentive Profile",
      workforce:
        "This market is experiencing an employment recovery phase. The elevated unemployment rate creates favorable hiring conditions — a larger-than-typical available labor pool with lower wage pressure than fully employed markets. Workers are motivated; onboarding timelines are compressed. Skills profile aligns with light manufacturing, distribution, healthcare, and service sectors.",
      incentives:
        "Activation markets frequently carry Opportunity Zone designation, state enterprise zone classifications, and locally-negotiated PILOT agreements. The distressed status typically translates into enhanced negotiating leverage on property tax abatements, infrastructure contributions, and workforce training grants. Federal programs (EDA, USDA) are active in markets of this profile.",
      infrastructure:
        "Infrastructure readiness should be confirmed, but markets in the activation category often have legacy industrial or commercial capacity that can be reactivated at lower cost than greenfield. Broadband, utilities, and road access should be independently verified — do not rely on older assessments.",
    },
  },
  expansion: {
    thesis_fit:
      "This market displays the metro-adjacent growth profile characteristic of the Expansion thesis. Household incomes support new construction price points, population is growing organically from metro spillover, and land is still available at attainable basis. The window to assemble before the demand wave fully prices in remains open.",
    immediate: [
      {
        action: "Identify target land corridors",
        detail:
          "Map contiguous parcels along the dominant commute corridor with density <50/mi² and agricultural basis.",
        owner: "Acquisitions",
      },
      {
        action: "Confirm metro drive time",
        detail:
          "Verify actual commute time to employment core; must be under 60 min for MPC viability.",
        owner: "Research",
      },
      {
        action: "Screen buyer pool income",
        detail:
          "Confirm median HHI supports target home price at standard debt-to-income; run AP qualification model.",
        owner: "Analytics",
      },
    ],
    day30: [
      {
        action: "Engage county planner",
        detail:
          "Establish relationship with planning department; understand comp plan designation, upcoming hearings, and planner priorities.",
        owner: "Entitlement",
      },
      {
        action: "Commission land survey",
        detail:
          "Survey top 2–3 target parcels; confirm acreage, boundary, access, and encumbrances.",
        owner: "Diligence",
      },
      {
        action: "Civil engineering pre-screen",
        detail:
          "Obtain rough-order-of-magnitude infrastructure cost estimate before LOI execution.",
        owner: "Engineering",
      },
    ],
    day60: [
      {
        action: "Execute land LOIs",
        detail:
          "Secure exclusivity on primary parcel(s) while entitlement pre-application is in process.",
        owner: "Acquisitions",
      },
      {
        action: "File entitlement pre-application",
        detail:
          "Initiate rezoning or subdivision pre-application to identify issues early.",
        owner: "Entitlement",
      },
      {
        action: "Engage builder partners",
        detail:
          "Present opportunity to 2–3 national/regional builders; soft commitments inform MPC phase sizing.",
        owner: "Capital Markets",
      },
    ],
    day90: [
      {
        action: "Complete land acquisition",
        detail:
          "Close on primary parcel with entitlement contingency or separate LOI structure.",
        owner: "Acquisitions",
      },
      {
        action: "Finalize MPC master plan",
        detail:
          "Commission site plan with phased lot count, amenity program, and infrastructure staging.",
        owner: "Development",
      },
    ],
    diligence: [
      {
        workstream: "Site Control",
        priority: "HIGH",
        items: [
          "ALTA survey",
          "Boundary/easement confirmation",
          "Road access and ingress/egress",
          "Mineral rights review",
        ],
      },
      {
        workstream: "Entitlement",
        priority: "HIGH",
        items: [
          "Current zoning classification",
          "Comp plan land use designation",
          "Variance/rezoning requirements",
          "Planning commission calendar",
        ],
      },
      {
        workstream: "Infrastructure",
        priority: "HIGH",
        items: [
          "Water/sewer capacity study",
          "Road improvement requirements",
          "Utility extension cost estimate",
          "Broadband availability",
        ],
      },
      {
        workstream: "Market Study",
        priority: "MED",
        items: [
          "Absorption rate analysis",
          "Competitive MPC projects",
          "Builder pipeline in corridor",
          "Permit velocity (5-yr trend)",
        ],
      },
      {
        workstream: "Environmental",
        priority: "MED",
        items: [
          "Phase I ESA",
          "Wetlands/floodplain delineation",
          "Agricultural chemical residue",
          "Soil stability assessment",
        ],
      },
      {
        workstream: "Relationships",
        priority: "MED",
        items: [
          "County planner introduction",
          "Civil engineer engagement",
          "Title company selection",
          "Local broker for comps",
        ],
      },
    ],
    risks: [
      {
        risk: "Entitlement Denial/Delay",
        likelihood: "H",
        impact: "H",
        mitigation:
          "Engage county planner before LOI; build 18-month entitlement buffer into pro forma.",
      },
      {
        risk: "Infrastructure Cost Overrun",
        likelihood: "M",
        impact: "H",
        mitigation:
          "Commission civil engineering estimate before LOI; budget 20% contingency on infrastructure.",
      },
      {
        risk: "Absorption Slowdown",
        likelihood: "M",
        impact: "H",
        mitigation:
          "Underwrite at 50% of peak permit velocity; phase lot releases to match actual absorption.",
      },
      {
        risk: "Competitor Land Acquisition",
        likelihood: "M",
        impact: "M",
        mitigation:
          "Move to exclusive within 60 days of site identification; do not sit on LOI process.",
      },
      {
        risk: "Rate-Driven Affordability",
        likelihood: "L",
        impact: "M",
        mitigation:
          "Model buyer pool at +150bps stress; ensure AP eligibility still sufficient at stress rate.",
      },
    ],
    employer_brief: {
      headline: "Expansion Market — Growth Corridor & Housing Pipeline",
      workforce:
        "This market is in the growth phase — a motivated, upwardly mobile workforce base is forming as households migrate from higher-cost metros. Median household income reflects a working-professional demographic suitable for light industrial, healthcare, technology support, and distribution roles. Labor competition is moderate; the market is not yet at full employment.",
      incentives:
        "Expansion corridor markets frequently carry partial Opportunity Zone coverage, county-level economic development incentives, and state growth corridor designations. New facility investment in this market positions the employer ahead of the development wave — before comparable incentive packages are competed away. USDA Community Facilities and state rural development programs may apply.",
      infrastructure:
        "Infrastructure is the defining diligence item in expansion markets. Road improvements, utility extensions, and broadband reach are predictable costs but must be sized correctly. The county's capital improvement plan will indicate what public investment is coming — which can be used to time private facility investment against public infrastructure commitments.",
    },
  },
  formation: {
    thesis_fit:
      "This market exhibits the organic demographic momentum profile of the Formation thesis. Population growth is compounding, net in-migration is positive, and land is still at agricultural basis — well ahead of the development wave. The opportunity is to assemble now before the first builder breaks ground and prices the land basis.",
    immediate: [
      {
        action: "Map parcel ownership",
        detail:
          "Identify contiguous farmland/rural parcels along growth corridors; research ownership and motivations.",
        owner: "Acquisitions",
      },
      {
        action: "Validate migration data",
        detail:
          "Confirm ACS migration trends and USPS vacancy data; ensure demographic signal is recent and sustained.",
        owner: "Research",
      },
      {
        action: "Assess infrastructure gap",
        detail:
          "Estimate utility extension costs and road improvements required for residential development.",
        owner: "Engineering",
      },
    ],
    day30: [
      {
        action: "Initiate landowner outreach",
        detail:
          "Direct contact with key farmland owners; establish timeline and pricing expectations.",
        owner: "Acquisitions",
      },
      {
        action: "School district assessment",
        detail:
          "Evaluate school quality ratings — primary demand differentiator for family formation markets.",
        owner: "Research",
      },
      {
        action: "Builder pipeline scan",
        detail:
          "Identify any builders who have already acquired or are pursuing land in the corridor.",
        owner: "Research",
      },
    ],
    day60: [
      {
        action: "Execute farmland LOIs",
        detail:
          "Secure options or LOIs on primary parcel assembly with agricultural use allowance during hold.",
        owner: "Acquisitions",
      },
      {
        action: "County master plan review",
        detail:
          "Confirm alignment between residential growth intent and county long-range land use plan.",
        owner: "Entitlement",
      },
    ],
    day90: [
      {
        action: "Close land assembly phase 1",
        detail:
          "Complete first tranche of parcel acquisitions; maintain optionality on remaining parcels.",
        owner: "Acquisitions",
      },
      {
        action: "Engage regional builder",
        detail:
          "Begin discussions with regional homebuilder to validate MPC feasibility and product program.",
        owner: "Development",
      },
    ],
    diligence: [
      {
        workstream: "Land Identification",
        priority: "HIGH",
        items: [
          "Parcel assembly map",
          "Ownership research",
          "Farmland classification (NRCS)",
          "Agricultural lease status",
        ],
      },
      {
        workstream: "Agricultural Transition",
        priority: "HIGH",
        items: [
          "Current use restrictions",
          "Soil classification and stability",
          "Irrigation/drainage systems",
          "Environmental covenants",
        ],
      },
      {
        workstream: "Demographic Validation",
        priority: "MED",
        items: [
          "Population trend (5-yr)",
          "ACS migration data confirmation",
          "School district performance",
          "Income trend",
        ],
      },
      {
        workstream: "Infrastructure Gap",
        priority: "HIGH",
        items: [
          "Utility extension cost estimate",
          "Road improvement requirements",
          "Water/sewer availability",
          "Broadband reach",
        ],
      },
      {
        workstream: "Regulatory",
        priority: "MED",
        items: [
          "State growth management laws",
          "County master plan alignment",
          "Conservation easements/overlays",
          "Flood zone check",
        ],
      },
      {
        workstream: "Market Timing",
        priority: "MED",
        items: [
          "Builder activity in corridor",
          "Permit trend (3-yr)",
          "Land price trend (comps)",
          "First-mover advantage window",
        ],
      },
    ],
    risks: [
      {
        risk: "Demand Wave Timing",
        likelihood: "M",
        impact: "M",
        mitigation:
          "Structure as long-term option/JV to reduce carry cost; do not over-leverage on timeline.",
      },
      {
        risk: "Infrastructure Cost",
        likelihood: "H",
        impact: "H",
        mitigation:
          "Commission full infrastructure cost study before acquisition; factor into land basis ceiling.",
      },
      {
        risk: "Competing Builder Entry",
        likelihood: "M",
        impact: "H",
        mitigation:
          "Move decisively on land assembly once demographic thesis is confirmed.",
      },
      {
        risk: "Regulatory/Entitlement",
        likelihood: "M",
        impact: "H",
        mitigation:
          "Engage county planning early; confirm master plan support before significant capital outlay.",
      },
      {
        risk: "School District Decline",
        likelihood: "L",
        impact: "M",
        mitigation:
          "Monitor school ratings annually; district quality is the demand signal for this thesis.",
      },
    ],
    employer_brief: {
      headline: "Formation Market — Workforce Housing Pipeline",
      workforce:
        "This market is building its workforce base through net in-migration. Workers are arriving — choosing this market for quality of life, affordability, and access to nearby metro employment centers. The labor pool is relatively early-stage but growing. Formation markets are ideal for employers who can offer remote or hybrid flexibility, or those willing to invest early in a growing workforce.",
      incentives:
        "Formation markets frequently qualify for USDA rural development programs, state agricultural transition incentives, and first-mover economic development packages from counties actively seeking employer anchors. The scarcity of major employers in pure formation markets means incentive competition is low — counties will negotiate aggressively.",
      infrastructure:
        "Infrastructure is the honest constraint in formation markets. Broadband, utilities, and road capacity must be independently verified. However, counties in active growth phases are typically executing capital improvement plans — public investment timelines can be used to inform private entry strategy.",
    },
  },
  engineered: {
    thesis_fit:
      "This market presents the employer-anchor and infrastructure profile characteristic of the Engineered thesis. Industrial land basis, labor availability, logistics access, and OZ/incentive positioning create a compelling case for employer-driven investment. The AP workforce housing component addresses the employer's most consistent hiring friction — employee housing access.",
    immediate: [
      {
        action: "Confirm industrial site availability",
        detail:
          "Identify available parcels with industrial/manufacturing zoning, utility access, and logistics connectivity.",
        owner: "Acquisitions",
      },
      {
        action: "Labor force validation",
        detail:
          "Pull BLS/ACS workforce data for target skills; confirm available pool size and wage benchmarks.",
        owner: "Research",
      },
      {
        action: "OZ / incentive mapping",
        detail:
          "Confirm OZ tract status; inventory state and local incentive programs available to prospective employer.",
        owner: "Capital Markets",
      },
    ],
    day30: [
      {
        action: "Site selector outreach",
        detail:
          "Engage 1–2 industrial site selectors; present market profile as candidate for target industries.",
        owner: "Business Development",
      },
      {
        action: "Infrastructure capacity study",
        detail:
          "Commission utility capacity assessment (3-phase power, water/sewer for industrial use, rail/road access).",
        owner: "Engineering",
      },
      {
        action: "Incentive package assembly",
        detail:
          "Work with EDC to build formal incentive package document; include tax, workforce, infrastructure commitments.",
        owner: "Capital Markets",
      },
    ],
    day60: [
      {
        action: "Employer partner conversations",
        detail:
          "Present market profile to target employers in alignment with labor pool skills; initiate LOI conversations.",
        owner: "Business Development",
      },
      {
        action: "Workforce housing plan",
        detail:
          "Model AP workforce housing capacity for the employer's projected headcount; confirm program availability.",
        owner: "Operations",
      },
    ],
    day90: [
      {
        action: "Finalize employer commitment",
        detail:
          "Execute MOU or LOI with anchor employer; structure AP workforce housing component into deal.",
        owner: "Business Development",
      },
      {
        action: "Launch industrial land assembly",
        detail:
          "Execute on site control concurrent with or following employer commitment.",
        owner: "Acquisitions",
      },
    ],
    diligence: [
      {
        workstream: "Site Suitability",
        priority: "HIGH",
        items: [
          "Industrial zoning confirm",
          "Rail/highway access grade",
          "3-phase power availability",
          "Water/sewer capacity for industrial",
        ],
      },
      {
        workstream: "Labor Analysis",
        priority: "HIGH",
        items: [
          "Workforce data verification",
          "Commute shed analysis",
          "Skills gap assessment",
          "Wage benchmark vs. employer target",
        ],
      },
      {
        workstream: "Incentive Research",
        priority: "HIGH",
        items: [
          "Federal OZ tract confirmation",
          "State manufacturing credits",
          "JCTC / TIF availability",
          "County PILOT history",
        ],
      },
      {
        workstream: "Infrastructure",
        priority: "HIGH",
        items: [
          "Broadband speed test (fiber availability)",
          "Logistics network mapping",
          "Drive time to major MSA",
          "Port/airport proximity if relevant",
        ],
      },
      {
        workstream: "Environmental",
        priority: "HIGH",
        items: [
          "Phase I/II ESA (industrial history)",
          "Brownfield status check",
          "UST / contamination database",
          "Stormwater/discharge permits",
        ],
      },
      {
        workstream: "Employer Pipeline",
        priority: "MED",
        items: [
          "Target industry mapping",
          "Site selector relationships",
          "EDC alignment",
          "Competitive site analysis",
        ],
      },
    ],
    risks: [
      {
        risk: "Employer Withdrawal",
        likelihood: "M",
        impact: "H",
        mitigation:
          "Structure land acquisition with employer commitment contingency; do not over-commit before LOI.",
      },
      {
        risk: "Infrastructure Gap",
        likelihood: "M",
        impact: "H",
        mitigation:
          "Commission capacity studies before committing; negotiate public infrastructure contributions upfront.",
      },
      {
        risk: "Labor Competition",
        likelihood: "L",
        impact: "M",
        mitigation:
          "Validate worker commute radii; confirm labor pool is not already absorbed by competing employers.",
      },
      {
        risk: "Incentive Package Not Delivered",
        likelihood: "M",
        impact: "M",
        mitigation:
          "Get county/state commitments in writing before employer announcement; build in clawback provisions.",
      },
      {
        risk: "Environmental / Brownfield",
        likelihood: "M",
        impact: "H",
        mitigation:
          "Phase I ESA mandatory; Phase II if any industrial history. Never skip on industrial sites.",
      },
    ],
    employer_brief: {
      headline: "Engineered Market — Site & Workforce Profile",
      workforce:
        "This market offers a qualified industrial and logistics workforce at competitive wage rates. Unemployment levels indicate available capacity above full employment thresholds. The skills profile aligns with manufacturing, distribution, healthcare, and professional services. AP workforce housing removes the historically persistent barrier — employee inability to save a down payment — enabling faster hiring and lower turnover.",
      incentives:
        "The Engineered thesis is built around incentive stacking. OZ designation (where applicable) provides federal capital gains treatment. State manufacturing and industrial development credits, county PILOT agreements, and workforce training grants combine to create a compelling total incentive package. The formal incentive document should be assembled before any employer conversation.",
      infrastructure:
        "Infrastructure is the proving ground for engineered markets. Utility capacity (especially 3-phase industrial power), road/rail access, and broadband fiber availability determine which employers can actually use the site. These must be independently confirmed — not assumed from marketing materials. Gaps become negotiating leverage for public infrastructure investment.",
    },
  },
};

// ─── Land Listings ────────────────────────────────────────────────────────────
// Min lot size per thesis (sq ft): 1 acre = 43,560 sqft
const THESIS_MIN_ACRES = {
  activation: 5, // repurposable sites, smaller OK
  expansion: 25, // MPC greenfield
  formation: 25, // MPC greenfield
  engineered: 50, // employer site
};

export async function fetchLandListings(lat, lon, thesis, limit = 10) {
  const minAcres = THESIS_MIN_ACRES[thesis] || 25;
  const minSqft = minAcres * 43560;
  const apiKey = process.env.REACT_APP_RENTCAST_KEY;
  if (!apiKey) return [];
  try {
    // Query without propertyType filter — Rentcast classifies many large rural
    // parcels as Single Family or other types, so filtering by lotSize alone
    // casts a much wider net than propertyType=Land.
    const pages = await Promise.allSettled([
      fetch(
        `https://api.rentcast.io/v1/listings/sale?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&radius=40&status=Active&limit=500&offset=0`,
        { headers: { "X-Api-Key": apiKey } }
      ),
      fetch(
        `https://api.rentcast.io/v1/listings/sale?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&radius=40&status=Active&limit=500&offset=500`,
        { headers: { "X-Api-Key": apiKey } }
      ),
    ]);

    const allData = [];
    for (const p of pages) {
      if (p.status === "fulfilled" && p.value.ok) {
        const d = await p.value.json();
        if (Array.isArray(d)) allData.push(...d);
      }
    }

    // Deduplicate by MLS number or address
    const seen = new Set();
    const unique = allData.filter((p) => {
      const key = p.mlsNumber || p.formattedAddress || p.addressLine1;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return unique
      .filter((p) => (p.lotSize || 0) >= minSqft && (p.price || 0) > 0)
      .sort((a, b) => (b.lotSize || 0) - (a.lotSize || 0))
      .slice(0, limit ?? Infinity)
      .map((p) => {
        const acres = parseFloat(((p.lotSize || 0) / 43560).toFixed(1));
        const cityStateZip = [
          p.city,
          p.state && p.zipCode
            ? `${p.state} ${p.zipCode}`
            : p.state || p.zipCode || null,
        ]
          .filter(Boolean)
          .join(", ");

        // Parse history for price changes
        const historyEntries = p.history
          ? Object.entries(p.history).sort(([a], [b]) => a.localeCompare(b))
          : [];
        const originalEntry = historyEntries[0]?.[1];
        const originalPrice =
          originalEntry?.price && originalEntry.price !== p.price
            ? originalEntry.price
            : null;
        const priceReduced =
          originalPrice != null && originalPrice > p.price;
        const priceIncreased =
          originalPrice != null && originalPrice < p.price;
        const priceChangePct =
          originalPrice != null
            ? Math.round(
                ((p.price - originalPrice) / originalPrice) * 100
              )
            : null;

        return {
          street: p.addressLine1 || p.formattedAddress?.split(",")[0] || "—",
          cityStateZip: cityStateZip || "—",
          acres,
          price: p.price || 0,
          pricePerAc: acres > 0 ? Math.round(p.price / acres) : 0,
          dom: p.daysOnMarket ?? null,
          listedDate: p.listedDate ? p.listedDate.slice(0, 10) : null,
          mls: p.mlsNumber || null,
          mlsName: p.mlsName || null,
          agent: p.listingAgent?.name || null,
          agentPhone: p.listingAgent?.phone || null,
          office: p.listingOffice?.name || null,
          propertyType: p.propertyType || null,
          // Price history
          originalPrice,
          priceReduced,
          priceIncreased,
          priceChangePct,
          historyCount: historyEntries.length,
          listingUrl: p.mlsNumber
            ? `https://www.google.com/search?q=${encodeURIComponent(`MLS ${p.mlsNumber} ${p.state || ""} land for sale`)}`
            : `https://www.google.com/search?q=${encodeURIComponent(`${p.addressLine1 || ""} ${p.city || ""} ${p.state || ""} land for sale`.trim())}`,
        };
      });
  } catch (e) {
    console.warn("[LandListings] fetch failed:", e.message);
    return [];
  }
}

// ─── StyleSheet ───────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  // Pages
  page: { fontFamily: "Helvetica", backgroundColor: P.white, fontSize: 8 },
  divPage: { fontFamily: "Helvetica", backgroundColor: P.navy },

  // ── Cover ────────────────────────────────────────────────────────────────────
  coverPage: { fontFamily: "Helvetica", backgroundColor: P.white, fontSize: 8 },
  coverAccentBar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
    backgroundColor: P.navy,
  },
  coverTopArea: {
    paddingLeft: 30,
    paddingRight: 36,
    paddingTop: 24,
    paddingBottom: 0,
  },
  coverTopLabel: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: P.sub,
    textTransform: "uppercase",
    letterSpacing: 1.8,
    marginBottom: 7,
  },
  coverTopRule: { width: 200, height: 1.5, backgroundColor: "#ff0a4b" },
  coverBody: { flex: 1, paddingLeft: 30, paddingRight: 36, paddingTop: 52 },
  coverThesisEye: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: P.muted,
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 0,
  },
  coverCountyName: {
    fontSize: 36,
    fontFamily: "Poppins",
    fontWeight: 800,
    color: P.navy,
    lineHeight: 1.1,
    marginBottom: 28,
  },
  coverTwoCol: { flexDirection: "row", alignItems: "center", marginTop: 48 },
  coverStatsCol: { width: 160, paddingLeft: 32, paddingRight: 16 },
  coverMapCol: { flex: 1, paddingLeft: 30 },
  coverStatBlock: { marginBottom: 22 },
  coverStatLbl: {
    fontSize: 6,
    fontFamily: "Helvetica-Bold",
    color: P.muted,
    textTransform: "uppercase",
    letterSpacing: 1.3,
    marginBottom: 4,
  },
  coverStatVal: {
    fontSize: 34,
    fontFamily: "Poppins",
    fontWeight: 700,
    color: P.navy,
    lineHeight: 1,
  },
  coverRankRow: { flexDirection: "row", alignItems: "flex-end" },
  coverRankNum: {
    fontSize: 34,
    fontFamily: "Poppins",
    fontWeight: 700,
    color: P.navy,
    lineHeight: 1,
    marginRight: 8,
  },
  coverRankSub: {
    fontSize: 14,
    fontFamily: "Poppins",
    fontWeight: 400,
    color: P.sub,
    lineHeight: 1,
  },
  coverBrandRow: {
    position: "absolute",
    bottom: 32,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Table of Contents (matches PropertyReport.js style) ─────────────────────
  tocPage: { fontFamily: "Helvetica", backgroundColor: P.navy, fontSize: 8 },
  tocTopBar: {
    paddingHorizontal: 42,
    paddingTop: 32,
    paddingBottom: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  tocTopEye: {
    fontSize: 6.5,
    color: "rgba(255,255,255,0.35)",
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  tocTopDate: { fontSize: 6.5, color: "rgba(255,255,255,0.3)" },
  tocHeader: { paddingHorizontal: 42, paddingTop: 28, paddingBottom: 8 },
  tocEyebrow: {
    fontSize: 7.5,
    color: "#2196F3",
    fontFamily: "Helvetica-Bold",
    letterSpacing: 2.5,
    textTransform: "uppercase",
    marginBottom: 9,
  },
  tocTitle: {
    fontSize: 30,
    fontFamily: "Helvetica-Bold",
    color: P.white,
    letterSpacing: 0.5,
    marginBottom: 22,
  },
  tocRule: {
    height: 0.75,
    backgroundColor: "rgba(255,255,255,0.12)",
    marginHorizontal: 42,
    marginBottom: 0,
  },
  tocBody: { paddingHorizontal: 42, paddingTop: 0 },
  tocRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#2196F3",
  },
  tocNum: {
    fontSize: 28,
    fontFamily: "Helvetica-Bold",
    color: P.white,
    width: 58,
    lineHeight: 1,
    letterSpacing: -0.5,
  },
  tocLabel: {
    fontSize: 10.5,
    fontFamily: "Helvetica-Bold",
    color: P.white,
    marginBottom: 3,
  },
  tocSub: { fontSize: 7.5, color: "rgba(255,255,255,0.45)", lineHeight: 1.35 },
  tocFooter: {
    position: "absolute",
    bottom: 28,
    left: 42,
    right: 42,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  tocFooterL: {
    fontSize: 5.5,
    color: "rgba(255,255,255,0.2)",
    lineHeight: 1.6,
    flex: 1,
    marginRight: 20,
  },
  tocFooterR: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: "rgba(255,255,255,0.25)",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },

  // Legacy cover (keep for reference, not used)
  coverBand: {
    backgroundColor: P.navy,
    paddingHorizontal: 48,
    paddingTop: 56,
    paddingBottom: 36,
  },
  coverTocTitle: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: P.muted,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  coverTocRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 7,
    gap: 10,
  },
  coverTocNum: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: P.navy,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  coverTocNumT: { fontSize: 6.5, fontFamily: "Helvetica-Bold", color: P.white },
  coverTocLabel: { fontSize: 8.5, color: P.ink },
  coverMetaText: { fontSize: 9, color: P.sub, lineHeight: 1.6, maxWidth: 440 },
  coverToc: { paddingHorizontal: 48, paddingVertical: 20 },

  // Chapter Divider
  divContent: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 60,
    paddingVertical: 0,
  },
  divNum: {
    fontSize: 96,
    fontFamily: "Helvetica-Bold",
    color: "rgba(255,255,255,0.07)",
    position: "absolute",
    top: 32,
    right: 48,
    lineHeight: 1,
  },
  divAccent: {
    width: 48,
    height: 3,
    backgroundColor: "#ff0a4b",
    marginBottom: 20,
  },
  divTitle: {
    fontSize: 36,
    fontFamily: "Helvetica-Bold",
    color: P.white,
    lineHeight: 1.2,
    marginBottom: 12,
  },
  divSub: {
    fontSize: 11,
    color: "rgba(255,255,255,0.5)",
    lineHeight: 1.5,
    maxWidth: 360,
  },

  // Body layout
  body: { paddingHorizontal: 36, paddingTop: 20, paddingBottom: 48 },
  cols: { flexDirection: "row", gap: 24 },
  col: { flex: 1 },
  colWide: { flex: 1.5 },
  colNarrow: { flex: 1 },

  // Page header
  pageHeader: {
    paddingHorizontal: 36,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: P.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 0,
  },
  pageHeaderL: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: P.navy,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  pageHeaderR: { fontSize: 7, color: P.muted },

  // Section headers
  sec: { marginTop: 12, marginBottom: 7 },
  secAccent: {
    width: 28,
    height: 2,
    backgroundColor: P.emerald,
    marginBottom: 6,
  },
  secT: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: P.navy,
    textTransform: "uppercase",
    letterSpacing: 1.4,
  },
  secSub: { fontSize: 7, color: P.muted, marginTop: 3 },

  // Stat callouts (large)
  bigStatRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  bigStat: {
    flex: 1,
    padding: "6 14",
    backgroundColor: P.light,
    borderTopWidth: 3,
    borderTopColor: P.navy,
  },
  bigStatV: {
    fontSize: 28,
    fontFamily: "Helvetica-Bold",
    color: P.navy,
    lineHeight: 1,
  },
  bigStatLbl: {
    fontSize: 6,
    fontFamily: "Helvetica-Bold",
    color: P.muted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginTop: 4,
  },
  bigStatSub: { fontSize: 6.5, color: P.muted, marginTop: 2 },

  // Score bar
  scoreWrap: { marginBottom: 6 },
  scoreLbl: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },
  scoreName: { fontSize: 7.5, color: P.ink },
  scoreVal: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: P.navy },
  scoreTrack: { height: 5, backgroundColor: P.border, borderRadius: 2.5 },
  scoreFill: { height: 5, borderRadius: 2.5 },

  // Metric cards
  mGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 },
  mCard: {
    minWidth: 80,
    flex: 1,
    padding: "7 9",
    borderWidth: 1,
    borderColor: P.border,
    borderRadius: 2,
    backgroundColor: P.white,
  },
  mLbl: {
    fontSize: 5.5,
    fontFamily: "Helvetica-Bold",
    color: P.muted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  mVal: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: P.navy,
    lineHeight: 1,
  },
  mSub: { fontSize: 6, color: P.muted, marginTop: 2 },

  // CEI card
  ceiCard: {
    borderRadius: 3,
    padding: "12 14",
    marginBottom: 12,
  },
  ceiTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  ceiLabel: { fontSize: 14, fontFamily: "Helvetica-Bold", lineHeight: 1 },
  ceiScore: {
    fontSize: 28,
    fontFamily: "Helvetica-Bold",
    color: P.navy,
    lineHeight: 1,
    textAlign: "right",
  },
  ceiScoreSub: {
    fontSize: 6.5,
    color: P.muted,
    textAlign: "right",
    marginTop: 2,
  },
  ceiStats: { flexDirection: "row", gap: 16, marginBottom: 8 },
  ceiStatItem: { flex: 1 },
  ceiStatLbl: {
    fontSize: 6,
    fontFamily: "Helvetica-Bold",
    color: P.muted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  ceiStatVal: { fontSize: 11, fontFamily: "Helvetica-Bold", color: P.ink },
  ceiNote: {
    fontSize: 8,
    color: P.sub,
    lineHeight: 1.6,
    marginTop: 4,
  },

  // Tables
  tWrap: {
    borderWidth: 1,
    borderColor: P.border,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 10,
  },
  thead: { flexDirection: "row", backgroundColor: P.navy },
  th: {
    fontSize: 6,
    fontFamily: "Helvetica-Bold",
    color: "rgba(255,255,255,0.8)",
    textTransform: "uppercase",
    letterSpacing: 0.7,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  tr: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: P.border,
  },
  trAlt: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: P.border,
    backgroundColor: P.light,
  },
  td: { fontSize: 7.5, color: P.ink, paddingVertical: 5, paddingHorizontal: 8 },
  tdB: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: P.navy,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  tdM: {
    fontSize: 7.5,
    color: P.muted,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  tdG: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: P.emeraldDim,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  tdR: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: P.red,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  tdA: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: P.amber,
    paddingVertical: 5,
    paddingHorizontal: 8,
  },

  // Badge / pill
  badge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 2,
    alignSelf: "flex-start",
  },
  badgeT: {
    fontSize: 6,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },

  // Narrative blocks
  para: { fontSize: 8.5, color: P.sub, lineHeight: 1.55, marginBottom: 4 },
  paraB: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: P.ink,
    marginBottom: 3,
  },
  h1: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: P.navy,
    marginBottom: 6,
    marginTop: 10,
  },
  h2: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: P.navy,
    marginBottom: 4,
    marginTop: 8,
  },
  bullet: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 4,
    alignItems: "flex-start",
  },
  bulletDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: P.emerald,
    marginTop: 5,
    flexShrink: 0,
  },
  bulletT: { fontSize: 8.5, color: P.sub, lineHeight: 1.55, flex: 1 },
  spacer: { height: 6 },

  // Action items
  actionPhase: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: P.white,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    paddingVertical: 5,
    paddingHorizontal: 10,
    // backgroundColor: P.navy,
    marginBottom: 0,
    marginTop: 12,
    borderRadius: 2,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
    padding: "8 10",
    borderBottomWidth: 0.5,
    borderBottomColor: P.border,
  },
  actionNum: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: P.emerald,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  actionNumT: { fontSize: 7, fontFamily: "Helvetica-Bold", color: P.white },
  actionTitle: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: P.ink,
    marginBottom: 2,
  },
  actionDetail: { fontSize: 7.5, color: P.sub, lineHeight: 1.4 },
  actionOwner: { fontSize: 6.5, color: P.muted, marginTop: 2 },

  // Diligence checklist
  dlSection: { marginBottom: 18 },
  dlHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    paddingBottom: 5,
    borderBottomWidth: 1.5,
    borderBottomColor: P.navy,
    marginBottom: 0,
  },
  dlHeaderT: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: P.navy,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  dlPriority: { paddingVertical: 2, paddingHorizontal: 6, borderRadius: 1 },
  dlPriorityT: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1,
  },
  dlItem: {
    flexDirection: "row",
    gap: 7,
    paddingVertical: 5,
    paddingHorizontal: 2,
    borderBottomWidth: 0.5,
    borderBottomColor: P.border,
    backgroundColor: P.white,
    alignItems: "center",
  },
  dlCheckbox: {
    width: 9,
    height: 9,
    borderWidth: 1,
    borderColor: P.border,
    borderRadius: 0,
    flexShrink: 0,
  },
  dlItemT: { fontSize: 7.5, color: P.ink, flex: 1 },
  dlStatus: {
    width: 55,
    borderBottomWidth: 1,
    borderBottomColor: P.border,
    height: 10,
  },

  // Neighbor card
  neighborCard: {
    borderWidth: 1,
    borderColor: P.border,
    borderRadius: 3,
    marginBottom: 12,
    overflow: "hidden",
  },
  neighborHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: P.navyMid,
  },
  neighborName: { fontSize: 11, fontFamily: "Helvetica-Bold", color: P.white },
  neighborState: { fontSize: 8, color: "rgba(255,255,255,0.5)", marginTop: 1 },
  neighborBody: { padding: "10 12" },
  neighborStats: { flexDirection: "row", gap: 10, marginBottom: 8 },
  neighborStat: { flex: 1 },
  neighborStatLbl: {
    fontSize: 5.5,
    fontFamily: "Helvetica-Bold",
    color: P.muted,
    textTransform: "uppercase",
    letterSpacing: 0.7,
    marginBottom: 2,
  },
  neighborStatVal: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: P.navy,
    lineHeight: 1,
  },
  neighborNote: { fontSize: 7.5, color: P.sub, lineHeight: 1.5 },

  // Employer brief
  empSection: {
    marginBottom: 14,
  },
  empTitle: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: P.navy,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 5,
  },
  empText: { fontSize: 8.5, color: P.sub, lineHeight: 1.65 },

  // Risk table badge
  riskH: { paddingVertical: 2, paddingHorizontal: 5, borderRadius: 1 },
  riskHT: { fontSize: 7, fontFamily: "Helvetica-Bold" },

  // Footer
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    borderTopColor: "#2196F3",
    paddingHorizontal: 36,
    paddingVertical: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: P.white,
  },
  footerL: { fontSize: 6.5, color: P.muted },
  footerR: { fontSize: 6.5, color: P.muted },

  // Pull quote
  pullQuote: {
    borderLeftWidth: 3,
    borderLeftColor: P.gold,
    paddingLeft: 14,
    paddingVertical: 4,
    marginVertical: 10,
  },
  pullQuoteT: { fontSize: 10, color: P.navyMid, lineHeight: 1.55 },

  // Info panel
  infoPanel: {
    backgroundColor: P.light,
    borderWidth: 1,
    borderColor: P.border,
    borderRadius: 3,
    padding: "10 12",
    marginBottom: 10,
  },
  infoPanelTitle: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: P.navy,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
  },
  infoPanelText: { fontSize: 8, color: P.sub, lineHeight: 1.6 },

  // Exec brief risk flag
  riskFlag: {
    flexDirection: "row",
    gap: 8,
    padding: "8 12",
    backgroundColor: P.redLight,
    borderLeftWidth: 3,
    borderLeftColor: P.red,
    marginBottom: 8,
    alignItems: "flex-start",
  },
  riskFlagT: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: P.red,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  riskFlagB: { fontSize: 8, color: P.red, lineHeight: 1.45 },

  // TLDR box
  tldrBox: {
    // padding: "12 0",
    borderRadius: 3,
    marginBottom: 14,
  },
  tldrEye: {
    fontSize: 6,
    fontFamily: "Helvetica-Bold",
    color: P.gold,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  tldrText: { fontSize: 12, color: P.navy, lineHeight: 1.25 },

  // Methodology box
  methBox: {
    backgroundColor: P.light,
    borderLeftWidth: 3,
    borderLeftColor: P.gold,
    padding: "8 12",
    borderRadius: 2,
    marginBottom: 10,
  },
  methHead: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    color: P.navy,
    textTransform: "uppercase",
    letterSpacing: 0.9,
    marginBottom: 4,
  },
  methText: { fontSize: 7.5, color: P.sub, lineHeight: 1.55 },

  // Key findings grid
  findGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 10,
  },
  findCard: {
    minWidth: 90,
    flex: 1,
    padding: "8 10",
    borderRadius: 3,
    // borderWidth: 1,
  },
  findLbl: {
    fontSize: 5.5,
    fontFamily: "Helvetica-Bold",
    color: P.muted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 3,
  },
  findVal: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: P.navy,
    lineHeight: 1,
  },
  findSub: { fontSize: 6, color: P.muted, marginTop: 2, lineHeight: 1.4 },
});

// ─── Sub-components ───────────────────────────────────────────────────────────
function Footer({ countyName, thesis, pageLabel }) {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerL}>
        {countyName} · {THESIS_LABEL[thesis]} Thesis · Market Action Plan
      </Text>
      <Text style={s.footerR}>{pageLabel || ""}</Text>
    </View>
  );
}

function PageHeader({ countyName, chapter }) {
  return (
    <View style={s.pageHeader}>
      <Text style={s.pageHeaderL}>{chapter}</Text>
      <Text style={s.pageHeaderR}>{countyName}</Text>
    </View>
  );
}

function SecHeader({ title, sub }) {
  return (
    <View style={s.sec}>
      <View style={s.secAccent} />
      <Text style={s.secT}>{title}</Text>
      {sub && <Text style={s.secSub}>{sub}</Text>}
    </View>
  );
}

function SecHeaderClean({ title, sub }) {
  return (
    <View style={s.sec}>
      <Text style={s.secT}>{title}</Text>
      {sub && <Text style={s.secSub}>{sub}</Text>}
    </View>
  );
}

function RiskBadge({ level }) {
  const colors = {
    H: { bg: "#fef2f2", text: P.red },
    M: { bg: "#fffbeb", text: P.amber },
    L: { bg: "#f0fdf4", text: P.emeraldDim },
  };
  const c = colors[level] || colors.M;
  return (
    <View style={[s.riskH, { backgroundColor: c.bg }]}>
      <Text style={[s.riskHT, { color: c.text }]}>{level}</Text>
    </View>
  );
}

function MdBlock({ text, segs: propSegs }) {
  const segs = propSegs || parseMd(text || "");
  return (
    <View>
      {segs.map((seg, i) => {
        if (seg.type === "spacer") return <View key={i} style={s.spacer} />;
        if (seg.type === "h1")
          return (
            <Text key={i} style={s.h1}>
              {seg.text}
            </Text>
          );
        if (seg.type === "h2")
          return (
            <Text key={i} style={s.h2}>
              {seg.text}
            </Text>
          );
        if (seg.type === "bold_line")
          return (
            <Text key={i} style={s.paraB}>
              {seg.text}
            </Text>
          );
        if (seg.type === "bullet") {
          const parts = parseInline(seg.text);
          return (
            <View key={i} style={s.bullet} wrap={false}>
              <View style={s.bulletDot} />
              <Text style={s.bulletT}>
                {parts.map((p, j) =>
                  p.bold ? (
                    <Text key={j} style={{ fontFamily: "Helvetica-Bold" }}>
                      {p.text}
                    </Text>
                  ) : (
                    <Text key={j}>{p.text}</Text>
                  ),
                )}
              </Text>
            </View>
          );
        }
        // para
        const parts = parseInline(seg.text);
        return (
          <Text key={i} style={s.para}>
            {parts.map((p, j) =>
              p.bold ? (
                <Text
                  key={j}
                  style={{ fontFamily: "Helvetica-Bold", color: P.ink }}
                >
                  {p.text}
                </Text>
              ) : (
                <Text key={j}>{p.text}</Text>
              ),
            )}
          </Text>
        );
      })}
    </View>
  );
}

// ─── Cover County Map (single county, blue hatch on white) ───────────────────
function CoverCountyMapSvg({ pathD, size = 300 }) {
  if (!pathD) return null;
  const W = size,
    H = size;
  const hatchLines = [];
  const step = 8;
  for (let k = -H; k < W + H; k += step) {
    hatchLines.push(
      <Line
        key={k}
        x1={k}
        y1={0}
        x2={k - H}
        y2={H}
        stroke="#2196F3"
        strokeWidth={1.6}
        strokeOpacity="0.3"
      />,
    );
  }
  return (
    <Svg viewBox={`0 0 ${W} ${H}`} style={{ width: W, height: H }}>
      <Defs>
        <ClipPath id="covclip">
          <Path d={pathD} />
        </ClipPath>
      </Defs>
      {/* County fill */}
      <Path d={pathD} fill="#f4f7fc" stroke="none" />
      {/* Hatch clipped to county */}
      <G clipPath="url(#covclip)">{hatchLines}</G>
      {/* Outline */}
      <Path d={pathD} fill="none" stroke={P.navy} strokeWidth={1.2} />
    </Svg>
  );
}

// ─── Geographic County Map ────────────────────────────────────────────────────
// Renders pre-computed d3-geo SVG path strings for county + neighbors
function CountyMapSvg({ countyMapPaths, countyName }) {
  if (!countyMapPaths || countyMapPaths.length === 0) return null;
  const W = 480,
    H = 260;
  const targetPaths = countyMapPaths.filter((p) => p.isTarget);
  const neighborPaths = countyMapPaths.filter((p) => !p.isTarget);

  // Hatch lines clipped to target county shape — drawn via many diagonal lines
  // Spaced 10px apart at 45°; we over-cover the entire viewbox
  const hatchLines = [];
  const step = 9;
  for (let k = -H; k < W + H; k += step) {
    hatchLines.push(
      <Line
        key={k}
        x1={k}
        y1={0}
        x2={k - H}
        y2={H}
        stroke="#ff0a4b"
        strokeWidth={1.8}
        strokeOpacity="0.28"
      />,
    );
  }

  return (
    <Svg viewBox={`0 0 ${W} ${H}`} style={{ width: W, height: H }}>
      <Defs>
        {targetPaths.length > 0 && (
          <ClipPath id="ctyclip">
            {targetPaths.map((p, i) => (
              <Path key={i} d={p.d} />
            ))}
          </ClipPath>
        )}
      </Defs>

      {/* Neighbor county fills */}
      {neighborPaths.map((p, i) => (
        <Path
          key={`n${i}`}
          d={p.d}
          fill="#0a224018"
          stroke="#0a2240"
          strokeWidth={0.5}
          strokeOpacity="0.5"
        />
      ))}

      {/* Target county — solid light fill first */}
      {targetPaths.map((p, i) => (
        <Path key={`t${i}`} d={p.d} fill="#0a224012" stroke="none" />
      ))}

      {/* Hatch lines clipped to target county */}
      {targetPaths.length > 0 && <G clipPath="url(#ctyclip)">{hatchLines}</G>}

      {/* Target county outline on top */}
      {targetPaths.map((p, i) => (
        <Path
          key={`o${i}`}
          d={p.d}
          fill="none"
          stroke="#0a2240"
          strokeWidth={1.5}
        />
      ))}
    </Svg>
  );
}

// ─── Cluster SVG Map (fallback when no geo paths available) ──────────────────
function ClusterMapSvg({ county, neighborCounties, thesis }) {
  const tc = THESIS_COLOR[thesis] || P.navy;
  const composite = Math.round(county.composite || 0);
  const cx = 258,
    cy = 132;
  const orbitR = 90;
  const n = Math.min(neighborCounties.length, 8);

  const neighbors = neighborCounties.slice(0, 8).map((nc, i) => {
    const angle = ((2 * Math.PI) / Math.max(n, 1)) * i - Math.PI / 2;
    return {
      x: Math.round(cx + orbitR * Math.cos(angle)),
      y: Math.round(cy + orbitR * Math.sin(angle)),
      color: CEI_COLOR[nc.cei?.label] || P.muted,
      score: Math.round(nc.composite || 0),
    };
  });

  return (
    <Svg viewBox="0 0 516 264" style={{ width: 516, height: 264 }}>
      {/* Faint background rings */}
      <Circle
        cx={cx}
        cy={cy}
        r={orbitR + 38}
        fill="none"
        stroke="#e5e8f0"
        strokeWidth={0.75}
        strokeDasharray="3 5"
      />
      <Circle
        cx={cx}
        cy={cy}
        r={orbitR + 18}
        fill="none"
        stroke="#e5e8f0"
        strokeWidth={0.5}
        strokeDasharray="2 4"
      />
      <Circle
        cx={cx}
        cy={cy}
        r={orbitR - 18}
        fill="none"
        stroke="#eaecf2"
        strokeWidth={0.4}
      />
      {neighbors.map((nb, i) => (
        <Line
          key={`l${i}`}
          x1={cx}
          y1={cy}
          x2={nb.x}
          y2={nb.y}
          stroke="#cbd5e1"
          strokeWidth={0.75}
        />
      ))}
      {neighbors.map((nb, i) => (
        <G key={`g${i}`}>
          <Circle
            cx={nb.x}
            cy={nb.y}
            r={15}
            fill={nb.color + "25"}
            stroke={nb.color}
            strokeWidth={1.25}
          />
          <Circle
            cx={nb.x}
            cy={nb.y}
            r={7}
            fill={nb.color + "55"}
            stroke="none"
          />
        </G>
      ))}
      <Circle
        cx={cx}
        cy={cy}
        r={36}
        fill={tc + "18"}
        stroke={tc + "44"}
        strokeWidth={1.5}
      />
      <Circle cx={cx} cy={cy} r={27} fill={tc} stroke="none" />
      <Circle
        cx={cx}
        cy={cy}
        r={13}
        fill="none"
        stroke="rgba(255,255,255,0.35)"
        strokeWidth={1}
      />
    </Svg>
  );
}

// ─── Chapter: Cover ───────────────────────────────────────────────────────────
function CoverPage({
  county,
  thesis,
  generatedDate,
  countyOnlyPath,
  totalCounties,
}) {
  const composite = Math.round(county.composite || 0);
  const rank = county.rank;
  const pop = county.population || county.metrics?.population;
  const countyNameUpper = (
    county.name ||
    county.county_name ||
    "County"
  ).toUpperCase();
  const stateUpper = (county.state_abbr || county.state || "").toUpperCase();
  const titleText = stateUpper
    ? `${countyNameUpper} \u2022 ${stateUpper}`
    : countyNameUpper;
  const total = totalCounties || 3104;
  const logoSrc = `${window.location.origin}/DocLogo.png`;

  return (
    <Page size="LETTER" style={s.coverPage}>
      {/* Left navy accent bar */}
      <View style={s.coverAccentBar} />

      {/* Top: "MARKET ACTION PLAN" label + red rule below */}
      <View style={s.coverTopArea}>
        <Text style={s.coverTopLabel}>Market Action Plan</Text>
        <View style={s.coverTopRule} />
      </View>

      {/* Body */}
      <View style={s.coverBody}>
        {/* Full-width eyebrow + county name */}
        <Text style={s.coverThesisEye}>
          {THESIS_LABEL[thesis]} Market Thesis
        </Text>
        <Text style={s.coverCountyName}>{titleText}</Text>

        {/* Two columns: stats LEFT, map RIGHT */}
        <View style={s.coverTwoCol}>
          <View style={s.coverStatsCol}>
            <View style={s.coverStatBlock}>
              <Text style={s.coverStatLbl}>Composite Score</Text>
              <Text style={s.coverStatVal}>{composite}</Text>
            </View>

            {rank != null && (
              <View style={s.coverStatBlock}>
                <Text style={s.coverStatLbl}>Rank</Text>
                <View style={s.coverRankRow}>
                  <Text style={s.coverRankNum}>{fmtNum(rank)}</Text>
                  <Text style={s.coverRankSub}> of {fmtNum(total)}</Text>
                </View>
              </View>
            )}

            {pop != null && (
              <View style={s.coverStatBlock}>
                <Text style={s.coverStatLbl}>Population</Text>
                <Text style={s.coverStatVal}>{fmtNum(pop)}</Text>
              </View>
            )}
          </View>

          {/* Map column */}
          <View style={s.coverMapCol}>
            {countyOnlyPath && (
              <CoverCountyMapSvg pathD={countyOnlyPath} size={320} />
            )}
          </View>
        </View>
      </View>

      {/* Bottom: DocLogo */}
      <View style={s.coverBrandRow}>
        <Image
          src={logoSrc}
          style={{ width: 140, height: 44, objectFit: "contain" }}
        />
      </View>
    </Page>
  );
}

// ─── Table of Contents (PropertyReport.js style) ─────────────────────────────
function TocPage({ county, thesis, generatedDate }) {
  const chapters = [
    {
      n: "01",
      title: "Executive Brief",
      sub: "Market position, thesis fit, TLDR, and scoring methodology",
    },
    {
      n: "02",
      title: "Why This Market",
      sub: "Deep dive analysis framed around the thesis and opportunity",
    },
    {
      n: "03",
      title: "Market Fundamentals",
      sub: "Key metrics, dimension score breakdown, and raw data indicators",
    },
    {
      n: "04",
      title: "Neighboring Markets",
      sub: "Cluster Emergence Index and contiguous market analysis",
    },
    {
      n: "05",
      title: "Thesis Risk Factors",
      sub: "What kills the thesis — likelihood, impact, and mitigation",
    },
    {
      n: "06",
      title: "Action Plan",
      sub: "Immediate, 30-, 60-, and 90-day sequenced action items",
    },
    {
      n: "07",
      title: "Diligence Checklist",
      sub: "Thesis-specific workstreams with fillable status fields",
    },
    {
      n: "08",
      title: "Employer / Stakeholder Brief",
      sub: "Outward-facing profile for employer and partner conversations",
    },
  ];

  return (
    <Page size="LETTER" style={s.tocPage}>
      {/* Top bar */}
      <View style={s.tocTopBar}>
        <Text style={s.tocTopEye}>
          Market Action Plan · {THESIS_LABEL[thesis]} Thesis
        </Text>
        <Text style={s.tocTopDate}>
          {generatedDate ||
            new Date().toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
        </Text>
      </View>

      {/* Header */}
      <View style={s.tocHeader}>
        <Text style={s.tocEyebrow}>Contents</Text>
        <Text style={s.tocTitle}>TABLE OF CONTENTS</Text>
      </View>

      {/* Separator */}
      <View style={s.tocRule} />

      {/* Chapter rows */}
      <View style={s.tocBody}>
        {chapters.map(({ n, title, sub }) => (
          <View key={n} style={s.tocRow} wrap={false}>
            <Text style={s.tocNum}>{n}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.tocLabel}>{title}</Text>
              <Text style={s.tocSub}>{sub}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Bottom */}
      <View style={s.tocFooter}>
        <Text style={s.tocFooterL}>
          For internal use only. Not financial, legal, or investment advice.
          Ground Score composite scores reflect percentile rankings across the
          national scored universe.
        </Text>
        <Text style={s.tocFooterR}>Ampledge</Text>
      </View>
    </Page>
  );
}

// ─── Chapter Divider ──────────────────────────────────────────────────────────
function ChapterDivider({ num, title, sub, countyName, thesis }) {
  return (
    <Page size="LETTER" style={s.divPage}>
      <Text style={s.divNum}>{num}</Text>
      <View style={s.divContent}>
        <View style={s.divAccent} />
        <Text style={s.divTitle}>{title}</Text>
        {sub && <Text style={s.divSub}>{sub}</Text>}
      </View>
      <View
        style={[
          s.footer,
          { backgroundColor: "transparent", borderTopColor: "#2196F3" },
        ]}
      >
        <Text style={[s.footerL, { color: "rgba(255,255,255,0.3)" }]}>
          {countyName} · {THESIS_LABEL[thesis]} · Market Action Plan
        </Text>
        <Text style={[s.footerR, { color: "rgba(255,255,255,0.3)" }]}>
          Chapter {num}
        </Text>
      </View>
    </Page>
  );
}

// ─── Signal colour helper (matches app DIMENSION_DETAILS tier thresholds) ─────
const SIG_G = "#0e7634"; // green  — top tier
const SIG_OK = "#1cad51"; // light green — good
const SIG_W = "#fbbf24"; // amber  — caution
const SIG_R = "#f87171"; // red    — bad

function signalColor(thesis, lbl, raw) {
  if (raw == null) return SIG_W;
  switch (lbl) {
    case "Unemployment":
      if (thesis === "activation" || thesis === "engineered") {
        // High unemployment = labor slack = good for these theses
        return raw > 5 ? SIG_G : raw >= 3 ? SIG_OK : raw >= 2 ? SIG_W : SIG_R;
      }
      // Expansion/formation: low unemployment = thriving = good
      return raw < 3 ? SIG_G : raw < 5 ? SIG_OK : raw < 7 ? SIG_W : SIG_R;
    case "Home Values": {
      const g = raw * 100; // zhvi_growth_1yr is decimal (0.042 = 4.2%)
      return g > 5 ? SIG_G : g > 2 ? SIG_OK : g >= 0 ? SIG_W : SIG_R;
    }
    case "Median HHI":
      return raw >= 65000
        ? SIG_G
        : raw >= 50000
          ? SIG_OK
          : raw >= 40000
            ? SIG_W
            : SIG_R;
    case "Population Growth":
      return raw > 0.01
        ? SIG_G
        : raw > 0
          ? SIG_OK
          : raw > -0.01
            ? SIG_W
            : SIG_R;
    case "Business Formation":
      return raw > 10 ? SIG_G : raw > 5 ? SIG_OK : raw > 2 ? SIG_W : SIG_R;
    case "Permit Activity":
      return raw > 5 ? SIG_G : raw > 3 ? SIG_OK : raw > 1 ? SIG_W : SIG_R;
    case "Broadband":
      return raw > 80 ? SIG_G : raw > 60 ? SIG_OK : raw > 40 ? SIG_W : SIG_R;
    case "Land Basis":
      return raw < 2500
        ? SIG_G
        : raw < 5000
          ? SIG_OK
          : raw < 10000
            ? SIG_W
            : SIG_R;
    default:
      return raw > 0 ? SIG_OK : SIG_W;
  }
}

// ─── Ch 01: Executive Brief ───────────────────────────────────────────────────
function ExecBriefPage({ county, thesis, defaults, tldrText }) {
  const composite = Math.round(county.composite || 0);
  const tier = county.tier;
  const cei = county.cei;
  const tc = THESIS_COLOR[thesis] || P.navy;
  const m = county.metrics || {};
  const topRisk = defaults.risks?.[0];
  const topActions = (defaults.immediate || []).slice(0, 3);
  const rank = county.rank;

  // Build key findings from available data
  const findings = [];
  if (m.zhvi_latest != null)
    findings.push({
      lbl: "Home Values",
      val: `$${fmtNum(m.zhvi_latest / 1000, 0)}k`,
      sub:
        m.zhvi_growth_1yr != null
          ? `${fmtPct(m.zhvi_growth_1yr * 100)} 1-yr`
          : "Zillow ZHVI",
      pos: m.zhvi_growth_1yr > 0.03,
      color: signalColor(thesis, "Home Values", m.zhvi_growth_1yr),
    });
  if (m.unemployment_rate != null)
    findings.push({
      lbl: "Unemployment",
      val: `${fmtNum(m.unemployment_rate, 1)}%`,
      sub:
        m.unemployment_rate > 5
          ? "Above avg — labor slack"
          : "Near full employment",
      pos:
        thesis === "activation" || thesis === "engineered"
          ? m.unemployment_rate > 4
          : m.unemployment_rate < 5,
      color: signalColor(thesis, "Unemployment", m.unemployment_rate),
    });
  if (m.median_hhi != null)
    findings.push({
      lbl: "Median HHI",
      val: `$${fmtNum(m.median_hhi / 1000, 0)}k`,
      sub: "Census ACS",
      pos: m.median_hhi > 45000,
      color: signalColor(thesis, "Median HHI", m.median_hhi),
    });
  if (m.pop_growth_pct != null)
    findings.push({
      lbl: "Population Growth",
      val: fmtPct(m.pop_growth_pct),
      sub: "5-yr CAGR",
      pos: m.pop_growth_pct > 0,
      color: signalColor(thesis, "Population Growth", m.pop_growth_pct),
    });
  if (m.biz_apps_per_1k != null)
    findings.push({
      lbl: "Business Formation",
      val: `${fmtNum(m.biz_apps_per_1k, 1)}/1k`,
      sub: "Census BFS",
      pos: m.biz_apps_per_1k > 5,
      color: signalColor(thesis, "Business Formation", m.biz_apps_per_1k),
    });
  if (m.permit_units_per_1k != null)
    findings.push({
      lbl: "Permit Activity",
      val: `${fmtNum(m.permit_units_per_1k, 1)}/1k`,
      sub: "Census BPS",
      pos: m.permit_units_per_1k > 3,
      color: signalColor(thesis, "Permit Activity", m.permit_units_per_1k),
    });
  if (m.broadband_pct != null)
    findings.push({
      lbl: "Broadband",
      val: `${fmtNum(m.broadband_pct, 0)}%`,
      sub: "FCC coverage",
      pos: m.broadband_pct > 80,
      color: signalColor(thesis, "Broadband", m.broadband_pct),
    });
  if (m.farmland_value_acre != null)
    findings.push({
      lbl: "Land Basis",
      val: `$${fmtNum(m.farmland_value_acre / 1000, 1)}k/ac`,
      sub: "USDA",
      pos: m.farmland_value_acre < 5000,
      color: signalColor(thesis, "Land Basis", m.farmland_value_acre),
    });
  const topFindings = findings.slice(0, 6);

  return (
    <Page size="LETTER" style={s.page}>
      <PageHeader
        countyName={county.name || county.county_name}
        chapter="01 — Executive Brief"
      />
      <View style={s.body}>
        {/* TLDR box — most prominent element */}
        {tldrText && (
          <View style={[s.tldrBox]}>
            <Text style={s.tldrText}>
              {tldrText.replace(/\*\*/g, "").slice(0, 5600)}
            </Text>
          </View>
        )}

        {/* Big stat row */}
        <View style={s.bigStatRow}>
          <View style={[s.bigStat, { borderTopColor: P.navy }]}>
            <Text style={[s.bigStatV, { color: P.navy }]}>{composite}</Text>
            <Text style={s.bigStatLbl}>Composite Score</Text>
            <Text style={s.bigStatSub}>Out of 100</Text>
          </View>
          <View
            style={[s.bigStat, { borderTopColor: TIER_COLOR[tier] || P.muted }]}
          >
            <Text
              style={[
                s.bigStatV,
                { fontSize: 18 },
                { color: TIER_COLOR[tier] || P.muted },
              ]}
            >
              {TIER_LABEL[tier] || "—"}
            </Text>
            <Text style={s.bigStatLbl}>Market Tier</Text>
            <Text style={s.bigStatSub}>{THESIS_LABEL[thesis]} ranking</Text>
          </View>
          {rank && (
            <View style={[s.bigStat, { borderTopColor: tc }]}>
              <Text style={[s.bigStatV, { color: tc }]}>{fmtNum(rank)}</Text>
              <Text style={s.bigStatLbl}>National Rank</Text>
              <Text style={s.bigStatSub}>Across scored universe</Text>
            </View>
          )}
          {cei && (
            <View
              style={[
                s.bigStat,
                { borderTopColor: CEI_COLOR[cei.label] || P.muted },
              ]}
            >
              <Text
                style={[
                  s.bigStatV,
                  { fontSize: 24 },
                  { color: CEI_COLOR[cei.label] || P.muted },
                ]}
              >
                {cei.score}
              </Text>
              <Text
                style={[
                  s.bigStatLbl,
                  { color: CEI_COLOR[cei.label] || P.muted },
                ]}
              >
                {cei.label}
              </Text>
              <Text style={s.bigStatLbl}>CLUSTER EMERGENCE INDEX</Text>
            </View>
          )}
        </View>

        <View style={s.cols}>
          {/* Left col: thesis + scoring process + CEI + primary risk */}
          <View style={s.colWide}>
            <SecHeaderClean title={`${THESIS_LABEL[thesis]} Thesis`} />
            <Text style={s.para}>{THESIS_DESCRIPTION[thesis]}</Text>

            <SecHeaderClean title="Scoring Model" />
            <Text style={s.para}>{METHODOLOGY_BRIEF}</Text>

            <SecHeaderClean
              title="This Market"
              sub={`${THESIS_LABEL[thesis]} · Why it qualifies`}
            />
            <Text style={s.para}>{defaults.thesis_fit}</Text>

            {cei &&
              (() => {
                const impl = CEI_THESIS_IMPLICATIONS[thesis]?.[cei.label];
                const ceiColor = CEI_COLOR[cei.label] || P.muted;
                return (
                  <>
                    <SecHeaderClean
                      title={cei.label}
                      sub={
                        impl?.verdict
                          ? `${impl.verdict} · ${cei.gap != null ? `${Math.abs(Math.round(cei.gap))} pts ${cei.gap >= 0 ? "above" : "below"} ${fmtNum(cei.neighbor_count || 0)} neighbors` : "regional cluster"}`
                          : undefined
                      }
                    />
                    <Text style={s.para}>{impl?.body || ""}</Text>
                    {/* CEI stat row */}
                    <View
                      style={{
                        flexDirection: "row",
                        marginTop: 8,
                        gap: 0,
                        borderTopWidth: 1,
                        borderTopColor: P.border,
                        paddingTop: 8,
                      }}
                    >
                      {cei.neighbor_avg != null && (
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              fontSize: 5.5,
                              fontFamily: "Helvetica-Bold",
                              color: P.muted,
                              textTransform: "uppercase",
                              letterSpacing: 0.8,
                              marginBottom: 2,
                            }}
                          >
                            Regional{"\n"}Avg Score
                          </Text>
                          <Text
                            style={{
                              fontSize: 13,
                              fontFamily: "Helvetica-Bold",
                              color: P.navy,
                            }}
                          >
                            {fmtNum(cei.neighbor_avg, 1)}
                          </Text>
                        </View>
                      )}
                      {cei.gap != null && (
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              fontSize: 5.5,
                              fontFamily: "Helvetica-Bold",
                              color: P.muted,
                              textTransform: "uppercase",
                              letterSpacing: 0.8,
                              marginBottom: 2,
                            }}
                          >
                            Gap vs.{"\n"}Neighbors
                          </Text>
                          <Text
                            style={{
                              fontSize: 13,
                              fontFamily: "Helvetica-Bold",
                              color: cei.gap >= 0 ? P.emerald : P.red,
                            }}
                          >
                            {cei.gap >= 0 ? "+" : ""}
                            {fmtNum(cei.gap, 1)}
                          </Text>
                        </View>
                      )}
                      {cei.neighbor_count != null && (
                        <View style={{ flex: 1 }}>
                          <Text
                            style={{
                              fontSize: 5.5,
                              fontFamily: "Helvetica-Bold",
                              color: P.muted,
                              textTransform: "uppercase",
                              letterSpacing: 0.8,
                              marginBottom: 2,
                            }}
                          >
                            Qualifying Neighbors
                          </Text>
                          <Text
                            style={{
                              fontSize: 13,
                              fontFamily: "Helvetica-Bold",
                              color: P.navy,
                            }}
                          >
                            {cei.density} / {cei.neighbor_count}
                          </Text>
                        </View>
                      )}
                      {county.composite != null &&
                        cei.adjusted_composite != null && (
                          <View style={{ flex: 1 }}>
                            <Text
                              style={{
                                fontSize: 5.5,
                                fontFamily: "Helvetica-Bold",
                                color: P.muted,
                                textTransform: "uppercase",
                                letterSpacing: 0.8,
                                marginBottom: 2,
                              }}
                            >
                              Adjusted Composite
                            </Text>
                            <Text
                              style={{
                                fontSize: 13,
                                fontFamily: "Helvetica-Bold",
                                color: CEI_COLOR[cei.label] || P.navy,
                              }}
                            >
                              {fmtNum(cei.adjusted_composite * 100, 1)}
                            </Text>
                          </View>
                        )}
                    </View>
                  </>
                );
              })()}
          </View>

          {/* Right col: key findings + immediate actions */}
          <View style={s.colNarrow}>
            {topFindings.length > 0 && (
              <>
                <SecHeaderClean
                  title="Key Market Signals"
                  sub="Highlights from Ground Score data"
                />
                <View style={s.findGrid}>
                  {topFindings.map((f, i) => (
                    <View
                      key={i}
                      style={[
                        s.findCard,
                        {
                          backgroundColor: (f.color || SIG_OK) + "18",
                        },
                      ]}
                    >
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          marginBottom: 3,
                        }}
                      >
                        <View
                          style={{
                            width: 5,
                            height: 5,
                            borderRadius: 3,
                            backgroundColor: f.color || SIG_OK,
                            marginRight: 4,
                          }}
                        />
                        <Text style={s.findLbl}>{f.lbl}</Text>
                      </View>
                      <Text style={[s.findVal, { color: f.color || P.navy }]}>
                        {f.val}
                      </Text>
                      <Text style={s.findSub}>{f.sub}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            <SecHeader
              title="Immediate Actions"
              sub="Priority items to execute now"
            />
            {topActions.map((action, i) => (
              <View
                key={i}
                style={[
                  s.actionRow,
                  { paddingHorizontal: 0, paddingVertical: 7 },
                ]}
              >
                <View style={[s.actionNum, { backgroundColor: tc }]}>
                  <Text style={s.actionNumT}>{i + 1}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.actionTitle}>{action.action}</Text>
                  <Text style={s.actionDetail}>{action.detail}</Text>
                  {action.owner && (
                    <Text style={s.actionOwner}>Owner: {action.owner}</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        </View>
      </View>
      <Footer
        countyName={county.name || county.county_name}
        thesis={thesis}
        pageLabel="Executive Brief"
      />
    </Page>
  );
}

// ─── Ch 02: Why This Market ───────────────────────────────────────────────────
function WhyThisMarketPage({ county, thesis, deepDiveText }) {
  const name = county.name || county.county_name;
  const text =
    deepDiveText ||
    `No deep dive available. Generate a deep dive from the market detail panel to populate this chapter with AI-generated market analysis tailored to the ${THESIS_LABEL[thesis]} thesis.`;

  const allSegs = parseMd(text);
  // Split into 4 equal chunks — each page gets two columns (left=chunk[0], right=chunk[1])
  const q = Math.ceil(allSegs.length / 4);
  const trim = (arr) => (arr[0]?.type === "spacer" ? arr.slice(1) : arr);
  const chunks = [
    trim(allSegs.slice(0, q)),
    trim(allSegs.slice(q, q * 2)),
    trim(allSegs.slice(q * 2, q * 3)),
    trim(allSegs.slice(q * 3)),
  ];
  const hasPage2 = chunks[2].length > 0 || chunks[3].length > 0;

  return (
    <>
      <Page size="LETTER" style={s.page}>
        <PageHeader countyName={name} chapter="02 — Why This Market" />
        <View style={s.body}>
          <View style={s.cols}>
            <View style={s.col}>
              <SecHeader
                title="Market Analysis"
                sub={`${THESIS_LABEL[thesis]} Thesis · Deep Dive`}
              />
              <MdBlock segs={chunks[0]} />
            </View>
            <View style={s.col}>
              <View style={{ marginTop: 28 }}>
                <MdBlock segs={chunks[1]} />
              </View>
            </View>
          </View>
        </View>
        <Footer countyName={name} thesis={thesis} pageLabel="Why This Market" />
      </Page>

      {hasPage2 && (
        <Page size="LETTER" style={s.page}>
          <PageHeader countyName={name} chapter="02 — Why This Market" />
          <View style={s.body}>
            <View style={s.cols}>
              <View style={s.col}>
                <MdBlock segs={chunks[2]} />
              </View>
              <View style={s.col}>
                <MdBlock segs={chunks[3]} />
              </View>
            </View>
          </View>
          <Footer
            countyName={name}
            thesis={thesis}
            pageLabel="Why This Market"
          />
        </Page>
      )}
    </>
  );
}

// ─── Housing finance helpers (mirrors App.js) ────────────────────────────────
const _mMortgage = (hv, dp, rate = 0.07, yrs = 30) => {
  if (!hv || dp == null) return null;
  const loan = hv * (1 - dp),
    r = rate / 12,
    n = yrs * 12;
  return (loan * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
};
const _mPMI = (hv, dp) =>
  !hv || dp == null || dp >= 0.2 ? 0 : (hv * (1 - dp) * 0.011) / 12;
const _mTotal = (hv, dp, rate = 0.07) => {
  const pi = _mMortgage(hv, dp, rate);
  return pi != null ? pi + _mPMI(hv, dp) : null;
};
const _dti = (hv, hhi, dp, rate = 0.07) => {
  if (!hv || !hhi || dp == null) return null;
  const pmt = _mTotal(hv, dp, rate);
  return pmt ? (pmt / (hhi / 12)) * 100 : null;
};
const _poolPct = (hv, hhi, dp, rate = 0.07, sigma = 0.85) => {
  if (!hv || !hhi || dp == null) return null;
  const pmt = _mTotal(hv, dp, rate);
  if (!pmt) return null;
  const maxInc = (pmt / 0.43) * 12;
  const mu = Math.log(hhi) - (sigma * sigma) / 2;
  const z = (Math.log(maxInc) - mu) / sigma;
  const erf = (x) => {
    const t = 1 / (1 + 0.3275911 * Math.abs(x)),
      p =
        t *
        (0.254829592 +
          t *
            (-0.284496736 +
              t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
    const v = 1 - p * Math.exp(-x * x);
    return x >= 0 ? v : -v;
  };
  return ((1 + erf(z / Math.SQRT2)) / 2) * 100;
};
const _dpReach = (hv, dp, hhi, yrs = 3, sr = 0.1, sigma = 0.85) => {
  if (!hv || !hhi || dp == null) return null;
  const minInc = (hv * dp) / (sr * yrs);
  const mu = Math.log(hhi) - (sigma * sigma) / 2;
  const z = (Math.log(minInc) - mu) / sigma;
  const erf = (x) => {
    const t = 1 / (1 + 0.3275911 * Math.abs(x)),
      p =
        t *
        (0.254829592 +
          t *
            (-0.284496736 +
              t * (1.421413741 + t * (-1.453152027 + t * 1.061405429))));
    const v = 1 - p * Math.exp(-x * x);
    return x >= 0 ? v : -v;
  };
  return (1 - (1 + erf(z / Math.SQRT2)) / 2) * 100;
};

// ─── Supplemental signal helpers ─────────────────────────────────────────────
const SUPP_SIG = {
  "Strong Tailwind": { color: "#16a34a", bg: "#dcfce7" },
  Tailwind: { color: "#15803d", bg: "#f0fdf4" },
  Neutral: { color: "#6b7280", bg: "#f3f4f6" },
  Headwind: { color: "#d97706", bg: "#fffbeb" },
  "Strong Headwind": { color: "#dc2626", bg: "#fef2f2" },
  "No Data": { color: "#9ca3af", bg: "#f9fafb" },
};

function pctToSig(pct) {
  if (pct == null) return { label: "No Data", ...SUPP_SIG["No Data"] };
  const label =
    pct >= 80
      ? "Strong Tailwind"
      : pct >= 60
        ? "Tailwind"
        : pct >= 40
          ? "Neutral"
          : pct >= 20
            ? "Headwind"
            : "Strong Headwind";
  return { label, ...SUPP_SIG[label] };
}

function computeSupplementalSignals(metrics, allCounties, population) {
  if (!metrics || !allCounties?.length) return [];
  const met = metrics;
  const pop = population || met.population || 1;
  const pctile = (key, lowerBetter = false) => {
    const vals = allCounties
      .map((x) => x.metrics?.[key])
      .filter((v) => v != null && !isNaN(v));
    const val = met[key];
    if (val == null || !vals.length) return null;
    const below = vals.filter((v) => (lowerBetter ? v > val : v < val)).length;
    const equal = vals.filter((v) => v === val).length;
    return Math.round(((below + 0.5 * equal) / vals.length) * 100);
  };
  const fmtDollar = (v) =>
    v == null
      ? null
      : v >= 1e9
        ? `$${(v / 1e9).toFixed(1)}B`
        : v >= 1e6
          ? `$${(v / 1e6).toFixed(0)}M`
          : `$${Math.round(v).toLocaleString()}`;

  // Buyer affordability helpers
  const zhvi = met.zhvi_latest;
  const hhi = met.median_hhi;
  const stdDTI = _dti(zhvi, hhi, 0.03);
  const stdPool = _poolPct(zhvi, hhi, 0.03);
  const stdPmt = _mTotal(zhvi, 0.03);
  const dpReach = _dpReach(zhvi, 0.03, hhi, 3, 0.1);
  const dtiPct =
    stdDTI != null
      ? Math.round(Math.max(0, Math.min(100, ((55 - stdDTI) / 40) * 100)))
      : null;

  return [
    {
      pct: pctile("zhvi_latest", true),
      metric: "Home Value (ZHVI)",
      sub: "Zillow ZHVI · lower = stronger entry cost advantage",
      value: zhvi ? `$${Math.round(zhvi / 1000)}k` : null,
      interp:
        zhvi == null
          ? null
          : zhvi < 150000
            ? "Well below national avg — deep value basis, strong entry cost advantage."
            : zhvi < 250000
              ? "Below national avg — favorable entry cost for this thesis."
              : zhvi < 350000
                ? "Near national avg — standard cost environment."
                : "Above national avg — higher basis compresses relative upside.",
    },
    {
      pct: pctile("zhvi_growth_1yr"),
      metric: "1-Yr Appreciation",
      sub: "Zillow ZHVI YoY · tests post-hike demand durability",
      value:
        met.zhvi_growth_1yr != null
          ? `${met.zhvi_growth_1yr >= 0 ? "+" : ""}${(met.zhvi_growth_1yr * 100).toFixed(1)}%`
          : null,
      interp:
        met.zhvi_growth_1yr == null
          ? null
          : met.zhvi_growth_1yr > 0.1
            ? "Strong appreciation — durable demand confirmed post rate-hike cycle."
            : met.zhvi_growth_1yr > 0.04
              ? "Moderate appreciation — holding above national floor."
              : met.zhvi_growth_1yr > 0
                ? "Slow appreciation — demand present but limited momentum."
                : "Negative — market facing active demand headwind.",
    },
    {
      pct: pctile("unemployment_rate"),
      metric: "Unemployment Rate",
      sub: "Census ACS 2022 · civilian unemployment rate",
      value:
        met.unemployment_rate != null
          ? `${met.unemployment_rate.toFixed(1)}%`
          : null,
      interp:
        met.unemployment_rate == null
          ? null
          : met.unemployment_rate > 8
            ? "High unemployment — deep distress signal; large labor reserve for employer catalyst."
            : met.unemployment_rate > 5
              ? "Above-average — meaningful labor slack, supports activation thesis."
              : met.unemployment_rate > 3.5
                ? "Moderate unemployment — some slack present."
                : "Low unemployment — tight labor market; limited workforce availability.",
    },
    {
      pct: pctile("poverty_rate"),
      metric: "Poverty Rate",
      sub: "Census ACS 2022 · % population below poverty line",
      value:
        met.poverty_rate != null ? `${met.poverty_rate.toFixed(1)}%` : null,
      interp:
        met.poverty_rate == null
          ? null
          : met.poverty_rate > 20
            ? "High poverty — strong basis for below-market acquisition and community reinvestment."
            : met.poverty_rate > 14
              ? "Above-average — consistent with activation market profile."
              : met.poverty_rate > 8
                ? "Moderate — some distress present."
                : "Low poverty — limited distress signal.",
    },
    {
      pct: pctile("vacancy_rate"),
      metric: "Housing Vacancy Rate",
      sub: "Census ACS 2022 · % housing units vacant",
      value:
        met.vacancy_rate != null ? `${met.vacancy_rate.toFixed(1)}%` : null,
      interp:
        met.vacancy_rate == null
          ? null
          : met.vacancy_rate > 15
            ? "High — large pool of acquirable distressed stock."
            : met.vacancy_rate > 10
              ? "Above-average — meaningful supply of distressed units."
              : met.vacancy_rate > 6
                ? "Moderate — some acquisition opportunities present."
                : "Low — tight stock; limited distressed asset sourcing.",
    },
    {
      pct: pctile("pop_growth_pct"),
      metric: "Population Growth",
      sub: "Census ACS 2019–2022 CAGR · demand formation trend",
      value:
        met.pop_growth_pct != null
          ? `${met.pop_growth_pct >= 0 ? "+" : ""}${met.pop_growth_pct.toFixed(1)}%`
          : null,
      interp:
        met.pop_growth_pct == null
          ? null
          : met.pop_growth_pct > 3
            ? "Strong growth — demand wave building ahead of re-rating."
            : met.pop_growth_pct > 1
              ? "Moderate growth — demand trend positive."
              : met.pop_growth_pct > 0
                ? "Slow growth — limited demand momentum."
                : "Declining — contracting household base; requires stronger catalyst to offset.",
    },
    {
      pct: pctile("lfpr"),
      metric: "Labor Force Participation",
      sub: "Census ACS 2022 · % pop 16+ in labor force",
      value: met.lfpr != null ? `${met.lfpr.toFixed(1)}%` : null,
      interp:
        met.lfpr == null
          ? null
          : met.lfpr > 65
            ? "High participation — engaged workforce, strong employment culture."
            : met.lfpr > 58
              ? "Average participation — standard labor force engagement."
              : "Low participation — structural unemployment or discouraged workforce; signals deeper distress.",
    },
    {
      pct: pctile("fed_awards_per_capita"),
      metric: "Federal Investment (FY24)",
      sub: "USASpending.gov · total county awards",
      value: fmtDollar(
        met.fed_awards_per_capita != null
          ? met.fed_awards_per_capita * pop
          : null,
      ),
      interp:
        met.fed_awards_per_capita == null
          ? null
          : pctile("fed_awards_per_capita") >= 80
            ? "High federal investment — active public capital flow, strong catalyst signal."
            : pctile("fed_awards_per_capita") >= 60
              ? "Above-average federal presence — meaningful public sector engagement."
              : pctile("fed_awards_per_capita") >= 40
                ? "Moderate federal footprint — typical public sector activity."
                : "Below-average federal investment — limited public catalyst activity.",
    },
    {
      pct: met.oz_tract_flag ? 85 : 20,
      metric: "Opportunity Zone",
      sub: "HUD OZ tract designation · federal tax incentive infrastructure",
      value:
        met.oz_tract_flag != null
          ? met.oz_tract_flag
            ? "Designated"
            : "Not Designated"
          : null,
      interp:
        met.oz_tract_flag == null
          ? null
          : met.oz_tract_flag
            ? "OZ designation present — federal tax-advantaged investment infrastructure in place, reducing effective capital cost."
            : "No OZ designation — standard tax treatment applies; no federal tax incentive leverage.",
    },
    {
      pct: pctile("biz_apps_per_1k"),
      metric: "Business Formation Rate",
      sub: "Census BFS · high-propensity business applications per 1k pop",
      value:
        met.biz_apps_per_1k != null
          ? `${met.biz_apps_per_1k.toFixed(2)}/1k`
          : null,
      interp:
        met.biz_apps_per_1k == null
          ? null
          : met.biz_apps_per_1k > 3
            ? "High formation — entrepreneurial momentum; early recovery signal."
            : met.biz_apps_per_1k > 1.5
              ? "Above-average — meaningful new venture activity."
              : met.biz_apps_per_1k > 0.8
                ? "Moderate — standard start activity."
                : "Below-average — limited entrepreneurial activity.",
    },
    {
      pct: pctile("estab_growth_pct"),
      metric: "Establishment Growth",
      sub: "Census CBP YoY · % change in business establishments",
      value:
        met.estab_growth_pct != null
          ? `${met.estab_growth_pct >= 0 ? "+" : ""}${met.estab_growth_pct.toFixed(1)}%`
          : null,
      interp:
        met.estab_growth_pct == null
          ? null
          : met.estab_growth_pct > 5
            ? "Strong — business base expanding rapidly."
            : met.estab_growth_pct > 2
              ? "Above-average — steady expansion."
              : met.estab_growth_pct > 0
                ? "Modest — stable environment."
                : "Declining — warrants monitoring against activation thesis.",
    },
    {
      pct: pctile("broadband_pct"),
      metric: "Broadband Coverage",
      sub: "FCC BDC · % of addresses with broadband service",
      value:
        met.broadband_pct != null ? `${met.broadband_pct.toFixed(1)}%` : null,
      interp:
        met.broadband_pct == null
          ? null
          : met.broadband_pct > 90
            ? "Strong broadband — ready for remote workforce and employer tech requirements."
            : met.broadband_pct > 70
              ? "Adequate coverage — functional connectivity, some gaps."
              : met.broadband_pct > 50
                ? "Partial coverage — connectivity gaps may limit employer attraction."
                : "Limited broadband — significant infrastructure gap; headwind for knowledge-economy catalyst.",
    },
    {
      pct: pctile("fema_risk_score", true),
      metric: "Climate Risk Score",
      sub: "FEMA NRI · composite natural hazard risk (lower = safer)",
      value:
        met.fema_risk_score != null
          ? `${met.fema_risk_score.toFixed(0)}/100`
          : null,
      interp:
        met.fema_risk_score == null
          ? null
          : met.fema_risk_score < 20
            ? "Low risk — minimal hazard; strong long-term asset durability."
            : met.fema_risk_score < 40
              ? "Below-average risk — manageable hazard profile."
              : met.fema_risk_score < 60
                ? "Moderate risk — factor into underwriting."
                : met.fema_risk_score < 80
                  ? "Elevated risk — above-average insurance and resilience costs."
                  : "High climate risk — significant exposure; risk-adjusted underwriting required.",
    },
    {
      pct: pctile("oes_median_wage"),
      metric: "Median Annual Wage",
      sub: "BLS OES · MSA-level median annual wage across all occupations",
      value:
        met.oes_median_wage != null
          ? `$${Math.round(met.oes_median_wage).toLocaleString()}`
          : null,
      interp:
        met.oes_median_wage == null
          ? null
          : met.oes_median_wage > 60000
            ? "Above-average wages — strong labor income supports household formation."
            : met.oes_median_wage > 45000
              ? "Near-average wages — standard labor market income."
              : "Below-average wages — lower income; consistent with distressed entry cost thesis.",
    },
    ...(zhvi && hhi
      ? [
          {
            pct: dtiPct,
            metric: "Buyer Affordability (Standard)",
            sub: "3% down + PMI · DTI at 43% ceiling",
            value: stdDTI != null ? `${stdDTI.toFixed(1)}% DTI` : null,
            interp:
              dpReach != null
                ? `~${dpReach.toFixed(0)}% of households could save the 3% down in 3 yrs — barrier is cash flow, not savings. Standard financing requires $${stdPmt != null ? Math.round(stdPmt).toLocaleString() : "—"}/mo, qualifying ~${stdPool != null ? stdPool.toFixed(0) : "—"}% of households.`
                : `3% down + PMI requires $${stdPmt != null ? Math.round(stdPmt).toLocaleString() : "—"}/mo (${stdDTI != null ? stdDTI.toFixed(1) : "—"}% DTI), qualifying ~${stdPool != null ? stdPool.toFixed(0) : "—"}% of households.`,
          },
        ]
      : []),
  ].filter((sig) => sig.value != null);
}

// ─── Ch 03: Market Fundamentals ───────────────────────────────────────────────
function MarketFundamentalsPage({ county, thesis, supplementalSignals = [] }) {
  const name = county.name || county.county_name;

  // Engineered dims come pre-computed as an array with score on 0–1 scale.
  // All other theses map from a dims object with scores 0–100.
  const dimsRaw = county.dims || {};
  const isArrayDims = Array.isArray(dimsRaw);
  const dimsConfig = thesis === "formation" ? OPPORTUNITY_DIMS : NEOPOLI_DIMS;
  const dimsList = isArrayDims
    ? dimsRaw
    : dimsConfig.map((d) => ({
        id: d.id,
        label: d.label,
        score: dimsRaw[d.id] ?? 0,
        weight: d.weight,
      }));
  const dimsTitle =
    thesis === "formation"
      ? "Formation Dimensions"
      : thesis === "expansion"
        ? "Expansion Dimensions"
        : thesis === "engineered"
          ? "Engineered Dimensions"
          : "Activation Dimensions";

  // ── Summary computation ──
  const dimScores100 = dimsList.map((d) =>
    isArrayDims
      ? typeof d.score === "number"
        ? d.score * 100
        : 0
      : typeof d.score === "number"
        ? d.score
        : 0,
  );
  const avgDimScore =
    dimScores100.length > 0
      ? Math.round(
          dimScores100.reduce((a, b) => a + b, 0) / dimScores100.length,
        )
      : null;
  const topDim = dimsList[dimScores100.indexOf(Math.max(...dimScores100))];
  const bottomDim = dimsList[dimScores100.indexOf(Math.min(...dimScores100))];
  const tCount = supplementalSignals.filter((s) =>
    pctToSig(s.pct).label.includes("Tailwind"),
  ).length;
  const hCount = supplementalSignals.filter((s) =>
    pctToSig(s.pct).label.includes("Headwind"),
  ).length;
  const sortedByPct = [...supplementalSignals]
    .filter((s) => s.pct != null)
    .sort((a, b) => b.pct - a.pct);
  const topTailwind = sortedByPct[0];
  const topHeadwind = sortedByPct[sortedByPct.length - 1];

  const summaryLine1 =
    avgDimScore != null && topDim && bottomDim
      ? `${dimsTitle} average ${avgDimScore}/100 across ${dimsList.length} factors — ${topDim.label} leads at ${Math.round(isArrayDims ? topDim.score * 100 : topDim.score)} and ${bottomDim.label} trails at ${Math.round(isArrayDims ? bottomDim.score * 100 : bottomDim.score)}.`
      : null;
  const summaryLine2 =
    supplementalSignals.length > 0
      ? `Of ${supplementalSignals.length} supplemental signals, ${tCount} register as tailwinds and ${hCount} as headwinds${topTailwind && topHeadwind ? ` — ${topTailwind.metric} is the primary market advantage while ${topHeadwind.metric} presents the key risk factor` : ""}.`
      : null;

  const SignalRow = ({ sig, i }) => {
    const ss = pctToSig(sig.pct);
    return (
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingTop: 7,
          paddingBottom: 7,
          paddingLeft: 0,
          paddingRight: 0,
          borderBottomWidth: 1,
          borderBottomColor: P.border,
        }}
        wrap={false}
      >
        {/* Colored dot + label — no border, just tinted bg pill */}
        <View style={{ width: 86 }}>
          <View
            style={{
              backgroundColor: ss.bg,
              borderRadius: 3,
              paddingTop: 2,
              paddingBottom: 2,
              paddingLeft: 6,
              paddingRight: 6,
              alignSelf: "flex-start",
            }}
          >
            <Text
              style={{
                fontSize: 6.5,
                fontFamily: "Helvetica-Bold",
                color: ss.color,
              }}
            >
              {ss.label}
            </Text>
          </View>
        </View>
        {/* Metric name + sub */}
        <View style={{ flex: 2 }}>
          <Text
            style={{
              fontSize: 7.5,
              fontFamily: "Helvetica-Bold",
              color: P.ink,
            }}
          >
            {sig.metric}
          </Text>
          <Text style={{ fontSize: 6, color: P.muted, marginTop: 1 }}>
            {sig.sub}
          </Text>
        </View>
        {/* Percentile bar */}
        <View style={{ width: 52, paddingRight: 8 }}>
          {sig.pct != null && (
            <>
              <Text style={{ fontSize: 6.5, color: P.muted, marginBottom: 2 }}>
                {sig.pct}th
              </Text>
              <View
                style={{
                  height: 3,
                  backgroundColor: P.border,
                  borderRadius: 1.5,
                }}
              >
                <View
                  style={{
                    width: `${sig.pct}%`,
                    height: "100%",
                    backgroundColor: ss.color,
                    borderRadius: 1.5,
                  }}
                />
              </View>
            </>
          )}
        </View>
        {/* Value */}
        <Text
          style={{
            width: 44,
            fontSize: 8,
            fontFamily: "Helvetica-Bold",
            color: P.ink,
            textAlign: "right",
          }}
        >
          {sig.value}
        </Text>
        {/* Interpretation */}
        <Text
          style={{
            flex: 3,
            fontSize: 7,
            color: P.sub,
            lineHeight: 1.5,
            paddingLeft: 10,
          }}
        >
          {sig.interp}
        </Text>
      </View>
    );
  };

  return (
    <Page size="LETTER" style={s.page}>
      <PageHeader countyName={name} chapter="03 — Market Fundamentals" />
      <View style={s.body}>
        {/* ── Chapter summary ── */}
        {(summaryLine1 || summaryLine2) && (
          <View
            style={{
              backgroundColor: P.navy + "0D",
              borderLeftWidth: 3,
              borderLeftColor: P.navy,
              borderRadius: 3,
              paddingTop: 8,
              paddingBottom: 8,
              paddingLeft: 10,
              paddingRight: 10,
              marginBottom: 14,
            }}
          >
            {summaryLine1 && (
              <Text
                style={{
                  fontSize: 8,
                  fontFamily: "Helvetica-Bold",
                  color: P.ink,
                  marginBottom: summaryLine2 ? 4 : 0,
                }}
              >
                {summaryLine1}
              </Text>
            )}
            {summaryLine2 && (
              <Text style={{ fontSize: 8, color: P.sub, lineHeight: 1.5 }}>
                {summaryLine2}
              </Text>
            )}
          </View>
        )}

        {/* ── Dimensions grid — full width, 3 per row ── */}
        {dimsList.length > 0 && (
          <>
            <SecHeader
              title={dimsTitle}
              sub="weighted dimensions · scores 0–100"
            />
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 5,
                marginBottom: 14,
              }}
            >
              {dimsList.map((dim) => {
                // Engineered: score is 0–1 → multiply by 100 for display
                const score100 = isArrayDims
                  ? typeof dim.score === "number"
                    ? dim.score * 100
                    : 0
                  : typeof dim.score === "number"
                    ? dim.score
                    : 0;
                const barColor =
                  score100 >= 75
                    ? "#16a34a"
                    : score100 >= 50
                      ? P.navy
                      : score100 >= 25
                        ? P.amber
                        : P.red;
                // Engineered weights are 0–1 fractions; show as %
                const wtLabel = isArrayDims
                  ? `${Math.round((dim.weight || 0) * 100)}%`
                  : `wt ${dim.weight}`;
                return (
                  <View
                    key={dim.id}
                    style={{ width: "31.5%", marginBottom: 3 }}
                    wrap={false}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        marginBottom: 2,
                      }}
                    >
                      <Text
                        style={{ fontSize: 7, color: P.sub, flexShrink: 1 }}
                      >
                        {dim.label}
                      </Text>
                      <Text
                        style={{
                          fontSize: 7,
                          fontFamily: "Helvetica-Bold",
                          color: barColor,
                          marginLeft: 4,
                        }}
                      >
                        {Math.round(score100)}
                      </Text>
                    </View>
                    <View
                      style={{
                        height: 4,
                        backgroundColor: P.border,
                        borderRadius: 2,
                      }}
                    >
                      <View
                        style={{
                          width: `${Math.min(score100, 100)}%`,
                          height: "100%",
                          backgroundColor: barColor,
                          borderRadius: 2,
                        }}
                      />
                    </View>
                    <Text style={{ fontSize: 6, color: P.muted, marginTop: 2 }}>
                      {wtLabel}
                    </Text>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* ── Supplemental Signals ── */}
        {supplementalSignals.length > 0 && (
          <>
            <SecHeader
              title="Supplemental Signals"
              sub="benchmarked against activation county universe · signal = thesis impact"
            />
            {supplementalSignals.map((sig, i) => (
              <SignalRow key={sig.metric} sig={sig} i={i} />
            ))}
          </>
        )}
      </View>
      <Footer
        countyName={name}
        thesis={thesis}
        pageLabel="Market Fundamentals"
      />
    </Page>
  );
}

// ─── Ch 04: Neighboring Markets ──────────────────────────────────────────────
function RegionalContextPage({ county, thesis, neighborCounties }) {
  const cei = county.cei;
  const ceiColor = CEI_COLOR[cei?.label] || P.muted;

  // Regional intelligence derived from neighbor data
  const qualifyingNeighbors = (neighborCounties || []).filter((n) => n != null);
  let regionalIntel = null;
  if (qualifyingNeighbors.length > 0) {
    const subjectComposite = county.composite || 0;
    const clusterRank =
      qualifyingNeighbors.filter((n) => (n.composite || 0) > subjectComposite)
        .length + 1;
    const nScores = qualifyingNeighbors.map((n) =>
      Math.round(n.composite || 0),
    );
    const scoreMin = Math.min(...nScores);
    const scoreMax = Math.max(...nScores);
    const popVals = qualifyingNeighbors
      .map((n) => n.metrics?.pop_growth_pct)
      .filter((v) => v != null);
    const avgPop = popVals.length
      ? popVals.reduce((s, v) => s + v, 0) / popVals.length
      : null;
    const unempVals = qualifyingNeighbors
      .map((n) => n.metrics?.unemployment_rate)
      .filter((v) => v != null);
    const avgUnemp = unempVals.length
      ? unempVals.reduce((s, v) => s + v, 0) / unempVals.length
      : null;
    const zhviVals = qualifyingNeighbors
      .map((n) => n.metrics?.zhvi_latest)
      .filter((v) => v != null);
    const avgZhvi = zhviVals.length
      ? zhviVals.reduce((s, v) => s + v, 0) / zhviVals.length
      : null;
    const ceiCounts = {};
    qualifyingNeighbors.forEach((n) => {
      if (n.cei?.label)
        ceiCounts[n.cei.label] = (ceiCounts[n.cei.label] || 0) + 1;
    });
    const ceiEntries = Object.entries(ceiCounts).sort((a, b) => b[1] - a[1]);
    const dominantCEI = ceiEntries[0];
    const ceiUniform =
      dominantCEI && dominantCEI[1] === qualifyingNeighbors.length;
    const CEI_IMPLICATION = {
      "Mature Cluster":
        "confirming deep regional industrial maturity — demand durability is high, but site competition is elevated.",
      "Early Leader":
        "signaling early-formation cluster dynamics — first-mover pricing advantages remain available.",
      "Structural Isolation":
        "indicating the region lacks unified cluster identity — local diligence should be front-loaded.",
      "Regional Laggard":
        "suggesting the regional context is a headwind — identify a specific local catalyst before committing.",
      Neutral:
        "reflecting mixed regional dynamics — thesis validation hinges primarily on local fundamentals.",
    };
    const ceiImplication =
      CEI_IMPLICATION[dominantCEI?.[0]] ||
      "reflecting a mixed regional market context.";
    const countName = county.name || county.county_name || "This market";
    const rankStr =
      clusterRank === 1
        ? `${countName} leads its regional cluster (#1 of ${qualifyingNeighbors.length + 1} markets)`
        : `${countName} ranks #${clusterRank} of ${qualifyingNeighbors.length + 1} in its regional cluster`;
    const gapPart =
      cei?.gap != null
        ? `, ${Math.abs(cei.gap).toFixed(1)} points ${cei.gap >= 0 ? "above" : "below"} the neighbor average`
        : "";
    const ceiSentence = dominantCEI
      ? `${ceiUniform ? `All ${qualifyingNeighbors.length}` : `${dominantCEI[1]} of ${qualifyingNeighbors.length}`} contiguous markets classify as ${dominantCEI[0]} — ${ceiImplication}`
      : "";
    const narrative = `${rankStr}${gapPart}.${ceiSentence ? ` ${ceiSentence}` : ""}`;
    regionalIntel = {
      clusterRank,
      totalInCluster: qualifyingNeighbors.length + 1,
      scoreMin,
      scoreMax,
      avgPop,
      avgUnemp,
      avgZhvi,
      ceiEntries,
      narrative,
    };
  }

  const CEI_MEANING = {
    "Early Leader":
      "This market leads its contiguous neighbors. The cluster is forming but not yet saturated — creating a time-sensitive entry window before the regional pricing-in effect compresses basis.",
    "Mature Cluster":
      "This market is embedded in a strong regional cluster. Neighboring markets are also performing well, providing demand reinforcement and reducing single-market risk. Basis discipline is critical in this environment.",
    "Structural Isolation":
      "This market scores well but is surrounded by lower-scoring neighbors. The regional tailwind is absent — local validation of demand drivers is more important than in cluster markets. Front-load diligence.",
    "Regional Laggard":
      "Neighboring markets are outscoring this county. Evaluate whether this represents a contrarian opportunity with a specific catalyst, or whether regional dynamics are headwinds to the thesis.",
    Neutral:
      "This market sits within a mixed regional context. Neither a significant regional tailwind nor headwind is present. Thesis evaluation should focus primarily on local fundamentals.",
  };

  return (
    <Page size="LETTER" style={s.page}>
      <PageHeader
        countyName={county.name || county.county_name}
        chapter="04 — Neighboring Markets"
      />
      <View style={s.body}>
        <SecHeader
          title="Cluster Emergence Index"
          sub="Regional positioning and cluster dynamics"
        />

        {/* CEI card */}
        {cei ? (
          <View style={[s.ceiCard, { backgroundColor: ceiColor + "12" }]}>
            <View style={s.ceiTop}>
              <View>
                <Text style={[s.ceiLabel, { color: ceiColor }]}>
                  {cei.label}
                </Text>
                {CEI_THESIS_IMPLICATIONS[thesis]?.[cei.label]?.verdict && (
                  <Text
                    style={[
                      s.mLbl,
                      {
                        marginTop: 3,
                        color: ceiColor,
                        fontFamily: "Helvetica-Bold",
                      },
                    ]}
                  >
                    {CEI_THESIS_IMPLICATIONS[thesis][cei.label].verdict}
                  </Text>
                )}
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={[s.ceiScore, { color: ceiColor }]}>
                  {fmtScore(cei.score)}
                </Text>
                <Text style={s.ceiScoreSub}>CEI Score / 100</Text>
              </View>
            </View>
            <View style={s.ceiStats}>
              {cei.neighbor_avg != null && (
                <View style={s.ceiStatItem}>
                  <Text style={s.ceiStatLbl}>Regional Avg Score</Text>
                  <Text style={s.ceiStatVal}>
                    {fmtNum(cei.neighbor_avg, 1)}
                  </Text>
                </View>
              )}
              {cei.gap != null && (
                <View style={s.ceiStatItem}>
                  <Text style={s.ceiStatLbl}>Gap vs. Neighbors</Text>
                  <Text
                    style={[
                      s.ceiStatVal,
                      { color: cei.gap >= 0 ? P.emerald : P.red },
                    ]}
                  >
                    {cei.gap >= 0 ? "+" : ""}
                    {fmtNum(cei.gap, 1)}
                  </Text>
                </View>
              )}
              <View style={s.ceiStatItem}>
                <Text style={s.ceiStatLbl}>Qualifying Neighbors</Text>
                <Text style={s.ceiStatVal}>
                  {cei.density} / {cei.neighbor_count}
                </Text>
              </View>
              {county.composite != null && (
                <View style={s.ceiStatItem}>
                  <Text style={s.ceiStatLbl}>Adjusted Composite</Text>
                  <Text
                    style={[
                      s.ceiStatVal,
                      {
                        color: scoreColor(
                          Math.round(cei.adjusted_composite || 0),
                        ),
                      },
                    ]}
                  >
                    {fmtNum(cei.adjusted_composite, 1)}
                  </Text>
                </View>
              )}
            </View>
            {(CEI_THESIS_IMPLICATIONS[thesis]?.[cei.label]?.body ||
              CEI_MEANING[cei.label]) && (
              <Text style={s.ceiNote}>
                {CEI_THESIS_IMPLICATIONS[thesis]?.[cei.label]?.body ||
                  CEI_MEANING[cei.label]}
              </Text>
            )}
          </View>
        ) : (
          <View style={s.infoPanel}>
            <Text style={s.infoPanelText}>
              CEI data not available. Re-run the pipeline to compute cluster
              emergence for this market.
            </Text>
          </View>
        )}

        {/* Neighbor table */}
        {neighborCounties && neighborCounties.length > 0 && (
          <>
            <SecHeader
              title="Contiguous Market Overview"
              sub={`${neighborCounties.length} neighboring counties in scored universe · sorted by composite score`}
            />
            <View style={s.tWrap}>
              <View style={s.thead}>
                <Text style={[s.th, { flex: 2.2 }]}>County</Text>
                <Text style={[s.th, { flex: 0.8, textAlign: "right" }]}>
                  Score
                </Text>
                <Text style={[s.th, { flex: 0.9, textAlign: "right" }]}>
                  Pop Growth
                </Text>
                <Text style={[s.th, { flex: 0.9, textAlign: "right" }]}>
                  Unemp
                </Text>
                <Text style={[s.th, { flex: 1, textAlign: "right" }]}>
                  Home Value
                </Text>
                <Text style={[s.th, { flex: 1.3 }]}>CEI</Text>
              </View>
              {neighborCounties.slice(0, 10).map((n, i) => {
                const nScore = Math.round(n.composite || 0);
                const nColor = scoreColor(nScore);
                const popGrowth = n.metrics?.pop_growth_pct;
                const unemp = n.metrics?.unemployment_rate;
                const zhvi = n.metrics?.zhvi_latest;
                return (
                  <View
                    key={n.fips || i}
                    style={i % 2 === 0 ? s.tr : s.trAlt}
                    wrap={false}
                  >
                    <Text style={[s.tdB, { flex: 2.2 }]}>
                      {n.name || n.county_name || n.fips}
                    </Text>
                    <Text
                      style={[
                        s.td,
                        {
                          flex: 0.8,
                          textAlign: "right",
                          color: nColor,
                          fontFamily: "Helvetica-Bold",
                        },
                      ]}
                    >
                      {nScore}
                    </Text>
                    <Text
                      style={[
                        s.td,
                        {
                          flex: 0.9,
                          textAlign: "right",
                          color:
                            popGrowth != null
                              ? popGrowth >= 1
                                ? P.emerald
                                : popGrowth >= 0
                                  ? P.navy
                                  : P.red
                              : P.muted,
                        },
                      ]}
                    >
                      {popGrowth != null
                        ? `${popGrowth >= 0 ? "+" : ""}${popGrowth.toFixed(1)}%`
                        : "—"}
                    </Text>
                    <Text style={[s.td, { flex: 0.9, textAlign: "right" }]}>
                      {unemp != null ? `${unemp.toFixed(1)}%` : "—"}
                    </Text>
                    <Text style={[s.td, { flex: 1, textAlign: "right" }]}>
                      {zhvi != null ? `$${Math.round(zhvi / 1000)}k` : "—"}
                    </Text>
                    <Text
                      style={[
                        s.td,
                        {
                          flex: 1.3,
                          color: CEI_COLOR[n.cei?.label] || P.muted,
                        },
                      ]}
                    >
                      {n.cei?.label || "—"}
                    </Text>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* Regional Intelligence */}
        {regionalIntel && (
          <>
            <SecHeader
              title="Regional Intelligence"
              sub="Synthesized from contiguous market data"
            />
            {/* Stats row */}
            <View style={[s.ceiStats, { flexWrap: "wrap", marginBottom: 10 }]}>
              <View style={s.ceiStatItem}>
                <Text style={s.ceiStatLbl}>Cluster Rank</Text>
                <Text
                  style={[
                    s.ceiStatVal,
                    {
                      color:
                        regionalIntel.clusterRank === 1
                          ? P.emerald
                          : scoreColor(
                              Math.round(
                                100 -
                                  ((regionalIntel.clusterRank - 1) /
                                    (regionalIntel.totalInCluster - 1)) *
                                    100,
                              ),
                            ),
                    },
                  ]}
                >
                  #{regionalIntel.clusterRank} of {regionalIntel.totalInCluster}
                </Text>
              </View>
              <View style={s.ceiStatItem}>
                <Text style={s.ceiStatLbl}>Neighbor Score Range</Text>
                <Text style={s.ceiStatVal}>
                  {regionalIntel.scoreMin}–{regionalIntel.scoreMax}
                </Text>
              </View>
              {regionalIntel.avgPop != null && (
                <View style={s.ceiStatItem}>
                  <Text style={s.ceiStatLbl}>Avg Pop Growth</Text>
                  <Text
                    style={[
                      s.ceiStatVal,
                      {
                        color:
                          regionalIntel.avgPop >= 1
                            ? P.emerald
                            : regionalIntel.avgPop >= 0
                              ? P.navy
                              : P.red,
                      },
                    ]}
                  >
                    {regionalIntel.avgPop >= 0 ? "+" : ""}
                    {regionalIntel.avgPop.toFixed(1)}%
                  </Text>
                </View>
              )}
              {regionalIntel.avgUnemp != null && (
                <View style={s.ceiStatItem}>
                  <Text style={s.ceiStatLbl}>Avg Unemployment</Text>
                  <Text style={s.ceiStatVal}>
                    {regionalIntel.avgUnemp.toFixed(1)}%
                  </Text>
                </View>
              )}
              {regionalIntel.avgZhvi != null && (
                <View style={s.ceiStatItem}>
                  <Text style={s.ceiStatLbl}>Avg Home Value</Text>
                  <Text style={s.ceiStatVal}>
                    ${Math.round(regionalIntel.avgZhvi / 1000)}k
                  </Text>
                </View>
              )}
            </View>
            {/* CEI distribution */}
            {regionalIntel.ceiEntries.length > 0 && (
              <View
                style={{
                  flexDirection: "row",
                  gap: 10,
                  marginBottom: 10,
                  alignItems: "center",
                  flexWrap: "wrap",
                }}
              >
                <Text style={[s.ceiStatLbl, { marginBottom: 0 }]}>
                  CEI Distribution:
                </Text>
                {regionalIntel.ceiEntries.map(([label, count]) => (
                  <View
                    key={label}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <View
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: CEI_COLOR[label] || P.muted,
                      }}
                    />
                    <Text
                      style={{
                        fontSize: 7,
                        color: CEI_COLOR[label] || P.muted,
                        fontFamily: "Helvetica-Bold",
                      }}
                    >
                      {count}× {label}
                    </Text>
                  </View>
                ))}
              </View>
            )}
            {/* Narrative */}
            <Text style={s.ceiNote}>{regionalIntel.narrative}</Text>
          </>
        )}
      </View>
      <Footer
        countyName={county.name || county.county_name}
        thesis={thesis}
        pageLabel="Neighboring Markets"
      />
    </Page>
  );
}

// ─── Ch 05: Neighboring Markets ───────────────────────────────────────────────
function NeighboringMarketsPage({ county, thesis, neighborCounties }) {
  // CEI already identified these as scored neighbors — show all of them
  const qualifying = (neighborCounties || []).filter((n) => n != null);

  if (!qualifying.length) {
    return (
      <Page size="LETTER" style={s.page}>
        <PageHeader
          countyName={county.name || county.county_name}
          chapter="05 — Neighboring Markets"
        />
        <View style={s.body}>
          <View style={s.infoPanel}>
            <Text style={s.infoPanelTitle}>
              No qualifying neighboring markets
            </Text>
            <Text style={s.infoPanelText}>
              No contiguous counties were found in the scored universe for this
              market. The CEI context on page 4 provides regional cluster
              analysis.
            </Text>
          </View>
        </View>
        <Footer
          countyName={county.name || county.county_name}
          thesis={thesis}
          pageLabel="Neighboring Markets"
        />
      </Page>
    );
  }

  const sorted = [...qualifying].sort(
    (a, b) => (b.composite || 0) - (a.composite || 0),
  );

  return (
    <Page size="LETTER" style={s.page}>
      <PageHeader
        countyName={county.name || county.county_name}
        chapter="05 — Neighboring Markets"
      />
      <View style={s.body}>
        <SecHeader
          title="Qualifying Neighboring Markets"
          sub={`${sorted.length} contiguous counties in the scored universe · sorted by composite score`}
        />
        {sorted.map((n, i) => {
          const nScore = Math.round((n.composite || 0) * 100);
          const nColor = TIER_COLOR[n.tier] || P.muted;
          const nCei = n.cei;
          const nm = n.metrics || {};
          return (
            <View key={n.fips || i} style={s.neighborCard}>
              <View
                style={[
                  s.neighborHead,
                  { borderLeftWidth: 3, borderLeftColor: nColor },
                ]}
              >
                <View>
                  <Text style={s.neighborName}>
                    {n.name || n.county_name || n.fips}
                  </Text>
                  <Text style={s.neighborState}>
                    {n.state_name || n.state || ""} ·{" "}
                    {TIER_LABEL[n.tier] || "—"}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={[s.ceiScore, { fontSize: 22, color: P.white }]}>
                    {nScore}
                  </Text>
                  <Text
                    style={[s.ceiScoreSub, { color: "rgba(255,255,255,0.45)" }]}
                  >
                    {THESIS_LABEL[thesis]} score
                  </Text>
                </View>
              </View>
              <View style={s.neighborBody}>
                <View style={s.neighborStats}>
                  {nm.median_household_income != null && (
                    <View style={s.neighborStat}>
                      <Text style={s.neighborStatLbl}>Median HHI</Text>
                      <Text style={s.neighborStatVal}>
                        ${fmtNum(nm.median_household_income / 1000, 0)}k
                      </Text>
                    </View>
                  )}
                  {nm.unemployment_rate != null && (
                    <View style={s.neighborStat}>
                      <Text style={s.neighborStatLbl}>Unemployment</Text>
                      <Text style={s.neighborStatVal}>
                        {fmtNum(nm.unemployment_rate, 1)}%
                      </Text>
                    </View>
                  )}
                  {nm.pop_growth_pct != null && (
                    <View style={s.neighborStat}>
                      <Text style={s.neighborStatLbl}>Pop Growth</Text>
                      <Text
                        style={[
                          s.neighborStatVal,
                          { color: nm.pop_growth_pct > 0 ? P.emerald : P.red },
                        ]}
                      >
                        {fmtPct(nm.pop_growth_pct)}
                      </Text>
                    </View>
                  )}
                  {nm.home_value_median != null && (
                    <View style={s.neighborStat}>
                      <Text style={s.neighborStatLbl}>Median Home Value</Text>
                      <Text style={s.neighborStatVal}>
                        ${fmtNum(nm.home_value_median / 1000, 0)}k
                      </Text>
                    </View>
                  )}
                  {nCei && (
                    <View style={s.neighborStat}>
                      <Text style={s.neighborStatLbl}>CEI</Text>
                      <Text
                        style={[
                          s.neighborStatVal,
                          {
                            color: CEI_COLOR[nCei.label] || P.muted,
                            fontSize: 10,
                          },
                        ]}
                      >
                        {nCei.label}
                      </Text>
                    </View>
                  )}
                </View>
                <Text style={s.neighborNote}>
                  Thesis relevance:{" "}
                  {n.tier === "lead_market"
                    ? "Lead market — high-confidence confirmation of regional thesis."
                    : n.tier === "priority_market"
                      ? "Priority market — strong regional signal, supports cluster thesis."
                      : "Watchlist — moderate regional signal, monitor for upgrade."}
                  {nCei
                    ? ` CEI position (${nCei.label}) ${nCei.gap != null && nCei.gap >= 5 ? "leads the sub-cluster" : nCei.gap != null && nCei.gap <= -5 ? "lags the sub-cluster" : "is broadly in line with the cluster"}.`
                    : ""}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
      <Footer
        countyName={county.name || county.county_name}
        thesis={thesis}
        pageLabel="Neighboring Markets"
      />
    </Page>
  );
}

// ─── Ch 06: Action Plan ───────────────────────────────────────────────────────
function ActionPlanPage({ county, thesis, defaults, actionPlanData }) {
  const ap = actionPlanData || {};
  const phases = [
    {
      label: "Immediate",
      key: "immediate",
      color: P.emerald,
      items: ap.immediate || defaults.immediate,
    },
    {
      label: "30-Day",
      key: "day30",
      color: "#AB002D",
      items: ap.day30 || defaults.day30,
    },
    {
      label: "60-Day",
      key: "day60",
      color: "#0A2240",
      items: ap.day60 || defaults.day60,
    },
    {
      label: "90-Day",
      key: "day90",
      color: "#778FAD",
      items: ap.day90 || defaults.day90,
    },
  ];

  return (
    <Page size="LETTER" style={s.page}>
      <PageHeader
        countyName={county.name || county.county_name}
        chapter="06 — Action Plan"
      />
      <View style={s.body}>
        <SecHeader
          title="Sequenced Action Plan"
          sub={`${THESIS_LABEL[thesis]} thesis · Immediate through 90-day priorities`}
        />
        <View style={s.cols}>
          <View style={s.col}>
            {phases.slice(0, 2).map((phase) => (
              <View key={phase.key}>
                <View style={[s.actionPhase, { backgroundColor: phase.color }]}>
                  <Text style={s.actionPhase}>{phase.label}</Text>
                </View>
                {(phase.items || []).map((item, i) => (
                  <View key={i} style={s.actionRow}>
                    <View
                      style={[s.actionNum, { backgroundColor: phase.color }]}
                    >
                      <Text style={s.actionNumT}>{i + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.actionTitle}>{item.action}</Text>
                      <Text style={s.actionDetail}>{item.detail}</Text>
                      {item.owner && (
                        <Text style={s.actionOwner}>Owner: {item.owner}</Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            ))}
          </View>
          <View style={s.col}>
            {phases.slice(2).map((phase) => (
              <View key={phase.key}>
                <View style={[s.actionPhase, { backgroundColor: phase.color }]}>
                  <Text style={s.actionPhase}>{phase.label}</Text>
                </View>
                {(phase.items || []).map((item, i) => (
                  <View key={i} style={s.actionRow}>
                    <View
                      style={[s.actionNum, { backgroundColor: phase.color }]}
                    >
                      <Text style={s.actionNumT}>{i + 1}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.actionTitle}>{item.action}</Text>
                      <Text style={s.actionDetail}>{item.detail}</Text>
                      {item.owner && (
                        <Text style={s.actionOwner}>Owner: {item.owner}</Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            ))}
          </View>
        </View>
      </View>
      <Footer
        countyName={county.name || county.county_name}
        thesis={thesis}
        pageLabel="Action Plan"
      />
    </Page>
  );
}

// ─── Ch 07: Diligence Checklist ──────────────────────────────────────────────
function DiligenceChecklistPage({ county, thesis, defaults, actionPlanData }) {
  const items = actionPlanData?.diligence || defaults.diligence || [];
  const priorityStyle = {
    HIGH: { bg: "#fef2f2", text: P.red },
    MED: { bg: "#fffbeb", text: P.amber },
    LOW: { bg: "#f0fdf4", text: P.emeraldDim },
  };

  return (
    <Page size="LETTER" style={s.page}>
      <PageHeader
        countyName={county.name || county.county_name}
        chapter="07 — Diligence Checklist"
      />
      <View style={s.body}>
        <SecHeader
          title="Diligence Workstreams"
          sub={`${THESIS_LABEL[thesis]} thesis · Print-ready checklist`}
        />
        <View style={s.cols}>
          {[
            items.slice(0, Math.ceil(items.length / 2)),
            items.slice(Math.ceil(items.length / 2)),
          ].map((col, ci) => (
            <View key={ci} style={s.col}>
              {col.map((ws, wi) => {
                const ps = priorityStyle[ws.priority] || priorityStyle.MED;
                return (
                  <View key={wi} style={s.dlSection}>
                    <View style={s.dlHeader}>
                      <Text style={s.dlHeaderT}>{ws.workstream}</Text>
                      <Text style={[s.dlPriorityT, { color: ps.text }]}>
                        {ws.priority}
                      </Text>
                    </View>
                    {(ws.items || []).map((item, ii) => (
                      <View key={ii} style={s.dlItem}>
                        <View style={s.dlCheckbox} />
                        <Text style={s.dlItemT}>{item}</Text>
                        <View style={s.dlStatus} />
                      </View>
                    ))}
                  </View>
                );
              })}
            </View>
          ))}
        </View>
      </View>
      <Footer
        countyName={county.name || county.county_name}
        thesis={thesis}
        pageLabel="Diligence Checklist"
      />
    </Page>
  );
}

// ─── Ch 05: Thesis Risk Factors ───────────────────────────────────────────────
function RiskRegisterPage({ county, thesis, defaults, actionPlanData }) {
  const risks = actionPlanData?.risks || defaults.risks || [];

  return (
    <Page size="LETTER" style={s.page}>
      <PageHeader
        countyName={county.name || county.county_name}
        chapter="05 — Thesis Risk Factors"
      />
      <View style={s.body}>
        <SecHeader
          title="Thesis Risk Factors"
          sub={`${THESIS_LABEL[thesis]} thesis · Likelihood, impact, and mitigation`}
        />
        <View style={s.tWrap}>
          <View style={s.thead}>
            <Text style={[s.th, { flex: 2 }]}>Risk Factor</Text>
            <Text style={[s.th, { flex: 0.7, textAlign: "center" }]}>
              Likelihood
            </Text>
            <Text style={[s.th, { flex: 0.7, textAlign: "center" }]}>
              Impact
            </Text>
            <Text style={[s.th, { flex: 3 }]}>Mitigation</Text>
          </View>
          {risks.map((risk, i) => (
            <View key={i} style={i % 2 === 0 ? s.tr : s.trAlt}>
              <Text style={[s.tdB, { flex: 2 }]}>{risk.risk}</Text>
              <View
                style={[
                  {
                    flex: 0.7,
                    alignItems: "center",
                    justifyContent: "center",
                    paddingVertical: 5,
                  },
                ]}
              >
                <RiskBadge level={risk.likelihood} />
              </View>
              <View
                style={[
                  {
                    flex: 0.7,
                    alignItems: "center",
                    justifyContent: "center",
                    paddingVertical: 5,
                  },
                ]}
              >
                <RiskBadge level={risk.impact} />
              </View>
              <Text style={[s.td, { flex: 3 }]}>{risk.mitigation}</Text>
            </View>
          ))}
        </View>

        {/* Risk matrix legend */}
        <View style={[s.cols, { marginTop: 8 }]}>
          <View style={[s.infoPanel, { flex: 1 }]}>
            <Text style={s.infoPanelTitle}>Risk Matrix Legend</Text>
            <View style={{ flexDirection: "row", gap: 16 }}>
              {[
                ["H", "High — Requires immediate mitigation plan"],
                ["M", "Medium — Monitor and mitigate proactively"],
                ["L", "Low — Document and review quarterly"],
              ].map(([level, desc]) => (
                <View
                  key={level}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 5,
                    flex: 1,
                  }}
                >
                  <RiskBadge level={level} />
                  <Text
                    style={{
                      fontSize: 7,
                      color: P.sub,
                      flex: 1,
                      lineHeight: 1.4,
                    }}
                  >
                    {desc}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>
      <Footer
        countyName={county.name || county.county_name}
        thesis={thesis}
        pageLabel="Thesis Risk Factors"
      />
    </Page>
  );
}

// ─── Ch 09: Employer / Stakeholder Brief ──────────────────────────────────────
function EmployerBriefPage({ county, thesis, defaults, actionPlanData }) {
  const brief = actionPlanData?.employer_brief || defaults.employer_brief;
  const m = county.metrics || {};

  const homeVal = m.zhvi_latest || m.home_value_median;
  const hhi = m.median_household_income || m.median_hhi;
  const housingRatio = homeVal && hhi ? homeVal / hhi : null;

  const readinessSignals = [
    m.unemployment_rate != null && {
      title: "Labor Availability",
      label:
        m.unemployment_rate >= 5
          ? "High Availability"
          : m.unemployment_rate >= 3
            ? "Moderate"
            : "Tight Market",
      sub: `${m.unemployment_rate.toFixed(1)}% unemployment`,
      color:
        m.unemployment_rate >= 5
          ? P.navy
          : m.unemployment_rate >= 3
            ? P.amber
            : P.red,
    },
    m.pop_growth_pct != null && {
      title: "Market Trajectory",
      label:
        m.pop_growth_pct >= 2
          ? "Strong Growth"
          : m.pop_growth_pct >= 0
            ? "Stable"
            : "Declining",
      sub: `${m.pop_growth_pct >= 0 ? "+" : ""}${m.pop_growth_pct.toFixed(1)}%/yr`,
      color:
        m.pop_growth_pct >= 2
          ? P.navy
          : m.pop_growth_pct >= 0
            ? P.navy
            : P.red,
    },
    housingRatio != null && {
      title: "Housing Affordability",
      label:
        housingRatio < 4
          ? "Affordable"
          : housingRatio < 6
            ? "Moderate Cost"
            : "High Cost",
      sub: homeVal ? `$${Math.round(homeVal / 1000)}k median home` : "",
      color: housingRatio < 4 ? P.navy : housingRatio < 6 ? P.amber : P.red,
    },
    m.broadband_pct != null && {
      title: "Connectivity",
      label:
        m.broadband_pct >= 90
          ? "Excellent"
          : m.broadband_pct >= 70
            ? "Good"
            : "Limited",
      sub: `${m.broadband_pct.toFixed(0)}% broadband coverage`,
      color:
        m.broadband_pct >= 90
          ? P.navy
          : m.broadband_pct >= 70
            ? P.amber
            : P.red,
    },
  ].filter(Boolean);

  const pop = county.population || m.population;
  const workerMetrics = [
    ["Population", pop ? fmtNum(pop) : null],
    ["Labor Force", m.labor_force ? fmtNum(m.labor_force) : null],
    [
      "Unemployment Rate",
      m.unemployment_rate != null ? `${m.unemployment_rate.toFixed(1)}%` : null,
    ],
    ["Median Household Income", hhi ? `$${fmtNum(hhi)}` : null],
    [
      "Poverty Rate",
      m.poverty_rate != null ? `${m.poverty_rate.toFixed(1)}%` : null,
    ],
  ].filter(([, v]) => v != null);

  const marketMetrics = [
    [
      "Pop Growth (Annual)",
      m.pop_growth_pct != null
        ? `${m.pop_growth_pct >= 0 ? "+" : ""}${m.pop_growth_pct.toFixed(1)}%`
        : null,
    ],
    ["Median Home Value", homeVal ? `$${Math.round(homeVal / 1000)}k` : null],
    [
      "Home Value Growth",
      m.zhvi_growth_1yr != null
        ? `${m.zhvi_growth_1yr >= 0 ? "+" : ""}${(m.zhvi_growth_1yr * 100).toFixed(1)}% 1-yr`
        : null,
    ],
    [
      "Broadband Coverage",
      m.broadband_pct != null ? `${m.broadband_pct.toFixed(0)}%` : null,
    ],
    [
      "OZ Eligible",
      m.oz_eligible != null
        ? m.oz_eligible
          ? "Yes — Capital gains eligible"
          : "No"
        : null,
    ],
  ].filter(([, v]) => v != null);

  return (
    <Page size="LETTER" style={s.page}>
      <PageHeader
        countyName={county.name || county.county_name}
        chapter="09 — Employer / Stakeholder Brief"
      />
      <View style={s.body}>
        <SecHeader
          title={brief.headline || "Employer & Stakeholder Brief"}
          sub={`${county.name || county.county_name} · ${THESIS_LABEL[thesis]} Market Profile`}
        />

        {/* Stats bar */}
        <View style={[s.bigStatRow, { marginBottom: readinessSignals.length > 0 ? 10 : 16 }]}>
          {m.population && (
            <View style={s.bigStat}>
              <Text style={s.bigStatV}>{fmtNum(m.population)}</Text>
              <Text style={s.bigStatLbl}>County Population</Text>
            </View>
          )}
          {m.labor_force && (
            <View style={s.bigStat}>
              <Text style={s.bigStatV}>{fmtNum(m.labor_force)}</Text>
              <Text style={s.bigStatLbl}>Labor Force</Text>
            </View>
          )}
          {m.median_household_income && (
            <View style={s.bigStat}>
              <Text style={s.bigStatV}>
                ${fmtNum(m.median_household_income / 1000, 0)}k
              </Text>
              <Text style={s.bigStatLbl}>Median HHI</Text>
            </View>
          )}
          {m.unemployment_rate != null && (
            <View
              style={[
                s.bigStat,
                {
                  borderTopColor: m.unemployment_rate > 5 ? P.emerald : P.navy,
                },
              ]}
            >
              <Text style={s.bigStatV}>{fmtNum(m.unemployment_rate, 1)}%</Text>
              <Text style={s.bigStatLbl}>Unemployment Rate</Text>
            </View>
          )}
        </View>

        {/* Readiness signal cards */}
        {readinessSignals.length > 0 && (
          <View style={{ flexDirection: "row", gap: 8, marginBottom: 16 }}>
            {readinessSignals.map((sig, i) => (
              <View
                key={i}
                style={{
                  flex: 1,
                  borderTopWidth: 2,
                  borderTopColor: sig.color,
                  paddingTop: 6,
                  paddingBottom: 7,
                  paddingHorizontal: 8,
                  backgroundColor: P.light,
                }}
              >
                <Text style={s.ceiStatLbl}>{sig.title}</Text>
                <Text
                  style={{
                    fontSize: 8.5,
                    fontFamily: "Helvetica-Bold",
                    color: sig.color,
                    lineHeight: 1.2,
                    marginBottom: 2,
                  }}
                >
                  {sig.label}
                </Text>
                <Text style={{ fontSize: 6.5, color: P.sub }}>{sig.sub}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={s.cols}>
          <View style={s.col}>
            {brief.workforce && (
              <View style={s.empSection}>
                <Text style={s.empTitle}>Workforce Profile</Text>
                <Text style={s.empText}>{brief.workforce}</Text>
              </View>
            )}
            {brief.incentives && (
              <View style={s.empSection}>
                <Text style={s.empTitle}>Incentives & Programs</Text>
                <Text style={s.empText}>{brief.incentives}</Text>
              </View>
            )}
          </View>
          <View style={s.col}>
            {brief.infrastructure && (
              <View style={s.empSection}>
                <Text style={s.empTitle}>Infrastructure Readiness</Text>
                <Text style={s.empText}>{brief.infrastructure}</Text>
              </View>
            )}

            {/* AP workforce housing note */}
            <View style={s.empSection}>
              <Text style={s.empTitle}>
                American Pledge Workforce Housing
              </Text>
              <Text style={s.empText}>
                The American Pledge program provides employer-adjacent workforce
                housing solutions by expanding the qualified buyer pool for
                incoming employees. AP eliminates the down payment savings
                barrier — enabling employees to own homes in the market from day
                one, reducing relocation friction and improving retention.
                {m.home_value_median
                  ? ` At the local median home value of $${fmtNum(m.home_value_median)}, the AP contribution enables access for households that would otherwise require ${Math.round((m.home_value_median * 0.2) / ((m.median_household_income || 60000) * 0.1))} years of saving.`
                  : ""}
              </Text>
            </View>

            {/* OZ note if applicable */}
            {m.oz_eligible && (
              <View style={[s.empSection, { marginTop: 8 }]}>
                <Text style={s.empTitle}>Opportunity Zone Designation</Text>
                <Text style={s.empText}>
                  This county contains qualified Opportunity Zone tracts.
                  Federal OZ designation provides capital gains tax deferral and
                  potential exclusion for investments held 10+ years, creating a
                  compelling incentive for long-term employer anchor investment.
                </Text>
              </View>
            )}
          </View>
        </View>
        {/* Key Employer Metrics reference table */}
        {(workerMetrics.length > 0 || marketMetrics.length > 0) && (
          <>
            <SecHeader
              title="Key Employer Metrics"
              sub="County-level reference data for site selection diligence"
            />
            <View style={{ flexDirection: "row", gap: 20 }}>
              {workerMetrics.length > 0 && (
                <View style={{ flex: 1 }}>
                  <Text style={[s.ceiStatLbl, { marginBottom: 5 }]}>
                    Workforce
                  </Text>
                  {workerMetrics.map(([label, val], i) => (
                    <View
                      key={i}
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        paddingVertical: 4,
                        borderBottomWidth: 0.5,
                        borderBottomColor: P.border,
                      }}
                    >
                      <Text style={{ fontSize: 7, color: P.sub }}>{label}</Text>
                      <Text
                        style={{
                          fontSize: 7.5,
                          fontFamily: "Helvetica-Bold",
                          color: P.ink,
                        }}
                      >
                        {val}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
              {marketMetrics.length > 0 && (
                <View style={{ flex: 1 }}>
                  <Text style={[s.ceiStatLbl, { marginBottom: 5 }]}>
                    Market & Infrastructure
                  </Text>
                  {marketMetrics.map(([label, val], i) => (
                    <View
                      key={i}
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        paddingVertical: 4,
                        borderBottomWidth: 0.5,
                        borderBottomColor: P.border,
                      }}
                    >
                      <Text style={{ fontSize: 7, color: P.sub }}>{label}</Text>
                      <Text
                        style={{
                          fontSize: 7.5,
                          fontFamily: "Helvetica-Bold",
                          color: P.ink,
                        }}
                      >
                        {val}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </>
        )}
      </View>
      <Footer
        countyName={county.name || county.county_name}
        thesis={thesis}
        pageLabel="Employer / Stakeholder Brief"
      />
    </Page>
  );
}

// ─── Chapter: Land Opportunities ─────────────────────────────────────────────
const THESIS_LAND_CONTEXT = {
  activation:
    "Candidate parcels for adaptive reuse, mixed-use, or workforce housing development aligned with the activation catalyst thesis. Smaller tracts (5–25 acres) allow phased entry at distressed basis.",
  expansion:
    "Greenfield sites within the county suitable for master-planned community development. Target parcels of 25–200+ acres at or near agricultural pricing, ahead of infrastructure and entitlement.",
  formation:
    "Raw land candidates for community formation plays. Prioritize parcels at the fringe of population growth corridors where in-migration demand exceeds current supply. 25–150 acre sites preferred.",
  engineered:
    "Large-acreage industrial and agricultural land candidates for employer site acquisition ahead of public announcement. Minimum 50 acres; prioritize proximity to highway access, utility corridors, and available workforce.",
};

function LandOpportunitiesPage({ county, thesis, listings }) {
  const name = county.name || county.county_name || "County";
  const state = county.state_abbr || county.state || "";
  const minAcres = THESIS_MIN_ACRES[thesis] || 25;
  const hasData = listings && listings.length > 0;

  const COL_WIDTHS = [148, 42, 62, 52, 46, 34, 82]; // address, acres, price, $/ac, vs.median, DOM, listed by

  // ── Batch insights ─────────────────────────────────────────────────────────
  const m = county.metrics || county;
  const validPpa = listings.filter((p) => p.pricePerAc > 0).map((p) => p.pricePerAc);
  const sortedPpa = [...validPpa].sort((a, b) => a - b);
  const medianPpa = sortedPpa.length > 0 ? sortedPpa[Math.floor(sortedPpa.length / 2)] : null;
  const validDom = listings.filter((p) => p.dom != null).map((p) => p.dom);
  const avgDom = validDom.length > 0 ? Math.round(validDom.reduce((a, b) => a + b, 0) / validDom.length) : null;
  const hhi = m.median_household_income || m.median_hhi;
  const sortedByPrice = [...listings].sort((a, b) => a.price - b.price);
  const medianPrice = sortedByPrice.length > 0 ? sortedByPrice[Math.floor(sortedByPrice.length / 2)]?.price : null;
  const hhiMultiple = medianPrice && hhi ? Math.round(medianPrice / hhi) : null;
  const zhviGrowth = m.zhvi_growth_1yr;
  const priceCutCount = listings.filter((p) => p.priceReduced).length;

  return (
    <Page size="LETTER" style={s.page}>
      <View style={s.body}>
        <View style={s.sec}>
          <View style={s.secAccent} />
          <Text style={s.secT}>
            Land Opportunities — {name}, {state}
          </Text>
          <Text style={s.secSub}>
            Active listings · {minAcres}+ acre minimum · Rentcast MLS data ·
            sorted by acreage
          </Text>
        </View>

        {hasData ? (
          <>
            {/* Insights strip */}
            <View
              style={{
                flexDirection: "row",
                backgroundColor: P.light,
                borderWidth: 0.5,
                borderColor: P.border,
                borderRadius: 3,
                paddingVertical: 8,
                paddingHorizontal: 10,
                marginBottom: 10,
                gap: 0,
              }}
            >
              {[
                medianPpa != null && {
                  label: "Median $/Acre",
                  value: `$${fmtNum(medianPpa)}`,
                  sub: "across this batch",
                },
                avgDom != null && {
                  label: "Avg. Days Listed",
                  value: `${avgDom}d`,
                  sub: priceCutCount > 0 ? `${priceCutCount} w/ price cuts` : "no price cuts",
                },
                zhviGrowth != null && {
                  label: "Residential Appreciation",
                  value: `${zhviGrowth >= 0 ? "+" : ""}${(zhviGrowth * 100).toFixed(1)}%/yr`,
                  sub: "ZHVI 1-yr · land lags",
                },
                hhiMultiple != null && {
                  label: "HHI Multiple",
                  value: `${hhiMultiple}×`,
                  sub: "median ask / local income",
                },
              ]
                .filter(Boolean)
                .map((stat, i, arr) => (
                  <View
                    key={stat.label}
                    style={{
                      flex: 1,
                      paddingHorizontal: 8,
                      borderLeftWidth: i > 0 ? 0.5 : 0,
                      borderLeftColor: P.border,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 6,
                        color: P.muted,
                        textTransform: "uppercase",
                        letterSpacing: 0.6,
                        marginBottom: 2,
                      }}
                    >
                      {stat.label}
                    </Text>
                    <Text
                      style={{
                        fontSize: 11,
                        fontFamily: "Helvetica-Bold",
                        color: P.navy,
                        marginBottom: 1,
                      }}
                    >
                      {stat.value}
                    </Text>
                    <Text style={{ fontSize: 6, color: P.muted }}>{stat.sub}</Text>
                  </View>
                ))}
            </View>

            {/* Table header */}
            <View
              style={{
                flexDirection: "row",
                backgroundColor: P.navy,
                paddingVertical: 6,
                paddingHorizontal: 4,
                marginBottom: 0,
              }}
            >
              {[
                "Address / Location",
                "Acres",
                "Asking Price",
                "$/Acre",
                "vs. Median",
                "DOM",
                "Listed By",
              ].map((h, i) => (
                <Text
                  key={h}
                  style={{
                    width: COL_WIDTHS[i],
                    fontSize: 6.5,
                    fontFamily: "Helvetica-Bold",
                    color: P.white,
                    textTransform: "uppercase",
                    letterSpacing: 0.8,
                    paddingHorizontal: 4,
                  }}
                >
                  {h}
                </Text>
              ))}
            </View>

            {/* Table rows */}
            {listings.map((p, i) => {
              const bg = i % 2 === 0 ? P.white : P.light;
              const hasDetail = p.priceChangePct != null;
              const ppaDelta =
                medianPpa && p.pricePerAc > 0
                  ? Math.round(((p.pricePerAc - medianPpa) / medianPpa) * 100)
                  : null;
              const longListed = avgDom != null && p.dom != null && p.dom > avgDom * 1.5;
              return (
                <View
                  key={i}
                  wrap={false}
                  style={{
                    backgroundColor: bg,
                    borderBottomWidth: 0.5,
                    borderBottomColor: P.border,
                  }}
                >
                  {/* Main data row */}
                  <View
                    style={{
                      flexDirection: "row",
                      paddingTop: 7,
                      paddingBottom: hasDetail ? 3 : 7,
                      paddingHorizontal: 4,
                    }}
                  >
                    <View style={{ width: COL_WIDTHS[0], paddingHorizontal: 4 }}>
                      <Text
                        style={{
                          fontSize: 7.5,
                          fontFamily: "Helvetica-Bold",
                          color: P.navy,
                          marginBottom: 1,
                        }}
                      >
                        {p.street}
                      </Text>
                      <Text style={{ fontSize: 7, color: P.muted }}>
                        {p.cityStateZip}
                        {p.propertyType &&
                        p.propertyType.toLowerCase() !== "land"
                          ? ` · ${p.propertyType}`
                          : ""}
                      </Text>
                    </View>
                    <Text
                      style={{
                        width: COL_WIDTHS[1],
                        fontSize: 10,
                        fontFamily: "Helvetica-Bold",
                        color: P.navy,
                        paddingHorizontal: 4,
                        paddingTop: 1,
                      }}
                    >
                      {p.acres.toLocaleString()}
                    </Text>
                    <Text
                      style={{
                        width: COL_WIDTHS[2],
                        fontSize: 8.5,
                        fontFamily: "Helvetica-Bold",
                        color: P.navy,
                        paddingHorizontal: 4,
                        paddingTop: 2,
                      }}
                    >
                      $
                      {p.price >= 1000000
                        ? (p.price / 1000000).toFixed(2) + "M"
                        : fmtNum(p.price)}
                    </Text>
                    {/* $/Acre */}
                    <Text
                      style={{
                        width: COL_WIDTHS[3],
                        fontSize: 8,
                        color: P.sub,
                        paddingHorizontal: 4,
                        paddingTop: 2,
                      }}
                    >
                      ${fmtNum(p.pricePerAc)}
                    </Text>
                    {/* vs. Median */}
                    <View style={{ width: COL_WIDTHS[4], paddingHorizontal: 4, paddingTop: 1 }}>
                      {ppaDelta != null ? (
                        <>
                          <Text
                            style={{
                              fontSize: 10,
                              fontFamily: "Helvetica-Bold",
                              color:
                                ppaDelta < 0
                                  ? "#16a34a"
                                  : ppaDelta >= 10
                                  ? P.amber
                                  : P.sub,
                            }}
                          >
                            {ppaDelta > 0 ? "+" : ""}
                            {ppaDelta}%
                          </Text>
                          <Text style={{ fontSize: 5.5, color: P.muted, marginTop: 1 }}>
                            {ppaDelta < 0 ? "below" : "above"} median
                          </Text>
                        </>
                      ) : (
                        <Text style={{ fontSize: 8, color: P.muted }}>—</Text>
                      )}
                    </View>
                    {/* DOM */}
                    <View style={{ width: COL_WIDTHS[5], paddingHorizontal: 4, paddingTop: 2 }}>
                      <Text
                        style={{
                          fontSize: 8,
                          color: P.sub,
                        }}
                      >
                        {p.dom != null ? p.dom : "—"}
                      </Text>
                      {longListed && (
                        <Text
                          style={{
                            fontSize: 5.5,
                            color: P.amber,
                            fontFamily: "Helvetica-Bold",
                            marginTop: 1,
                          }}
                        >
                          Long listed
                        </Text>
                      )}
                    </View>
                    {/* Listed By */}
                    <View style={{ width: COL_WIDTHS[6], paddingHorizontal: 4 }}>
                      {p.office && (
                        <Text style={{ fontSize: 6.5, color: P.muted, lineHeight: 1.3 }}>
                          {p.office.length > 22 ? p.office.slice(0, 20) + "…" : p.office}
                        </Text>
                      )}
                      {p.agent && (
                        <Text style={{ fontSize: 6.5, color: P.sub, marginTop: 1 }}>
                          {p.agent}
                        </Text>
                      )}
                      {p.agentPhone && (
                        <Text style={{ fontSize: 6.5, color: P.sub, marginTop: 1 }}>
                          {fmtPhone(p.agentPhone)}
                        </Text>
                      )}
                      {p.mls && (
                        <Text style={{ fontSize: 6, color: P.muted, marginTop: 1 }}>
                          MLS #{p.mls}
                        </Text>
                      )}
                    </View>
                  </View>

                  {/* Detail sub-row */}
                  {hasDetail && (
                    <View
                      style={{
                        paddingHorizontal: 12,
                        paddingBottom: 7,
                        paddingTop: 2,
                        flexDirection: "row",
                        gap: 12,
                        alignItems: "center",
                      }}
                    >
                      {p.priceChangePct != null && (
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 4,
                            backgroundColor: p.priceReduced ? "#fff7ed" : P.light,
                            paddingHorizontal: 6,
                            paddingVertical: 2,
                            borderRadius: 2,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 6.5,
                              fontFamily: "Helvetica-Bold",
                              color: p.priceReduced ? P.amber : P.navy,
                            }}
                          >
                            {p.priceReduced ? "▼" : "▲"}{" "}
                            {Math.abs(p.priceChangePct)}% Price{" "}
                            {p.priceReduced ? "Reduction" : "Increase"}
                          </Text>
                          {p.originalPrice != null && (
                            <Text style={{ fontSize: 6, color: P.muted }}>
                              from $
                              {p.originalPrice >= 1000000
                                ? (p.originalPrice / 1000000).toFixed(2) + "M"
                                : fmtNum(p.originalPrice)}
                            </Text>
                          )}
                        </View>
                      )}
                    </View>
                  )}
                </View>
              );
            })}

            {/* Summary row */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                paddingTop: 10,
                paddingHorizontal: 4,
                marginTop: 4,
                borderTopWidth: 1,
                borderTopColor: P.border,
              }}
            >
              <Text style={{ fontSize: 7.5, color: P.muted }}>
                {listings.length} parcels shown · min {minAcres} acres · 40-mile
                radius · Active listings only
              </Text>
              <Text style={{ fontSize: 7.5, color: P.muted }}>
                Source: Rentcast MLS ·{" "}
                {new Date().toLocaleDateString("en-US", {
                  month: "short",
                  year: "numeric",
                })}
              </Text>
            </View>

          </>
        ) : (
          <View style={{ paddingVertical: 32, alignItems: "center" }}>
            <Text
              style={{
                fontSize: 10,
                color: P.muted,
                fontFamily: "Helvetica-Bold",
                textTransform: "uppercase",
                letterSpacing: 1,
              }}
            >
              No Active Listings Found
            </Text>
            <Text
              style={{
                fontSize: 8,
                color: P.muted,
                marginTop: 8,
                maxWidth: 340,
                textAlign: "center",
                lineHeight: 1.6,
              }}
            >
              No active land listings of {minAcres}+ acres were found within a
              40-mile radius at the time this plan was generated. Listings are
              updated in real time; check Rentcast, LoopNet, LandWatch, or the
              county assessor for current inventory.
            </Text>
          </View>
        )}
      </View>
      <Footer
        countyName={name}
        thesis={thesis}
        pageLabel="Land Opportunities"
      />
    </Page>
  );
}

// ─── Main Document ────────────────────────────────────────────────────────────
function MarketActionPlanDoc({
  county,
  thesis,
  deepDiveText,
  tldrText,
  actionPlanData,
  neighborCounties,
  generatedDate,
  countyMapPaths,
  countyOnlyPath,
  totalCounties,
  landListings,
  supplementalSignals,
}) {
  const defaults = THESIS_DEFAULTS[thesis] || THESIS_DEFAULTS.activation;
  const name = county.name || county.county_name || "County";

  const thesisSubs = {
    activation: "Timing, basis, and distress recovery execution",
    expansion: "Land, entitlement, and demand wave positioning",
    formation: "Demographic momentum and land assembly strategy",
    engineered: "Employer anchor, infrastructure, and workforce housing",
  };

  return (
    <Document
      title={`${name} — Market Action Plan`}
      author="Ampledge"
      subject={`${THESIS_LABEL[thesis]} Market Action Plan`}
    >
      {/* Cover */}
      <CoverPage
        county={county}
        thesis={thesis}
        generatedDate={generatedDate}
        countyOnlyPath={countyOnlyPath}
        totalCounties={totalCounties}
      />

      {/* Table of Contents */}
      <TocPage county={county} thesis={thesis} generatedDate={generatedDate} />

      {/* Ch 01 */}
      <ChapterDivider
        num="01"
        title="Executive Brief"
        sub="Market position, thesis fit, TLDR, and scoring methodology at a glance."
        countyName={name}
        thesis={thesis}
      />
      <ExecBriefPage
        county={county}
        thesis={thesis}
        defaults={defaults}
        tldrText={tldrText}
      />

      {/* Ch 02 */}
      <ChapterDivider
        num="02"
        title="Why This Market"
        sub="Deep dive analysis framed around the thesis and the opportunity."
        countyName={name}
        thesis={thesis}
      />
      <WhyThisMarketPage
        county={county}
        thesis={thesis}
        deepDiveText={deepDiveText}
      />

      {/* Ch 03 */}
      <ChapterDivider
        num="03"
        title="Market Fundamentals"
        sub="Key metrics, dimension score breakdown, and raw data indicators."
        countyName={name}
        thesis={thesis}
      />
      <MarketFundamentalsPage
        county={county}
        thesis={thesis}
        supplementalSignals={supplementalSignals}
      />

      {/* Ch 04 */}
      <ChapterDivider
        num="04"
        title="Neighboring Markets"
        sub={`Cluster Emergence Index — how this market positions within its ${THESIS_LABEL[thesis]} cluster.`}
        countyName={name}
        thesis={thesis}
      />
      <RegionalContextPage
        county={county}
        thesis={thesis}
        neighborCounties={neighborCounties}
      />

      {/* Ch 05 */}
      <ChapterDivider
        num="05"
        title="Thesis Risk Factors"
        sub="What kills the thesis — likelihood, impact, and mitigation."
        countyName={name}
        thesis={thesis}
      />
      <RiskRegisterPage
        county={county}
        thesis={thesis}
        defaults={defaults}
        actionPlanData={actionPlanData}
      />

      {/* Ch 06 */}
      <ChapterDivider
        num="06"
        title="Action Plan"
        sub={thesisSubs[thesis] || "Sequenced action items by urgency."}
        countyName={name}
        thesis={thesis}
      />
      <ActionPlanPage
        county={county}
        thesis={thesis}
        defaults={defaults}
        actionPlanData={actionPlanData}
      />

      {/* Ch 07 */}
      <ChapterDivider
        num="07"
        title="Diligence Checklist"
        sub="Thesis-specific workstreams with fillable status fields."
        countyName={name}
        thesis={thesis}
      />
      <DiligenceChecklistPage
        county={county}
        thesis={thesis}
        defaults={defaults}
        actionPlanData={actionPlanData}
      />

      {/* Ch 08 */}
      <ChapterDivider
        num="08"
        title="Employer / Stakeholder Brief"
        sub="Outward-facing profile for employer and partner conversations."
        countyName={name}
        thesis={thesis}
      />
      <EmployerBriefPage
        county={county}
        thesis={thesis}
        defaults={defaults}
        actionPlanData={actionPlanData}
      />

      {/* Ch 10 */}
      <ChapterDivider
        num="10"
        title="Land Opportunities"
        sub="Active for-sale parcels meeting minimum acreage thresholds for this thesis."
        countyName={name}
        thesis={thesis}
      />
      <LandOpportunitiesPage
        county={county}
        thesis={thesis}
        listings={landListings || []}
      />
    </Document>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────
/**
 * Generate and open the Market Action Plan PDF in a new tab.
 *
 * @param {object} params
 * @param {object}   params.county          — County data object from counties array
 * @param {string}   params.thesis          — "activation" | "expansion" | "formation" | "engineered"
 * @param {object[]} params.allCounties     — Full counties array for neighbor lookup
 * @param {string}   [params.deepDiveText]  — Pre-fetched deep dive markdown text
 * @param {string}   [params.tldrText]      — Pre-fetched TLDR text
 * @param {object}   [params.actionPlanData]— LLM-generated action plan data (optional)
 */
export async function generateAndOpenMarketActionPlan({
  county,
  thesis,
  allCounties = [],
  neighborPool = null,
  deepDiveText = null,
  tldrText = null,
  actionPlanData = null,
}) {
  // Normalize fips to 5-digit zero-padded strings on both sides.
  const normFips = (f) => String(f).padStart(5, "0");
  const pool = neighborPool || allCounties;
  const fipsLookup = Object.fromEntries(pool.map((c) => [normFips(c.fips), c]));

  // neighborCounties is populated below after topojson adjacency computation.
  let neighborCounties = [];

  const generatedDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // ── Compute geographic county map paths + geographic neighbors ────────────────
  let countyMapPaths = null;
  let countyOnlyPath = null;
  let countyLatLon = null;
  const totalCounties = allCounties.length || 3104;

  try {
    const { geoPath, geoAlbersUsa } = await import("d3-geo");
    const { feature: topoFeature, neighbors: topoNeighbors } =
      await import("topojson-client");

    const topoData = await fetch(
      "https://cdn.jsdelivr.net/npm/us-atlas@3/counties-10m.json",
    ).then((r) => r.json());

    const allFeatures = topoFeature(
      topoData,
      topoData.objects.counties,
    ).features;

    // Derive geographic adjacency — not dependent on CEI neighbor_fips being populated.
    const geoms = topoData.objects.counties.geometries;
    const adjList = topoNeighbors(geoms);
    const targetIdx = geoms.findIndex(
      (g) => normFips(g.id) === normFips(county.fips),
    );
    const adjFips =
      targetIdx >= 0
        ? adjList[targetIdx].map((i) => normFips(geoms[i].id))
        : [];
    neighborCounties = adjFips
      .map((f) => fipsLookup[f])
      .filter(Boolean)
      .sort((a, b) => (b.composite || 0) - (a.composite || 0));

    const targetFips = county.fips;
    const relevantFipsSet = new Set([normFips(targetFips), ...adjFips]);
    const relevantFeatures = allFeatures.filter((f) =>
      relevantFipsSet.has(normFips(f.id)),
    );
    const targetFeature = allFeatures.find(
      (f) => normFips(f.id) === normFips(targetFips),
    );

    if (targetFeature) {
      // Store centroid for land listings fetch
      const { geoCentroid } = await import("d3-geo");
      const [lon, lat] = geoCentroid(targetFeature);
      countyLatLon = [lat, lon];

      // Cover map: county only, fitted to a 320×320 square
      const coverSize = 320;
      const coverProj = geoAlbersUsa().fitExtent(
        [
          [16, 16],
          [coverSize - 16, coverSize - 16],
        ],
        {
          type: "FeatureCollection",
          features: [targetFeature],
        },
      );
      countyOnlyPath = geoPath().projection(coverProj)(targetFeature);
    }

    if (targetFeature && relevantFeatures.length > 0) {
      // Regional context map: county + neighbors, fitted to 480×260
      const W = 480,
        H = 260;
      const projection = geoAlbersUsa().fitExtent(
        [
          [24, 16],
          [W - 24, H - 16],
        ],
        {
          type: "FeatureCollection",
          features: relevantFeatures,
        },
      );
      const pathGen = geoPath().projection(projection);

      countyMapPaths = relevantFeatures
        .map((f) => {
          const fipsId = String(f.id).padStart(5, "0");
          return {
            fips: fipsId,
            d: pathGen(f),
            isTarget: fipsId === targetFips || String(f.id) === targetFips,
          };
        })
        .filter((p) => p.d);
    }
  } catch (e) {
    console.warn("[MapPaths] geographic map unavailable:", e.message);
  }

  // ── Fetch land listings ───────────────────────────────────────────────────
  let landListings = [];
  try {
    const [lat, lon] = countyLatLon ?? [
      county.metrics?.lat ?? county.lat,
      county.metrics?.lon ?? county.lon,
    ];
    if (lat && lon) {
      landListings = await fetchLandListings(lat, lon, thesis);
      console.log(`[LandListings] ${landListings.length} parcels found`);
    }
  } catch (e) {
    console.warn("[LandListings] error:", e.message);
  }

  const supplementalSignals = computeSupplementalSignals(
    county.metrics,
    allCounties,
    county.population,
  );

  const blob = await pdf(
    <MarketActionPlanDoc
      county={county}
      thesis={thesis}
      deepDiveText={deepDiveText}
      tldrText={tldrText}
      actionPlanData={actionPlanData}
      neighborCounties={neighborCounties}
      generatedDate={generatedDate}
      countyMapPaths={countyMapPaths}
      countyOnlyPath={countyOnlyPath}
      totalCounties={totalCounties}
      landListings={landListings}
      supplementalSignals={supplementalSignals}
    />,
  ).toBlob();

  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
}
