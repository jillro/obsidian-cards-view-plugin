<script lang="ts">
  import {
    type MarkdownPostProcessorContext,
    MarkdownPreviewRenderer,
    MarkdownRenderer,
    setIcon,
    TFile,
  } from "obsidian";
  import { onMount } from "svelte";
  import { skipNextTransition, app, view, settings } from "./store";
  import { TitleDisplayMode } from "../settings";
  import { assert, is } from "tsafe";

  interface Props {
    file: TFile;
    updateLayoutNextTick: (transition: boolean) => void;
  }

  let { file, updateLayoutNextTick }: Props = $props();
  let contentDiv: HTMLElement;
  let pinned: boolean = $derived($settings.pinnedFiles.includes(file.path));
  // This will depend both on the settings and the content of the file
  let displayFilename: boolean = $state(true);

  function postProcessor(
    element: HTMLElement,
    context: MarkdownPostProcessorContext,
  ) {
    if (context.sourcePath !== file.path) {
      // Very important to check if the sourcePath is the same as the file path
      // Otherwise, the post processor will be applied to all files
      return;
    }

    if (
      $settings.displayTitle != TitleDisplayMode.Both &&
      element.children.length > 0 &&
      element.children[0].tagName === "H1" &&
      element.children[0].textContent
    ) {
      if ($settings.displayTitle == TitleDisplayMode.Title) {
        displayFilename = false;
      } else if ($settings.displayTitle == TitleDisplayMode.Filename) {
        element.children[0].remove();
      }
    }

    if (element.children.length === 0) {
      return;
    }

    // Add shadow to blocks of embed notes (we take all .internal-embed,
    // including images, because we can't differentiate them at that time,
    // but CSS will only apply to embed notes)
    for (let i = 0; i < element.children.length; i++) {
      if (
        element.children[i].getElementsByClassName("internal-embed").length ||
        element.children[i].className.includes("block-language-dataview")
      ) {
        element.children[i].appendChild(
          document.createElement("div"),
        ).className = "embed-shadow";
      }
    }

    // Find block where to cut the preview
    let lastBlockIndex: number = 0,
      charCount: number = 0;
    do {
      charCount += element.children[lastBlockIndex]?.textContent?.length || 0;
    } while (
      lastBlockIndex < element.children.length &&
      charCount < 200 &&
      ++lastBlockIndex
    );

    // Remove all blocks after the last block
    for (let i = element.children.length - 1; i > lastBlockIndex; i--) {
      element.children[i]?.remove();
    }

    if (charCount < 200) {
      return;
    }

    // Cut the last block
    if (
      !element.children[lastBlockIndex].lastChild ||
      element.children[lastBlockIndex].lastChild?.nodeType !== Node.TEXT_NODE
    ) {
      return;
    }

    const lastElText = element.children[lastBlockIndex].lastChild?.textContent;
    if (lastElText != null) {
      const lastChild = element.children[lastBlockIndex].lastChild;
      assert(!is<null>(lastChild));
      assert(!is<null>(lastElText));
      const cut = Math.min(50, 200 - (charCount - lastElText.length));
      lastChild.textContent = `${lastElText.slice(0, cut)} ...`;
    }
  }

  const renderFile = async (el: HTMLElement): Promise<void> => {
    const content = await file.vault.cachedRead(file);
    MarkdownPreviewRenderer.registerPostProcessor(postProcessor);
    await MarkdownRenderer.render($app, content, el, file.path, $view);
    MarkdownPreviewRenderer.unregisterPostProcessor(postProcessor);
  };

  const togglePin = async (e: Event) => {
    e.stopPropagation();
    $settings.pinnedFiles = pinned
      ? $settings.pinnedFiles.filter((f) => f !== file.path)
      : [...$settings.pinnedFiles, file.path];
    updateLayoutNextTick(true);
  };

  const trashFile = async (e: Event) => {
    e.stopPropagation();
    await file.vault.trash(file, true);
    updateLayoutNextTick(true);
  };

  const openFile = async () =>
    await $app.workspace.getLeaf("tab").openFile(file);

  const pinButton = (element: HTMLElement) => setIcon(element, "pin");
  const trashIcon = (element: HTMLElement) => setIcon(element, "trash");
  const folderIcon = (element: HTMLElement) => setIcon(element, "folder");

  onMount(() => {
    (async () => {
      await renderFile(contentDiv);
      updateLayoutNextTick(false);
    })();
    return () => updateLayoutNextTick(false);
  });
</script>

<div
  class="card"
  class:skip-transition={$skipNextTransition}
  onclick={openFile}
  role="link"
  onkeydown={openFile}
  tabindex="0"
>
  {#if displayFilename}<h1>{file.basename}</h1>{/if}
  <div bind:this={contentDiv}></div>
  <div class="card-info">
    <button
      class="clickable-icon"
      class:is-active={pinned}
      use:pinButton
      onclick={togglePin}
      aria-label="Pin file"
    ></button>
    {#if file.parent != null && file.parent.path !== "/"}
      <div class="folder-name">
        <span use:folderIcon></span>{file.parent.path}
      </div>
    {/if}
    <button
      class="clickable-icon"
      use:trashIcon
      onclick={trashFile}
      aria-label="Delete file"
    ></button>
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

  .card :global(p:has(> span.image-embed):not(:has(br))) {
    margin: 0;
  }

  .card :global(span.image-embed) {
    margin: 0 calc(-1 * var(--card-padding));
    width: calc(100% + 2 * var(--card-padding));
  }

  /* Images embeds alone in a paragraph */
  .card :global(p:has(> span.image-embed):not(:has(br)) span.image-embed) {
    display: block;
    & :global(img) {
      display: block;
    }
  }

  /* Image embeds followed by line break in same paragraph */
  .card :global(p:has(> span.image-embed):has(br) span.image-embed) {
    display: inline-block;
  }

  /** Embed notes */
  .card :global(p:has(> span.markdown-embed)),
  .card :global(.block-language-dataview) {
    overflow: hidden;
    max-height: 5rem;
    position: relative;
  }

  .card :global(p:has(> span.markdown-embed) > .embed-shadow),
  .card :global(.block-language-dataview > .embed-shadow) {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    box-shadow: inset 0 -2rem 1rem -1rem var(--background-primary-alt);
  }

  .card:hover {
    border-color: var(--background-modifier-border-hover);
  }

  .card :global(h3) {
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
    justify-content: space-between;
    gap: var(--size-4-1);
  }

  .card .card-info .clickable-icon.is-active {
    color: var(--tab-text-color-focused-active);
    background-color: var(--background-modifier-hover);
  }

  .card .card-info .folder-name {
    flex-grow: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--size-4-1);
    color: var(--text-muted);
  }
</style>
