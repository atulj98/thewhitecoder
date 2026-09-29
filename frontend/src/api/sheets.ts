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

// GitHub Pages hosts a static preview until the FastAPI service is deployed.
const previewSheets: SheetSummary[] = [
  {
    slug: "dsa",
    title: "Data Structures & Algorithms",
    description: "A guided path from fundamentals to advanced problem solving.",
    sort_order: 1,
    is_published: false,
  },
  {
    slug: "cn",
    title: "Computer Networks",
    description:
      "Build a strong understanding of networking, from layers to protocols.",
    sort_order: 2,
    is_published: false,
  },
  {
    slug: "os",
    title: "Operating Systems",
    description:
      "Learn processes, memory, concurrency, and the foundations of modern systems.",
    sort_order: 3,
    is_published: false,
  },
  {
    slug: "dbms",
    title: "Database Management Systems",
    description: "Master data models, SQL concepts, transactions, and design.",
    sort_order: 4,
    is_published: false,
  },
  {
    slug: "oops",
    title: "Object Oriented Programming",
    description:
      "Practice the principles and patterns behind maintainable software.",
    sort_order: 5,
    is_published: false,
  },
];

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
export const getSheets = () =>
  import.meta.env.VITE_STATIC_SITE === "1"
    ? Promise.resolve(previewSheets)
    : getJson<SheetSummary[]>("/sheets");
export const getSheet = (slug: string) => {
  if (import.meta.env.VITE_STATIC_SITE === "1") {
    const sheet = previewSheets.find((item) => item.slug === slug);
    return sheet
      ? Promise.resolve<SheetDetail>({
          ...sheet,
          revision_number: null,
          steps: [],
        })
      : Promise.reject(new Error("Sheet not found"));
  }
  return getJson<SheetDetail>(`/sheets/${encodeURIComponent(slug)}`);
};
