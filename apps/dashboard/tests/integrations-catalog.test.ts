import assert from "node:assert";

import { ApiError } from "../app/lib/api-client";
import { listIntegrationsCatalogWithClient } from "../app/lib/integrations-catalog";

type QueryResult = {
  data: Array<{
    id: string;
    label: string;
    description: string;
    icon_url: string | null;
    default_name: string | null;
    external_purpose: string | null;
    sort_order: number | null;
    is_active: boolean | null;
  }> | null;
  error: { message: string } | null;
};

class FakeQuery implements PromiseLike<QueryResult> {
  calls = {
    select: "",
    eq: [] as Array<[string, boolean]>,
    order: [] as Array<[string, { ascending: boolean }]>,
  };

  constructor(private result: QueryResult) {}

  eq(column: string, value: boolean) {
    this.calls.eq.push([column, value]);
    return this;
  }

  order(column: string, options: { ascending: boolean }) {
    this.calls.order.push([column, options]);
    return this;
  }

  then<TResult1 = QueryResult>(
    onfulfilled?: (value: QueryResult) => TResult1 | PromiseLike<TResult1>,
    onrejected?: (reason: unknown) => TResult1 | PromiseLike<TResult1>,
  ) {
    return Promise.resolve(this.result).then(onfulfilled, onrejected);
  }
}

class FakeSelect {
  constructor(private query: FakeQuery) {}

  select(columns: string) {
    this.query.calls.select = columns;
    return this.query;
  }
}

class FakeSupabaseClient {
  lastTable: string | null = null;
  query: FakeQuery;

  constructor(result: QueryResult) {
    this.query = new FakeQuery(result);
  }

  from(table: string) {
    this.lastTable = table;
    return new FakeSelect(this.query);
  }
}

async function run(name: string, fn: () => void | Promise<void>) {
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
  await run("listIntegrationsCatalogWithClient maps rows and orders query", async () => {
    const result: QueryResult = {
      data: [
        {
        id: "tool-a",
        label: "Tool A",
        description: "Integrate Tool A.",
        icon_url: "/integrations/tool-a.png",
        default_name: "Tool A",
        external_purpose: "tool-a",
        sort_order: 1,
        is_active: true,
      },
    ],
    error: null,
  };
  const client = new FakeSupabaseClient(result);
  const options = await listIntegrationsCatalogWithClient(client);

  assert.strictEqual(client.lastTable, "integrations_catalog");
  assert.strictEqual(
    client.query.calls.select,
    "id,label,description,icon_url,default_name,external_purpose,sort_order,is_active",
  );
  assert.deepStrictEqual(client.query.calls.eq, [["is_active", true]]);
  assert.deepStrictEqual(client.query.calls.order, [
    ["sort_order", { ascending: true }],
    ["label", { ascending: true }],
  ]);

  assert.strictEqual(options.length, 1);
    assert.deepStrictEqual(options[0], {
      id: "tool-a",
      label: "Tool A",
      description: "Integrate Tool A.",
      icon: "/integrations/tool-a.png",
      default_name: "Tool A",
      external_purpose: "tool-a",
    });
  });

  await run("listIntegrationsCatalogWithClient returns empty when data is null", async () => {
    const client = new FakeSupabaseClient({ data: null, error: null });
    const options = await listIntegrationsCatalogWithClient(client);
    assert.deepStrictEqual(options, []);
  });

  await run("listIntegrationsCatalogWithClient throws ApiError on supabase error", async () => {
    const client = new FakeSupabaseClient({ data: null, error: { message: "query failed" } });
    try {
      await listIntegrationsCatalogWithClient(client);
      assert.fail("Expected ApiError");
    } catch (err) {
      assert.ok(err instanceof ApiError);
      assert.strictEqual(err.message, "query failed");
    }
  });
}

// eslint-disable-next-line no-console
main()
  .then(() => {
    // eslint-disable-next-line no-console
    console.log("integrations catalog tests completed");
  })
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error("integrations catalog tests failed");
    throw error;
  });
