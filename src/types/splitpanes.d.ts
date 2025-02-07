declare module 'splitpanes' {
  import { Component } from 'vue'

  export const Splitpanes: Component
  export const Pane: Component

  export interface SplitpanesProps {
    horizontal?: boolean
    pushOtherPanes?: boolean
    dblClickSplitter?: boolean
    firstSplitter?: boolean
  }

  export interface PaneProps {
    size?: number
    minSize?: number
    maxSize?: number
  }
}