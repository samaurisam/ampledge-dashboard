import React from "react";
import { Document, Page, Text, View, Image, StyleSheet, pdf } from "@react-pdf/renderer";

// ─── Brand palette ────────────────────────────────────────────────────────────
const R = {
  navy:    "#0a2240",
  red:     "#c0392b",
  ink:     "#1a1a2e",
  sub:     "#4b5563",
  muted:   "#9ca3af",
  border:  "#dde2ea",
  row:     "#f4f6f9",
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
    backgroundColor: R.white, paddingHorizontal: 30, paddingVertical: 9,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderBottomWidth: 0.75, borderBottomColor: R.border,
  },
  logoBox:      { height: 28 },
  logoBarRight: { alignItems: "flex-end" },
  logoBarDate:  { fontSize: 6.5, color: R.muted },
  logoBarTag:   {
    fontSize: 6, color: R.white, fontFamily: "Helvetica-Bold", letterSpacing: 1.5,
    textTransform: "uppercase", marginTop: 3,
    backgroundColor: R.red, paddingVertical: 2, paddingHorizontal: 5, borderRadius: 1,
  },
  titleBand: {
    backgroundColor: R.navy, paddingHorizontal: 30, paddingVertical: 12,
    flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between",
  },
  titleBandSm: {
    backgroundColor: R.navy, paddingHorizontal: 30, paddingVertical: 9,
    flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between",
  },
  mastheadTitle:   { fontSize: 14, color: R.white, fontFamily: "Helvetica-Bold", letterSpacing: 0.2 },
  mastheadSub:     { fontSize: 8, color: "rgba(255,255,255,0.6)", marginTop: 2 },
  mastheadEyebrow: { fontSize: 6.5, color: "rgba(255,255,255,0.45)", fontFamily: "Helvetica-Bold", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 3 },
  redRule:  { height: 2, backgroundColor: R.red },
  navyRule: { height: 0.75, backgroundColor: R.navy },

  // ── Key-metrics bar ─────────────────────────────────────────────────────────
  metricsBar: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: R.border },
  mCell:  { flex: 1, paddingVertical: 7, paddingHorizontal: 9, borderRightWidth: 1, borderRightColor: R.border },
  mCellL: { flex: 1, paddingVertical: 7, paddingHorizontal: 9 },
  mLabel: { fontSize: 5.5, color: R.muted, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.9, marginBottom: 2 },
  mVal:   { fontSize: 10, fontFamily: "Helvetica-Bold", color: R.navy },
  mSub:   { fontSize: 5.5, color: R.muted, marginTop: 1 },

  // ── Body ────────────────────────────────────────────────────────────────────
  body: { paddingHorizontal: 30, paddingTop: 12, paddingBottom: 50 },

  // ── Section header ──────────────────────────────────────────────────────────
  sec:     { marginTop: 13, marginBottom: 8 },
  secT:    { fontSize: 6.5, fontFamily: "Helvetica-Bold", color: R.navy, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 3 },
  secRule: { borderBottomWidth: 0.75, borderBottomColor: R.navy, marginBottom: 6 },
  secSub:  { fontSize: 6.5, color: R.muted, lineHeight: 1.5, marginBottom: 4 },

  // ── Note box ────────────────────────────────────────────────────────────────
  noteBox:  { backgroundColor: R.row, borderLeftWidth: 2.5, borderLeftColor: R.red, padding: "7 10", marginBottom: 12 },
  noteHead: { fontSize: 6, fontFamily: "Helvetica-Bold", color: R.red, textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 3 },
  noteBody: { fontSize: 7.5, color: R.sub, lineHeight: 1.65 },

  // ── Two columns ─────────────────────────────────────────────────────────────
  cols: { flexDirection: "row", gap: 10 },
  col:  { flex: 1 },

  // ── Loan cards ──────────────────────────────────────────────────────────────
  lCard:  { flex: 1, border: `0.75px solid ${R.border}`, borderRadius: 2 },
  lCardN: { flex: 1, border: `1px solid ${R.navy}`, borderRadius: 2 },
  lHead:  { paddingHorizontal: 10, paddingVertical: 6, borderBottomWidth: 0.75, borderBottomColor: R.border, backgroundColor: R.row },
  lHeadN: { paddingHorizontal: 10, paddingVertical: 6, borderBottomWidth: 0.75, borderBottomColor: "#2d5a8e", backgroundColor: R.navy },
  lBody:  { paddingHorizontal: 10, paddingVertical: 8 },
  lTitle: { fontSize: 6, fontFamily: "Helvetica-Bold", color: R.muted, textTransform: "uppercase", letterSpacing: 1 },
  lTitleW:{ fontSize: 6, fontFamily: "Helvetica-Bold", color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: 1 },
  lBig:   { fontSize: 19, fontFamily: "Helvetica-Bold", color: R.navy, lineHeight: 1 },
  lBigW:  { fontSize: 19, fontFamily: "Helvetica-Bold", color: R.white, lineHeight: 1 },
  lSub:   { fontSize: 7, color: R.muted, marginTop: 2 },
  lSubW:  { fontSize: 7, color: "rgba(255,255,255,0.55)", marginTop: 2 },
  lRow:   { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 0.5, borderTopColor: R.border, paddingTop: 4, marginTop: 4 },
  lRowW:  { flexDirection: "row", justifyContent: "space-between", borderTopWidth: 0.5, borderTopColor: "#2d5a8e", paddingTop: 4, marginTop: 4 },
  lRLbl:  { fontSize: 6.5, color: R.muted },
  lRLblW: { fontSize: 6.5, color: "rgba(255,255,255,0.5)" },
  lRVal:  { fontSize: 7, fontFamily: "Helvetica-Bold", color: R.ink },
  lRValW: { fontSize: 7, fontFamily: "Helvetica-Bold", color: R.white },

  // ── Step list ───────────────────────────────────────────────────────────────
  stepRow: { flexDirection: "row", gap: 7, marginBottom: 5, alignItems: "flex-start" },
  stepNum: { width: 14, height: 14, borderRadius: 7, backgroundColor: R.navy,
             alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 0.5 },
  stepN:   { fontSize: 6.5, fontFamily: "Helvetica-Bold", color: R.white },
  stepT:   { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: R.ink, marginBottom: 1.5 },
  stepB:   { fontSize: 7, color: R.sub, lineHeight: 1.55 },

  // ── Stat grid ───────────────────────────────────────────────────────────────
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginBottom: 8 },
  stat:     { minWidth: 70, flex: 1, border: `0.75px solid ${R.border}`, borderRadius: 2, padding: "4 7" },
  statL:    { fontSize: 5.5, color: R.muted, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 1.5 },
  statV:    { fontSize: 10, fontFamily: "Helvetica-Bold", color: R.navy },

  // ── HPA badge ───────────────────────────────────────────────────────────────
  hpaBadge: { borderRadius: 2, padding: "8 10", justifyContent: "center" },
  hpaRange: { fontSize: 15, fontFamily: "Helvetica-Bold", lineHeight: 1, color: R.navy },
  hpaLbl:   { fontSize: 6, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.9, marginTop: 3, color: R.sub },
  hpaSub:   { fontSize: 6, color: R.muted, marginTop: 1 },

  // ── Driver chips ─────────────────────────────────────────────────────────────
  driver: { flex: 1, minWidth: 60, border: `0.75px solid ${R.border}`, borderRadius: 2, padding: "5 7", backgroundColor: R.row },
  drvL:   { fontSize: 5.5, color: R.muted, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 1.5 },
  drvV:   { fontSize: 10, fontFamily: "Helvetica-Bold", color: R.navy },
  drvD:   { fontSize: 6, color: R.muted, marginTop: 1.5, lineHeight: 1.4 },

  // ── Score badge ──────────────────────────────────────────────────────────────
  scoreBadge:   { border: `0.75px solid ${R.navy}44`, borderRadius: 2, padding: "7 10",
                  backgroundColor: R.row, alignItems: "center" },
  scoreBig:     { fontSize: 22, fontFamily: "Helvetica-Bold", color: R.navy, lineHeight: 1 },
  scoreLbl:     { fontSize: 5.5, color: R.muted, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.8, marginTop: 2 },
  scoreBar:     { width: "100%", height: 3, backgroundColor: R.border, borderRadius: 1.5, marginTop: 4 },
  scoreBarFill: { height: 3, backgroundColor: R.navy, borderRadius: 1.5 },

  // ── Table ────────────────────────────────────────────────────────────────────
  tWrap:  { border: `0.75px solid ${R.border}`, borderRadius: 2, overflow: "hidden", marginBottom: 8 },
  thead:  { flexDirection: "row", backgroundColor: R.navy },
  th:     { fontSize: 5.5, fontFamily: "Helvetica-Bold", color: "rgba(255,255,255,0.75)",
             textTransform: "uppercase", letterSpacing: 0.7, paddingVertical: 5, paddingHorizontal: 6 },
  tr:     { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: R.border },
  trAlt:  { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: R.border, backgroundColor: R.row },
  td:     { fontSize: 7.5, color: R.ink, paddingVertical: 5, paddingHorizontal: 6 },
  tdB:    { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: R.navy, paddingVertical: 5, paddingHorizontal: 6 },
  tdM:    { fontSize: 7.5, color: R.muted, paddingVertical: 5, paddingHorizontal: 6 },
  tdPos:  { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: R.navy, paddingVertical: 5, paddingHorizontal: 6 },
  tdNeg:  { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: R.navy, paddingVertical: 5, paddingHorizontal: 6 },

  // ── Comparison table ─────────────────────────────────────────────────────────
  cmpHead: { flexDirection: "row", backgroundColor: R.navy, borderRadius: "2 2 0 0" },
  cmpTh:   { fontSize: 6, fontFamily: "Helvetica-Bold", color: "rgba(255,255,255,0.75)",
              textTransform: "uppercase", letterSpacing: 0.7, paddingVertical: 6, paddingHorizontal: 8, flex: 1 },
  cmpTr:   { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: R.border },
  cmpTrA:  { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: R.border, backgroundColor: R.row },
  cmpTd:   { fontSize: 7, color: R.sub, paddingVertical: 5, paddingHorizontal: 8, flex: 1 },
  cmpTdB:  { fontSize: 7, fontFamily: "Helvetica-Bold", color: R.navy, paddingVertical: 5, paddingHorizontal: 8, flex: 1 },
  cmpTdG:  { fontSize: 7, fontFamily: "Helvetica-Bold", color: "#166534", paddingVertical: 5, paddingHorizontal: 8, flex: 1 },
  cmpLbl:  { fontSize: 7, fontFamily: "Helvetica-Bold", color: R.ink, paddingVertical: 5, paddingHorizontal: 8, flex: 1.4 },

  // ── Return schedule strip ────────────────────────────────────────────────────
  rsStrip: { flexDirection: "row", gap: 3, flexWrap: "wrap", marginBottom: 8 },
  rsCell:  { alignItems: "center", padding: "3 6", borderRadius: 2 },
  rsYr:    { fontSize: 5, color: R.muted, fontFamily: "Helvetica-Bold", textTransform: "uppercase" },
  rsV:     { fontSize: 8, fontFamily: "Helvetica-Bold" },

  // ── Value prop bullets ───────────────────────────────────────────────────────
  bullet:  { flexDirection: "row", gap: 6, marginBottom: 4, alignItems: "flex-start" },
  bulletDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: R.red, marginTop: 3, flexShrink: 0 },
  bulletT: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: R.ink, marginBottom: 1 },
  bulletB: { fontSize: 7, color: R.sub, lineHeight: 1.5 },

  // ── Map / Street View images ─────────────────────────────────────────────────
  mapImg:       { width: "100%", borderRadius: 2, border: `0.75px solid ${R.border}` },
  streetViewImg: { width: "100%", borderRadius: 2, border: `0.75px solid ${R.border}`, marginBottom: 6 },

  // ── Property details chips ────────────────────────────────────────────────────
  propChipRow:  { flexDirection: "row", flexWrap: "wrap", gap: 5, marginBottom: 8 },
  propChip:     { backgroundColor: R.row, border: `0.75px solid ${R.border}`, borderRadius: 3, paddingVertical: 5, paddingHorizontal: 8 },
  propChipFull: { backgroundColor: R.row, border: `0.75px solid ${R.border}`, borderRadius: 3, paddingVertical: 5, paddingHorizontal: 8, alignSelf: "flex-start" },
  propChipL:    { fontSize: 5.5, color: R.muted, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 2 },
  propChipV:    { fontSize: 9, fontFamily: "Helvetica-Bold", color: R.navy },

  // ── Flood zone badge ──────────────────────────────────────────────────────────
  floodRow:    { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 5, marginBottom: 4 },
  floodBadge:  { borderRadius: 2, padding: "3 7" },
  floodZone:   { fontSize: 9, fontFamily: "Helvetica-Bold", color: R.white },
  floodLabel:  { fontSize: 6, color: R.muted, lineHeight: 1.4 },

  // ── Footer ───────────────────────────────────────────────────────────────────
  footer: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    borderTopWidth: 0.75, borderTopColor: R.border,
    paddingHorizontal: 30, paddingVertical: 7,
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    backgroundColor: R.white,
  },
  footerDisc:  { fontSize: 5.5, color: R.muted, lineHeight: 1.6, flex: 1 },
  footerRight: { alignItems: "flex-end", marginLeft: 20, flexShrink: 0 },
  footerBrand: { fontSize: 6.5, fontFamily: "Helvetica-Bold", color: R.navy, letterSpacing: 1.5, textTransform: "uppercase" },
  footerPage:  { fontSize: 5.5, color: R.muted, marginTop: 1 },
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
const $  = (n) => n != null ? `$${Math.round(n).toLocaleString()}` : "—";
const $k = (n) => n != null ? `$${(n / 1000).toFixed(0)}k` : "—";
const p1 = (n) => n != null ? `${(n * 100).toFixed(1)}%` : "—";
const p0 = (n) => n != null ? `${(n * 100).toFixed(0)}%` : "—";

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
        <View key={i} style={{ marginTop: 5, marginBottom: 1.5 }}>
          <Text style={{ fontSize: 6, fontFamily: "Helvetica-Bold", color: R.navy, textTransform: "uppercase", letterSpacing: 0.7 }}>
            {headerMatch[1]}
          </Text>
          <View style={{ borderBottomWidth: 0.5, borderBottomColor: R.border, marginTop: 1 }} />
        </View>
      );
    } else if (trimmed.startsWith("•")) {
      // Bullet: render as plain paragraph (bold intro, normal body) — no bullet character
      const content = trimmed.slice(1).trim();
      elements.push(
        <Text key={i} style={{ fontSize: 6.5, color: R.sub, lineHeight: 1.45, marginBottom: 2.5, paddingLeft: 0 }}>
          {renderInline(content)}
        </Text>
      );
    } else {
      elements.push(
        <Text key={i} style={{ fontSize: 6.5, color: R.sub, lineHeight: 1.5, marginBottom: 2.5 }}>
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
    <Text style={s.secT}>{title}</Text>
    <View style={s.secRule} />
    {sub && <Text style={s.secSub}>{sub}</Text>}
  </View>
);

const LR = ({ label, val, white }) => (
  <View style={white ? s.lRowW : s.lRow}>
    <Text style={white ? s.lRLblW : s.lRLbl}>{label}</Text>
    <Text style={white ? s.lRValW : s.lRVal}>{val}</Text>
  </View>
);

const Footer = ({ page, date }) => (
  <View style={s.footer} fixed>
    <Text style={s.footerDisc}>
      For illustrative purposes only. Not financial, legal, or investment advice. AP appreciation share is contingent
      interest (IRS Rev. Rul. 83-51), not a second lien. Projections assume constant HPA and are not guaranteed.
    </Text>
    <View style={s.footerRight}>
      <Text style={s.footerBrand}>American Pledge</Text>
      <Text style={s.footerPage}>{date}  ·  Page {page} of 4</Text>
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
    logoUrl, mapUrl, nearbyPlaces,
    streetViewUrl, propertyDetails, floodZone,
    avmValue, avmLow, avmHigh, avmComps,
    lastSalePrice: topLastSalePrice, lastSaleDate: topLastSaleDate,
  } = data;

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
          PAGE 1  ·  Property Overview
      ════════════════════════════════════════════════════════════════════ */}
      <Page size="LETTER" style={s.page}>
        <Masthead
          logoUrl={logoUrl}
          eyebrow="Borrower Report  ·  Page 1 of 4"
          title={address}
          sub={`${countyDisplay}, ${state}  ·  Listing ${$(price)}  ·  ${kalshiMtgPct.toFixed(2)}% 30-yr fixed`}
          generated={generated}
        />

        <View style={s.body}>
          <View style={[s.cols, { marginTop: 10, gap: 14 }]}>

            {/* Left: map + street view + flood zone + amenities */}
            {(mapUrl || streetViewUrl) && (
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
                  <View style={{ marginBottom: 6 }}>
                    <Text style={[s.statL, { marginBottom: 4 }]}>Street View</Text>
                    <Image src={streetViewUrl} style={s.streetViewImg} />
                  </View>
                )}

                {/* Flood Zone */}
                {floodZone?.zone && (() => {
                  const sfha = floodZone.sfha;
                  const bgColor = sfha ? "#b91c1c" : "#166534";
                  const desc = sfha
                    ? "Special Flood Hazard Area — flood insurance typically required"
                    : "Minimal or moderate flood risk — outside SFHA";
                  return (
                    <View style={s.floodRow}>
                      <View style={[s.floodBadge, { backgroundColor: bgColor }]}>
                        <Text style={s.floodZone}>Zone {floodZone.zone}</Text>
                      </View>
                      <Text style={s.floodLabel}>{desc}</Text>
                    </View>
                  );
                })()}

                {/* Nearby Amenities */}
                {nearbyPlaces && Object.keys(nearbyPlaces).length > 0 && (
                  <View style={{ marginTop: 8 }}>
                    {/* Title + "Within 8km" on same line */}
                    <View style={[s.sec, { marginTop: 0 }]}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" }}>
                        <Text style={s.secT}>Nearby Amenities</Text>
                        <Text style={{ fontSize: 5.5, color: R.muted, marginBottom: 2.5 }}>Within 8km</Text>
                      </View>
                      <View style={s.secRule} />
                    </View>
                    {Object.entries(nearbyPlaces).map(([cat, places]) => (
                      places.length > 0 && (
                        <View key={cat} style={{ marginBottom: 7 }}>
                          {/* Category name replaces the NAME header — saves a line */}
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
              </View>
            )}

            {/* Right: property details + county fundamentals */}
            <View style={{ flex: (mapUrl || streetViewUrl) ? 0.58 : 1 }}>

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
                ].filter(Boolean);

                const lastSaleP = propertyDetails.lastSalePrice ?? topLastSalePrice ?? null;
                const lastSaleD = propertyDetails.lastSaleDate  ?? topLastSaleDate  ?? null;
                const lastSale = lastSaleP != null
                  ? `${fmtSalePrice(lastSaleP)}` +
                    (lastSaleD ? `  ·  ${new Date(lastSaleD).getFullYear()}` : "")
                  : null;

                // Estimated value: AVM primary, else CS-appreciated last sale
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
                const estValMethod = avmValue ? `AVM${avmComps ? ` · ${avmComps} comps` : ""}` : null;

                if (!chips.length && !lastSale && !estValDisplay) return null;
                return (
                  <View style={{ marginBottom: 8 }}>
                    <View style={s.propChipRow}>
                      {chips.map((c, i) => (
                        <View key={i} style={s.propChip}>
                          <Text style={s.propChipL}>{c.l}</Text>
                          <Text style={s.propChipV}>{c.v}</Text>
                        </View>
                      ))}
                    </View>
                    {/* Last sale + estimated value side by side */}
                    <View style={{ flexDirection: "row", gap: 5 }}>
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
                  </View>
                );
              })()}

              <Sec title="County Fundamentals" sub={`${countyDisplay}, ${state}  ·  Market Score #${county?.rank ?? "—"}  ·  ${county?.tier?.replace(/_/g," ") ?? ""}`} />

              {/* Dimension score cards — 2-column grid with descriptions */}
              {county?.dims && (() => {
                const dims = {
                  entry_cost: {
                    label: "Entry Cost",
                    desc: "Market entry affordability — listing prices relative to local income, home value growth trends, and buyer accessibility. Higher scores indicate markets where buyers can still enter at reasonable price-to-income ratios.",
                  },
                  labor_market_momentum: {
                    label: "Labor Market",
                    desc: "Job creation, employment concentration, high-skill workforce share, and wage levels. Strong labor markets drive sustained housing demand and reduce long-term default risk.",
                  },
                  catalyst_evidence: {
                    label: "Catalyst Evidence",
                    desc: "Near-term demand triggers: new business formation, infrastructure permits, federal investment, and economic development activity signaling imminent growth.",
                  },
                  anchor_institutions: {
                    label: "Anchor Institutions",
                    desc: "Presence of stable, recession-resistant employers — universities, hospitals, military bases, and government centers — that anchor local employment through economic cycles.",
                  },
                  infrastructure_readiness: {
                    label: "Infrastructure",
                    desc: "Broadband penetration, building permit activity, and physical infrastructure capacity to support population and business growth.",
                  },
                  governance: {
                    label: "Governance",
                    desc: "Local fiscal health, business climate, and regulatory environment. Markets with strong governance attract long-term investment and maintain stable public services.",
                  },
                  risk_resilience: {
                    label: "Risk Resilience",
                    desc: "Composite of FEMA natural hazard risk, economic diversification, and housing market stability. Lower-risk markets protect home values through economic disruptions.",
                  },
                  env_regulatory: {
                    label: "Env. / Regulatory",
                    desc: "Environmental quality and regulatory burden — superfund site density, environmental compliance exposure, and land-use constraints that affect long-term development potential.",
                  },
                };
                const entries = Object.entries(county.dims).filter(([k]) => !["demographic_momentum","business_dynamism","economic_distress","logistics"].includes(k));
                const rows = [];
                for (let i = 0; i < entries.length; i += 2) rows.push(entries.slice(i, i + 2));
                return rows.map((row, ri) => (
                  <View key={ri} style={{ flexDirection: "row", gap: 6, marginBottom: 6 }}>
                    {row.map(([key, score]) => {
                      const pct = Math.min(score ?? 0, 100);
                      const fill = pct >= 80 ? R.navy : pct >= 60 ? "#4a7fb5" : R.muted;
                      const { label, desc } = dims[key] ?? { label: key, desc: "" };
                      return (
                        <View key={key} style={{ flex: 1, border: `0.75px solid ${R.border}`, borderRadius: 2, padding: "7 9 7 9" }}>
                          <Text style={{ fontSize: 5.5, color: R.muted, fontFamily: "Helvetica-Bold", textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 3 }}>
                            {label}
                          </Text>
                          <Text style={{ fontSize: 18, fontFamily: "Helvetica-Bold", color: R.navy, lineHeight: 1, marginBottom: 4 }}>
                            {pct.toFixed(0)}
                          </Text>
                          <View style={{ height: 3, backgroundColor: R.border, borderRadius: 1.5, marginBottom: 6 }}>
                            <View style={{ width: `${pct}%`, height: 3, backgroundColor: fill, borderRadius: 1.5 }} />
                          </View>
                          <Text style={{ fontSize: 6, color: R.sub, lineHeight: 1.5 }}>{desc}</Text>
                        </View>
                      );
                    })}
                  </View>
                ));
              })()}
            </View>

          </View>
        </View>
        <Footer page={1} date={generated} />
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
              <Text style={s.mastheadEyebrow}>Borrower Report  ·  Page 2 of 4</Text>
              <Text style={s.mastheadTitle}>{countyDisplay}, {state}  ·  Market Overview</Text>
              {county && (
                <Text style={s.mastheadSub}>{tierLabel ?? ""}  ·  Composite {county.composite?.toFixed(1)}</Text>
              )}
            </View>
            {/* Market Score — compact inline stat, no border */}
            {county && (
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ fontSize: 6, fontFamily: "Helvetica-Bold", color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: 1.2, marginBottom: 1 }}>Market Score</Text>
                <Text style={{ fontSize: 18, fontFamily: "Helvetica-Bold", color: R.white, lineHeight: 1 }}>{county.composite?.toFixed(1)}</Text>
                <Text style={{ fontSize: 6, color: "rgba(255,255,255,0.4)", marginTop: 1.5 }}>Rank #{county.rank} of 3,104</Text>
              </View>
            )}
          </View>
          <View style={s.redRule} />
        </>

        {/* Metrics bar — Market Score removed (now in header), 6 cells with more room */}
        <View style={s.metricsBar}>
          {[
            { l: "Trailing 1yr HPA",  v: met?.zhvi_growth_1yr != null ? p1(met.zhvi_growth_1yr) : "—", s: "ZHVI growth" },
            { l: "Projected HPA",     v: `${hpaMid.toFixed(1)}%`,                           s: hpaOut ? `${hpaRange} range` : "model estimate" },
            { l: "Median HHI",        v: met?.median_hhi ? $k(met.median_hhi) : "—",        s: "household income" },
            { l: "Unemployment",      v: met?.unemployment_rate != null ? `${met.unemployment_rate.toFixed(1)}%` : "—", s: "local rate" },
            { l: "Pop. Growth",       v: met?.pop_growth_pct != null ? `${met.pop_growth_pct >= 0 ? "+" : ""}${met.pop_growth_pct.toFixed(1)}%` : "—", s: "5-yr trend" },
            { l: "Median Home Value", v: met?.zhvi_latest ? $k(met.zhvi_latest) : "—",      s: "ZHVI latest" },
          ].map((m, i, a) => (
            <View key={i} style={i < a.length - 1 ? s.mCell : s.mCellL}>
              <Text style={s.mLabel}>{m.l}</Text>
              <Text style={s.mVal}>{m.v}</Text>
              <Text style={s.mSub}>{m.s}</Text>
            </View>
          ))}
        </View>

        <View style={[s.body, { paddingTop: 8 }]}>
          <View style={s.sec}>
            <Text style={s.secT}>Market Summary</Text>
            <View style={s.secRule} />
          </View>

          {county && (
            <View style={{ marginBottom: 5 }}>
              <Text style={{ fontSize: 6.5, color: R.sub, lineHeight: 1.5 }}>
                {countyDisplay} ranks #{county.rank} in the American Pledge Market Score universe with a composite of {county.composite?.toFixed(1)}{tierLabel ? ` (${tierLabel} tier)` : ""}.
                {hpaOut
                  ? ` The market carries a ${hpaOut.label} HPA outlook (${hpaRange} implied range). The 10-year projection uses a blended rate of ${hpaMid.toFixed(1)}%/yr — 60% weight on trailing county ZHVI and 40% on the forward model signal.`
                  : met?.zhvi_growth_1yr != null
                    ? ` Trailing 12-month home price appreciation was ${p1(met.zhvi_growth_1yr)}, with a blended forward projection of ${hpaMid.toFixed(1)}%/yr used for 10-year equity modeling.`
                    : ""}
                {met?.unemployment_rate != null ? ` Local unemployment sits at ${met.unemployment_rate.toFixed(1)}%, and` : ""}
                {met?.median_hhi ? ` the median household income is ${$k(met.median_hhi)}/yr.` : ""}
                {" "}American Pledge targets markets where the appreciation thesis is credible over a 5–10 year hold, supporting the long-term equity position for borrowers who enter through the program.
              </Text>
            </View>
          )}
          {deepDive && <DeepDiveBlockSm text={deepDive.replace(/\n?\*\*Execution Risks\*\*[\s\S]*$/i, "").trim()} />}
        </View>
        <Footer page={2} date={generated} />
      </Page>

      {/* ════════════════════════════════════════════════════════════════════
          PAGE 3  ·  Loan Comparison & Equity Projections
      ════════════════════════════════════════════════════════════════════ */}
      <Page size="LETTER" style={s.page}>
        <Masthead
          logoUrl={logoUrl}
          eyebrow="Borrower Report  ·  Page 3 of 4"
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

          {/* Loan comparison cards */}
          <Sec
            title="Loan Comparison"
            sub={`${kalshiMtgPct.toFixed(2)}% 30-yr fixed (Kalshi)  ·  Standard: ${stdLbl} down  ·  American Pledge: 1% buyer + 19% AP = 20% down, no PMI`}
          />

          <View style={[s.cols, { marginBottom: 12 }]}>
            <View style={s.lCard}>
              <View style={s.lHead}><Text style={s.lTitle}>Standard Loan  ·  {stdLbl} Down</Text></View>
              <View style={s.lBody}>
                <Text style={s.lBig}>{$(stdTotal)}<Text style={{ fontSize: 8, color: R.muted }}>/mo</Text></Text>
                <Text style={s.lSub}>P&I: {$(stdPI)}{stdPMI > 0 ? `  +  ${$(stdPMI)} PMI` : ""}</Text>
                {stdDTI  != null && <LR label="Housing DTI"           val={`${stdDTI.toFixed(1)}%`} />}
                {stdPool != null && <LR label="Qualifying Households" val={`~${stdPool.toFixed(0)}%`} />}
                {hhi     != null && <LR label="Min. Qualifying Income" val={`${$k((stdTotal / 0.43) * 12)}/yr`} />}
                {hhi     != null && (() => {
                  const d = (stdTotal / 0.43) * 12 - hhi;
                  return <LR label="vs Median HHI" val={`${d > 0 ? "▲" : "▼"} ${$k(Math.abs(d))}`} />;
                })()}
              </View>
            </View>
            <View style={s.lCardN}>
              <View style={s.lHeadN}><Text style={s.lTitleW}>American Pledge  ·  1% Buyer + 19% AP</Text></View>
              <View style={[s.lBody, { backgroundColor: R.navy }]}>
                <Text style={s.lBigW}>{$(apPI)}<Text style={{ fontSize: 8, color: "rgba(255,255,255,0.5)" }}>/mo</Text></Text>
                <Text style={s.lSubW}>P&I: {$(apPI)}  ·  No PMI</Text>
                {apDTI  != null && <LR white label="Housing DTI"           val={`${apDTI.toFixed(1)}%`} />}
                {apPool != null && <LR white label="Qualifying Households" val={`~${apPool.toFixed(0)}%`} />}
                {hhi    != null && <LR white label="Min. Qualifying Income" val={`${$k((apPI / 0.43) * 12)}/yr`} />}
                {hhi    != null && (() => {
                  const d = (apPI / 0.43) * 12 - hhi;
                  return <LR white label="vs Median HHI" val={`${d > 0 ? "▲" : "▼"} ${$k(Math.abs(d))}`} />;
                })()}
              </View>
            </View>
          </View>

          {/* Equity table */}
          <Sec
            title="10-Year Equity & Investment Outcome"
            sub={`HPA: ${hpaMid.toFixed(1)}%/yr (${hpaOut ? `midpoint of ${hpaRange} range` : "model estimate"})  ·  "AP + Savings" adds cumulative monthly savings vs standard`}
          />

          <View style={s.tWrap}>
            <View style={s.thead}>
              {[
                ["Yr", 0.4], [`Std ${stdLbl} Equity`, 1], ["AP Net Equity", 1],
                ["AP + Savings", 1], ["vs Standard", 1], ["Est. Value", 1], ["AP Ret. Share", 0.75],
              ].map(([h, fl], i) => (
                <Text key={i} style={[s.th, { flex: fl }]}>{h}</Text>
              ))}
            </View>
            {rows.map(({ yr, fv, se, ae, ap, vs, rs }, i) => (
              <View key={yr} style={i % 2 === 1 ? s.trAlt : s.tr}>
                <Text style={[s.tdB,  { flex: 0.4  }]}>{yr}</Text>
                <Text style={[s.td,   { flex: 1    }]}>{$(se)}</Text>
                <Text style={[s.td,   { flex: 1    }]}>{$(ae)}</Text>
                <Text style={[s.tdB,  { flex: 1    }]}>{$(ap)}</Text>
                <Text style={[vs >= 0 ? s.tdPos : s.tdNeg, { flex: 1 }]}>{vs >= 0 ? "+" : ""}{$(vs)}</Text>
                <Text style={[s.tdM,  { flex: 1    }]}>{$(fv)}</Text>
                <Text style={[s.tdM,  { flex: 0.75 }]}>{p0(rs)}</Text>
              </View>
            ))}
          </View>

          {/* Return schedule */}
          <Text style={[s.statL, { marginBottom: 4 }]}>AP Appreciation Return Share Schedule</Text>
          <View style={s.rsStrip}>
            {AP_RS.map((rs, i) => {
              const hi = i < 5;
              return (
                <View key={i} style={[s.rsCell, { backgroundColor: hi ? "#e8ecf2" : R.row, borderWidth: 0.75, borderColor: hi ? R.navy : R.border, borderRadius: 2 }]}>
                  <Text style={[s.rsYr, { color: hi ? R.navy : R.muted }]}>Yr {i + 1}</Text>
                  <Text style={[s.rsV,  { color: hi ? R.navy : R.muted }]}>{Math.round(rs * 100)}%</Text>
                </View>
              );
            })}
          </View>

          {/* Methodology */}
          <View style={{ backgroundColor: R.row, border: `0.75px solid ${R.border}`, borderRadius: 2, padding: "7 9" }}>
            <Text style={[s.statL, { marginBottom: 2 }]}>Methodology</Text>
            <Text style={{ fontSize: 6.5, color: R.muted, lineHeight: 1.7 }}>
              AP tranche compounds annually: prior claim + (annual appreciation × AP return share %) + stewardship fee ($900/yr yrs 1–5, $0 thereafter). AP Net Equity = home value − senior loan balance (30-yr amortizing on 80% principal) − AP's compounded claim. "AP + Savings" adds cumulative monthly savings vs the standard {stdLbl} comparison loan. "vs Standard" = (AP + Savings) minus standard equity at same year. HPA uses {hpaMid.toFixed(1)}% (forward-looking implied midpoint). All figures nominal.
            </Text>
          </View>

        </View>
        <Footer page={3} date={generated} />
      </Page>

      {/* ════════════════════════════════════════════════════════════════════
          PAGE 4  ·  About American Pledge
      ════════════════════════════════════════════════════════════════════ */}
      <Page size="LETTER" style={s.page}>
        <Masthead
          logoUrl={logoUrl}
          eyebrow="Borrower Report  ·  Page 4 of 4"
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
        <Footer page={4} date={generated} />
      </Page>

    </Document>
  );
};

// ─── Generate and open in new tab ────────────────────────────────────────────
const GMAPS_KEY       = process.env.REACT_APP_GOOGLE_PLACES      || "";
const GMAPS_SVR_KEY   = process.env.REACT_APP_GOOGLE_SERVER_KEY  || "";
const RENTCAST_KEY    = process.env.REACT_APP_RENTCAST_KEY        || "";

export async function generateAndOpenReport(data) {
  let logoUrl = null;
  let mapUrl  = null;

  // Fetch AmPledge logo
  try {
    const res  = await fetch("/DocLogo.png");
    const blob = await res.blob();
    logoUrl = await new Promise(resolve => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  } catch (_) { /* proceed without logo */ }

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

  const [nearbyPlaces, streetViewUrl, propertyDetails, floodZone] = await Promise.all([
    fetchNearbyPlaces(),
    fetchStreetView(),
    fetchPropertyDetails(),
    fetchFloodZone(),
  ]);

  const blob = await pdf(
    <PropertyReportDoc data={{ ...data, logoUrl, mapUrl, nearbyPlaces, streetViewUrl, propertyDetails, floodZone }} />
  ).toBlob();
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
