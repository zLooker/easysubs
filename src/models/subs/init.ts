import { sample, split } from "effector";
import {
  $currentSubs,
  $rawSubs,
  $subs,
  $subsDelay,
  esSubsChanged,
  fetchSubsFx,
  resetSubs,
  subsDelayButtonPressed,
  subsDelayChangeFx,
  subsRequested,
  subsResyncFx,
  updateCurrentSubsFx,
  updateCustomSubsFx,
  autoPauseFx,
  $subsLanguage,
  subsLanguageDetectFx,
  $subsTitle,
  subsReloadRequested,
  ES_CUSTOM_SUB_LABEL,
  rawSubsAdded,
  $rawDualSubs,
  $dualSubs,
  $currentDualSubs,
  fetchDualSubs,
  fetchDualSubsFx,
  updateCurrentDualSubsFx,
} from ".";
import { $streaming } from "../streamings";
import { $video, videoTimeUpdate } from "../videos";
import { $autoPause, $dualSubEnabled, $dualSubLanguage, $translateLanguage } from "../settings";
import { debug } from "patronum";

split({
  source: esSubsChanged,
  match: {
    hasLanguage: (language) => !!language,
    noLanguage: (language) => !language,
  },
  cases: {
    hasLanguage: subsRequested,
    noLanguage: resetSubs,
  },
});

sample({
  clock: subsRequested,
  source: $streaming,
  filter: (_, language) => language != ES_CUSTOM_SUB_LABEL,
  fn: (streaming, language) => ({ streaming, language }),
  target: fetchSubsFx,
});

sample({
  clock: [videoTimeUpdate, $rawSubs],
  source: { subs: $subs, video: $video },
  fn: ({ subs, video }, _) => ({ subs, video }),
  target: updateCurrentSubsFx,
});
sample({
  clock: videoTimeUpdate,
  source: { currentSubs: $currentSubs, video: $video, autoPause: $autoPause },
  fn: ({ currentSubs, video, autoPause }, _) => ({ currentSubs, video, autoPause }),
  filter: ({ currentSubs, video, autoPause }) => {
    if (currentSubs[0]) {
      const timeDiff = currentSubs[0].end - video.currentTime * 1000;
      return autoPause && timeDiff < 250 && timeDiff > 0;
    }
  },
  target: autoPauseFx,
});

sample({
  clock: subsDelayButtonPressed,
  target: subsDelayChangeFx,
});

sample({
  clock: subsDelayButtonPressed,
  source: { rawSubs: $rawSubs, subsDelay: $subsDelay },
  fn: ({ rawSubs, subsDelay }, delay) => ({ rawSubs, subsDelay, delay }),
  target: subsResyncFx,
});

sample({
  clock: $subs,
  filter: (subs) => subs.length > 0,
  target: subsLanguageDetectFx,
});

sample({
  clock: subsReloadRequested,
  source: { subsTitle: $subsTitle, rawSubs: $rawSubs },
  filter: ({ subsTitle, rawSubs }) => subsTitle && rawSubs.length > 0,
  fn: ({ subsTitle }) => subsTitle,
  target: esSubsChanged,
});

$rawSubs.on(
  [fetchSubsFx.doneData, subsResyncFx.doneData, updateCustomSubsFx.doneData, rawSubsAdded],
  (_, subs) => subs
);

$rawSubs.on(rawSubsAdded, (oldSubs, newSubs) => {
  const lastSub = oldSubs[oldSubs.length - 1];
  if (!lastSub) {
    return [...oldSubs, ...newSubs];
  }
  if (lastSub.text != newSubs[0].text && lastSub.start != newSubs[0].start) {
    const subs = oldSubs.slice(0, -1);
    lastSub.end = lastSub.start;
    return [...subs, ...[lastSub], ...newSubs];
  }
});

$rawSubs.reset(resetSubs);
$currentSubs.on([updateCurrentSubsFx.doneData, autoPauseFx.doneData], (oldSubs, subs) =>
  JSON.stringify(oldSubs) === JSON.stringify(subs) ? oldSubs : subs
);

$subsDelay.on(subsDelayChangeFx.doneData, (_, newSubsDelay) => newSubsDelay);
$subsLanguage.on(subsLanguageDetectFx.doneData, (_, lang) => lang);
$subsTitle.on(esSubsChanged, (_, value) => value);
$subsTitle.on(updateCustomSubsFx.doneData, () => ES_CUSTOM_SUB_LABEL);

// Dual subs logic: pass 'auto' to provider when selected
sample({
  clock: [$dualSubEnabled, $dualSubLanguage, $translateLanguage],
  source: { streaming: $streaming, language: $dualSubLanguage, enabled: $dualSubEnabled },
  filter: ({ enabled, language }) => {
    if (!enabled) return false;
    return !!language;
  },
  fn: ({ streaming, language }) => ({
    streaming,
    language: language !== "auto" ? language : "auto",
  }),
  target: fetchDualSubsFx,
});

// Re-fetch dual subs when main subtitle track changes, if dual language is 'auto'
sample({
  clock: esSubsChanged,
  source: { streaming: $streaming, enabled: $dualSubEnabled, language: $dualSubLanguage },
  filter: ({ enabled, language }) => enabled && language === "auto",
  fn: ({ streaming }) => ({ streaming, language: "auto" }),
  target: fetchDualSubsFx,
});

sample({
  clock: [videoTimeUpdate, $rawDualSubs],
  source: { subs: $dualSubs, video: $video, enabled: $dualSubEnabled },
  filter: ({ enabled }) => enabled,
  fn: ({ subs, video }) => ({ subs, video }),
  target: updateCurrentDualSubsFx,
});

$rawDualSubs.on(fetchDualSubsFx.doneData, (_, subs) => subs);
$rawDualSubs.reset($dualSubEnabled.updates.filter({ fn: (enabled) => !enabled }));

$currentDualSubs.on(updateCurrentDualSubsFx.doneData, (oldSubs, subs) =>
  JSON.stringify(oldSubs) === JSON.stringify(subs) ? oldSubs : subs
);

debug(
  $rawSubs,
  $subs,
  $subsDelay,
  subsResyncFx,
  autoPauseFx.doneData,
  $currentSubs,
  subsReloadRequested,
  $subsTitle,
  esSubsChanged,
  subsLanguageDetectFx,
  $rawDualSubs,
  $dualSubs,
  $currentDualSubs
);
