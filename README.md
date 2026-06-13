# 🐼 Panda Strength

Aplikacja na iPhone'a do śledzenia treningu siłowego — wierny klon aplikacji typu **Strong / Stronger / Strive**. Logujesz serie na żywo, śledzisz postępy, bijesz rekordy.

Zbudowana w **React Native + Expo (SDK 54)** + TypeScript, więc działa na iPhonie, choć powstała na Windowsie. Dane trzymane lokalnie (SQLite) — apka działa w pełni **offline**. Interfejs po polsku, domyślnie kilogramy (przełącznik na funty).

> ℹ️ Projekt celowo używa **SDK 54** — to najnowsza wersja, którą wspiera **Expo Go z App Store** (Apple opóźnia zatwierdzanie nowszych Expo Go). Dzięki temu wystarczy zeskanować QR i apka działa, bez TestFlight ani konta Apple.

---

## ✨ Co potrafi

**Trening na żywo (serce apki)**
- Tabela serii `Seria · Poprzednio · Kg · Powt. · ✓` jak w Strong
- Kolumna **„Poprzednio"** automatycznie pokazuje wynik z ostatniej sesji (klucz do progresji)
- Tap ✓ → wiersz zielenieje, wibracja, **automatyczny timer odpoczynku** + powiadomienie
- **Kalkulator talerzy** — pokazuje, co założyć na sztangę
- Typy serii (zwykła / rozgrzewkowa / drop / failure) — long-press na numerze serii
- RPE / RIR, supersety, notatki
- Różne typy ćwiczeń mają różne pola (sztanga: ciężar+powt.; plank: czas; bieg: dystans+czas)

**Biblioteka ćwiczeń** — ~160 wbudowanych ćwiczeń po polsku, filtr po partii/sprzęcie, dodawanie własnych.

**Rutyny** — twórz szablony treningów z docelowymi seriami i zaczynaj sesję jednym tapnięciem.

**Historia** — wszystkie treningi z wolumenem, czasem i odznakami rekordów; podgląd, usuwanie, „powtórz trening".

**Statystyki** — zbiorcze liczby („Wrapped"), wykres wolumenu w czasie, wolumen wg partii, szacowany **1RM** (wzór Epleya), oraz **Strength Score** (siła względem masy ciała: Początkujący → Światowa klasa).

**Pomiary ciała**, **dark mode**, kg/lb, eksport danych do JSON.

---

## 🚀 Jak uruchomić na swoim iPhonie (za darmo, bez Maca)

Aplikacja powstała na Windowsie. iOS natywnie buduje się tylko na macOS — dlatego do testów używamy **Expo Go**: darmowej aplikacji, która uruchamia kod prosto z Twojego komputera na telefonie. **Nie potrzebujesz Maca ani konta Apple.**

### Krok po kroku

1. **Na iPhonie** zainstaluj **Expo Go** z App Store:
   👉 https://apps.apple.com/app/expo-go/id982107779

2. **Na komputerze** (w folderze projektu) zainstaluj zależności (raz):
   ```powershell
   npm install
   ```

3. Uruchom serwer deweloperski:
   ```powershell
   npx expo start
   ```
   W terminalu pojawi się **kod QR**.

4. **Zeskanuj kod QR** aparatem iPhone'a (lub z poziomu Expo Go).
   > Telefon i komputer muszą być w tej samej sieci Wi-Fi. Jeśli QR nie działa (np. sieć firmowa), uruchom z tunelem:
   > ```powershell
   > npx expo start --tunnel
   > ```

5. Aplikacja załaduje się na telefonie. Edytujesz kod na komputerze → zmiany pojawiają się na żywo.

### Szybki test, że wszystko działa
1. Zakładka **Trening** → „Rozpocznij pusty trening".
2. „Dodaj ćwiczenie" → wybierz np. *Wyciskanie sztangi na ławce płaskiej*.
3. Wpisz ciężar i powtórzenia, tap **✓** → wiersz zielenieje, rusza timer odpoczynku.
4. „Zakończ" → zobacz podsumowanie (i rekord, bo to pierwszy raz 💪).
5. Sprawdź zakładki **Historia** i **Statystyki**.

---

## 📲 Droga do App Store (gdy zechcesz opublikować)

Można to zrobić **z Windowsa** dzięki chmurze Expo (EAS) — bez Maca. Jedyny koszt to konto **Apple Developer (99 USD/rok)**, wymagane przez Apple do publikacji.

```powershell
npm install -g eas-cli
eas login                  # zaloguj się / załóż darmowe konto Expo
eas build -p ios           # buduje plik .ipa w chmurze (poprosi o dane Apple)
eas submit -p ios          # wysyła do TestFlight / App Store
```

`eas.json` jest już skonfigurowany (profile `development`, `preview`, `production`).

---

## 🧑‍💻 Co musisz zrobić Ty (czego nie da się zautomatyzować)

| # | Działanie | Kiedy potrzebne |
|---|-----------|-----------------|
| 1 | Zainstalować **Expo Go** na iPhonie i zeskanować QR | Do darmowego testowania (teraz) |
| 2 | Założyć darmowe konto **Expo** i `eas login` | Tylko jeśli chcesz budować przez chmurę |
| 3 | Kupić **Apple Developer** (99 USD/rok) | Tylko do TestFlight / App Store |
| 4 | Zatwierdzić podpisywanie Apple przy `eas build` | Tylko przy publikacji |

Wszystko inne — kod, baza, ekrany, logika — jest gotowe.

---

## 🛠️ Stack techniczny

| Warstwa | Technologia |
|---------|-------------|
| Framework | Expo SDK 54 · React Native 0.81 · TypeScript |
| Nawigacja | expo-router (taby + ekrany modalne) |
| Baza danych | expo-sqlite + Drizzle ORM (offline-first) |
| Stan | Zustand (sesja treningu, ustawienia) |
| Wykresy | react-native-gifted-charts |
| Powiadomienia | expo-notifications (lokalne — timer odpoczynku) |
| Haptyka | expo-haptics |

## 📁 Struktura

```
src/
├─ app/            ← ekrany (expo-router): (tabs), workout, routine, exercise, measurement
├─ components/     ← UI + komponenty treningu (SetRow, ExerciseCard, RestTimerBar, ...)
├─ db/             ← schema Drizzle, klient SQLite, repozytoria, seed, backup
├─ lib/            ← czysta logika: 1RM, talerze, formatowanie, Strength Score, ...
├─ store/          ← Zustand: aktywny trening, ustawienia
├─ theme/          ← kolory, dark mode, tokeny
└─ data/           ← ~160 wbudowanych ćwiczeń (PL)
```

## 🧪 Sprawdzanie poprawności

```powershell
npm test            # 55 testów logiki (1RM, talerze, konwersja kg/lb, Strength Score, ...)
npm run typecheck   # kontrola typów TypeScript (0 błędów)
```

---

*Panda Strength · offline-first tracker treningu siłowego · interfejs po polsku.*
