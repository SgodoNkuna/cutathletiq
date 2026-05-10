// Writes public/version.json with the current ISO timestamp so the in-app
// "New version available" banner can detect deploys.
//   node scripts/bump-version.mjs
import { writeFileSync } from "node:fs";
const v = new Date().toISOString();
writeFileSync("public/version.json", JSON.stringify({ version: v }) + "\n");
console.log("version.json →", v);
