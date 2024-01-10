import {ItemView, MarkdownRenderer, Plugin, setIcon, TAbstractFile, TFile, TFolder, WorkspaceLeaf} from 'obsidian';
import Masonry from 'masonry-layout';

const VIEW_TYPE = 'cards-view-plugin';

export default class CardsViewPlugin extends Plugin {
	async onload() {
		this.addRibbonIcon('align-start-horizontal', 'Card explorer', () => {
			this.activateView();
		});

		this.addCommand({
			id: "cards-view-plugin",
			name: "Open card explorer",
			callback: () => {
				this.activateView();
			},
		});

		this.registerView(VIEW_TYPE, (leaf) => new CardsViewPluginView(leaf));
	}

	onunload() {

	}

	async activateView() {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | null;
		const leaves = workspace.getLeavesOfType(VIEW_TYPE);

		if (leaves.length) {
			leaf = leaves[0];
		} else {
			leaf = workspace.getLeaf('tab');
			await leaf.setViewState({ type: VIEW_TYPE, active: true });
		}
	}
}

class CardsViewPluginView extends ItemView {
	private cardContainer: HTMLElement;
	private notesGrid: Masonry;
	private nextCardIndex = 0;

	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
	}

	getViewType() {
		return "notes";
	}

	getDisplayText() {
		return this.app.vault.getName();
	}

	// Get all notes recursively in a flat array
	async getNotes(folder: TFolder): Promise<TFile[]> {
		const notes: TFile[] = [];
		for (const file of folder.children) {
			if (file instanceof TFolder) {
				notes.push(...(await this.getNotes(file)));
			} else if (file instanceof TFile && file.extension === 'md') {
				notes.push(file);
			}
		}

		return notes;
	}

	async getFileStringId(file: TFile): Promise<string> {
		const buffer = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(file.path + file.basename))
		// convert buffer to hexa string
		const hash = Array.from(new Uint8Array(buffer)).map((x: number) => ('00' + x.toString(16)).slice(-2)).join('');
		return `note-${hash}`;
	}

	async addCard(file: TFile, prepend = false) {
		const content = (await this.app.vault.cachedRead(file));
		// id is a hash of the file path
		const div = createEl('div', { cls: `card ${await this.getFileStringId(file)}` });
		div.createEl('h3', { text: file.basename });

		// get first 10 lines of the file
		const tenLines = content.split('\n').slice(0, 10).join('\n');
		const summary = `${tenLines.length < 200 ? tenLines : content.slice(0, 200)}${content.length > 200 ? ' ...' : ''}`;
		await MarkdownRenderer.render(this.app, summary, div, file.path, this);

		const cardInfo = div.createEl('div', { cls: 'card-info' });

		const parentFolder = file.parent as TFolder;
		if (parentFolder.path !== '/') {
			setIcon(cardInfo, 'folder' );
			cardInfo.createEl('span', { text: `${parentFolder.path}/`, cls: 'folder-name' });
		}

		const trashButton = cardInfo.createEl('div', { cls: 'clickable-icon' });
		setIcon(trashButton, 'trash');
		trashButton.addEventListener('click', async (e: MouseEvent) => {
			e.stopPropagation();
			const eventTarget = e.target as HTMLElement;
			this.notesGrid?.remove?.([eventTarget.parentElement?.parentElement?.parentElement]);
			this.notesGrid?.layout?.();
			await this.app.vault.trash(file, true);
		});

		div.addEventListener('click', () => {
			this.app.workspace.getLeaf('tab').openFile(file);
		});
		this.cardContainer.appendChild(div);
		this.notesGrid[prepend ? 'prepended': 'appended']?.([div]);
	}

	async getCard(file: TFile) {
		return this.cardContainer.querySelector(`#${file.basename}`);
	}

	async loadFolder(folder: TFolder) {
		this.cardContainer.empty();

		const files = (await this.getNotes(folder)).sort(
			(a: TFile, b :TFile) => b.stat.mtime - a.stat.mtime
		);

		for (; this.nextCardIndex < 50; this.nextCardIndex++) {
			const file = files[this.nextCardIndex];
			if (!file) break;
			await this.addCard(file);
		}


		// TODO search + button plus + épingler et couleurs
		// Extension commander et omnisearch
	}

	async onOpen() {
		const viewContent = this.containerEl.children[1];
		this.cardContainer = viewContent.createEl('div');
		this.cardContainer.className += 'cards-view-plugin';
		this.notesGrid = new Masonry(this.cardContainer, {
			itemSelector: '.card',
			gutter: 20,
			transitionDuration: 0,
			containerStyle: {
				width: '100%',
			}
		});
		const observer = new ResizeObserver(() => {
			this.notesGrid?.layout?.();
		});
		observer.observe(this.cardContainer);

		const root = this.app.vault.getRoot();
		await this.loadFolder(root);
		this.app.vault.on('create', async (file: TFile) => {
			if (file.extension === 'md') {
				await this.addCard(file, true);
				this.notesGrid?.layout?.();
				this.nextCardIndex++;
			}
		})
		this.app.vault.on('delete', async (file: TAbstractFile) => {
			if (file instanceof TFile && file.extension === 'md') {
				const element = document.getElementsByClassName(await this.getFileStringId(file))[0];
				this.notesGrid?.remove?.([element]);
				this.notesGrid?.layout?.();
				this.nextCardIndex--;
			}
		})

		let loading = false;
		// On scroll 80% of viewContent, load more cards
		viewContent.addEventListener('scroll', async () => {
			if (loading) return;
			if (viewContent.scrollTop + viewContent.clientHeight < viewContent.scrollHeight - 500) return;

			loading = true;
			const files = (await this.getNotes(root)).sort(
				(a: TFile, b :TFile) => b.stat.mtime - a.stat.mtime
			);
			for (let i = this.nextCardIndex; i < this.nextCardIndex + 50; i++) {
				const file = files[i];
				if (!file) break;
				await this.addCard(file);
			}
			this.nextCardIndex += 50;
			loading = false;
		})
	}

	async onClose() {
		//
	}
}
