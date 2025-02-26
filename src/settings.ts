import CardsViewPlugin from "./main";
import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import { settings } from "./components/store";

export enum TitleDisplayMode {
  Both = "Both",
  Title = "Title",
  Filename = "Filename",
}

export interface CardsViewSettings {
  baseQuery: string;
  minCardWidth: number;
  launchOnStart: boolean;
  displayTitle: TitleDisplayMode;
  pinnedFiles: string[];
  savedSearch?: string[];
}

export const DEFAULT_SETTINGS: CardsViewSettings = {
  baseQuery: "",
  minCardWidth: 200,
  launchOnStart: false,
  displayTitle: TitleDisplayMode.Both,
  pinnedFiles: [],
};

export class CardsViewSettingsTab extends PluginSettingTab {
  plugin: CardsViewPlugin;

  constructor(app: App, plugin: CardsViewPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    new Setting(containerEl)
      .setName("Base search query")
      .setDesc(
        "Use this for example to exclude tags, folders or keywords from the view.",
      )
      .addText((text) =>
        text
          .setPlaceholder('-path:"Folder name/" -tag:hidden')
          .setValue(this.plugin.settings.baseQuery)
          .onChange((value) => {
            settings.update((s) => ({
              ...s,
              baseQuery: value,
            }));
          }),
      );

    new Setting(containerEl)
      .setName("Minimum card width")
      .setDesc("Cards will not be smaller than this width (in pixels)")
      .addText((text) =>
        text
          .setPlaceholder("200")
          .setValue(this.plugin.settings.minCardWidth.toString())
          .onChange((value) => {
            if (isNaN(parseInt(value))) {
              new Notice("Invalid number");
              return;
            }

            settings.update((s) => ({
              ...s,
              minCardWidth: parseInt(value),
            }));
          }),
      );

    new Setting(containerEl)
      .setName("Title display mode")
      .setDesc("What to display on cards starting with a # Level 1 title")
      .addDropdown((dropdown) =>
        dropdown
          .addOptions({
            [TitleDisplayMode.Both]: "Both title and filename",
            [TitleDisplayMode.Title]: "Title",
            [TitleDisplayMode.Filename]: "Filename",
          })
          .setValue(this.plugin.settings.displayTitle)
          .onChange((value) => {
            settings.update((s) => ({
              ...s,
              displayTitle: value as TitleDisplayMode,
            }));
          }),
      );

    new Setting(containerEl)
      .setName("Launch on start")
      .setDesc("Open the cards view when Obsidian starts")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.launchOnStart)
          .onChange((value) => {
            settings.update((s) => ({
              ...s,
              launchOnStart: value,
            }));
          }),
      );

    new Setting(containerEl)
      .setName("Reset settings")
      .setDesc("Reset all settings to default")
      .addButton((button) =>
        button.setButtonText("Reset").onClick(() => {
          settings.set(DEFAULT_SETTINGS);
        }),
      );
  }
}
