/**
 * Wbudowana biblioteka ćwiczeń (PL). ~160 pozycji pokrywających wszystkie
 * partie i typy wejścia. Te dane są seedowane do SQLite przy pierwszym
 * uruchomieniu. `id` jest stabilny (kebab-case) — używany jako klucz i do
 * deduplikacji przy ponownym seedowaniu.
 */
import type { ExerciseDef } from '@/lib/types';

export const SEED_EXERCISES: ExerciseDef[] = [
  // ===================== KLATKA =====================
  { id: 'wyciskanie-sztanga-lawka-plaska', name: 'Wyciskanie sztangi na ławce płaskiej', bodyPart: 'klatka', equipment: 'sztanga', inputType: 'weight_reps', secondary: ['triceps', 'barki'] },
  { id: 'wyciskanie-sztanga-skos-gora', name: 'Wyciskanie sztangi na skosie dodatnim', bodyPart: 'klatka', equipment: 'sztanga', inputType: 'weight_reps', secondary: ['barki', 'triceps'] },
  { id: 'wyciskanie-sztanga-skos-dol', name: 'Wyciskanie sztangi na skosie ujemnym', bodyPart: 'klatka', equipment: 'sztanga', inputType: 'weight_reps', secondary: ['triceps'] },
  { id: 'wyciskanie-hantle-lawka-plaska', name: 'Wyciskanie hantli na ławce płaskiej', bodyPart: 'klatka', equipment: 'hantle', inputType: 'weight_reps', secondary: ['triceps', 'barki'] },
  { id: 'wyciskanie-hantle-skos-gora', name: 'Wyciskanie hantli na skosie dodatnim', bodyPart: 'klatka', equipment: 'hantle', inputType: 'weight_reps', secondary: ['barki', 'triceps'] },
  { id: 'rozpietki-hantle', name: 'Rozpiętki z hantlami', bodyPart: 'klatka', equipment: 'hantle', inputType: 'weight_reps' },
  { id: 'rozpietki-brama', name: 'Rozpiętki na bramie (krzyżowe)', bodyPart: 'klatka', equipment: 'wyciąg', inputType: 'weight_reps' },
  { id: 'wyciskanie-maszyna-klatka', name: 'Wyciskanie na maszynie (klatka)', bodyPart: 'klatka', equipment: 'maszyna', inputType: 'weight_reps', secondary: ['triceps'] },
  { id: 'butterfly-maszyna', name: 'Butterfly (maszyna)', bodyPart: 'klatka', equipment: 'maszyna', inputType: 'weight_reps' },
  { id: 'pompki', name: 'Pompki', bodyPart: 'klatka', equipment: 'masa ciała', inputType: 'bodyweight_reps', secondary: ['triceps', 'barki'] },
  { id: 'pompki-obciazone', name: 'Pompki z obciążeniem', bodyPart: 'klatka', equipment: 'masa ciała', inputType: 'weighted_bodyweight', secondary: ['triceps'] },
  { id: 'dipy-klatka', name: 'Dipy na poręczach (klatka)', bodyPart: 'klatka', equipment: 'masa ciała', inputType: 'weighted_bodyweight', secondary: ['triceps', 'barki'] },
  { id: 'pullover-hantel', name: 'Pullover z hantlem', bodyPart: 'klatka', equipment: 'hantle', inputType: 'weight_reps', secondary: ['plecy'] },

  // ===================== PLECY =====================
  { id: 'martwy-ciag', name: 'Martwy ciąg klasyczny', bodyPart: 'plecy', equipment: 'sztanga', inputType: 'weight_reps', secondary: ['nogi', 'pośladki'] },
  { id: 'martwy-ciag-sumo', name: 'Martwy ciąg sumo', bodyPart: 'plecy', equipment: 'sztanga', inputType: 'weight_reps', secondary: ['nogi', 'pośladki'] },
  { id: 'martwy-ciag-rumunski', name: 'Martwy ciąg rumuński', bodyPart: 'plecy', equipment: 'sztanga', inputType: 'weight_reps', secondary: ['pośladki', 'nogi'] },
  { id: 'podciaganie', name: 'Podciąganie nachwytem', bodyPart: 'plecy', equipment: 'masa ciała', inputType: 'weighted_bodyweight', secondary: ['biceps'] },
  { id: 'podciaganie-podchwyt', name: 'Podciąganie podchwytem', bodyPart: 'plecy', equipment: 'masa ciała', inputType: 'weighted_bodyweight', secondary: ['biceps'] },
  { id: 'podciaganie-maszyna-asysta', name: 'Podciąganie z asystą (maszyna)', bodyPart: 'plecy', equipment: 'maszyna', inputType: 'assisted_bodyweight', secondary: ['biceps'] },
  { id: 'sciaganie-drazka-gora', name: 'Ściąganie drążka wyciągu górnego', bodyPart: 'plecy', equipment: 'wyciąg', inputType: 'weight_reps', secondary: ['biceps'] },
  { id: 'sciaganie-drazka-waski', name: 'Ściąganie wyciągu – wąski uchwyt', bodyPart: 'plecy', equipment: 'wyciąg', inputType: 'weight_reps', secondary: ['biceps'] },
  { id: 'wioslowanie-sztanga', name: 'Wiosłowanie sztangą w opadzie', bodyPart: 'plecy', equipment: 'sztanga', inputType: 'weight_reps', secondary: ['biceps'] },
  { id: 'wioslowanie-hantel', name: 'Wiosłowanie hantlem jednorącz', bodyPart: 'plecy', equipment: 'hantle', inputType: 'weight_reps', secondary: ['biceps'] },
  { id: 'wioslowanie-wyciag-dol', name: 'Wiosłowanie na wyciągu dolnym', bodyPart: 'plecy', equipment: 'wyciąg', inputType: 'weight_reps', secondary: ['biceps'] },
  { id: 'wioslowanie-maszyna', name: 'Wiosłowanie na maszynie', bodyPart: 'plecy', equipment: 'maszyna', inputType: 'weight_reps', secondary: ['biceps'] },
  { id: 'wioslowanie-t-bar', name: 'Wiosłowanie T-bar', bodyPart: 'plecy', equipment: 'sztanga', inputType: 'weight_reps', secondary: ['biceps'] },
  { id: 'face-pull', name: 'Face pull (wyciąg)', bodyPart: 'plecy', equipment: 'wyciąg', inputType: 'weight_reps', secondary: ['barki'] },
  { id: 'szrugsy-sztanga', name: 'Szrugsy ze sztangą (kaptury)', bodyPart: 'plecy', equipment: 'sztanga', inputType: 'weight_reps' },
  { id: 'szrugsy-hantle', name: 'Szrugsy z hantlami (kaptury)', bodyPart: 'plecy', equipment: 'hantle', inputType: 'weight_reps' },
  { id: 'hiperekstensje', name: 'Hiperekstensje (prostowniki grzbietu)', bodyPart: 'plecy', equipment: 'masa ciała', inputType: 'weighted_bodyweight', secondary: ['pośladki'] },

  // ===================== BARKI =====================
  { id: 'wyciskanie-zolnierskie', name: 'Wyciskanie OHP na Smith', bodyPart: 'barki', equipment: 'maszyna', inputType: 'weight_reps', secondary: ['triceps'] },
  { id: 'wyciskanie-hantle-barki', name: 'Wyciskanie hantli nad głowę', bodyPart: 'barki', equipment: 'hantle', inputType: 'weight_reps', secondary: ['triceps'] },
  { id: 'wyciskanie-arnold', name: 'Wyciskanie Arnolda', bodyPart: 'barki', equipment: 'hantle', inputType: 'weight_reps', secondary: ['triceps'] },
  { id: 'wyciskanie-maszyna-barki', name: 'Wyciskanie na maszynie (barki)', bodyPart: 'barki', equipment: 'maszyna', inputType: 'weight_reps', secondary: ['triceps'] },
  { id: 'unoszenie-bokiem-hantle', name: 'Unoszenie hantli bokiem', bodyPart: 'barki', equipment: 'hantle', inputType: 'weight_reps' },
  { id: 'unoszenie-bokiem-wyciag', name: 'Unoszenie bokiem na wyciągu', bodyPart: 'barki', equipment: 'wyciąg', inputType: 'weight_reps' },
  { id: 'unoszenie-przodem-hantle', name: 'Unoszenie hantli przodem', bodyPart: 'barki', equipment: 'hantle', inputType: 'weight_reps' },
  { id: 'odwrotne-rozpietki', name: 'Odwrotne rozpiętki (tylny akton)', bodyPart: 'barki', equipment: 'hantle', inputType: 'weight_reps' },
  { id: 'reverse-pec-deck', name: 'Reverse pec deck (maszyna)', bodyPart: 'barki', equipment: 'maszyna', inputType: 'weight_reps' },
  { id: 'unoszenie-bokiem-maszyna', name: 'Unoszenie bokiem na maszynie', bodyPart: 'barki', equipment: 'maszyna', inputType: 'weight_reps' },

  // ===================== BICEPS =====================
  { id: 'uginanie-sztanga', name: 'Uginanie ramion ze sztangą', bodyPart: 'biceps', equipment: 'sztanga', inputType: 'weight_reps' },
  { id: 'uginanie-sztanga-lamana', name: 'Uginanie ze sztangą łamaną (EZ)', bodyPart: 'biceps', equipment: 'sztanga', inputType: 'weight_reps' },
  { id: 'uginanie-hantle', name: 'Uginanie ramion z hantlami', bodyPart: 'biceps', equipment: 'hantle', inputType: 'weight_reps' },
  { id: 'uginanie-mlotkowe', name: 'Uginanie młotkowe', bodyPart: 'biceps', equipment: 'hantle', inputType: 'weight_reps', secondary: ['przedramiona'] },
  { id: 'uginanie-modlitewnik', name: 'Uginanie na modlitewniku', bodyPart: 'biceps', equipment: 'sztanga', inputType: 'weight_reps' },
  { id: 'uginanie-skosna-lawka', name: 'Uginanie hantli na ławce skośnej', bodyPart: 'biceps', equipment: 'hantle', inputType: 'weight_reps' },
  { id: 'uginanie-wyciag', name: 'Uginanie ramion na wyciągu', bodyPart: 'biceps', equipment: 'wyciąg', inputType: 'weight_reps' },
  { id: 'uginanie-koncentryczne', name: 'Uginanie koncentryczne', bodyPart: 'biceps', equipment: 'hantle', inputType: 'weight_reps' },

  // ===================== TRICEPS =====================
  { id: 'wyciskanie-waskim-chwytem', name: 'Wyciskanie sztangi wąsko (triceps)', bodyPart: 'triceps', equipment: 'sztanga', inputType: 'weight_reps', secondary: ['klatka'] },
  { id: 'francuskie-sztanga', name: 'Wyciskanie francuskie ze sztangą', bodyPart: 'triceps', equipment: 'sztanga', inputType: 'weight_reps' },
  { id: 'francuskie-hantel', name: 'Wyciskanie francuskie z hantlem', bodyPart: 'triceps', equipment: 'hantle', inputType: 'weight_reps' },
  { id: 'prostowanie-wyciag-drazek', name: 'Triceps – wyciąg w dół (drążek)', bodyPart: 'triceps', equipment: 'wyciąg', inputType: 'weight_reps' },
  { id: 'prostowanie-wyciag-lina', name: 'Prostowanie ramion z liną', bodyPart: 'triceps', equipment: 'wyciąg', inputType: 'weight_reps' },
  { id: 'kickback', name: 'Prostowanie hantla w opadzie (kickback)', bodyPart: 'triceps', equipment: 'hantle', inputType: 'weight_reps' },
  { id: 'dipy-triceps', name: 'Dipy na ławce (triceps)', bodyPart: 'triceps', equipment: 'masa ciała', inputType: 'weighted_bodyweight' },
  { id: 'pompki-diamentowe', name: 'Pompki diamentowe', bodyPart: 'triceps', equipment: 'masa ciała', inputType: 'bodyweight_reps', secondary: ['klatka'] },
  { id: 'prostowanie-nad-glowa-wyciag', name: 'Triceps – wyciąg nad głowę (lina)', bodyPart: 'triceps', equipment: 'wyciąg', inputType: 'weight_reps' },

  // ===================== PRZEDRAMIONA =====================
  { id: 'uginanie-nadgarstkow', name: 'Uginanie nadgarstków ze sztangą', bodyPart: 'przedramiona', equipment: 'sztanga', inputType: 'weight_reps' },
  { id: 'uginanie-nadgarstkow-odwrotne', name: 'Odwrotne uginanie nadgarstków', bodyPart: 'przedramiona', equipment: 'sztanga', inputType: 'weight_reps' },
  { id: 'farmer-walk', name: 'Marsz farmera', bodyPart: 'przedramiona', equipment: 'hantle', inputType: 'weighted_bodyweight', secondary: ['plecy'] },
  { id: 'uginanie-mlotkowe-przedramie', name: 'Uginanie odwrotne (reverse curl)', bodyPart: 'przedramiona', equipment: 'sztanga', inputType: 'weight_reps', secondary: ['biceps'] },

  // ===================== NOGI =====================
  { id: 'przysiad-ze-sztanga', name: 'Przysiad ze sztangą (tył)', bodyPart: 'nogi', equipment: 'sztanga', inputType: 'weight_reps', secondary: ['pośladki'] },
  { id: 'przysiad-przodem', name: 'Przysiad przedni (front squat)', bodyPart: 'nogi', equipment: 'sztanga', inputType: 'weight_reps', secondary: ['pośladki'] },
  { id: 'przysiad-hack', name: 'Hack squat (maszyna)', bodyPart: 'nogi', equipment: 'maszyna', inputType: 'weight_reps', secondary: ['pośladki'] },
  { id: 'wykroki-hantle', name: 'Wykroki z hantlami', bodyPart: 'nogi', equipment: 'hantle', inputType: 'weight_reps', secondary: ['pośladki'] },
  { id: 'wykroki-sztanga', name: 'Wykroki ze sztangą', bodyPart: 'nogi', equipment: 'sztanga', inputType: 'weight_reps', secondary: ['pośladki'] },
  { id: 'przysiad-bulgarski', name: 'Przysiad bułgarski', bodyPart: 'nogi', equipment: 'hantle', inputType: 'weight_reps', secondary: ['pośladki'] },
  { id: 'wypychanie-suwnica', name: 'Wypychanie na suwnicy (leg press)', bodyPart: 'nogi', equipment: 'maszyna', inputType: 'weight_reps', secondary: ['pośladki'] },
  { id: 'prostowanie-nog-maszyna', name: 'Prostowanie nóg na maszynie', bodyPart: 'nogi', equipment: 'maszyna', inputType: 'weight_reps' },
  { id: 'uginanie-nog-lezac', name: 'Uginanie nóg leżąc (dwugłowy)', bodyPart: 'nogi', equipment: 'maszyna', inputType: 'weight_reps' },
  { id: 'uginanie-nog-siedzac', name: 'Uginanie nóg siedząc', bodyPart: 'nogi', equipment: 'maszyna', inputType: 'weight_reps' },
  { id: 'przysiad-goblet', name: 'Przysiad goblet', bodyPart: 'nogi', equipment: 'hantle', inputType: 'weight_reps', secondary: ['pośladki'] },
  { id: 'martwy-ciag-na-prostych', name: 'Martwy ciąg na prostych nogach', bodyPart: 'nogi', equipment: 'sztanga', inputType: 'weight_reps', secondary: ['pośladki', 'plecy'] },

  // ===================== POŚLADKI =====================
  { id: 'hip-thrust', name: 'Hip thrust ze sztangą', bodyPart: 'pośladki', equipment: 'sztanga', inputType: 'weight_reps', secondary: ['nogi'] },
  { id: 'glute-bridge', name: 'Mostek biodrowy', bodyPart: 'pośladki', equipment: 'sztanga', inputType: 'weight_reps' },
  { id: 'odwodzenie-maszyna', name: 'Odwodzenie nóg na maszynie', bodyPart: 'pośladki', equipment: 'maszyna', inputType: 'weight_reps' },
  { id: 'kickback-wyciag', name: 'Wymachy nogą w tył na wyciągu', bodyPart: 'pośladki', equipment: 'wyciąg', inputType: 'weight_reps' },
  { id: 'odwodzenie-stojac-guma', name: 'Odwodzenie nóg z gumą', bodyPart: 'pośladki', equipment: 'guma', inputType: 'reps_only' },

  // ===================== ŁYDKI =====================
  { id: 'wspiecia-stojac', name: 'Wspięcia na palce stojąc', bodyPart: 'łydki', equipment: 'maszyna', inputType: 'weight_reps' },
  { id: 'wspiecia-siedzac', name: 'Wspięcia na palce siedząc', bodyPart: 'łydki', equipment: 'maszyna', inputType: 'weight_reps' },
  { id: 'wspiecia-suwnica', name: 'Wspięcia na palce na suwnicy', bodyPart: 'łydki', equipment: 'maszyna', inputType: 'weight_reps' },
  { id: 'wspiecia-hantle', name: 'Wspięcia na palce z hantlami', bodyPart: 'łydki', equipment: 'hantle', inputType: 'weight_reps' },

  // ===================== BRZUCH =====================
  { id: 'brzuszki', name: 'Brzuszki', bodyPart: 'brzuch', equipment: 'masa ciała', inputType: 'reps_only' },
  { id: 'unoszenie-nog-wisz', name: 'Unoszenie nóg w zwisie', bodyPart: 'brzuch', equipment: 'masa ciała', inputType: 'reps_only' },
  { id: 'plank', name: 'Deska (plank)', bodyPart: 'brzuch', equipment: 'masa ciała', inputType: 'duration' },
  { id: 'plank-bok', name: 'Deska bokiem', bodyPart: 'brzuch', equipment: 'masa ciała', inputType: 'duration' },
  { id: 'spiecia-wyciag', name: 'Spięcia brzucha na wyciągu (allahy)', bodyPart: 'brzuch', equipment: 'wyciąg', inputType: 'weight_reps' },
  { id: 'skrety-tulowia-wyciag', name: 'Skręty tułowia na wyciągu (drwal)', bodyPart: 'brzuch', equipment: 'wyciąg', inputType: 'weight_reps' },
  { id: 'russian-twist', name: 'Russian twist', bodyPart: 'brzuch', equipment: 'masa ciała', inputType: 'reps_only' },
  { id: 'rollout-kolko', name: 'Rollout z kółkiem', bodyPart: 'brzuch', equipment: 'inne', inputType: 'reps_only' },
  { id: 'mountain-climbers', name: 'Mountain climbers', bodyPart: 'brzuch', equipment: 'masa ciała', inputType: 'reps_only' },
  { id: 'unoszenie-nog-lawka', name: 'Unoszenie nóg na ławce', bodyPart: 'brzuch', equipment: 'masa ciała', inputType: 'reps_only' },

  // ===================== CARDIO =====================
  { id: 'bieg-bieznia', name: 'Bieg na bieżni', bodyPart: 'cardio', equipment: 'maszyna', inputType: 'distance_duration' },
  { id: 'rower-stacjonarny', name: 'Rower stacjonarny', bodyPart: 'cardio', equipment: 'maszyna', inputType: 'distance_duration' },
  { id: 'orbitrek', name: 'Orbitrek', bodyPart: 'cardio', equipment: 'maszyna', inputType: 'distance_duration' },
  { id: 'wioslarz', name: 'Wioślarz (ergometr)', bodyPart: 'cardio', equipment: 'maszyna', inputType: 'distance_duration', secondary: ['plecy'] },
  { id: 'skakanka', name: 'Skakanka', bodyPart: 'cardio', equipment: 'inne', inputType: 'duration' },
  { id: 'bieg-na-zewnatrz', name: 'Bieg na zewnątrz', bodyPart: 'cardio', equipment: 'masa ciała', inputType: 'distance_duration' },
  { id: 'spacer', name: 'Spacer / marsz', bodyPart: 'cardio', equipment: 'masa ciała', inputType: 'distance_duration' },
  { id: 'stairmaster', name: 'Stairmaster (schody)', bodyPart: 'cardio', equipment: 'maszyna', inputType: 'duration' },

  // ===================== CAŁE CIAŁO / FUNKCJONALNE =====================
  { id: 'thruster', name: 'Thruster (przysiad + wyciskanie)', bodyPart: 'całe ciało', equipment: 'sztanga', inputType: 'weight_reps', secondary: ['nogi', 'barki'] },
  { id: 'clean', name: 'Zarzut (clean)', bodyPart: 'całe ciało', equipment: 'sztanga', inputType: 'weight_reps', secondary: ['nogi', 'plecy'] },
  { id: 'snatch', name: 'Rwanie (snatch)', bodyPart: 'całe ciało', equipment: 'sztanga', inputType: 'weight_reps', secondary: ['nogi', 'barki'] },
  { id: 'clean-and-jerk', name: 'Podrzut (clean & jerk)', bodyPart: 'całe ciało', equipment: 'sztanga', inputType: 'weight_reps', secondary: ['nogi', 'barki'] },
  { id: 'kettlebell-swing', name: 'Wymachy kettlebell', bodyPart: 'całe ciało', equipment: 'kettlebell', inputType: 'weight_reps', secondary: ['pośladki', 'plecy'] },
  { id: 'burpees', name: 'Burpees', bodyPart: 'całe ciało', equipment: 'masa ciała', inputType: 'reps_only' },
  { id: 'turkish-get-up', name: 'Turkish get-up', bodyPart: 'całe ciało', equipment: 'kettlebell', inputType: 'weight_reps' },
];

/** Mapa id → definicja, dla szybkiego dostępu. */
export const EXERCISES_BY_ID: Record<string, ExerciseDef> = Object.fromEntries(
  SEED_EXERCISES.map((e) => [e.id, e])
);
