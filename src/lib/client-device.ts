export type DeviceInfo = {
  device: string;
  browser: string;
  os: string;
  model: string;
};

function windowsLabel(ua: string) {
  const nt = ua.match(/Windows NT ([\d.]+)/i);
  if (!nt) return "Windows PC";
  const map: Record<string, string> = {
    "10.0": "Windows 10/11 PC",
    "6.3": "Windows 8.1 PC",
    "6.2": "Windows 8 PC",
    "6.1": "Windows 7 PC",
  };
  return map[nt[1]] || `Windows ${nt[1]} PC`;
}

function androidModel(ua: string) {
  const build = ua.match(/Android [^;]+;\s*([^;)]+?)(?:\s+Build|\s*\)|; wv)/i);
  if (!build) return "Android telefon";
  const raw = build[1].replace(/\s+/g, " ").trim();
  if (!raw || /^(k|wv|linux|android|mobile)$/i.test(raw)) return "Android telefon";
  return raw;
}

export function parseClientDevice(uaRaw: string): DeviceInfo {
  const ua = String(uaRaw || "");
  const low = ua.toLowerCase();

  let device = "Kompyuter";
  if (/ipad|tablet|playbook|silk/i.test(ua)) device = "Planshet";
  else if (/mobile|iphone|ipod|android.+mobile|windows phone|opera mini/i.test(ua)) {
    device = "Telefon";
  }

  let os = "Noma’lum";
  if (/windows nt/i.test(ua)) os = "Windows";
  else if (/mac os x|macintosh/i.test(ua)) os = "macOS";
  else if (/android/i.test(ua)) os = "Android";
  else if (/iphone|ipad|ipod/i.test(ua)) os = "iOS";
  else if (/linux/i.test(ua)) os = "Linux";
  else if (/cros/i.test(ua)) os = "ChromeOS";

  let browser = "Noma’lum";
  if (/edg\//i.test(ua)) browser = "Edge";
  else if (/opr\/|opera/i.test(ua)) browser = "Opera";
  else if (/firefox|fxios/i.test(ua)) browser = "Firefox";
  else if (/chrome|crios/i.test(ua) && !/edg\//i.test(ua)) browser = "Chrome";
  else if (/safari/i.test(ua) && !/chrome|crios|android/i.test(ua)) browser = "Safari";
  else if (/samsungbrowser/i.test(ua)) browser = "Samsung Internet";
  else if (/yabrowser/i.test(ua)) browser = "Yandex";
  else if (low.includes("telegram")) browser = "Telegram";

  let model = `${os} qurilma`;
  if (/iphone/i.test(ua)) {
    const ios = ua.match(/OS (\d+[_\d]*)/);
    model = ios ? `iPhone · iOS ${ios[1].replace(/_/g, ".")}` : "iPhone";
  } else if (/ipad/i.test(ua)) {
    model = "iPad";
  } else if (/android/i.test(ua)) {
    model = androidModel(ua);
  } else if (/windows nt/i.test(ua)) {
    model = windowsLabel(ua);
  } else if (/macintosh|mac os x/i.test(ua)) {
    const mac = ua.match(/Mac OS X (\d+[._]\d+)/);
    model = mac ? `Mac · macOS ${mac[1].replace(/_/g, ".")}` : "Mac";
  } else if (/cros/i.test(ua)) {
    model = "Chromebook";
  } else if (/linux/i.test(ua)) {
    model = "Linux kompyuter";
  }

  return { device, browser, os, model };
}

export function viaLabel(info: DeviceInfo) {
  return `${info.model} · ${info.browser}`;
}
