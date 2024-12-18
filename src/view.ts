import { ItemView, TAbstractFile, TFile } from "obsidian";
import Root from "./components/Root.svelte";
import store, { Sort } from "./components/store";
import { get } from "svelte/store";
import { mount } from "svelte";

export const VIEW_TYPE = "cards-view";

export class CardsViewPluginView extends ItemView {
  getViewType() {
    return VIEW_TYPE;
  }

  getDisplayText() {
    return "Cards View";
  }

  async onOpen() {
    const viewContent = this.containerEl.children[1];
    store.view.set(this);

    store.files.set(this.app.vault.getMarkdownFiles());
    this.registerEvent(
      this.app.vault.on("create", async (file: TAbstractFile) => {
        if (!this.app.workspace.layoutReady) {
          return;
        }
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

    mount(Root, {
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
