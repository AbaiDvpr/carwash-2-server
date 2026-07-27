# Flutter: смена языка

Web → Native при выборе языка в профиле и при старте (sync текущего):

```json
{ "action": "set_locale", "locale": "ru" }
```

`locale`: `ru` | `kz` | `en`

## Flutter

```dart
if (action == 'set_locale') {
  final locale = payload['locale'] as String?; // ru | kz | en
  if (locale == null) return;
  // сохранить (SharedPreferences) и обновить локаль приложения
}
```
