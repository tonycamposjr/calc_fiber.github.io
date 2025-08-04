// ===== CONFIGURAÇÕES E CONSTANTES =====
const CONFIG = {
  VALORES_PADRAO: {
    TX: -5,
    RX: -15.5,
    PERDAFIBRA: 0.35, // CORRIGIDO: Chave sem underscore
    MARGEM: 3
  },
  LIMITES: {
    TX_MIN: -50,
    TX_MAX: 30,
    RX_MIN: -50,
    RX_MAX: 10,
    PERDA_FIBRA_MIN: 0.01,
    PERDA_FIBRA_MAX: 10,
    MARGEM_MIN: 0,
    MARGEM_MAX: 20
  },
  MENSAGENS: {
    CAMPO_OBRIGATORIO: 'Digite um número válido.',
    TX_INVALIDO: (min, max) => `Valor deve estar entre ${min} e ${max} dBm.`,
    RX_INVALIDO: (min, max) => `Valor deve estar entre ${min} e ${max} dBm.`,
    PERDA_FIBRA_INVALIDA: 'A perda da fibra deve ser maior que zero.',
    PERDA_FIBRA_FORA_LIMITES: (min, max) => `Valor deve estar entre ${min} e ${max} dB/km.`,
    MARGEM_INVALIDA: 'A margem de segurança não pode ser negativa.',
    MARGEM_EXCESSIVA: (max) => `Margem muito alta (máximo ${max} dB).`,
    ORCAMENTO_INSUFICIENTE: 'Orçamento óptico insuficiente. Verifique os valores inseridos.',
    CALCULO_SUCESSO: 'Cálculo realizado com sucesso!',
    CAMPOS_LIMPOS: 'Todos os campos foram limpos.',
    HISTORICO_LIMPO: 'Histórico de cálculos foi limpo.'
  },
  STORAGE_KEYS: {
    HISTORICO: 'calculadora-enlace-historico',
    CONFIGURACOES: 'calculadora-enlace-config'
  },
  MAX_HISTORICO: 10,
  DEBOUNCE_DELAY: 300
};

// ===== CLASSE PRINCIPAL =====
class CalculadoraEnlaceOptico {
  constructor() {
    this.elementos = this.obterElementos();
    this.historico = new HistoricoCalculos();
    this.validador = new ValidadorEntradas();
    this.analytics = new AnalyticsCalculadora();
    this.debounceTimers = new Map();
    
    this.inicializar();
  }
  
  obterElementos() {
    const elementos = {
      // Campos de entrada
      tx: document.getElementById('tx'),
      rx: document.getElementById('rx'),
      perdaFibra: document.getElementById('perdaFibra'),
      margem: document.getElementById('margem'),
      
      // Elementos de feedback
      txFeedback: document.getElementById('tx-feedback'),
      rxFeedback: document.getElementById('rx-feedback'),
      perdaFeedback: document.getElementById('perda-feedback'),
      margemFeedback: document.getElementById('margem-feedback'),
      
      // Botões
      btnCalcular: document.getElementById('btn-calcular'),
      btnLimpar: document.getElementById('btn-limpar'),
      btnLimparHistorico: document.getElementById('btn-limpar-historico'),
      
      // Resultado e histórico
      resultado: document.getElementById('resultado'),
      historicoLista: document.getElementById('historico-lista'),
      
      // Formulário
      formulario: document.getElementById('calculadora-form'),
      
      // Loading
      loadingOverlay: document.getElementById('loading-overlay')
    };
    
    // Verificar se todos os elementos foram encontrados
    const elementosNaoEncontrados = Object.entries(elementos)
      .filter(([nome, elemento]) => !elemento)
      .map(([nome]) => nome);
    
    if (elementosNaoEncontrados.length > 0) {
      console.error('Elementos não encontrados:', elementosNaoEncontrados);
    }
    
    return elementos;
  }
  
  inicializar() {
    this.adicionarEventListeners();
    this.configurarValidacaoTempo();
    this.configurarTooltips();
    this.carregarConfiguracoes();
    this.historico.atualizarInterface();
    
    console.log('Calculadora de Enlace Óptico inicializada com sucesso');
  }
  
