import {
  type CachedMetadata,
  getAllTags,
  ItemView,
  MarkdownRenderer,
  TAbstractFile,
  TFile,
  WorkspaceLeaf,
} from "obsidian";
import type { CardsViewSettings } from "./settings";
import Root from "./components/Root.svelte";
import store, { Sort } from "./components/store";
import { get } from "svelte/store";

export const VIEW_TYPE = "cards-view";

export class CardsViewPluginView extends ItemView {
  private settings: CardsViewSettings;
  private svelteRoot?: Root;

  constructor(settings: CardsViewSettings, leaf: WorkspaceLeaf) {
    super(leaf);
    this.settings = settings;
  }

  getViewType() {
    return VIEW_TYPE;
  }

  getDisplayText() {
    return "Cards View";
  }

  /**
   * Returns all tags in the vault sorted by descending frequency
   */
  async getTags() {
    const tags = get(store.displayedFiles)
      .map(
        (file) =>
          getAllTags(
            this.app.metadataCache.getFileCache(file) as CachedMetadata,
          ) || [],
      )
      .flat();

    const tagCounts = tags.reduce(
      (acc, tag) => {
        acc[tag] = (acc[tag] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return Object.keys(tagCounts).sort((a, b) => tagCounts[b] - tagCounts[a]);
  }

  async onOpen() {
    const viewContent = this.containerEl.children[1];
    store.files.set(this.app.vault.getMarkdownFiles());
    this.registerEvent(
      this.app.vault.on("create", async (file: TAbstractFile) => {
        if (file instanceof TFile && file.extension === "md") {
          store.files.update((files) => files?.concat(file));
        }
      }),
    );
    this.registerEvent(
      this.app.vault.on("delete", async (file: TAbstractFile) => {
        if (file instanceof TFile && file.extension === "md") {
          store.files.update((files) =>
            files?.filter((f) => f.path !== file.path),
          );
        }
      }),
    );
    this.registerEvent(
      this.app.vault.on("modify", async (file: TAbstractFile) => {
        if (file instanceof TFile && file.extension === "md") {
          store.files.update((files) =>
            files?.map((f) => (f.path === file.path ? file : f)),
          );
        }
      }),
    );
    this.registerEvent(
      this.app.vault.on(
        "rename",
        async (file: TAbstractFile, oldPath: string) => {
          if (file instanceof TFile && file.extension === "md") {
            store.files.update((files) =>
              files?.map((f) => (f.path === oldPath ? file : f)),
            );
          }
        },
      ),
    );

    store.tags.set(await this.getTags());
    store.displayedFiles.subscribe(async () => {
      store.tags.set(await this.getTags());
    });
    this.registerEvent(
      this.app.metadataCache.on("resolved", async () =>
        store.tags.set(await this.getTags()),
      ),
    );

    this.svelteRoot = new Root({
      props: {
        settings: this.settings,
        openFile: async (file: TFile) =>
          await this.app.workspace.getLeaf("tab").openFile(file),
        renderFile: async (file: TFile, el: HTMLElement) => {
          const content = await this.app.vault.cachedRead(file);
          // get first 10 lines of the file
          const tenLines = content.split("\n").slice(0, 10).join("\n");
          const summary = `${tenLines.length < 200 ? tenLines : content.slice(0, 200)}${content.length > 200 ? " ..." : ""}`;
          await MarkdownRenderer.render(this.app, summary, el, file.path, this);
        },
        trashFile: async (file: TFile) => {
          await this.app.vault.trash(file, true);
        },
      },
      target: viewContent,
    });

    // On scroll 80% of viewContent, load more cards
    viewContent.addEventListener("scroll", async () => {
      if (
        viewContent.scrollTop + viewContent.clientHeight >
        viewContent.scrollHeight - 500
      ) {
        store.skipNextTransition.set(true);
        store.displayedCount.set(get(store.displayedFiles).length + 50);
      }
    });

    this.app.workspace.on("active-leaf-change", () => {
      // check our leaf is visible
      const rootLeaf = this.app.workspace.getMostRecentLeaf(
        this.app.workspace.rootSplit,
      );
      store.viewIsVisible.set(rootLeaf?.view?.getViewType() === VIEW_TYPE);
    });
  }

  async onClose() {
    store.viewIsVisible.set(false);
    store.searchQuery.set("");
    store.displayedCount.set(50);
    store.sort.set(Sort.Modified);
  }
}
