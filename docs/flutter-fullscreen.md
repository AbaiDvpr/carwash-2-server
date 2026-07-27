# Flutter: fullscreen

При открытии сториса:

```json
{ "action": "fullscreen", "enabled": true }
```

При закрытии:

```json
{ "action": "fullscreen", "enabled": false }
```

## Flutter

```dart
if (action == 'fullscreen') {
  final enabled = data['enabled'] == true;
  setState(() {
    showAppBar = !enabled;
    showBottomNav = !enabled;
  });
}
```

`enabled: true` — fullscreen, спрятать header + navbar.  
`enabled: false` — вернуть обратно.
