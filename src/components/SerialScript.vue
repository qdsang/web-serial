<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { SerialHelper } from '../utils/SerialHelper'
import { EditorState } from '@codemirror/state'
import { EditorView, keymap } from '@codemirror/view'
import { defaultKeymap } from '@codemirror/commands'
import { javascript } from '@codemirror/lang-javascript'
import { oneDark } from '@codemirror/theme-one-dark'
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language'

interface ScriptItem {
  id: number
  name: string
  code: string
  isRunning: boolean
}

const scripts = ref<ScriptItem[]>([])
const currentScript = ref<ScriptItem>({
  id: Date.now(),
  name: '新建脚本',
  code: '',
  isRunning: false
})

const serialHelper = SerialHelper.getInstance()
const editor = ref<CodeMirror.Editor | null>(null)

const addScript = () => {
  const newScript: ScriptItem = {
    id: Date.now(),
    name: '新建脚本',
    code: `

`,
    isRunning: false
  }
  scripts.value.push(newScript)
  currentScript.value = newScript
  if (editor.value) {
    editor.value.setValue(newScript.code)
  }
}

const removeScript = (id: number) => {
  const index = scripts.value.findIndex(script => script.id === id)
  if (index > -1) {
    scripts.value.splice(index, 1)
    if (currentScript.value.id === id) {
      currentScript.value = scripts.value[0] || {
        id: Date.now(),
        name: '新建脚本',
        code: '',
        isRunning: false
      }
      if (editor.value) {
        editor.value.setValue(currentScript.value.code)
      }
    }
  }
}

const runScript = async (script: ScriptItem) => {
  if (script.isRunning) {
    script.isRunning = false
    return
  }

  script.isRunning = true
  try {
    // 创建一个安全的执行环境
    const scriptContext = {
      sendText: (text: string) => {
        const data = serialHelper.stringToUint8Array(text)
        window.dispatchEvent(new CustomEvent('serial-send', { detail: data }))
      },
      sendHex: (hex: string) => {
        const data = serialHelper.stringToUint8Array(hex, true)
        window.dispatchEvent(new CustomEvent('serial-send', { detail: data }))
      },
      sleep: (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
    }

    // 将脚本代码包装在异步函数中
    const wrappedCode = `
      (async function() {
        ${script.code}
      })()
    `

    // 执行脚本
    const fn = new Function('context', `with(context) { ${wrappedCode} }`)
    await fn(scriptContext)
  } catch (error) {
    console.error('脚本执行错误:', error)
    window.dispatchEvent(new CustomEvent('script-error', { 
      detail: { error: error instanceof Error ? error.message : '未知错误' }
    }))
  } finally {
    script.isRunning = false
  }
}

const saveScripts = () => {
  localStorage.setItem('serialScripts', JSON.stringify(scripts.value))
}

const loadScripts = () => {
  const savedScripts = localStorage.getItem('serialScripts')
  if (savedScripts) {
    try {
      scripts.value = JSON.parse(savedScripts)
    } catch (error) {
      console.error('加载脚本失败:', error)
    }
  }
  if (scripts.value.length === 0) {
    addScript()
  }
  currentScript.value = scripts.value[0] || currentScript.value
  if (editor.value) {
    editor.value.setValue(currentScript.value.code)
  }
}

const handleScriptChange = () => {
  const selected = scripts.value.find(script => script.id === currentScript.value.id)
  if (selected && editor.value) {
    editor.value.setValue(selected.code)
  }
}

const renameScript = () => {
  // 重命名脚本的逻辑
}

onMounted(() => {
  loadScripts()
  
  // 初始化CodeMirror编辑器
  const container = document.getElementById('script-editor-container')
  if (container) {
    const startState = EditorState.create({
      doc: currentScript.value.code,
      extensions: [
        keymap.of(defaultKeymap),
        syntaxHighlighting(defaultHighlightStyle),
        javascript(),
        oneDark,
        EditorView.updateListener.of(update => {
          if (update.docChanged) {
            currentScript.value.code = update.state.doc.toString()
          }
        })
      ]
    })

    editor.value = new EditorView({
      state: startState,
      parent: container
    })
  }
})

watch(scripts, () => {
  saveScripts()
}, { deep: true })
</script>

<template>
  <div class="serial-script">
    <div class="script-select">
      <el-select size="small" v-model="currentScript.id" @change="handleScriptChange" placeholder="选择脚本">
        <el-option
          v-for="script in scripts"
          :key="script.id"
          :label="script.name"
          :value="script.id"
        />
      </el-select>
      <el-button-group class="ms-2" style="width: 250px;">
        <el-button size="small" @click="addScript">
          <el-icon><Plus /></el-icon> 新建
        </el-button>
        <el-button size="small" @click="renameScript">改名</el-button>
        <el-button size="small" type="danger" @click="removeScript(currentScript.id)">删除</el-button>
      </el-button-group>
    </div>


    <div class="script-editor">
      <div class="script-name-container">
        <el-input
          size="small"
          v-model="currentScript.name"
          placeholder="脚本名称"
          class="script-name-input"
        />
        <el-button
          :type="currentScript.isRunning ? 'success' : 'primary'"
          size="small"
          @click="runScript(currentScript)"
          class="run-button"
        >
          {{ currentScript.isRunning ? '停止' : '运行' }}
        </el-button>
      </div>
      <div id="script-editor-container" class="editor-container" />
      <div class="editor-tips">
        <p>可用的API:</p>
        <ul>
          <li>sendText(text) - 发送文本数据</li>
          <li>sendHex(hex) - 发送HEX格式数据</li>
          <li>sleep(ms) - 延时指定毫秒数</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped>
.serial-script {
  margin: 10px;
}

.script-select {
  display: flex;
  align-items: center;
  gap: 8px;
}

.script-editor {
  padding: 8px 0;
}

.script-name-container {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.script-name-input {
  flex: 1;
}

.run-button {
  flex-shrink: 0;
}

.ms-2 {
  margin-left: 8px;
}

/* CodeMirror样式覆盖 */
:deep(.CodeMirror) {
  height: 400px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
}

:deep(.CodeMirror-focused) {
  border-color: #409eff;
}
</style>