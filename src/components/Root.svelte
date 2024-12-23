<script lang="ts">
  import { Menu, setIcon } from "obsidian";
  import { onMount, tick } from "svelte";
  import MiniMasonry from "minimasonry";

  import Card from "./Card.svelte";
  import {
    displayedFiles,
    searchQuery,
    searchCaseSensitive,
    skipNextTransition,
    Sort,
    sort,
    viewIsVisible,
    settings,
  } from "./store";

  let notesGrid: MiniMasonry;
  let cardsContainer: HTMLElement;

  const sortIcon = (element: HTMLElement) => {
    setIcon(element, "arrow-down-wide-narrow");
  };

  const caseSensitiveIcon = (element: HTMLElement) => {
    setIcon(element, "case-sensitive");
  };

  const starIcon = (element: HTMLElement) => {
    setIcon(element, "star");
  };

  function toggleSavedSearch(search: string) {
    if (!search) return;
    $settings.savedSearch = $settings.savedSearch?.includes(search)
      ? $settings.savedSearch.filter((s) => s !== search)
      : [...($settings.savedSearch || []), search];
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
    });
    sortMenu.showAtMouseEvent(event);
  }

  onMount(() => {
    notesGrid = new MiniMasonry({
      container: cardsContainer,
      baseWidth: $settings.minCardWidth,
      gutter: 20,
      surroundingGutter: false,
      ultimateGutter: 20,
    });
    $skipNextTransition = true;
    notesGrid.layout();

    return () => {
      notesGrid.destroy();
    };
  });

  let layoutTimeout: NodeJS.Timeout | null = null;
  const debouncedLayout = () => {
    // If there has been a relayout call in the last 100ms,
    // we schedule another one in 100ms to avoid layout thrashing
    // If one is already schedule, we cancel it and schedule a new one
    if (layoutTimeout) {
      clearTimeout(layoutTimeout);
      layoutTimeout = setTimeout(() => {
        notesGrid.layout();
        if (layoutTimeout) clearTimeout(layoutTimeout);
      }, 100);
      return;
    }

    // Otherwise, relayout immediately
    notesGrid.layout();
    layoutTimeout = setTimeout(() => {
      if (layoutTimeout) clearTimeout(layoutTimeout);
    }, 100);
  };

  const updateLayoutNextTick = (transition = false) => {
    if (!$viewIsVisible) {
      $skipNextTransition = true;
      return;
    } else {
      $skipNextTransition = !transition;
    }

    tick().then(debouncedLayout);
    $skipNextTransition = false;
  };
</script>

<div class="action-bar">
  <button
    class="clickable-icon sort-button"
    use:sortIcon
    onclick={sortMenu}
    aria-label="Sort"
  ></button>
  <div class="action-bar__search">
    <div class="search-input-container">
      <input
        enterkeyhint="search"
        type="search"
        spellcheck="false"
        bind:value={$searchQuery}
      />
      <div
        class="search-input-clear-button"
        onclick={() => ($searchQuery = "")}
        onkeydown={(e) => {
          e.stopPropagation();
          $searchQuery = "";
        }}
        role="button"
        tabindex="0"
      ></div>
      <div
        class="input-right-decorator clickable-icon"
        class:is-active={$searchCaseSensitive}
        role="checkbox"
        aria-label="Case sensitive search"
        aria-checked={$searchCaseSensitive}
        use:caseSensitiveIcon
        onclick={() => ($searchCaseSensitive = !$searchCaseSensitive)}
        tabindex="0"
        onkeydown={(e: Event) => {
          e.stopPropagation();
          $searchCaseSensitive = !$searchCaseSensitive;
        }}
      ></div>
      {#if $searchQuery}
        <div
          class="input-right-decorator clickable-icon"
          class:is-active={$settings.savedSearch?.includes($searchQuery)}
          role="checkbox"
          aria-label="Save search"
          aria-checked={$settings.savedSearch?.includes($searchQuery)}
          use:starIcon
          onclick={() => toggleSavedSearch($searchQuery)}
          tabindex="0"
          onkeydown={(e: Event) => {
            e.stopPropagation();
            toggleSavedSearch($searchQuery);
          }}
          style="transform: translateY(-50%) translateX(-100%)"
        ></div>
      {/if}
    </div>
  </div>
  <div class="action-bar__tags">
    <div class="action-bar__tags__list">
      {#each $settings.savedSearch || [] as savedSearch}
        <button
          class="action-bar__tag"
          onclick={() => ($searchQuery = savedSearch)}>{savedSearch}</button
        >
      {/each}
    </div>
  </div>
</div>
<div class="cards-container" bind:this={cardsContainer}>
  {#each $displayedFiles as file (file.path + file.stat.mtime)}
    <Card {file} {updateLayoutNextTick} />
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
