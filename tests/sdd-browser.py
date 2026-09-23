"""Browser checks for the compact workbench.

python3 tests/sdd-browser.py [demo-url]
Requires Playwright; SDD_CHROMIUM optionally selects a Chromium executable.
SDD_SCREENSHOTS optionally selects a directory for review screenshots.
"""
import os
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

URL = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:4000/cs3300_m26/demos/sdd-workbench/'
OPTIONS = {'headless': True}
if os.environ.get('SDD_CHROMIUM'):
    OPTIONS['executable_path'] = os.environ['SDD_CHROMIUM']


def screenshot(page, name):
    if os.environ.get('SDD_SCREENSHOTS'):
        folder = Path(os.environ['SDD_SCREENSHOTS'])
        folder.mkdir(parents=True, exist_ok=True)
        page.screenshot(path=str(folder / name), full_page=True)


def fits(page):
    """Core controls and all three panels fit, with no page scrolling."""
    size = page.viewport_size
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'horizontal overflow'
    assert page.evaluate('document.documentElement.scrollHeight <= innerHeight + 1'), 'vertical overflow'
    assert page.evaluate('scrollY === 0'), 'page moved while using controls'
    for selector in ('.sdd-app-header', '.sdd-toolbar', '.sdd-input-card', '.sdd-state-card', '.sdd-result-card', '#sdd-status'):
        rect = page.locator(selector).bounding_box()
        assert rect and rect['height'] > 0, selector
        assert rect['x'] >= -1 and rect['y'] >= -1, (selector, rect)
        assert rect['x'] + rect['width'] <= size['width'] + 1, (selector, rect)
        assert rect['y'] + rect['height'] <= size['height'] + 1, (selector, rect)


