import { useEffect, useState } from "react";
import { Download, ExternalLink, RefreshCw } from "lucide-react";
import { checkForUpdate, openUpdateDownload, type UpdateInfo } from "../lib/update";

type UpdateStatus = "checking" | "ready" | "error";

export function UpdateSettings() {
  const [status, setStatus] = useState<UpdateStatus>("checking");
  const [info, setInfo] = useState<UpdateInfo | null>(null);

  const check = async () => {
    setStatus("checking");
    try {
      setInfo(await checkForUpdate());
      setStatus("ready");
    } catch {
      setStatus("error");
    }
  };

  useEffect(() => {
    void check();
  }, []);

  const message = status === "checking"
    ? "正在检查 GitHub 最新版本…"
    : status === "error"
      ? "暂时无法连接 GitHub，请稍后重试"
      : info?.currentVersion
        ? info.hasUpdate
          ? `发现新版本 v${info.latestVersion}`
          : `当前 v${info.currentVersion}，已是最新版`
        : `GitHub 最新版本 v${info?.latestVersion}`;

  return (
    <div className="update-settings">
      <div className="update-copy">
        <strong>{message}</strong>
        {info?.assetName && <span>已匹配：{info.assetName}</span>}
      </div>
      <div className="update-actions">
        <button
          type="button"
          className="icon-button"
          aria-label="重新检查更新"
          disabled={status === "checking"}
          onClick={() => void check()}
        >
          <RefreshCw className={status === "checking" ? "is-spinning" : ""} size={15} />
        </button>
        {info && (
          <button
            type="button"
            className={info.hasUpdate || !info.currentVersion ? "update-download" : "update-release-link"}
            onClick={() => void openUpdateDownload(info.downloadUrl)}
          >
            {info.assetName ? <Download size={14} /> : <ExternalLink size={14} />}
            <span>{info.assetName ? "下载最新版" : "查看发布页"}</span>
          </button>
        )}
      </div>
    </div>
  );
}
