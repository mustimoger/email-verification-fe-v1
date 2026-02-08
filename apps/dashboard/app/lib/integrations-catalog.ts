import { ApiError, type IntegrationOption } from "./api-client";
import { getSupabaseBrowserClient } from "./supabase-browser";

type IntegrationCatalogRow = {
  id: string;
  label: string;
  description: string;
  icon_url: string | null;
  default_name: string | null;
  external_purpose: string | null;
  sort_order: number | null;
  is_active: boolean | null;
};

type SupabaseCatalogQuery = {
  eq: (column: string, value: boolean) => SupabaseCatalogQuery;
  order: (column: string, options: { ascending: boolean }) => SupabaseCatalogQuery;
};

type SupabaseCatalogSelect = {
  select: (columns: string) => SupabaseCatalogQuery;
};

type SupabaseCatalogClient = {
  from: (table: string) => unknown;
};

const MAKE_DOT_COM_INTEGRATION: IntegrationOption = {
  id: "make-com",
  label: "Make.com",
  description:
    "Build no-code scenarios that call the API with a tagged key. Keys stay universal; selecting Make.com only tags usage.",
  icon: "/integrations/make.png",
  default_name: "Make.com",
  external_purpose: "make.com",
};

function ensureMakeDotComIntegration(options: IntegrationOption[]): IntegrationOption[] {
  if (options.length === 0) {
    return options;
  }

  const ids = new Set(options.map((option) => option.id.trim().toLowerCase()));
  const labels = new Set(options.map((option) => option.label.trim().toLowerCase()));

  const hasZapier = ids.has("zapier") || labels.has("zapier");
  const hasN8n = ids.has("n8n") || labels.has("n8n");
  const hasGoogleSheets =
    ids.has("google-sheets") || ids.has("google_sheets") || labels.has("google sheets");

  const hasMakeDotCom =
    ids.has("make-com") ||
    ids.has("make.com") ||
    ids.has("make") ||
    labels.has("make.com") ||
    labels.has("make");

  if (!hasZapier || !hasN8n || !hasGoogleSheets || hasMakeDotCom) {
    return options;
  }

  return [...options, MAKE_DOT_COM_INTEGRATION];
}

export async function listIntegrationsCatalogWithClient(
  supabase: SupabaseCatalogClient,
): Promise<IntegrationOption[]> {
  const query = (supabase.from("integrations_catalog") as SupabaseCatalogSelect)
    .select("id,label,description,icon_url,default_name,external_purpose,sort_order,is_active")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("label", { ascending: true });
  // Supabase query builders are thenable at runtime but not typed as PromiseLike.
  const { data, error } = await (query as unknown as PromiseLike<{
    data: IntegrationCatalogRow[] | null;
    error: { message: string } | null;
  }>);

  if (error) {
    console.error("integrations.catalog_load_failed", { error });
    throw new ApiError(500, error.message, error);
  }

  if (!data) {
    return [];
  }

  const options = data.map((row: IntegrationCatalogRow) => ({
    id: row.id,
    label: row.label,
    description: row.description,
    icon: row.icon_url,
    default_name: row.default_name,
    external_purpose: row.external_purpose,
  }));

  return ensureMakeDotComIntegration(options);
}

export async function listIntegrationsCatalog(): Promise<IntegrationOption[]> {
  return listIntegrationsCatalogWithClient(getSupabaseBrowserClient());
}
