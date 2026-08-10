# UI Kit (для Flutter)

Справочник визуальных токенов и паттернов веб-приложения CarWash.  
Нужен, чтобы нативный UI (AppBar, status bar, sheets, кнопки) совпадал с WebView.

Связанные доки:

- [flutter-theme.md](./flutter-theme.md) — bridge `set_theme`
- [flutter-locale.md](./flutter-locale.md) — bridge `set_locale`
- [flutter-fullscreen.md](./flutter-fullscreen.md) — bridge `fullscreen` / `map_fullscreen`

Источник правды в коде:

- палитра: `src/lib/themeColors.ts`
- отступы/радиусы: `src/lib/themeLayout.ts`
- CSS-классы: `src/app/globals.css`
- шторка станции на карте: `src/features/home/components/map.css` (`.map-station-sheet`)

---

## 1. Режимы темы

| Режим | `data-theme` / bridge | Описание |
|-------|----------------------|----------|
| Светлая | `light` | фон `#f4f4f5`, блоки белые |
| Тёмная | `dark` | фон `#09090b`, блоки `#18181b` |

Тема **только из настроек приложения**, не из `MediaQuery.platformBrightness` ОС.

Web → Flutter при смене:

```json
{ "action": "set_theme", "theme": "light" }
```

---

## 2. Цветовая палитра (defaults)

Формат: `#RRGGBB`. В Flutter: `Color(0xFFRRGGBB)`.

### Light

| Токен | Hex | Flutter | Назначение |
|-------|-----|---------|------------|
| `background` | `#f4f4f5` | `0xFFF4F4F5` | фон экрана / scaffold |
| `block` | `#ffffff` | `0xFFFFFFFF` | карточки, секции, sheets |
| `hover` | `#ececef` | `0xFFECECEF` | pressed / secondary fill |
| `border` | `#e4e4e7` | `0xFFE4E4E7` | рамки, разделители строк |
| `button` | `#2563eb` | `0xFF2563EB` | CTA primary |
| `buttonHover` | `#1d4ed8` | `0xFF1D4ED8` | CTA pressed |
| `buttonText` | `#ffffff` | `0xFFFFFFFF` | текст на CTA |
| `text` | `#18181b` | `0xFF18181B` | основной текст |
| `description` | `#a1a1aa` | `0xFFA1A1AA` | подписи, hints |
| `danger` | `#dc2626` | `0xFFDC2626` | ошибки, выход, удаление |
| `success` | `#16a34a` | `0xFF16A34A` | успех, «открыто» |
| `warning` | `#d97706` | `0xFFD97706` | внимание / pending |
| `mapWash` | `#38bdf8` | `0xFF38BDF8` | мойка на карте |
| `mapCharging` | `#facc15` | `0xFFFACC15` | ЭЗС на карте |

### Dark

| Токен | Hex | Flutter | Назначение |
|-------|-----|---------|------------|
| `background` | `#09090b` | `0xFF09090B` | scaffold |
| `block` | `#18181b` | `0xFF18181B` | карточки / sheets |
| `hover` | `#27272a` | `0xFF27272A` | pressed |
| `border` | `#3f3f46` | `0xFF3F3F46` | рамки |
| `button` | `#3b82f6` | `0xFF3B82F6` | CTA |
| `buttonHover` | `#2563eb` | `0xFF2563EB` | CTA pressed |
| `buttonText` | `#ffffff` | `0xFFFFFFFF` | текст CTA |
| `text` | `#f4f4f5` | `0xFFF4F4F5` | основной текст |
| `description` | `#a1a1aa` | `0xFFA1A1AA` | подписи |
| `danger` | `#f87171` | `0xFFF87171` | destructive |
| `success` | `#4ade80` | `0xFF4ADE80` | успех |
| `warning` | `#fbbf24` | `0xFFFBBF24` | warning |
| `mapWash` | `#38bdf8` | `0xFF38BDF8` | мойка |
| `mapCharging` | `#facc15` | `0xFFFACC15` | ЭЗС |

### Маппинг в `ColorScheme` (ориентир)

```dart
ColorScheme(
  brightness: Brightness.light, // или dark
  primary: button,
  onPrimary: buttonText,
  secondary: mapWash,           // опционально
  surface: block,
  onSurface: text,
  error: danger,
  onError: buttonText,
  outline: border,
);
```

`Scaffold.backgroundColor` → `background`  
`Card` / `BottomSheet` → `block`

---

## 3. Layout-токены (defaults)

База: **1 rem ≈ 16 logical px**. Базовый шрифт body: **14 px**, line-height **1.45**.

