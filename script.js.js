// ===== CONFIGURAÇÕES E CONSTANTES (sem alterações) =====
const CONFIG = {
  VALORES_PADRAO: { TX: -5, RX: -15.5, PERDAFIBRA: 0.35, MARGEM: 3 },
  // ... resto da configuração ...
};

// ===== CLASSE PRINCIPAL =====
class CalculadoraEnlaceOptico {
  constructor() {
    this.elementos = this.obterElementos();
    this.historico = new HistoricoCalculos();
    this.validador = new ValidadorEntradas();
    this.chartInstance = null; // Propriedade para guardar a instância do gráfico
    
    this.inicializar();
  }
  
  obterElementos() {
    const elementos = {
      // ... outros elementos ...
      resultado: document.getElementById('resultado'),
      graficoContainer: document.getElementById('grafico-container'),
      graficoCanvas: document.getElementById('resultado-grafico'),
      historicoLista: document.getElementById('historico-lista')
      // ... resto dos elementos ...
    };
    return elementos;
  }
  
  inicializar() {
    // ... inicialização existente ...
    this.configurarEstilosGrafico();
  }
  
  configurarEstilosGrafico() {
    // Define cores padrão para o gráfico que podem ser usadas em temas claro/escuro
    const style = getComputedStyle(document.body);
    Chart.defaults.color = style.getPropertyValue('--c-text-secondary');
    Chart.defaults.borderColor = style.getPropertyValue('--c-separator');
  }
  
  // ... resto dos métodos ...
  
  exibirResultado(resultado, dados) { // Passar 'dados' para o cálculo do gráfico
    const elementoResultado = this.elementos.resultado;
    const elementoGraficoContainer = this.elementos.graficoContainer;
    if (!elementoResultado || !elementoGraficoContainer) return;
    
    elementoResultado.className = 'resultado success';
    elementoGraficoContainer.style.display = 'block';
    
    const { distanciaMaxima, orcamentoTotal, qualidadeEnlace } = resultado;
    
    elementoResultado.innerHTML = `
      <div class="resultado-distancia">
        Distância Máxima: <strong>${distanciaMaxima.toFixed(2).replace('.', ',')} km</strong>
      </div>
      <small class="resultado-detalhes">
        • Orçamento Total: ${orcamentoTotal.toFixed(2).replace('.', ',')} dB<br>
        • Qualidade do Enlace: <strong>${qualidadeEnlace}</strong>
      </small>
    `;
    
    // ATUALIZAR OU CRIAR O GRÁFICO
    this.atualizarGrafico(resultado, dados);
  }

  atualizarGrafico(resultado, dados) {
    const ctx = this.elementos.graficoCanvas.getContext('2d');
    
    if (this.chartInstance) {
      this.chartInstance.destroy(); // Destruir gráfico anterior para evitar sobreposição
    }

    const perdaTotalNoEnlace = resultado.distanciaMaxima > 0 ? resultado.orcamentoUtil : 0;
    
    this.chartInstance = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Orçamento (dB)'],
        datasets: [
          {
            label: 'Perda no Enlace',
            data: [perdaTotalNoEnlace.toFixed(2)],
            backgroundColor: 'rgba(0, 122, 255, 0.7)', // Azul
            borderColor: 'rgba(0, 122, 255, 1)',
            borderWidth: 1
          },
          {
            label: 'Margem de Segurança',
            data: [dados.margem.toFixed(2)],
            backgroundColor: 'rgba(255, 149, 0, 0.7)', // Laranja
            borderColor: 'rgba(255, 149, 0, 1)',
            borderWidth: 1
          }
        ]
      },
      options: {
        indexAxis: 'y', // Gráfico de barras horizontal
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Distribuição do Orçamento Óptico Total',
            font: { size: 16, weight: '500' },
            padding: { top: 10, bottom: 20 }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return `${context.dataset.label}: ${context.raw} dB`;
              }
            }
          }
        },
        scales: {
          x: {
            stacked: true, // Empilhar as barras
            title: {
              display: true,
              text: 'Atenuação (dB)'
            }
          },
          y: {
            stacked: true
          }
        }
      }
    });
  }

  limparCampos() {
    // ... lógica de limpar campos ...
    
    // Esconder e resetar resultados e gráfico
    const resultado = this.elementos.resultado;
    const graficoContainer = this.elementos.graficoContainer;
    if (resultado) {
      resultado.className = 'resultado';
      resultado.innerHTML = '<p class="placeholder-text">Os resultados da análise aparecerão aqui.</p>';
    }
    if (graficoContainer) {
      graficoContainer.style.display = 'none';
    }
    if (this.chartInstance) {
        this.chartInstance.destroy();
        this.chartInstance = null;
    }
    
    this.elementos.tx?.focus();
    // this.mostrarNotificacao(...);
  }

  // O método calcular precisa passar os `dados` para `exibirResultado`
  async calcular() {
    // ... validação ...
    const dados = this.obterDadosFormulario();
    const resultado = this.executarCalculo(dados);
    
    // Passa ambos, resultado e dados, para a função de exibição
    this.exibirResultado(resultado, dados); 
    
    this.historico.adicionarCalculo(dados, resultado);
    // ... resto da função ...
  }
}

// ===== INICIALIZAÇÃO E OUTRAS CLASSES (sem alterações) =====
// ... (O restante do arquivo, como a classe de histórico, validador, etc. permanece igual)
let calculadora;
document.addEventListener('DOMContentLoaded', () => {
    calculadora = new CalculadoraEnlaceOptico();
});```
