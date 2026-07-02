-- =========================================================================
-- SCRIPT DE SEGURANÇA E POLÍTICAS (RLS) - COMPARTILHADO (IDEMPOTENTE)
-- =========================================================================
-- Instruções: Copie todo o código abaixo, acesse o painel do Supabase,
-- vá em "SQL Editor", crie uma nova query, cole o código e clique em "Run".

-- -------------------------------------------------------------------------
-- 1. HABILITAR ROW LEVEL SECURITY (RLS) EM TODAS AS TABELAS
-- -------------------------------------------------------------------------

ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs_acesso ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relatorios_avarias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.relatorios_visitas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solicitacoes_brindes ENABLE ROW LEVEL SECURITY;

-- -------------------------------------------------------------------------
-- 2. FUNÇÃO AUXILIAR PARA CHECAR SE O USUÁRIO É GESTOR
-- -------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.check_user_is_manager()
RETURNS boolean SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.usuarios
    WHERE id = auth.uid() 
      AND cargo IN ('admin', 'gestor', 'sup_tecnico')
      AND status = 'ativo'
  );
END;
$$ LANGUAGE plpgsql;

-- -------------------------------------------------------------------------
-- 3. POLÍTICAS PARA A TABELA: usuarios
-- -------------------------------------------------------------------------

DROP POLICY IF EXISTS "Permitir leitura de usuários para autenticados" ON public.usuarios;
CREATE POLICY "Permitir leitura de usuários para autenticados" 
ON public.usuarios FOR SELECT 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Permitir inserção e atualização pelo próprio ou gestores" ON public.usuarios;
CREATE POLICY "Permitir inserção e atualização pelo próprio ou gestores" 
ON public.usuarios FOR ALL 
TO authenticated 
USING (auth.uid() = id OR public.check_user_is_manager())
WITH CHECK (auth.uid() = id OR public.check_user_is_manager());

-- -------------------------------------------------------------------------
-- 4. POLÍTICAS PARA A TABELA: profiles
-- -------------------------------------------------------------------------

DROP POLICY IF EXISTS "Permitir leitura de perfis pública" ON public.profiles;
CREATE POLICY "Permitir leitura de perfis pública" 
ON public.profiles FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Permitir criação de perfil pública" ON public.profiles;
CREATE POLICY "Permitir criação de perfil pública" 
ON public.profiles FOR INSERT 
WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir atualização de perfil pelo dono ou gestores" ON public.profiles;
CREATE POLICY "Permitir atualização de perfil pelo dono ou gestores" 
ON public.profiles FOR UPDATE 
TO authenticated 
USING (auth.uid() = id OR public.check_user_is_manager())
WITH CHECK (auth.uid() = id OR public.check_user_is_manager());

-- -------------------------------------------------------------------------
-- 5. POLÍTICAS PARA A TABELA: user_roles
-- -------------------------------------------------------------------------

DROP POLICY IF EXISTS "Permitir leitura de papéis para autenticados" ON public.user_roles;
CREATE POLICY "Permitir leitura de papéis para autenticados" 
ON public.user_roles FOR SELECT 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Permitir escrita de papéis para administradores" ON public.user_roles;
CREATE POLICY "Permitir escrita de papéis para administradores" 
ON public.user_roles FOR ALL 
TO authenticated 
USING (public.check_user_is_manager())
WITH CHECK (public.check_user_is_manager());

-- -------------------------------------------------------------------------
-- 6. POLÍTICAS PARA A TABELA: empresas
-- -------------------------------------------------------------------------

DROP POLICY IF EXISTS "Permitir leitura pública de empresas" ON public.empresas;
CREATE POLICY "Permitir leitura pública de empresas" 
ON public.empresas FOR SELECT 
USING (true);

DROP POLICY IF EXISTS "Permitir escrita de empresas apenas para gestores" ON public.empresas;
CREATE POLICY "Permitir escrita de empresas apenas para gestores" 
ON public.empresas FOR ALL 
TO authenticated 
USING (public.check_user_is_manager())
WITH CHECK (public.check_user_is_manager());

