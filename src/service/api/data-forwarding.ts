/**
 * 数据转发 API
 * Data Forwarding API
 */
import { request } from '../request'

// ==================== 类型定义 ====================

/** 数据源类型 */
export enum SourceType {
  /** 设备 */
  Device = 1,
  /** 产品 */
  Product = 2,
  /** 分组 */
  Group = 3
}

/** 目标类型 */
export type TargetType = 'http' | 'mqtt'

/** 数据源 */
export interface ForwardingSource {
  id?: string
  rule_id?: string
  source_type: SourceType
  source_id: string
}

/** 转发目标 */
export interface ForwardingTarget {
  id?: string
  rule_id?: string
  target_type: TargetType
  config: string
}

/** HTTP 目标配置 */
export interface HTTPTargetConfig {
  url: string
  method?: 'POST' | 'PUT' | 'GET'
  headers?: Record<string, string>
  secret?: string
  timeout?: number
}

/** MQTT 目标配置 */
export interface MQTTTargetConfig {
  broker: string
  port?: number
  topic: string
  username?: string
  password?: string
  client_id?: string
  qos?: 0 | 1 | 2
  version?: string
}

/** 转发规则 */
export interface ForwardingRule {
  id?: string
  name: string
  description?: string
  enabled?: number
  script_id?: string
  script_name?: string
  remark?: string
  tenant_id?: string
  created_at?: string
  updated_at?: string
  sources?: ForwardingSource[]
  targets?: ForwardingTarget[]
}

/** 转发脚本 */
export interface ForwardingScript {
  id?: string
  name: string
  script_content: string
  description?: string
  enabled?: number
  remark?: string
  tenant_id?: string
  created_at?: string
  updated_at?: string
}

/** 分页查询参数 */
export interface PaginationParams {
  page: number
  page_size: number
}

/** 规则列表查询参数 */
export interface RuleListParams extends PaginationParams {
  name?: string
  enabled?: number
}

/** 脚本列表查询参数 */
export interface ScriptListParams extends PaginationParams {
  name?: string
}

/** 规则状态更新参数 */
export interface RuleStatusParams {
  id: string
  enabled: number
}

/** 脚本测试参数 */
export interface ScriptTestParams {
  script_content: string
  test_data: string
}

/** 脚本测试结果 */
export interface ScriptTestResult {
  success: boolean
  output: string
  error: string
}

/** 分页响应 */
export interface PaginatedResponse<T> {
  list: T[]
  total: number
}

// ==================== 转发规则 API ====================

/** 获取转发规则列表 */
export const getForwardingRules = async (params: RuleListParams) => {
  return await request.get<PaginatedResponse<ForwardingRule>>('/data_forwarding/rules', { params })
}

/** 获取转发规则详情 */
export const getForwardingRuleDetail = async (id: string) => {
  return await request.get<ForwardingRule>(`/data_forwarding/rules/${id}`)
}

/** 创建转发规则 */
export const createForwardingRule = async (data: ForwardingRule) => {
  return await request.post<ForwardingRule>('/data_forwarding/rules', data)
}

/** 更新转发规则 */
export const updateForwardingRule = async (data: ForwardingRule) => {
  return await request.put<ForwardingRule>('/data_forwarding/rules', data)
}

/** 更新转发规则状态 */
export const updateForwardingRuleStatus = async (params: RuleStatusParams) => {
  return await request.put<any>('/data_forwarding/rules/status', params)
}

/** 删除转发规则 */
export const deleteForwardingRule = async (id: string) => {
  return await request.delete<any>(`/data_forwarding/rules/${id}`)
}

// ==================== 转发脚本 API ====================

/** 获取转发脚本列表 */
export const getForwardingScripts = async (params: ScriptListParams) => {
  return await request.get<PaginatedResponse<ForwardingScript>>('/data_forwarding/scripts', { params })
}

/** 获取所有转发脚本（下拉选择用） */
export const getAllForwardingScripts = async () => {
  return await request.get<ForwardingScript[]>('/data_forwarding/scripts/all')
}

/** 获取转发脚本详情 */
export const getForwardingScriptDetail = async (id: string) => {
  return await request.get<ForwardingScript>(`/data_forwarding/scripts/${id}`)
}

/** 创建转发脚本 */
export const createForwardingScript = async (data: ForwardingScript) => {
  return await request.post<ForwardingScript>('/data_forwarding/scripts', data)
}

/** 更新转发脚本 */
export const updateForwardingScript = async (data: ForwardingScript) => {
  return await request.put<ForwardingScript>('/data_forwarding/scripts', data)
}

/** 删除转发脚本 */
export const deleteForwardingScript = async (id: string) => {
  return await request.delete<any>(`/data_forwarding/scripts/${id}`)
}

/** 测试脚本 */
export const testForwardingScript = async (params: ScriptTestParams) => {
  return await request.post<ScriptTestResult>('/data_forwarding/scripts/test', params)
}
