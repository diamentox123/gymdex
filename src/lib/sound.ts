/**
 * Krótkie efekty dźwiękowe (expo-audio). Używane głównie na koniec timera
 * odpoczynku, by sygnał o następnej serii było słychać też wtedy, gdy
 * aplikacja jest na wierzchu (samo powiadomienie systemowe gra tylko w tle).
 *
 * Dźwięk gra nawet przy włączonym przełączniku wyciszenia (playsInSilentMode)
 * i NIE przerywa muzyki użytkownika (mixWithOthers) — ważne, bo ludzie
 * trenują ze słuchawkami i muzyką w tle.
 *
 * Moduł jest celowo „miękki": na platformach/buildach bez wsparcia audio
 * (np. web) wszystko po cichu nie robi nic, zamiast wywracać aplikację.
 */
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import { Platform } from 'react-native';

const REST_DONE = require('../../assets/sounds/rest-done.wav');

let restPlayer: AudioPlayer | null = null;
let modeReady = false;

/** Ustawia tryb audio (raz). Bez tego dźwięk nie zagra przy wyciszeniu. */
async function ensureAudioMode() {
  if (modeReady || Platform.OS === 'web') return;
  modeReady = true;
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: 'mixWithOthers',
      shouldPlayInBackground: false,
    });
  } catch {
    /* brak wsparcia — gramy mimo to, system zdecyduje */
  }
}

/** Inicjalizuje odtwarzacz efektu „koniec odpoczynku" (leniwie). */
function getRestPlayer(): AudioPlayer | null {
  if (Platform.OS === 'web') return null;
  if (!restPlayer) {
    try {
      restPlayer = createAudioPlayer(REST_DONE);
    } catch {
      restPlayer = null;
    }
  }
  return restPlayer;
}

/**
 * Odtwarza sygnał końca odpoczynku. Bezpieczne do wołania wielokrotnie —
 * przewija na początek, więc kolejne serie też zagrają od nowa.
 */
export async function playRestDone() {
  try {
    await ensureAudioMode();
    const p = getRestPlayer();
    if (!p) return;
    try {
      p.seekTo(0); // player nie resetuje pozycji po odtworzeniu
    } catch {
      /* przy pierwszym graniu pozycja i tak = 0 */
    }
    p.play();
  } catch {
    /* nie psuj treningu, gdy dźwięk zawiedzie */
  }
}

/** Wstępnie ładuje zasób, by pierwsze odtworzenie nie miało opóźnienia. */
export function warmUpSounds() {
  if (Platform.OS === 'web') return;
  getRestPlayer();
  void ensureAudioMode();
}
