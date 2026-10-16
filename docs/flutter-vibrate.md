# Flutter: vibrate

Web просит вибрацию устройства (экран «Вас ждут» / invited).

## Event (Web → Flutter)

```json
{ "action": "vibrate", "pattern": "invite" }
```

| Поле | Значение |
|------|----------|
| `action` | всегда `vibrate` |
| `pattern` | `invite` (мойка ждёт) или `default` |

## Когда шлёт Web

Статус сессии мойки = `invited` («Вас ждут»):

1. сразу 1-й раз  
2. ещё раз через 10 сек, если всё ещё `invited`  
3. ещё раз через 10 сек — **максимум 3 раза**  
4. если пользователь заехал / статус сменился — больше не шлёт

## Flutter

```dart
if (action == 'vibrate') {
  // достаточно короткой сильной вибрации
  HapticFeedback.heavyImpact();
  // или пакет vibration:
  // Vibration.vibrate(duration: 200);
}
```

`pattern` можно игнорировать на первом этапе — главное вибрировать.
