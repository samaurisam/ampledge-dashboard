// scripts/setup-cloudfront-errors.mjs
// Configures CloudFront to serve /index.html for 403/404 responses,
// enabling clean-path client-side routing (e.g. /portfolio, /housing-market).
import { config } from "dotenv";
import { execSync } from "child_process";

config();

const distId = process.env.DISTRIBUTION_ID;
if (!distId) {
  console.error("ERROR: DISTRIBUTION_ID not set in .env");
  process.exit(1);
}

console.log(`Fetching distribution config for ${distId}…`);
const raw = execSync(
  `aws cloudfront get-distribution-config --id ${distId}`,
  { encoding: "utf8" }
);
const { ETag, DistributionConfig } = JSON.parse(raw);

// Inject / replace custom error responses for 403 and 404
const existing = (DistributionConfig.CustomErrorResponses?.Items || []).filter(
  (e) => e.ErrorCode !== 403 && e.ErrorCode !== 404
);

const errorPages = [
  { ErrorCode: 403, ResponsePagePath: "/index.html", ResponseCode: "200", ErrorCachingMinTTL: 0 },
  { ErrorCode: 404, ResponsePagePath: "/index.html", ResponseCode: "200", ErrorCachingMinTTL: 0 },
];

DistributionConfig.CustomErrorResponses = {
  Quantity: existing.length + errorPages.length,
  Items: [...existing, ...errorPages],
};

const cfgJson = JSON.stringify(DistributionConfig);

console.log("Updating distribution with custom error responses…");
execSync(
  `aws cloudfront update-distribution --id ${distId} --if-match "${ETag}" --distribution-config '${cfgJson.replace(/'/g, "'\\''")}'`,
  { stdio: "inherit", shell: true }
);

console.log("Done — CloudFront will serve /index.html for 403 and 404 responses.");