with sync_playwright() as p:
    browser = p.chromium.launch(**OPTIONS)
    page = browser.new_page(viewport={'width': 1366, 'height': 768})
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(URL)
    expect(page.locator('#sdd-status')).to_contain_text('8 attribute equations')
    fits(page)
    page.locator('#sdd-next').click()
    expect(page.locator('#sdd-count')).to_have_text('1 / 8 equations')
    expect(page.locator('#sdd-dependencies')).to_contain_text('Leaf(id.lexeme)')
    page.locator('#sdd-finish').click()
    expect(page.locator('#sdd-result-note')).to_have_text('Root AST: -(x, *(2, y))')
    fits(page)
    screenshot(page, 'sdd-desktop.png')
    page.locator('#sdd-tree-full').click()
    expect(page.locator('#sdd-tree-full')).to_have_attribute('aria-pressed', 'true')
    page.locator('#sdd-tree [data-node="1"]').click()
    page.locator('[data-dialog=inspection]').click()
    expect(page.locator('#sdd-inspection-dialog')).to_be_visible()
    expect(page.locator('#sdd-node-detail')).to_contain_text('n1')
    page.locator('#sdd-inspection-dialog [data-close]').click()
    page.locator('#sdd-tree-full').click()

    # Inherited attributes, stepping backwards, arithmetic execution and temps.
    page.locator('[data-preset=inherited]').click()
    page.locator('#sdd-finish').click()
    expect(page.locator('#sdd-result-note')).to_have_text('Root AST: -(-(x, *(2, y)), z)')
    page.locator('#sdd-prev').click()
    expect(page.locator('#sdd-count')).to_have_text('21 / 22 equations')
    page.locator('[data-preset=arithmetic]').click()
    expect(page.locator('#sdd-run')).to_be_disabled()
    page.locator('#sdd-finish').click()
    page.locator('#sdd-run').click()
    expect(page.locator('#sdd-run-status')).to_contain_text('Result: 4')
    expect(page.locator('#sdd-run-values')).to_contain_text('%t')
    fits(page)

    # The IR listing is shared by translation/execution, not duplicated below.
    page.locator('[data-preset=boolean]').click()
    page.locator('#sdd-finish').click()
    page.locator('#sdd-run').click()
    expect(page.locator('#sdd-run-status')).to_contain_text('Result: true')
    assert page.locator('#sdd-result .is-skipped').count() == 9
    assert page.locator('.sdd-ir-list').count() == 1
    page.locator('#sdd-env').fill('x=250, y=250')
    expect(page.locator('#sdd-run-controls')).to_be_hidden()
    assert page.locator('#sdd-result .is-skipped').count() == 0
    page.locator('#sdd-run').click()
    expect(page.locator('#sdd-run-status')).to_contain_text('Result: false')
    page.locator('#sdd-input').fill('x <')
    expect(page.locator('#sdd-workspace')).to_be_hidden()
    expect(page.locator('#sdd-next')).to_be_disabled()
    page.locator('#sdd-form button').click()
    expect(page.locator('#sdd-status')).to_contain_text('Cannot parse')

    # The rule editor is a modal; errors stay visible there and Escape closes it.
    page.locator('[data-preset=ast]').click()
    page.locator('#sdd-input').fill('x')
    page.locator('[data-dialog=rules]').click()
    page.locator('#sdd-source').fill('S -> id\n self.node = self.node')
    page.locator('#sdd-apply-rules').click()
    expect(page.locator('#sdd-rule-error')).to_contain_text('Cyclic')
    expect(page.locator('#sdd-rules-dialog')).to_be_visible()
    page.locator('#sdd-source').fill('S -> id\n self.node = Leaf("<script>alert(1)</script>")')
    page.locator('#sdd-apply-rules').click()
    expect(page.locator('#sdd-rules-dialog')).to_be_hidden()
    page.locator('#sdd-finish').click()
    assert page.locator('#sdd-result script').count() == 0
    expect(page.locator('#sdd-result-note')).to_contain_text('<script>alert(1)</script>')
    page.locator('[data-dialog=rules]').click()
    page.locator('#sdd-restore').click()
    page.keyboard.press('Escape')
    expect(page.locator('#sdd-rules-dialog')).to_be_hidden()
    page.locator('#sdd-play').click()
    expect(page.locator('#sdd-count')).not_to_have_text('0 / 8 equations')
    page.locator('#sdd-play').click()
    page.locator('[data-dialog=help]').click()
    expect(page.locator('#sdd-help-dialog')).to_be_visible()
    page.keyboard.press('Escape')

    # Whole programs have one source view; Edit source brings back the editor.
    page.locator('[data-preset=program]').click()
    expect(page.locator('#sdd-input')).to_be_hidden()
    expect(page.locator('#sdd-source-preview')).to_be_visible()
    expect(page.locator('#sdd-result-title')).to_have_text('Generated IR')
    page.locator('#sdd-result [data-instruction="0"]').click()
    expect(page.locator('#sdd-source-preview .is-current')).to_contain_text('i = 1;')
    expect(page.locator('#sdd-dependencies')).to_contain_text('copy(id.lexeme, E.addr)')
    fits(page)
    screenshot(page, 'sdd-program-desktop.png')
    page.locator('#sdd-run').click()
    expect(page.locator('#sdd-run-output')).to_have_text('65')
    expect(page.locator('#sdd-run-values')).to_contain_text('total = 65')
    fits(page)
    screenshot(page, 'sdd-runtime-desktop.png')
    current = page.locator('#sdd-result .is-current').bounding_box()
    panel = page.locator('#sdd-result').bounding_box()
    assert panel['y'] <= current['y'] and current['y'] + current['height'] <= panel['y'] + panel['height']
    page.locator('#sdd-run-first').click()
    expect(page.locator('#sdd-run-values')).to_have_text('(no variables assigned)')
    page.locator('#sdd-run-next').click()
    expect(page.locator('#sdd-run-values')).to_have_text('i = 1')
    page.locator('#sdd-back').click()
    page.locator('#sdd-replay').click()
    expect(page.locator('#sdd-count')).to_contain_text('0 /')
    expect(page.locator('#sdd-run')).to_be_disabled()
    page.locator('#sdd-finish').click()
    page.locator('#sdd-example').select_option('guarded')
    page.locator('#sdd-load-example').click()
    page.locator('#sdd-run').click()
    expect(page.locator('#sdd-run-output')).to_have_text('-1')
    page.locator('#sdd-edit-input').click()
    expect(page.locator('#sdd-source-preview')).to_be_hidden()
    page.locator('#sdd-input').fill('x=2; print(x/0);')
    page.locator('#sdd-form button').click()
    page.locator('#sdd-run').click()
    expect(page.locator('#sdd-run-status')).to_contain_text('by zero')
    expect(page.locator('#sdd-run-values')).to_contain_text('x = 2')
    page.locator('#sdd-example').select_option('nested')
    page.locator('#sdd-load-example').click()
    page.locator('#sdd-run').click()
    expect(page.locator('#sdd-run-output')).to_have_text('25')

    # All presets stay in the viewport at laptop, projector, and phone sizes.
    for width, height in [(1366, 768), (1280, 720), (1024, 768), (390, 844)]:
        page.set_viewport_size({'width': width, 'height': height})
        for preset in ['ast', 'inherited', 'arithmetic', 'boolean', 'program']:
            page.goto(URL + f'?viewport={width}-{height}-{preset}#' + preset)
            fits(page)
            if preset != 'program':
                page.locator('#sdd-finish').click()
                fits(page)
            if width == 1280:
                maximum = int(page.locator('#sdd-progress').get_attribute('max'))
                for step in range(maximum + 1):
                    page.locator('#sdd-progress').evaluate('(el,value)=>{el.value=value;el.dispatchEvent(new Event("input",{bubbles:true}));}', step)
                    overflow = page.locator('#sdd-translation-state').evaluate('(el)=>el.scrollHeight-el.clientHeight')
                    assert overflow <= 1, (preset, step, 'attribute state needs scrolling', overflow)
            if preset in ['arithmetic', 'boolean', 'program']:
                page.locator('#sdd-run').click()
                fits(page)
            if width == 390:
                screenshot(page, f'sdd-{preset}-mobile.png')
    page.reload()
    expect(page.locator('#sdd-input-label')).to_have_text('Source program')
    assert not errors, errors
    print('Browser checks passed: viewport fit, all presets, stepping, modals, editing, errors, execution, source mapping, and escaping.')
    browser.close()
