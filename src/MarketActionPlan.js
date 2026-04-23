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

const CEI_LABEL_ORDER = [
  "Early Leader",
  "Mature Cluster",
  "Structural Isolation",
  "Regional Laggard",
  "Neutral",
];

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
      verdict: "Optimal Site Timing",
      body: "This county leads neighboring markets on engineered fundamentals (workforce, land, infrastructure). A facility commitment here may establish first-mover advantage before regional labor costs and land values increase due to cluster demand.",
    },
    "Mature Cluster": {
      verdict: "Regional Labor Ecosystem Intact",
      body: "Multiple neighboring counties also score well for industrial site selection — indicating a developed regional labor and logistics ecosystem. Site selection here benefits from established supply chains, vendors, and workforce pipelines.",
    },
    "Structural Isolation": {
      verdict: "Site-Specific Case Only",
      body: "Strong standalone engineered fundamentals but no regional labor ecosystem to draw from. Workforce must be largely sourced locally or through training partnerships. Validate local labor pool depth before committing to headcount projections.",
    },
    "Regional Laggard": {
      verdict: "Revisit Site Selection",
      body: "Adjacent counties score better on the engineered model — stronger labor pools, better infrastructure, or lower land costs. Unless a specific parcel, incentive package, or anchor tenant requirement applies, the site selection case is stronger in a neighboring market.",
    },
    Neutral: {
      verdict: "Site-Specific Factors Dominate",
      body: "No strong regional cluster signal in either direction. The employer site decision comes down to parcel availability, zoning, utility capacity, proximity to workforce, and incentive package. Standard engineered market diligence applies.",
    },
  },
};

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
      segs.push({ type: "spacer" });
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

