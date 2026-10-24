/* Shared nav bits: styles for the Crafting dropdown, and closing it on outside click / Escape.
   Load in <head> so the styles are in place before the header draws. */
(function(){
  const css = `
.dd{position:relative}
.dd summary{list-style:none;padding:10px 14px;border-radius:10px;font-weight:600;color:var(--ink2);cursor:pointer;display:flex;align-items:center;gap:6px;user-select:none}
.dd summary::-webkit-details-marker{display:none}
.dd summary:hover{background:var(--card2);color:var(--ink)}
.dd summary svg{transition:transform .15s}
.dd[open] summary svg{transform:rotate(180deg)}
.dd.cur summary{background:var(--accent-soft);color:var(--ink)}
.dd .menu{position:absolute;right:0;top:calc(100% + 6px);min-width:230px;background:var(--card);border:1px solid var(--line2);border-radius:12px;padding:6px;display:flex;flex-direction:column;gap:2px;z-index:30;box-shadow:0 10px 28px rgba(0,0,0,.4)}
.dd .menu a{padding:9px 12px;border-radius:8px}
.dd .menu a small{display:block;font-size:13px;font-weight:500;color:var(--muted)}
@media (prefers-reduced-motion:reduce){.dd summary svg{transition:none}}`;
  const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s);
  const closeAll = except => document.querySelectorAll('details.dd[open]').forEach(d => { if(d !== except) d.open = false; });
  document.addEventListener('click', e => closeAll(e.target.closest('details.dd')));
  document.addEventListener('keydown', e => { if(e.key === 'Escape') closeAll(null); });
})();
