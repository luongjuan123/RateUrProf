import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { ALL_DOODLE_VARIANTS } from "../src/components/illustrations/DoodleSpotGraphic";

describe("Academic Doodles & Spot Illustrations Verification", () => {
  test("defines 8 authentic academic doodle variants", () => {
    assert.equal(ALL_DOODLE_VARIANTS.length, 8);
    const expected = [
      "grad_cap",
      "book_stack",
      "exam_grade",
      "coffee_mug",
      "backpack",
      "thumbs_rating",
      "stationery",
      "chalkboard",
    ];
    assert.deepEqual(ALL_DOODLE_VARIANTS, expected);
  });

  test("contains strictly ZERO SVG gradients in DoodleSpotGraphic.tsx", () => {
    const doodleFilePath = path.join(
      process.cwd(),
      "src/components/illustrations/DoodleSpotGraphic.tsx"
    );
    const content = fs.readFileSync(doodleFilePath, "utf8");

    // Must NOT contain gradient tags
    assert.equal(
      content.includes("<linearGradient"),
      false,
      "DoodleSpotGraphic must not contain linearGradient"
    );
    assert.equal(
      content.includes("<radialGradient"),
      false,
      "DoodleSpotGraphic must not contain radialGradient"
    );
    assert.equal(
      content.includes("url(#"),
      false,
      "DoodleSpotGraphic must not use gradient url references"
    );
  });

  test("AcademicDoodleSpots supports dynamic count [2, 3, 4] and click shuffle", () => {
    const spotsFilePath = path.join(
      process.cwd(),
      "src/components/illustrations/AcademicDoodleSpots.tsx"
    );
    const content = fs.readFileSync(spotsFilePath, "utf8");

    assert.ok(content.includes("Math.random() * 3) + 2"));
    assert.ok(content.includes("randomizeSpots"));
    assert.ok(content.includes("ALL_DOODLE_VARIANTS"));
    assert.ok(content.includes("onClick={randomizeSpots}"));
  });

  test("Professor and University detail pages integrate AcademicDoodleSpots", () => {
    const profClient = fs.readFileSync(
      path.join(process.cwd(), "src/app/professors/[id]/ProfessorDetailClient.tsx"),
      "utf8"
    );
    const uniClient = fs.readFileSync(
      path.join(process.cwd(), "src/app/universities/[id]/UniversityDetailClient.tsx"),
      "utf8"
    );

    assert.ok(profClient.includes("<AcademicDoodleSpots"));
    assert.ok(uniClient.includes("<AcademicDoodleSpots"));
    // Old bug/leaf monstrosity variant 'peeking' is completely eradicated
    assert.equal(profClient.includes('variant="peeking"'), false);
    assert.equal(uniClient.includes('variant="peeking"'), false);
  });

  test("LecturerAvatar cleanAndFormatAvatarUrl strictly rejects gradients and SVG data URIs", async () => {
    const { cleanAndFormatAvatarUrl } = await import(
      "../src/components/LecturerAvatar"
    );

    // Rejects SVG data URI containing linearGradient
    const svgGrad =
      "data:image/svg+xml;utf8,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cdefs%3E%3ClinearGradient%20id%3D%22grad-0%22%3E%3C/linearGradient%3E%3C/defs%3E%3C/svg%3E";
    assert.equal(cleanAndFormatAvatarUrl(svgGrad), null);

    // Rejects any URL containing "gradient"
    assert.equal(cleanAndFormatAvatarUrl("https://example.com/avatar-gradient.png"), null);
    assert.equal(cleanAndFormatAvatarUrl("data:image/svg+xml;utf8,<svg><rect fill='red'/></svg>"), null);

    // Rejects placeholders
    assert.equal(cleanAndFormatAvatarUrl("https://example.com/default_avatar.jpg"), null);
    assert.equal(cleanAndFormatAvatarUrl("https://example.com/placeholder.png"), null);

    // Accepts authentic verified photos (upgrades HTTP to HTTPS)
    const validPhoto = "http://faculty.university.edu.vn/photos/nguyen_van_a.jpg";
    assert.equal(
      cleanAndFormatAvatarUrl(validPhoto),
      "https://faculty.university.edu.vn/photos/nguyen_van_a.jpg"
    );
  });

  test("Detail pages: Verified Profile & School badges removed and search banner simplified", () => {
    const profClient = fs.readFileSync(
      path.join(process.cwd(), "src/app/professors/[id]/ProfessorDetailClient.tsx"),
      "utf8"
    );
    const uniClient = fs.readFileSync(
      path.join(process.cwd(), "src/app/universities/[id]/UniversityDetailClient.tsx"),
      "utf8"
    );

    // Assert badges are removed
    assert.equal(profClient.includes("Verified Profile"), false, "Must not contain Verified Profile");
    assert.equal(uniClient.includes("Verified School"), false, "Must not contain Verified School");

    // Assert old yellow banner is removed
    assert.equal(uniClient.includes("DANH SÁCH GIẢNG VIÊN"), false, "Must not contain DANH SÁCH GIẢNG VIÊN badge");
    assert.equal(uniClient.includes("universityDetail.searchProfAtSchool"), false, "Must not contain large banner search title");

    // Assert simple search bar form is present
    assert.ok(uniClient.includes("SIMPLE SEARCH PROFESSOR AT THIS SCHOOL BAR"), "Must contain simple search bar comment");
    assert.ok(uniClient.includes("onSubmit={handleProfSearch}"), "Must keep search form with handleProfSearch");
    assert.ok(uniClient.includes("value={profSearchQuery}"), "Must keep search input with profSearchQuery");
  });

  test("Empty states simplified across saved professors, lecturer, school, and search pages", () => {
    const accountClient = fs.readFileSync(
      path.join(process.cwd(), "src/components/AccountClient.tsx"),
      "utf8"
    );
    const profClient = fs.readFileSync(
      path.join(process.cwd(), "src/app/professors/[id]/ProfessorDetailClient.tsx"),
      "utf8"
    );
    const uniClient = fs.readFileSync(
      path.join(process.cwd(), "src/app/universities/[id]/UniversityDetailClient.tsx"),
      "utf8"
    );
    const pageClient = fs.readFileSync(
      path.join(process.cwd(), "src/app/page.tsx"),
      "utf8"
    );

    // EmptyStateGraphic must be removed from all pages
    assert.equal(accountClient.includes("EmptyStateGraphic"), false, "AccountClient must not use EmptyStateGraphic");
    assert.equal(profClient.includes("EmptyStateGraphic"), false, "ProfessorDetailClient must not use EmptyStateGraphic");
    assert.equal(uniClient.includes("EmptyStateGraphic"), false, "UniversityDetailClient must not use EmptyStateGraphic");
    assert.equal(pageClient.includes("EmptyStateGraphic"), false, "page.tsx must not use EmptyStateGraphic");

    // Saved professors empty state must have old tilted graphic and concise text
    assert.ok(accountClient.includes("savedProfIds.length === 0"), "Must check savedProfIds length");
    assert.ok(accountClient.includes("PopArtBookmark"), "Must use PopArtBookmark");
    assert.ok(accountClient.includes("Bạn chưa lưu giảng viên nào"), "Must have simple title 'Bạn chưa lưu giảng viên nào'");
    assert.equal(accountClient.includes("Đánh dấu lưu các giảng viên bạn quan tâm"), false, "Must not have verbose explanation");

    // Lecturer and University pages must have clean, simple empty states
    assert.ok(profClient.includes("filteredReviews.length === 0"), "Must check filteredReviews length");
    assert.ok(profClient.includes("PopArtMessageSquare"), "Must use PopArtMessageSquare");
    assert.ok(uniClient.includes("schoolReviews.length === 0"), "Must check schoolReviews length");
    assert.ok(uniClient.includes("PopArtBuilding"), "Must use PopArtBuilding");
  });
});