-- -------------------------------------------------------------------------
-- 7. POLÍTICAS PARA A TABELA: relatorios_avarias E relatorios_visitas
-- -------------------------------------------------------------------------

DROP POLICY IF EXISTS "Permitir leitura de avarias para autenticados" ON public.relatorios_avarias;
CREATE POLICY "Permitir leitura de avarias para autenticados" 
ON public.relatorios_avarias FOR SELECT 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Permitir inserção de avarias para autenticados" ON public.relatorios_avarias;
CREATE POLICY "Permitir inserção de avarias para autenticados" 
ON public.relatorios_avarias FOR INSERT 
TO authenticated 
WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir modificação de avarias apenas para gestores" ON public.relatorios_avarias;
CREATE POLICY "Permitir modificação de avarias apenas para gestores" 
ON public.relatorios_avarias FOR ALL 
TO authenticated 
USING (public.check_user_is_manager())
WITH CHECK (public.check_user_is_manager());

DROP POLICY IF EXISTS "Permitir leitura de visitas para autenticados" ON public.relatorios_visitas;
CREATE POLICY "Permitir leitura de visitas para autenticados" 
ON public.relatorios_visitas FOR SELECT 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Permitir inserção de visitas para autenticados" ON public.relatorios_visitas;
CREATE POLICY "Permitir inserção de visitas para autenticados" 
ON public.relatorios_visitas FOR INSERT 
TO authenticated 
WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir modificação de visitas apenas para gestores" ON public.relatorios_visitas;
CREATE POLICY "Permitir modificação de visitas apenas para gestores" 
ON public.relatorios_visitas FOR ALL 
TO authenticated 
USING (public.check_user_is_manager())
WITH CHECK (public.check_user_is_manager());

-- -------------------------------------------------------------------------
-- 8. POLÍTICAS PARA A TABELA: notificacoes
-- -------------------------------------------------------------------------

DROP POLICY IF EXISTS "Permitir leitura de notificações para autenticados" ON public.notificacoes;
CREATE POLICY "Permitir leitura de notificações para autenticados" 
ON public.notificacoes FOR SELECT 
TO authenticated 
USING (true);

DROP POLICY IF EXISTS "Permitir inserção de notificações para autenticados" ON public.notificacoes;
CREATE POLICY "Permitir inserção de notificações para autenticados" 
ON public.notificacoes FOR INSERT 
TO authenticated 
WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir modificação de notificações apenas para gestores" ON public.notificacoes;
CREATE POLICY "Permitir modificação de notificações apenas para gestores" 
ON public.notificacoes FOR ALL 
TO authenticated 
USING (public.check_user_is_manager())
WITH CHECK (public.check_user_is_manager());

-- -------------------------------------------------------------------------
-- 9. POLÍTICAS PARA A TABELA: logs_acesso
-- -------------------------------------------------------------------------

DROP POLICY IF EXISTS "Permitir gravação de logs para autenticados" ON public.logs_acesso;
CREATE POLICY "Permitir gravação de logs para autenticados" 
ON public.logs_acesso FOR INSERT 
TO authenticated 
WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir gerenciamento de logs apenas para gestores" ON public.logs_acesso;
CREATE POLICY "Permitir gerenciamento de logs apenas para gestores" 
ON public.logs_acesso FOR ALL 
TO authenticated 
USING (public.check_user_is_manager())
WITH CHECK (public.check_user_is_manager());

-- -------------------------------------------------------------------------
-- 10. POLÍTICAS PARA A TABELA: solicitacoes_brindes
-- -------------------------------------------------------------------------

DROP POLICY IF EXISTS "Vendedores gerenciam seus próprios brindes" ON public.solicitacoes_brindes;
CREATE POLICY "Vendedores gerenciam seus próprios brindes" 
ON public.solicitacoes_brindes FOR ALL 
TO authenticated 
USING (auth.uid() = user_id OR public.check_user_is_manager())
WITH CHECK (auth.uid() = user_id OR public.check_user_is_manager());
