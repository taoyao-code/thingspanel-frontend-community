<script setup lang="tsx">
import { computed, reactive, ref, watch, onMounted } from 'vue'
import { NButton, NPopconfirm, NSpace, NSwitch, NTag } from 'naive-ui'
import type { DataTableColumns, PaginationProps } from 'naive-ui'
import { $t } from '@/locales'
import { formatDateTime } from '@/utils/common/datetime'
import {
  getForwardingRules,
  deleteForwardingRule,
  updateForwardingRuleStatus,
  type ForwardingRule
} from '@/service/api/data-forwarding'
import RuleModal from './components/rule-modal.vue'
import { useBoolean, useLoading } from '~/packages/hooks'

const { loading, startLoading, endLoading } = useLoading(false)
const { bool: visible, setTrue: openModal } = useBoolean()

const queryParams = reactive({
  name: '',
  enabled: null as number | null
})

const tableData = ref<ForwardingRule[]>([])
const modalType = ref<'add' | 'edit'>('add')
const editData = ref<ForwardingRule | null>(null)

const pagination: PaginationProps = reactive({
  page: 1,
  pageSize: 10,
  showSizePicker: true,
  pageSizes: [10, 15, 20, 25, 30],
  itemCount: 0,
  onChange: (page: number) => {
    pagination.page = page
    getTableData()
  },
  onUpdatePageSize: (pageSize: number) => {
    pagination.pageSize = pageSize
    pagination.page = 1
    getTableData()
  }
})

async function getTableData() {
  startLoading()
  try {
    const { data, error } = await getForwardingRules({
      page: pagination.page as number,
      page_size: pagination.pageSize as number,
      name: queryParams.name || undefined,
      enabled: queryParams.enabled ?? undefined
    })
    if (!error && data) {
      tableData.value = data.list || []
      pagination.itemCount = data.total || 0
    }
  } finally {
    endLoading()
  }
}

function handleAddRule() {
  modalType.value = 'add'
  editData.value = null
  openModal()
}

function handleEditRule(row: ForwardingRule) {
  modalType.value = 'edit'
  editData.value = row
  openModal()
}

async function handleDeleteRule(id: string) {
  const { error } = await deleteForwardingRule(id)
  if (!error) {
    window.$message?.success($t('common.deleteSuccess'))
    getTableData()
  }
}

async function handleToggleStatus(row: ForwardingRule) {
  const newStatus = row.enabled === 1 ? 0 : 1
  const { error } = await updateForwardingRuleStatus({
    id: row.id!,
    enabled: newStatus
  })
  if (!error) {
    row.enabled = newStatus
    window.$message?.success($t('common.updateSuccess'))
  }
}

function handleQuery() {
  pagination.page = 1
  getTableData()
}

function handleReset() {
  queryParams.name = ''
  queryParams.enabled = null
  pagination.page = 1
  getTableData()
}

const enabledOptions = [
  { label: $t('common.all'), value: null },
  { label: $t('common.enable'), value: 1 },
  { label: $t('common.disable'), value: 0 }
]

const columns = computed<DataTableColumns<ForwardingRule>>(() => [
  {
    key: 'index',
    title: $t('common.index'),
    align: 'center',
    width: 80,
    render: (_, index) => {
      return (pagination.page! - 1) * pagination.pageSize! + index + 1
    }
  },
  {
    key: 'name',
    title: $t('dataForwarding.ruleName'),
    align: 'left',
    minWidth: 150
  },
  {
    key: 'description',
    title: $t('common.description'),
    align: 'left',
    minWidth: 200,
    ellipsis: {
      tooltip: true
    }
  },
  {
    key: 'script_name',
    title: $t('dataForwarding.scriptName'),
    align: 'left',
    minWidth: 120,
    render: row => {
      return row.script_name || '-'
    }
  },
  {
    key: 'enabled',
    title: $t('common.status'),
    align: 'center',
    width: 100,
    render: row => {
      return (
        <NSwitch value={row.enabled === 1} onUpdateValue={() => handleToggleStatus(row)}>
          {{
            checked: () => $t('common.enable'),
            unchecked: () => $t('common.disable')
          }}
        </NSwitch>
      )
    }
  },
  {
    key: 'sources_count',
    title: $t('dataForwarding.sourcesCount'),
    align: 'center',
    width: 100,
    render: row => {
      const count = row.sources?.length || 0
      return <NTag type={count > 0 ? 'success' : 'default'}>{count}</NTag>
    }
  },
  {
    key: 'targets_count',
    title: $t('dataForwarding.targetsCount'),
    align: 'center',
    width: 100,
    render: row => {
      const count = row.targets?.length || 0
      return <NTag type={count > 0 ? 'info' : 'default'}>{count}</NTag>
    }
  },
  {
    key: 'created_at',
    title: $t('common.creationTime'),
    align: 'left',
    width: 180,
    render: row => {
      return formatDateTime(row.created_at)
    }
  },
  {
    key: 'actions',
    title: $t('common.actions'),
    align: 'center',
    width: 180,
    render: row => {
      return (
        <NSpace justify={'center'}>
          <NButton size={'small'} type="primary" onClick={() => handleEditRule(row)}>
            {$t('common.edit')}
          </NButton>
          <NPopconfirm onPositiveClick={() => handleDeleteRule(row.id!)}>
            {{
              default: () => $t('common.confirmDelete'),
              trigger: () => (
                <NButton type="error" size={'small'}>
                  {$t('common.delete')}
                </NButton>
              )
            }}
          </NPopconfirm>
        </NSpace>
      )
    }
  }
])

onMounted(() => {
  getTableData()
})
</script>

<template>
  <div>
    <NCard :title="$t('dataForwarding.ruleManagement')" :bordered="false" class="h-full rounded-8px shadow-sm">
      <template #header-extra>
        <NButton type="primary" @click="handleAddRule">
          {{ $t('common.add') }}
        </NButton>
      </template>
      <div class="h-full flex-col">
        <NForm ref="queryFormRef" inline label-placement="left" :model="queryParams">
          <NFormItem :label="$t('dataForwarding.ruleName')" path="name">
            <NInput v-model:value="queryParams.name" :placeholder="$t('common.inputPlaceholder')" clearable />
          </NFormItem>
          <NFormItem :label="$t('common.status')" path="enabled">
            <NSelect v-model:value="queryParams.enabled" clearable class="w-150px" :options="enabledOptions" />
          </NFormItem>
          <NFormItem>
            <NSpace>
              <NButton type="primary" @click="handleQuery">{{ $t('common.search') }}</NButton>
              <NButton @click="handleReset">{{ $t('common.reset') }}</NButton>
            </NSpace>
          </NFormItem>
        </NForm>
        <NDataTable :scroll-x="1200" :columns="columns" :data="tableData" :loading="loading" :pagination="pagination"
          :remote="true" class="flex-1-hidden">
        </NDataTable>
      </div>
    </NCard>
    <RuleModal v-model:visible="visible" :type="modalType" :edit-data="editData" @success="getTableData" />
  </div>
</template>

<style scoped></style>
