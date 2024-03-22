<script lang="ts">
	import {debounce, Menu, setIcon, TFile} from "obsidian";
	import {afterUpdate, onMount} from "svelte";
	import MiniMasonry from "minimasonry";

	import type {CardsViewSettings} from "../settings";
	import Card from "./Card.svelte";
	import {displayedFiles, searchQuery, skipNextTransition, Sort, sort, viewIsVisible} from "./store";

	export let settings: CardsViewSettings;

	export let renderFile: (file: TFile, el: HTMLElement) => Promise<void>;
	export let openFile: (file: TFile) => void;
	export let trashFile: (file: TFile) => Promise<void>;

	let notesGrid: MiniMasonry;
	let viewContent: HTMLElement;
	let cardsContainer: HTMLElement;
	let columns: number
	let enableLayoutTransition = true;

	const sortIcon = (element: HTMLElement) => {
		setIcon(element, "arrow-down-wide-narrow");
	}

	function sortMenu(event: MouseEvent) {
		const sortMenu = new Menu();
		sortMenu.addItem((item) => {
			item.setTitle("Last created");
			item.setChecked($sort == Sort.Created);
			item.onClick(async () => {
				$sort = Sort.Created;
			});
		});
		sortMenu.addItem((item) => {
			item.setTitle("Last modified");
			item.setChecked($sort == Sort.Modified);
			item.onClick(async () => {
				$sort = Sort.Modified;
			});
		})
		sortMenu.showAtMouseEvent(event);
	}

	onMount(() => {
		console.log('mount')
		columns = Math.floor(viewContent.clientWidth / settings.minCardWidth);
		notesGrid = new MiniMasonry({
			container: cardsContainer,
			baseWidth: settings.minCardWidth,
			gutter: 20,
		});
		notesGrid.layout();

		return () => {
			notesGrid.destroy();
		}
	});

	afterUpdate(debounce(async () => {
		if (!$viewIsVisible) {
			$skipNextTransition = true;
			return;
		}

		notesGrid.layout();
		$skipNextTransition = false;
	}));
</script>

<div class="action-bar" bind:this={viewContent}>
	<div class="search-input-container">
		<input type="search" enterkeyhint="search" bind:value={$searchQuery} />
	</div>
	<button class="clickable-icon sort-button" use:sortIcon on:click={sortMenu} />
</div>
<div class="cards-container" bind:this={cardsContainer} style:--columns={columns}>
	{#each $displayedFiles as file (file.path + file.stat.mtime)}
		<Card
			file={file}
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
		--card-padding: var(--size-4-3);
		--card-gutter: var(--size-4-5);
		--columns: 0;
		--card-size: calc((100% - var(--card-gutter) * (var(--columns) - 1)) / var(--columns));
	}
</style>
