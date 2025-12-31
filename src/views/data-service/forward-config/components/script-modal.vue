<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type { FormInst } from 'naive-ui'
import MonacoEditor from 'monaco-editor-vue3'
import { $t } from '@/locales'
import { createRequiredFormRule } from '@/utils/form/rule'
import {
  createForwardingScript,
  updateForwardingScript,
  getForwardingScriptDetail,
  type ForwardingScript
} from '@/service/api/data-forwarding'

export interface Props {
  visible: boolean
  type?: 'add' | 'edit'
  editData?: ForwardingScript | null
}

const props = withDefaults(defineProps<Props>(), {
  type: 'add',
  editData: null
})

interface Emits {
  (e: 'update:visible', visible: boolean): void
  (e: 'success'): void
}

const emit = defineEmits<Emits>()

const modalVisible = computed({
  get() {
    return props.visible
  },
  set(visible) {
    emit('update:visible', visible)
  }
})

const closeModal = () => {
  modalVisible.value = false
}

const title = computed(() => {
  return props.type === 'add' ? $t('dataForwarding.addScript') : $t('dataForwarding.editScript')
})

const formRef = ref<FormInst>()
const loading = ref(false)

// Monaco Editor 配置
const editorOptions = ref({
  automaticLayout: true,
  theme: 'vs',
  language: 'lua',
  fontSize: 14,
  lineHeight: 20,
  fontFamily: 'Consolas, "Courier New", monospace',
  wordWrap: 'on',
  lineNumbers: 'on',
  glyphMargin: true,
  folding: true,
  lineDecorationsWidth: 10,
  lineNumbersMinChars: 3,
  minimap: {
    enabled: true,
    side: 'right',
    size: 'proportional',
    showSlider: 'mouseover'
  },
  scrollBeyondLastLine: false,
  readOnly: false,
  cursorStyle: 'line',
  cursorBlinking: 'blink',
  renderWhitespace: 'selection',
  renderControlCharacters: false,
  fontLigatures: true,
  suggestOnTriggerCharacters: true,
  acceptSuggestionOnEnter: 'on',
  tabCompletion: 'on',
  wordBasedSuggestions: true,
  parameterHints: {
    enabled: true
  },
  quickSuggestions: {
    other: true,
    comments: false,
    strings: false
  },
  bracketPairColorization: {
    enabled: true
  },
  guides: {
    bracketPairs: true,
    indentation: true
  },
  formatOnPaste: true,
  formatOnType: true
})

// 编辑器实例引用
const editorRef = ref()

// 编辑器工具栏功能
const formatCode = () => {
  if (editorRef.value) {
    editorRef.value.getAction('editor.action.formatDocument').run()
  }
}

const toggleMinimap = () => {
  editorOptions.value.minimap.enabled = !editorOptions.value.minimap.enabled
}

const toggleWordWrap = () => {
  editorOptions.value.wordWrap = editorOptions.value.wordWrap === 'on' ? 'off' : 'on'
}

const changeFontSize = (delta: number) => {
  const newSize = editorOptions.value.fontSize + delta
  if (newSize >= 10 && newSize <= 24) {
    editorOptions.value.fontSize = newSize
  }
}

interface FormModel {
  name: string
  description: string
  script_content: string
  remark: string
}

const formModel = reactive<FormModel>({
  name: '',
  description: '',
  script_content: defaultScriptContent(),
  remark: ''
})

const rules = {
  name: createRequiredFormRule($t('dataForwarding.scriptName')),
  script_content: createRequiredFormRule($t('dataForwarding.scriptContent'))
}

function defaultScriptContent(): string {
  return `-- 数据转发 Lua 脚本示例
-- payload: 原始消息（JSON 字符串）
-- 返回值: 处理后的消息（JSON 字符串）

local data = json.decode(payload)

-- 在此处添加数据处理逻辑
-- 例如: 添加处理时间戳
data.processed_at = os.time() * 1000

return json.encode(data)`
}

function resetForm() {
  formModel.name = ''
  formModel.description = ''
  formModel.script_content = defaultScriptContent()
  formModel.remark = ''
}

async function loadEditData() {
  if (!props.editData?.id) return

  loading.value = true
  try {
    const { data } = await getForwardingScriptDetail(props.editData.id)
    if (data) {
      formModel.name = data.name || ''
      formModel.description = data.description || ''
      formModel.script_content = data.script_content || defaultScriptContent()
      formModel.remark = data.remark || ''
    }
  } finally {
    loading.value = false
  }
}

async function handleSubmit() {
  await formRef.value?.validate()

  loading.value = true
  try {
    const submitData: ForwardingScript = {
      name: formModel.name,
      description: formModel.description,
      script_content: formModel.script_content,
      remark: formModel.remark
    }

    if (props.type === 'edit' && props.editData?.id) {
      submitData.id = props.editData.id
      const { error } = await updateForwardingScript(submitData)
      if (!error) {
        window.$message?.success($t('common.updateSuccess'))
        emit('success')
        closeModal()
      }
    } else {
      const { error } = await createForwardingScript(submitData)
      if (!error) {
        window.$message?.success($t('common.addSuccess'))
        emit('success')
        closeModal()
      }
    }
  } finally {
    loading.value = false
  }
}

watch(
  () => props.visible,
  async newValue => {
    if (newValue) {
      if (props.type === 'edit') {
        await loadEditData()
      } else {
        resetForm()
      }
    }
  }
)
</script>

