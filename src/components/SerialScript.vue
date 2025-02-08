<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { EditorState } from '@codemirror/state'
import { EditorView, keymap, lineNumbers } from '@codemirror/view'
import { defaultKeymap } from '@codemirror/commands'
import { javascript } from '@codemirror/lang-javascript'
import { oneDark, oneDarkHighlightStyle } from '@codemirror/theme-one-dark'
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language'
import { ScriptManager, type ScriptItem } from '../utils/ScriptManager'
import { useDark } from '@vueuse/core'

const scriptManager = ScriptManager.getInstance()
const scripts = ref<ScriptItem[]>(scriptManager.getScripts())
const currentScript = ref<ScriptItem>(scriptManager.getCurrentScript())
const currentScriptId = ref<number>(currentScript.value.id)
const editor = ref<EditorView | null>(null)
const isDark = useDark()

const editorSetValue = (content: string) => {
  if (editor.value) {
    editor.value.dispatch({
      changes: { from: 0, to: editor.value.state.doc.length, insert: content }
    })
  }
}

const setCurrentScript = (script: ScriptItem) => {
  scriptManager.setCurrentScript(script)
  currentScript.value = script
  editorSetValue(script.code)

  currentScriptId.value = currentScript.value.id
}

const addScript = () => {
  const newScript = scriptManager.addScript()
  scripts.value = scriptManager.getScripts()
  setCurrentScript(newScript)
}

const removeScript = (id: number) => {
  scriptManager.removeScript(id)
  scripts.value = scriptManager.getScripts()
  if (scripts.value.length == 0) {
    addScript()
  }
  setCurrentScript(scripts.value[0])
}

const runScript = async () => {
  if (currentScript.value.isRunning) {
    await scriptManager.stopScript()
  } else {
    await scriptManager.runScript()
  }
}

const handleScriptChange = () => {
  const selected = scripts.value.find(script => script.id === currentScriptId.value)
  if (selected) {
    setCurrentScript(selected)
  }
}

const createEditor = () => {
  const container = document.getElementById('script-editor-container')
  if (container) {
    const startState = EditorState.create({
      doc: currentScript.value.code,
      extensions: [
        keymap.of(defaultKeymap),
        syntaxHighlighting(isDark.value ? oneDarkHighlightStyle : defaultHighlightStyle),
        javascript(),
        isDark.value ? oneDark : [],
        lineNumbers(),
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
}

onMounted(() => {
  createEditor()
})

watch(isDark, () => {
  if (editor.value) {
    editor.value.destroy()
    createEditor()
  }
})

watch(scripts, () => {
  scriptManager.saveScripts()
}, { deep: true })
</script>

<template>
  <div class="serial-script">
    <div class="script-select">
      <el-select size="small" v-model="currentScriptId" @change="handleScriptChange" placeholder="选择脚本">
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
        <!-- <el-button size="small" @click="renameScript">改名</el-button> -->
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
          @click="runScript()"
          class="run-button"
        >
          {{ currentScript.isRunning ? '停止' : '运行' }}
        </el-button>

        <el-tooltip
            effect="dark"
            placement="bottom"
          >
          <template #content>
            <p>可用的API:</p>
            <ul>
              <li>sendText(text) - 发送文本数据</li>
              <li>sendHex(hex) - 发送HEX格式数据</li>
              <li>sleep(ms) - 延时指定毫秒数</li>
              <li>updateDataTable({pitch: 1.0, roll: 1.0, yaw: 1.0}); 更新IMU数据</li>
            </ul>
          </template>
          <el-button size="small" style="margin-left: 0;">
            <el-icon><Compass /></el-icon>
          </el-button>
        </el-tooltip>
      </div>
      <div id="script-editor-container" class="editor-container" />
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
  height: 800px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
}

:deep(.CodeMirror-focused) {
  border-color: #409eff;
}
</style>