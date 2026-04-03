# RTM_KP_GEN

Статическая версия генератора КП для GitHub Pages.

Что внутри:
- интерфейс живет в `docs/`
- PDF собирается прямо в браузере, без Flask и VPS
- для публикации используй стандартный режим GitHub Pages: ветка `main`, папка `/docs`

Локальный запуск:

```bash
cd docs
python3 -m http.server 8000
```

После пуша в `main` включи GitHub Pages в настройках репозитория:

1. `Settings`
2. `Pages`
3. `Source` → `Deploy from a branch`
4. `Branch` → `main`
5. `Folder` → `/docs`
