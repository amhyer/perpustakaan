// Test sederhana untuk rate limiter (jalankan manual dengan: bun src/lib/__tests__/rate-limit.test.ts)

import { rateLimit } from "../rate-limit";

async function testRateLimit() {
  console.log("Test 1: limit 3, 5 request cepat");
  for (let i = 1; i <= 5; i++) {
    const r = rateLimit({ key: "test-1", limit: 3, windowMs: 1000 });
    console.log(`  Request ${i}: success=${r.success}, remaining=${r.remaining}`);
  }
  console.log("\nTest 2: tunggu 1.1 detik, harusnya reset");
  await new Promise((res) => setTimeout(res, 1100));
  const r = rateLimit({ key: "test-1", limit: 3, windowMs: 1000 });
  console.log(`  Request setelah reset: success=${r.success}, remaining=${r.remaining}`);

  console.log("\nTest 3: key berbeda independen");
  const r2 = rateLimit({ key: "test-2", limit: 3, windowMs: 1000 });
  console.log(`  Key baru: success=${r2.success}, remaining=${r2.remaining}`);
}

testRateLimit().catch(console.error);
