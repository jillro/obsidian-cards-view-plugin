<!-- ./src/components/Card.svelte -->

<script lang="ts">
  import {
    type MarkdownPostProcessorContext,
    MarkdownPreviewRenderer,
    MarkdownRenderer,
    setIcon,
    TFile,
  } from "obsidian";
  import { createEventDispatcher, onMount } from "svelte";
  import { skipNextTransition, app, view, settings } from "./store";
  import { TitleDisplayMode } from "../settings";
  import type { Child } from "svelte-eslint-parser/lib/parser/compat";

  export let file: TFile;
  let displayFilename: boolean = true;
  let contentDiv: HTMLElement;
  let pinned: boolean;
  $: pinned = $settings.pinnedFiles.includes(file.path);

  // Compute style based on settings
  $: cardStyle = $settings.maxCardHeight
    ? `max-height: ${$settings.maxCardHeight}px; overflow: hidden; text-overflow: ellipsis;`
    : "";

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
        // console.log("Adding shadow to embed note");
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

    // TODO : I have to find out how many words will fit in the card, when a max-hight option has been set, to add the '...' at the end.
    const lastElText = element.children[lastBlockIndex].lastChild?.textContent;
    if (lastElText != null) {
      const cut = Math.min(50, 200 - (charCount - lastElText.length));
      (element.children[lastBlockIndex].lastChild as Child).textContent =
        `${lastElText.slice(0, cut)} ...`;
    }
  }

  const renderFile = async (el: HTMLElement): Promise<void> => {
    const content = await file.vault.cachedRead(file);
    // TODO : Need to add the logic to detect frontmatter and show it.
    if (content.trim().length > 0) {
      MarkdownPreviewRenderer.registerPostProcessor(postProcessor);
      await MarkdownRenderer.render($app, content, el, file.path, $view);
      MarkdownPreviewRenderer.unregisterPostProcessor(postProcessor);
    } else {
      el.createEl("div", {
        text: "File is Empty",
        cls: "card-content-empty",
      });
    }
  };

  const togglePin = async () => {
    $settings.pinnedFiles = pinned
      ? $settings.pinnedFiles.filter((f) => f !== file.path)
      : [...$settings.pinnedFiles, file.path];
  };

  const trashFile = async () => {
    await file.vault.trash(
      file,
      $settings.toSystemTrash !== "trash" ? true : false,
    );
  };

  const openFile = async () => {
    if ($settings.openNoteLayout === "right") {
      await $app.workspace.getLeaf("split", "vertical").openFile(file);
    } else if ($settings.openNoteLayout === "tab") {
      await $app.workspace.getLeaf("tab").openFile(file);
    } else if ($settings.openNoteLayout === "window") {
      await $app.workspace.getLeaf("window").openFile(file);
    }
  };

  const pinButton = (element: HTMLElement) => setIcon(element, "pin");
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
  style={cardStyle}
  class:skip-transition={$skipNextTransition}
  on:click={openFile}
  role="link"
  on:keydown={openFile}
  tabindex="0"
>
  <div class="top-bar">
    {#if displayFilename}<div>{file.basename}</div>{/if}
  </div>

  <div class="card-content" bind:this={contentDiv}></div>

  <div class="card-info">
    <button
      class="clickable-icon"
      class:is-active={pinned}
      use:pinButton
      on:click|stopPropagation={togglePin}
    />
    {#if file.parent != null && file.parent.path !== "/"}
      <div class="folder-name"><span use:folderIcon />{file.parent.path}</div>
    {/if}
    {#if $settings.showDeleteButton}
      <button
        class="clickable-icon"
        use:trashIcon
        on:click|stopPropagation={trashFile}
      />
    {/if}
  </div>
</div>

<style>
</style>
