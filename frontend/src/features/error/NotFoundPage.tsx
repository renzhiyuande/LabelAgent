import { ArrowLeft, FileQuestion, Home } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "../../components/ui/button";
import { ErrorStatusPage } from "./ErrorStatusPage";

export function NotFoundPage() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <ErrorStatusPage
      code="404"
      title="页面不存在"
      description="当前路径没有对应页面，可能是链接失效、菜单未配置，或地址输入有误。"
      icon={FileQuestion}
      path={location.pathname}
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
