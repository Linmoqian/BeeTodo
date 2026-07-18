import { invoke } from "@tauri-apps/api/core";
import { openUrl } from "@tauri-apps/plugin-opener";
import { isTauriRuntime } from "./platform";

const RELEASE_API = "https://api.github.com/repos/Linmoqian/BeeTodo/releases/latest";

interface ReleaseAsset {
  name: string;
  browser_download_url: string;
}

interface GitHubRelease {
  tag_name: string;
  html_url: string;
  assets: ReleaseAsset[];
}

interface AppRuntimeInfo {
  version: string;
  os: string;
  arch: string;
}

export interface UpdateInfo {
  currentVersion: string | null;
  latestVersion: string;
  hasUpdate: boolean;
  downloadUrl: string;
  assetName: string | null;
  releaseUrl: string;
}

function versionParts(version: string) {
  return version.replace(/^v/, "").split(".").map((part) => Number.parseInt(part, 10) || 0);
}

function isNewerVersion(latest: string, current: string) {
  const latestParts = versionParts(latest);
  const currentParts = versionParts(current);
  const length = Math.max(latestParts.length, currentParts.length);
  for (let index = 0; index < length; index += 1) {
    const difference = (latestParts[index] ?? 0) - (currentParts[index] ?? 0);
    if (difference !== 0) return difference > 0;
  }
  return false;
}

function detectWebRuntime(): AppRuntimeInfo {
  const userAgent = navigator.userAgent.toLowerCase();
  const os = userAgent.includes("win")
    ? "windows"
    : userAgent.includes("mac")
      ? "macos"
      : userAgent.includes("linux")
        ? "linux"
        : "unknown";
  const arch = /arm64|aarch64/.test(userAgent)
    ? "aarch64"
    : /x64|x86_64|win64|amd64/.test(userAgent)
      ? "x86_64"
      : "unknown";
  return { version: "", os, arch };
}

function assetScore(asset: ReleaseAsset, runtime: AppRuntimeInfo) {
  const name = asset.name.toLowerCase();
  if (name.endsWith(".sig") || name === "latest.json") return -1000;

  let score = 0;
  if (runtime.os === "windows") {
    if (name.endsWith(".exe")) score += 100;
    else if (name.endsWith(".msi")) score += 80;
    else return -1000;
    if (name.includes("setup")) score += 20;
  } else if (runtime.os === "macos") {
    if (name.endsWith(".dmg")) score += 100;
    else if (name.endsWith(".app.tar.gz")) score += 70;
    else return -1000;
    if (name.includes("universal")) score += 25;
  } else if (runtime.os === "linux") {
    if (name.endsWith(".appimage")) score += 100;
    else if (name.endsWith(".deb")) score += 80;
    else return -1000;
  } else {
    return -1000;
  }

  if (runtime.arch === "aarch64") {
    if (/aarch64|arm64/.test(name)) score += 30;
    if (/x64|x86_64|amd64/.test(name)) score -= 30;
  } else if (runtime.arch === "x86_64") {
    if (/x64|x86_64|amd64/.test(name)) score += 30;
    if (/aarch64|arm64/.test(name)) score -= 30;
  }
  return score;
}

function selectReleaseAsset(assets: ReleaseAsset[], runtime: AppRuntimeInfo) {
  const rankedAssets = assets
    .map((asset) => ({ asset, score: assetScore(asset, runtime) }))
    .filter(({ score }) => score >= 0)
    .sort((left, right) => right.score - left.score);
  if (runtime.arch !== "unknown") return rankedAssets[0]?.asset ?? null;

  const architecturePattern = /aarch64|arm64|x64|x86_64|amd64/;
  const universalAsset = rankedAssets.find(({ asset }) => {
    const name = asset.name.toLowerCase();
    return name.includes("universal") || !architecturePattern.test(name);
  });
  return universalAsset?.asset ?? (rankedAssets.length === 1 ? rankedAssets[0].asset : null);
}

export async function checkForUpdate(): Promise<UpdateInfo> {
  const runtime = isTauriRuntime()
    ? await invoke<AppRuntimeInfo>("get_app_runtime_info")
    : detectWebRuntime();
  const response = await fetch(RELEASE_API, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!response.ok) throw new Error(`GitHub Release 请求失败：${response.status}`);

  const release = await response.json() as GitHubRelease;
  const latestVersion = release.tag_name.replace(/^v/, "");
  const asset = selectReleaseAsset(release.assets, runtime);
  return {
    currentVersion: runtime.version || null,
    latestVersion,
    hasUpdate: runtime.version ? isNewerVersion(latestVersion, runtime.version) : false,
    downloadUrl: asset?.browser_download_url ?? release.html_url,
    assetName: asset?.name ?? null,
    releaseUrl: release.html_url,
  };
}

export async function openUpdateDownload(url: string) {
  if (isTauriRuntime()) await openUrl(url);
  else window.open(url, "_blank", "noopener,noreferrer");
}
