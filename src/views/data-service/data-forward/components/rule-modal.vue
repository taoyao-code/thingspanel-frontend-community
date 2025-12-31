<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type { FormInst, SelectOption } from 'naive-ui'
import { AddOutline as AddIcon, TrashOutline as TrashIcon } from '@vicons/ionicons5'
import { $t } from '@/locales'
import { createRequiredFormRule } from '@/utils/form/rule'
import {
  createForwardingRule,
  updateForwardingRule,
  getForwardingRuleDetail,
  getAllForwardingScripts,
  SourceType,
  type ForwardingRule,
  type ForwardingSource,
  type ForwardingTarget,
  type ForwardingScript,
  type HTTPTargetConfig,
  type MQTTTargetConfig
} from '@/service/api/data-forwarding'
import { deviceList } from '@/service/api/device'
import { deviceGroupTree } from '@/service/api/device'
import { deviceConfig } from '@/service/api/device'

export interface Props {
  visible: boolean
  type?: 'add' | 'edit'
  editData?: ForwardingRule | null
}

const props = withDefaults(defineProps<Props>(), {
  type: 'add',
  editData: null
})

interface Emits {
  'update:visible': [visible: boolean]
  success: []
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
  return props.type === 'add' ? $t('dataForwarding.addRule') : $t('dataForwarding.editRule')
})

const formRef = ref<FormInst>()
const loading = ref(false)

// 脚本选项
const scriptOptions = ref<SelectOption[]>([])

// 设备/产品/分组选项
const deviceOptions = ref<SelectOption[]>([])
const productOptions = ref<SelectOption[]>([])
const groupOptions = ref<SelectOption[]>([])

// 表单数据
interface FormModel {
  name: string
  description: string
  script_id: string | null
  remark: string
  sources: ForwardingSource[]
  targets: ForwardingTarget[]
}

const formModel = reactive<FormModel>({
  name: '',
  description: '',
  script_id: null,
  remark: '',
  sources: [],
  targets: []
})

const rules = {
  name: createRequiredFormRule($t('dataForwarding.ruleName'))
}

// 数据源类型选项
const sourceTypeOptions = [
  { label: $t('dataForwarding.sourceType.device'), value: SourceType.Device },
  { label: $t('dataForwarding.sourceType.product'), value: SourceType.Product },
  { label: $t('dataForwarding.sourceType.group'), value: SourceType.Group }
]

// 目标类型选项
const targetTypeOptions = [
  { label: 'HTTP Webhook', value: 'http' },
  { label: 'MQTT Broker', value: 'mqtt' }
]

// 当前编辑的目标配置
const currentTargetIndex = ref<number | null>(null)
const targetConfigVisible = ref(false)
const targetConfigType = ref<'http' | 'mqtt'>('http')

const httpConfig = reactive<HTTPTargetConfig>({
  url: '',
  method: 'POST',
  headers: {},
  secret: '',
  timeout: 30
})

const mqttConfig = reactive<MQTTTargetConfig>({
  broker: '',
  port: 1883,
  topic: '',
  username: '',
  password: '',
  client_id: '',
  qos: 1
})

// 添加数据源
function addSource() {
  formModel.sources.push({
    source_type: SourceType.Device,
    source_id: ''
  })
}

// 删除数据源
function removeSource(index: number) {
  formModel.sources.splice(index, 1)
}

// 添加目标
function addTarget() {
  formModel.targets.push({
    target_type: 'http',
    config: JSON.stringify({ url: '', method: 'POST', timeout: 30 })
  })
}

// 删除目标
function removeTarget(index: number) {
  formModel.targets.splice(index, 1)
}