| Токен | Default | ≈ px | Flutter / использование |
|-------|---------|------|-------------------------|
| `pagePadX` | `1rem` | 16 | горизонтальные отступы экрана |
| `pagePadTop` | `0.25rem` | 4 | верх контента |
| `pagePadBottom` | `2rem` | 32 | низ контента (над navbar) |
| `rowPadX` | `1rem` | 16 | padding строк списка |
| `rowPadY` | `0.75rem` | 12 | vertical padding строк |
| `rowGap` | `0.75rem` | 12 | иконка ↔ текст в строке |
| `stackGap` | `1rem` | 16 | зазор между секциями |
| `sectionRadius` | `1rem` | 16 | скругление карточек / sheet top |
| `sectionRadiusSm` | `0.75rem` | 12 | мелкие карточки |
| `buttonRadius` | `0.5rem` | 8 | обычные кнопки |
| `buttonPadX` | `0.75rem` | 12 | padding CTA X |
| `buttonPadY` | `0.5rem` | 8 | padding CTA Y |
| `borderWidth` | `1px` | 1 | рамки секций |
| `fontSize` | `14px` | 14 | body |
| `lineHeight` | `1.45` | — | body |

Минимальная высота основных CTA / touch targets: **48 px**.

---

## 4. Типографика (экранный масштаб)

| Роль | Size | Weight | Цвет |
|------|------|--------|------|
| Заголовок страницы | 18 (`1.125rem`) | 600 | `text` |
| Заголовок в sheet | ~17 (`1.05rem`) | 600–700 | `text` |
| Строка списка (title) | 14 | 600 | `text` |
| Body | 14 | 400 | `text` |
| Description / meta | 13 (`0.8125rem`) | 400 | `description` |
| Caption / chip | 11–12 | 500–600 | `description` или `text` |
| Uppercase label (kind) | 11 | 700 | `button`, letter-spacing ~0.06em |
| Status badge | 10–11 | 500–600 | success / muted |

Шрифт: системный (как в ОС). Отдельный brand-font в вебе не зафиксирован — в Flutter можно `ThemeData.fontFamily` не трогать.

---

## 5. Компоненты / паттерны

### 5.1 Section (карточка-блок)

Веб: `.app-section`

- фон: `block`
- border: `borderWidth` + `border`
- radius: `sectionRadius` (16)
- overflow: clip

Внутри — вертикальный список строк `.app-row` с разделителем `border` между строками.

### 5.2 Row (строка списка)

Веб: `.app-row`

```
padding: 12 vertical × 16 horizontal
gap: 12
align: center
```

Вариант `between`: title слева, value/chevron справа.

### 5.3 Primary button (CTA)

Веб: `.theme-button`

- fill: `button`
- text: `buttonText`
- radius: `buttonRadius` (8)
- pressed: `buttonHover`
- min height на карте/sheet: **48**

### 5.4 Secondary / outline button

Пример: «Маршрут» в station sheet

- border: 1.5 × `button`
- fill: transparent
- text: `button`
- radius: ~14 (`0.85rem`)
- min height: 48

### 5.5 Danger text / action

Цвет текста: `danger` (выход, удаление). Не заливать primary красным без необходимости.

### 5.6 Back control

Текст «Назад» + chevron влево, цвет ≈ `button`, size 14 medium. Без тяжёлой кнопки-карточки.

### 5.7 Status labels (станции)

Писать нейтрально (как вывеска):

| Состояние | Текст (ru) |
|-----------|------------|
| Open | **Открыто** |
| Closed | **Закрыто** |

Не «открыта / в работе».

Часы на сегодня (пример): `сегодня с 09:00 до 22:00` или `сегодня круглосуточно`.  
На экране подробнее: префикс **«Режим сегодня:»** + hours label.

Статусы постов/коннекторов:

| Код | Текст |
|-----|-------|
| free | Свободен |
| busy | Занят |
| offline | Не в сети |

Цвета индикаторов: success / warning / `description` (серый).

Если тариф/мощность неизвестны: **«Информация отсутствует»** (не «—»).

### 5.8 Bottom sheet станции на карте

Веб: `.map-station-sheet` — открывается по тапу на объект карты.

| Свойство | Значение |
|----------|----------|
| Высота | **70% экрана** (`70dvh`) |
| Позиция | bottom, full width |
| Radius top | `sectionRadius` (16) |
| Фон | `block` |
| Handle | тонкая полоска сверху (~4×36), цвет muted |
| Photo | высота 140, если есть |
| Hero без фото | высота 72, градиент wash/charging |
| CTA row | 2 кнопки: outline «Маршрут» + filled «Сканировать QR» |
| Footer | ссылка «Подробнее» |

Контент внутри scrollable. Backdrop затемняет карту, tap → close.

### 5.9 Map markers

