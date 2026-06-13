/**
 * Generator identyfikatorów. Nie używamy Math.random w sposób, który
 * wymagałby crypto — wystarczy unikalny, sortowalny czasowo klucz.
 * (expo-crypto byłoby cięższe; to w pełni wystarcza dla lokalnej bazy.)
 */
let counter = 0;

export function newId(prefix = 'id'): string {
  counter = (counter + 1) % 1_000_000;
  const t = Date.now().toString(36);
  const c = counter.toString(36);
  const r = Math.floor(Math.random() * 1e6).toString(36);
  return `${prefix}_${t}${c}${r}`;
}
