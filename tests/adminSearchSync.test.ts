import test from "node:test";
import assert from "node:assert/strict";
import { getServerUniversities } from "../src/lib/server/searchIndex";
import { updateAdminUniversity, getAdminUniversities } from "../src/lib/server/adminDb";
import { searchLecturers } from "../src/lib/server/db";

test("Admin University Update & Instant Search Synchronization", async () => {
  // 1. Fetch first university to use as test target
  const list = await getAdminUniversities({ page: 1, pageSize: 5 });
  assert.ok(list.items.length > 0, "Should have universities to test with");
  const target = list.items[0];
  const originalName = target.name;
  const originalShortName = target.shortName;
  const originalAliases = [...target.aliases];

  const testUniqueTag = `TESTSYNC_${Date.now()}`;
  const testNewShortName = `TS_${Date.now() % 10000}`;
  const testNewAliases = [...originalAliases, testUniqueTag];

  try {
    // 2. Perform search before update - should NOT match testUniqueTag
    const beforeSearch = await getServerUniversities(testUniqueTag);
    assert.strictEqual(
      beforeSearch.some((u) => u.id === target.id),
      false,
      "Before update, search by new alias should not return the target"
    );

    // 3. Update university via admin operation
    const updateResult = await updateAdminUniversity(
      target.id,
      {
        shortName: testNewShortName,
        aliases: testNewAliases,
        reason: "Automated instant search sync test",
      },
      {
        id: "test-admin-sync",
        email: "dungpubgame@gmail.com",
        role: "super_admin",
      }
    );
    assert.strictEqual(updateResult.success, true, "Update should succeed");

    // 4. Perform search immediately - MUST find the target university by the new alias & short name
    const afterSearchByAlias = await getServerUniversities(testUniqueTag);
    assert.ok(
      afterSearchByAlias.some((u) => u.id === target.id),
      "Immediate search by new alias MUST return the target university"
    );

    const afterSearchByShort = await getServerUniversities(testNewShortName);
    assert.ok(
      afterSearchByShort.some((u) => u.id === target.id),
      "Immediate search by new shortName MUST return the target university"
    );

    // 5. Test searchLecturers by the new university shortName / query
    const lecturerSearch = await searchLecturers({
      query: testNewShortName,
      pageSize: 5,
    });
    // If target university has professors, the search should match them through affiliations
    if (target.totalProfessors > 0) {
      assert.ok(
        lecturerSearch.items.length > 0,
        "Lecturer search by updated university short name should find professors"
      );
      assert.strictEqual(
        lecturerSearch.items[0].universityId,
        target.id,
        "Returned lecturer must belong to the updated university"
      );
    }
  } finally {
    // 6. Restore original state
    await updateAdminUniversity(
      target.id,
      {
        name: originalName,
        shortName: originalShortName,
        aliases: originalAliases,
        reason: "Teardown: Restore original university data",
      },
      {
        id: "test-admin-sync",
        email: "dungpubgame@gmail.com",
        role: "super_admin",
      }
    );

    // Verify restore took effect
    const finalCheck = await getServerUniversities(testUniqueTag);
    assert.strictEqual(
      finalCheck.some((u) => u.id === target.id),
      false,
      "After restore, search by test alias should not return target"
    );
  }
});
