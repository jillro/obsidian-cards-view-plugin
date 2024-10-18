<script lang="ts">
  import { debounce, Menu, SearchComponent, setIcon, TFile } from "obsidian";
  import { afterUpdate, onMount } from "svelte";
  import MiniMasonry from "minimasonry";

  import type { CardsViewSettings } from "../settings";
  import Card from "./Card.svelte";
  import {
    tags,
    displayedFiles,
    searchQuery,
    skipNextTransition,
    Sort,
    sort,
    viewIsVisible,
    settings,
  } from "./store";

  let notesGrid: MiniMasonry;
  let viewContent: HTMLElement;
  let cardsContainer: HTMLElement;
  let columns: number;

  const sortIcon = (element: HTMLElement) => {
    setIcon(element, "arrow-down-wide-narrow");
  };

  const searchInput = (element: HTMLElement) => {
    const searchInput = new SearchComponent(element);
    searchInput.onChange((value) => {
      $searchQuery = value;
    });
    searchQuery.subscribe((value) => {
      searchInput.inputEl.value = value;
    });
  };

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
    });
    sortMenu.showAtMouseEvent(event);
  }

  onMount(() => {
    columns = Math.floor(viewContent.clientWidth / $settings.minCardWidth);
    notesGrid = new MiniMasonry({
      container: cardsContainer,
      baseWidth: $settings.minCardWidth,
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
  <button class="clickable-icon sort-button" use:sortIcon on:click={sortMenu} />
  <div class="action-bar__search" use:searchInput />
  <div class="action-bar__tags">
    <div class="action-bar__tags__list">
      {#each $tags as tag}
        <button class="action-bar__tag" on:click={() => ($searchQuery = tag)}
          >{tag}</button
        >
      {/each}
    </div>
  </div>
</div>
<div
  class="cards-container"
  bind:this={cardsContainer}
  style:--columns={columns}
>
  {#each $displayedFiles as file (file.path + file.stat.mtime)}
    <Card {file} on:loaded={() => notesGrid.layout()} />
  {/each}
</div>

<style>
  .action-bar {
    position: relative;
    display: flex;
    flex-direction: row-reverse;
    gap: var(--size-4-5);
    margin-bottom: var(--size-4-5);
    flex-wrap: wrap;
    @media screen and (min-width: 700px) {
      flex-wrap: nowrap;
    }
  }

  .action-bar .action-bar__tags {
    flex-grow: 1;
    -ms-overflow-style: none;
    scrollbar-width: none;
    white-space: nowrap;
    overflow: auto;

    &::-webkit-scrollbar {
      display: none;
    }

    @media screen and (min-width: 700px) {
      overflow: hidden;

      & .action-bar__tags__list {
        transition: box-shadow 0.3s;
      }

      &:hover .action-bar__tags__list {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;

        white-space: normal;
        z-index: var(--layer-popover);
        background-color: var(--background-primary);
        padding-bottom: var(--size-4-2);
        box-shadow: 0 0 var(--size-2-3) var(--size-2-3)
          var(--background-primary);

        & button.action-bar__tag {
          margin-bottom: var(--size-2-2);
        }
      }
    }
  }

  .action-bar button.action-bar__tag {
    font-size: var(--tag-size);
    color: var(--tag-color);
    text-decoration: var(--tag-decoration);
    background-color: var(--tag-background);
    border: var(--tag-border-width) solid var(--tag-border-color);
    padding: var(--tag-padding-y) var(--tag-padding-x);
    border-radius: var(--tag-radius);
    font-weight: var(--tag-weight);
    margin-right: var(--size-2-2);

    &:hover {
      color: var(--tag-color-hover);
      text-decoration: var(--tag-decoration-hover);
      background-color: var(--tag-background-hover);
      border-color: var(--tag-border-color-hover);
    }
  }

  .action-bar .action-bar__search {
    flex-grow: 1;
    @media screen and (min-width: 700px) {
      min-width: 300px;
      max-width: 300px;
      box-shadow: calc(0px - var(--size-4-5)) 0 var(--size-2-3) var(--size-2-3)
        var(--background-primary);
    }
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