  adicionarEventListeners() {
    // Botão calcular
    this.elementos.btnCalcular?.addEventListener('click', () => this.calcular());
    
    // Botão limpar
    this.elementos.btnLimpar?.addEventListener('click', () => this.limparCampos());
    
    // Botão limpar histórico
    this.elementos.btnLimparHistorico?.addEventListener('click', () => this.limparHistorico());
    
    // Enter para calcular
    document.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        this.calcular();
      }
    });
    
    // Escape para limpar
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.limparCampos();
      }
    });
    
    // Validação em tempo real para todos os campos
    const campos = ['tx', 'rx', 'perdaFibra', 'margem'];
    campos.forEach(campo => {
      const elemento = this.elementos[campo];
      if (elemento) {
        elemento.addEventListener('input', () => this.validarCampoComDebounce(campo));
        elemento.addEventListener('blur', () => this.validarCampo(campo));
        elemento.addEventListener('focus', () => this.limparFeedback(campo));
      }
    });
    
    // Salvar configurações ao alterar valores
    campos.forEach(campo => {
      const elemento = this.elementos[campo];
      if (elemento) {
        elemento.addEventListener('change', () => this.salvarConfiguracoes());
      }
    });
  }
  
  configurarValidacaoTempo() {
    // Configurar atributos de validação nos campos
    const configuracoes = [
      { campo: 'tx', min: CONFIG.LIMITES.TX_MIN, max: CONFIG.LIMITES.TX_MAX },
      { campo: 'rx', min: CONFIG.LIMITES.RX_MIN, max: CONFIG.LIMITES.RX_MAX },
      { campo: 'perdaFibra', min: CONFIG.LIMITES.PERDA_FIBRA_MIN, max: CONFIG.LIMITES.PERDA_FIBRA_MAX },
      { campo: 'margem', min: CONFIG.LIMITES.MARGEM_MIN, max: CONFIG.LIMITES.MARGEM_MAX }
    ];
    
    configuracoes.forEach(({ campo, min, max }) => {
      const elemento = this.elementos[campo];
      if (elemento) {
        elemento.setAttribute('min', min);
        elemento.setAttribute('max', max);
      }
    });
  }
  
  configurarTooltips() {
    // Configurar tooltips interativos
    const tooltipTriggers = document.querySelectorAll('.tooltip-trigger');
    
    tooltipTriggers.forEach(trigger => {
      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        this.toggleTooltip(trigger);
      });
      
      trigger.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.toggleTooltip(trigger);
        }
      });
    });
    
    // Fechar tooltips ao clicar fora
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.tooltip-trigger')) {
        this.fecharTodosTooltips();
      }
    });
  }
  
  toggleTooltip(trigger) {
    const tooltipId = trigger.getAttribute('aria-describedby');
    const tooltip = document.getElementById(tooltipId);
    
    if (tooltip) {
      const isVisible = tooltip.getAttribute('aria-hidden') === 'false';
      
      // Fechar outros tooltips
      this.fecharTodosTooltips();
      
      if (!isVisible) {
        tooltip.setAttribute('aria-hidden', 'false');
      }
    }
  }
  
  fecharTodosTooltips() {
    const tooltips = document.querySelectorAll('.tooltip');
    tooltips.forEach(tooltip => {
      tooltip.setAttribute('aria-hidden', 'true');
    });
  }
  
  validarCampoComDebounce(campo) {
    // Limpar timer anterior
    if (this.debounceTimers.has(campo)) {
      clearTimeout(this.debounceTimers.get(campo));
    }
    
    // Configurar novo timer
    const timer = setTimeout(() => {
      this.validarCampo(campo);
    }, CONFIG.DEBOUNCE_DELAY);
    
    this.debounceTimers.set(campo, timer);
  }
  
  validarCampo(campo) {
    const elemento = this.elementos[campo];
    const feedbackElemento = this.elementos[`${campo}Feedback`];
    
    if (!elemento || !feedbackElemento) return false;
    
    const valor = parseFloat(String(elemento.value).replace(',', '.'));
    const resultado = this.validador.validarCampo(campo, valor);
    
    elemento.classList.remove('campo-invalido', 'campo-valido');
    elemento.classList.add(resultado.valido ? 'campo-valido' : 'campo-invalido');
    
    elemento.setAttribute('aria-invalid', !resultado.valido);
    
    this.atualizarFeedback(feedbackElemento, resultado);
    
    return resultado.valido;
  }
  
  atualizarFeedback(elemento, resultado) {
    elemento.className = 'feedback-campo';
    
    if (resultado.valido) {
      elemento.classList.add('feedback-sucesso');
      elemento.textContent = resultado.mensagem || '✓ Valor válido';
    } else {
      elemento.classList.add('feedback-erro');
      elemento.textContent = resultado.mensagem || 'Valor inválido';
    }
  }
  
  limparFeedback(campo) {
    const feedbackElemento = this.elementos[`${campo}Feedback`];
    if (feedbackElemento) {
      feedbackElemento.textContent = '';
      feedbackElemento.className = 'feedback-campo';
    }
  }
  
  async calcular() {
    try {
      this.mostrarLoading(true);
      this.analytics.registrarTentativaCalculo();
      
      const dadosValidacao = this.validarTodosOsCampos();
      if (!dadosValidacao.valido) {
        this.exibirErro(dadosValidacao.mensagem);
        return;
      }
      
      const dados = this.obterDadosFormulario();
      const resultado = this.executarCalculo(dados);
      
      this.exibirResultado(resultado);
      this.historico.adicionarCalculo(dados, resultado);
      this.analytics.registrarCalculoSucesso(dados, resultado);
      
      setTimeout(() => {
        this.elementos.resultado?.focus();
      }, 100);
      
    } catch (error) {
      console.error('Erro no cálculo:', error);
      this.exibirErro('Erro interno no cálculo. Tente novamente.');
      this.analytics.registrarErro(error);
    } finally {
      this.mostrarLoading(false);
    }
  }
  
  validarTodosOsCampos() {
    const campos = ['tx', 'rx', 'perdaFibra', 'margem'];
    let primeiroErro = null;

    for (const campo of campos) {
        const elemento = this.elementos[campo];
        const resultadoValidacao = this.validador.validarCampo(campo, parseFloat(String(elemento.value).replace(',', '.')));
        this.validarCampo(campo); // Atualiza a UI

        if (!resultadoValidacao.valido && !primeiroErro) {
            primeiroErro = {
                campo,
                mensagem: `Por favor, corrija o campo: ${this.obterNomeCampo(campo)}`
            };
        }
    }

    if (primeiroErro) {
        this.elementos[primeiroErro.campo]?.focus();
        return { valido: false, mensagem: primeiroErro.mensagem };
    }

    return { valido: true };
  }
  
  obterNomeCampo(campo) {
    const nomes = {
      tx: 'Potência de Transmissão',
      rx: 'Limiar de Recepção',
      perdaFibra: 'Perda da Fibra',
      margem: 'Margem de Segurança'
    };
    return nomes[campo] || campo;
  }
  
  obterDadosFormulario() {
    return {
      tx: parseFloat(String(this.elementos.tx.value).replace(',', '.')),
      rx: parseFloat(String(this.elementos.rx.value).replace(',', '.')),
      perdaFibra: parseFloat(String(this.elementos.perdaFibra.value).replace(',', '.')),
      margem: parseFloat(String(this.elementos.margem.value).replace(',', '.'))
    };
  }
  
  executarCalculo(dados) {
    const { tx, rx, perdaFibra, margem } = dados;
    
    const orcamentoTotal = tx - rx;
    const orcamentoUtil = orcamentoTotal - margem;
    const distanciaMaxima = orcamentoUtil / perdaFibra;
    
    const perdaTotal = orcamentoTotal - margem;
    const margemPercentual = (margem / orcamentoTotal) * 100;
    
    let qualidadeEnlace = 'Excelente';
    if (margemPercentual > 50) qualidadeEnlace = 'Conservador';
    else if (margemPercentual > 30) qualidadeEnlace = 'Bom';
    else if (margemPercentual > 15) qualidadeEnlace = 'Adequado';
    else if (margemPercentual > 5) qualidadeEnlace = 'Limitado';
    else qualidadeEnlace = 'Crítico';
    
    return {
      distanciaMaxima,
      orcamentoTotal,
      orcamentoUtil,
      perdaTotal,
      margemPercentual,
      qualidadeEnlace,
      timestamp: new Date().toISOString()
    };
  }
  
  exibirResultado(resultado) {
    const elemento = this.elementos.resultado;
    if (!elemento) return;
    
    elemento.className = 'resultado success';
    elemento.setAttribute('aria-live', 'polite');
    
    const { distanciaMaxima, orcamentoTotal, orcamentoUtil, margemPercentual, qualidadeEnlace } = resultado;
    
    elemento.innerHTML = `
      <strong>Resultado do Cálculo</strong><br>
      <div class="resultado-distancia">
        Distância máxima segura: <strong>${distanciaMaxima.toFixed(2).replace('.', ',')} km</strong>
      </div>
      
      <small class="resultado-detalhes">
        <strong>Detalhes do cálculo:</strong><br>
        • Orçamento total: ${orcamentoTotal.toFixed(2).replace('.', ',')} dB<br>
        • Orçamento útil: ${orcamentoUtil.toFixed(2).replace('.', ',')} dB<br>
        • Margem percentual: ${margemPercentual.toFixed(1).replace('.', ',')}%<br>
        • Qualidade do enlace: <strong>${qualidadeEnlace}</strong>
      </small>
    `;
    
    this.anunciarResultado(distanciaMaxima, qualidadeEnlace);
  }
  
  exibirErro(mensagem) {
    const elemento = this.elementos.resultado;
    if (!elemento) return;
    
    elemento.className = 'resultado error';
    elemento.setAttribute('aria-live', 'assertive');
    elemento.textContent = mensagem;
    
    setTimeout(() => {
      const anuncio = document.createElement('div');
      anuncio.setAttribute('aria-live', 'assertive');
      anuncio.setAttribute('aria-atomic', 'true');
      anuncio.className = 'sr-only';
      anuncio.textContent = `Erro: ${mensagem}`;
      document.body.appendChild(anuncio);
      
      setTimeout(() => {
        document.body.removeChild(anuncio);
      }, 1000);
    }, 100);
  }
  
  anunciarResultado(distancia, qualidade) {
    const anuncio = document.createElement('div');
    anuncio.setAttribute('aria-live', 'polite');
    anuncio.setAttribute('aria-atomic', 'true');
    anuncio.className = 'sr-only';
    anuncio.textContent = `Cálculo concluído. Distância máxima: ${distancia.toFixed(2).replace('.', ',')} quilômetros. Qualidade do enlace: ${qualidade}.`;
    document.body.appendChild(anuncio);
    
    setTimeout(() => {
      document.body.removeChild(anuncio);
    }, 3000);
  }
  
  limparCampos() {
    const campos = ['tx', 'rx', 'perdaFibra', 'margem'];
    const valores = CONFIG.VALORES_PADRAO;
    
    campos.forEach(campo => {
      const elemento = this.elementos[campo];
      const feedbackElemento = this.elementos[`${campo}Feedback`];
      
      if (elemento) {
        elemento.value = String(valores[campo.toUpperCase()] || '').replace('.', ',');
        elemento.classList.remove('campo-invalido', 'campo-valido');
        elemento.setAttribute('aria-invalid', 'false');
      }
      
      if (feedbackElemento) {
        feedbackElemento.textContent = '';
        feedbackElemento.className = 'feedback-campo';
      }
    });
    
    const resultado = this.elementos.resultado;
    if (resultado) {
      resultado.className = 'resultado';
      resultado.textContent = '';
      resultado.style.display = 'none';
    }
    
    this.elementos.tx?.focus();
    this.mostrarNotificacao(CONFIG.MENSAGENS.CAMPOS_LIMPOS, 'success');
  }
  
  limparHistorico() {
    this.historico.limparHistorico();
    this.mostrarNotificacao(CONFIG.MENSAGENS.HISTORICO_LIMPO, 'success');
  }
  
  mostrarLoading(mostrar) {
    const botao = this.elementos.btnCalcular;
    const overlay = this.elementos.loadingOverlay;
    
    if (botao) {
      botao.disabled = mostrar;
      botao.classList.toggle('btn-loading', mostrar);
    }
    
    if (overlay) {
      overlay.classList.toggle('show', mostrar);
      overlay.setAttribute('aria-hidden', !mostrar);
    }
  }
  
  mostrarNotificacao(mensagem, tipo = 'info') {
    const notificacao = document.createElement('div');
    notificacao.className = `notificacao notificacao-${tipo}`;
    notificacao.setAttribute('role', 'status');
    notificacao.setAttribute('aria-live', 'polite');
    notificacao.textContent = mensagem;
    
    document.body.appendChild(notificacao);
    
    setTimeout(() => {
      notificacao.classList.add('show');
    }, 100);
    
    setTimeout(() => {
      notificacao.classList.remove('show');
      setTimeout(() => {
        if (notificacao.parentNode) {
          document.body.removeChild(notificacao);
        }
      }, 300);
    }, 3000);
  }
  
  carregarConfiguracoes() {
    try {
      const configuracoes = localStorage.getItem(CONFIG.STORAGE_KEYS.CONFIGURACOES);
      if (configuracoes) {
        const dados = JSON.parse(configuracoes);
        
        Object.entries(dados).forEach(([campo, valor]) => {
          const elemento = this.elementos[campo];
          if (elemento && valor !== null && valor !== undefined) {
            elemento.value = String(valor).replace('.', ',');
          }
        });
      }
    } catch (error) {
      console.warn('Erro ao carregar configurações:', error);
    }
  }
  
  salvarConfiguracoes() {
    try {
      const configuracoes = {
        tx: this.elementos.tx?.value || CONFIG.VALORES_PADRAO.TX,
        rx: this.elementos.rx?.value || CONFIG.VALORES_PADRAO.RX,
        perdaFibra: this.elementos.perdaFibra?.value || CONFIG.VALORES_PADRAO.PERDAFIBRA,
        margem: this.elementos.margem?.value || CONFIG.VALORES_PADRAO.MARGEM
      };
      
      localStorage.setItem(CONFIG.STORAGE_KEYS.CONFIGURACOES, JSON.stringify(configuracoes));
    } catch (error) {
      console.warn('Erro ao salvar configurações:', error);
    }
  }
}

