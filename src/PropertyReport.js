import React from "react";
import { Document, Page, Text, View, Image, StyleSheet, pdf, Font } from "@react-pdf/renderer";

// Disable all automatic hyphenation globally — words must never break mid-word
Font.registerHyphenationCallback(word => [word]);

// ─── Brand palette ────────────────────────────────────────────────────────────
const R = {
  navy:    "#0d2b45",
  red:     "#ff0a4b",
  cyan:    "#03a9f4",
  gold:    "#b8924a",
  ink:     "#1a1a2e",
  sub:     "#4b5563",
  muted:   "#9ca3af",
  border:  "#dde2ea",
  row:     "#f4f6f9",
  light:   "#f8f9fb",
  white:   "#ffffff",
};

// ─── AP schedule ──────────────────────────────────────────────────────────────
const AP_RS  = [0.46, 0.55, 0.65, 0.70, 0.75, 1.10, 2.00, 1.00, 1.00, 1.00];
const AP_SWD = [900,  900,  900,  900,  900,  0,    0,    0,    0,    0   ];

function remainBal(p, r, y) {
  if (!p || !r) return p;
  const rm = r / 12, n = 360, pm = y * 12;
  return p * (Math.pow(1 + rm, n) - Math.pow(1 + rm, pm)) / (Math.pow(1 + rm, n) - 1);
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", backgroundColor: R.white },

  // ── Masthead ────────────────────────────────────────────────────────────────
  logoBar: {
    backgroundColor: R.white, paddingHorizontal: 30, paddingVertical: 10,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderBottomWidth: 0.75, borderBottomColor: R.border,
  },
  logoBox:      { height: 30 },
  logoBarRight: { alignItems: "flex-end" },
  logoBarDate:  { fontSize: 7, color: R.muted },
  logoBarTag:   {
    fontSize: 6.5, color: R.white, fontFamily: "Helvetica-Bold", letterSpacing: 1.2,
    textTransform: "uppercase", marginTop: 3,
    backgroundColor: R.red, paddingVertical: 2.5, paddingHorizontal: 6, borderRadius: 1,
  },
  titleBand: {
    backgroundColor: R.navy, paddingHorizontal: 30, paddingVertical: 18,
    flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between",
  },
  titleBandSm: {
    backgroundColor: R.navy, paddingHorizontal: 30, paddingVertical: 12,
    flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between",
  },
  mastheadTitle:   { fontSize: 17, color: R.white, fontFamily: "Helvetica-Bold", letterSpacing: 0.2 },
  mastheadSub:     { fontSize: 8.5, color: "rgba(255,255,255,0.6)", marginTop: 3 },
  mastheadEyebrow: { fontSize: 7, color: "rgba(255,255,255,0.45)", fontFamily: "Helvetica-Bold", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 },
  redRule:  { height: 3, backgroundColor: R.red },
  navyRule: { height: 0.75, backgroundColor: R.navy },

  // ── Key-metrics bar ─────────────────────────────────────────────────────────
  metricsBar: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: R.border, backgroundColor: R.light },
  mCell:  { flex: 1, paddingVertical: 10, paddingHorizontal: 11, borderRightWidth: 1, borderRightColor: R.border },
  mCellL: { flex: 1, paddingVertical: 10, paddingHorizontal: 11 },
  mLabel: { fontSize: 6, color: R.muted, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.9, marginBottom: 3 },
  mVal:   { fontSize: 14, fontFamily: "Helvetica-Bold", color: R.navy, lineHeight: 1 },
  mSub:   { fontSize: 6, color: R.muted, marginTop: 2 },

  // ── Body ────────────────────────────────────────────────────────────────────
  body: { paddingHorizontal: 30, paddingTop: 14, paddingBottom: 52 },

  // ── Section header ──────────────────────────────────────────────────────────
  sec:     { marginTop: 15, marginBottom: 9 },
  secT:    { fontSize: 8, fontFamily: "Helvetica-Bold", color: R.navy, textTransform: "uppercase", letterSpacing: 1.3 },
  secRule: { borderBottomWidth: 0.75, borderBottomColor: R.navy, marginBottom: 6 },  // kept for legacy inline use
  secSub:  { fontSize: 6.5, color: R.muted, lineHeight: 1.5, marginTop: 3, marginLeft: 11 },

  // ── Note box ────────────────────────────────────────────────────────────────
  noteBox:  { backgroundColor: R.light, borderLeftWidth: 3, borderLeftColor: R.red, padding: "8 11", marginBottom: 12 },
  noteHead: { fontSize: 6.5, fontFamily: "Helvetica-Bold", color: R.red, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 3 },
  noteBody: { fontSize: 7.5, color: R.sub, lineHeight: 1.45 },

  // ── Two columns ─────────────────────────────────────────────────────────────
  cols: { flexDirection: "row", gap: 12 },
  col:  { flex: 1 },

  // ── Loan cards ──────────────────────────────────────────────────────────────
  lCard:  { flex: 1, border: `1px solid ${R.border}`, borderRadius: 3 },
  lCardN: { flex: 1, border: `1.5px solid ${R.navy}`, borderRadius: 3 },
  lHead:  { paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 0.75, borderBottomColor: R.border, backgroundColor: R.light },
  lHeadN: { paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "#2d5a8e", backgroundColor: R.navy },
  lBody:  { paddingHorizontal: 12, paddingVertical: 10 },
  lTitle: { fontSize: 6.5, fontFamily: "Helvetica-Bold", color: R.muted, textTransform: "uppercase", letterSpacing: 1 },
  lTitleW:{ fontSize: 6.5, fontFamily: "Helvetica-Bold", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: 1 },
  lBig:   { fontSize: 22, fontFamily: "Helvetica-Bold", color: R.navy, lineHeight: 1 },
  lBigW:  { fontSize: 22, fontFamily: "Helvetica-Bold", color: R.white, lineHeight: 1 },
  lSub:   { fontSize: 7.5, color: R.muted, marginTop: 3 },
  lSubW:  { fontSize: 7.5, color: "rgba(255,255,255,0.55)", marginTop: 3 },
  lRow:   { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 0.5, borderTopColor: R.border, paddingTop: 5, marginTop: 5 },
  lRowW:  { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 0.5, borderTopColor: "#2d5a8e", paddingTop: 5, marginTop: 5 },
  lRLbl:  { fontSize: 7, color: R.muted },
  lRLblW: { fontSize: 7, color: "rgba(255,255,255,0.5)" },
  lRVal:  { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: R.ink },
  lRValW: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: R.white },

  // ── Step list ───────────────────────────────────────────────────────────────
  stepRow: { flexDirection: "row", gap: 9, marginBottom: 7, alignItems: "flex-start" },
  stepNum: { width: 16, height: 16, borderRadius: 8, backgroundColor: R.navy,
             alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 0.5 },
  stepN:   { fontSize: 7, fontFamily: "Helvetica-Bold", color: R.white },
  stepT:   { fontSize: 8, fontFamily: "Helvetica-Bold", color: R.ink, marginBottom: 2 },
  stepB:   { fontSize: 7.5, color: R.sub, lineHeight: 1.4 },

  // ── Stat grid ───────────────────────────────────────────────────────────────
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginBottom: 8 },
  stat:     { minWidth: 70, flex: 1, border: `0.75px solid ${R.border}`, borderRadius: 2, padding: "5 8" },
  statL:    { fontSize: 6, color: R.muted, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 2 },
  statV:    { fontSize: 12, fontFamily: "Helvetica-Bold", color: R.navy },

  // ── HPA badge ───────────────────────────────────────────────────────────────
  hpaBadge: { borderRadius: 2, padding: "8 10", justifyContent: "center" },
  hpaRange: { fontSize: 15, fontFamily: "Helvetica-Bold", lineHeight: 1, color: R.navy },
  hpaLbl:   { fontSize: 6.5, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.9, marginTop: 3, color: R.sub },
  hpaSub:   { fontSize: 6, color: R.muted, marginTop: 1 },

  // ── Driver chips ─────────────────────────────────────────────────────────────
  driver: { flex: 1, minWidth: 60, border: `1px solid ${R.border}`, borderRadius: 3, padding: "7 9", backgroundColor: R.light },
  drvL:   { fontSize: 6, color: R.muted, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 2 },
  drvV:   { fontSize: 13, fontFamily: "Helvetica-Bold", color: R.navy, lineHeight: 1 },
  drvD:   { fontSize: 6.5, color: R.muted, marginTop: 2, lineHeight: 1.4 },

  // ── Score badge ──────────────────────────────────────────────────────────────
  scoreBadge:   { border: `0.75px solid ${R.navy}44`, borderRadius: 2, padding: "7 10",
                  backgroundColor: R.light, alignItems: "center" },
  scoreBig:     { fontSize: 24, fontFamily: "Helvetica-Bold", color: R.navy, lineHeight: 1 },
  scoreLbl:     { fontSize: 6, color: R.muted, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.8, marginTop: 2 },
  scoreBar:     { width: "100%", height: 3, backgroundColor: R.border, borderRadius: 1.5, marginTop: 4 },
  scoreBarFill: { height: 3, backgroundColor: R.navy, borderRadius: 1.5 },

  // ── Table ────────────────────────────────────────────────────────────────────
  tWrap:  { border: `1px solid ${R.border}`, borderRadius: 3, overflow: "hidden", marginBottom: 9 },
  thead:  { flexDirection: "row", backgroundColor: R.navy },
  th:     { fontSize: 6, fontFamily: "Helvetica-Bold", color: "rgba(255,255,255,0.8)",
             textTransform: "uppercase", letterSpacing: 0.7, paddingVertical: 6, paddingHorizontal: 7 },
  tr:     { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: R.border },
  trAlt:  { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: R.border, backgroundColor: R.light },
  td:     { fontSize: 7.5, color: R.ink, paddingVertical: 5.5, paddingHorizontal: 7 },
  tdB:    { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: R.navy, paddingVertical: 5.5, paddingHorizontal: 7 },
  tdM:    { fontSize: 7.5, color: R.muted, paddingVertical: 5.5, paddingHorizontal: 7 },
  tdPos:  { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: "#166534", paddingVertical: 5.5, paddingHorizontal: 7 },
  tdNeg:  { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: R.red, paddingVertical: 5.5, paddingHorizontal: 7 },

  // ── Comparison table ─────────────────────────────────────────────────────────
  cmpHead: { flexDirection: "row", backgroundColor: R.navy, borderRadius: "3 3 0 0" },
  cmpTh:   { fontSize: 6.5, fontFamily: "Helvetica-Bold", color: "rgba(255,255,255,0.8)",
              textTransform: "uppercase", letterSpacing: 0.7, paddingVertical: 7, paddingHorizontal: 9, flex: 1 },
  cmpTr:   { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: R.border },
  cmpTrA:  { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: R.border, backgroundColor: R.light },
  cmpTd:   { fontSize: 7.5, color: R.sub, paddingVertical: 5.5, paddingHorizontal: 9, flex: 1 },
  cmpTdB:  { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: R.navy, paddingVertical: 5.5, paddingHorizontal: 9, flex: 1 },
  cmpTdG:  { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: "#166534", paddingVertical: 5.5, paddingHorizontal: 9, flex: 1 },
  cmpLbl:  { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: R.ink, paddingVertical: 5.5, paddingHorizontal: 9, flex: 1.4 },

  // ── Return schedule strip ────────────────────────────────────────────────────
  rsStrip: { flexDirection: "row", gap: 4, flexWrap: "wrap", marginBottom: 9 },
  rsCell:  { alignItems: "center", padding: "4 7", borderRadius: 2 },
  rsYr:    { fontSize: 5.5, color: R.muted, fontFamily: "Helvetica-Bold", textTransform: "uppercase" },
  rsV:     { fontSize: 9, fontFamily: "Helvetica-Bold" },

  // ── Value prop bullets ───────────────────────────────────────────────────────
  bullet:  { flexDirection: "row", gap: 7, marginBottom: 5, alignItems: "flex-start" },
  bulletDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: R.red, marginTop: 4, flexShrink: 0 },
  bulletT: { fontSize: 8, fontFamily: "Helvetica-Bold", color: R.ink, marginBottom: 1.5 },
  bulletB: { fontSize: 7.5, color: R.sub, lineHeight: 1.4 },

  // ── Map / Street View images ─────────────────────────────────────────────────
  mapImg:       { width: "100%", borderRadius: 2, border: `1px solid ${R.border}` },
  streetViewImg: { width: "100%", borderRadius: 2, border: `1px solid ${R.border}`, marginBottom: 7 },

  // ── Property details chips ────────────────────────────────────────────────────
  propChipRow:  { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 9 },
  propChip:     { backgroundColor: R.light, border: `1px solid ${R.border}`, borderRadius: 3, paddingVertical: 6, paddingHorizontal: 9 },
  propChipFull: { backgroundColor: R.light, border: `1px solid ${R.border}`, borderRadius: 3, paddingVertical: 6, paddingHorizontal: 9, alignSelf: "flex-start" },
  propChipL:    { fontSize: 6, color: R.muted, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 2.5 },
  propChipV:    { fontSize: 11, fontFamily: "Helvetica-Bold", color: R.navy },

  // ── Flood zone badge ──────────────────────────────────────────────────────────
  floodRow:    { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6, marginBottom: 5 },
  floodBadge:  { borderRadius: 2, padding: "4 8" },
  floodZone:   { fontSize: 9, fontFamily: "Helvetica-Bold", color: R.white },
  floodLabel:  { fontSize: 6.5, color: R.muted, lineHeight: 1.4 },

  // ── Footer ───────────────────────────────────────────────────────────────────
  footer: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    borderTopWidth: 1, borderTopColor: R.border,
    paddingHorizontal: 30, paddingVertical: 8,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: R.white,
  },
  footerDisc:  { fontSize: 5.5, color: R.muted, lineHeight: 1.6, flex: 1 },
  footerRight: { alignItems: "flex-end", marginLeft: 20, flexShrink: 0 },
  footerBrand: { fontSize: 7, fontFamily: "Helvetica-Bold", color: R.navy, letterSpacing: 1.5, textTransform: "uppercase" },
  footerPage:  { fontSize: 5.5, color: R.muted, marginTop: 1.5 },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
