// 6.5 — O aviso sonoro de pedido novo.
//
// Duas notas curtas sintetizadas na hora, em vez de um arquivo de áudio: não
// há o que baixar, o som não depende de asset no bundle e o volume fica sob
// controle. É acessório por definição — se o navegador recusar tocar, o
// destaque visual do card continua valendo e nada quebra.

const STORAGE_KEY = 'mmr-kanban-som'
const NOTES = [
  { frequency: 880, at: 0, duration: 0.16 },
  { frequency: 1318.5, at: 0.15, duration: 0.28 },
]

let context: AudioContext | null = null

export function isChimeEnabled(): boolean {
  return localStorage.getItem(STORAGE_KEY) !== 'off'
}

export function setChimeEnabled(enabled: boolean): void {
  localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off')
}

/**
 * Toca o aviso. O AudioContext nasce na primeira chamada e é reaproveitado;
 * navegadores suspendem contextos criados sem gesto do usuário, daí o resume.
 */
export function playNewOrderChime(): void {
  if (!isChimeEnabled()) {
    return
  }
  try {
    context ??= new AudioContext()
    if (context.state === 'suspended') {
      void context.resume()
    }
    const start = context.currentTime

    for (const note of NOTES) {
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.value = note.frequency

      // Envelope curto: sem ele o corte seco vira um clique audível.
      const from = start + note.at
      gain.gain.setValueAtTime(0, from)
      gain.gain.linearRampToValueAtTime(0.18, from + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, from + note.duration)

      oscillator.connect(gain).connect(context.destination)
      oscillator.start(from)
      oscillator.stop(from + note.duration)
    }
  } catch {
    // Sem áudio disponível (política do navegador, aba sem gesto): silêncio.
  }
}
