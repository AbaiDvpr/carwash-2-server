# localStorage — ключи сессии HiPoint Frontend

Все данные сессии хранятся в `window.localStorage` (не в `sessionStorage`).
Код: `src/lib/authToken.ts`, `src/lib/userSession.ts`, `src/lib/forceLogout.ts`.

Режима гостя нет: без валидного `access_token` вызывается `forceLogout()`.

---

## Сводка ключей

| Ключ | Пример значения | Кто пишет | Обязательный | Очищается при logout |
|------|-----------------|-----------|--------------|----------------------|
| `access_token` | Passport Bearer JWT/opaque | Frontend (login) | **Да** | Да |
| `user_id` | `"12"` | Frontend (login / user_info) | **Да** | Да |
| `user_name` | `"Иван Иванов"` | Frontend (кэш профиля) | Нет | Да |
| `source` | `"mobile"` | Native (Flutter WebView) | **Да** (для доступа) | Да |
| `carwash_access` | `"true"` | Frontend (после проверки mobile) | Нет (флаг) | Да |
| `email` | `"user@mail.com"` | Native (legacy) | Нет | Да |
| `header_true` | `"true"` | Native | Нет | **Нет** |

---

## Обязательные для авторизованной сессии

### `access_token`

- **Тип:** string  
- **Назначение:** Bearer-токен Laravel Passport для API (`Authorization: Bearer …`).  
- **Когда ставится:** после успешного `POST /api/auth/login` (`persistSession` в `src/lib/api/auth.ts`).  
- **Когда читается:** все защищённые запросы (`src/lib/api.ts`), `MobileAccessGate`, `useAuthUser`.  
- **Если нет / 401:** `forceLogout()` → revoke на сервере + очистка storage + native logout.

### `user_id`

- **Тип:** string (число как строка, напр. `"12"`)  
- **Назначение:** id текущего пользователя (не email).  
- **Когда ставится:** login / `GET /api/auth/user_info` / `cacheUserProfile`.  
- **Примечание:** раньше ориентировались на email — сейчас identity = `user_id` + токен.

---

## Mobile / WebView

### `source`

- **Тип:** string  
- **Ожидаемое значение:** `mobile`  
- **Кто пишет:** нативное приложение (Flutter), не веб-логин.  
- **Зачем:** сайт открывается только из мобильного CarWash.  
  Доступ считается выданным, если `source === "mobile"` и есть `access_token`.

### `carwash_access`

- **Тип:** string, только `"true"`  
- **Кто пишет:** frontend (`grantAccess()`), когда уже подтверждён mobile + токен.  
- **Зачем:** не гонять повторную проверку после refresh страницы.  
- **Условие «доступ уже есть»:** `carwash_access === "true"` **и** `source === "mobile"`.

### `header_true`

- **Тип:** string, `"true"` = показать навигацию/хедер в стиле web.  
- **Кто пишет:** Native.  
- **Читает:** `isHeaderNavigationEnabled()`.  
- **Logout:** не удаляется (`revokeAccess` / `forceLogout` этот ключ не трогают).

### `email` (legacy)

- **Тип:** string | null  
- **Кто пишет:** Native (исторически).  
- **Читает:** UI/debug сессии (`readUserSession`, `useAppEnvironment`).  
- **Auth API:** вход по phone + password; email в localStorage для логина не нужен.

---

## Опциональный кэш UI

### `user_name`

- **Тип:** string — `"Name LastName"`  
- **Кто пишет:** `cacheUserProfile()` после login / user_info.  
- **Зачем:** отображение имени без лишнего запроса.  
- Источник истины по профилю — API `user_info`.

---

## Пример «живой» сессии (DevTools)

```text
access_token    = eyJ... / passport-token...
user_id         = 12
user_name       = Иван Иванов
source          = mobile
carwash_access  = true
header_true     = true          # опционально
email           = (может отсутствовать)
```

Минимум для работы приложения:

```text
access_token  = <token>
user_id       = <id>
source        = mobile
```

После первого успешного gate добавится:

```text
carwash_access = true
```

---

## Очистка при logout

`forceLogout()`:

1. `POST /api/auth/logout` с текущим Bearer (если токен есть)
2. Удаляет: `access_token`, `user_id`, `carwash_access`, `email`, `user_name`, `source`
3. Вызывает native logout (`navbarController`)

Не трогает: `header_true`.

---

## Где в коде

| Файл | Роль |
|------|------|
| `src/lib/authToken.ts` | `access_token`, `user_id` |
| `src/lib/userSession.ts` | `user_name`, `source`, `carwash_access`, `email`, `header_true` |
| `src/lib/forceLogout.ts` | полный logout |
| `src/lib/api/auth.ts` | запись токена/профиля после login |
| `src/components/layout/MobileAccessGate.tsx` | проверка mobile + токена |