// 编辑目标配置
function editTargetConfig(index: number) {
  const target = formModel.targets[index]
  currentTargetIndex.value = index
  targetConfigType.value = target.target_type

  try {
    const config = JSON.parse(target.config)
    if (target.target_type === 'http') {
      Object.assign(httpConfig, {
        url: config.url || '',
        method: config.method || 'POST',
        headers: config.headers || {},
        secret: config.secret || '',
        timeout: config.timeout || 30
      })
    } else {
      Object.assign(mqttConfig, {
        broker: config.broker || '',
        port: config.port || 1883,
        topic: config.topic || '',
        username: config.username || '',
        password: config.password || '',
        client_id: config.client_id || '',
        qos: config.qos ?? 1
      })
    }
  } catch {
    // ignore parse error
  }

  targetConfigVisible.value = true
}

// 保存目标配置
function saveTargetConfig() {
  if (currentTargetIndex.value === null) return

  const target = formModel.targets[currentTargetIndex.value]
  if (targetConfigType.value === 'http') {
    target.config = JSON.stringify(httpConfig)
  } else {
    target.config = JSON.stringify(mqttConfig)
  }
  target.target_type = targetConfigType.value

  targetConfigVisible.value = false
  currentTargetIndex.value = null
}

// 获取目标摘要
function getTargetSummary(target: ForwardingTarget) {
  try {
    const config = JSON.parse(target.config)
    if (target.target_type === 'http') {
      return config.url || '-'
    } else {
      return `${config.broker || '-'}${config.topic ? ` (${config.topic})` : ''}`
    }
  } catch {
    return '-'
  }
}

// 获取源ID选项
function getSourceOptions(sourceType: SourceType): SelectOption[] {
  switch (sourceType) {
    case SourceType.Device:
      return deviceOptions.value
    case SourceType.Product:
      return productOptions.value
    case SourceType.Group:
      return groupOptions.value
    default:
      return []
  }
}

// 加载选项数据
// 加载选项数据
async function loadOptions() {
  try {
    const [scriptsRes, devicesRes, productsRes, groupsRes] = await Promise.all([
      getAllForwardingScripts(),
      deviceList({ page: 1, page_size: 1000 }),
      deviceConfig({ page: 1, page_size: 1000 }),
      deviceGroupTree({})
    ])

    // 处理脚本列表
    if (scriptsRes.data) {
      scriptOptions.value = scriptsRes.data.map((item: ForwardingScript) => ({
        label: item.name,
        value: item.id
      }))
    }

    // 处理设备列表
    if (devicesRes.data?.list) {
      deviceOptions.value = devicesRes.data.list.map((item: any) => ({
        label: item.name || item.id,
        value: item.id
      }))
    }

    // 处理产品/配置列表
    if (productsRes.data?.list) {
      productOptions.value = productsRes.data.list.map((item: any) => ({
        label: item.name || item.id,
        value: item.id
      }))
    }

    // 处理分组列表
    if (groupsRes.data) {
      type GroupTreeNode = { group: { id: string; name: string }; children?: GroupTreeNode[] }
      const flattenGroups = (nodes: GroupTreeNode[], result: SelectOption[] = []) => {
        nodes.forEach(node => {
          const { group, children } = node
          if (group?.id && group?.name) {
            result.push({ label: group.name, value: group.id })
          }
          if (children?.length) {
            flattenGroups(children, result)
          }
        })
        return result
      }
      groupOptions.value = flattenGroups(
        Array.isArray(groupsRes.data) ? (groupsRes.data as GroupTreeNode[]) : [groupsRes.data as GroupTreeNode]
      )
    }
  } catch (err) {
    // console.error('Failed to load options', err)
  }
}

// 重置表单
function resetForm() {
  formModel.name = ''
  formModel.description = ''
  formModel.script_id = null
  formModel.remark = ''
  formModel.sources = []
  formModel.targets = []
}

// 加载编辑数据
async function loadEditData() {
  if (!props.editData?.id) return

  loading.value = true
  try {
    const { data } = await getForwardingRuleDetail(props.editData.id)
    if (data) {
      formModel.name = data.name || ''
      formModel.description = data.description || ''
      formModel.script_id = data.script_id || null
      formModel.remark = data.remark || ''
      formModel.sources = data.sources || []
      formModel.targets = data.targets || []
    }
  } finally {
    loading.value = false
  }
}

