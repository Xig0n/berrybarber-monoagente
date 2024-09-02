interface State {
  queue: string[];
  timer: NodeJS.Timeout | null;
  callback: ((result: string) => void) | null;
}

const ESTADOS: Record<string, State | null> = {};
const time = 5000;

function EstadoInicial(id: string): State {
  if (!ESTADOS[id]) {
      ESTADOS[id] = {
          queue: [],
          timer: null,
          callback: null
      };
  }
  return ESTADOS[id] as State;
}

function BorrarEstado(id: string): void {
  ESTADOS[id] = null;
}

function ReiniciarTemporizador(state: State): void {
  if (state.timer) {
      clearTimeout(state.timer);
  }
  state.timer = null;
}

function ProcesarCola(state: State): string {
  return state.queue.join(' ');
}

function enqueueMessage(ctx: { from: string; body: string }, callback: (result: string) => void): void {
  let state = EstadoInicial(ctx.from);

  ReiniciarTemporizador(state);
  state.queue.push(ctx.body);
  state.callback = callback;

  state.timer = setTimeout(() => {
      const resultado = ProcesarCola(state);
      if (state.callback) {
          state.callback(resultado);
          state.callback = null;
          BorrarEstado(ctx.from);
      }
  }, time);
}

export { enqueueMessage };
