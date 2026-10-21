"use client";

import React from "react";
import { NationwideCrawlerDashboard } from "./NationwideCrawlerDashboard";

export function CrawlerSection() {
  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      <NationwideCrawlerDashboard />
    </div>
  );
}
