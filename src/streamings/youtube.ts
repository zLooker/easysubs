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
      if (!anyHref && keys.length === 0) return parse("");

      // Try to infer original language from cached URL's 'lang' (base track)
      if (anyHref) {
        const anyUrl = new URL(anyHref);
        const originalLang = anyUrl.searchParams.get("lang") || "";

        if (originalLang && originalLang !== this.currentLang) {
          // Pick original track language
          targetLabel = originalLang;
          // Use cached href if present for original; otherwise build it by removing 'tlang'
          baseHref = cacheForVideo[targetLabel];
          if (!baseHref) {
            anyUrl.searchParams.delete("tlang");
            anyUrl.searchParams.set("lang", originalLang);
            baseHref = anyUrl.href;
          }
        } else {
          // Fallback: choose any track different from current main
          const different = keys.find((k) => k && k !== this.currentLang);
          targetLabel = different || keys[0] || "";
          if (!targetLabel) return parse("");
        }
      } else {
        // No hrefs cached yet; nothing to resolve
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
