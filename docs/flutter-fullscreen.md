# Flutter: fullscreen / map_fullscreen

Два разных action. Не смешивать.

## 1. `fullscreen` — сторис / модалки

При открытии сториса:

```json
{ "action": "fullscreen", "enabled": true }
```

При закрытии:

```json
{ "action": "fullscreen", "enabled": false }
```

### Flutter

```dart
if (action == 'fullscreen') {
  final enabled = data['enabled'] == true;
  setState(() {
    showAppBar = !enabled;
    showBottomNav = !enabled;
    // edge-to-edge: можно убирать top SafeArea / status bar padding
  });
}
```

`enabled: true` — спрятать AppBar + bottom nav, контент под status bar (safe-area top снимается).

---

## 2. `map_fullscreen` — шторка станции на карте

Когда на карте открыт full-size блок с фото станции:

```json
{ "action": "map_fullscreen", "enabled": true }
```

При закрытии шторки:

```json
{ "action": "map_fullscreen", "enabled": false }
```

### Flutter

```dart
if (action == 'map_fullscreen') {
  final enabled = data['enabled'] == true;
  setState(() {
    showBottomNav = !enabled;
    // AppBar можно прятать, если он есть на этом экране
    // ВАЖНО: top SafeArea / status bar padding НЕ убирать
  });
}
```

Отличие от `fullscreen`: **safe-area top остаётся**. Web сам не дублирует `env(safe-area-inset-top)` на title-bar фото — отступ сверху контролирует Flutter.