async function fetchLandListings(lat, lon, thesis) {
  const minAcres = THESIS_MIN_ACRES[thesis] || 25;
  const minSqft = minAcres * 43560;
  const apiKey = process.env.REACT_APP_RENTCAST_KEY;
  if (!apiKey) return [];
  try {
    const url = `https://api.rentcast.io/v1/listings/sale?latitude=${lat.toFixed(4)}&longitude=${lon.toFixed(4)}&radius=40&propertyType=Land&status=Active&limit=50`;
    const res = await fetch(url, { headers: { "X-Api-Key": apiKey } });
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data)) return [];
    return data
      .filter((p) => (p.lotSize || 0) >= minSqft && (p.price || 0) > 0)
      .sort((a, b) => (b.lotSize || 0) - (a.lotSize || 0))
      .slice(0, 8)
      .map((p) => ({
        address: p.formattedAddress || p.addressLine1 || "—",
        city: p.city || "—",
        acres: parseFloat(((p.lotSize || 0) / 43560).toFixed(1)),
        price: p.price || 0,
        pricePerAc:
          p.lotSize > 0 ? Math.round(p.price / (p.lotSize / 43560)) : 0,
        dom: p.daysOnMarket || null,
        mls: p.mlsNumber || null,
        agent: p.listingAgent?.name || null,
        office: p.listingOffice?.name || null,
        listedDate: p.listedDate ? p.listedDate.slice(0, 10) : null,
      }));
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
  cols: { flexDirection: "row", gap: 14 },
  col: { flex: 1 },
  colWide: { flex: 1.6 },
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
  sec: { marginTop: 18, marginBottom: 10 },
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
    padding: "12 14",
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
    borderWidth: 1.5,
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
    fontSize: 7.5,
    color: P.sub,
    lineHeight: 1.5,
    backgroundColor: P.light,
    padding: "6 8",
    borderRadius: 2,
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
  para: { fontSize: 8.5, color: P.sub, lineHeight: 1.65, marginBottom: 6 },
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
    backgroundColor: P.navy,
    marginBottom: 0,
    marginTop: 12,
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
  dlSection: { marginBottom: 12 },
  dlHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: P.navy,
    marginBottom: 0,
  },
  dlHeaderT: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: P.white },
  dlPriority: { paddingVertical: 2, paddingHorizontal: 6, borderRadius: 1 },
  dlPriorityT: {
    fontSize: 6,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 0.8,
  },
  dlItem: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: P.border,
    backgroundColor: P.white,
    alignItems: "center",
  },
  dlCheckbox: {
    width: 10,
    height: 10,
    borderWidth: 1,
    borderColor: P.border,
    borderRadius: 1,
    flexShrink: 0,
  },
  dlItemT: { fontSize: 8, color: P.ink, flex: 1 },
  dlStatus: {
    width: 60,
    borderWidth: 1,
    borderColor: P.border,
    height: 12,
    borderRadius: 1,
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
    borderLeftWidth: 3,
    borderLeftColor: P.emerald,
    paddingLeft: 12,
    marginBottom: 14,
  },
  empTitle: {
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: P.emerald,
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
  tldrText: { fontSize: 10, color: P.navy, lineHeight: 1.35 },

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
    borderWidth: 1,
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

function ScoreBar({ label, score, maxScore = 100, color }) {
  const pct = Math.min(100, Math.max(0, (score / maxScore) * 100));
  const barColor = color || scoreColor(score);
  return (
    <View style={s.scoreWrap}>
      <View style={s.scoreLbl}>
        <Text style={s.scoreName}>{label}</Text>
        <Text style={[s.scoreVal, { color: barColor }]}>{fmtScore(score)}</Text>
      </View>
      <View style={s.scoreTrack}>
        <View
          style={[s.scoreFill, { width: `${pct}%`, backgroundColor: barColor }]}
        />
      </View>
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

function MdBlock({ text }) {
  const segs = parseMd(text || "");
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
            <View key={i} style={s.bullet}>
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
      title: "Regional Context",
      sub: "Cluster Emergence Index and regional competitive positioning",
    },
    {
      n: "05",
      title: "Neighboring Markets",
      sub: "Qualifying contiguous counties and their thesis relevance",
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
      title: "Risk Register",
      sub: "What kills the thesis — likelihood, impact, and mitigation",
    },
    {
      n: "09",
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
    });
  if (m.median_hhi != null)
    findings.push({
      lbl: "Median HHI",
      val: `$${fmtNum(m.median_hhi / 1000, 0)}k`,
      sub: "Census ACS",
      pos: m.median_hhi > 45000,
    });
  if (m.pop_growth_pct != null)
    findings.push({
      lbl: "Population Growth",
      val: fmtPct(m.pop_growth_pct),
      sub: "5-yr CAGR",
      pos: m.pop_growth_pct > 0,
    });
  if (m.biz_apps_per_1k != null)
    findings.push({
      lbl: "Business Formation",
      val: `${fmtNum(m.biz_apps_per_1k, 1)}/1k`,
      sub: "Census BFS",
      pos: m.biz_apps_per_1k > 5,
    });
  if (m.permit_units_per_1k != null)
    findings.push({
      lbl: "Permit Activity",
      val: `${fmtNum(m.permit_units_per_1k, 1)}/1k`,
      sub: "Census BPS",
      pos: m.permit_units_per_1k > 3,
    });
  if (m.broadband_pct != null)
    findings.push({
      lbl: "Broadband",
      val: `${fmtNum(m.broadband_pct, 0)}%`,
      sub: "FCC coverage",
      pos: m.broadband_pct > 80,
    });
  if (m.farmland_value_acre != null)
    findings.push({
      lbl: "Land Basis",
      val: `$${fmtNum(m.farmland_value_acre / 1000, 1)}k/ac`,
      sub: "USDA",
      pos: m.farmland_value_acre < 5000,
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
              <Text style={[s.bigStatV, { color: tc }]}>#{fmtNum(rank)}</Text>
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
            <SecHeader title={`What is the ${THESIS_LABEL[thesis]} Thesis`} />
            <Text style={s.para}>{THESIS_DESCRIPTION[thesis]}</Text>

            <SecHeader title="How Ground Score Works" />
            <View style={s.methBox}>
              <Text style={s.methHead}>Scoring Methodology</Text>
              <Text style={s.methText}>{METHODOLOGY_BRIEF}</Text>
            </View>

            <SecHeader
              title="This Market's Position"
              sub={`${THESIS_LABEL[thesis]} · Why it qualifies`}
            />
            <Text style={s.para}>{defaults.thesis_fit}</Text>

            {cei && (
              <View style={s.pullQuote}>
                <Text style={s.pullQuoteT}>
                  "{cei.label}" — this market scores{" "}
                  {cei.gap != null
                    ? `${Math.abs(Math.round(cei.gap))} points ${cei.gap >= 0 ? "above" : "below"} its ${fmtNum(cei.neighbor_count || 0)} contiguous neighbors (avg ${fmtNum(cei.neighbor_avg || 0, 1)})`
                    : "within its regional cluster"}
                  .{" "}
                  {CEI_THESIS_IMPLICATIONS[thesis]?.[cei.label]?.verdict || ""}
                </Text>
              </View>
            )}

            {topRisk && (
              <View style={s.riskFlag}>
                <View>
                  <Text style={s.riskFlagT}>Primary Risk to Monitor</Text>
                  <Text style={s.riskFlagB}>
                    {topRisk.risk}: {topRisk.mitigation}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Right col: key findings + immediate actions */}
          <View style={s.colNarrow}>
            {topFindings.length > 0 && (
              <>
                <SecHeader
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
                          borderColor: f.pos ? P.emerald + "55" : P.border,
                          backgroundColor: f.pos ? P.emerald + "06" : P.light,
                        },
                      ]}
                    >
                      <Text style={s.findLbl}>{f.lbl}</Text>
                      <Text
                        style={[
                          s.findVal,
                          { color: f.pos ? P.emerald : P.navy },
                        ]}
                      >
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
  const text =
    deepDiveText ||
    `No deep dive available. Generate a deep dive from the market detail panel to populate this chapter with AI-generated market analysis tailored to the ${THESIS_LABEL[thesis]} thesis.`;
  return (
    <Page size="LETTER" style={s.page}>
      <PageHeader
        countyName={county.name || county.county_name}
        chapter="02 — Why This Market"
      />
      <View style={s.body}>
        <View style={s.cols}>
          <View style={s.col}>
            <SecHeader
              title="Market Analysis"
              sub={`${THESIS_LABEL[thesis]} Thesis · Deep Dive`}
            />
            <MdBlock text={text.slice(0, Math.ceil(text.length / 2))} />
          </View>
          <View style={s.col}>
            <View style={{ marginTop: 28 }}>
              <MdBlock text={text.slice(Math.ceil(text.length / 2))} />
            </View>
          </View>
        </View>
      </View>
      <Footer
        countyName={county.name || county.county_name}
        thesis={thesis}
        pageLabel="Why This Market"
      />
    </Page>
  );
}

// ─── Ch 03: Market Fundamentals ───────────────────────────────────────────────
function MarketFundamentalsPage({ county, thesis }) {
  const m = county.metrics || {};
  const dims = county.dims || [];

  // Organize metrics by category
  const econMetrics = [
    {
      label: "Unemployment Rate",
      value:
        m.unemployment_rate != null
          ? `${fmtNum(m.unemployment_rate, 1)}%`
          : "—",
      sub: "BLS",
    },
    {
      label: "Median Household Income",
      value:
        m.median_household_income != null
          ? `$${fmtNum(m.median_household_income)}`
          : "—",
      sub: "ACS",
    },
    {
      label: "Population",
      value: m.population != null ? fmtNum(m.population) : "—",
      sub: "Census",
    },
    {
      label: "Pop Growth (CAGR)",
      value: m.pop_growth_pct != null ? fmtPct(m.pop_growth_pct) : "—",
      sub: "5-yr",
    },
    {
      label: "Labor Force",
      value: m.labor_force != null ? fmtNum(m.labor_force) : "—",
      sub: "BLS",
    },
    {
      label: "Net Migration Rate",
      value: m.net_migration_rate != null ? fmtPct(m.net_migration_rate) : "—",
      sub: "ACS",
    },
  ].filter((x) => x.value !== "—");

  const housingMetrics = [
    {
      label: "Median Home Value",
      value:
        m.home_value_median != null ? `$${fmtNum(m.home_value_median)}` : "—",
      sub: "Zillow/ACS",
    },
    {
      label: "HPA (1-yr)",
      value: m.hpa_1yr != null ? fmtPct(m.hpa_1yr) : "—",
      sub: "Estimated",
    },
    {
      label: "Permit Units / 1k Pop",
      value:
        m.permit_units_per_1k != null ? fmtNum(m.permit_units_per_1k, 1) : "—",
      sub: "Census BPS",
    },
    {
      label: "Vacancy Rate",
      value: m.vacancy_rate != null ? `${fmtNum(m.vacancy_rate, 1)}%` : "—",
      sub: "ACS",
    },
    {
      label: "Homeownership Rate",
      value:
        m.homeownership_rate != null
          ? `${fmtNum(m.homeownership_rate, 1)}%`
          : "—",
      sub: "ACS",
    },
    {
      label: "Farmland Value / Acre",
      value:
        m.farmland_value_acre != null
          ? `$${fmtNum(m.farmland_value_acre)}`
          : "—",
      sub: "USDA",
    },
  ].filter((x) => x.value !== "—");

  const infraMetrics = [
    {
      label: "Pop Density (/ sq mi)",
      value: m.pop_density != null ? fmtNum(m.pop_density, 0) : "—",
      sub: "Census",
    },
    {
      label: "Broadband Coverage",
      value: m.broadband_pct != null ? `${fmtNum(m.broadband_pct, 0)}%` : "—",
      sub: "FCC",
    },
    {
      label: "Drive to MSA (min)",
      value: m.drive_time_min != null ? fmtNum(m.drive_time_min, 0) : "—",
      sub: "Estimated",
    },
    {
      label: "FEMA Risk Score",
      value: m.fema_risk != null ? fmtNum(m.fema_risk, 0) : "—",
      sub: "/100",
    },
    {
      label: "OZ Designation",
      value: m.oz_eligible ? "Yes" : m.oz_eligible === false ? "No" : "—",
      sub: "Federal",
    },
    {
      label: "Biz Apps / 1k Pop",
      value: m.biz_apps_per_1k != null ? fmtNum(m.biz_apps_per_1k, 1) : "—",
      sub: "Census BFS",
    },
  ].filter((x) => x.value !== "—");

  return (
    <Page size="LETTER" style={s.page}>
      <PageHeader
        countyName={county.name || county.county_name}
        chapter="03 — Market Fundamentals"
      />
      <View style={s.body}>
        <View style={s.cols}>
          {/* Left column: dimension scores + econ metrics */}
          <View style={s.col}>
            {dims.length > 0 && (
              <>
                <SecHeader
                  title="Dimension Score Breakdown"
                  sub={`${THESIS_LABEL[thesis]} scoring model`}
                />
                {dims.map((dim) => (
                  <ScoreBar
                    key={dim.id}
                    label={dim.label}
                    score={dim.score * 100}
                  />
                ))}
                <View style={{ height: 6 }} />
              </>
            )}

            {econMetrics.length > 0 && (
              <>
                <SecHeader title="Economic Indicators" />
                <View style={s.tWrap}>
                  <View style={s.thead}>
                    <Text style={[s.th, { flex: 2 }]}>Metric</Text>
                    <Text style={[s.th, { flex: 1, textAlign: "right" }]}>
                      Value
                    </Text>
                    <Text style={[s.th, { flex: 1 }]}>Source</Text>
                  </View>
                  {econMetrics.map((m, i) => (
                    <View key={i} style={i % 2 === 0 ? s.tr : s.trAlt}>
                      <Text style={[s.td, { flex: 2 }]}>{m.label}</Text>
                      <Text style={[s.tdB, { flex: 1, textAlign: "right" }]}>
                        {m.value}
                      </Text>
                      <Text style={[s.tdM, { flex: 1 }]}>{m.sub}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </View>

          {/* Right column: housing + infrastructure */}
          <View style={s.col}>
            {housingMetrics.length > 0 && (
              <>
                <SecHeader title="Housing Indicators" />
                <View style={s.tWrap}>
                  <View style={s.thead}>
                    <Text style={[s.th, { flex: 2 }]}>Metric</Text>
                    <Text style={[s.th, { flex: 1, textAlign: "right" }]}>
                      Value
                    </Text>
                    <Text style={[s.th, { flex: 1 }]}>Source</Text>
                  </View>
                  {housingMetrics.map((m, i) => (
                    <View key={i} style={i % 2 === 0 ? s.tr : s.trAlt}>
                      <Text style={[s.td, { flex: 2 }]}>{m.label}</Text>
                      <Text style={[s.tdB, { flex: 1, textAlign: "right" }]}>
                        {m.value}
                      </Text>
                      <Text style={[s.tdM, { flex: 1 }]}>{m.sub}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}

            {infraMetrics.length > 0 && (
              <>
                <SecHeader title="Infrastructure & Context" />
                <View style={s.tWrap}>
                  <View style={s.thead}>
                    <Text style={[s.th, { flex: 2 }]}>Metric</Text>
                    <Text style={[s.th, { flex: 1, textAlign: "right" }]}>
                      Value
                    </Text>
                    <Text style={[s.th, { flex: 1 }]}>Source</Text>
                  </View>
                  {infraMetrics.map((m, i) => (
                    <View key={i} style={i % 2 === 0 ? s.tr : s.trAlt}>
                      <Text style={[s.td, { flex: 2 }]}>{m.label}</Text>
                      <Text style={[s.tdB, { flex: 1, textAlign: "right" }]}>
                        {m.value}
                      </Text>
                      <Text style={[s.tdM, { flex: 1 }]}>{m.sub}</Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </View>
        </View>
      </View>
      <Footer
        countyName={county.name || county.county_name}
        thesis={thesis}
        pageLabel="Market Fundamentals"
      />
    </Page>
  );
}

// ─── Ch 04: Regional Context (CEI) ───────────────────────────────────────────
function RegionalContextPage({ county, thesis, neighborCounties }) {
  const cei = county.cei;
  const ceiColor = CEI_COLOR[cei?.label] || P.muted;

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
        chapter="04 — Regional Context"
      />
      <View style={s.body}>
        <SecHeader
          title="Cluster Emergence Index"
          sub="Regional positioning and cluster dynamics"
        />

        {/* CEI card */}
        {cei ? (
          <View style={[s.ceiCard, { borderColor: ceiColor + "44" }]}>
            <View style={s.ceiTop}>
              <View>
                <Text style={[s.ceiLabel, { color: ceiColor }]}>
                  {cei.label}
                </Text>
                <Text style={[s.mLbl, { marginTop: 4 }]}>
                  {THESIS_LABEL[thesis]} Cluster Position
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={s.ceiScore}>{fmtScore(cei.score)}</Text>
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
            <View style={s.ceiNote}>
              <Text style={{ fontSize: 8, color: P.sub, lineHeight: 1.55 }}>
                {CEI_MEANING[cei.label] || ""}
              </Text>
            </View>
          </View>
        ) : (
          <View style={s.infoPanel}>
            <Text style={s.infoPanelText}>
              CEI data not available. Re-run the pipeline to compute cluster
              emergence for this market.
            </Text>
          </View>
        )}

        {/* Neighbor score table */}
        {neighborCounties && neighborCounties.length > 0 && (
          <>
            <SecHeader
              title="Contiguous Market Overview"
              sub="Neighboring counties in scored universe"
            />
            <View style={s.tWrap}>
              <View style={s.thead}>
                <Text style={[s.th, { flex: 2 }]}>County</Text>
                <Text style={[s.th, { flex: 1, textAlign: "right" }]}>
                  Score
                </Text>
                <Text style={[s.th, { flex: 1.2 }]}>Tier</Text>
                <Text style={[s.th, { flex: 1.2 }]}>CEI</Text>
                <Text style={[s.th, { flex: 1, textAlign: "right" }]}>HHI</Text>
              </View>
              {neighborCounties.slice(0, 10).map((n, i) => {
                const nScore = Math.round((n.composite || 0) * 100);
                const nColor = scoreColor(nScore);
                return (
                  <View key={n.fips || i} style={i % 2 === 0 ? s.tr : s.trAlt}>
                    <Text style={[s.tdB, { flex: 2 }]}>
                      {n.name || n.county_name || n.fips}
                    </Text>
                    <Text
                      style={[
                        s.td,
                        {
                          flex: 1,
                          textAlign: "right",
                          color: nColor,
                          fontFamily: "Helvetica-Bold",
                        },
                      ]}
                    >
                      {nScore}
                    </Text>
                    <Text style={[s.td, { flex: 1.2 }]}>
                      {TIER_LABEL[n.tier] || "—"}
                    </Text>
                    <Text
                      style={[
                        s.td,
                        {
                          flex: 1.2,
                          color: CEI_COLOR[n.cei?.label] || P.muted,
                        },
                      ]}
                    >
                      {n.cei?.label || "—"}
                    </Text>
                    <Text style={[s.td, { flex: 1, textAlign: "right" }]}>
                      {n.metrics?.median_household_income
                        ? `$${fmtNum(n.metrics.median_household_income / 1000, 0)}k`
                        : "—"}
                    </Text>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* Thesis-specific CEI tier reference */}
        {CEI_THESIS_IMPLICATIONS[thesis] && (
          <>
            <SecHeader
              title="CEI Label Reference"
              sub={`What each label means for the ${THESIS_LABEL[thesis]} thesis`}
            />
            {CEI_LABEL_ORDER.map((label) => {
              const imp = CEI_THESIS_IMPLICATIONS[thesis][label];
              if (!imp) return null;
              const lColor = CEI_COLOR[label] || P.muted;
              const isCurrentLabel = cei?.label === label;
              return (
                <View
                  key={label}
                  style={{
                    marginBottom: 6,
                    padding: 8,
                    borderRadius: 4,
                    backgroundColor: isCurrentLabel ? lColor + "12" : P.light,
                    borderWidth: isCurrentLabel ? 1 : 0.5,
                    borderColor: isCurrentLabel ? lColor + "66" : P.border,
                    borderStyle: "solid",
                  }}
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
                        width: 7,
                        height: 7,
                        borderRadius: 3.5,
                        backgroundColor: lColor,
                        marginRight: 6,
                      }}
                    />
                    <Text
                      style={{
                        fontSize: 9,
                        fontFamily: "Helvetica-Bold",
                        color: lColor,
                      }}
                    >
                      {label}
                    </Text>
                    {isCurrentLabel && (
                      <Text
                        style={{
                          fontSize: 7,
                          color: lColor,
                          marginLeft: 6,
                          fontFamily: "Helvetica-Bold",
                        }}
                      >
                        ← THIS MARKET
                      </Text>
                    )}
                    <Text
                      style={{
                        fontSize: 8,
                        color: lColor,
                        marginLeft: "auto",
                        fontFamily: "Helvetica-Bold",
                      }}
                    >
                      {imp.verdict}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 8, color: P.sub, lineHeight: 1.5 }}>
                    {imp.body}
                  </Text>
                </View>
              );
            })}
          </>
        )}

        {/* Action implication by CEI label */}
        {cei && (
          <View style={s.cols}>
            <View style={s.col}>
              <SecHeader title="Timing Implication" />
              {cei.label === "Early Leader" && (
                <View style={s.infoPanel}>
                  <Text style={[s.infoPanelTitle, { color: P.emerald }]}>
                    Move with Urgency
                  </Text>
                  <Text style={s.infoPanelText}>
                    Early Leader status is time-sensitive. The cluster is
                    forming — regional demand is building but land and asset
                    basis have not yet priced in the cluster effect. Window is
                    open now; similar opportunities in adjacent markets may
                    compress the entry window within 12–18 months.
                  </Text>
                </View>
              )}
              {cei.label === "Mature Cluster" && (
                <View style={s.infoPanel}>
                  <Text style={[s.infoPanelTitle, { color: "#2563eb" }]}>
                    Basis Discipline Required
                  </Text>
                  <Text style={s.infoPanelText}>
                    Mature Cluster markets have strong regional validation —
                    neighboring markets confirm the thesis. The risk shifts from
                    "is the thesis real?" to "can we acquire at defensible
                    basis?" Competitive entry is likely. Underwrite
                    conservatively on entry price.
                  </Text>
                </View>
              )}
              {cei.label === "Structural Isolation" && (
                <View style={s.infoPanel}>
                  <Text style={[s.infoPanelTitle, { color: P.amber }]}>
                    Front-Load Diligence
                  </Text>
                  <Text style={s.infoPanelText}>
                    Strong standalone fundamentals without regional cluster
                    confirmation. Local demand drivers must be independently
                    verified. Catalyst or anchor employer identification is
                    especially important in isolated markets — do not rely on
                    regional spillover effects.
                  </Text>
                </View>
              )}
              {cei.label === "Regional Laggard" && (
                <View style={s.infoPanel}>
                  <Text style={[s.infoPanelTitle, { color: P.red }]}>
                    Identify Specific Catalyst
                  </Text>
                  <Text style={s.infoPanelText}>
                    Regional context is a headwind. Unless a specific catalyst
                    justifies the standalone thesis, the scoring gap vs.
                    neighbors represents structural drag. Flag whether this is
                    still worth pursuing given better-positioned alternatives in
                    the same region.
                  </Text>
                </View>
              )}
              {cei.label === "Neutral" && (
                <View style={s.infoPanel}>
                  <Text style={[s.infoPanelTitle, { color: P.navy }]}>
                    Local Fundamentals Drive Decision
                  </Text>
                  <Text style={s.infoPanelText}>
                    Mixed regional context means the investment case lives or
                    dies on local fundamentals. Neither a strong regional
                    tailwind nor headwind is present. Standard thesis diligence
                    applies.
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
      </View>
      <Footer
        countyName={county.name || county.county_name}
        thesis={thesis}
        pageLabel="Regional Context"
      />
    </Page>
  );
}

// ─── Ch 05: Neighboring Markets ───────────────────────────────────────────────
function NeighboringMarketsPage({ county, thesis, neighborCounties }) {
  const qualifying = (neighborCounties || []).filter(
    (n) => n.composite != null && n.composite * 100 >= 50,
  );

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
              No contiguous counties scored above 50 in the{" "}
              {THESIS_LABEL[thesis]} model. This market is structurally isolated
              in its cluster context.
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
          sub={`${sorted.length} contiguous counties scoring ≥ 50 in ${THESIS_LABEL[thesis]} model`}
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
      color: P.red,
      items: ap.immediate || defaults.immediate,
    },
    {
      label: "30-Day",
      key: "day30",
      color: P.amber,
      items: ap.day30 || defaults.day30,
    },
    {
      label: "60-Day",
      key: "day60",
      color: P.gold,
      items: ap.day60 || defaults.day60,
    },
    {
      label: "90-Day",
      key: "day90",
      color: P.emerald,
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

// ─── Ch 07: Diligence Checklist ───────────────────────────────────────────────
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
                      <View style={[s.dlPriority, { backgroundColor: ps.bg }]}>
                        <Text style={[s.dlPriorityT, { color: ps.text }]}>
                          {ws.priority}
                        </Text>
                      </View>
                    </View>
                    {(ws.items || []).map((item, ii) => (
                      <View
                        key={ii}
                        style={[
                          s.dlItem,
                          { backgroundColor: ii % 2 === 0 ? P.white : P.light },
                        ]}
                      >
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

// ─── Ch 08: Risk Register ─────────────────────────────────────────────────────
function RiskRegisterPage({ county, thesis, defaults, actionPlanData }) {
  const risks = actionPlanData?.risks || defaults.risks || [];

  return (
    <Page size="LETTER" style={s.page}>
      <PageHeader
        countyName={county.name || county.county_name}
        chapter="08 — Risk Register"
      />
      <View style={s.body}>
        <SecHeader
          title="Risk Register"
          sub={`${THESIS_LABEL[thesis]} thesis · Thesis-specific risk factors`}
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
        pageLabel="Risk Register"
      />
    </Page>
  );
}

// ─── Ch 09: Employer / Stakeholder Brief ──────────────────────────────────────
function EmployerBriefPage({ county, thesis, defaults, actionPlanData }) {
  const brief = actionPlanData?.employer_brief || defaults.employer_brief;
  const m = county.metrics || {};

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
        <View style={[s.bigStatRow, { marginBottom: 16 }]}>
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
            <View
              style={[
                s.infoPanel,
                {
                  borderLeftWidth: 3,
                  borderLeftColor: P.emerald,
                  paddingLeft: 12,
                  borderRadius: 0,
                  borderWidth: 0,
                },
              ]}
            >
              <Text style={[s.infoPanelTitle, { color: P.emerald }]}>
                American Pledge Workforce Housing
              </Text>
              <Text style={s.infoPanelText}>
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
              <View
                style={[
                  s.infoPanel,
                  {
                    borderLeftWidth: 3,
                    borderLeftColor: P.gold,
                    paddingLeft: 12,
                    borderRadius: 0,
                    borderWidth: 0,
                    marginTop: 8,
                  },
                ]}
              >
                <Text style={[s.infoPanelTitle, { color: P.gold }]}>
                  Opportunity Zone Designation
                </Text>
                <Text style={s.infoPanelText}>
                  This county contains qualified Opportunity Zone tracts.
                  Federal OZ designation provides capital gains tax deferral and
                  potential exclusion for investments held 10+ years, creating a
                  compelling incentive for long-term employer anchor investment.
                </Text>
              </View>
            )}
          </View>
        </View>
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
  const context = THESIS_LAND_CONTEXT[thesis] || "";
  const hasData = listings && listings.length > 0;

  const COL_WIDTHS = [170, 52, 70, 70, 44, 60]; // address, acres, price, $/ac, DOM, office

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

        {/* Context blurb */}
        <View style={[s.infoPanel, { marginBottom: 12 }]}>
          <Text style={s.infoPanelText}>{context}</Text>
        </View>

        {hasData ? (
          <>
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
              const acreColor =
                p.acres >= minAcres * 2
                  ? P.emerald
                  : p.acres >= minAcres
                    ? P.navy
                    : P.muted;
              return (
                <View
                  key={i}
                  style={{
                    flexDirection: "row",
                    backgroundColor: bg,
                    paddingVertical: 7,
                    paddingHorizontal: 4,
                    borderBottomWidth: 0.5,
                    borderBottomColor: P.border,
                  }}
                >
                  <View style={{ width: COL_WIDTHS[0], paddingHorizontal: 4 }}>
                    <Text
                      style={{
                        fontSize: 8,
                        fontFamily: "Helvetica-Bold",
                        color: P.navy,
                        marginBottom: 1,
                      }}
                    >
                      {p.address.length > 36
                        ? p.address.slice(0, 34) + "…"
                        : p.address}
                    </Text>
                    <Text style={{ fontSize: 7, color: P.muted }}>
                      {p.city}
                    </Text>
                  </View>
                  <Text
                    style={{
                      width: COL_WIDTHS[1],
                      fontSize: 10,
                      fontFamily: "Helvetica-Bold",
                      color: acreColor,
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
                  <Text
                    style={{
                      width: COL_WIDTHS[4],
                      fontSize: 8,
                      color: p.dom > 180 ? P.amber : P.sub,
                      paddingHorizontal: 4,
                      paddingTop: 2,
                    }}
                  >
                    {p.dom != null ? p.dom : "—"}
                  </Text>
                  <View style={{ width: COL_WIDTHS[5], paddingHorizontal: 4 }}>
                    {p.office && (
                      <Text
                        style={{
                          fontSize: 6.5,
                          color: P.muted,
                          lineHeight: 1.3,
                        }}
                      >
                        {p.office.length > 20
                          ? p.office.slice(0, 18) + "…"
                          : p.office}
                      </Text>
                    )}
                    {p.mls && (
                      <Text
                        style={{ fontSize: 6, color: P.muted, marginTop: 1 }}
                      >
                        MLS #{p.mls}
                      </Text>
                    )}
                  </View>
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

            {/* Disclaimer */}
            <View
              style={{
                marginTop: 14,
                padding: "8 10",
                backgroundColor: P.light,
                borderLeftWidth: 2,
                borderLeftColor: P.border,
              }}
            >
              <Text style={{ fontSize: 7, color: P.muted, lineHeight: 1.6 }}>
                <Text style={{ fontFamily: "Helvetica-Bold" }}>
                  Disclaimer —{" "}
                </Text>
                Listing data sourced from Rentcast MLS aggregation. Accuracy,
                availability, and pricing subject to change. Lot sizes and
                acreage are as reported by the listing agent and have not been
                independently verified. This list is illustrative only and does
                not constitute a recommendation to purchase any specific
                property. Conduct independent title, environmental, and zoning
                diligence before committing to any acquisition.
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
      <MarketFundamentalsPage county={county} thesis={thesis} />

      {/* Ch 04 */}
      <ChapterDivider
        num="04"
        title="Regional Context"
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
        title="Neighboring Markets"
        sub="Qualifying contiguous counties and their thesis relevance."
        countyName={name}
        thesis={thesis}
      />
      <NeighboringMarketsPage
        county={county}
        thesis={thesis}
        neighborCounties={neighborCounties}
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
        title="Risk Register"
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

      {/* Ch 09 */}
      <ChapterDivider
        num="09"
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
  deepDiveText = null,
  tldrText = null,
  actionPlanData = null,
}) {
  // Resolve neighboring counties from CEI neighbor_fips
  const neighborFips = county.cei?.neighbor_fips || [];
  const fipsLookup = Object.fromEntries(allCounties.map((c) => [c.fips, c]));
  const neighborCounties = neighborFips
    .map((fips) => fipsLookup[fips])
    .filter(Boolean)
    .sort((a, b) => (b.composite || 0) - (a.composite || 0));

  const generatedDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // ── Compute geographic county map paths ──────────────────────────────────────
  let countyMapPaths = null;
  let countyOnlyPath = null;
  let countyLatLon = null;
  const totalCounties = allCounties.length || 3104;

  try {
    const { geoPath, geoAlbersUsa } = await import("d3-geo");
    const { feature: topoFeature } = await import("topojson-client");

    const topoData = await fetch(
      "https://cdn.jsdelivr.net/npm/us-atlas@3/counties-10m.json",
    ).then((r) => r.json());

    const allFeatures = topoFeature(
      topoData,
      topoData.objects.counties,
    ).features;

    const targetFips = county.fips;
    const relevantFipsSet = new Set([targetFips, ...neighborFips]);
    const relevantFeatures = allFeatures.filter(
      (f) =>
        relevantFipsSet.has(String(f.id).padStart(5, "0")) ||
        relevantFipsSet.has(String(f.id)),
    );
    const targetFeature = allFeatures.find(
      (f) =>
        String(f.id).padStart(5, "0") === targetFips ||
        String(f.id) === targetFips,
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
    />,
  ).toBlob();

  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
}
