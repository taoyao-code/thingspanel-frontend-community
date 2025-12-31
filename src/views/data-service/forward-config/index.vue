<script setup lang="tsx">
import { reactive, ref, onMounted, computed } from 'vue'
import { NButton, NPopconfirm, NSpace } from 'naive-ui'
import type { DataTableColumns, PaginationProps } from 'naive-ui'
import { $t } from '@/locales'
import { formatDateTime } from '@/utils/common/datetime'
import {
  getForwardingScripts,
  deleteForwardingScript,
  type ForwardingScript
} from '@/service/api/data-forwarding'
import ScriptModal from './components/script-modal.vue'
import ScriptTestModal from './components/script-test-modal.vue'
import { useBoolean, useLoading } from '~/packages/hooks'

const { loading, startLoading, endLoading } = useLoading(false)
const { bool: visible, setTrue: openModal } = useBoolean()
const { bool: testVisible, setTrue: openTestModal } = useBoolean()

const queryParams = reactive({
  name: ''
})

const tableData = ref<ForwardingScript[]>([])
const modalType = ref<'add' | 'edit'>('add')
const editData = ref<ForwardingScript | null>(null)
const testScript = ref<ForwardingScript | null>(null)

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
    const { data, error } = await getForwardingScripts({
      page: pagination.page as number,
      page_size: pagination.pageSize as number,
      name: queryParams.name || undefined
    })
    if (!error && data) {
      tableData.value = data.list || []
      pagination.itemCount = data.total || 0
    }
  } finally {
    endLoading()
  }
}

function handleAddScript() {
  modalType.value = 'add'
  editData.value = null
  openModal()
}

function handleEditScript(row: ForwardingScript) {
  modalType.value = 'edit'
  editData.value = row
  openModal()
}

function handleTestScript(row: ForwardingScript) {
  testScript.value = row
  openTestModal()
}

async function handleDeleteScript(id: string) {
  const { error } = await deleteForwardingScript(id)
  if (!error) {
    window.$message?.success($t('common.deleteSuccess'))
    getTableData()
  }
}

function handleQuery() {
  pagination.page = 1
  getTableData()
}

function handleReset() {
  queryParams.name = ''
  pagination.page = 1
  getTableData()
}

const columns = computed<DataTableColumns<ForwardingScript>>(() => [
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
    title: $t('dataForwarding.scriptName'),
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
    key: 'script_content',
    title: $t('dataForwarding.scriptContent'),
    align: 'left',
    minWidth: 300,
    ellipsis: {
      tooltip: true
    },
    render: row => {
      const content = row.script_content || ''
      return content.length > 100 ? content.substring(0, 100) + '...' : content
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
    width: 250,
    render: row => {
      return (
        <NSpace justify={'center'}>
          <NButton size={'small'} type="info" onClick={() => handleTestScript(row)}>
            {$t('dataForwarding.testScript')}
          </NButton>
          <NButton size={'small'} type="primary" onClick={() => handleEditScript(row)}>
            {$t('common.edit')}
          </NButton>
          <NPopconfirm onPositiveClick={() => handleDeleteScript(row.id!)}>
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
    <NCard :title="$t('dataForwarding.scriptManagement')" :bordered="false" class="h-full rounded-8px shadow-sm">
      <template #header-extra>
        <NButton type="primary" @click="handleAddScript">
          {{ $t('common.add') }}
        </NButton>
      </template>
      <div class="h-full flex-col">
        <NForm ref="queryFormRef" inline label-placement="left" :model="queryParams">
          <NFormItem :label="$t('dataForwarding.scriptName')" path="name">
            <NInput v-model:value="queryParams.name" :placeholder="$t('common.inputPlaceholder')" clearable />
          </NFormItem>
          <NFormItem>
            <NSpace>
              <NButton type="primary" @click="handleQuery">{{ $t('common.search') }}</NButton>
              <NButton @click="handleReset">{{ $t('common.reset') }}</NButton>
            </NSpace>
          </NFormItem>
        </NForm>
        <NDataTable :scroll-x="1000" :columns="columns" :data="tableData" :loading="loading" :pagination="pagination"
          :remote="true" class="flex-1-hidden">
        </NDataTable>
      </div>
    </NCard>
    <ScriptModal v-model:visible="visible" :type="modalType" :edit-data="editData" @success="getTableData" />
    <ScriptTestModal v-model:visible="testVisible" :script="testScript" />
  </div>
</template>

<style scoped></style>
