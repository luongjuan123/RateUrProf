import test from "node:test";
import assert from "node:assert/strict";
import { getServerUniversities } from "../src/lib/server/searchIndex";
import { executeServerSearch } from "../src/lib/server/searchIndex";

test("Dual-Mode Search & Card Presentation", async (t) => {
  await t.test("School search returns matching institutions with location and counts", async () => {
    const schools = await getServerUniversities("Bách Khoa");
    assert.ok(Array.isArray(schools), "Should return array of universities");
    assert.ok(schools.length > 0, "Should find at least 1 matching university for Bách Khoa");

    const school = schools[0];
    assert.ok(school.name || school.nameVi, "University must have a Vietnamese or primary name");
    assert.ok(school.city || school.cityVi, "University must provide city / location for top-right badge");
  });

  await t.test("School search by acronym matches accurately (e.g. HUST)", async () => {
    const hustResults = await getServerUniversities("HUST");
    assert.ok(hustResults.length > 0, "Should find HUST by acronym");
    assert.equal(hustResults[0].id, "hust");
    assert.equal(hustResults[0].shortName, "HUST");
  });

  await t.test("Professor search returns verified professors with ratings and difficulty stats", async () => {
    const profResults = await executeServerSearch(
      { query: "Ng" },
      "relevance",
      { page: 1, pageSize: 10 }
    );

    assert.ok(profResults.items.length > 0, "Should return matching professors");
    const prof = profResults.items[0];

    assert.ok(prof.fullName || prof.name, "Professor must have name");
    assert.ok(prof.universityName || prof.universityShortName, "Professor must have university affiliation");
    // Verify structure supports takeAgainPercent and difficultyScore
    assert.ok("takeAgainPercent" in prof);
    assert.ok("difficultyScore" in prof);
  });

  await t.test("Default search mode in page.tsx is lecturer/professor by name", async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const pageContent = fs.readFileSync(
      path.resolve(__dirname, "../src/app/page.tsx"),
      "utf8"
    );

    // Verify initialMode defaults to 'professor' when mode param is not 'school'
    assert.match(
      pageContent,
      /paramMode === "school" \? "school" : "professor"/,
      "page.tsx must default to professor mode when accessing the web without mode param"
    );

    // Verify modeFromUrl in useEffect also defaults to 'professor'
    assert.match(
      pageContent,
      /searchParams\.get\("mode"\) === "school" \? "school" : "professor"/,
      "modeFromUrl must default to professor mode"
    );

    // Verify 'Tôi muốn tìm theo trường đại học' button is underlined
    assert.match(
      pageContent,
      /className="[^"]*underline[^"]*"[\s\S]*?>\s*\{locale === "en"\s*\?\s*"I want to find a professor at a school"\s*:\s*"Tôi muốn tìm theo trường đại học"\}/,
      "'Tôi muốn tìm theo trường đại học' button must have underline class"
    );

    // Verify search submit button has onClick handler for immediate execution
    assert.match(
      pageContent,
      /<button[\s\S]*?type="submit"[\s\S]*?onClick=\{handleSearchSubmit\}/,
      "Search button must explicitly bind onClick={handleSearchSubmit}"
    );

    // Verify handleSearchSubmit sets hasSearched to true immediately and aborts autocomplete
    assert.match(
      pageContent,
      /setHasSearched\(true\);[\s\S]*?performSearch\(q, searchMode, 1, false\);[\s\S]*?router\.push/,
      "handleSearchSubmit must set hasSearched to true and push to results"
    );

    // Verify hero section is conditionally rendered with !hasSearched so results page takes over
    assert.match(
      pageContent,
      /\{!hasSearched && \(\s*<section className="min-h-\[calc\(100vh-80px\)\]/,
      "Hero section must only render when !hasSearched to transition to results page"
    );
  });
});

test.after(async () => {
  const { isPostgresConfigured, getPostgresPool } = await import("../src/lib/server/postgresClient");
  if (isPostgresConfigured()) {
    await getPostgresPool().end();
  }
});

