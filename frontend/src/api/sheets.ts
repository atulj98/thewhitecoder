export interface SheetSummary {
  slug: string;
  title: string;
  description: string;
  sort_order: number;
  is_published: boolean;
}
export interface SheetItem {
  stable_key: string;
  title: string;
  kind: string;
  source_url: string | null;
}
export interface SheetTopic {
  stable_key: string;
  title: string;
  items: SheetItem[];
}
export interface SheetStep {
  stable_key: string;
  title: string;
  topics: SheetTopic[];
}
export interface SheetDetail extends SheetSummary {
  revision_number: number | null;
  steps: SheetStep[];
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`/api/v1${path}`, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    if (response.status === 404) throw new Error("Sheet not found");
    throw new Error("We could not load the sheets. Please try again.");
  }
  return (await response.json()) as T;
}
export const getSheets = () => getJson<SheetSummary[]>("/sheets");
export const getSheet = (slug: string) =>
  getJson<SheetDetail>(`/sheets/${encodeURIComponent(slug)}`);
