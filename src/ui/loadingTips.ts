import '@fontsource/im-fell-english/latin-400-italic.css';

// Tips on the loading veil, under the flame: one line each, turned over every few seconds.
// The one place the game uses words (DESIGN.md, "Wordless": the owner's exception).

interface Tip {
  text: string;
  /** Left out until this is true. */
  when?: () => boolean;
}

/** Seconds a tip stays up. */
const HOLD = 5;
const FONT = 'italic 24px "IM Fell English"';

/** Some save has got as far as writing a key that starts so: what a tip gives away is no longer news. */
function saved(prefix: RegExp) {
  try {
    for (let i = 0; i < localStorage.length; i++) if (prefix.test(localStorage.key(i) ?? '')) return true;
  } catch { /* ignore */ }
  return false;
}

export function loadingTips(veil: HTMLElement) {
  const tips = ([
    { text: 'Jump, then jump again in the air to open your parachute.' },
    { text: 'A bicycle is quicker than walking. Hop on any you find.' },
    { text: 'Felled trees grow back in time.' },
    { text: 'Lost? Follow the giant’s footprints.', when: () => saved(/^embla\.(offer|home)\d\./) },
    { text: 'A lit tower can see a long way, and be seen. Look for its flame to find your way home.', when: () => saved(/^embla\.towers\./) },
    { text: 'Cave lanterns wake as you pass and stay awake. They show where you’ve been.', when: () => saved(/^embla\.dungeon1\./) },
  ] as Tip[]).filter((t) => !t.when || t.when());

  const el = document.createElement('p');
  el.className = 'tip';
  veil.appendChild(el);

  let i = Math.floor(Math.random() * tips.length);
  const show = () => {
    el.textContent = tips[i].text;
    el.classList.add('on');
  };
  // Not before its font is in: no flash of the fallback.
  document.fonts.load(FONT).then(show, show);
  const turn = setInterval(() => {
    if (!veil.isConnected) { clearInterval(turn); return; }
    el.classList.remove('on');
    setTimeout(() => { i = (i + 1) % tips.length; show(); }, 450);
  }, HOLD * 1000);
}
