# RTM_KP_GEN

Статическая версия генератора КП для GitHub Pages.

Что внутри:
- интерфейс живет в `docs/`
- PDF собирается прямо в браузере, без Flask и VPS
- публикация на Pages настроена через `.github/workflows/deploy-pages.yml`

Локальный запуск:

```bash
cd docs
python3 -m http.server 8000
```

После пуша в `main` GitHub Actions публикует содержимое `docs/` в Pages.
