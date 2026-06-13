// Konfiguracja Metro. Bazuje na domyślnej z expo (`getDefaultConfig`),
// z dwoma dodatkami potrzebnymi wyłącznie do uruchomienia apki na WEBIE:
//
// 1) `.wasm` jako zasób — `expo-sqlite` ładuje `wa-sqlite.wasm`; bez tego
//    bundler nie potrafi rozwiązać importu i web pada na biały ekran.
//
// 2) Nagłówki COOP/COEP (cross-origin isolation) — wa-sqlite używa
//    `SharedArrayBuffer`, który przeglądarka udostępnia tylko stronom
//    izolowanym cross-origin. Bez tych nagłówków leci błąd
//    „SharedArrayBuffer is not defined". Dotyczy tylko dev-servera web;
//    na iOS/Android (natywne SQLite) nie ma to znaczenia.
const { getDefaultConfig } = require('expo/metro-config');
const connect = require('connect');

const config = getDefaultConfig(__dirname);

if (!config.resolver.assetExts.includes('wasm')) {
  config.resolver.assetExts.push('wasm');
}

config.server.enhanceMiddleware = (metroMiddleware) => {
  return connect()
    .use((req, res, next) => {
      res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
      res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
      next();
    })
    .use(metroMiddleware);
};

module.exports = config;
