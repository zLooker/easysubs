import { createRoot } from "react-dom/client";
import refreshOnUpdate from "virtual:reload-on-update-in-view";

import { $streaming, fetchCurrentStreamingFx } from "@src/models/streamings";
import { esRenderSetings } from "@src/models/settings";
import { esSubsChanged } from "@src/models/subs";
import { $video, getCurrentVideoFx, videoTimeUpdate } from "@src/models/videos";
import { Settings } from "@src/pages/content/components/Settings";
import { Subs } from "./components/Subs";
import { ProgressBar } from "./components/ProgressBar";
import { removeKeyboardEventsListeners } from "@src/utils/keyboardHandler";

refreshOnUpdate("pages/content");

fetchCurrentStreamingFx();

const handleTimeUpdate = () => {
  videoTimeUpdate();
};

$streaming.watch((streaming) => {
  console.log("[EasySubs] Streaming service detected:", streaming.name);
  document.body.classList.add("es-" + streaming.name);

  if (streaming == null) {
    return;
  }

  // Check if streaming service is supported
  if (streaming.name === "stub") {
    console.warn(
      "[EasySubs] This streaming service is not supported yet.\n" +
      "Supported services: YouTube, Netflix, Coursera, KinoPub, Inoriginal\n" +
      "Current URL:", window.location.href
    );
    return;
  }

  esRenderSetings.watch(() => {
    console.log("Event:", "esRenderSetings");
    document.querySelectorAll(".es-settings").forEach((e) => e.remove());

    try {
      const buttonContainer = streaming.getSettingsButtonContainer();
      const contentContainer = streaming.getSettingsContentContainer();

      const parentNode = buttonContainer?.parentNode;
      const settingNode = document.createElement("div");
      settingNode.className = "es-settings";
      parentNode?.insertBefore(settingNode, buttonContainer);

      getCurrentVideoFx();
      $video.watch((video) => {
        video?.removeEventListener("timeupdate", handleTimeUpdate as EventListener);
        video?.addEventListener("timeupdate", handleTimeUpdate as EventListener);
      });
      createRoot(settingNode).render(<Settings contentContainer={contentContainer} />);
    } catch (error) {
      console.error("[EasySubs] Failed to render settings:", error);
    }
  });

  try {
    streaming.init();
  } catch (error) {
    console.error("[EasySubs] Failed to initialize streaming service:", error);
  }
});

esSubsChanged.watch((language) => {
  console.log("Event:", "esSubsChanged");
  console.log("Language:", language);

  const streaming = $streaming.getState();

  // Don't proceed if streaming service is not supported
  if (streaming.name === "stub") {
    console.warn("[EasySubs] Cannot render subtitles - streaming service not supported");
    return;
  }

  try {
    removeKeyboardEventsListeners();
    document.querySelectorAll("#es").forEach((e) => e.remove());
    const subsContainer = streaming.getSubsContainer();
    const subsNode = document.createElement("div");
    subsNode.id = "es";
    subsContainer?.appendChild(subsNode);
    createRoot(subsNode).render(<Subs />);

    if (!streaming.isOnFlight()) {
      document.querySelectorAll(".es-progress-bar").forEach((e) => e.remove());
      const progressBarNode = document.createElement("div");
      progressBarNode.classList.add("es-progress-bar");
      subsContainer?.appendChild(progressBarNode);
      createRoot(progressBarNode).render(<ProgressBar />);
    }
  } catch (error) {
    console.error("[EasySubs] Failed to render subtitles:", error);
  }
});
