import { useQuery } from "@tanstack/react-query";
import { BookOpen, RefreshCw } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { getSheet } from "../api/sheets";
import { useSheetProgress } from "../lib/useSheetProgress";
import LearningWorkspace from "../components/LearningWorkspace";

export default function SheetPage() {
  const { slug = "" } = useParams();
  const sheetQuery = useQuery({
    queryKey: ["sheet", slug],
    queryFn: () => getSheet(slug),
    enabled: Boolean(slug),
  });
  const tracking = useSheetProgress(slug, sheetQuery.data);
  if (sheetQuery.isPending)
    return (
      <div className="container status-panel" role="status">
        Opening your learning workspace…
      </div>
    );
  if (sheetQuery.isError)
    return (
      <div className="container status-panel" role="alert">
        <h1>We couldn't open this sheet.</h1>
        <p>{sheetQuery.error.message}</p>
        <button
          className="text-button"
          onClick={() => void sheetQuery.refetch()}
        >
          <RefreshCw size={16} /> Try again
        </button>
        <Link className="back-link" to="/">
          Back to study sheets
        </Link>
      </div>
    );
  if (!sheetQuery.data.is_published)
    return (
      <div className="container status-panel">
        <BookOpen size={28} />
        <h1>This learning path is in preparation.</h1>
        <Link className="back-link" to="/">
          Back to available sheets
        </Link>
      </div>
    );
  return (
    <LearningWorkspace
      key={`${slug}:${tracking.account.data?.user.id ?? "guest"}`}
      sheet={sheetQuery.data}
      tracking={tracking}
    />
  );
}
