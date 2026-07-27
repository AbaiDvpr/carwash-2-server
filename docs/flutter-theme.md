# Flutter: смена темы

Web → Native при выборе светлой/тёмной темы и при старте (sync текущего):

```json
{ "action": "set_theme", "theme": "light" }
```

`theme`: `light` | `dark`

## Flutter

```dart
if (action == 'set_theme') {
  final theme = payload['theme'] as String?; // light | dark
  if (theme == null) return;
  // сохранить и применить нативный UI (AppBar, status bar, system UI)
}
```
