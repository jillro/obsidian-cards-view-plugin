// ./src/settings.ts

import { App, Notice, PluginSettingTab, Setting } from "obsidian";

import CardsViewPlugin from "../main";

export enum TitleDisplayMode {
  Both = "Both",
  Title = "Title",
  Filename = "Filename",
}

export interface CardsViewSettings {
  minCardWidth: number;
  launchOnStart: boolean;
  displayTitle: TitleDisplayMode;
  pinnedFiles: string[];
}

export const DEFAULT_SETTINGS: CardsViewSettings = {
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
      .setName("Minimum card width")
      .setDesc("Cards will not be smaller than this width (in pixels)")
      .addText((text) =>
        text
          .setPlaceholder("200")
          .setValue(this.plugin.settings.minCardWidth.toString())
          .onChange(async (value) => {
            if (isNaN(parseInt(value))) {
              new Notice("Invalid number");
              return;
            }

            this.plugin.settings.minCardWidth = parseInt(value);
            await this.plugin.saveSettings();
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
          .onChange(async (value) => {
            this.plugin.settings.displayTitle = value as TitleDisplayMode;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Launch on start")
      .setDesc("Open the cards view when Obsidian starts")
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.launchOnStart)
          .onChange(async (value) => {
            this.plugin.settings.launchOnStart = value;
            await this.plugin.saveSettings();
          }),
      );

    new Setting(containerEl)
      .setName("Reset settings")
      .setDesc("Reset all settings to default")
      .addButton((button) =>
        button.setButtonText("Reset").onClick(async () => {
          this.plugin.settings = DEFAULT_SETTINGS;
          await this.plugin.saveSettings();
          this.display();
        }),
      );
  }
}
