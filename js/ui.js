/* ===================================================================
   JurisTech — Componentes e utilidades de interface.
   Bloco: FRONT / UI
   Tudo que desenha na tela passa por aqui (escape de HTML incluso).
   =================================================================== */

const UI = (() => {

  /* ---------------------------------------------- Segurança de renderização */
  function esc(v) {
    if (v === null || v === undefined) return '';
    return String(v)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /* ---------------------------------------------- Formatação pt-BR */
  const moeda = (v) => (Number(v) || 0).toLocaleString('pt-BR',
    { style: 'currency', currency: 'BRL' });

  const numero = (v) => (Number(v) || 0).toLocaleString('pt-BR');

  function data(d) {
    if (!d) return '—';
    const s = String(d).slice(0, 10);
    const [a, m, dia] = s.split('-');
    return (a && m && dia) ? `${dia}/${m}/${a}` : esc(d);
  }

  function dataHora(d) {
    if (!d) return '—';
    const s = String(d).replace(' ', 'T');
    const dt = new Date(s.endsWith('Z') ? s : s + 'Z');
    if (isNaN(dt)) return esc(d);
    return dt.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit',
      year: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  function horas(min) {
    const m = Math.round(Number(min) || 0);
    return `${Math.floor(m / 60)}h${String(m % 60).padStart(2, '0')}`;
  }

  function tempoRelativo(d) {
    if (!d) return '';
    const dt = new Date(String(d).replace(' ', 'T') + 'Z');
    const seg = (Date.now() - dt.getTime()) / 1000;
    if (isNaN(seg)) return '';
    if (seg < 60) return 'agora';
    if (seg < 3600) return `há ${Math.floor(seg / 60)} min`;
    if (seg < 86400) return `há ${Math.floor(seg / 3600)} h`;
    if (seg < 604800) return `há ${Math.floor(seg / 86400)} d`;
    return data(String(d).slice(0, 10));
  }

  /* ---------------------------------------------- Semáforo de prazos */
  function pillPrazo(dias) {
    if (dias === null || dias === undefined || dias === '') return '<span class="muted">—</span>';
    const d = Number(dias);
    if (d < 0) return `<span class="pill danger">Vencido há ${Math.abs(d)}d</span>`;
    if (d === 0) return '<span class="pill danger">Vence hoje</span>';
    if (d <= 3) return `<span class="pill danger">${d}d restantes</span>`;
    if (d <= 7) return `<span class="pill warn">${d}d restantes</span>`;
    return `<span class="pill ok">${d}d restantes</span>`;
  }

  function pillStatus(s) {
    const mapa = {
      'Encerrado': 'neutro', 'Ativo': 'ok', 'Pago': 'ok', 'Realizada': 'ok', 'Ganho': 'ok',
      'Pendente': 'warn', 'Por fazer': 'warn', 'Em andamento': 'info', 'Pausada': 'neutro',
      'Atrasado': 'danger', 'Perdido': 'danger', 'Cancelada': 'neutro', 'Cancelado': 'neutro',
      'Urgente': 'danger', 'Alta': 'danger', 'Média': 'warn', 'Baixa': 'neutro',
      'Suspenso': 'neutro', 'Recurso': 'info', 'Execução': 'info',
    };
    return `<span class="pill ${mapa[s] || 'info'}">${esc(s)}</span>`;
  }

  /* ---------------------------------------------- Ícones (SVG inline) */
  const ic = {
    painel: '<path d="M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z"/>',
    clientes: '<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>',
    funil: '<path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/>',
    processos: '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zM14 2v6h6M16 13H8M16 17H8M10 9H8"/>',
    agenda: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    atividades: '<path d="M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>',
    financeiro: '<path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>',
    documentos: '<path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9l-7-7zM13 2v7h7"/>',
    relatorios: '<path d="M18 20V10M12 20V4M6 20v-6"/>',
    auditoria: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    config: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 008 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06A1.65 1.65 0 009 4.6a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06A1.65 1.65 0 0019.4 9c.14.63.7 1.08 1.35 1.09H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"/>',
    mais: '<path d="M12 5v14M5 12h14"/>',
    busca: '<circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>',
    editar: '<path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>',
    lixo: '<path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>',
    sync: '<path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>',
    baixar: '<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
    play: '<polygon points="5 3 19 12 5 21 5 3"/>',
    stop: '<rect x="6" y="6" width="12" height="12" rx="2"/>',
    olho: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
    alerta: '<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><path d="M12 9v4M12 17h.01"/>',
    caixa: '<path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>',
  };

  function icone(nome, tam = 18) {
    return `<svg width="${tam}" height="${tam}" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" stroke-width="1.9" stroke-linecap="round"
      stroke-linejoin="round">${ic[nome] || ''}</svg>`;
  }

  /* ---------------------------------------------- Toast */
  function toast(msg, tipo = 'ok', ms = 4200) {
    const cx = document.getElementById('toasts');
    const el = document.createElement('div');
    el.className = `toast ${tipo}`;
    const i = tipo === 'ok' ? '✓' : tipo === 'erro' ? '✕' : '!';
    el.innerHTML = `<b style="font-size:15px">${i}</b><div>${esc(msg).replace(/\n/g, '<br>')}</div>`;
    cx.appendChild(el);
    setTimeout(() => {
      el.style.transition = 'opacity .25s, transform .25s';
      el.style.opacity = '0'; el.style.transform = 'translateX(30px)';
      setTimeout(() => el.remove(), 260);
    }, ms);
  }

  /* ---------------------------------------------- Modal */
  let aoConfirmar = null;

  function modal({ titulo, corpo, rodape, largo = false, onConfirmar = null }) {
    document.getElementById('modal-titulo').textContent = titulo;
    document.getElementById('modal-corpo').innerHTML = corpo;
    document.getElementById('modal-rodape').innerHTML = rodape ??
      `<button class="btn btn-neutro" data-fechar>Cancelar</button>
       <button class="btn btn-primario" data-confirmar>Salvar</button>`;
    document.getElementById('modal').classList.toggle('largo', largo);
    document.getElementById('modal-fundo').classList.add('aberto');
    aoConfirmar = onConfirmar;
    setTimeout(() => document.querySelector('#modal-corpo input,#modal-corpo select')?.focus(), 90);
  }

  function fecharModal() {
    document.getElementById('modal-fundo').classList.remove('aberto');
    aoConfirmar = null;
  }

  function confirmar(msg, aoOk, textoBotao = 'Confirmar') {
    modal({
      titulo: 'Confirmação',
      corpo: `<p style="font-size:14.5px;line-height:1.6">${esc(msg)}</p>`,
      rodape: `<button class="btn btn-neutro" data-fechar>Cancelar</button>
               <button class="btn btn-perigo" data-confirmar>${esc(textoBotao)}</button>`,
      onConfirmar: aoOk,
    });
  }

  /* ---------------------------------------------- Tabela genérica */
  function tabela(colunas, linhas, opcoes = {}) {
    if (!linhas || !linhas.length) {
      return `<div class="vazio">${icone('caixa', 42)}
        <p>${esc(opcoes.vazio || 'Nenhum registro encontrado.')}</p></div>`;
    }
    const ths = colunas.map(c =>
      `<th class="${c.num ? 'num' : ''}">${esc(c.titulo)}</th>`).join('');
    const trs = linhas.map((l, i) => {
      const tds = colunas.map(c => {
        const v = c.render ? c.render(l, i) : esc(l[c.campo] ?? '—');
        return `<td class="${c.num ? 'num' : ''}">${v}</td>`;
      }).join('');
      return `<tr${opcoes.idLinha ? ` data-id="${esc(l[opcoes.idLinha])}"` : ''}>${tds}</tr>`;
    }).join('');
    return `<div class="tabela-wrap"><table><thead><tr>${ths}</tr></thead>
            <tbody>${trs}</tbody></table></div>`;
  }

  /* ---------------------------------------------- Widgets */
  function kpi(rotulo, valor, nota = '', cor = '') {
    return `<div class="kpi ${cor}">
      <div class="rotulo">${esc(rotulo)}</div>
      <div class="valor">${valor}</div>
      ${nota ? `<div class="nota">${nota}</div>` : ''}</div>`;
  }

  function barras(itens, opcoes = {}) {
    if (!itens?.length) return '<p class="muted">Sem dados para exibir.</p>';
    const max = Math.max(...itens.map(i => Number(i.valor) || 0), 1);
    return itens.map(i => `
      <div class="barra-item">
        <div class="barra-top"><b>${esc(i.rotulo)}</b><span>${i.texto ?? numero(i.valor)}</span></div>
        <div class="barra-trilho">
          <div class="barra-fill ${i.cor || opcoes.cor || ''}"
               style="width:${Math.max(2, (Number(i.valor) || 0) / max * 100)}%"></div>
        </div>
      </div>`).join('');
  }

  function graficoFluxo(meses) {
    if (!meses?.length) return '<p class="muted">Sem movimentação registrada.</p>';
    const max = Math.max(...meses.flatMap(m => [m.receitas, m.despesas]), 1);
    const cols = meses.map(m => {
      const rot = (m.mes || '').split('-').reverse().slice(0, 2).join('/');
      return `<div class="mini-col" title="${esc(rot)} — Receitas ${moeda(m.receitas)} · Despesas ${moeda(m.despesas)}">
        <div class="mini-barras">
          <div class="mini-barra rec" style="height:${(m.receitas / max * 100) || 1}%"></div>
          <div class="mini-barra desp" style="height:${(m.despesas / max * 100) || 1}%"></div>
        </div>
        <small>${esc(rot)}</small></div>`;
    }).join('');
    return `<div class="mini-grafico">${cols}</div>
      <div style="display:flex;gap:18px;justify-content:center;margin-top:12px;font-size:12px" class="muted">
        <span><span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:#0f9d58"></span> Receitas</span>
        <span><span style="display:inline-block;width:10px;height:10px;border-radius:3px;background:#c62828"></span> Despesas</span>
      </div>`;
  }

  function campo(rotulo, id, tipo = 'text', extra = {}) {
    const { valor = '', req = false, ajuda = '', ph = '', attrs = '' } = extra;
    return `<div class="campo">
      <label for="${id}">${esc(rotulo)}${req ? ' <span class="req">*</span>' : ''}</label>
      <input type="${tipo}" id="${id}" value="${esc(valor)}" placeholder="${esc(ph)}" ${attrs}>
      ${ajuda ? `<div class="ajuda">${esc(ajuda)}</div>` : ''}</div>`;
  }

  function select(rotulo, id, opcoes, extra = {}) {
    const { valor = '', req = false, ajuda = '', vazio = null } = extra;
    const ops = (vazio !== null ? [{ v: '', t: vazio }] : [])
      .concat(opcoes.map(o => typeof o === 'string' ? { v: o, t: o } : o))
      .map(o => `<option value="${esc(o.v)}"${String(o.v) === String(valor) ? ' selected' : ''}>${esc(o.t)}</option>`)
      .join('');
    return `<div class="campo">
      <label for="${id}">${esc(rotulo)}${req ? ' <span class="req">*</span>' : ''}</label>
      <select id="${id}">${ops}</select>
      ${ajuda ? `<div class="ajuda">${esc(ajuda)}</div>` : ''}</div>`;
  }

  function textarea(rotulo, id, extra = {}) {
    return `<div class="campo"><label for="${id}">${esc(rotulo)}</label>
      <textarea id="${id}" placeholder="${esc(extra.ph || '')}">${esc(extra.valor || '')}</textarea></div>`;
  }

  const val = (id) => document.getElementById(id)?.value?.trim() ?? '';
  const num = (id) => Number(String(val(id)).replace(/\./g, '').replace(',', '.')) || 0;
  const chk = (id) => document.getElementById(id)?.checked ? 1 : 0;

  function busca(id, ph = 'Buscar...') {
    return `<div class="busca cresce">${
      `<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">${ic.busca}</svg>`
    }<input type="search" id="${id}" placeholder="${esc(ph)}"></div>`;
  }

  /* Confirmação do modal (ligada uma única vez) */
  document.addEventListener('click', (e) => {
    if (e.target.closest('[data-fechar]')) fecharModal();
    if (e.target.closest('[data-confirmar]') && aoConfirmar) aoConfirmar();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') fecharModal();
  });

  return { esc, moeda, numero, data, dataHora, horas, tempoRelativo, pillPrazo, pillStatus,
           icone, toast, modal, fecharModal, confirmar, tabela, kpi, barras, graficoFluxo,
           campo, select, textarea, val, num, chk, busca };
})();
