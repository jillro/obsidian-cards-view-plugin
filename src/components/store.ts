import {
  type App,
  type CachedMetadata,
  getAllTags,
  ItemView,
  MetadataCache,
  prepareFuzzySearch,
  TFile,
} from "obsidian";
import { derived, get, writable } from "svelte/store";
import type { CardsViewSettings } from "../settings";

export enum Sort {
  Created = "ctime",
  Modified = "mtime",
}

export const app = writable<App>();
export const view = writable<ItemView>();
export const settings = writable<CardsViewSettings>();
export const appCache = writable<MetadataCache>();
export const files = writable<TFile[]>([]);

export const sort = writable<Sort>(Sort.Modified);
export const sortedFiles = derived(
  [sort, files, settings],
  ([$sort, $files, $settings]) =>
    [...$files].sort(
      (a: TFile, b: TFile) =>
        ($settings.pinnedFiles.includes(b.path) ? 1 : 0) -
          ($settings.pinnedFiles.includes(a.path) ? 1 : 0) ||
        b.stat[$sort] - a.stat[$sort],
    ),
  [] as TFile[],
);

export const searchQuery = writable<string>("");
export const preparedSearch = derived(searchQuery, ($searchQuery) =>
  $searchQuery ? prepareFuzzySearch($searchQuery) : null,
);
export const searchResultFiles = derived(
  [preparedSearch, sortedFiles, appCache],
  ([$preparedSearch, $sortedFiles, $appCache], set) => {
    if ($preparedSearch == null) {
      set($sortedFiles);
      return;
    }

    Promise.all(
      $sortedFiles.map(async (file) => {
        const content = await file.vault.cachedRead(file);
        const tags =
          getAllTags($appCache.getFileCache(file) as CachedMetadata) || [];
        return [
          $preparedSearch(content),
          $preparedSearch(file.name),
          $preparedSearch(`#${tags.join(" #")}`),
        ];
      }),
    ).then((searchResults) => {
      set(
        $sortedFiles.filter((file, index) => {
          const [contentMatch, nameMatch, tagsMatch] = searchResults[index];

          return (
            (contentMatch && contentMatch.score > -2) ||
            (nameMatch && nameMatch.score > -2) ||
            (tagsMatch && tagsMatch.score > -2)
          );
        }),
      );
    });
  },
  get(sortedFiles),
);

export const displayedCount = writable(50);
export const displayedFiles = derived(
  [searchResultFiles, displayedCount],
  ([$searchResultFiles, $displayedCount]) =>
    $searchResultFiles.slice(0, $displayedCount),
);

export const viewIsVisible = writable(false);
export const skipNextTransition = writable(true);

export const tags = derived(
  [displayedFiles, appCache],
  ([$displayedFiles, $appCache]) => {
    const tags = $displayedFiles
      .map(
        (file) =>
          getAllTags($appCache.getFileCache(file) as CachedMetadata) || [],
      )
      .flat();

    const tagCounts = tags.reduce(
      (acc, tag) => {
        acc[tag] = (acc[tag] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return Object.keys(tagCounts).sort((a, b) => tagCounts[b] - tagCounts[a]);
  },
);

export default {
  files,
  sort,
  searchQuery,
  searchResultFiles,
  displayedCount,
  displayedFiles,
  viewIsVisible,
  skipNextTransition,
  tags,
  app,
  view,
  settings,
  appCache,
};
