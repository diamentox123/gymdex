/**
 * Prosty most do przekazania wybranych ćwiczeń z modala pickera z powrotem
 * do ekranu, który go otworzył. Unikamy serializacji tablic w parametrach
 * trasy — picker zapisuje wybór tutaj, ekran odbiera go po powrocie fokusu.
 */
let picked: string[] = [];

export function setPicked(ids: string[]) {
  picked = ids;
}

export function pendingPicked(): string[] {
  return picked;
}

export function clearPicked() {
  picked = [];
}
