"""Shared recon constants."""
URL = "https://www.vy.no/kundeservice/skjema/prisavslag-og-erstatning"

FIELDS_JS = """
() => [...document.querySelectorAll('main input, main select, main textarea, main button, main [role=radio], main [role=combobox]')]
  .filter(e => e.offsetParent !== null || e.type === 'radio' || e.type === 'checkbox')
  .map(e => {
    const id = e.id; const lab = id ? document.querySelector(`label[for="${CSS.escape(id)}"]`) : null;
    return {tag: e.tagName.toLowerCase(), type: e.type || e.getAttribute('role'), name: e.name, id,
            label: (lab?.innerText || e.getAttribute('aria-label') || e.innerText || e.placeholder || '').trim().slice(0,120),
            required: e.required || e.getAttribute('aria-required') === 'true',
            options: e.tagName === 'SELECT' ? [...e.options].map(o => o.text) : undefined};
  })
"""
