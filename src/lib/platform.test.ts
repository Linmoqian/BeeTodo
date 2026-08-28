import { afterEach, describe, expect, it } from "vitest";
import { getOsPlatform } from "./platform";

const originalUserAgent = window.navigator.userAgent;

function setUserAgent(userAgent: string) {
  Object.defineProperty(window.navigator, "userAgent", {
    value: userAgent,
    configurable: true,
  });
}

afterEach(() => {
  setUserAgent(originalUserAgent);
});

describe("getOsPlatform", () => {
  it("detects windows from the user agent", () => {
    setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    );
    expect(getOsPlatform()).toBe("windows");
  });

  it("detects macos from the user agent", () => {
    setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
    );
    expect(getOsPlatform()).toBe("macos");
  });

  it("detects linux from the user agent", () => {
    setUserAgent(
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    );
    expect(getOsPlatform()).toBe("linux");
  });

  it("falls back to unknown for unrecognized user agents", () => {
    setUserAgent("Mozilla/5.0 (BeefcakeOS 1.0) AppleWebKit/537.36");
    expect(getOsPlatform()).toBe("unknown");
  });
});
