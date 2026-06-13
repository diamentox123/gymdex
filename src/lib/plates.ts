/**
 * Kalkulator talerzy — rozkłada docelowy ciężar na talerze po jednej stronie
 * sztangi. Klasyczny detal ze Strong/Stronger, który zdejmuje z głowy
 * matematykę przy zmianie obciążenia.
 *
 * Wszystkie wartości w kg (warstwa UI konwertuje na lb przy wyświetlaniu).
 */

/** Standardowe talerze olimpijskie (kg), od najcięższego. */
export const DEFAULT_PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25];

/** Standardowa sztanga olimpijska. */
export const DEFAULT_BAR_KG = 20;

export interface PlateResult {
  /** Talerze na JEDNĄ stronę sztangi, od najcięższego. */
  perSide: number[];
  /** Ciężar faktycznie osiągalny dostępnymi talerzami. */
  achievable: number;
  /** Reszta, której nie dało się złożyć z dostępnych talerzy (kg). */
  remainder: number;
  /** Czy ciężar docelowy jest mniejszy niż sama sztanga. */
  belowBar: boolean;
}

/**
 * Rozkłada `targetKg` na talerze na jedną stronę.
 * Zakłada symetryczne obciążenie obu stron (jak w siłowni).
 */
export function calcPlates(
  targetKg: number,
  barKg: number = DEFAULT_BAR_KG,
  availablePlates: number[] = DEFAULT_PLATES_KG
): PlateResult {
  if (targetKg < barKg) {
    return { perSide: [], achievable: barKg, remainder: 0, belowBar: true };
  }

  const plates = [...availablePlates].sort((a, b) => b - a);
  let perSideRemaining = (targetKg - barKg) / 2;
  const perSide: number[] = [];

  // Greedy: największe talerze najpierw. Tolerancja na błędy zmiennoprzecinkowe.
  const EPS = 1e-6;
  for (const plate of plates) {
    while (perSideRemaining + EPS >= plate) {
      perSide.push(plate);
      perSideRemaining -= plate;
    }
  }

  const perSideWeight = perSide.reduce((a, b) => a + b, 0);
  const achievable = barKg + perSideWeight * 2;

  return {
    perSide,
    achievable,
    remainder: Math.max(0, targetKg - achievable),
    belowBar: false,
  };
}