// ===== CLASSE VALIDADOR =====
class ValidadorEntradas {
  validarCampo(campo, valor) {
    if (isNaN(valor) || valor === null || valor === undefined) {
      return { valido: false, mensagem: CONFIG.MENSAGENS.CAMPO_OBRIGATORIO };
    }
    
    switch (campo) {
      case 'tx': return this.validarTx(valor);
      case 'rx': return this.validarRx(valor);
      case 'perdaFibra': return this.validarPerdaFibra(valor);
      case 'margem': return this.validarMargem(valor);
      default: return { valido: true };
    }
  }
  
  validarTx(valor) {
    const { TX_MIN, TX_MAX } = CONFIG.LIMITES;
    if (valor < TX_MIN || valor > TX_MAX) {
      return { valido: false, mensagem: CONFIG.MENSAGENS.TX_INVALIDO(TX_MIN, TX_MAX) };
    }
    return { valido: true, mensagem: 'Potência de transmissão válida' };
  }
  
  validarRx(valor) {
    const { RX_MIN, RX_MAX } = CONFIG.LIMITES;
    if (valor < RX_MIN || valor > RX_MAX) {
      return { valido: false, mensagem: CONFIG.MENSAGENS.RX_INVALIDO(RX_MIN, RX_MAX) };
    }
    return { valido: true, mensagem: 'Limiar de recepção válido' };
  }
  