const $  = (n) => n != null ? `$${Math.round(n).toLocaleString()}` : "—";
const $k = (n) => {
  if (n == null) return "—";
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  return `$${Math.round(n / 1000)}k`;
};
const p1 = (n) => n != null ? `${(n * 100).toFixed(1)}%` : "—";

// ─── Deep Dive Markdown Renderer ─────────────────────────────────────────────
// Handles: **section header** on its own line, • bullets, inline **bold**
const renderInline = (text) => {
  // Split on **...** markers
  const parts = text.split(/\*\*([^*]+)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1
      ? <Text key={i} style={{ fontFamily: "Helvetica-Bold" }}>{part}</Text>
      : <Text key={i}>{part}</Text>
  );
};

const DeepDiveBlock = ({ text }) => {
  if (!text) return null;
  const lines = text.split("\n");
  const elements = [];
  let i = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) { i++; continue; }

    // Section header: line is entirely **text** (bold header on its own)
    const headerMatch = trimmed.match(/^\*\*(.+)\*\*$/);
    if (headerMatch) {
      elements.push(
        <View key={i} style={{ marginTop: 7, marginBottom: 2 }}>
          <Text style={{ fontSize: 7, fontFamily: "Helvetica-Bold", color: R.navy, textTransform: "uppercase", letterSpacing: 0.8 }}>
            {headerMatch[1]}
          </Text>
          <View style={{ borderBottomWidth: 0.5, borderBottomColor: R.border, marginTop: 1.5 }} />
        </View>
      );
    } else if (trimmed.startsWith("•")) {
      // Bullet line
      const content = trimmed.slice(1).trim();
      elements.push(
        <View key={i} style={{ flexDirection: "row", gap: 5, marginBottom: 2.5, paddingLeft: 4 }}>
          <Text style={{ fontSize: 6.5, color: R.red, marginTop: 1, flexShrink: 0 }}>•</Text>
          <Text style={{ fontSize: 7, color: R.sub, lineHeight: 1.55, flex: 1 }}>{renderInline(content)}</Text>
        </View>
      );
    } else {
      // Body paragraph
      elements.push(
        <Text key={i} style={{ fontSize: 7, color: R.sub, lineHeight: 1.6, marginBottom: 3 }}>
          {renderInline(trimmed)}
        </Text>
      );
    }
    i++;
  }
  return <View>{elements}</View>;
};

// Compact variant for two-column layout on Page 1
const DeepDiveBlockSm = ({ text }) => {
  if (!text) return null;
  const lines = text.split("\n");
  const elements = [];
  let i = 0;
  for (const line of lines) {
    const trimmed = line.trim();
    // Skip empty lines and --- separators
    if (!trimmed || trimmed === "---" || trimmed === "—" || /^-{2,}$/.test(trimmed)) { i++; continue; }
    const headerMatch = trimmed.match(/^\*\*(.+)\*\*$/);
    if (headerMatch) {
      elements.push(
        <View key={i} style={{ marginTop: 4, marginBottom: 1 }}>
          <Text style={{ fontSize: 6, fontFamily: "Helvetica-Bold", color: R.navy, textTransform: "uppercase", letterSpacing: 0.7 }}>
            {headerMatch[1]}
          </Text>
          <View style={{ borderBottomWidth: 0.5, borderBottomColor: R.border, marginTop: 1 }} />
        </View>
      );
    } else if (trimmed.startsWith("•")) {
      const content = trimmed.slice(1).trim();
      elements.push(
        <Text key={i} style={{ fontSize: 6.5, color: R.sub, lineHeight: 1.35, marginBottom: 2 }}>
          {renderInline(content)}
        </Text>
      );
    } else {
      elements.push(
        <Text key={i} style={{ fontSize: 6.5, color: R.sub, lineHeight: 1.35, marginBottom: 2 }}>
          {renderInline(trimmed)}
        </Text>
      );
    }
    i++;
  }
  return <View>{elements}</View>;
};

const Sec = ({ title, sub }) => (
  <View style={s.sec}>
    <View style={{ flexDirection: "row", alignItems: "stretch", borderBottomWidth: 1, borderBottomColor: R.border, paddingBottom: 5 }}>
      <View style={{ width: 3, backgroundColor: R.red, borderRadius: 1.5, marginRight: 8, flexShrink: 0 }} />
      <Text style={s.secT}>{title}</Text>
    </View>
    {sub && <Text style={s.secSub}>{sub}</Text>}
  </View>
);

const LR = ({ label, val, white }) => (
  <View style={white ? s.lRowW : s.lRow}>
    <Text style={white ? s.lRLblW : s.lRLbl}>{label}</Text>
    <Text style={white ? s.lRValW : s.lRVal}>{val}</Text>
  </View>
);

const Footer = ({ page, total = 5, date }) => (
  <View style={s.footer} fixed>
    <Text style={s.footerDisc}>
      For illustrative purposes only. Not financial, legal, or investment advice. AP appreciation share is contingent
      interest (IRS Rev. Rul. 83-51), not a second lien. Projections assume constant HPA and are not guaranteed.
    </Text>
    <View style={s.footerRight}>
      <Text style={s.footerBrand}>American Pledge</Text>
      <Text style={s.footerPage}>{date}  ·  Page {page} of {total}</Text>
    </View>
  </View>
);

// Reusable page masthead
const Masthead = ({ logoUrl, eyebrow, title, sub, tag, generated }) => (
  <>
    <View style={s.logoBar}>
      {logoUrl
        ? <Image src={logoUrl} style={s.logoBox} />
        : <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", color: R.navy, letterSpacing: 1 }}>AMERICAN PLEDGE</Text>
      }
      <View style={s.logoBarRight}>
        <Text style={s.logoBarDate}>{generated}</Text>
        {tag && <Text style={s.logoBarTag}>{tag}</Text>}
      </View>
    </View>
    <View style={s.titleBand}>
      <View>
        {eyebrow && <Text style={s.mastheadEyebrow}>{eyebrow}</Text>}
        <Text style={s.mastheadTitle}>{title}</Text>
        {sub && <Text style={s.mastheadSub}>{sub}</Text>}
      </View>
    </View>
    <View style={s.redRule} />
  </>
);

