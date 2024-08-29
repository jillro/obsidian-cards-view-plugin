<script lang="ts">
	import { debounce, Menu, SearchComponent, setIcon, TFile } from "obsidian";
	import { afterUpdate, onMount } from "svelte";
	import MiniMasonry from "minimasonry";

	import type { CardsViewSettings } from "../settings";
	import Card from "./Card.svelte";
	import {
		displayedFiles,
		searchQuery,
		skipNextTransition,
		Sort,
		sort,
		viewIsVisible,
	} from "./store";

	export let settings: CardsViewSettings;
	export let renderFile: (file: TFile, el: HTMLElement) => Promise<void>;
	export let openFile: (file: TFile) => void;
	export let trashFile: (file: TFile) => Promise<void>;
	export let saveSettings: () => Promise<void>;

	let notesGrid: MiniMasonry;
	let viewContent: HTMLElement;
	let cardsContainer: HTMLElement;
	let columns: number;

	const sortIcon = (element: HTMLElement) => {
		setIcon(element, "arrow-down-wide-narrow");
	};

	const searchInput = (element: HTMLElement) => {
		new SearchComponent(element).onChange((value) => {
			$searchQuery = value;
		});
	};

	function sortMenu(event: MouseEvent) {
		const sortMenu = new Menu();

		// 文件名排序
		sortMenu.addItem((item) => {
			item.setTitle("Title (A-Z)");
			item.setChecked($sort == Sort.NameAsc);
			item.onClick(async () => {
				$sort = Sort.NameAsc;
				settings.defaultSort = Sort.NameAsc;
				await saveSettings();
			});
		});
		sortMenu.addItem((item) => {
			item.setTitle("Title (Z-A)");
			item.setChecked($sort == Sort.NameDesc);
			item.onClick(async () => {
				$sort = Sort.NameDesc;
				settings.defaultSort = Sort.NameDesc;
				await saveSettings();
			});
		});

		sortMenu.addSeparator();

		// 编辑时间排序
		sortMenu.addItem((item) => {
			item.setTitle("Edited (Newest First)");
			item.setChecked($sort == Sort.EditedDesc);
			item.onClick(async () => {
				$sort = Sort.EditedDesc;
				settings.defaultSort = Sort.EditedDesc;
				await saveSettings();
			});
		});
		sortMenu.addItem((item) => {
			item.setTitle("Edited (Oldest First)");
			item.setChecked($sort == Sort.EditedAsc);
			item.onClick(async () => {
				$sort = Sort.EditedAsc;
				settings.defaultSort = Sort.EditedAsc;
				await saveSettings();
			});
		});

		sortMenu.addSeparator();

		// 创建时间排序
		sortMenu.addItem((item) => {
			item.setTitle("Created (Newest First)");
			item.setChecked($sort == Sort.CreatedDesc);
			item.onClick(async () => {
				$sort = Sort.CreatedDesc;
				settings.defaultSort = Sort.CreatedDesc;
				await saveSettings();
			});
		});
		sortMenu.addItem((item) => {
			item.setTitle("Created (Oldest First)");
			item.setChecked($sort == Sort.CreatedAsc);
			item.onClick(async () => {
				$sort = Sort.CreatedAsc;
				settings.defaultSort = Sort.CreatedAsc;
				await saveSettings();
			});
		});

		sortMenu.showAtMouseEvent(event);
	}

	onMount(() => {
		$sort = settings.defaultSort;
		columns = Math.floor(viewContent.clientWidth / settings.minCardWidth);
		notesGrid = new MiniMasonry({
			container: cardsContainer,
			baseWidth: settings.minCardWidth,
			gutter: 20,
			surroundingGutter: false,
			ultimateGutter: 20,
		});
		notesGrid.layout();

		return () => {
			notesGrid.destroy();
		};
	});

	afterUpdate(
		debounce(async () => {
			if (!$viewIsVisible) {
				$skipNextTransition = true;
				return;
			}

			notesGrid.layout();
			$skipNextTransition = false;
		}),
	);
</script>

<div class="action-bar" bind:this={viewContent}>
	<div use:searchInput />
	<button class="clickable-icon sort-button" use:sortIcon on:click={sortMenu} />
</div>
<div
	class="cards-container"
	bind:this={cardsContainer}
	style:--columns={columns}
>
	{#each $displayedFiles as file (file.path + file.stat.mtime)}
		<Card
			{file}
			renderFile={(el) => renderFile(file, el)}
			openFile={() => openFile(file)}
			trashFile={() => trashFile(file)}
			on:loaded={() => notesGrid.layout()}
		/>
	{/each}
</div>

<style>
	.action-bar {
		display: flex;
		flex-direction: row;
		justify-content: end;
		gap: var(--size-4-5);
		margin-bottom: var(--size-4-5);
	}

	.cards-container {
		position: relative;
		container-type: inline-size;
	}

	.cards-container :global(*) {
		--card-padding: var(--size-4-3);
		--card-gutter: var(--size-4-5);
	}
</style>
