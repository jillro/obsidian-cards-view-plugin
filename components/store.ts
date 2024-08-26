import { prepareFuzzySearch, TFile } from "obsidian";
import { derived, get, writable } from "svelte/store";

export enum Sort {
	NameAsc = "Title (A-Z)",
	NameDesc = "Title (Z-A)",
	EditedDesc = "Edited (Newest First)",
	EditedAsc = "Edited (Oldest First)",
	CreatedDesc = "Created (Newest First)",
	CreatedAsc = "Created (Oldest First)",
}

export const files = writable<TFile[]>([]);
export const sort = writable<Sort>(Sort.EditedDesc);

export const sortedFiles = derived([sort, files], ([$sort, $files]) =>
	[...$files].sort((a: TFile, b: TFile) => {
		switch ($sort) {
			case Sort.NameAsc:
				return a.basename.localeCompare(b.basename);
			case Sort.NameDesc:
				return b.basename.localeCompare(a.basename);
			case Sort.EditedDesc:
				return b.stat.mtime - a.stat.mtime;
			case Sort.EditedAsc:
				return a.stat.mtime - b.stat.mtime;
			case Sort.CreatedDesc:
				return b.stat.ctime - a.stat.ctime;
			case Sort.CreatedAsc:
				return a.stat.ctime - b.stat.ctime;
			default:
				return 0;
		}
	}),
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
