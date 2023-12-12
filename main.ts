import {ItemView, MarkdownRenderer, Plugin, setIcon, TFile, TFolder, WorkspaceLeaf} from 'obsidian';
import Masonry from 'masonry-layout';

const VIEW_TYPE = 'summary-cards';

export default class SummaryCards extends Plugin {
	async onload() {
		this.addRibbonIcon('align-start-horizontal', 'Card explorer', () => {
			this.activateView();
		});

		this.addCommand({
			id: "summary-cards",
			name: "Open card explorer",
			callback: () => {
				this.activateView();
			},
		});

		this.registerView(VIEW_TYPE, (leaf) => new SummaryCardsView(leaf));
	}

	onunload() {

	}

	async activateView() {
		const { workspace } = this.app;

		let leaf: WorkspaceLeaf | null = null;
		const leaves = workspace.getLeavesOfType(VIEW_TYPE);

		if (leaves.length) {
			leaf = leaves[0];
		} else {
			leaf = workspace.getLeaf('tab');
			await leaf.setViewState({ type: VIEW_TYPE, active: true });
		}
	}
}

class SummaryCardsView extends ItemView {
	cardContainer: HTMLElement;
	folderContainer: HTMLElement;

	constructor(leaf: WorkspaceLeaf) {
		super(leaf);
	}

	getViewType() {
		return "notes";
	}

	getDisplayText() {
		return this.app.vault.getName();
	}

	async loadFolder(folder: TFolder) {
		this.folderContainer.empty();
		this.cardContainer.empty();
		const files = folder.children;

		// Add parent folder
		if (!folder.isRoot()) {
			const div = this.folderContainer.createEl('div', { cls: 'card' });
			setIcon(div.createEl('span', { cls: 'icon-closed' }), 'folder-closed');
			setIcon(div.createEl('span', { cls: 'icon-open' }), 'folder-open');
			div.createEl('span', {text: '..' });
			div.addEventListener('click', () => {
				this.loadFolder(folder.parent);
			});
			this.folderContainer.appendChild(div);
		}

		// Add folders
		files.filter(
			f => f instanceof TFolder
		).map((file: TFolder) => {
			const div = this.folderContainer.createEl('div', { cls: 'card' });
			setIcon(div.createEl('span', { cls: 'icon-closed' }), 'folder-closed');
			setIcon(div.createEl('span', { cls: 'icon-open' }), 'folder-open');
			div.createEl('span', {text: file.name });
			div.addEventListener('click', () => {
				this.loadFolder(file);
			});
			this.folderContainer.appendChild(div);
			return div;
		});

		// Add notes
		await Promise.all(files.filter(
			f => f instanceof TFile && f.extension === 'md'
		).sort(
			(a: TFile, b :TFile) => b.stat.mtime - a.stat.mtime
		).map(async (file: TFile) => {
			const content = (await this.app.vault.cachedRead(file));
			const div = this.cardContainer.createEl('div', { cls: 'card' });
			div.createEl('h3', { text: file.basename });
			// get first 10 lines of the file
			const tenLines = content.split('\n').slice(0, 10).join('\n');
			const summary = `${tenLines.length < 200 ? tenLines : content.slice(0, 200)}${content.length > 200 ? ' ...' : ''}`;
			await MarkdownRenderer.render(this.app, summary, div, file.path, this);

			div.addEventListener('click', () => {
				this.app.workspace.getLeaf('tab').openFile(file);
			});
			this.cardContainer.appendChild(div);
			return div;
		}));

		setImmediate(() => {
			const foldersGrid: Masonry = new Masonry(this.folderContainer, {
				itemSelector: '.card',
				gutter: 20,
				transitionDuration: 0,
				containerStyle: {
					width: '100%',
				}
			});

			const notesGrid: Masonry = new Masonry(this.cardContainer, {
				itemSelector: '.card',
				gutter: 20,
				transitionDuration: 0,
				containerStyle: {
					width: '100%',
				}
			});

			// Observe containers size changes
			const observer = new ResizeObserver(() => {
				// @ts-ignore
				foldersGrid.layout();
				// @ts-ignore
				notesGrid.layout();
			});
			observer.observe(this.folderContainer);
		});
	}

	async onOpen() {
		const viewContent = this.containerEl.children[1];
		this.folderContainer = viewContent.createEl('div');
		this.folderContainer.className += 'folder-cards';
		viewContent.createEl('hr');
		this.cardContainer = viewContent.createEl('div');
		this.cardContainer.className += 'summary-cards';

		const root = this.app.vault.getRoot();
		await this.loadFolder(root);
	}

	async onClose() {
		//
	}
}