  validarPerdaFibra(valor) {
    const { PERDA_FIBRA_MIN, PERDA_FIBRA_MAX } = CONFIG.LIMITES;
    if (valor <= 0) {
      return { valido: false, mensagem: CONFIG.MENSAGENS.PERDA_FIBRA_INVALIDA };
    }
    if (valor < PERDA_FIBRA_MIN || valor > PERDA_FIBRA_MAX) {
      return { valido: false, mensagem: CONFIG.MENSAGENS.PERDA_FIBRA_FORA_LIMITES(PERDA_FIBRA_MIN, PERDA_FIBRA_MAX) };
    }
    return { valido: true, mensagem: 'Perda da fibra válida' };
  }
  
  validarMargem(valor) {
    const { MARGEM_MIN, MARGEM_MAX } = CONFIG.LIMITES;
    if (valor < MARGEM_MIN) {
      return { valido: false, mensagem: CONFIG.MENSAGENS.MARGEM_INVALIDA };
    }
    if (valor > MARGEM_MAX) {
      return { valido: false, mensagem: CONFIG.MENSAGENS.MARGEM_EXCESSIVA(MARGEM_MAX) };
    }
    return { valido: true, mensagem: 'Margem de segurança válida' };
  }
}

// ===== CLASSE HISTÓRICO =====
class HistoricoCalculos {
  constructor() {
    this.historico = this.carregarHistorico();
    this.elementos = {
      lista: document.getElementById('historico-lista'),
      btnLimpar: document.getElementById('btn-limpar-historico')
    };
  }
  
