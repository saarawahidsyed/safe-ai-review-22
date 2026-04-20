import { Navigate, useLocation } from "react-router-dom";
import { useAuth, AppRole } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

export function ProtectedRoute({ children, requireRole }: { children: JSX.Element; requireRole?: AppRole }) {
  const { user, loading, hasRole } = useAuth();
  const location = useLocation();
  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" state={{ from: location }} replace />;
  if (requireRole && !hasRole(requireRole)) {
    return (
      <div className="min-h-screen grid place-items-center bg-background p-6 text-center">
        <div className="max-w-sm space-y-2">
          <h1 className="text-lg font-semibold text-foreground">Access denied</h1>
          <p className="text-sm text-muted-foreground">You need the <span className="font-medium">{requireRole}</span> role to view this page. Ask an administrator to grant access.</p>
        </div>
      </div>
    );
  }
  return children;
}