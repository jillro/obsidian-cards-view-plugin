import { ItemView, MarkdownRenderer, TAbstractFile, TFile, WorkspaceLeaf } from 'obsidian'
import type { CardsViewSettings } from './settings'
import Root from './components/Root.svelte'
import store, { Sort } from './components/store'
import { get } from 'svelte/store'

// 定义视图类型常量
export const VIEW_TYPE = 'cards-view'

// 定义CardsViewPluginView类，继承自ItemView
export class CardsViewPluginView extends ItemView {
  // 私有成员变量，存储设置和根组件
  private settings: CardsViewSettings
  private svelteRoot?: Root

  // 构造函数，初始化设置和叶子节点
  constructor(settings: CardsViewSettings, leaf: WorkspaceLeaf) {
    super(leaf)
    this.settings = settings
  }

  // 获取视图类型
  getViewType() {
    return VIEW_TYPE
  }

  // 获取显示文本
  getDisplayText() {
    return 'Cards View'
  }

  // 异步打开视图时的操作
  async onOpen() {
    // 获取视图内容的容器
    const viewContent = this.containerEl.children[1]
    // 设置store中的文件为应用中所有的Markdown文件
    store.files.set(this.app.vault.getMarkdownFiles())

    // 初始化Svelte根组件
    this.svelteRoot = new Root({
      props: {
        // 传递设置
        settings: this.settings,
        // 打开文件的回调函数
        openFile: async (file: TFile) => await this.app.workspace.getLeaf('tab').openFile(file),
        // 渲染文件的回调函数
        renderFile: async (file: TFile, el: HTMLElement) => {
          const content = await this.app.vault.cachedRead(file)
          // 获取文件内容的前10行
          const tenLines = content.split('\n').slice(0, 10).join('\n')
          // 生成内容摘要
          const summary = `${tenLines.length < 200 ? tenLines : content.slice(0, 200)}${content.length > 200 ? ' ...' : ''}`
          // 使用Markdown渲染器渲染内容
          await MarkdownRenderer.render(this.app, summary, el, file.path, this)
        },
        // 删除文件的回调函数
        trashFile: async (file: TFile) => {
          await this.app.vault.trash(file, true)
        }
      },
      target: viewContent
    })

    // 注册文件创建事件的监听器
    this.registerEvent(
      this.app.vault.on('create', async (file: TAbstractFile) => {
        if (file instanceof TFile && file.extension === 'md') {
          // 更新store中的文件列表
          store.files.update(files => files?.concat(file))
        }
      })
    )

    // 注册文件删除事件的监听器
    this.registerEvent(
      this.app.vault.on('delete', async (file: TAbstractFile) => {
        if (file instanceof TFile && file.extension === 'md') {
          // 更新store中的文件列表
          store.files.update(files => files?.filter(f => f.path !== file.path))
        }
      })
    )

    // 注册文件修改事件的监听器
    this.registerEvent(
      this.app.vault.on('modify', async (file: TAbstractFile) => {
        if (file instanceof TFile && file.extension === 'md') {
          // 更新store中的文件列表
          store.files.update(files => files?.map(f => (f.path === file.path ? file : f)))
        }
      })
    )

    // 注册文件重命名事件的监听器
    this.registerEvent(
      this.app.vault.on('rename', async (file: TAbstractFile, oldPath: string) => {
        if (file instanceof TFile && file.extension === 'md') {
          // 更新store中的文件列表
          store.files.update(files => files?.map(f => (f.path === oldPath ? file : f)))
        }
      })
    )

    // 添加滚动事件监听器，当滚动到视图内容的80%时，加载更多卡片
    viewContent.addEventListener('scroll', async () => {
      if (viewContent.scrollTop + viewContent.clientHeight > viewContent.scrollHeight - 500) {
        store.skipNextTransition.set(true)
        store.displayedCount.set(get(store.displayedFiles).length + 50)
      }
    })

    // 注册活动叶子节点改变事件的监听器
    this.app.workspace.on('active-leaf-change', () => {
      // 检查当前叶子节点是否可见
      const rootLeaf = this.app.workspace.getMostRecentLeaf(this.app.workspace.rootSplit)
      store.viewIsVisible.set(rootLeaf?.view?.getViewType() === VIEW_TYPE)
    })
  }

  // 新增 updateFiles 方法
  updateFiles(files: TFile[]) {
    store.files.set(files)
    store.displayedCount.set(50) // 重置显示的文件数量
    store.searchQuery.set('') // 清空搜索查询
    store.sort.set(Sort.Modified) // 重置排序方式
  }

  // 异步关闭视图时的操作
  async onClose() {
    // 更新store中的视图状态
    store.viewIsVisible.set(false)
    store.searchQuery.set('')
    store.displayedCount.set(50)
    store.sort.set(Sort.Modified)
  }
}