  adicionarCalculo(dados, resultado) {
    const item = {
      id: Date.now(),
      timestamp: new Date(),
      dados: { ...dados },
      resultado: { ...resultado }
    };
    
    this.historico.unshift(item);
    
    if (this.historico.length > CONFIG.MAX_HISTORICO) {
      this.historico = this.historico.slice(0, CONFIG.MAX_HISTORICO);
    }
    
    this.salvarHistorico();
    this.atualizarInterface();
  }
  
  limparHistorico() {
    this.historico = [];
    this.salvarHistorico();
    this.atualizarInterface();
  }
  
  carregarHistorico() {
    try {
      const dados = localStorage.getItem(CONFIG.STORAGE_KEYS.HISTORICO);
      return dados ? JSON.parse(dados).map(item => ({ ...item, timestamp: new Date(item.timestamp) })) : [];
    } catch (error) {
      console.warn('Erro ao carregar histórico:', error);
      return [];
    }
  }
  
  salvarHistorico() {
    try {
      localStorage.setItem(CONFIG.STORAGE_KEYS.HISTORICO, JSON.stringify(this.historico));
    } catch (error) {
      console.warn('Erro ao salvar histórico:', error);
    }
  }
  
  atualizarInterface() {
    const { lista, btnLimpar } = this.elementos;
    if (!lista) return;
    
    const temHistorico = this.historico.length > 0;
    
    if (btnLimpar) btnLimpar.disabled = !temHistorico;
    
    if (!temHistorico) {
      lista.innerHTML = '<p class="historico-vazio">Nenhum cálculo realizado ainda.</p>';
      return;
    }
    
    lista.innerHTML = this.historico.map(item => this.criarItemHtml(item)).join('');
  }
  
