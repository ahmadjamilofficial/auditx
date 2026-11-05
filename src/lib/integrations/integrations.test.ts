import { beforeEach, describe, expect, it } from "vitest";
import { csvImportAdapter, parseCsv, transactionDedupeKey } from "./adapters.server";
import { decryptCredentials, encryptCredentials, redact } from "./crypto.server";
import { catalogDrift } from "./registry.server";

const CSV = [
  "date,symbol,side,quantity,price,fees,currency,id",
  "2026-01-05,OGDC,buy,100,142.50,25,PKR,T-1001",
  '2026-01-06,"TCS",sell,50,915.00,30,PKR,T-1002',
].join("\n");

describe("csv parsing", () => {
  it("parses a header row and quoted fields", () => {
    const rows = parseCsv(CSV);
    expect(rows).toHaveLength(2);
    expect(rows[0]?.["symbol"]).toBe("OGDC");
    expect(rows[1]?.["symbol"]).toBe("TCS");
  });

  it("handles CRLF line endings and trailing blank lines", () => {
    const rows = parseCsv("a,b\r\n1,2\r\n\r\n");
    expect(rows).toEqual([{ a: "1", b: "2" }]);
  });

  it("returns nothing when only a header exists", () => {
    expect(parseCsv("date,symbol")).toEqual([]);
  });
});

describe("csv adapter", () => {
  it("reports a parse failure instead of pretending to connect", async () => {
    const result = await csvImportAdapter.test({ credentials: {}, config: { csv: "date,symbol" } });
    expect(result.ok).toBe(false);
    expect(result.message).toMatch(/No data rows/i);
  });

  it("accepts a real file and reports the row count", async () => {
    const result = await csvImportAdapter.test({ credentials: {}, config: { csv: CSV } });
    expect(result.ok).toBe(true);
    expect(result.message).toContain("2 rows");
    expect(result.permissions?.["read"]).toBe(true);
  });

  it("normalizes rows into typed transactions", async () => {
    const txs = await csvImportAdapter.fetchTransactions(
      { credentials: {}, config: { csv: CSV } },
      undefined,
    );
    expect(txs).toHaveLength(2);
    const [first] = txs;
    expect(first?.kind).toBe("trade");
    expect(first?.side).toBe("buy");
    expect(first?.instrument).toBe("OGDC");
    expect(first?.quantity).toBe(100);
    expect(first?.price).toBe(142.5);
    expect(first?.fees).toBe(25);
    expect(first?.currency).toBe("PKR");
    expect(first?.occurredAt).toBe(new Date("2026-01-05").toISOString());
  });

  it("skips rows without a usable date rather than inventing one", async () => {
    const csv =
      "date,symbol,side,quantity,price\nnot-a-date,OGDC,buy,10,1\n2026-02-01,OGDC,buy,10,1";
    const txs = await csvImportAdapter.fetchTransactions(
      { credentials: {}, config: { csv } },
      undefined,
    );
    expect(txs).toHaveLength(1);
  });

  it("reports no live balances for a historical statement", async () => {
    expect(await csvImportAdapter.fetchAccounts({ credentials: {}, config: {} })).toEqual([]);
  });
});

describe("record identity", () => {
  it("derives a stable dedupe key for the same record", () => {
    expect(transactionDedupeKey("csv_import", "conn-1:T-1001")).toBe(
      transactionDedupeKey("csv_import", "conn-1:T-1001"),
    );
  });

  it("distinguishes the same external id across providers", () => {
    expect(transactionDedupeKey("binance", "conn-1:42")).not.toBe(
      transactionDedupeKey("alpaca", "conn-1:42"),
    );
  });
});

describe("credential encryption", () => {
  beforeEach(() => {
    process.env["WAB_CREDENTIAL_KEY"] = "k".repeat(64);
  });

  it("round-trips a credential payload", () => {
    const payload = { apiKey: "abc", apiSecret: "shhh" };
    const encrypted = encryptCredentials(payload);
    expect(encrypted.ciphertext).not.toContain("shhh");
    expect(decryptCredentials(encrypted)).toEqual(payload);
  });

  it("fails closed when the key is missing", () => {
    const previous = process.env["WAB_CREDENTIAL_KEY"];
    delete process.env["WAB_CREDENTIAL_KEY"];
    expect(() => encryptCredentials({ apiKey: "x" })).toThrow(/WAB_CREDENTIAL_KEY/);
    process.env["WAB_CREDENTIAL_KEY"] = previous;
  });

  it("rejects tampered ciphertext (GCM auth tag)", () => {
    const encrypted = encryptCredentials({ apiSecret: "value" });
    const tampered = { ...encrypted, ciphertext: Buffer.from("tampered").toString("base64") };
    expect(() => decryptCredentials(tampered)).toThrow();
  });

  it("redacts secret-shaped keys before logging", () => {
    expect(redact({ apiKey: "abc", label: "Binance", apiSecret: "x" })).toEqual({
      apiKey: "[redacted]",
      apiSecret: "[redacted]",
      label: "Binance",
    });
  });
});

describe("provider registry", () => {
  it("has an adapter for every catalog provider and vice versa", () => {
    expect(catalogDrift()).toEqual([]);
  });
});
