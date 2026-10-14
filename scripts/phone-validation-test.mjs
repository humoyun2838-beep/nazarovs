import assert from "node:assert/strict";
import { isValidUzPhone } from "../src/lib/uz-phone.ts";

const cases = [
  ["+998901234567", true], ["901234567", true],
  ["998901234567", true], ["+998 (90) 123-45-67", true],
  ["", false], ["+998", false], ["90123456", false],
  ["+9989012345678", false], ["9012345678", false],
  ["+79991234567", false], ["abc901234567", false],
];
for (const [value, expected] of cases) {
  assert.equal(isValidUzPhone(value), expected, value);
}
console.log(`PASS: ${cases.length} phone validation cases`);
