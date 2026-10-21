import { runAllTests } from "./searchEngine.test";
import { SearchEngine } from "../searchEngine";
import { TEST_PROFESSORS } from "./testDataset";
import { SearchFilters } from "@/types";

async function main() {
  console.log("=================================================");
  console.log(" RATEURPROFS SEARCH & FILTER TEST SUITE");
  console.log("=================================================\n");

  // 1. Run 30 Correctness Scenarios
  runAllTests();

  // 2. Performance Benchmark (1,000 Search Queries)
  console.log("\n=================================================");
  console.log(" RUNNING PERFORMANCE BENCHMARK (1,000 QUERIES)");
  console.log("=================================================");

  const engine = new SearchEngine();
  engine.bulkIndex(TEST_PROFESSORS);

  const sampleQueries: SearchFilters[] = [
    { query: "Nguyễn Văn An" },
    { query: "Nguyen" },
    { query: "Bách Khoa" },
    { universityIds: ["hust"] },
    { universityIds: ["hust", "hcmut"], majorIds: ["cntt"] },
    { majorIds: ["cntt"], minRating: 4.0 },
    { facultyIds: ["Trường Công nghệ Thông tin & Truyền thông"] },
    { courseIds: ["Cấu trúc Dữ liệu & Giải thuật"] },
    { researchInterests: ["Khai phá Dữ liệu Lớn"] },
    { minRating: 4.5, minReviewCount: 20 },
    { universityIds: ["neu"], name: "Anh" },
    { query: "Machine Learning" },
  ];

  const latencies: number[] = [];
  const TOTAL_RUNS = 1000;

  for (let i = 0; i < TOTAL_RUNS; i++) {
    const f = sampleQueries[i % sampleQueries.length];
    const t0 = performance.now();
    engine.search(f, "relevance", { page: 1, pageSize: 12 });
    const elapsed = performance.now() - t0;
    latencies.push(elapsed);
  }

  latencies.sort((a, b) => a - b);
  const min = latencies[0].toFixed(3);
  const max = latencies[latencies.length - 1].toFixed(3);
  const p50 = latencies[Math.floor(latencies.length * 0.5)].toFixed(3);
  const p95 = latencies[Math.floor(latencies.length * 0.95)].toFixed(3);
  const p99 = latencies[Math.floor(latencies.length * 0.99)].toFixed(3);
  const avg = (latencies.reduce((sum, v) => sum + v, 0) / latencies.length).toFixed(3);

  console.log(`- Total Benchmark Queries: ${TOTAL_RUNS}`);
  console.log(`- Minimum Latency:         ${min} ms`);
  console.log(`- Average Latency:         ${avg} ms`);
  console.log(`- 50th Percentile (p50):    ${p50} ms`);
  console.log(`- 95th Percentile (p95):    ${p95} ms (Target: < 500 ms)`);
  console.log(`- 99th Percentile (p99):    ${p99} ms`);
  console.log(`- Maximum Latency:         ${max} ms`);

  if (parseFloat(p95) < 500) {
    console.log(`\n✅ PERFORMANCE TARGET MET: p95 latency (${p95} ms) is well below the 500 ms threshold!`);
  } else {
    console.error(`\n❌ PERFORMANCE TARGET FAILED: p95 latency (${p95} ms) exceeds 500 ms`);
    process.exit(1);
  }

  console.log("\n=================================================");
  console.log(" ALL SEARCH & FILTERING CHECKS COMPLETED SUCCESSFULLY");
  console.log("=================================================");
}

main().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