// ─── Document ────────────────────────────────────────────────────────────────
export const PropertyReportDoc = ({ data }) => {
  const {
    address, price, countyName, state, lat, lon,
    stdDP, kalshiMtgPct, kalshiMtg,
    stdPI, stdPMI, stdTotal,
    apPI, apContrib, savings,
    apDTI, stdDTI, apPool, stdPool, lift,
    hhi, county, met, hpaOut, projHpa, deepDive, generated,
    logoUrl, logoWhiteUrl = null, mapUrl, nearbyPlaces,
    streetViewUrl, propertyDetails, floodZone,
    avmValue, avmLow, avmHigh, avmComps,
    lastSalePrice: topLastSalePrice, lastSaleDate: topLastSaleDate,
    greatSchools = null,
    rentalEstimate = null,
    walkScore = null,
    agentBio = null,
    interactionType = "buyer",
  } = data;

  const isAgent   = interactionType === "agent";
  const totalPages = isAgent ? 9 : 8;

  const AP_BUYER_DOWN = 0.01;
  const stdLbl  = stdDP === 0 ? "0%" : `${Math.round(stdDP * 100)}%`;
  const hpaRange = hpaOut
    ? `${hpaOut.hpaLow >= 0 ? "+" : ""}${hpaOut.hpaLow}–${hpaOut.hpaHigh}%`
    : p1(projHpa);
  // hpaMid uses the blended projHpa (already computed in App.js) so the 10yr projection
  // and the subtitle label are always consistent.
  const hpaMid = (projHpa ?? 0) * 100;

  // ── Equity projection rows ─────────────────────────────────────────────────
  const apLoan  = price * 0.80;
  const stdLoan = price * (1 - stdDP);
  const apT = [];
  let prev = price * 0.20;
  for (let y = 1; y <= 10; y++) {
    const v0 = price * Math.pow(1 + projHpa, y - 1);
    const v1 = price * Math.pow(1 + projHpa, y);
    prev = prev + (v1 - v0) * (AP_RS[y - 1] ?? 1) + (AP_SWD[y - 1] ?? 0);
    apT.push(prev);
  }
  const rows = Array.from({ length: 10 }, (_, i) => {
    const yr = i + 1;
    const fv = price * Math.pow(1 + projHpa, yr);
    const se = fv - remainBal(stdLoan, kalshiMtg, yr);
    const ae = fv - remainBal(apLoan,  kalshiMtg, yr) - apT[i];
    const sv = (savings ?? 0) * 12 * yr;
    const ap = ae + sv;
    return { yr, fv, se, ae, ap, vs: ap - se, rs: AP_RS[i] };
  });

  // ── Derived text ───────────────────────────────────────────────────────────
  const countyDisplay = county?.name ?? countyName;
  const tierLabel = county?.tier
    ? county.tier.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())
    : null;

  return (
    <Document title={`AmPledge Report — ${address}`} author="American Pledge" hyphenationCallback={(word) => [word]}>

      {/* ════════════════════════════════════════════════════════════════════
          COVER  ·  Table of Contents
      ════════════════════════════════════════════════════════════════════ */}
      <Page size="LETTER" style={[s.page, { backgroundColor: R.navy }]}>

        {/* Top bar: logo + date */}
        <View style={{ paddingHorizontal: 42, paddingTop: 32, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          {(logoWhiteUrl || logoUrl)
            ? <Image src={logoWhiteUrl || logoUrl} style={{ height: 32 }} />
            : <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold", color: R.white, letterSpacing: 2 }}>AMERICAN PLEDGE</Text>
          }
          <View style={{ alignItems: "flex-end" }}>
            <Text style={{ fontSize: 6.5, color: "rgba(255,255,255,0.35)", fontFamily: "Helvetica-Bold", letterSpacing: 1.5, textTransform: "uppercase" }}>Borrower Report</Text>
            <Text style={{ fontSize: 6.5, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>{generated}</Text>
          </View>
        </View>

        {/* Property hero */}
        <View style={{ paddingHorizontal: 42, paddingTop: 28, paddingBottom: 22 }}>
          <Text style={{ fontSize: 8, color: R.cyan, fontFamily: "Helvetica-Bold", letterSpacing: 2.5, textTransform: "uppercase", marginBottom: 9 }}>Property Analysis</Text>
          <Text style={{ fontSize: 20, fontFamily: "Helvetica-Bold", color: R.white, lineHeight: 1.25, marginBottom: 7 }}>{address}</Text>
          <Text style={{ fontSize: 9.5, color: "rgba(255,255,255,0.55)", lineHeight: 1.5 }}>
            {countyDisplay}, {state}{"  ·  "}Listing {$(price)}{"  ·  "}{kalshiMtgPct.toFixed(2)}% 30-yr fixed
          </Text>
        </View>

        {/* Thin separator */}
        <View style={{ height: 0.75, backgroundColor: "rgba(255,255,255,0.12)", marginHorizontal: 42, marginBottom: 28 }} />

        {/* CONTENTS header */}
        <View style={{ paddingHorizontal: 42 }}>
          <Text style={{ fontSize: 30, fontFamily: "Helvetica-Bold", color: R.white, letterSpacing: 0.5, marginBottom: 26 }}>CONTENTS</Text>

          {[
            { n: "01", title: "Property Overview",            sub: "Location, property details, walkability & flood zone" },
            { n: "02", title: "Market Overview",              sub: "Home appreciation outlook, market score & economic drivers" },
            { n: "03", title: "County Fundamentals",          sub: "Dimension scores, economic indicators & market drivers" },
            { n: "04", title: "Schools & Education Quality",  sub: "District proficiency, GreatSchools ratings & nearby schools" },
            { n: "05", title: "Estimated Home Value",         sub: "AVM estimate, comparable sales & valuation analysis" },
            { n: "06", title: "Loan Comparison & Investment", sub: "Payment comparison, 10-year equity projections & scenarios" },
            { n: "07", title: "The American Pledge Program",  sub: "How the program works & borrower value proposition" },
            ...(isAgent ? [{ n: "08", title: "Agent Profile", sub: "Agent bio, contact details & AmPledge agent tools" }] : []),
          ].map(({ n, title, sub }, idx, arr) => (
            <View key={n} style={{ flexDirection: "row", alignItems: "center", paddingVertical: 14,
              borderBottomWidth: 1, borderBottomColor: R.cyan }} wrap={false}>
              <Text style={{ fontSize: 28, fontFamily: "Helvetica-Bold", color: R.white, width: 58, lineHeight: 1, letterSpacing: -0.5 }}>{n}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 10.5, fontFamily: "Helvetica-Bold", color: R.white, marginBottom: 3 }}>{title}</Text>
                <Text style={{ fontSize: 7.5, color: "rgba(255,255,255,0.45)", lineHeight: 1.35 }}>{sub}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Bottom disclaimer */}
        <View style={{ position: "absolute", bottom: 28, left: 42, right: 42, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
          <Text style={{ fontSize: 5.5, color: "rgba(255,255,255,0.2)", lineHeight: 1.6, flex: 1, marginRight: 20 }}>
            For illustrative purposes only. Not financial, legal, or investment advice. AP appreciation share is contingent interest (IRS Rev. Rul. 83-51), not a second lien. Projections are not guaranteed.
          </Text>
          <Text style={{ fontSize: 7, fontFamily: "Helvetica-Bold", color: "rgba(255,255,255,0.25)", letterSpacing: 1.5, textTransform: "uppercase", flexShrink: 0 }}>American Pledge</Text>
        </View>
      </Page>

      {/* ════════════════════════════════════════════════════════════════════
          PAGE 1  ·  Property Overview
      ════════════════════════════════════════════════════════════════════ */}
      <Page size="LETTER" style={s.page}>
        <Masthead
          logoUrl={logoUrl}
          eyebrow={`Borrower Report  ·  Page 1 of ${totalPages}`}
          title={address}
          sub={`${countyDisplay}, ${state}  ·  Listing ${$(price)}  ·  ${kalshiMtgPct.toFixed(2)}% 30-yr fixed`}
          generated={generated}
        />

        <View style={s.body}>
          <View style={[s.cols, { marginTop: 10, gap: 14 }]}>

            {/* LEFT: map + street view + property stats */}
            <View style={{ flex: 0.42 }}>

              {/* Neighborhood Map */}
              {mapUrl && (
                <View style={{ marginBottom: 6 }}>
                  <Text style={[s.statL, { marginBottom: 4 }]}>Property Location</Text>
                  <Image src={mapUrl} style={s.mapImg} />
                  <Text style={{ fontSize: 5.5, color: R.muted, marginTop: 3 }}>
                    {lat != null && lon != null ? `${lat.toFixed(5)}° N, ${Math.abs(lon).toFixed(5)}° W` : ""}
                  </Text>
                </View>
              )}

              {/* Street View */}
              {streetViewUrl && (
                <View style={{ marginBottom: 8 }}>
                  <Text style={[s.statL, { marginBottom: 4 }]}>Street View</Text>
                  <Image src={streetViewUrl} style={s.streetViewImg} />
                </View>
              )}

              {/* Property details chips */}
              {propertyDetails && (() => {
                const fmtSalePrice = (n) =>
                  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : `$${Math.round(n).toLocaleString()}`;

                const chips = [
                  propertyDetails.propertyType && { l: "Type",       v: propertyDetails.propertyType.replace(/_/g," ") },
                  propertyDetails.yearBuilt != null && { l: "Year Built", v: String(propertyDetails.yearBuilt) },
                  propertyDetails.beds  != null  && { l: "Beds",      v: String(propertyDetails.beds) },
                  propertyDetails.baths != null  && { l: "Baths",     v: String(propertyDetails.baths) },
                  propertyDetails.sqft  != null  && { l: "Sq Ft",     v: Math.round(propertyDetails.sqft).toLocaleString() },
                  propertyDetails.lotSize != null && { l: "Lot Size",  v: `${(propertyDetails.lotSize / 43560).toFixed(2)} ac` },
                  propertyDetails.stories != null && { l: "Stories",   v: String(propertyDetails.stories) },
                ].filter(Boolean);

                const lastSaleP = propertyDetails.lastSalePrice ?? topLastSalePrice ?? null;
                const lastSaleD = propertyDetails.lastSaleDate  ?? topLastSaleDate  ?? null;
                const lastSale = lastSaleP != null
                  ? `${fmtSalePrice(lastSaleP)}` +
                    (lastSaleD ? `  ·  ${new Date(lastSaleD).getFullYear()}` : "")
                  : null;

                const estValDisplay = (() => {
                  if (avmValue) {
                    return avmValue >= 1_000_000
                      ? `$${(avmValue / 1_000_000).toFixed(2)}M`
                      : `$${Math.round(avmValue).toLocaleString()}`;
                  }
                  return null;
                })();
                const estValRange = avmLow && avmHigh
                  ? `$${(avmLow / 1e6).toFixed(2)}M – $${(avmHigh / 1e6).toFixed(2)}M`
                  : null;
                const estValMethod = avmValue ? `AVM${avmComps?.length ? ` · ${avmComps.length} comps` : ""}` : null;

                if (!chips.length && !lastSale && !estValDisplay) return null;
                return (
                  <View style={{ marginBottom: 8 }}>
                    {/* Last sale + estimated value — FIRST, full width */}
                    {(lastSale || estValDisplay) && (
                      <View style={{ flexDirection: "row", gap: 5, marginBottom: 5 }}>
                        {lastSale && (
                          <View style={[s.propChip, { flex: 1 }]}>
                            <Text style={s.propChipL}>Last Sale</Text>
                            <Text style={s.propChipV}>{lastSale}</Text>
                          </View>
                        )}
                        {estValDisplay && (
                          <View style={[s.propChip, { flex: 1, borderColor: R.navy, backgroundColor: R.navy }]}>
                            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 1.5 }}>
                              <Text style={[s.propChipL, { color: "rgba(255,255,255,0.55)" }]}>Est. Value</Text>
                              {estValMethod && (
                                <Text style={{ fontSize: 5, color: "#4ade80", fontFamily: "Helvetica-Bold", letterSpacing: 0.5 }}>{estValMethod}</Text>
                              )}
                            </View>
                            <Text style={[s.propChipV, { color: R.white, fontSize: 12 }]}>{estValDisplay}</Text>
                            {estValRange && (
                              <Text style={{ fontSize: 5.5, color: "rgba(255,255,255,0.45)", marginTop: 1 }}>{estValRange}</Text>
                            )}
                          </View>
                        )}
                      </View>
                    )}
                    {/* Property detail chips */}
                    <View style={s.propChipRow}>
                      {chips.map((c, i) => (
                        <View key={i} style={s.propChip}>
                          <Text style={s.propChipL}>{c.l}</Text>
                          <Text style={s.propChipV}>{c.v}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })()}

              {/* Property Tax Estimate */}
              {avmValue && (
                <View style={{ flexDirection: "row", gap: 5, marginBottom: 8 }}>
                  {[
                    { l: "Est. Monthly Tax", v: `~$${Math.round(avmValue * 0.011 / 12).toLocaleString()}`, note: "~1.1% annual est." },
                    { l: "Est. Annual Tax",  v: `~$${Math.round(avmValue * 0.011).toLocaleString()}`,      note: "property tax est." },
                  ].map(({ l, v, note }) => (
                    <View key={l} style={[s.propChip, { flex: 1 }]}>
                      <Text style={s.propChipL}>{l}</Text>
                      <Text style={s.propChipV}>{v}</Text>
                      <Text style={{ fontSize: 5, color: R.muted, marginTop: 1 }}>{note}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Flood Zone */}
              {(() => {
                const z = floodZone?.zone || null;
                const highRisk = z && (z.startsWith("A") || z.startsWith("V"));
                const bgColor = highRisk ? "#991b1b" : z === "X" ? "#166534" : R.muted;
                const zoneLabel = !z ? "No FEMA polygon at this location"
                  : z.startsWith("V") ? "Coastal High Hazard Area"
                  : z.startsWith("A") ? "Special Flood Hazard Area (100-yr)"
                  : z === "X" ? "Minimal Flood Hazard (Zone X)"
                  : z === "B" || z === "C" ? "Moderate / Low Risk"
                  : "See FEMA FIRM map";
                return (
                  <View style={[s.floodRow, { marginBottom: 8 }]}>
                    <View style={[s.floodBadge, { backgroundColor: bgColor }]}>
                      <Text style={s.floodZone}>{z ?? "—"}</Text>
                    </View>
                    <View>
                      <Text style={[s.floodLabel, { fontFamily: "Helvetica-Bold", color: R.sub }]}>FEMA Flood Zone</Text>
                      <Text style={s.floodLabel}>{zoneLabel}</Text>
                    </View>
                  </View>
                );
              })()}

            </View>

            {/* RIGHT: nearby amenities + walkability */}
            <View style={{ flex: 0.58 }}>
              {nearbyPlaces && Object.keys(nearbyPlaces).length > 0 && (
                <View>
                  <Sec title="Nearby Amenities" sub="Within 8km" />
                  {Object.entries(nearbyPlaces).map(([cat, places]) => (
                    places.length > 0 && (
                      <View key={cat} style={{ marginBottom: 7 }}>
                        <View style={{ flexDirection: "row", justifyContent: "space-between", paddingBottom: 2, marginBottom: 1, borderBottomWidth: 0.75, borderBottomColor: R.navy }}>
                          <Text style={{ fontSize: 5.5, fontFamily: "Helvetica-Bold", color: R.navy, textTransform: "uppercase", letterSpacing: 0.5 }}>{cat}</Text>
                          <Text style={{ fontSize: 5.5, fontFamily: "Helvetica-Bold", color: R.navy, textTransform: "uppercase", letterSpacing: 0.5 }}>Rating</Text>
                        </View>
                        {places.map((p, i) => (
                          <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 2.5, borderBottomWidth: 0.5, borderBottomColor: R.border }}>
                            <Text style={{ fontSize: 6.5, color: R.sub, flex: 1 }}>{p.name}</Text>
                            <Text style={{ fontSize: 6.5, color: p.rating != null ? R.navy : R.muted, fontFamily: p.rating != null ? "Helvetica-Bold" : "Helvetica", flexShrink: 0 }}>
                              {p.rating != null ? `★ ${p.rating}` : "—"}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )
                  ))}
                </View>
              )}

              {/* Walk / Transit / Bike Score */}
              {walkScore && (walkScore.walk != null || walkScore.transit != null || walkScore.bike != null) && (
                <View wrap={false}>
                  <Sec title="Walkability & Transit" sub="Powered by Walk Score®" />
                  <View style={{ flexDirection: "row", gap: 6 }}>
                    {[
                      { label: "Walk Score",    score: walkScore.walk,    desc: walkScore.walkDesc    },
                      { label: "Transit Score", score: walkScore.transit, desc: walkScore.transitDesc },
                      { label: "Bike Score",    score: walkScore.bike,    desc: walkScore.bikeDesc    },
                    ].filter(x => x.score != null).map(({ label, score, desc }) => {
                      const color = score >= 70 ? "#166534" : score >= 50 ? R.navy : score >= 25 ? "#d97706" : R.muted;
                      return (
                        <View key={label} style={{ flex: 1, border: `1px solid ${R.border}`, borderRadius: 3, padding: "7 8" }}>
                          <Text style={{ fontSize: 5.5, color: R.muted, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 3 }}>{label}</Text>
                          <Text style={{ fontSize: 20, fontFamily: "Helvetica-Bold", color, lineHeight: 1 }}>{score}</Text>
                          <View style={{ height: 3, backgroundColor: R.border, borderRadius: 1.5, marginTop: 4, marginBottom: 4 }}>
                            <View style={{ width: `${score}%`, height: 3, backgroundColor: color, borderRadius: 1.5 }} />
                          </View>
                          {desc && <Text style={{ fontSize: 6, color: R.sub, lineHeight: 1.3 }}>{desc}</Text>}
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}
            </View>

          </View>
        </View>
        <Footer page={1} total={totalPages} date={generated} />
      </Page>

      {/* ════════════════════════════════════════════════════════════════════
          PAGE 2  ·  Market Overview
      ════════════════════════════════════════════════════════════════════ */}
      <Page size="LETTER" style={s.page}>
        {/* Custom Page 2 masthead — Market Score badge embedded in header */}
        <>
          <View style={s.logoBar}>
            {logoUrl
              ? <Image src={logoUrl} style={s.logoBox} />
              : <Text style={{ fontSize: 10, fontFamily: "Helvetica-Bold", color: R.navy, letterSpacing: 1 }}>AMERICAN PLEDGE</Text>
            }
            <View style={s.logoBarRight}>
              <Text style={s.logoBarDate}>{generated}</Text>
            </View>
          </View>
          <View style={s.titleBand}>
            <View>
              <Text style={s.mastheadEyebrow}>{`Borrower Report  ·  Page 2 of ${totalPages}`}</Text>
              <Text style={s.mastheadTitle}>{countyDisplay}, {state}  ·  Market Overview</Text>
              {county && (
                <Text style={s.mastheadSub}>{tierLabel ?? ""}  ·  Composite {county.composite?.toFixed(1)}</Text>
              )}
            </View>
            {/* Market Score — compact inline stat, no border */}
            {county && (
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ fontSize: 6.5, fontFamily: "Helvetica-Bold", color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 2 }}>Market Score</Text>
                <Text style={{ fontSize: 24, fontFamily: "Helvetica-Bold", color: R.white, lineHeight: 1 }}>{county.composite?.toFixed(1)}</Text>
                <Text style={{ fontSize: 6.5, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>Rank #{county.rank} of 3,104</Text>
              </View>
            )}
          </View>
          <View style={s.redRule} />
        </>

        <View style={[s.body, { paddingTop: 10 }]}>
          <View style={[s.cols, { gap: 14, alignItems: "flex-start" }]}>

            {/* ── LEFT COLUMN: key stats + HPA Outlook ─────────────────────── */}
            <View style={{ flex: 0.38 }}>

              {/* Key market stats as compact 2-per-row grid */}
              <Sec title="Key Market Stats" />
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
                {[
                  { l: "Trailing HPA",  v: met?.zhvi_growth_1yr != null ? p1(met.zhvi_growth_1yr) : "—", s: "1-yr ZHVI" },
                  { l: "Projected HPA", v: `${hpaMid.toFixed(1)}%`, s: hpaOut ? `${hpaRange}` : "blended" },
                  { l: "Median HHI",    v: met?.median_hhi ? $k(met.median_hhi) : "—", s: "household income" },
                  { l: "Unemployment",  v: met?.unemployment_rate != null ? `${met.unemployment_rate.toFixed(1)}%` : "—", s: "local rate" },
                  { l: "Pop. Growth",   v: met?.pop_growth_pct != null ? `${met.pop_growth_pct >= 0 ? "+" : ""}${met.pop_growth_pct.toFixed(1)}%` : "—", s: "5-yr trend" },
                  { l: "Median Value",  v: met?.zhvi_latest ? $k(met.zhvi_latest) : "—", s: "ZHVI" },
                ].map((m, i) => (
                  <View key={i} style={{ width: "47%", border: `1px solid ${R.border}`, borderRadius: 2, padding: "5 7", backgroundColor: R.light }}>
                    <Text style={{ fontSize: 5.5, color: R.muted, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 2 }}>{m.l}</Text>
                    <Text style={{ fontSize: 12, fontFamily: "Helvetica-Bold", color: R.navy, lineHeight: 1 }}>{m.v}</Text>
                    <Text style={{ fontSize: 5.5, color: R.muted, marginTop: 1.5 }}>{m.s}</Text>
                  </View>
                ))}
              </View>

              {/* Home Appreciation Outlook */}
              {hpaOut && (
                <View>
                  <Sec title="Home Appreciation Outlook" sub="12-month forward signal · 5 weighted indicators" />

                  {/* Verdict badge */}
                  <View style={{ borderRadius: 3, padding: "8 10", borderWidth: 1.5, borderColor: hpaOut.color, backgroundColor: `${hpaOut.color}10`, marginBottom: 7 }} wrap={false}>
                    <Text style={{ fontSize: 13, fontFamily: "Helvetica-Bold", color: hpaOut.color, lineHeight: 1 }}>{hpaOut.label}</Text>
                    <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold", color: hpaOut.color, marginTop: 3 }}>
                      {hpaOut.hpaLow >= 0 ? "+" : ""}{hpaOut.hpaLow}–{hpaOut.hpaHigh >= 0 ? "+" : ""}{hpaOut.hpaHigh}%
                    </Text>
                    <Text style={{ fontSize: 5.5, color: R.muted, marginTop: 2 }}>implied 1-yr range</Text>
                    <Text style={{ fontSize: 6, color: R.sub, lineHeight: 1.35, marginTop: 5 }}>
                      Composite above 55 = Bullish; 40–55 = Neutral; below 40 = Bearish. Derived from price momentum, buyer pool depth, affordability, demand momentum, and macro conditions.
                    </Text>
                  </View>

                  {/* Driver chips — 2 per row */}
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
                    {(hpaOut.drivers ?? []).slice(0, 5).map((d, i) => (
                      <View key={i} style={{ width: "47%", border: `1px solid ${R.border}`, borderRadius: 2, padding: "5 7", backgroundColor: R.light }}>
                        <Text style={{ fontSize: 5.5, color: R.muted, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 2 }}>{d.label ?? d.key}</Text>
                        <Text style={{ fontSize: 12, fontFamily: "Helvetica-Bold", color: R.navy, lineHeight: 1 }}>{(d.score ?? 0).toFixed(1)}<Text style={{ fontSize: 5.5, color: R.muted }}>/10</Text></Text>
                        <Text style={{ fontSize: 5.5, color: R.muted, marginTop: 2, lineHeight: 1.3 }}>{d.detail ?? d.value ?? ""}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>

            {/* ── RIGHT COLUMN: Market Summary + Deep Dive ─────────────────── */}
            <View style={{ flex: 0.62 }}>
              <Sec title="Market Summary" />
              {county && (
                <Text style={{ fontSize: 6.5, color: R.sub, lineHeight: 1.4, marginBottom: 6 }}>
                  {countyDisplay} ranks #{county.rank} in the American Pledge Market Score universe with a composite of {county.composite?.toFixed(1)}{tierLabel ? ` (${tierLabel} tier)` : ""}.
                  {hpaOut
                    ? ` The market carries a ${hpaOut.label} appreciation outlook (${hpaRange} implied range). The 10-year projection uses a blended rate of ${hpaMid.toFixed(1)}%/yr.`
                    : met?.zhvi_growth_1yr != null
                      ? ` Trailing 12-month HPA: ${p1(met.zhvi_growth_1yr)}. Blended forward projection: ${hpaMid.toFixed(1)}%/yr.`
                      : ""}
                  {met?.unemployment_rate != null ? ` Unemployment: ${met.unemployment_rate.toFixed(1)}%.` : ""}
                  {met?.median_hhi ? ` Median HHI: ${$k(met.median_hhi)}/yr.` : ""}
                </Text>
              )}
              {deepDive && <DeepDiveBlockSm text={deepDive.replace(/\n?\*\*Execution Risks\*\*[\s\S]*$/i, "").trim()} />}
            </View>

          </View>
        </View>
        <Footer page={2} total={totalPages} date={generated} />
      </Page>

      {/* ════════════════════════════════════════════════════════════════════
          PAGE 3  ·  County Fundamentals
      ════════════════════════════════════════════════════════════════════ */}
      <Page size="LETTER" style={s.page}>
        <Masthead
          logoUrl={logoUrl}
          eyebrow={`Borrower Report  ·  Page 3 of ${totalPages}`}
          title={`${countyDisplay}, ${state}  ·  County Fundamentals`}
          sub={`Market Score #${county?.rank ?? "—"} of 3,104  ·  ${county?.tier?.replace(/_/g," ") ?? ""}  ·  Composite ${county?.composite?.toFixed(1) ?? "—"}`}
          generated={generated}
        />

        <View style={[s.body, { paddingTop: 10 }]}>
          <View style={[s.cols, { gap: 14, alignItems: "flex-start" }]}>

            {/* ── LEFT: County affordability analysis + dimension summary ─── */}
            <View style={{ flex: 0.38 }}>

              {/* County Affordability Analysis */}
              {met?.zhvi_latest && met?.median_hhi && (() => {
                const medPrice  = met.zhvi_latest;
                const hhi       = met.median_hhi;
                const rate      = kalshiMtgPct / 100 / 12;
                const n         = 360;
                const stdDown   = 0.03;
                const stdLoan   = medPrice * (1 - stdDown);
                const stdPMI_mo = medPrice * 0.008 / 12;
                const stdPI_mo  = stdLoan * (rate * Math.pow(1+rate, n)) / (Math.pow(1+rate, n) - 1);
                const stdTot    = stdPI_mo + stdPMI_mo;
                const apLoan    = medPrice * 0.80;
                const apPI_mo   = apLoan  * (rate * Math.pow(1+rate, n)) / (Math.pow(1+rate, n) - 1);
                const apContrib_med = medPrice * 0.19;
                const stdQualInc = (stdTot  / 0.43) * 12;
                const apQualInc  = (apPI_mo / 0.43) * 12;
                const stdPool_med = Math.max(0, Math.min(100, ((hhi - stdQualInc) / hhi) * 100 + 50));
                const apPool_med  = Math.max(0, Math.min(100, ((hhi - apQualInc)  / hhi) * 100 + 50));
                const liftPts   = Math.round(apPool_med - stdPool_med);
                const savings_med = Math.round(stdTot - apPI_mo);
                return (
                  <View>
                    <Sec title="County Affordability Analysis" sub={`At median home value ${$k(medPrice)} · Rate ${kalshiMtgPct.toFixed(2)}%`} />

                    {/* Payment comparison */}
                    <View style={{ flexDirection: "row", gap: 5, marginBottom: 7 }} wrap={false}>
                      <View style={{ flex: 1, border: `1px solid ${R.border}`, borderRadius: 3, padding: "7 8" }}>
                        <Text style={{ fontSize: 5.5, color: R.muted, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 2 }}>Standard 3% Down</Text>
                        <Text style={{ fontSize: 15, fontFamily: "Helvetica-Bold", color: R.navy, lineHeight: 1 }}>{$(Math.round(stdTot))}<Text style={{ fontSize: 7, color: R.muted }}>/mo</Text></Text>
                        <Text style={{ fontSize: 5.5, color: R.muted, marginTop: 2 }}>incl. PMI · {$k(stdQualInc)}/yr to qualify</Text>
                      </View>
                      <View style={{ flex: 1, border: `1.5px solid ${R.navy}`, borderRadius: 3, padding: "7 8", backgroundColor: R.navy, overflow: "hidden" }}>
                        <Text style={{ fontSize: 5.5, color: "rgba(255,255,255,0.5)", fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 2 }}>American Pledge</Text>
                        <Text style={{ fontSize: 15, fontFamily: "Helvetica-Bold", color: R.white, lineHeight: 1 }}>{$(Math.round(apPI_mo))}<Text style={{ fontSize: 7, color: "rgba(255,255,255,0.5)" }}>/mo</Text></Text>
                        <Text style={{ fontSize: 5.5, color: "rgba(255,255,255,0.5)", marginTop: 2 }}>no PMI · {$k(apQualInc)}/yr to qualify</Text>
                      </View>
                    </View>

                    {/* Affordability lift stats */}
                    <View style={{ flexDirection: "row", gap: 5, marginBottom: 7 }}>
                      <View style={{ flex: 1, border: `1px solid ${R.border}`, borderRadius: 2, padding: "5 7", backgroundColor: R.light }}>
                        <Text style={{ fontSize: 5.5, color: R.muted, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 2 }}>Monthly Savings</Text>
                        <Text style={{ fontSize: 13, fontFamily: "Helvetica-Bold", color: "#166534", lineHeight: 1 }}>{$(savings_med)}</Text>
                        <Text style={{ fontSize: 5.5, color: R.muted, marginTop: 1.5 }}>AP vs standard</Text>
                      </View>
                      <View style={{ flex: 1, border: `1px solid ${R.border}`, borderRadius: 2, padding: "5 7", backgroundColor: R.light }}>
                        <Text style={{ fontSize: 5.5, color: R.muted, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 2 }}>AP Contribution</Text>
                        <Text style={{ fontSize: 13, fontFamily: "Helvetica-Bold", color: R.navy, lineHeight: 1 }}>{$k(apContrib_med)}</Text>
                        <Text style={{ fontSize: 5.5, color: R.muted, marginTop: 1.5 }}>19% of median price</Text>
                      </View>
                    </View>

                    {/* Buyer pool lift */}
                    <View style={{ border: `1px solid #166534`, borderRadius: 3, padding: "7 9", backgroundColor: "#f0fdf4", marginBottom: 7 }} wrap={false}>
                      <Text style={{ fontSize: 5.5, color: R.muted, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 3 }}>County Buyer Pool Expansion</Text>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                        <View style={{ alignItems: "center" }}>
                          <Text style={{ fontSize: 18, fontFamily: "Helvetica-Bold", color: "#166534", lineHeight: 1 }}>{liftPts >= 0 ? "+" : ""}{liftPts}</Text>
                          <Text style={{ fontSize: 5.5, color: R.muted, marginTop: 1 }}>pts lift</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 3 }}>
                            <Text style={{ fontSize: 5.5, color: R.muted }}>Standard</Text>
                            <Text style={{ fontSize: 5.5, fontFamily: "Helvetica-Bold", color: R.muted }}>~{Math.round(Math.max(0, stdPool_med))}%</Text>
                          </View>
                          <View style={{ height: 4, backgroundColor: R.border, borderRadius: 2, marginBottom: 4 }}>
                            <View style={{ width: `${Math.min(Math.max(0, stdPool_med), 100)}%`, height: 4, backgroundColor: R.muted, borderRadius: 2 }} />
                          </View>
                          <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 3 }}>
                            <Text style={{ fontSize: 5.5, color: "#166534", fontFamily: "Helvetica-Bold" }}>American Pledge</Text>
                            <Text style={{ fontSize: 5.5, fontFamily: "Helvetica-Bold", color: "#166534" }}>~{Math.round(Math.max(0, apPool_med))}%</Text>
                          </View>
                          <View style={{ height: 4, backgroundColor: R.border, borderRadius: 2 }}>
                            <View style={{ width: `${Math.min(Math.max(0, apPool_med), 100)}%`, height: 4, backgroundColor: "#166534", borderRadius: 2 }} />
                          </View>
                        </View>
                      </View>
                    </View>

                    {/* Housing cost burden */}
                    {(() => {
                      const pti    = medPrice / hhi;
                      const burden = (apPI_mo / (hhi / 12)) * 100;
                      const stdBurden = (stdTot / (hhi / 12)) * 100;
                      return (
                        <View style={{ flexDirection: "row", gap: 5 }} wrap={false}>
                          <View style={{ flex: 1, border: `1px solid ${R.border}`, borderRadius: 2, padding: "5 7", backgroundColor: R.light }}>
                            <Text style={{ fontSize: 5.5, color: R.muted, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 2 }}>Price-to-Income</Text>
                            <Text style={{ fontSize: 13, fontFamily: "Helvetica-Bold", color: pti > 6 ? "#b91c1c" : pti > 4 ? "#d97706" : "#166534", lineHeight: 1 }}>{pti.toFixed(1)}×</Text>
                            <Text style={{ fontSize: 5.5, color: R.muted, marginTop: 1.5 }}>median price ÷ HHI</Text>
                          </View>
                          <View style={{ flex: 1, border: `1px solid ${R.border}`, borderRadius: 2, padding: "5 7", backgroundColor: R.light }}>
                            <Text style={{ fontSize: 5.5, color: R.muted, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 2 }}>AP Cost Burden</Text>
                            <Text style={{ fontSize: 13, fontFamily: "Helvetica-Bold", color: burden > 35 ? "#b91c1c" : burden > 28 ? "#d97706" : "#166534", lineHeight: 1 }}>{burden.toFixed(0)}%</Text>
                            <Text style={{ fontSize: 5.5, color: R.muted, marginTop: 1.5 }}>vs {stdBurden.toFixed(0)}% standard</Text>
                          </View>
                        </View>
                      );
                    })()}
                  </View>
                );
              })()}
            </View>

            {/* ── RIGHT: 8 Dimension Score Cards ──────────────────────────── */}
            <View style={{ flex: 0.62 }}>
              <Sec title="Dimension Scores" sub={`${countyDisplay}, ${state}  ·  Each dimension scored 0–100 by the AP Market Intelligence model`} />
              {county?.dims && (() => {
                const dims = {
                  entry_cost:              { label: "Entry Cost",         desc: "Market entry affordability — listing prices relative to local income, home value growth trends, and buyer accessibility. Higher scores indicate markets where buyers can still enter at reasonable price-to-income ratios." },
                  labor_market_momentum:   { label: "Labor Market",       desc: "Job creation, employment concentration, high-skill workforce share, and wage levels. Strong labor markets drive sustained housing demand and reduce long-term default risk." },
                  catalyst_evidence:       { label: "Catalyst Evidence",  desc: "Near-term demand triggers: new business formation, infrastructure permits, federal investment, and economic development activity signaling imminent growth." },
                  anchor_institutions:     { label: "Anchor Institutions",desc: "Presence of stable, recession-resistant employers — universities, hospitals, military bases, and government centers — that anchor local employment through economic cycles." },
                  infrastructure_readiness:{ label: "Infrastructure",     desc: "Broadband penetration, building permit activity, and physical infrastructure capacity to support population and business growth." },
                  governance:              { label: "Governance",         desc: "Local fiscal health, business climate, and regulatory environment. Markets with strong governance attract long-term investment and maintain stable public services." },
                  risk_resilience:         { label: "Risk Resilience",    desc: "Composite of FEMA natural hazard risk, economic diversification, and housing market stability. Lower-risk markets protect home values through economic disruptions." },
                  env_regulatory:          { label: "Env. / Regulatory",  desc: "Environmental quality and regulatory burden — superfund site density, environmental compliance exposure, and land-use constraints that affect long-term development potential." },
                };
                const entries = Object.entries(county.dims).filter(([k]) => !["demographic_momentum","business_dynamism","economic_distress","logistics"].includes(k));
                const rows = [];
                for (let i = 0; i < entries.length; i += 2) rows.push(entries.slice(i, i + 2));
                return rows.map((row, ri) => (
                  <View key={ri} style={{ flexDirection: "row", gap: 7, marginBottom: 7 }} wrap={false}>
                    {row.map(([key, score]) => {
                      const pct  = Math.min(score ?? 0, 100);
                      const fill = pct >= 80 ? R.navy : pct >= 60 ? "#4a7fb5" : R.muted;
                      const { label, desc } = dims[key] ?? { label: key, desc: "" };
                      return (
                        <View key={key} style={{ flex: 1, border: `1px solid ${R.border}`, borderRadius: 3, padding: "8 10" }}>
                          <Text style={{ fontSize: 5.5, color: R.muted, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 3 }}>{label}</Text>
                          <Text style={{ fontSize: 20, fontFamily: "Helvetica-Bold", color: R.navy, lineHeight: 1, marginBottom: 4 }}>{pct.toFixed(0)}</Text>
                          <View style={{ height: 3, backgroundColor: R.border, borderRadius: 1.5, marginBottom: 5 }}>
                            <View style={{ width: `${pct}%`, height: 3, backgroundColor: fill, borderRadius: 1.5 }} />
                          </View>
                          <Text style={{ fontSize: 6.5, color: R.sub, lineHeight: 1.35 }}>{desc}</Text>
                        </View>
                      );
                    })}
                  </View>
                ));
              })()}
            </View>

          </View>
        </View>
        <Footer page={3} total={totalPages} date={generated} />
      </Page>

      {/* ════════════════════════════════════════════════════════════════════
          PAGE 4  ·  Schools & Education Quality
      ════════════════════════════════════════════════════════════════════ */}
      {(() => {
        const edPct = met?.edfacts_proficiency ?? null;
        const edTier = edPct == null ? null
          : edPct > 60 ? { grade: "A", label: "Top-Tier",     color: "#166534", text: "Top-tier district quality. Consistently commands a valuation premium — strong family demand driver in buyer-competitive segments." }
          : edPct > 45 ? { grade: "B", label: "Above Average", color: "#1e40af", text: "Above-average district performance. Competitive schools that attract family households and support sustained price demand." }
          : edPct > 30 ? { grade: "C", label: "Average",       color: "#92400e", text: "Average district quality. Adequate for broad-market appeal but not a primary demand driver for family-focused buyer targeting." }
          : edPct > 15 ? { grade: "D", label: "Below Average", color: "#d97706", text: "Below-average proficiency. School quality is a headwind for family household demand; offset by other market strengths." }
          :              { grade: "F", label: "Low",           color: "#b91c1c", text: "Low district proficiency. School quality is a material risk factor for family-oriented buyer demand in this market." };

        // School listings: use GreatSchools if available, else fall back to Google Places
        // Helper: map GreatSchools rating_band to a compact letter + color
        const gsBand = (ratingBand) => {
          if (!ratingBand) return null;
          const b = ratingBand.toLowerCase();
          if (b.includes("above"))  return { letter: "A", color: "#166534" };
          if (b.includes("average")) return { letter: "B", color: R.navy };
          if (b.includes("below"))  return { letter: "C", color: "#d97706" };
          if (b === "low")          return { letter: "D", color: "#b91c1c" };
          return null;
        };

        const gsLevels = [
          { label: "Elementary", keys: ["e", "p", "k"] },
          { label: "Middle",     keys: ["m"] },
          { label: "High",       keys: ["h"] },
        ];
        // level-codes is a comma-separated string like "p,e,m" — split and check each part
        const matchesLevel = (school, keys) => {
          const parts = (school.type ?? "").toLowerCase().split(",").map(t => t.trim());
          return keys.some(k => parts.some(p => p.startsWith(k)));
        };
        const groupedSchools = greatSchools?.length
          ? gsLevels.map(({ label: lvl, keys }) => ({
              label: lvl,
              // Only include schools that have a GreatSchools rating — private/charter schools are unrated
              schools: greatSchools.filter(s => matchesLevel(s, keys) && s.ratingBand && s.ratingBand !== "null").slice(0, 6),
            })).filter(g => g.schools.length > 0)
          : [];
        const totalSchools = greatSchools?.length ?? 0;
        const ratedSchools = greatSchools?.filter(s => s.ratingBand && s.ratingBand !== "null").length ?? 0;
        // Unrated schools (private/charter) grouped by level — shown separately
        const groupedUnrated = greatSchools?.length
          ? gsLevels.map(({ label: lvl, keys }) => ({
              label: lvl,
              schools: greatSchools.filter(s => matchesLevel(s, keys) && (!s.ratingBand || s.ratingBand === "null")).slice(0, 4),
            })).filter(g => g.schools.length > 0)
          : [];

        // Google Places fallback — already fetched as part of nearbyPlaces
        const googleSchools = (nearbyPlaces?.Schools ?? []).slice(0, 8);
        const useGoogleSchools = !groupedSchools.length && googleSchools.length > 0;

        return (
          <Page size="LETTER" style={s.page}>
            <Masthead
              logoUrl={logoUrl}
              eyebrow={`Borrower Report  ·  Page 4 of ${totalPages}`}
              title="Schools & Education Quality"
              sub={`${countyDisplay}, ${state}  ·  District data: NCES EDFacts SY2021-22  ·  Nearby schools: Google Places`}
              generated={generated}
            />


            <View style={s.body}>
              <View style={s.cols}>
                {/* Left: District quality */}
                <View style={{ flex: 0.42 }}>
                  <Sec title="District Education Quality" sub="NCES EDFacts SY2021-22 · % students at or above proficiency in math & reading" />

                  {edTier ? (
                    <>
                      <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start", marginBottom: 12 }} wrap={false}>
                        <View style={{ borderRadius: 3, padding: "12 16", borderWidth: 1.5, borderColor: edTier.color, alignItems: "center", minWidth: 56, backgroundColor: `${edTier.color}0f` }}>
                          <Text style={{ fontSize: 32, fontFamily: "Helvetica-Bold", color: edTier.color, lineHeight: 1 }}>{edTier.grade}</Text>
                          <Text style={{ fontSize: 6.5, color: edTier.color, fontFamily: "Helvetica-Bold", marginTop: 3, letterSpacing: 0.5 }}>{edTier.label}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 26, fontFamily: "Helvetica-Bold", color: R.navy, lineHeight: 1 }}>{edPct.toFixed(1)}%</Text>
                          <Text style={{ fontSize: 7, color: R.muted, marginTop: 2, marginBottom: 6 }}>students at/above proficiency</Text>
                          <View style={{ height: 6, backgroundColor: R.border, borderRadius: 3 }}>
                            <View style={{ width: `${Math.min(edPct, 100)}%`, height: 6, backgroundColor: edTier.color, borderRadius: 3 }} />
                          </View>
                          <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 2 }}>
                            <Text style={{ fontSize: 5.5, color: R.muted }}>0%</Text>
                            <Text style={{ fontSize: 5.5, color: R.muted }}>100%</Text>
                          </View>
                        </View>
                      </View>
                      <View style={[s.noteBox, { borderLeftColor: edTier.color }]}>
                        <Text style={[s.noteHead, { color: edTier.color }]}>What This Means</Text>
                        <Text style={s.noteBody}>{edTier.text}</Text>
                      </View>
                    </>
                  ) : (
                    <View style={[s.noteBox, { borderLeftColor: R.muted }]}>
                      <Text style={[s.noteHead, { color: R.muted }]}>No District Data</Text>
                      <Text style={s.noteBody}>EDFacts proficiency data is not available for this county. Check the National Center for Education Statistics at nces.ed.gov for the most recent district report.</Text>
                    </View>
                  )}

                  {/* Grade scale legend */}
                  <View style={{ marginTop: 12 }} wrap={false}>
                    <Text style={[s.statL, { marginBottom: 6 }]}>Proficiency Tier Scale</Text>
                    {[
                      { g: "A", rng: "> 60%",  label: "Top-Tier",     color: "#166534" },
                      { g: "B", rng: "46–60%", label: "Above Average", color: "#1e40af" },
                      { g: "C", rng: "31–45%", label: "Average",       color: "#92400e" },
                      { g: "D", rng: "16–30%", label: "Below Average", color: "#d97706" },
                      { g: "F", rng: "< 16%",  label: "Low",           color: "#b91c1c" },
                    ].map(({ g, rng, label: tl, color }) => (
                      <View key={g} style={{ flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 4 }}>
                        <View style={{ width: 16, height: 16, borderRadius: 2, backgroundColor: color, alignItems: "center", justifyContent: "center" }}>
                          <Text style={{ fontSize: 8, fontFamily: "Helvetica-Bold", color: R.white }}>{g}</Text>
                        </View>
                        <Text style={{ fontSize: 7, fontFamily: "Helvetica-Bold", color: R.ink, width: 38 }}>{rng}</Text>
                        <Text style={{ fontSize: 7, color: R.sub }}>{tl}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Right: Nearby Schools */}
                <View style={{ flex: 0.58 }}>
                  {groupedSchools.length > 0 ? (
                    // GreatSchools data (if API ever responds)
                    <>
                      <Sec title="Nearby Schools" sub={`${ratedSchools} rated public schools (of ${totalSchools} nearby) · Private schools unrated by GreatSchools`} />
                      {groupedSchools.map(({ label: lvl, schools: lvlSchools }) => (
                        <View key={lvl} style={{ marginBottom: 8 }}>
                          <View style={{ flexDirection: "row", justifyContent: "space-between", paddingBottom: 2, marginBottom: 1, borderBottomWidth: 0.75, borderBottomColor: R.navy }}>
                            <Text style={{ fontSize: 5.5, fontFamily: "Helvetica-Bold", color: R.navy, textTransform: "uppercase", letterSpacing: 0.5 }}>{lvl}</Text>
                            <Text style={{ fontSize: 5.5, fontFamily: "Helvetica-Bold", color: R.navy, textTransform: "uppercase", letterSpacing: 0.5 }}>Rating</Text>
                          </View>
                          {lvlSchools.map((sch, i) => {
                            const band = gsBand(sch.ratingBand);
                            return (
                              <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 3, borderBottomWidth: 0.5, borderBottomColor: R.border }}>
                                <Text style={{ fontSize: 6.5, color: R.sub, flex: 1 }}>{sch.name}</Text>
                                {band && (
                                  <View style={{ borderRadius: 2, paddingVertical: 2, paddingHorizontal: 6, backgroundColor: band.color }}>
                                    <Text style={{ fontSize: 6, fontFamily: "Helvetica-Bold", color: R.white, letterSpacing: 0.3 }}>{sch.ratingBand}</Text>
                                  </View>
                                )}
                              </View>
                            );
                          })}
                        </View>
                      ))}
                      {/* Private / Charter schools — no GreatSchools rating */}
                      {groupedUnrated.length > 0 && (
                        <View style={{ marginTop: 4 }}>
                          <View style={{ flexDirection: "row", justifyContent: "space-between", paddingBottom: 2, marginBottom: 1, borderBottomWidth: 0.75, borderBottomColor: R.muted }}>
                            <Text style={{ fontSize: 5.5, fontFamily: "Helvetica-Bold", color: R.muted, textTransform: "uppercase", letterSpacing: 0.5 }}>Private / Charter (unrated)</Text>
                          </View>
                          {groupedUnrated.map(({ label: lvl, schools: uvlSchools }) => (
                            <View key={lvl} style={{ marginBottom: 5 }}>
                              <Text style={{ fontSize: 5.5, color: R.muted, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 2 }}>{lvl}</Text>
                              {uvlSchools.map((sch, i) => (
                                <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 2.5, borderBottomWidth: 0.5, borderBottomColor: R.border }}>
                                  <Text style={{ fontSize: 6, color: R.muted, flex: 1 }}>{sch.name}</Text>
                                  <Text style={{ fontSize: 5.5, color: R.muted, fontFamily: "Helvetica-Bold" }}>Private</Text>
                                </View>
                              ))}
                            </View>
                          ))}
                        </View>
                      )}
                    </>
                  ) : useGoogleSchools ? (
                    // Google Places fallback
                    <>
                      <Sec title="Nearby Schools" sub={`${googleSchools.length} schools within 8km · Google Places ratings (1–5 ★)`} />
                      <View style={{ borderBottomWidth: 0.75, borderBottomColor: R.navy, flexDirection: "row", justifyContent: "space-between", paddingBottom: 2, marginBottom: 1 }}>
                        <Text style={{ fontSize: 5.5, fontFamily: "Helvetica-Bold", color: R.navy, textTransform: "uppercase", letterSpacing: 0.5 }}>School</Text>
                        <Text style={{ fontSize: 5.5, fontFamily: "Helvetica-Bold", color: R.navy, textTransform: "uppercase", letterSpacing: 0.5 }}>Rating</Text>
                      </View>
                      {googleSchools.map((sch, i) => (
                        <View key={i} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 3, borderBottomWidth: 0.5, borderBottomColor: R.border }}>
                          <Text style={{ fontSize: 6.5, color: R.sub, flex: 1 }}>{sch.name}</Text>
                          {sch.rating != null ? (
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                              <View style={{ width: 20, height: 20, borderRadius: 3, alignItems: "center", justifyContent: "center", backgroundColor: sch.rating >= 4 ? "#166534" : sch.rating >= 3 ? R.navy : "#d97706" }}>
                                <Text style={{ fontSize: 7.5, fontFamily: "Helvetica-Bold", color: R.white, lineHeight: 1 }}>{sch.rating.toFixed(1)}</Text>
                              </View>
                              <Text style={{ fontSize: 6, color: R.muted }}>/5</Text>
                            </View>
                          ) : (
                            <Text style={{ fontSize: 6.5, color: R.muted }}>NR</Text>
                          )}
                        </View>
                      ))}
                      <View style={{ marginTop: 9, backgroundColor: R.light, borderRadius: 2, padding: "7 9", border: `1px solid ${R.border}` }}>
                        <Text style={{ fontSize: 6, color: R.muted, lineHeight: 1.6 }}>
                          Ratings from Google Places (1–5 scale). Source reflects community reviews. For academic performance data, the EDFacts district proficiency score at left is more reliable. GreatSchools ratings (1–10) will appear here when available.
                        </Text>
                      </View>
                    </>
                  ) : (
                    <View>
                      <Sec title="Nearby Schools" />
                      <View style={[s.noteBox, { borderLeftColor: R.navy }]}>
                        <Text style={[s.noteHead, { color: R.navy }]}>District Data Only</Text>
                        <Text style={s.noteBody}>Individual school listings are not available for this area. The EDFacts district proficiency score reflects the aggregate performance of all public schools in {countyDisplay} County. Visit greatschools.org to search individual schools by address.</Text>
                      </View>
                    </View>
                  )}
                </View>
              </View>
            </View>
            <Footer page={4} total={totalPages} date={generated} />
          </Page>
        );
      })()}

      {/* ════════════════════════════════════════════════════════════════════
          PAGE 5  ·  Estimated Home Value
      ════════════════════════════════════════════════════════════════════ */}
      <Page size="LETTER" style={s.page}>
        <Masthead
          logoUrl={logoUrl}
          eyebrow={`Borrower Report  ·  Page 5 of ${totalPages}`}
          title="Estimated Home Value"
          sub={`${address}  ·  Automated Valuation Model`}
          generated={generated}
        />

        {/* Value metrics bar */}
        <View style={s.metricsBar}>
          {[
            { l: "Listing Price",   v: $(price),   s: "as provided" },
            avmValue
              ? { l: "AVM Estimate", v: avmValue >= 1e6 ? `$${(avmValue/1e6).toFixed(2)}M` : $(avmValue), s: `${avmComps?.length ?? 0} comparable sales` }
              : { l: "AVM Estimate", v: "—",        s: "not available" },
            { l: "Range Low",  v: avmLow  ? $(avmLow)  : "—", s: "lower bound" },
            { l: "Range High", v: avmHigh ? $(avmHigh) : "—", s: "upper bound" },
            { l: "Price vs AVM", v: avmValue ? `${((price / avmValue - 1) * 100).toFixed(1)}%` : "—",
              s: avmValue ? (price > avmValue ? "above estimate" : "below estimate") : "n/a" },
          ].map((m, i, a) => (
            <View key={i} style={i < a.length - 1 ? s.mCell : s.mCellL}>
              <Text style={s.mLabel}>{m.l}</Text>
              <Text style={s.mVal}>{m.v}</Text>
              <Text style={s.mSub}>{m.s}</Text>
            </View>
          ))}
        </View>

        <View style={s.body}>
          {/* Valuation context — listing vs AVM guidance */}
          {(() => {
            if (!avmValue) return null;
            const pctDiff = (price - avmValue) / avmValue * 100;
            const { label, color, text } =
              pctDiff > 10  ? { label: "Above Market",   color: "#b91c1c", text: `Listed ${pctDiff.toFixed(1)}% above the estimated value. This property may have negotiation room, or unique features that justify the premium. Consider requesting a seller concession or price reduction backed by the comps below.` }
            : pctDiff > 3   ? { label: "Slightly Above", color: "#d97706", text: `Listed ${pctDiff.toFixed(1)}% above the AVM estimate — within normal market variation. A competitive offer near list price is likely warranted; use the comp data to gauge how much flexibility the seller may have.` }
            : pctDiff < -10 ? { label: "Below Market",   color: "#166534", text: `Listed ${Math.abs(pctDiff).toFixed(1)}% below the estimated value — a potential immediate equity opportunity. Properties priced this far below AVM tend to attract multiple offers; moving quickly is advisable.` }
            : pctDiff < -3  ? { label: "Slight Discount", color: "#166534", text: `Listed ${Math.abs(pctDiff).toFixed(1)}% below the AVM estimate — a modest value opportunity. The market likely supports an offer at or close to list price.` }
            : { label: "At Market", color: "#1e40af", text: `Listed near the estimated market value. The AVM and listing price are aligned, suggesting fair market pricing. Negotiation room is typically limited at this spread.` };
            return (
              <View style={[s.noteBox, { borderLeftColor: color, marginBottom: 10 }]}>
                <Text style={[s.noteHead, { color }]}>{label}</Text>
                <Text style={s.noteBody}>{text}</Text>
              </View>
            );
          })()}

          {/* Comparable sales table */}
          {avmComps?.length > 0 && (
            <View style={{ marginBottom: 10 }} wrap={false}>
              <Sec title="Comparable Sales" sub="Recent sales used by the AVM to estimate this property's value. Sorted by relevance (match score)." />
              <View style={s.tWrap}>
                <View style={s.thead}>
                  {[["Address", 2.2], ["Sale Price", 1], ["Sq Ft", 0.8], ["$/Sqft", 0.8], ["Bd/Ba", 0.7], ["Match", 0.7]].map(([h, fl], i) => (
                    <Text key={i} style={[s.th, { flex: fl }]}>{h}</Text>
                  ))}
                </View>
                {avmComps.slice(0, 7).map((c, i) => {
                  const shortAddr = (c.formattedAddress || c.addressLine1 || "—").replace(/,.*/, "").slice(0, 32);
                  const matchPct  = c.correlation != null ? `${(c.correlation * 100).toFixed(0)}%` : "—";
                  const ppsf      = c.pricePerSquareFoot ?? (c.price && c.squareFootage ? Math.round(c.price / c.squareFootage) : null);
                  return (
                    <View key={i} style={i % 2 === 1 ? s.trAlt : s.tr}>
                      <Text style={[s.td,  { flex: 2.2 }]}>{shortAddr}</Text>
                      <Text style={[s.tdB, { flex: 1   }]}>{$(c.price)}</Text>
                      <Text style={[s.td,  { flex: 0.8 }]}>{c.squareFootage ? Math.round(c.squareFootage).toLocaleString() : "—"}</Text>
                      <Text style={[s.td,  { flex: 0.8 }]}>{ppsf ? `$${ppsf}` : "—"}</Text>
                      <Text style={[s.td,  { flex: 0.7 }]}>{c.bedrooms ?? "—"}/{c.bathrooms ?? "—"}</Text>
                      <Text style={[s.tdB, { flex: 0.7 }]}>{matchPct}</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* Methodology + buyer guidance */}
          <View style={s.cols}>
            <View style={[s.col, { flex: 0.55 }]}>
              <Sec title="How to Use This Valuation" />
              {[
                { t: "AVM is a starting point, not a final appraisal", b: "The Automated Valuation Model uses algorithm-matched comparable sales and hedonic pricing factors. It is most accurate in high-transaction markets and least reliable in rural or unique-property areas." },
                { t: "Listing price reflects seller expectations", b: "A listing above the AVM range may be negotiable, or may reflect upgrades not captured in public records. Ask the listing agent for a seller's disclosure and recent renovation list." },
                { t: "Appraisal contingency protects you", b: "With conventional financing, an appraisal contingency means you won't be obligated to pay above appraised value unless you choose to. Review your offer's contingency terms carefully." },
                { t: "Match score drives confidence", b: "Comps with 85%+ match scores are the strongest signals. Low match scores (below 60%) indicate the AVM may be extrapolating from dissimilar properties — treat the estimate as a wider range." },
              ].map(({ t, b }, i) => (
                <View key={i} style={s.bullet}>
                  <View style={s.bulletDot} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.bulletT}>{t}</Text>
                    <Text style={s.bulletB}>{b}</Text>
                  </View>
                </View>
              ))}
            </View>
            <View style={[s.col, { flex: 0.45 }]}>
              <Sec title="AVM Methodology" />
              <View style={[s.noteBox, { borderLeftColor: R.navy }]}>
                <Text style={[s.noteHead, { color: R.navy }]}>Rentcast Automated Valuation</Text>
                <Text style={s.noteBody}>
                  The AVM is produced by Rentcast using a hedonic regression model trained on county-level MLS transaction data. Comparable sales are weighted by property similarity (bedrooms, bathrooms, square footage, year built), geographic proximity, and recency.{"\n\n"}
                  The confidence range (low–high) represents the 80% prediction interval. A narrow spread ({"<"}10% of midpoint) indicates high model confidence; a wide spread ({">"}20%) signals limited nearby transaction data.{"\n\n"}
                  For newly listed, recently renovated, or architecturally unique properties, AVM estimates may diverge from true market value. A licensed appraiser's opinion of value (BPO or appraisal) should be the final reference for purchase decisions.
                </Text>
              </View>
            </View>
          </View>
        </View>
        <Footer page={5} total={totalPages} date={generated} />
      </Page>

      {/* ════════════════════════════════════════════════════════════════════
          PAGE 6  ·  Loan Comparison & Equity Projections
      ════════════════════════════════════════════════════════════════════ */}
      <Page size="LETTER" style={s.page}>
        <Masthead
          logoUrl={logoUrl}
          eyebrow={`Borrower Report  ·  Page 6 of ${totalPages}`}
          title="Loan Comparison & Investment Outcome"
          sub={`${address}  ·  ${kalshiMtgPct.toFixed(2)}% 30-yr fixed  ·  HPA ${hpaMid.toFixed(1)}%/yr`}
          generated={generated}
        />

        {/* Metrics bar */}
        <View style={s.metricsBar}>
          {[
            avmValue
              ? { l: "Est. Current Value", v: avmValue >= 1e6 ? `$${(avmValue/1e6).toFixed(2)}M` : $(avmValue), s: avmLow && avmHigh ? `$${(avmLow/1e6).toFixed(2)}M – $${(avmHigh/1e6).toFixed(2)}M range` : "Rentcast AVM" }
              : { l: "Est. Current Value", v: $(price),                              s: "CS appreciation" },
            { l: "Monthly Savings",       v: savings != null ? $(savings) : "—",    s: "AP vs standard loan" },
            { l: "AP Contribution",       v: $(apContrib),                          s: "19% of price" },
            { l: "10-yr Est. Value",      v: $(price * Math.pow(1 + projHpa, 10)), s: `at ${hpaMid.toFixed(1)}%/yr blended HPA` },
            { l: "Min. Income (AP)",      v: apPI != null ? `$${Math.round((apPI / 0.43) * 12 / 1000)}k/yr` : "—", s: "to qualify at 43% DTI" },
          ].map((m, i, a) => (
            <View key={i} style={i < a.length - 1 ? s.mCell : s.mCellL}>
              <Text style={s.mLabel}>{m.l}</Text>
              <Text style={s.mVal}>{m.v}</Text>
              <Text style={s.mSub}>{m.s}</Text>
            </View>
          ))}
        </View>

        <View style={s.body}>

          {/* ── TWO-COLUMN: Loan Comparison (left) + Equity Table (right) ── */}
          <View style={{ flexDirection: "row", gap: 12, alignItems: "flex-start", marginBottom: 10 }}>

            {/* LEFT — Loan Comparison */}
            <View style={{ flex: 0.42 }}>
              <Sec
                title="Loan Comparison"
                sub={`${kalshiMtgPct.toFixed(2)}% 30-yr fixed  ·  Std: ${stdLbl} dn  ·  AP: 1% + 19% = 20%, no PMI`}
              />
              {/* Standard card */}
              <View style={{ border: `1px solid ${R.border}`, borderRadius: 3, marginBottom: 8 }}>
                <View style={s.lHead}><Text style={s.lTitle}>Standard Loan  ·  {stdLbl} Down</Text></View>
                <View style={s.lBody}>
                  <Text style={s.lBig}>{$(stdTotal)}<Text style={{ fontSize: 8, color: R.muted }}>/mo</Text></Text>
                  <Text style={s.lSub}>P&I: {$(stdPI)}{stdPMI > 0 ? `  +  ${$(stdPMI)} PMI` : ""}</Text>
                  {stdDTI  != null && <LR label="Housing DTI"            val={`${stdDTI.toFixed(1)}%`} />}
                  {stdPool != null && <LR label="Qualifying Households"  val={`~${stdPool.toFixed(0)}%`} />}
                  {hhi     != null && <LR label="Min. Qualifying Income" val={`${$k((stdTotal / 0.43) * 12)}/yr`} />}
                  {hhi     != null && (() => {
                    const d = (stdTotal / 0.43) * 12 - hhi;
                    return <LR label="vs Median HHI" val={`${d > 0 ? "▲" : "▼"} ${$k(Math.abs(d))}`} />;
                  })()}
                </View>
              </View>
              {/* AP card */}
              <View style={{ borderRadius: 3, marginBottom: 10, overflow: "hidden" }}>
                <View style={s.lHeadN}><Text style={s.lTitleW}>American Pledge  ·  1% Buyer + 19% AP</Text></View>
                <View style={[s.lBody, { backgroundColor: R.navy }]}>
                  <Text style={s.lBigW}>{$(apPI)}<Text style={{ fontSize: 8, color: "rgba(255,255,255,0.5)" }}>/mo</Text></Text>
                  <Text style={s.lSubW}>P&I: {$(apPI)}  ·  No PMI</Text>
                  {apDTI  != null && <LR white label="Housing DTI"            val={`${apDTI.toFixed(1)}%`} />}
                  {apPool != null && <LR white label="Qualifying Households"  val={`~${apPool.toFixed(0)}%`} />}
                  {hhi    != null && <LR white label="Min. Qualifying Income" val={`${$k((apPI / 0.43) * 12)}/yr`} />}
                  {hhi    != null && (() => {
                    const d = (apPI / 0.43) * 12 - hhi;
                    return <LR white label="vs Median HHI" val={`${d > 0 ? "▲" : "▼"} ${$k(Math.abs(d))}`} />;
                  })()}
                </View>
              </View>

              {/* Rental Estimate — compact, fits under loan cards */}
              {rentalEstimate?.rent && (() => {
                const taxEst   = Math.round((avmValue ?? price) * 0.011 / 12);
                const insEst   = Math.round((avmValue ?? price) * 0.005 / 12);
                const ownTotal = apPI != null ? apPI + taxEst + insEst + 150 : null;
                const diff     = ownTotal != null ? ownTotal - rentalEstimate.rent : null;
                const breakEvenYr = diff > 0
                  ? Math.ceil(((avmValue ?? price) * (projHpa ?? 0.03)) / (diff * 12))
                  : null;
                return (
                  <View style={{ backgroundColor: R.light, border: `1px solid ${R.border}`, borderRadius: 3, padding: "7 9", marginTop: 8 }} wrap={false}>
                    <Text style={[s.statL, { marginBottom: 4 }]}>Rental Estimate  ·  Rentcast AVM</Text>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
                      <View>
                        <Text style={{ fontSize: 15, fontFamily: "Helvetica-Bold", color: R.navy, lineHeight: 1 }}>{$(rentalEstimate.rent)}<Text style={{ fontSize: 7.5, color: R.muted }}>/mo</Text></Text>
                        {rentalEstimate.rentLow && rentalEstimate.rentHigh && (
                          <Text style={{ fontSize: 5.5, color: R.muted, marginTop: 1 }}>{$(rentalEstimate.rentLow)}–{$(rentalEstimate.rentHigh)} range</Text>
                        )}
                      </View>
                      {ownTotal != null && (
                        <View style={{ alignItems: "flex-end" }}>
                          <Text style={{ fontSize: 5.5, color: R.muted, marginBottom: 1 }}>AP All-In</Text>
                          <Text style={{ fontSize: 11, fontFamily: "Helvetica-Bold", color: R.navy, lineHeight: 1 }}>{$(ownTotal)}<Text style={{ fontSize: 6, color: R.muted }}>/mo</Text></Text>
                          {diff <= 0 && <Text style={{ fontSize: 6, fontFamily: "Helvetica-Bold", color: "#166534", marginTop: 2 }}>Cheaper than renting</Text>}
                          {diff > 0 && breakEvenYr != null && <Text style={{ fontSize: 6, fontFamily: "Helvetica-Bold", color: "#166534", marginTop: 2 }}>Own beats rent ~yr {breakEvenYr}</Text>}
                        </View>
                      )}
                    </View>
                  </View>
                );
              })()}
            </View>

            {/* RIGHT — 10-Year Equity & Investment Outcome + Appreciation Scenarios */}
            <View style={{ flex: 0.58 }}>
              <Sec
                title="10-Year Equity & Investment Outcome"
                sub={`HPA: ${hpaMid.toFixed(1)}%/yr  ·  "AP + Savings" adds cumulative monthly savings vs standard`}
              />
              <View style={s.tWrap}>
                <View style={s.thead}>
                  {[
                    ["Yr", 0.35], [`Std ${stdLbl}`, 1], ["AP Net", 1],
                    ["AP+Sav", 1], ["vs Std", 1], ["Est. Val", 1],
                  ].map(([h, fl], i) => (
                    <Text key={i} style={[s.th, { flex: fl }]}>{h}</Text>
                  ))}
                </View>
                {rows.map(({ yr, fv, se, ae, ap, vs }, i) => (
                  <View key={yr} style={i % 2 === 1 ? s.trAlt : s.tr}>
                    <Text style={[s.tdB, { flex: 0.35 }]}>{yr}</Text>
                    <Text style={[s.td,  { flex: 1    }]}>{$(se)}</Text>
                    <Text style={[s.td,  { flex: 1    }]}>{$(ae)}</Text>
                    <Text style={[s.tdB, { flex: 1    }]}>{$(ap)}</Text>
                    <Text style={[vs >= 0 ? s.tdPos : s.tdNeg, { flex: 1, textAlign: "right" }]}>{vs >= 0 ? "+" : ""}{$(vs)}</Text>
                    <Text style={[s.tdM, { flex: 1    }]}>{$(fv)}</Text>
                  </View>
                ))}
              </View>

              {/* Appreciation Scenarios — right column, under equity table */}
              <Sec title="Appreciation Scenarios" sub="Bear / Base / Bull — 5 & 10-yr home value" />
              {(() => {
                const bearHpa  = Math.max((projHpa ?? 0) - 0.015, -0.05);
                const baseHpa  = projHpa ?? 0;
                const bullHpa  = (projHpa ?? 0) + 0.015;
                const scenarios = [
                  { label: "Bear", hpa: bearHpa, color: "#b91c1c", bgColor: "#fff1f2", borderColor: "#fca5a5" },
                  { label: "Base", hpa: baseHpa, color: R.navy,    bgColor: R.light,   borderColor: R.border  },
                  { label: "Bull", hpa: bullHpa, color: "#166534", bgColor: "#f0fdf4", borderColor: "#86efac" },
                ];
                return (
                  <View style={{ flexDirection: "row", gap: 6 }} wrap={false}>
                    {scenarios.map(({ label: slabel, hpa, color, bgColor, borderColor }) => {
                      const v5   = price * Math.pow(1 + hpa, 5);
                      const v10  = price * Math.pow(1 + hpa, 10);
                      const pct5  = (v5  / price - 1) * 100;
                      const pct10 = (v10 / price - 1) * 100;
                      return (
                        <View key={slabel} style={{ flex: 1, border: `1px solid ${borderColor}`, borderRadius: 3, backgroundColor: bgColor, overflow: "hidden" }}>
                          <View style={{ backgroundColor: color, padding: "4 8" }}>
                            <Text style={{ fontSize: 6.5, fontFamily: "Helvetica-Bold", color: R.white, textTransform: "uppercase", letterSpacing: 0.8 }}>{slabel}</Text>
                            <Text style={{ fontSize: 6, color: "rgba(255,255,255,0.7)", marginTop: 1 }}>{(hpa * 100).toFixed(1)}%/yr HPA</Text>
                          </View>
                          <View style={{ padding: "6 8" }}>
                            <Text style={{ fontSize: 5.5, color: R.muted, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 1.5 }}>5-Year Value</Text>
                            <Text style={{ fontSize: 12, fontFamily: "Helvetica-Bold", color, lineHeight: 1 }}>{v5 >= 1e6 ? `$${(v5/1e6).toFixed(2)}M` : $k(v5)}</Text>
                            <Text style={{ fontSize: 6, color: R.muted, marginBottom: 5 }}>{pct5 >= 0 ? "+" : ""}{pct5.toFixed(1)}% vs today</Text>
                            <Text style={{ fontSize: 5.5, color: R.muted, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 1.5 }}>10-Year Value</Text>
                            <Text style={{ fontSize: 12, fontFamily: "Helvetica-Bold", color, lineHeight: 1 }}>{v10 >= 1e6 ? `$${(v10/1e6).toFixed(2)}M` : $k(v10)}</Text>
                            <Text style={{ fontSize: 6, color: R.muted }}>{pct10 >= 0 ? "+" : ""}{pct10.toFixed(1)}% vs today</Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                );
              })()}
            </View>
          </View>

          {/* Methodology */}
          <View style={{ backgroundColor: R.light, border: `1px solid ${R.border}`, borderRadius: 3, padding: "9 11" }}>
            <Text style={[s.statL, { marginBottom: 3 }]}>Methodology</Text>
            <Text style={{ fontSize: 6.5, color: R.muted, lineHeight: 1.7 }}>
              AP tranche compounds annually: prior claim + (annual appreciation × AP return share %) + stewardship fee ($900/yr yrs 1–5, $0 thereafter). AP Net Equity = home value − senior loan balance (30-yr amortizing on 80% principal) − AP's compounded claim. "AP + Savings" adds cumulative monthly savings vs the standard {stdLbl} comparison loan. "vs Standard" = (AP + Savings) minus standard equity at same year. HPA uses {hpaMid.toFixed(1)}% (forward-looking implied midpoint). All figures nominal.
            </Text>
          </View>

        </View>
        <Footer page={6} total={totalPages} date={generated} />
      </Page>

      {/* ════════════════════════════════════════════════════════════════════
          PAGE 7  ·  About American Pledge
      ════════════════════════════════════════════════════════════════════ */}
      <Page size="LETTER" style={s.page}>
        <Masthead
          logoUrl={logoUrl}
          eyebrow={`Borrower Report  ·  Page 7 of ${totalPages}`}
          title="The American Pledge Program"
          sub="A private-capital housing finance platform that makes homeownership accessible — without compromising your financial position"
          generated={generated}
        />

        <View style={s.body}>

          {/* How It Works */}
          <Sec title="How American Pledge Works" />

          {[
            {
              n: "1", t: "You put down just 1% — American Pledge covers the rest of your down payment",
              b: `You bring 1% of the purchase price (${$(AP_BUYER_DOWN * price)} on this property). American Pledge contributes the remaining 19% (${$(apContrib)}) to reach a full 20% down payment — the threshold that eliminates private mortgage insurance. You close with less cash out of pocket, a lower monthly payment, and no PMI, ever.`,
            },
            {
              n: "2", t: "Your loan is structured on 80% of the home value from day one",
              b: `Your senior mortgage is based on ${$(price * 0.80)}, compared to ${$(price * (1 - stdDP))} on a standard ${stdLbl} down loan. The lower principal balance is the direct source of your payment reduction — not a teaser rate, not deferred interest. Your loan is a fully amortizing 30-year conventional mortgage, compliant with Fannie Mae and Freddie Mac guidelines.`,
            },
            {
              n: "3", t: "Built-in Hardship Assistance Fund protects you through life's disruptions",
              b: "The Hardship Assistance Fund (HAF) covers verified mortgage payments during documented disruptions — job loss, medical emergency, divorce, death of a wage earner, or major uninsured property repair. Payments go directly to your loan servicer, not to you, keeping your loan current. HUD-aligned financial counseling is included. The program targets early defaults, which are concentrated in the first five years.",
            },
            {
              n: "4", t: "When you sell, American Pledge receives a share of the home's appreciation",
              b: `AP's appreciation return share starts at 46% in year 1 and adjusts annually per the schedule shown on page 3. In exchange, you received a lower payment, no PMI, and hardship protection. The appreciation share is treated as contingent interest under IRS Rev. Rul. 83-51 — it is not a second lien, creates no taxable income at closing, and reduces your capital gain at sale. The program's goal is to leave you in a comparable — or better — net equity position to a standard loan by the time you sell.`,
            },
          ].map(({ n, t, b }) => (
            <View key={n} style={s.stepRow}>
              <View style={s.stepNum}><Text style={s.stepN}>{n}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={s.stepT}>{t}</Text>
                <Text style={s.stepB}>{b}</Text>
              </View>
            </View>
          ))}

          {/* Two col: Value prop + comparison table */}
          <View style={[s.cols, { marginTop: 4 }]}>

            {/* Left: Borrower value prop */}
            <View style={[s.col, { flex: 0.45 }]}>
              <Sec title="Borrower Value Proposition" />
              {[
                { t: "Lower monthly payment",          b: `${$(apPI)}/mo vs ${$(stdTotal)}/mo — a ${$(savings ?? 0)}/mo reduction that lasts the life of the loan.` },
                { t: "No PMI, ever",                   b: "The 20% combined down payment eliminates private mortgage insurance from day one. Unlike FHA, there is no lifetime MIP and no refinance required to remove it." },
                { t: "Less cash to close",             b: `You need only 1% down (${$(AP_BUYER_DOWN * price)}) plus standard closing costs — no large down payment savings required.` },
                { t: "~$51,000 in 5-year savings",     b: "The combination of lower monthly payment, no PMI, and cumulative payment savings typically totals $51,000+ over five years for a median AP borrower." },
                { t: "Built-in hardship protection",   b: "HAF coverage and HUD counseling are included. You are not alone if something goes wrong." },
                { t: "One loan, one payment",          b: "The AP contribution is embedded in a single conventional mortgage wrapper. No visible subordinate lien. One payment, one servicer, one loan." },
                { t: "Real equity accumulation",       b: "You build equity through loan amortization and appreciation on 100% of the home value — you own the full property. AP's share is only of appreciation, not of your principal." },
              ].map(({ t, b }, i) => (
                <View key={i} style={s.bullet}>
                  <View style={s.bulletDot} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.bulletT}>{t}</Text>
                    <Text style={s.bulletB}>{b}</Text>
                  </View>
                </View>
              ))}
            </View>

            {/* Right: Comparison table + HAF + Stewardship + GSE */}
            <View style={[s.col, { flex: 0.55 }]}>
              <Sec title="AP vs. Conventional vs. FHA" />

              <View style={[s.tWrap, { marginBottom: 8 }]}>
                <View style={s.cmpHead}>
                  <Text style={[s.cmpTh, { flex: 1.4 }]}>Feature</Text>
                  <Text style={s.cmpTh}>Conv. 5%</Text>
                  <Text style={s.cmpTh}>FHA 3.5%</Text>
                  <Text style={[s.cmpTh, { color: R.white }]}>AmPledge</Text>
                </View>
                {[
                  ["Down Payment",        "5–20%",   "3.5%",         "1% buyer"],
                  ["PMI / MIP",           "Yes",     "Lifetime MIP", "Never"],
                  ["Monthly Cost",        "Higher",  "Higher",       "Lower"],
                  ["Hardship Protection", "None",    "None",         "HAF included"],
                  ["Loan Structure",      "Single",  "Single",       "Single"],
                  ["Appreciation Share",  "No",      "No",           "Yes (contingent)"],
                  ["Cash to Close",       "Higher",  "Moderate",     "Lowest"],
                  ["IRS Treatment",       "Standard","Standard",     "Rev. Rul. 83-51"],
                ].map(([feat, conv, fha, ap], i) => (
                  <View key={i} style={i % 2 === 1 ? s.cmpTrA : s.cmpTr}>
                    <Text style={s.cmpLbl}>{feat}</Text>
                    <Text style={s.cmpTd}>{conv}</Text>
                    <Text style={s.cmpTd}>{fha}</Text>
                    <Text style={s.cmpTdB}>{ap}</Text>
                  </View>
                ))}
              </View>

              {/* Stewardship fee */}
              <View style={[s.noteBox, { borderLeftColor: R.navy, marginBottom: 7 }]}>
                <Text style={[s.noteHead, { color: R.navy }]}>Stewardship Fee  ·  $150/month (Years 1–5)</Text>
                <Text style={s.noteBody}>
                  A $1,800/year ($150/month) stewardship fee applies during years 1–5. This covers Hardship
                  Assistance Fund reserves, HUD-aligned financial counseling, and platform support. For most
                  borrowers, it is more than offset by the combined PMI elimination and monthly payment reduction —
                  the average AP borrower saves $500–900/month versus a standard loan.
                </Text>
              </View>

            </View>
          </View>

        </View>
        <Footer page={7} total={totalPages} date={generated} />
      </Page>

      {/* ════════════════════════════════════════════════════════════════════
          PAGE 8  ·  Agent Bio  (agents only)
      ════════════════════════════════════════════════════════════════════ */}
      {isAgent && (() => {
        const bio = agentBio;
        const specialties = bio?.specialties
          ? (typeof bio.specialties === "string" ? JSON.parse(bio.specialties) : bio.specialties)
          : [];
        const areasServed = bio?.areas_served
          ? (typeof bio.areas_served === "string" ? JSON.parse(bio.areas_served) : bio.areas_served)
          : [];

        return (
          <Page size="LETTER" style={s.page}>
            <Masthead
              logoUrl={logoUrl}
              eyebrow={`Borrower Report  ·  Page 8 of ${totalPages}`}
              title={bio?.display_name ?? "Your Agent"}
              sub={[bio?.brokerage, bio?.license_number ? `Lic. ${bio.license_number}` : null].filter(Boolean).join("  ·  ") || "Agent Profile"}
              generated={generated}
            />

            {/* Agent metrics bar */}
            <View style={s.metricsBar}>
              {[
                { l: "Years Experience", v: bio?.years_experience != null ? String(bio.years_experience) : "—", s: "in real estate" },
                { l: "Recent Sales",     v: bio?.recent_sales_count != null ? String(bio.recent_sales_count) : "—", s: "recent transactions" },
                { l: "Phone",   v: bio?.phone ?? "—", s: "direct line" },
                { l: "Email",   v: bio?.email ? bio.email.slice(0, 28) : "—", s: "direct email" },
              ].map((m, i, a) => (
                <View key={i} style={i < a.length - 1 ? s.mCell : s.mCellL}>
                  <Text style={s.mLabel}>{m.l}</Text>
                  <Text style={[s.mVal, { fontSize: 8 }]}>{m.v}</Text>
                  <Text style={s.mSub}>{m.s}</Text>
                </View>
              ))}
            </View>

            <View style={s.body}>
              <View style={s.cols}>

                {/* Left: photo + contact details */}
                <View style={{ flex: 0.32, alignItems: "center" }}>
                  {bio?.photo_url && (
                    <Image
                      src={bio.photo_url}
                      style={{ width: "100%", borderRadius: 4, marginBottom: 10, border: `0.75px solid ${R.border}` }}
                    />
                  )}
                  {!bio?.photo_url && (
                    <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: R.navy, alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
                      <Text style={{ fontSize: 28, fontFamily: "Helvetica-Bold", color: R.white }}>
                        {(bio?.display_name ?? "A").charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}

                  {/* Contact card */}
                  <View style={{ width: "100%", border: `0.75px solid ${R.border}`, borderRadius: 2, overflow: "hidden" }}>
                    <View style={{ backgroundColor: R.navy, padding: "5 8" }}>
                      <Text style={{ fontSize: 6, fontFamily: "Helvetica-Bold", color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: 1 }}>Contact</Text>
                    </View>
                    {[
                      bio?.phone && { l: "Phone", v: bio.phone },
                      bio?.email && { l: "Email", v: bio.email },
                      bio?.brokerage && { l: "Brokerage", v: bio.brokerage },
                      bio?.license_number && { l: "License", v: bio.license_number },
                    ].filter(Boolean).map(({ l, v }, i) => (
                      <View key={i} style={{ padding: "4 8", borderBottomWidth: 0.5, borderBottomColor: R.border }}>
                        <Text style={{ fontSize: 5.5, color: R.muted, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 1 }}>{l}</Text>
                        <Text style={{ fontSize: 7, color: R.ink }}>{v}</Text>
                      </View>
                    ))}
                  </View>

                  {/* Specialties */}
                  {specialties.length > 0 && (
                    <View style={{ width: "100%", marginTop: 8 }}>
                      <Text style={[s.statL, { marginBottom: 4 }]}>Specialties</Text>
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 3 }}>
                        {specialties.map((sp, i) => (
                          <View key={i} style={{ backgroundColor: R.row, border: `0.75px solid ${R.border}`, borderRadius: 2, padding: "2 5" }}>
                            <Text style={{ fontSize: 6, color: R.sub }}>{sp}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Areas served */}
                  {areasServed.length > 0 && (
                    <View style={{ width: "100%", marginTop: 8 }}>
                      <Text style={[s.statL, { marginBottom: 4 }]}>Areas Served</Text>
                      {areasServed.slice(0, 6).map((a, i) => (
                        <Text key={i} style={{ fontSize: 6.5, color: R.sub, lineHeight: 1.5 }}>{a}</Text>
                      ))}
                    </View>
                  )}
                </View>

                {/* Right: bio + CTA */}
                <View style={{ flex: 0.68 }}>
                  {bio?.bio ? (
                    <>
                      <Sec title="About" />
                      <Text style={{ fontSize: 7.5, color: R.sub, lineHeight: 1.7, marginBottom: 12 }}>{bio.bio}</Text>
                    </>
                  ) : (
                    <View style={[s.noteBox, { borderLeftColor: R.navy, marginBottom: 12 }]}>
                      <Text style={[s.noteHead, { color: R.navy }]}>Profile Pending</Text>
                      <Text style={s.noteBody}>Agent bio will be populated automatically from the submitted profile URL on the next report generation. Reply with your Realtor.com or Zillow profile URL to trigger an update.</Text>
                    </View>
                  )}

                  {/* AmPledge agent CTA */}
                  <View style={{ backgroundColor: R.navy, borderRadius: 4, padding: "14 16", marginBottom: 12 }} wrap={false}>
                    <Text style={{ fontSize: 7, fontFamily: "Helvetica-Bold", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Powered by AmPledge Report Tools</Text>
                    <Text style={{ fontSize: 9, fontFamily: "Helvetica-Bold", color: R.white, marginBottom: 6 }}>Help your clients understand their true buying power.</Text>
                    <Text style={{ fontSize: 7, color: "rgba(255,255,255,0.65)", lineHeight: 1.6 }}>
                      This report was generated via the AmPledge agent platform. Every report includes estimated home value, market analysis, loan comparison, and equity projections — delivered in seconds via SMS.{"\n\n"}
                      Agents using AmPledge reports close with better-informed buyers, fewer surprises at underwriting, and a clear differentiation in listing presentations.
                    </Text>
                  </View>

                  <View style={[s.noteBox, { borderLeftColor: R.red }]}>
                    <Text style={s.noteHead}>Share this report</Text>
                    <Text style={s.noteBody}>Text any U.S. property address to your AmPledge agent number to generate a new report. Reports are delivered as a secure PDF link, valid for 1 hour.</Text>
                  </View>
                </View>

              </View>
            </View>
            <Footer page={8} total={totalPages} date={generated} />
          </Page>
        );
      })()}

    </Document>
  );
};

// ─── Generate and open in new tab ────────────────────────────────────────────
const GMAPS_KEY     = process.env.REACT_APP_GOOGLE_PLACES     || "";
const GMAPS_SVR_KEY = process.env.REACT_APP_GOOGLE_SERVER_KEY  || "";
const RENTCAST_KEY  = process.env.REACT_APP_RENTCAST_KEY       || "";

export async function generateAndOpenReport(data) {
  let logoUrl      = null;
  let logoWhiteUrl = null;
  let mapUrl       = null;

  // Fetch logos in parallel
  const toDataUrl = (blob) => new Promise(resolve => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
  await Promise.all([
    fetch("/DocLogo.png").then(r => r.blob()).then(b => toDataUrl(b)).then(u => { logoUrl = u; }).catch(() => {}),
    fetch("/DocLogoWhite.png").then(r => r.blob()).then(b => toDataUrl(b)).then(u => { logoWhiteUrl = u; }).catch(() => {}),
  ]);

  // Fetch Google Static Map for property location
  if (data.lat && data.lon && GMAPS_KEY) {
    try {
      const mapApiUrl =
        `https://maps.googleapis.com/maps/api/staticmap` +
        `?center=${data.lat},${data.lon}` +
        `&zoom=15&size=600x300&scale=2` +
        `&markers=color:red|${data.lat},${data.lon}` +
        `&style=feature:poi|visibility:off` +
        `&style=feature:transit|visibility:off` +
        `&key=${GMAPS_KEY}`;
      const res  = await fetch(mapApiUrl);
      const blob = await res.blob();
      mapUrl = await new Promise(resolve => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    } catch (_) { /* proceed without map */ }
  }

  // Fetch nearby amenities, street view, property details, and flood zone in parallel
  const blobToDataUrl = (blob) => new Promise(resolve => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });

  // Nearby amenities (parallel per category)
  const fetchNearbyPlaces = async () => {
    if (!data.lat || !data.lon || !GMAPS_KEY) return null;
    const categories = [
      { key: "Schools",  types: ["school", "university"] },
      { key: "Grocery",  types: ["supermarket", "grocery_store"] },
      { key: "Medical",  types: ["hospital", "pharmacy"] },
      { key: "Parks",    types: ["park"] },
    ];
    try {
      const results = await Promise.all(categories.map(async ({ key, types }) => {
        try {
          const res = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Goog-Api-Key": GMAPS_KEY,
              "X-Goog-FieldMask": "places.displayName,places.rating",
            },
            body: JSON.stringify({
              includedTypes: types,
              maxResultCount: 4,
              locationRestriction: {
                circle: { center: { latitude: data.lat, longitude: data.lon }, radius: 8000 },
              },
            }),
          });
          const json = await res.json();
          return { key, places: (json.places || []).map(p => ({ name: p.displayName?.text ?? "", rating: p.rating ?? null })) };
        } catch (_) { return { key, places: [] }; }
      }));
      const out = {};
      for (const { key, places } of results) out[key] = places;
      return out;
    } catch (_) { return null; }
  };

  // Street View — uses server key (unrestricted) because Street View Static API
  // requires a key with no HTTP-Referer restriction to work server-side / from localhost
  const fetchStreetView = async () => {
    const key = GMAPS_SVR_KEY || GMAPS_KEY;
    if (!data.lat || !data.lon || !key) return null;
    try {
      const url =
        `https://maps.googleapis.com/maps/api/streetview` +
        `?size=600x300&location=${data.lat},${data.lon}&fov=90&pitch=0&key=${key}`;
      const res = await fetch(url);
      if (!res.ok) return null;
      return blobToDataUrl(await res.blob());
    } catch (_) { return null; }
  };

  // Rentcast property details
  const fetchPropertyDetails = async () => {
    if (!RENTCAST_KEY || !data.address) return null;
    try {
      const res = await fetch(
        `https://api.rentcast.io/v1/properties?address=${encodeURIComponent(data.address)}&limit=1`,
        { headers: { "X-Api-Key": RENTCAST_KEY } }
      );
      if (!res.ok) return null;
      const json = await res.json();
      const prop = Array.isArray(json) ? json[0] : json;
      if (!prop) return null;
      return {
        beds:          prop.bedrooms      ?? null,
        baths:         prop.bathrooms     ?? null,
        sqft:          prop.squareFootage ?? null,
        yearBuilt:     prop.yearBuilt     ?? null,
        lotSize:       prop.lotSize       ?? null,
        stories:       prop.stories       ?? null,
        lastSalePrice: prop.lastSalePrice ?? null,
        lastSaleDate:  prop.lastSaleDate  ?? null,
        propertyType:  prop.propertyType  ?? null,
      };
    } catch (_) { return null; }
  };

  // FEMA Flood Zone — NFHL hosted on ArcGIS Online (CORS-friendly, always available)
  // Layer 3 = S_Fld_Haz_Ar (Special Flood Hazard Area polygons)
  const fetchFloodZone = async () => {
    if (!data.lat || !data.lon) return null;
    try {
      const url =
        `https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/NFHL/FeatureServer/3/query` +
        `?geometry=${data.lon},${data.lat}&geometryType=esriGeometryPoint&inSR=4326` +
        `&spatialRel=esriSpatialRelIntersects` +
        `&outFields=FLD_ZONE,SFHA_TF&returnGeometry=false&f=json`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const json = await res.json();
      const feat = json.features?.[0]?.attributes;
      if (!feat) return null;
      return { zone: feat.FLD_ZONE ?? null, sfha: feat.SFHA_TF === "T" };
    } catch (_) { return null; }
  };

  // GreatSchools — call via our Lambda proxy (no CORS restriction on our own API)
  const fetchGreatSchoolsBrowser = async () => {
    const apiBase = process.env.REACT_APP_SMS_API_URL || "";
    if (!apiBase || !data.lat || !data.lon) return null;
    try {
      const res = await fetch(`${apiBase}/nearby-schools?lat=${data.lat}&lon=${data.lon}`);
      if (!res.ok) return null;
      const json = await res.json();
      return Array.isArray(json) && json.length > 0 ? json : null;
    } catch (_) { return null; }
  };

  // WalkScore — proxied through Lambda to avoid CORS
  const fetchWalkScore = async () => {
    const apiBase = process.env.REACT_APP_SMS_API_URL || "";
    if (!apiBase || !data.lat || !data.lon) return null;
    try {
      const res = await fetch(
        `${apiBase}/walkscore?lat=${data.lat}&lon=${data.lon}&address=${encodeURIComponent(data.address || "")}`
      );
      if (!res.ok) return null;
      const json = await res.json();
      return {
        walk:        json.walkscore        ?? null,
        walkDesc:    json.description      ?? null,
        transit:     json.transit?.score   ?? null,
        transitDesc: json.transit?.description ?? null,
        bike:        json.bike?.score      ?? null,
        bikeDesc:    json.bike?.description ?? null,
      };
    } catch (_) { return null; }
  };

  // Rentcast rental estimate
  const fetchRentalEstimateBrowser = async () => {
    if (!RENTCAST_KEY || !data.address) return null;
    try {
      const res = await fetch(
        `https://api.rentcast.io/v1/avm/rent/long-term?address=${encodeURIComponent(data.address)}`,
        { headers: { "X-Api-Key": RENTCAST_KEY } }
      );
      if (!res.ok) return null;
      const json = await res.json();
      if (!json.rent) return null;
      return { rent: json.rent ?? null, rentLow: json.rentRangeLow ?? null, rentHigh: json.rentRangeHigh ?? null };
    } catch (_) { return null; }
  };

  const [nearbyPlaces, streetViewUrl, propertyDetails, floodZone, greatSchools, rentalEstimate, walkScore] = await Promise.all([
    fetchNearbyPlaces(),
    fetchStreetView(),
    fetchPropertyDetails(),
    fetchFloodZone(),
    fetchGreatSchoolsBrowser(),
    fetchRentalEstimateBrowser(),
    fetchWalkScore(),
  ]);

  const blob = await pdf(
    <PropertyReportDoc data={{ ...data, logoUrl, logoWhiteUrl, mapUrl, nearbyPlaces, streetViewUrl, propertyDetails, floodZone, greatSchools, rentalEstimate, walkScore }} />
  ).toBlob();
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
