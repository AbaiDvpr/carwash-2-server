# Flutter → Web: открыть drawer станции

После скана QR (наш домен `?id=&type=`) Flutter **сам** переключает navbar на `map`, затем шлёт event в WebView карты.

React **не** переключает navbar. Только открывает drawer.

При открытии QR шторку **не** закрываем: случайный тап — пользователь вернётся, drawer на месте.

## Event

```json
{
  "action": "open_station",
  "id": "1",
  "type": "cw"
}
```

| Поле | Значения | Обязательно |
|------|----------|-------------|
| `action` | `open_station` (или `open_drawer`) | да |
| `id` | location id, напр. `"1"` или `"ev-1"` | да (`station` — алиас) |
| `type` | `cw` / `wash` / `ev` / `charging` | желательно |

## Flutter (после QR)

1. Распарсить URL: `https://cs.masnaget.kz/?id=1&type=cw`
2. Если наш хост + есть `id`/`type` — **не** открывать внешний браузер
3. Navbar → `map`
4. В WebView карты вызвать:

```dart
// пример
controller.runJavascript(
  "window.CarWashNativeReceive(${jsonEncode({
    'action': 'open_station',
    'id': id,
    'type': type, // cw | ev
  })});"
);
```

Либо тот же JSON через ваш существующий канал Flutter → `CarWashNativeReceive`.

## Чужой QR

Не наш домен / нет `id`+`type` — поведение как раньше (браузер / игнор).
