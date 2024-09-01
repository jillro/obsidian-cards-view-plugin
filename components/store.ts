import { prepareFuzzySearch, TFile } from "obsidian";
import { derived, get, writable } from "svelte/store";

export enum Sort {
  Created = "ctime",
  Modified = "mtime",
}
export const files = writable<TFile[]>([]);

export const sort = writable<Sort>(Sort.Modified);
export const sortedFiles = derived([sort, files], ([$sort, $files]) =>
  [...$files].sort((a: TFile, b: TFile) => b.stat[$sort] - a.stat[$sort]),
);

export const searchQuery = writable<string>("");
export const preparedSearch = derived(searchQuery, ($searchQuery) =>
  $searchQuery ? prepareFuzzySearch($searchQuery) : null,
);
export const searchResultFiles = derived(
  [preparedSearch, sortedFiles],
  ([$preparedSearch, $sortedFiles], set) => {
    if ($preparedSearch == null) {
      set($sortedFiles);
      return;
    }

    Promise.all(
      $sortedFiles.map(async (file) => {
        const content = await file.vault.cachedRead(file);
        return [$preparedSearch(content), $preparedSearch(file.name)];
      }),
    ).then((searchResults) => {
      set(
        $sortedFiles.filter((file, index) => {
          const [contentMatch, nameMatch] = searchResults[index];

          return (
            (contentMatch && contentMatch.score > -2) ||
            (nameMatch && nameMatch.score > -2)
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

export default {
  files,
  sort,
  searchQuery,
  searchResultFiles,
  displayedCount,
  displayedFiles,
  viewIsVisible,
  skipNextTransition,
};
