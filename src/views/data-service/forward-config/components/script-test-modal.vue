<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import MonacoEditor from 'monaco-editor-vue3'
import { $t } from '@/locales'
import {
  testForwardingScript,
  type ForwardingScript,
  type ScriptTestResult
} from '@/service/api/data-forwarding'
import SvgIcon from '@/components/custom/svg-icon.vue'

export interface Props {
  visible: boolean
  script?: ForwardingScript | null
}

const props = withDefaults(defineProps<Props>(), {
  script: null
})

interface Emits {
  'update:visible': [visible: boolean]
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

const loading = ref(false)
const testResult = ref<ScriptTestResult | null>(null)

const formModel = reactive({
  script_content: '',
  test_data: defaultTestData()
})

// Monaco Editor 基本配置
const baseEditorOptions = {
  automaticLayout: true,
  theme: 'vs',
  fontSize: 12,
  fontFamily: 'Consolas, "Courier New", monospace',
  wordWrap: 'on',
  lineNumbers: 'on',
  minimap: {
    enabled: false
  },
  scrollBeyondLastLine: false,
  formatOnPaste: true,
  formatOnType: true
}

const scriptEditorOptions = {
  ...baseEditorOptions,
  language: 'lua'
}

const jsonEditorOptions = {
  ...baseEditorOptions,
  language: 'json'
}

const resultEditorOptions = {
  ...baseEditorOptions,
  language: 'json',
  readOnly: true,
  theme: 'vs-dark' // 结果显示使用深色主题
}

function defaultTestData(): string {
  return JSON.stringify(
    {
      device_id: 'test-device-001',
      device_name: '测试设备',
      product_id: 'test-product-001',
      tenant_id: 'test-tenant-001',
      timestamp: Date.now(),
      data: {
        temperature: 25.5,
        humidity: 60
      }
    },
    null,
    2
  )
}

async function handleTest() {
  if (!formModel.script_content) {
    window.$message?.warning($t('dataForwarding.scriptRequired'))
    return
  }

  loading.value = true
  testResult.value = null

  try {
    const { data, error } = await testForwardingScript({
      script_content: formModel.script_content,
      test_data: formModel.test_data
    })

    if (!error && data) {
      testResult.value = data
      if (data.success) {
        window.$message?.success($t('dataForwarding.testSuccess'))
      } else {
        window.$message?.error($t('dataForwarding.testFailed'))
      }
    }
  } finally {
    loading.value = false
  }
}

function formatJson(jsonStr: string) {
  try {
    return JSON.stringify(JSON.parse(jsonStr), null, 2)
  } catch {
    return jsonStr
  }
}

watch(
  () => props.visible,
  newValue => {
    if (newValue) {
      testResult.value = null
      formModel.script_content = props.script?.script_content || ''
      formModel.test_data = defaultTestData()
    }
  }
)
</script>

<template>
  <NModal v-model:show="modalVisible" preset="card" :title="$t('dataForwarding.testScript')" class="w-1200px"
    :mask-closable="false">
    <div class="flex gap-20px h-650px">
      <!-- 左侧：脚本和测试数据 -->
      <div class="w-600px flex flex-col gap-16px">
        <NCard size="small" :bordered="false" class="bg-gray-50 rounded-8px flex-1 flex flex-col">
          <template #header>
            <span class="text-14px font-bold">{{ $t('dataForwarding.scriptContent') }}</span>
          </template>
          <div class="h-300px border border-gray-200 rounded-4px overflow-hidden">
            <MonacoEditor v-model:value="formModel.script_content" :options="scriptEditorOptions" language="lua"
              height="100%" />
          </div>
        </NCard>

        <NCard size="small" :bordered="false" class="bg-gray-50 rounded-8px flex-1 flex flex-col">
          <template #header>
            <span class="text-14px font-bold">{{ $t('dataForwarding.testData') }}</span>
          </template>
          <div class="h-200px border border-gray-200 rounded-4px overflow-hidden mb-12px">
            <MonacoEditor v-model:value="formModel.test_data" :options="jsonEditorOptions" language="json"
              height="100%" />
          </div>
          <NButton type="primary" :loading="loading" block @click="handleTest">
            <template #icon>
              <i class="i-fluent:play-16-regular" />
            </template>
            {{ $t('dataForwarding.runTest') }}
          </NButton>
        </NCard>
      </div>

      <!-- 右侧：测试结果 -->
      <div class="flex-1 flex flex-col min-h-full">
        <NCard :title="$t('dataForwarding.testResult')" size="small" :bordered="false"
          class="bg-gray-100 rounded-8px h-full">
          <div v-if="testResult" class="flex flex-col gap-12px h-full">
            <NAlert :type="testResult.success ? 'success' : 'error'" :show-icon="true" class="mb-4px flex-shrink-0">
              {{
                testResult.success ? $t('dataForwarding.executeSuccess') : $t('dataForwarding.executeFailed')
              }}
            </NAlert>

            <div v-if="testResult.success && testResult.output" class="flex-1 flex flex-col min-h-0">
              <div class="mb-8px font-bold text-13px flex items-center justify-between opacity-70">
                <span>{{ $t('dataForwarding.output') }}:</span>
                <NTag size="tiny" type="success" ghost>JSON</NTag>
              </div>
              <div class="flex-1 border border-gray-300 rounded-4px overflow-hidden">
                <MonacoEditor :value="formatJson(testResult.output)" :options="resultEditorOptions" language="json"
                  height="100%" />
              </div>
            </div>

            <div v-if="!testResult.success && testResult.error" class="flex-1 flex flex-col min-h-0">
              <div class="mb-8px font-bold text-13px text-red opacity-80">
                {{ $t('dataForwarding.error') }}:
              </div>
              <div class="flex-1 border border-red-200 rounded-4px overflow-hidden">
                <MonacoEditor :value="testResult.error" :options="resultEditorOptions" language="json" height="100%" />
              </div>
            </div>
          </div>

          <div v-else class="h-full flex-col-center py-60px opacity-40">
            <SvgIcon local-icon="empty-data" class="text-80px mb-16px" />
            <p>{{ $t('dataForwarding.noTestResult') }}</p>
          </div>
        </NCard>
      </div>
    </div>

    <NSpace class="w-full pt-20px" :size="24" justify="end">
      <NButton @click="closeModal">{{ $t('common.close') }}</NButton>
    </NSpace>
  </NModal>
</template>

<style scoped>
/* 移除之前的 n-input 样式，因为已不再使用 */
</style>
