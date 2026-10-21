"use client";

import React, { useState, useEffect, useCallback } from "react";
import { DoodleSpotGraphic, DoodleSpotVariant, ALL_DOODLE_VARIANTS } from "./DoodleSpotGraphic";

export type SpotPosition = "topRight" | "topLeft" | "sideLeft" | "sideRight";

interface SpotConfig {
  position: SpotPosition;
  variant: DoodleSpotVariant;
  key: string;
}

interface AcademicDoodleSpotsProps {
  className?: string;
}

/**
 * Fisher-Yates array shuffle helper
 */
function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * AcademicDoodleSpots:
 * Manages dynamic, playful Neo-Brutalist academic doodles placed around the professor or university card.
 *
 * Requirements fulfilled:
 * 1. 100% Academic & University themed (grad cap, textbooks, A+ exam, study coffee, backpack, thumbs rating, giant pencil, chalkboard).
 * 2. Zero gradient colors (pure high-contrast solid pastel & primary colors, thick black borders).
 * 3. Dynamic quantity: Randomly chooses 2, 3, or 4 doodles on page entry or whenever clicked.
 * 4. Interactive: Clicking on any doodle instantly triggers a fresh random quantity and illustration set!
 */
export const AcademicDoodleSpots: React.FC<AcademicDoodleSpotsProps> = ({ className = "" }) => {
  // Deterministic initial state for clean SSR hydration
  const [spots, setSpots] = useState<SpotConfig[]>([
    { position: "topRight", variant: "thumbs_rating", key: "init-top-right" },
    { position: "sideLeft", variant: "grad_cap", key: "init-side-left" },
    { position: "sideRight", variant: "book_stack", key: "init-side-right" },
  ]);

  const [isWobbling, setIsWobbling] = useState(false);

  // Randomize both count (2 to 4) and distinct variants across slots
  const randomizeSpots = useCallback(() => {
    // 1. Random quantity: 2, 3, or 4
    const count = Math.floor(Math.random() * 3) + 2; // [2, 3, 4]

    // 2. Candidate positions
    // Always include at least one top position so mobile/tablet gets fun doodles
    const candidatePositions: SpotPosition[] = ["topRight", "sideLeft", "sideRight", "topLeft"];
    const shuffledPositions = shuffleArray(candidatePositions);
    
    // Ensure topRight is preserved if possible for mobile view
    let chosenPositions: SpotPosition[];
    if (count === 4) {
      chosenPositions = candidatePositions;
    } else {
      if (!shuffledPositions.slice(0, count).includes("topRight")) {
        chosenPositions = ["topRight", ...shuffledPositions.filter((p) => p !== "topRight").slice(0, count - 1)];
      } else {
        chosenPositions = shuffledPositions.slice(0, count);
      }
    }

    // 3. Pick distinct variants
    const shuffledVariants = shuffleArray(ALL_DOODLE_VARIANTS);
    const newSpots: SpotConfig[] = chosenPositions.map((pos, idx) => ({
      position: pos,
      variant: shuffledVariants[idx % shuffledVariants.length],
      key: `${pos}-${shuffledVariants[idx % shuffledVariants.length]}-${Date.now()}-${idx}`,
    }));

    setIsWobbling(true);
    setSpots(newSpots);

    // Reset wobble animation after 300ms
    setTimeout(() => {
      setIsWobbling(false);
    }, 300);
  }, []);

  // Randomize on component mount (each time a user visits / clicks into a lecturer/school page)
  useEffect(() => {
    randomizeSpots();
  }, [randomizeSpots]);

  const findSpot = (pos: SpotPosition) => spots.find((s) => s.position === pos);

  const spotTopLeft = findSpot("topLeft");
  const spotTopRight = findSpot("topRight");
  const spotSideLeft = findSpot("sideLeft");
  const spotSideRight = findSpot("sideRight");

  return (
    <div className={`relative ${className}`}>
      {/* --- TOP ROW SPOTS (Floating above the card) --- */}
      <div className="flex justify-between items-end -mb-8 sm:-mb-12 px-2 sm:px-6 relative z-20 pointer-events-none">
        {/* Top-Left Slot */}
        <div className="pointer-events-auto">
          {spotTopLeft && (
            <div
              className={`transform transition-all duration-300 ${
                isWobbling ? "scale-90 rotate-6" : "hover:scale-110 hover:-rotate-3"
              }`}
            >
              <DoodleSpotGraphic
                key={spotTopLeft.key}
                variant={spotTopLeft.variant}
                size="sm"
                onClick={randomizeSpots}
                title="Nhấn để đổi hình ngẫu nhiên / Click to shuffle doodles"
                className="drop-shadow-[3px_3px_0px_rgba(0,0,0,0.15)]"
              />
            </div>
          )}
        </div>

        {/* Top-Right Slot */}
        <div className="pointer-events-auto ml-auto">
          {spotTopRight && (
            <div
              className={`transform transition-all duration-300 ${
                isWobbling ? "scale-90 -rotate-6" : "hover:scale-110 hover:rotate-3"
              }`}
            >
              <DoodleSpotGraphic
                key={spotTopRight.key}
                variant={spotTopRight.variant}
                size="sm"
                onClick={randomizeSpots}
                title="Nhấn để đổi hình ngẫu nhiên / Click to shuffle doodles"
                className="sm:hidden drop-shadow-[3px_3px_0px_rgba(0,0,0,0.15)]"
              />
              <DoodleSpotGraphic
                key={`${spotTopRight.key}-md`}
                variant={spotTopRight.variant}
                size="md"
                onClick={randomizeSpots}
                title="Nhấn để đổi hình ngẫu nhiên / Click to shuffle doodles"
                className="hidden sm:inline-block drop-shadow-[4px_4px_0px_rgba(0,0,0,0.18)]"
              />
            </div>
          )}
        </div>
      </div>

      {/* --- SIDE LEFT SPOT (Desktop Flank) --- */}
      {spotSideLeft && (
        <div className="absolute -left-20 xl:-left-28 2xl:-left-36 top-1/2 -translate-y-1/2 z-10 pointer-events-none hidden lg:block">
          <div
            className={`pointer-events-auto transform transition-all duration-300 ${
              isWobbling ? "scale-90 -rotate-12" : "hover:scale-110 hover:rotate-2"
            }`}
          >
            <DoodleSpotGraphic
              key={spotSideLeft.key}
              variant={spotSideLeft.variant}
              size="lg"
              onClick={randomizeSpots}
              title="Nhấn để đổi hình ngẫu nhiên / Click to shuffle doodles"
              className="drop-shadow-[4px_4px_0px_rgba(0,0,0,0.18)]"
            />
          </div>
        </div>
      )}

      {/* --- SIDE RIGHT SPOT (Desktop Flank) --- */}
      {spotSideRight && (
        <div className="absolute -right-20 xl:-right-28 2xl:-right-36 top-1/2 -translate-y-1/2 z-10 pointer-events-none hidden lg:block">
          <div
            className={`pointer-events-auto transform transition-all duration-300 ${
              isWobbling ? "scale-90 rotate-12" : "hover:scale-110 hover:-rotate-2"
            }`}
          >
            <DoodleSpotGraphic
              key={spotSideRight.key}
              variant={spotSideRight.variant}
              size="lg"
              onClick={randomizeSpots}
              title="Nhấn để đổi hình ngẫu nhiên / Click to shuffle doodles"
              className="drop-shadow-[4px_4px_0px_rgba(0,0,0,0.18)]"
            />
          </div>
        </div>
      )}
    </div>
  );
};