<template>
  <NModal v-model:show="modalVisible" preset="card" :title="title" class="w-900px" :mask-closable="false">
    <NSpin :show="loading">
      <NForm ref="formRef" label-placement="top" :model="formModel" :rules="rules">
        <NGrid :cols="24" :x-gap="18">
          <NFormItemGridItem :span="12" :label="$t('dataForwarding.scriptName')" path="name">
            <NInput v-model:value="formModel.name" :placeholder="$t('common.inputPlaceholder')" />
          </NFormItemGridItem>
          <NFormItemGridItem :span="12" :label="$t('dataForwarding.remark')">
            <NInput v-model:value="formModel.remark" :placeholder="$t('common.inputPlaceholder')" />
          </NFormItemGridItem>
          <NFormItemGridItem :span="24" :label="$t('common.description')">
            <NInput v-model:value="formModel.description" type="textarea" :rows="2"
              :placeholder="$t('common.inputPlaceholder')" />
          </NFormItemGridItem>
          <NFormItemGridItem :span="24" :label="$t('dataForwarding.scriptContent')" path="script_content">
            <div class="editor-container">
              <!-- 编辑器工具栏 -->
              <div class="editor-toolbar">
                <div class="toolbar-left">
                  <NButton size="small" tertiary @click="formatCode">
                    <template #icon>
                      <n-icon>
                        <svg viewBox="0 0 24 24">
                          <path fill="currentColor"
                            d="M9.5 15.5L4.5 10.5L9.5 5.5L8.09 4.09L1.5 10.68L8.09 17.27L9.5 15.5ZM14.5 8.5L19.5 13.5L14.5 18.5L15.91 19.91L22.5 13.32L15.91 6.73L14.5 8.5Z" />
                        </svg>
                      </n-icon>
                    </template>
                    格式化
                  </NButton>
                  <NButton size="small" tertiary @click="toggleWordWrap">
                    <template #icon>
                      <n-icon>
                        <svg viewBox="0 0 24 24">
                          <path fill="currentColor"
                            d="M4 19h6v-2H4v2zM20 5H4v2h16V5zm-3 6H4v2h13.25c1.1 0 2 .9 2 2s-.9 2-2 2H15v-2l-3 3l3 3v-2h2.25c2.3 0 4.25-2.05 4.25-4.5S19.55 11 17.25 11z" />
                        </svg>
                      </n-icon>
                    </template>
                    自动换行
                  </NButton>
                  <NButton size="small" tertiary @click="toggleMinimap">
                    <template #icon>
                      <n-icon>
                        <svg viewBox="0 0 24 24">
                          <path fill="currentColor"
                            d="M3 3h18v18H3V3zm16 16V5H5v14h14zM7 7h2v2H7V7zm0 4h2v2H7v-2zm0 4h2v2H7v-2zm4-8h6v2h-6V7zm0 4h6v2h-6v-2zm0 4h6v2h-6v-2z" />
                        </svg>
                      </n-icon>
                    </template>
                    小地图
                  </NButton>
                </div>
                <div class="toolbar-right">
                  <NButton size="small" tertiary @click="changeFontSize(-1)">
                    <template #icon>
                      <n-icon>
                        <svg viewBox="0 0 24 24">
                          <path fill="currentColor" d="M19 13H5v-2h14v2z" />
                        </svg>
                      </n-icon>
                    </template>
                  </NButton>
                  <span class="font-size-display">{{ editorOptions.fontSize }}px</span>
                  <NButton size="small" tertiary @click="changeFontSize(1)">
                    <template #icon>
                      <n-icon>
                        <svg viewBox="0 0 24 24">
                          <path fill="currentColor" d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                        </svg>
                      </n-icon>
                    </template>
                  </NButton>
                </div>
              </div>
              <!-- Monaco Editor -->
              <div class="editor-wrapper">
                <MonacoEditor ref="editorRef" v-model:value="formModel.script_content" :options="editorOptions"
                  language="lua" height="300" class="custom-monaco-editor" />
              </div>
            </div>
          </NFormItemGridItem>
        </NGrid>

        <NAlert type="info" class="mt-8px mb-16px" :show-icon="true">
          <template #header>{{ $t('dataForwarding.scriptHint') }}</template>
          <div class="text-12px opacity-80 leading-relaxed">
            <p>• {{ $t('dataForwarding.scriptHintContent1') }}</p>
            <p>• {{ $t('dataForwarding.scriptHintContent2') }}</p>
            <p>• {{ $t('dataForwarding.scriptHintContent3') }}</p>
            <p>• {{ $t('dataForwarding.scriptHintContent4') }}</p>
          </div>
        </NAlert>

        <NSpace class="w-full pt-16px" :size="24" justify="end">
          <NButton @click="closeModal">{{ $t('common.cancel') }}</NButton>
          <NButton type="primary" :loading="loading" @click="handleSubmit">
            {{ $t('common.confirm') }}
          </NButton>
        </NSpace>
      </NForm>
    </NSpin>
  </NModal>
</template>

<style scoped>
/* 编辑器容器样式 */
.editor-container {
  width: 100%;
  border: 1px solid #e0e0e6;
  border-radius: 6px;
  overflow: hidden;
  background: #fff;
}

.editor-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #f8f9fa;
  border-bottom: 1px solid #e0e0e6;
  min-height: 40px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.font-size-display {
  font-size: 12px;
  color: #666;
  min-width: 35px;
  text-align: center;
}

.editor-wrapper {
  position: relative;
  background: #fff;
  width: 100%;
}

.custom-monaco-editor {
  border: none !important;
  width: 100% !important;
}

/* 编辑器工具栏按钮样式优化 */
.editor-toolbar .n-button {
  height: 28px;
  padding: 0 8px;
  font-size: 12px;
}

.editor-toolbar .n-button .n-icon {
  font-size: 14px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .editor-toolbar {
    flex-direction: column;
    gap: 8px;
    padding: 12px;
  }

  .toolbar-left,
  .toolbar-right {
    width: 100%;
    justify-content: center;
  }
}
</style>
