import { Component, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * 지도 컴포넌트 동적 로드 실패 시 fallback UI를 보여주는 Error Boundary
 */
export class MapErrorFallback extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error("Map load failed:", error);
  }

  handleRetry = () => {
    this.setState({ hasError: false });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-48 rounded-lg bg-secondary/50 flex flex-col items-center justify-center gap-3 p-4">
          <p className="text-sm text-muted-foreground text-center">
            지도 로딩에 실패했습니다.
          </p>
          <Button variant="outline" size="sm" onClick={this.handleRetry}>
            <RefreshCw className="w-4 h-4 mr-2" />
            새로고침
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}