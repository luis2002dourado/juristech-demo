/* ===================================================================
   JurisTech — Camada de comunicação com o backend.
   Bloco: FRONT / API
   Responsabilidades: token, erros amigáveis, sessão expirada.
   =================================================================== */

const API = (() => {
  const CHAVE = 'juristech.sessao';

  function sessao() {
    try { return JSON.parse(localStorage.getItem(CHAVE) || 'null'); }
    catch { return null; }
  }
  function salvarSessao(s) { localStorage.setItem(CHAVE, JSON.stringify(s)); }
  function limparSessao() { localStorage.removeItem(CHAVE); }

  async function req(metodo, rota, corpo, opcoes = {}) {
    const s = sessao();
    const cab = {};
    if (s?.token) cab['Authorization'] = 'Bearer ' + s.token;

    let body;
    if (corpo instanceof FormData) {
      body = corpo;                       // o browser define o Content-Type
    } else if (corpo !== undefined) {
      cab['Content-Type'] = 'application/json';
      body = JSON.stringify(corpo);
    }

    let resp;
    try {
      resp = await fetch(rota, { method: metodo, headers: cab, body });
    } catch {
      throw new Error('Não foi possível falar com o servidor. Verifique se o sistema está em execução.');
    }

    if (resp.status === 401 && !rota.includes('/login')) {
      limparSessao();
      document.dispatchEvent(new CustomEvent('sessao-expirada'));
      throw new Error('Sua sessão expirou. Entre novamente.');
    }

    if (opcoes.bruto) return resp;

    let dados = null;
    const tipo = resp.headers.get('content-type') || '';
    if (tipo.includes('application/json')) {
      try { dados = await resp.json(); } catch { dados = null; }
    }

    if (!resp.ok) {
      let msg = dados?.detail || `Erro ${resp.status}`;
      if (Array.isArray(dados?.campos) && dados.campos.length) {
        msg += '\n• ' + dados.campos.map(c => `${c.campo}: ${c.problema}`).join('\n• ');
      }
      const erro = new Error(msg);
      erro.status = resp.status;
      erro.campos = dados?.campos;
      throw erro;
    }
    return dados;
  }

  const get  = (r)    => req('GET', r);
  const post = (r, c) => req('POST', r, c);
  const put  = (r, c) => req('PUT', r, c);
  const patch= (r, c) => req('PATCH', r, c);
  const del  = (r)    => req('DELETE', r);

  return {
    sessao, salvarSessao, limparSessao, req, get, post, put, patch, del,

    // ---- Autenticação
    login: (email, senha, codigo_mfa) => post('/api/auth/login', { email, senha, codigo_mfa }),
    eu: () => get('/api/auth/eu'),
    trocarSenha: (senha_atual, senha_nova) => post('/api/auth/trocar-senha', { senha_atual, senha_nova }),

    // ---- Usuários
    usuarios: () => get('/api/usuarios'),
    criarUsuario: (d) => post('/api/usuarios', d),
    alternarUsuario: (id) => patch(`/api/usuarios/${id}/ativo`),

    // ---- Clientes
    clientes: (q = '') => get('/api/clientes' + (q ? `?busca=${encodeURIComponent(q)}` : '')),
    cliente: (id) => get(`/api/clientes/${id}`),
    criarCliente: (d) => post('/api/clientes', d),
    editarCliente: (id, d) => put(`/api/clientes/${id}`, d),
    excluirCliente: (id) => del(`/api/clientes/${id}`),

    // ---- Leads
    leads: (etapa = '') => get('/api/leads' + (etapa ? `?etapa=${encodeURIComponent(etapa)}` : '')),
    funil: () => get('/api/leads/funil'),
    criarLead: (d) => post('/api/leads', d),
    moverLead: (id, etapa, motivo_perda) => patch(`/api/leads/${id}/etapa`, { etapa, motivo_perda }),
    excluirLead: (id) => del(`/api/leads/${id}`),

    // ---- Interações
    interacoes: (p = '') => get('/api/interacoes' + p),
    criarInteracao: (d) => post('/api/interacoes', d),

    // ---- Processos
    processos: (p = '') => get('/api/processos' + p),
    processo: (id) => get(`/api/processos/${id}`),
    criarProcesso: (d) => post('/api/processos', d),
    editarProcesso: (id, d) => put(`/api/processos/${id}`, d),
    excluirProcesso: (id) => del(`/api/processos/${id}`),
    sincronizar: (id) => post(`/api/processos/${id}/sincronizar`),
    tribunais: () => get('/api/processos/consulta/tribunais'),
    consultarCNJ: (n, t) => get(`/api/processos/consulta/cnj?numero=${encodeURIComponent(n)}${t ? '&tribunal=' + t : ''}`),
    importarCNJ: (n, cid, t) => post(`/api/processos/importar-cnj?numero=${encodeURIComponent(n)}&cliente_id=${cid}${t ? '&tribunal=' + t : ''}`),

    // ---- Atividades
    atividades: (p = '') => get('/api/atividades' + p),
    agenda: (dias = 14) => get(`/api/atividades/agenda?dias=${dias}`),
    criarAtividade: (d) => post('/api/atividades', d),
    editarAtividade: (id, d) => put(`/api/atividades/${id}`, d),
    excluirAtividade: (id) => del(`/api/atividades/${id}`),
    iniciarAtividade: (id) => post(`/api/atividades/${id}/iniciar`),
    pararAtividade: (id) => post(`/api/atividades/${id}/parar`),

    // ---- Financeiro
    financeiro: (p = '') => get('/api/financeiro' + p),
    resumoFinanceiro: () => get('/api/financeiro/resumo'),
    criarLancamento: (d) => post('/api/financeiro', d),
    editarLancamento: (id, d) => put(`/api/financeiro/${id}`, d),
    baixarLancamento: (id, forma) => post(`/api/financeiro/${id}/baixar?forma_pagamento=${encodeURIComponent(forma)}`),
    excluirLancamento: (id) => del(`/api/financeiro/${id}`),
    verificarAtrasos: () => post('/api/financeiro/verificar-atrasos'),

    // ---- Documentos
    documentos: (p = '') => get('/api/documentos' + p),
    enviarDocumento: (fd) => req('POST', '/api/documentos', fd),
    excluirDocumento: (id) => del(`/api/documentos/${id}`),

    // ---- Dashboard
    dashboard: () => get('/api/dashboard/geral'),
    produtividade: (dias = 30) => get(`/api/dashboard/produtividade?dias=${dias}`),
    rentabilidade: () => get('/api/dashboard/rentabilidade'),
    urlExportar: (e) => `/api/dashboard/exportar/${e}`,

    // ---- Notificações
    notificacoes: () => get('/api/notificacoes'),
    lerNotificacao: (id) => patch(`/api/notificacoes/${id}/lida`),
    lerTodas: () => post('/api/notificacoes/ler-todas'),

    // ---- MFA (dois fatores)
    mfaStatus: () => get('/api/mfa/status'),
    mfaIniciar: () => post('/api/mfa/iniciar'),
    mfaConfirmar: (codigo) => post('/api/mfa/confirmar', { codigo }),
    mfaDesativar: (senha) => post('/api/mfa/desativar', { senha }),
    mfaRegenerar: (senha) => post('/api/mfa/regenerar-codigos', { senha }),

    // ---- Licença
    licenca: () => get('/api/licenca'),
    ativarLicenca: (d) => post('/api/licenca/ativar', d),
    planos: () => get('/api/licenca/planos'),

    // ---- Backup
    backups: () => get('/api/backup'),
    criarBackup: () => post('/api/backup'),
    excluirBackup: (id) => del(`/api/backup/${id}`),
    limparBackups: (dias) => post(`/api/backup/limpar?dias=${dias}`),
    urlBackup: (id) => `/api/backup/${id}/baixar`,

    // ---- Auditoria
    auditoria: (filtro = '') => get('/api/auditoria?limite=300' + (filtro ? `&filtro=${encodeURIComponent(filtro)}` : '')),
    permissoes: () => get('/api/permissoes'),
  };
})();