// 提交表单
async function handleSubmit() {
  await formRef.value?.validate()

  loading.value = true
  try {
    const submitData: ForwardingRule = {
      name: formModel.name,
      description: formModel.description,
      script_id: formModel.script_id || undefined,
      remark: formModel.remark,
      sources: formModel.sources,
      targets: formModel.targets
    }

    if (props.type === 'edit' && props.editData?.id) {
      submitData.id = props.editData.id
      const { error } = await updateForwardingRule(submitData)
      if (!error) {
        window.$message?.success($t('common.updateSuccess'))
        emit('success')
        closeModal()
      }
    } else {
      const { error } = await createForwardingRule(submitData)
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
      await loadOptions()
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
  <NModal v-model:show="modalVisible" preset="card" :title="title" class="w-800px" :mask-closable="false">
    <NSpin :show="loading">
      <NForm ref="formRef" label-placement="left" :label-width="100" :model="formModel" :rules="rules">
        <NFormItem :label="$t('dataForwarding.ruleName')" path="name">
          <NInput v-model:value="formModel.name" :placeholder="$t('common.inputPlaceholder')" />
        </NFormItem>

        <NFormItem :label="$t('common.description')">
          <NInput v-model:value="formModel.description" type="textarea" :placeholder="$t('common.inputPlaceholder')" />
        </NFormItem>

        <NFormItem :label="$t('dataForwarding.script')">
          <NSelect v-model:value="formModel.script_id" :options="scriptOptions"
            :placeholder="$t('dataForwarding.selectScript')" clearable />
        </NFormItem>

        <NFormItem :label="$t('dataForwarding.remark')">
          <NInput v-model:value="formModel.remark" :placeholder="$t('common.inputPlaceholder')" />
        </NFormItem>

        <!-- 数据源配置 -->
        <NCard :title="$t('dataForwarding.dataSources')" size="small" class="mb-16px" :bordered="false" bg-gray-50>
          <template #header-extra>
            <NButton type="primary" size="tiny" ghost @click="addSource">
              <template #icon>
                <NIcon>
                  <AddIcon />
                </NIcon>
              </template>
              {{ $t('dataForwarding.addSource') }}
            </NButton>
          </template>
          <div v-if="formModel.sources.length === 0" class="py-20px text-center text-gray-400">
            {{ $t('common.nodata') }}
          </div>
          <div v-for="(source, index) in formModel.sources" :key="index"
            class="mb-12px flex items-center gap-12px bg-white p-8px rounded-4px shadow-sm">
            <NSelect v-model:value="source.source_type" :options="sourceTypeOptions" class="w-120px"
              :placeholder="$t('dataForwarding.selectSourceType')" />
            <NSelect v-model:value="source.source_id" :options="getSourceOptions(source.source_type)" class="flex-1"
              filterable :placeholder="$t('dataForwarding.selectSource')" />
            <NButton type="error" size="small" circle ghost @click="removeSource(index)">
              <template #icon>
                <NIcon>
                  <TrashIcon />
                </NIcon>
              </template>
            </NButton>
          </div>
        </NCard>

        <!-- 目标配置 -->
        <NCard :title="$t('dataForwarding.targets')" size="small" class="mb-24px" :bordered="false" bg-gray-50>
          <template #header-extra>
            <NButton type="primary" size="tiny" ghost @click="addTarget">
              <template #icon>
                <NIcon>
                  <AddIcon />
                </NIcon>
              </template>
              {{ $t('dataForwarding.addTarget') }}
            </NButton>
          </template>
          <div v-if="formModel.targets.length === 0" class="py-20px text-center text-gray-400">
            {{ $t('common.nodata') }}
          </div>
          <div v-for="(target, index) in formModel.targets" :key="index"
            class="mb-12px flex items-center gap-12px bg-white p-8px rounded-4px shadow-sm">
            <NTag type="info" size="small" class="w-120px justify-center">{{ target.target_type.toUpperCase() }}</NTag>
            <div class="flex-1 truncate text-13px text-gray-600">
              {{ getTargetSummary(target) }}
            </div>
            <NButton type="info" size="small" ghost @click="editTargetConfig(index)">
              {{ $t('dataForwarding.configure') }}
            </NButton>
            <NButton type="error" size="small" circle ghost @click="removeTarget(index)">
              <template #icon>
                <NIcon>
                  <TrashIcon />
                </NIcon>
              </template>
            </NButton>
          </div>
        </NCard>

        <NSpace class="w-full pt-20px" :size="24" justify="end">
          <NButton @click="closeModal">{{ $t('common.cancel') }}</NButton>
          <NButton type="primary" :loading="loading" @click="handleSubmit">
            {{ $t('common.confirm') }}
          </NButton>
        </NSpace>
      </NForm>
    </NSpin>

    <!-- 目标配置弹窗 -->
    <NModal v-model:show="targetConfigVisible" preset="card" :title="$t('dataForwarding.targetConfig')" class="w-600px">
      <NForm label-placement="left" :label-width="100">
        <NFormItem :label="$t('dataForwarding.targetType')">
          <NSelect v-model:value="targetConfigType" :options="targetTypeOptions" />
        </NFormItem>

        <template v-if="targetConfigType === 'http'">
          <NFormItem label="URL" required>
            <NInput v-model:value="httpConfig.url" placeholder="https://example.com/webhook" />
          </NFormItem>
          <NFormItem :label="$t('dataForwarding.httpMethod')">
            <NSelect v-model:value="httpConfig.method" :options="[
              { label: 'POST', value: 'POST' },
              { label: 'PUT', value: 'PUT' }
            ]" />
          </NFormItem>
          <NFormItem :label="$t('dataForwarding.secret')">
            <NInput v-model:value="httpConfig.secret" :placeholder="$t('dataForwarding.secretPlaceholder')" />
          </NFormItem>
          <NFormItem :label="$t('dataForwarding.timeout')">
            <NInputNumber v-model:value="httpConfig.timeout" :min="1" :max="120" />
            <span class="ml-8px">{{ $t('common.seconds') }}</span>
          </NFormItem>
        </template>

        <template v-else>
          <NFormItem label="Broker" required>
            <NInput v-model:value="mqttConfig.broker" placeholder="mqtt.example.com" />
          </NFormItem>
          <NFormItem :label="$t('dataForwarding.port')">
            <NInputNumber v-model:value="mqttConfig.port" :min="1" :max="65535" />
          </NFormItem>
          <NFormItem label="Topic" required>
            <NInput v-model:value="mqttConfig.topic" placeholder="iot/data/forwarded" />
          </NFormItem>
          <NFormItem :label="$t('dataForwarding.username')">
            <NInput v-model:value="mqttConfig.username" />
          </NFormItem>
          <NFormItem :label="$t('dataForwarding.password')">
            <NInput v-model:value="mqttConfig.password" type="password" show-password-on="click" />
          </NFormItem>
          <NFormItem label="Client ID">
            <NInput v-model:value="mqttConfig.client_id" :placeholder="$t('dataForwarding.clientIdPlaceholder')" />
          </NFormItem>
          <NFormItem label="QoS">
            <NSelect v-model:value="mqttConfig.qos" :options="[
              { label: $t('dataForwarding.qos0'), value: 0 },
              { label: $t('dataForwarding.qos1'), value: 1 },
              { label: $t('dataForwarding.qos2'), value: 2 }
            ]" />
          </NFormItem>
        </template>

        <NSpace class="w-full pt-16px" :size="24" justify="end">
          <NButton @click="targetConfigVisible = false">{{ $t('common.cancel') }}</NButton>
          <NButton type="primary" @click="saveTargetConfig">{{ $t('common.confirm') }}</NButton>
        </NSpace>
      </NForm>
    </NModal>
  </NModal>
</template>

<style scoped></style>
