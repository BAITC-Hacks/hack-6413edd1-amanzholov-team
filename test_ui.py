"""Optional end-to-end check: python test_ui.py. Requires Playwright."""
import json
import tempfile
import threading
from pathlib import Path
import server


def run():
    from playwright.sync_api import sync_playwright, expect
    original_db = server.DB_PATH
    with tempfile.TemporaryDirectory() as temp:
        server.DB_PATH = Path(temp) / 'ui.db'
        server.initialize()
        http = server.ThreadingHTTPServer(('127.0.0.1', 0), server.Handler)
        thread = threading.Thread(target=http.serve_forever, daemon=True)
        thread.start()
        base = f'http://127.0.0.1:{http.server_port}'
        screenshots = server.ROOT / 'data'
        screenshots.mkdir(exist_ok=True)
        try:
            with sync_playwright() as playwright:
                browser = playwright.chromium.launch()
                page = browser.new_page(viewport={'width': 1440, 'height': 1000}, device_scale_factor=1)
                errors = []
                page.on('pageerror', lambda error: errors.append(str(error)))
                page.goto(base)
                expect(page.locator('.hero')).to_be_visible()
                page.screenshot(path=str(screenshots / 'desktop-preview.png'), full_page=True, animations='disabled')
                assert not page.evaluate('document.documentElement.scrollWidth > innerWidth')
                page.locator('[data-course="systems"]').click()
                page.locator('input[name="answer"][value="2"]').check()
                page.locator('#course-form button[type="submit"]').click()
                expect(page.locator('#quiz-error')).to_contain_text('Пока не совсем верно')
                page.locator('input[name="answer"][value="0"]').check()
                page.locator('#course-form button[type="submit"]').click()
                expect(page.locator('#dialog-title')).to_have_text('Ещё один шаг вперёд!')
                expect(page.locator('.success-progress')).to_contain_text('83%')
                page.locator('[data-action="view-progress"]').click()
                expect(page.locator('.progress-ring')).to_contain_text('83%')
                page.reload()
                expect(page.locator('.profile-card .progress-label')).to_contain_text('83%')
                page.locator('.nav [data-page="history"]').click()
                expect(page.locator('.history-row')).to_have_count(1)
                page.locator('.nav [data-page="activities"]').click()
                page.locator('[data-save="research"]').click()
                page.locator('[data-filter="saved"]').click()
                expect(page.locator('.course-card')).to_have_count(1)
                page.locator('[data-action="search"]').click()
                page.locator('#modal-search').fill('интервью')
                expect(page.locator('.search-result')).to_have_count(1)
                page.locator('[data-action="close-modal"]').click()
                page.locator('[data-role="hr"]').click()
                expect(page.locator('.hr-stats')).to_contain_text('17')
                page.screenshot(path=str(screenshots / 'hr-preview.png'), full_page=True, animations='disabled')
                page.locator('.nav [data-page="team"]').click()
                page.locator('[data-filter="no-step"]').click()
                expect(page.locator('.team-table tbody tr')).to_have_count(1)
                expect(page.locator('.team-table')).to_contain_text('Арман Омаров')
                page.locator('.nav [data-page="import"]').click()
                records = [{'name':'Тест Жюри','role':'Дизайнер','grade':'Middle','skills':{'UX-исследования':35},'target':{'UX-исследования':80}}]
                page.locator('#import-file').set_input_files({'name':'jury.json','mimeType':'application/json','buffer':json.dumps(records,ensure_ascii=False).encode()})
                page.locator('[data-action="import"]').click()
                expect(page.locator('#import-result')).to_contain_text('Добавлено профилей: 1')
                page.locator('#import-result [data-person]').click()
                expect(page.locator('.profile-card')).to_contain_text('Тест Жюри')
                expect(page.locator('.course-card')).to_have_count(3)
                for target in ['route','activities','profile','history','overview']:
                    page.locator(f'.nav [data-page="{target}"]').click()
                    assert not page.evaluate('document.documentElement.scrollWidth > innerWidth'), target
                mobile = browser.new_page(viewport={'width':390,'height':844}, is_mobile=True, has_touch=True, device_scale_factor=1)
                mobile.on('pageerror', lambda error: errors.append(str(error)))
                mobile.goto(base)
                expect(mobile.locator('.hero')).to_be_visible()
                assert not mobile.evaluate('document.documentElement.scrollWidth > innerWidth')
                mobile.screenshot(path=str(screenshots / 'mobile-preview.png'), full_page=True, animations='disabled')
                mobile.locator('[data-action="toggle-menu"]').click()
                expect(mobile.locator('#sidebar')).to_have_class('sidebar open')
                mobile.locator('[data-action="close-menu"]').click()
                expect(mobile.locator('#sidebar')).to_have_class('sidebar')
                mobile.locator('[data-course]').first.click()
                expect(mobile.locator('#modal')).to_be_visible()
                assert not mobile.evaluate('document.documentElement.scrollWidth > innerWidth')
                mobile.locator('[data-action="close-modal"]').click()
                mobile.locator('[data-action="toggle-menu"]').click()
                mobile.locator('[data-role="hr"]').click()
                expect(mobile.locator('.hr-stats')).to_be_visible()
                assert not mobile.evaluate('document.documentElement.scrollWidth > innerWidth')
                browser.close()
                assert not errors, errors
                print('PASS: completion, persistence, quiz validation, bookmarks, search, HR, import, mobile. No JavaScript errors.')
        finally:
            http.shutdown()
            http.server_close()
            thread.join()
            server.DB_PATH = original_db


if __name__ == '__main__':
    run()
