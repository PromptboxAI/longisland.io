/**
 * Geography assertions, run against the real town lists in areas.ts.
 *
 * Every case the regression audit named, plus the two found fabricated in live
 * data (Old Bethpage, Briarcliff Manor). Run before trusting a change here.
 */
import { readFileSync } from "node:fs";

const src = readFileSync("src/lib/yelp/areas.ts", "utf8");
const sets = {};
for (const n of ["NASSAU_TOWNS", "SUFFOLK_TOWNS"]) {
  const i = src.indexOf(`const ${n}`);
  const b = src.slice(src.indexOf("[", i), src.indexOf("]", i));
  sets[n] = new Set([...b.matchAll(/"([^"]+)"/g)].map((m) => m[1]));
}

const county = (c, s) => {
  if (!c) return null;
  if (s && s.trim().toUpperCase() !== "NY") return null;
  const k = c.trim().toLowerCase();
  return sets.NASSAU_TOWNS.has(k) ? "Nassau County"
       : sets.SUFFOLK_TOWNS.has(k) ? "Suffolk County"
       : null;
};

const onIsland = (zip) => {
  if (!zip) return null;
  const d = String(zip).trim().slice(0, 5);
  if (!/^\d{5}$/.test(d)) return null;
  const n = Number(d);
  if (n < 11000 || n > 11999) return false;
  if (n >= 11201 && n <= 11256) return false;           // Brooklyn
  if (n === 11004 || n === 11005) return false;         // Queens side of Floral Park
  if (n >= 11101 && n <= 11109) return false;           // Long Island City
  if (n >= 11351 && n <= 11499) return false;           // Queens
  if (n >= 11690 && n <= 11697) return false;           // Rockaways
  return true;
};

const cases = [
  ["New Haven", "CT", "06510", null],
  ["Shelton", "CT", "06484", null],
  ["Old Saybrook", "CT", null, null],
  ["Norwalk", "CT", null, null],
  ["Huntington", "CT", null, null],
  ["Sunnyside", "NY", "11104", null],
  ["Flushing", "NY", "11354", null],
  ["Brooklyn", "NY", "11201", null],
  ["Briarcliff Manor", "NY", "10510", null],
  ["Mount Kisco", "NY", null, null],
  ["Mamaroneck", "NY", null, null],
  ["Nowhereville", "NY", null, null],
  ["Stony Brook", "NY", "11790", "Suffolk County"],
  ["Farmingville", "NY", "11738", "Suffolk County"],
  ["Middle Island", "NY", "11953", "Suffolk County"],
  ["Ocean Beach", "NY", "11770", "Suffolk County"],
  ["Speonk", "NY", "11972", "Suffolk County"],
  ["Kismet", "NY", null, "Suffolk County"],
  ["Montauk", "NY", "11954", "Suffolk County"],
  ["North Babylon", "NY", "11703", "Suffolk County"],
  ["Saint James", "NY", "11780", "Suffolk County"],
  ["Garden City", "NY", "11530", "Nassau County"],
  ["Hicksville", "NY", "11801", "Nassau County"],
  ["Old Bethpage", "NY", "11804", "Nassau County"],
  ["Great Neck Plaza", "NY", null, "Nassau County"],
];

let pass = 0, fail = 0;

console.log("COUNTY FROM TOWN NAME");
for (const [city, state, , expected] of cases) {
  const got = county(city, state);
  const ok = got === expected;
  if (ok) pass++; else fail++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${(city + ", " + state).padEnd(26)} -> ${String(got).padEnd(14)} (want ${expected})`);
}

console.log("\nZIP MUST NOT CONTRADICT THE TOWN NAME");
for (const [city, state, zip] of cases) {
  if (!zip) continue;
  const li = onIsland(zip);
  const byName = county(city, state);
  // Two ways to be wrong: a county asserted over an off-island ZIP, or an
  // unknown town sitting on a Long Island ZIP.
  const conflict = (byName !== null && li === false) || (byName === null && li === true);
  const ok = !conflict;
  if (ok) pass++; else fail++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${(city + " " + zip).padEnd(26)} onIsland=${String(li).padEnd(6)} name=${byName}`);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
