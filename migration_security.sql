-- =========================================================================
-- SCRIPT DE SEGURANÇA E POLÍTICAS DE BANCO DE DADOS (RLS) - DO MESTRE
-- =========================================================================
-- Instruções: Copie todo o código abaixo, acesse o painel do Supabase,
-- vá em "SQL Editor", crie uma nova query, cole o código e clique em "Run".

-- -------------------------------------------------------------------------
-- 1. HABILITAR ROW LEVEL SECURITY (RLS) EM TODAS AS TABELAS
-- Por padrão, sem RLS, qualquer pessoa com a anon_key pode ler/escrever.
-- Habilitar RLS bloqueia o acesso não autorizado por padrão.
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
-- 2. FUNÇÃO AUXILIAR PARA CHECAR CARGO DO USUÁRIO CONECTADO
-- Retorna se o usuário atual é administrador, gestor ou supervisor.
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

-- Qualquer usuário autenticado pode ler cargos de usuários (necessário para login/verificação)
CREATE POLICY "Permitir leitura de usuários para autenticados" 
ON public.usuarios FOR SELECT 
TO authenticated 
USING (true);

-- Apenas administradores/gestores podem modificar usuários
CREATE POLICY "Permitir escrita de usuários para administradores" 
ON public.usuarios FOR ALL 
TO authenticated 
USING (public.check_user_is_manager())
WITH CHECK (public.check_user_is_manager());

-- -------------------------------------------------------------------------
-- 4. POLÍTICAS PARA A TABELA: profiles
-- -------------------------------------------------------------------------

-- Todos os usuários autenticados podem ver perfis
CREATE POLICY "Permitir leitura de perfis para autenticados" 
ON public.profiles FOR SELECT 
TO authenticated 
USING (true);

-- O próprio usuário pode atualizar o seu perfil, ou administradores
CREATE POLICY "Permitir escrita de perfis para donos ou administradores" 
ON public.profiles FOR ALL 
TO authenticated 
USING (auth.uid() = id OR public.check_user_is_manager())
WITH CHECK (auth.uid() = id OR public.check_user_is_manager());

-- -------------------------------------------------------------------------
-- 5. POLÍTICAS PARA A TABELA: user_roles
-- -------------------------------------------------------------------------

CREATE POLICY "Permitir leitura de papéis para autenticados" 
ON public.user_roles FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Permitir escrita de papéis para administradores" 
ON public.user_roles FOR ALL 
TO authenticated 
USING (public.check_user_is_manager())
WITH CHECK (public.check_user_is_manager());

-- -------------------------------------------------------------------------
-- 6. POLÍTICAS PARA A TABELA: empresas
-- -------------------------------------------------------------------------

-- Apenas administradores e gestores visualizam ou editam empresas
CREATE POLICY "Acesso completo a empresas para administradores" 
ON public.empresas FOR ALL 
TO authenticated 
USING (public.check_user_is_manager())
WITH CHECK (public.check_user_is_manager());

-- -------------------------------------------------------------------------
-- 7. POLÍTICAS PARA A TABELA: relatorios_avarias E relatorios_visitas
-- -------------------------------------------------------------------------

CREATE POLICY "Acesso a relatorios_avarias para administradores" 
ON public.relatorios_avarias FOR ALL 
TO authenticated 
USING (public.check_user_is_manager())
WITH CHECK (public.check_user_is_manager());

CREATE POLICY "Acesso a relatorios_visitas para administradores" 
ON public.relatorios_visitas FOR ALL 
TO authenticated 
USING (public.check_user_is_manager())
WITH CHECK (public.check_user_is_manager());

-- -------------------------------------------------------------------------
-- 8. POLÍTICAS PARA A TABELA: notificacoes
-- -------------------------------------------------------------------------

-- Qualquer usuário conectado pode ler notificações
CREATE POLICY "Permitir leitura de notificações para autenticados" 
ON public.notificacoes FOR SELECT 
TO authenticated 
USING (true);

-- Qualquer usuário conectado pode inserir notificações (como o log de envio)
CREATE POLICY "Permitir inserção de notificações para autenticados" 
ON public.notificacoes FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Apenas administradores podem atualizar ou apagar notificações
CREATE POLICY "Permitir atualização/exclusão para administradores" 
ON public.notificacoes FOR UPDATE 
TO authenticated 
USING (public.check_user_is_manager())
WITH CHECK (public.check_user_is_manager());

-- -------------------------------------------------------------------------
-- 9. POLÍTICAS PARA A TABELA: logs_acesso
-- -------------------------------------------------------------------------

-- Todos podem gravar logs
CREATE POLICY "Permitir gravação de logs" 
ON public.logs_acesso FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Apenas administradores podem visualizar ou gerenciar logs
CREATE POLICY "Permitir leitura/escrita de logs para administradores" 
ON public.logs_acesso FOR ALL 
TO authenticated 
USING (public.check_user_is_manager())
WITH CHECK (public.check_user_is_manager());

-- -------------------------------------------------------------------------
-- 10. POLÍTICAS PARA A TABELA: solicitacoes_brindes
-- -------------------------------------------------------------------------

-- Vendedores podem visualizar, criar e gerenciar suas próprias solicitações de brindes
CREATE POLICY "Vendedores gerenciam seus próprios brindes" 
ON public.solicitacoes_brindes FOR ALL 
TO authenticated 
USING (auth.uid() = user_id OR public.check_user_is_manager())
WITH CHECK (auth.uid() = user_id OR public.check_user_is_manager());
