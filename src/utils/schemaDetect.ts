import { supabase } from '../supabaseClient'

export interface SchemaFeatures {
  hasCnpj: boolean
  hasNotificacoes: boolean
  hasLogsAcesso: boolean
  hasCodigo: boolean
  hasSolicitacoesBrindes: boolean
}

let cachedFeatures: SchemaFeatures | null = null

/**
 * Detects if the custom columns/tables added by migration.sql exist in the Supabase instance.
 * Avoids crashing the app if the user hasn't run the migration yet.
 */
export async function detectSchemaFeatures(): Promise<SchemaFeatures> {
  if (cachedFeatures) return cachedFeatures

  const features: SchemaFeatures = {
    hasCnpj: false,
    hasNotificacoes: false,
    hasLogsAcesso: false,
    hasCodigo: false,
    hasSolicitacoesBrindes: false
  }

  try {
    // 1. Check if 'cnpj' exists on 'empresas' table
    const { error: cnpjErr } = await supabase
      .from('empresas')
      .select('cnpj')
      .limit(1)
    
    // In PostgreSQL: 42703 is undefined_column, 42P01 is undefined_table
    if (!cnpjErr || (cnpjErr.code !== '42703' && cnpjErr.code !== '42P01')) {
      features.hasCnpj = true
    }
  } catch (e) {
    features.hasCnpj = false
  }

  try {
    // Check if 'codigo' exists on 'empresas' table
    const { error: codigoErr } = await supabase
      .from('empresas')
      .select('codigo')
      .limit(1)
    
    if (!codigoErr || (codigoErr.code !== '42703' && codigoErr.code !== '42P01')) {
      features.hasCodigo = true
    }
  } catch (e) {
    features.hasCodigo = false
  }

  try {
    // 2. Check if 'notificacoes' table exists
    const { error: notifErr } = await supabase
      .from('notificacoes')
      .select('id')
      .limit(1)
    
    // 42P01 is undefined_table
    if (!notifErr || (notifErr.code !== '42P01' && notifErr.code !== 'PGRST116')) {
      features.hasNotificacoes = true
    }
  } catch (e) {
    features.hasNotificacoes = false
  }

  try {
    // 3. Check if 'logs_acesso' table exists
    const { error: logsErr } = await supabase
      .from('logs_acesso')
      .select('id')
      .limit(1)
    
    if (!logsErr || (logsErr.code !== '42P01' && logsErr.code !== 'PGRST116')) {
      features.hasLogsAcesso = true
    }
  } catch (e) {
    features.hasLogsAcesso = false
  }

  try {
    // 4. Check if 'solicitacoes_brindes' table exists
    const { error: brindesErr } = await supabase
      .from('solicitacoes_brindes')
      .select('id')
      .limit(1)
    
    if (!brindesErr || (brindesErr.code !== '42P01' && brindesErr.code !== 'PGRST116')) {
      features.hasSolicitacoesBrindes = true
    }
  } catch (e) {
    features.hasSolicitacoesBrindes = false
  }

  cachedFeatures = features
  return features;
}
