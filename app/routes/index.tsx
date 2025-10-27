import { useEffect } from "react";
import { useNavigate } from "react-router";

export default function IndexRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/dashboard/submissions", { replace: true });
  }, [navigate]);

  return null;
}
