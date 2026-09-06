import { ArrowLeft, Home, ShieldX } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { ErrorStatusPage } from "./ErrorStatusPage";

export function ForbiddenPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;

  return (
    <ErrorStatusPage
      code="403"
      title="无访问权限"
      description="当前账号没有访问此页面的权限。如需继续，请联系管理员分配相应角色或权限。"
      icon={ShieldX}
      tone="danger"
      path={from}
      actions={
        <>
          <Button variant="outline" onClick={() => navigate(-1)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回上一页
          </Button>
          <Button onClick={() => navigate("/", { replace: true })}>
            <Home className="mr-2 h-4 w-4" />
            回到工作台
          </Button>
        </>
      }
    />
  );
}
