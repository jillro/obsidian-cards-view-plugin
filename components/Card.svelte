<script lang="ts">
  import { MarkdownRenderer, setIcon, TFile } from "obsidian";
  import { createEventDispatcher, onMount } from "svelte";
  import { skipNextTransition, app, view } from "./store";

  export let file: TFile;

  let contentDiv: HTMLElement;

  const renderFile = async (el: HTMLElement): Promise<void> => {
    const content = await file.vault.cachedRead(file);
    // get first 10 lines of the file
    const tenLines = content.split("\n").slice(0, 10).join("\n");
    const summary = `${tenLines.length < 200 ? tenLines : content.slice(0, 200)}${content.length > 200 ? " ..." : ""}`;
    await MarkdownRenderer.render($app, summary, el, file.path, $view);
  };

  const trashFile = async () => {
    await file.vault.trash(file, true);
  };

  const openFile = async () =>
    await $app.workspace.getLeaf("tab").openFile(file);

  const trashIcon = (element: HTMLElement) => setIcon(element, "trash");
  const folderIcon = (element: HTMLElement) => setIcon(element, "folder");

  const dispatch = createEventDispatcher();
  onMount(async () => {
    await renderFile(contentDiv);
    dispatch("loaded");
  });
</script>

<div
  class="card"
  class:skip-transition={$skipNextTransition}
  on:click={openFile}
  role="link"
  on:keydown={openFile}
  tabindex="0"
>
  <h3>{file.basename}</h3>
  <div bind:this={contentDiv} />
  <div class="card-info">
    {#if file.parent != null && file.parent.path !== "/"}
      <span use:folderIcon /><span class="folder-name">{file.parent.path}</span>
    {/if}
    <button
      class="clickable-icon"
      use:trashIcon
      on:click|stopPropagation={trashFile}
    />
  </div>
</div>

<style>
  .card {
    position: absolute;
    background-color: var(--background-primary-alt);
    border: 1px solid var(--background-modifier-border);
    padding: var(--card-padding);
    word-wrap: break-word;
    overflow-y: hidden;
    margin: 0;
    transition-property: transform;
    transition-duration: 0.4s;
    transform: translate(0, 100vh);
  }

  .card.skip-transition {
    transition: none;
  }

  .card {
    font-size: 0.8rem;
  }

  .card :global(p),
  .card :global(ul) {
    margin: 0.3rem 0;
  }

  .card :global(h1),
  .card :global(h2),
  .card :global(h3) {
    margin: 0 0 0.3rem;
  }

  .card :global(ul) {
    padding-left: var(--size-4-5);
  }

  .card:hover {
    border-color: var(--background-modifier-border-hover);
  }

  .card h3 {
    word-wrap: break-word;
  }

  .card .card-info {
    margin: calc(-1 * var(--card-padding));
    margin-top: 0;
    border-top: 1px solid var(--background-modifier-border);
    padding: var(--size-4-1) var(--card-padding);
    background-color: var(--background-primary);
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: end;
    gap: var(--size-4-1);
  }

  .card .card-info .folder-name {
    flex-grow: 1;
  }
</style>
