import { parse, subTitleType } from "subtitle";

import { esSubsChanged } from "@src/models/subs";
import { esRenderSetings } from "@src/models/settings";
import Service from "./service";

type YoutubeSubtitle = {
  dDurationMs: number;
  tStartMs: number;
  segs:
    | {
        utf8: string;
        tOffsetMs: number;
      }[]
    | undefined;
};

class Youtube implements Service {
  name = "youtube";

  private subCache: {
    [moveId: string]: {
      [lang: string]: string;
    };
  };
  private currentLang: string;

  constructor() {
    this.subCache = {};
    this.currentLang = "";
    this.handleCaptionsData = this.handleCaptionsData.bind(this);
    this.handleCaptionsChanges = this.handleCaptionsChanges.bind(this);
  }

  public init(): void {
    this.injectScript();
    window.addEventListener("esYoutubeCaptionsData", this.handleCaptionsData as EventListener);
    window.addEventListener("esYoutubeCaptionsChanged", this.handleCaptionsChanges as EventListener);
    window.addEventListener("esYoutubeLoaded", this.handleLoaded as EventListener);
  }

  public async getSubs(label: string) {
    if (!label) return parse("");
    const videoId = this.getVideoId();
    const cacheForVideo = this.subCache[videoId] || {};

    // Resolve 'auto (original)': prefer the base 'lang' (original track)
    let targetLabel = label;
    let baseHref: string | undefined;
    if (label === "auto") {
      const keys = Object.keys(cacheForVideo);
      const anyHref = Object.values(cacheForVideo)[0];

      console.log("[EasySubs] Dual subs 'auto' mode:", {
        videoId,
        currentLang: this.currentLang,
        availableLanguages: keys,
        cacheUrls: Object.entries(cacheForVideo).map(([k, v]) => [k, v])
      });

      if (!anyHref && keys.length === 0) return parse("");

      // Try to infer original language from cached URL's 'lang' (base track)
      if (anyHref) {
        const anyUrl = new URL(anyHref);
        const originalLang = anyUrl.searchParams.get("lang") || "";

        console.log("[EasySubs] Detected original language:", originalLang);

        if (originalLang) {
          // Always pick the original track language for dual subs
          targetLabel = originalLang;

          // First, try to find a cached URL without 'tlang' (pure original subtitle)
          const originalHref = Object.values(cacheForVideo).find(href => {
            const url = new URL(href);
            const lang = url.searchParams.get("lang");
            const tlang = url.searchParams.get("tlang");
            return lang === originalLang && !tlang;
          });

          if (originalHref) {
            baseHref = originalHref;
            console.log("[EasySubs] Found original subtitle in cache (no tlang)");
          } else {
            // Build a URL with only 'lang' parameter (no 'tlang' for original)
            const cleanUrl = new URL(anyHref);
            cleanUrl.searchParams.delete("tlang");
            cleanUrl.searchParams.set("lang", originalLang);
            baseHref = cleanUrl.href;
            console.log("[EasySubs] Built original subtitle URL:", baseHref);
          }
        } else {
          console.log("[EasySubs] Could not detect original language, returning empty");
          return parse("");
        }
      } else {
        console.log("[EasySubs] No cached subtitles available yet");
        return parse("");
      }
    }

    // Prefer exact cache hit when not resolved above; otherwise fallback and set `tlang` for translations
    if (!baseHref) {
      baseHref = cacheForVideo[targetLabel];

      if (!baseHref) {
        const anyHref = Object.values(cacheForVideo)[0];
        if (!anyHref) return parse("");
        const anyUrl = new URL(anyHref);
        const currentLang = anyUrl.searchParams.get("tlang") || anyUrl.searchParams.get("lang");
        // If requested target differs from base, request machine translation via `tlang`
        if (targetLabel && targetLabel !== currentLang) {
          anyUrl.searchParams.set("tlang", targetLabel);
        } else {
          // If target equals base, ensure we don't set a redundant translation param
          anyUrl.searchParams.delete("tlang");
        }
        baseHref = anyUrl.href;
      }
    }

    const urlObject: URL = new URL(baseHref);

    const subUri: string = urlObject.href;
    const resp = await fetch(subUri);
    const respJson: { events: YoutubeSubtitle[] } = await resp.json();

    const subs: subTitleType[] = respJson.events.map((sub) => {
      if (!sub.segs) {
        return {
          start: sub.tStartMs,
          end: sub.tStartMs,
          text: "",
        };
      }

      const end = sub.segs.at(-1).tOffsetMs ? sub.segs.at(-1).tOffsetMs + sub.tStartMs : sub.tStartMs + sub.dDurationMs;

      return {
        start: sub.tStartMs,
        end: end,
        text: sub.segs.map((seg) => seg.utf8).join(""),
      };
    });
    return subs;
  }

  public getSubsContainer() {
    const selector = document.querySelector(".html5-video-player");
    if (selector === null) throw new Error("Subtitles container not found");
    return selector as HTMLElement;
  }

  public getSettingsButtonContainer() {
    const selector = document.querySelector(".ytp-right-controls .ytp-size-button");
    if (selector === null) throw new Error("Settings button container not found");
    return selector as HTMLElement;
  }

  public getSettingsContentContainer() {
    const selector = document.querySelector(".html5-video-player");
    if (selector === null) throw new Error("Settings content container not found");
    return selector as HTMLElement;
  }

  public isOnFlight() {
    return false;
  }

  private getVideoId(): string {
    const regExpression = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = window.location.href.match(regExpression);
    if (match && match[2].length === 11) {
      return match[2];
    }
    console.error("Can't get youtube video id");
    return "";
  }

  private handleCaptionsData(event: CustomEvent): void {
    const urlObject = new URL(event.detail);
    const lang = urlObject.searchParams.get("tlang") || urlObject.searchParams.get("lang") || "";
    const videoId = urlObject.searchParams.get("v") || "";
    // Preserve existing map to accumulate available tracks
    this.subCache[videoId] = this.subCache[videoId] || {};
    this.subCache[videoId][lang] = urlObject.href;
  }

  private handleCaptionsChanges(event: CustomEvent): void {
    this.currentLang = event.detail;
    esSubsChanged(event.detail);
  }

  private handleLoaded() {
    console.log("handleLoaded");

    esRenderSetings();
  }

  private injectScript() {
    const script = document.createElement("script");
    script.src = chrome.runtime.getURL("assets/js/youtube.js");
    script.type = "module";
    document.head.prepend(script);
  }
}

export default Youtube;
