import { Component, ErrorInfo, ReactNode } from "react";
import { RefreshIcon } from "./icons";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  // Explicitly declare props to ensure availability in all TS environments
  public declare props: Readonly<Props>;

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReset = async () => {
    // Service Workerの登録解除
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
      }
    }
    // キャッシュストレージのクリア
    if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map(key => caches.delete(key)));
    }
    // リロード
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-900 text-white p-6 text-center safe-area-pt safe-area-pb">
          <div className="bg-gray-800 p-8 rounded-3xl shadow-2xl max-w-sm w-full border border-gray-700">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h1 className="text-xl font-black mb-3 tracking-tight">読み込みエラー</h1>
            <p className="mb-8 text-gray-400 text-sm font-medium leading-relaxed">
              アプリの起動中に問題が発生しました。<br/>
              メモリ不足やキャッシュの不整合が考えられます。
            </p>
            <button
              onClick={this.handleReset}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <RefreshIcon className="w-5 h-5" />
              修復してリロード
            </button>
            <details className="mt-6 text-left">
              <summary className="text-[10px] text-gray-600 cursor-pointer outline-none">詳細エラー情報</summary>
              <pre className="mt-2 text-[9px] text-gray-500 overflow-auto max-w-full bg-black/30 p-2 rounded max-h-32 whitespace-pre-wrap break-all">
                {this.state.error?.toString()}
              </pre>
            </details>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}