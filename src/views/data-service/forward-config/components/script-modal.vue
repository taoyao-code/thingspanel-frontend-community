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
const editorOptions = {
  automaticLayout: true,
  theme: 'vs', // 或 'vs-dark'，根据系统主题调整？这里先用浅色/默认
  language: 'lua',
  fontSize: 14,
  fontFamily: 'Consolas, "Courier New", monospace',
  wordWrap: 'on',
  lineNumbers: 'on',
  minimap: {
    enabled: true
  },
  scrollBeyondLastLine: false,
  formatOnPaste: true,
  formatOnType: true
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
            <div class="h-300px w-full border border-gray-200 rounded-4px overflow-hidden">
              <MonacoEditor v-model:value="formModel.script_content" :options="editorOptions" language="lua"
                height="300" />
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

<style scoped></style>