| Тип | Цвет токена |
|-----|-------------|
| Мойка | `mapWash` `#38BDF8` |
| ЭЗС | `mapCharging` `#FACC15` |

Иконка ЭЗС в списках: bolt на жёлтом квадрате ~36×36, radius 12.

### 5.10 Toast / feedback

Короткий snackbar/toast, role=status. Цвета: `block` + `text`, ошибка — `danger`.

---

## 6. Рекомендуемый Flutter skeleton

```dart
class AppColors {
  const AppColors({
    required this.background,
    required this.block,
    required this.hover,
    required this.border,
    required this.button,
    required this.buttonHover,
    required this.buttonText,
    required this.text,
    required this.description,
    required this.danger,
    required this.success,
    required this.warning,
    required this.mapWash,
    required this.mapCharging,
  });

  final Color background;
  final Color block;
  final Color hover;
  final Color border;
  final Color button;
  final Color buttonHover;
  final Color buttonText;
  final Color text;
  final Color description;
  final Color danger;
  final Color success;
  final Color warning;
  final Color mapWash;
  final Color mapCharging;

  static const light = AppColors(
    background: Color(0xFFF4F4F5),
    block: Color(0xFFFFFFFF),
    hover: Color(0xFFECECEF),
    border: Color(0xFFE4E4E7),
    button: Color(0xFF2563EB),
    buttonHover: Color(0xFF1D4ED8),
    buttonText: Color(0xFFFFFFFF),
    text: Color(0xFF18181B),
    description: Color(0xFFA1A1AA),
    danger: Color(0xFFDC2626),
    success: Color(0xFF16A34A),
    warning: Color(0xFFD97706),
    mapWash: Color(0xFF38BDF8),
    mapCharging: Color(0xFFFACC15),
  );

  static const dark = AppColors(
    background: Color(0xFF09090B),
    block: Color(0xFF18181B),
    hover: Color(0xFF27272A),
    border: Color(0xFF3F3F46),
    button: Color(0xFF3B82F6),
    buttonHover: Color(0xFF2563EB),
    buttonText: Color(0xFFFFFFFF),
    text: Color(0xFFF4F4F5),
    description: Color(0xFFA1A1AA),
    danger: Color(0xFFF87171),
    success: Color(0xFF4ADE80),
    warning: Color(0xFFFBBF24),
    mapWash: Color(0xFF38BDF8),
    mapCharging: Color(0xFFFACC15),
  );
}

class AppLayout {
  static const pagePadX = 16.0;
  static const pagePadTop = 4.0;
  static const pagePadBottom = 32.0;
  static const rowPadX = 16.0;
  static const rowPadY = 12.0;
  static const rowGap = 12.0;
  static const stackGap = 16.0;
  static const sectionRadius = 16.0;
  static const sectionRadiusSm = 12.0;
  static const buttonRadius = 8.0;
  static const sheetButtonRadius = 14.0;
  static const borderWidth = 1.0;
  static const fontSize = 14.0;
  static const lineHeight = 1.45;
  static const touchMin = 48.0;
  static const stationSheetHeightFactor = 0.70;
}
```

Sheet станции:

```dart
showModalBottomSheet(
  context: context,
  isScrollControlled: true,
  backgroundColor: colors.block,
  shape: const RoundedRectangleBorder(
    borderRadius: BorderRadius.vertical(top: Radius.circular(AppLayout.sectionRadius)),
  ),
  builder: (_) => SizedBox(
    height: MediaQuery.sizeOf(context).height * AppLayout.stationSheetHeightFactor,
    child: /* StationSheet content */,
  ),
);
```

---

## 7. Checklist для нативного UI

- [ ] Light/dark берутся из bridge `set_theme`, не из системы
- [ ] Scaffold = `background`, cards/sheets = `block`
- [ ] Primary CTA = `button` / pressed `buttonHover`
- [ ] Secondary text = `description`
- [ ] Статус станции: **Открыто** / **Закрыто**
- [ ] Sheet объекта на карте ≈ **70%** высоты
- [ ] Touch targets ≥ 48
- [ ] Маркеры: wash `#38BDF8`, charging `#FACC15`
- [ ] При fullscreen (сторис) прятать AppBar + bottom nav (можно снять top SafeArea)
- [ ] При map_fullscreen (шторка станции) прятать bottom nav, **top SafeArea оставить**

---

## 8. Что не копировать 1-в-1

- Пользователь может переопределить палитру/layout в профиле веб-приложения (`localStorage`). Defaults выше — стартовая точка для Flutter chrome.
- Hover на тач-устройствах в вебе отключён; в Flutter ориентируйтесь на `pressed` / InkWell splash через `hover`.
- Контент внутри WebView уже стилизован — этот kit в первую очередь для **нативной оболочки** и любых экранов вне WebView.
