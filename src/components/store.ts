import {
  type App,
  type CachedMetadata,
  getAllTags,
  ItemView,
  MetadataCache,
  TFile,
} from "obsidian";
import { derived, get, writable } from "svelte/store";
import type { CardsViewSettings } from "../settings";
import generateFilter from "../search/search";

export enum Sort {
  Created = "ctime",
  Modified = "mtime",
}

/**
 * Stores for obsidian data (updated mainly from main.ts)
 */

export const app = writable<App>();
export const view = writable<ItemView>();
export const appCache = writable<MetadataCache>();
export const files = writable<TFile[]>([]);
export const folders = writable<string[]>([]);

/**
 * Stores for user input (updated mainly from settings.ts, view.ts, Root.svelte)
 */

export const settings = writable<CardsViewSettings>();
export const sort = writable<Sort>(Sort.Modified);
const pinnedFiles = derived(settings, ($settings) => $settings?.pinnedFiles);
const sortedFiles = derived(
  [sort, files, pinnedFiles],
  ([$sort, $files, $pinnedFiles]) =>
    [...$files].sort(
      (a: TFile, b: TFile) =>
        ($pinnedFiles.includes(b.path) ? 1 : 0) -
          ($pinnedFiles.includes(a.path) ? 1 : 0) ||
        b.stat[$sort] - a.stat[$sort],
    ),
  [] as TFile[],
);
export const searchQuery = writable<string>("");
export const searchCaseSensitive = writable(false);

/**
 * Search logic
 */

const baseQuery = derived(settings, ($settings) => $settings?.baseQuery);
const searchFilter = derived(
  [baseQuery, searchQuery],
  ([$baseQuery, $searchQuery]) => {
    const query = $baseQuery ? $baseQuery + " " + $searchQuery : $searchQuery;

    if (query === "") {
      return null;
    }

    return generateFilter(query);
  },
);
const searchResultCache = writable<Map<string, boolean>>(new Map());
searchFilter.subscribe(() => searchResultCache.set(new Map()));
const cacheKey = (file: TFile) => file.path + file.stat.mtime;
/**
 * This is not derived from searchResultCache because we want incremental update
 * and not full invalidation when cache is invalidated
 */
const searchResultsExcluded = writable<Set<TFile>>(new Set());
export const searchResultLoadingState = writable(1);

// Track the current filter to properly cancel outdated searches
let currentFilterId = 0;

async function updateSearchResults() {
  const $sortedFiles = get(sortedFiles);
  const $searchQuery = get(searchQuery);
  const $searchFilter = get(searchFilter);
  const $appCache = get(appCache);
  const $app = get(app);
  const $searchCaseSensitive = get(searchCaseSensitive);

  // Increment filter ID to cancel previous searches
  const thisFilterId = ++currentFilterId;

  if ($searchFilter === null) {
    searchResultsExcluded.set(new Set());
    searchResultLoadingState.set(1);
    return;
  }

  let batch: Map<TFile, boolean> = new Map();
  let lastBatch = { date: new Date(), index: 0 };
  for (let i = 0; i < $sortedFiles.length; i++) {
    const file = $sortedFiles[i];
    const cachedResult = get(searchResultCache).get(cacheKey($sortedFiles[i]));
    if (cachedResult !== undefined) {
      batch.set(file, cachedResult);
    } else {
      const content = await file.vault.cachedRead(file);
      const tags = (
        getAllTags($appCache.getFileCache(file) as CachedMetadata) || []
      ).map((t) => t.replace(/^#/, ""));
      let frontmatter;
      await $app.fileManager.processFrontMatter(file, (fm) => {
        frontmatter = fm;
      });

      const match = await $searchFilter({
        file,
        content,
        tags,
        frontmatter,
        caseSensitive: $searchCaseSensitive,
      });

      // Check if this search has been superseded
      if (thisFilterId !== currentFilterId) return;
      batch.set(file, match);
      searchResultCache.update((cache) => cache.set(cacheKey(file), match));
    }

    // Check if this search has been superseded
    if (thisFilterId !== currentFilterId) return;

    if (i % 10 === 0) {
      searchResultLoadingState.set(i / $sortedFiles.length);
    }

    if (
      lastBatch.date.getTime() + 200 < new Date().getTime() ||
      i === $sortedFiles.length - 1
    ) {
      searchResultLoadingState.set((i + 1) / $sortedFiles.length);
      searchResultsExcluded.update((set) => {
        batch.forEach((match, file) =>
          match ? set.delete(file) : set.add(file),
        );
        return set;
      });
      batch = new Map();
      lastBatch = { date: new Date(), index: i + 1 };
    }
  }
}
searchFilter.subscribe(() => updateSearchResults());
files.subscribe(() => updateSearchResults());
searchCaseSensitive.subscribe(() => updateSearchResults());

/**
 * Display logic
 */

export const displayedCount = writable(0);
export const displayedFiles = writable<TFile[]>([]);
const lastDisplayed = derived(displayedFiles, ($displayedFiles) => {
  const lastFile = $displayedFiles.last();
  return lastFile ? get(sortedFiles).indexOf(lastFile) : 0;
});
searchResultsExcluded.subscribe((excludedFiles) => {
  // When the search results changes, and we have less files to display, we want
  // to keep the same file as current end of infinite scroll
  // event if it means that we reduce the number of files displayed.
  // This is to avoid the infinite scroll to be triggered when the user
  // is typing in search
  const $sortedFiles = get(sortedFiles);
  const $lastDisplayed = get(lastDisplayed);
  const beforeCurrentLast = $sortedFiles.slice(0, $lastDisplayed + 1);
  const filteredBeforeCurrentLast = beforeCurrentLast.filter(
    (f) => !excludedFiles.has(f),
  );

  if (filteredBeforeCurrentLast.length > 50) {
    // We only want to keep same last file if the list is shorter,
    // if it is longer, we keep same length
    displayedFiles.set(
      filteredBeforeCurrentLast.slice(0, get(displayedFiles).length),
    );
    return;
  }

  // If we have not enough files to reach 50, we add some new ones
  const filteredAfterCurrentLast = $sortedFiles
    .slice(
      $lastDisplayed,
      Math.floor($sortedFiles.length * get(searchResultLoadingState)) -
        $lastDisplayed -
        1,
    ) // If search results are updating, exclude files which have not been filtered yet
    .filter((f) => !excludedFiles.has(f));
  const toAdd = 50 - filteredBeforeCurrentLast.length;
  displayedFiles.set([
    ...filteredBeforeCurrentLast,
    ...filteredAfterCurrentLast.slice(0, toAdd),
  ]);
});
// When the user scrolls, we add more files to the display
displayedCount.subscribe((count) => {
  displayedFiles.set(
    get(sortedFiles)
      .filter((f) => !get(searchResultsExcluded).has(f))
      .slice(0, count),
  );
});
// When sort order changes, we want to reset display with same number of files
sortedFiles.subscribe(($sortedFiles) => {
  displayedFiles.set(
    $sortedFiles
      .filter((f) => !get(searchResultsExcluded).has(f))
      .slice(0, get(displayedFiles).length),
  );
});

export default {
  files,
  folders,
  sort,
  searchQuery,
  searchCaseSensitive,
  displayedCount,
  displayedFiles,
  app,
  view,
  settings,
  appCache,
};
