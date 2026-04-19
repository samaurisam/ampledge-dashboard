// scripts/deploy-s3.mjs
// !! ALWAYS deploy via this script (npm run deploy) — never raw `aws s3 sync --delete`
// !! Protected S3 paths (never deleted by sync):
//      ground-score/*      — pipeline-generated county/market data
//      oz_tracts.topojson  — static OZ boundary data
//      oz_tracts.geojson   — static OZ boundary data
// !! S3 bucket versioning is ENABLED — deleted/overwritten files can be recovered via:
//      aws s3api list-object-versions --bucket ampledge-fund --prefix ground-score/counties.json
//      aws s3api get-object --bucket ampledge-fund --key ground-score/counties.json --version-id <id> recovered.json
import { config } from "dotenv";
import { execSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Verify protected files still exist in S3 before proceeding — fail loudly if missing
const bucket = (() => {
  const b = process.env.BUCKET;
  if (!b) { console.error("ERROR: BUCKET not set in .env"); process.exit(1); }
  return b;
})();
const PROTECTED = [
  `s3://${bucket}/ground-score/counties.json`,
  `s3://${bucket}/ground-score/places-index.json.gz`,
  `s3://${bucket}/ground-score/deep_dives.json`,
];
for (const path of PROTECTED) {
  try {
    execSync(`aws s3 ls "${path}"`, { stdio: "pipe" });
  } catch {
    console.warn(`WARNING: Protected file missing from S3: ${path}`);
    console.warn("Re-upload from ground-score-pipeline/output/ before or after deploy.");
  }
}

console.log(`Deploying to bucket: ${bucket}`);

const sync = (excludeHtml = false, cacheControl, contentType = "") => {
  const cmd = [
    "aws s3 sync",
    join(__dirname, "..", "build").replace(/\\/g, "/"),
    `s3://${bucket}`,
    "--delete",
    '--exclude "ground-score/*"',  // never delete pipeline data
    '--exclude "oz_tracts.topojson"', // never delete static OZ boundary data
    '--exclude "oz_tracts.geojson"',  // never delete static OZ boundary data
    `--cache-control "${cacheControl}"`,
    excludeHtml ? '--exclude "*.html"' : "",
    !excludeHtml ? '--exclude "*.*" --include "*.html"' : "",
    contentType ? `--content-type "${contentType}"` : "",
  ]
    .filter(Boolean)
    .join(" ");

  console.log(`Running: ${cmd}`);
  execSync(cmd, { stdio: "inherit" });
};

// Upload assets (long cache)
sync(true, "max-age=31536000,public");

// Upload HTML (no cache)
sync(false, "max-age=0,no-cache,no-store,must-revalidate", "text/html");

console.log("Deploy complete!");
