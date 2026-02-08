import assert from "node:assert";

import { FileColumnError, readFileColumnInfo } from "../app/verify/file-columns";

async function run(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    // eslint-disable-next-line no-console
    console.log(`✓ ${name}`);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(`✗ ${name}`);
    throw error;
  }
}

async function main() {
  await run("readFileColumnInfo parses CSV headers", async () => {
    const file = new File(["email,source\nalpha@example.com,web"], "simple.csv", { type: "text/csv" });
    const info = await readFileColumnInfo(file);
    assert.deepStrictEqual(info.headers, ["email", "source"]);
    assert.strictEqual(info.columnCount, 2);
  });

  await run("readFileColumnInfo strips BOM from CSV headers", async () => {
    const file = new File(["\ufeffemail\nalpha@example.com"], "bom.csv", { type: "text/csv" });
    const info = await readFileColumnInfo(file);
    assert.strictEqual(info.headers[0], "email");
  });

  await run("readFileColumnInfo tolerates non-fatal CSV parse errors", async () => {
    const file = new File(['email,"name'], "broken.csv", { type: "text/csv" });
    const info = await readFileColumnInfo(file);
    assert.strictEqual(info.headers[0], "email");
  });

  await run("readFileColumnInfo rejects empty CSV files", async () => {
    const file = new File([""], "empty.csv", { type: "text/csv" });
    let thrown: unknown;
    try {
      await readFileColumnInfo(file);
    } catch (error) {
      thrown = error;
    }
    assert.ok(thrown instanceof FileColumnError);
    assert.strictEqual((thrown as FileColumnError).message, "CSV file is empty.");
  });
}

void main();
