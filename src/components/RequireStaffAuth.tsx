import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import type { StaffRole } from "@/contexts/AuthContext";

type Props = {
  children: ReactNode;
  allowRoles: StaffRole[];
};

export function RequireStaffAuth({ children, allowRoles }: Props) {
  const { user } = useAuth();
  if (!user || !user.roles.some((r) => allowRoles.includes(r))) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