  criarItemHtml(item) {
    const { dados, resultado, timestamp } = item;
    const dataFormatada = this.formatarData(new Date(timestamp));
    
    return `
      <div class="historico-item" role="listitem">
        <div class="historico-timestamp">${dataFormatada}</div>
        <div class="historico-dados">
          Tx: ${String(dados.tx).replace('.', ',')} dBm | Rx: ${String(dados.rx).replace('.', ',')} dBm | 
          Perda: ${String(dados.perdaFibra).replace('.', ',')} dB/km | Margem: ${String(dados.margem).replace('.', ',')} dB
        </div>
        <div class="historico-resultado">
          Distância: ${resultado.distanciaMaxima.toFixed(2).replace('.', ',')} km 
          (${resultado.qualidadeEnlace})
        </div>
      </div>
    `;
  }
  
  formatarData(data) {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    }).format(data);
  }
}

// ===== CLASSE ANALYTICS =====
class AnalyticsCalculadora {
  constructor() {
    this.eventos = [];
    this.sessionId = 'calc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    this.inicioSessao = Date.now();
  }
  
  registrarTentativaCalculo() { this.adicionarEvento('tentativa_calculo'); }
  
  registrarCalculoSucesso(dados, resultado) {
    this.adicionarEvento('calculo_sucesso', {
      distancia: resultado.distanciaMaxima,
      qualidade: resultado.qualidadeEnlace,
      margem_percentual: resultado.margemPercentual
    });
  }
  
  registrarErro(error) {
    this.adicionarEvento('erro_calculo', {
      tipo_erro: error.name || 'Erro desconhecido',
      mensagem: error.message || 'Sem mensagem'
    });
  }
  
  adicionarEvento(tipo, dados = {}) {
    this.eventos.push({ tipo, timestamp: Date.now(), sessionId: this.sessionId, dados });
    if (this.eventos.length >= 5) this.enviarEventos();
  }
  
  enviarEventos() {
    if (this.eventos.length > 0) {
      console.log('Analytics - Eventos:', JSON.parse(JSON.stringify(this.eventos)));
      this.eventos = [];
    }
  }
  
  finalizarSessao() {
    this.adicionarEvento('fim_sessao', { duracao: Date.now() - this.inicioSessao });
    this.enviarEventos();
  }
}

// ===== INICIALIZAÇÃO =====
let calculadora;

document.addEventListener('DOMContentLoaded', () => {
  try {
    calculadora = new CalculadoraEnlaceOptico();
  } catch (error) {
    console.error('Erro na inicialização:', error);
    alert('Ocorreu um erro grave ao carregar a aplicação.');
  }
});

window.addEventListener('beforeunload', () => {
  if (calculadora?.analytics) {
    calculadora.analytics.finalizarSessao();
  }
});