import CardsViewPlugin from "./main";
import { App, Notice, PluginSettingTab, Setting } from "obsidian";

export enum TitleDisplayMode {
  Both = "Both",
  Title = "Title",
  Filename = "Filename",
}

export interface CardsViewSettings {
  minCardWidth: number;
  launchOnStart: boolean;
  showDeleteButton: boolean;
  displayTitle: TitleDisplayMode;
  pinnedFiles: string[];
}

export const DEFAULT_SETTINGS: CardsViewSettings = {
  minCardWidth: 200,
  launchOnStart: false,
  showDeleteButton: true,
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
      .setName("Show delete button")
      .setDesc(
        "Disable this option to remove the delete button, so you dont delete any note accidentally."
      )
      .addToggle((toggle) =>
        toggle
          .setValue(this.plugin.settings.showDeleteButton)
          .onChange(async (value) => {
            this.plugin.settings.showDeleteButton = value;
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
