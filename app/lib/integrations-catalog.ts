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
  select: (columns: string) => SupabaseCatalogQuery;
  eq: (column: string, value: boolean) => SupabaseCatalogQuery;
  order: (column: string, options: { ascending: boolean }) => SupabaseCatalogQuery;
};

type SupabaseCatalogClient = {
  from: (table: string) => SupabaseCatalogQuery;
};

export async function listIntegrationsCatalogWithClient(
  supabase: SupabaseCatalogClient,
): Promise<IntegrationOption[]> {
  const query = supabase
    .from("integrations_catalog")
    .select("id,label,description,icon_url,default_name,external_purpose,sort_order,is_active")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("label", { ascending: true });
  // Supabase query builders are thenable at runtime but not typed as PromiseLike.
  const { data, error } = await (query as PromiseLike<{
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

  return data.map((row: IntegrationCatalogRow) => ({
    id: row.id,
    label: row.label,
    description: row.description,
    icon: row.icon_url,
    default_name: row.default_name,
    external_purpose: row.external_purpose,
  }));
}

export async function listIntegrationsCatalog(): Promise<IntegrationOption[]> {
  return listIntegrationsCatalogWithClient(getSupabaseBrowserClient());
}
